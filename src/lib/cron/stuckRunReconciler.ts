import type { CronJob, CronJobRun } from "@/lib/cron/api";
import { applyCronRunMessageBySession } from "@/lib/cron/api";

/**
 * v174 — Reconciler for cron runs that got stuck on `running` /
 * `queued` because the gateway WS `final` event was missed (operator
 * had the office closed when the cron fired, the bridge unsubscribed
 * mid-flight, etc.).
 *
 * The cron modal calls this on every detail load. For each candidate
 * run (running/queued, started > AGE_FLOOR_MS ago, has a sessionKey)
 * we:
 *   1. Fetch chat.history for the session from the open gateway WS.
 *   2. Find the latest assistant/agent message whose timestamp is
 *      strictly AFTER the run's startedAtUtc.
 *   3. POST it through applyCronRunMessageBySession with state=final
 *      so the back marks the run as completed and stamps resultText.
 *   4. If history has no qualifying message we leave the run alone —
 *      a real long-running job (e.g. heavy briefing) shouldn't get
 *      flipped to completed prematurely.
 *
 * Idempotency: the back's apply-message resolver no-ops on duplicate
 * (sessionKey + state + text) per its v59 contract, so re-running the
 * reconciler is safe.
 */

const AGE_FLOOR_MS = 90_000; // don't touch runs younger than this — they may genuinely still be working

type GatewayClientLike = {
  call?: <T = unknown>(method: string, params: unknown) => Promise<T>;
};

type HistoryMessage = {
  role?: string | null;
  content?: unknown;
  text?: string | null;
  timestamp?: string | number | null;
  createdAt?: string | number | null;
  at?: string | number | null;
};

type HistoryResult = {
  sessionKey?: string;
  messages?: HistoryMessage[];
};

const toMs = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const extractText = (msg: HistoryMessage): string | null => {
  if (typeof msg.text === "string" && msg.text.trim()) return msg.text.trim();
  const c = msg.content;
  if (typeof c === "string" && c.trim()) return c.trim();
  if (Array.isArray(c)) {
    const parts: string[] = [];
    for (const item of c) {
      if (typeof item === "string") parts.push(item);
      else if (item && typeof item === "object") {
        const it = item as Record<string, unknown>;
        const t = typeof it.text === "string" ? it.text : typeof it.content === "string" ? it.content : null;
        if (t) parts.push(t);
      }
    }
    const joined = parts.join("\n").trim();
    if (joined) return joined;
  }
  return null;
};

const isAgentRole = (role: string | null | undefined): boolean => {
  if (!role) return false;
  const lower = role.toLowerCase();
  return lower.includes("assistant") || lower.includes("agent") || lower.includes("model");
};

export type ReconcileOutcome =
  | { kind: "skipped"; runId: number; reason: string }
  | { kind: "applied"; runId: number; chars: number }
  | { kind: "failed"; runId: number; error: string };

/**
 * Try to recover a single stuck run. Returns the outcome so the caller
 * can decide whether to refresh the detail view.
 */
export async function reconcileStuckCronRun(params: {
  client: GatewayClientLike | null | undefined;
  run: CronJobRun;
  /** When set, runs with startedAtUtc newer than this many ms are
   *  considered "still alive" and skipped. Defaults to 90s. */
  ageFloorMs?: number;
}): Promise<ReconcileOutcome> {
  const { client, run } = params;
  const floor = params.ageFloorMs ?? AGE_FLOOR_MS;

  if (!client?.call) {
    return { kind: "skipped", runId: run.id, reason: "gateway-client-unavailable" };
  }
  if (run.status !== "running" && run.status !== "queued") {
    return { kind: "skipped", runId: run.id, reason: "not-running" };
  }
  if (!run.sessionKey) {
    return { kind: "skipped", runId: run.id, reason: "no-session-key" };
  }
  const startedMs = toMs(run.startedAtUtc) ?? toMs(run.scheduledAtUtc);
  if (typeof startedMs === "number" && Date.now() - startedMs < floor) {
    return { kind: "skipped", runId: run.id, reason: "still-fresh" };
  }

  let history: HistoryResult;
  try {
    history = await client.call<HistoryResult>("chat.history", {
      sessionKey: run.sessionKey,
      limit: 80,
    });
  } catch (err) {
    return {
      kind: "failed",
      runId: run.id,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const messages = Array.isArray(history.messages) ? history.messages : [];
  // Walk newest → oldest, take the first agent message after start.
  let chosen: { text: string; ts: number | null } | null = null;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (!isAgentRole(m.role ?? null)) continue;
    const text = extractText(m);
    if (!text) continue;
    const ts = toMs(m.timestamp) ?? toMs(m.createdAt) ?? toMs(m.at);
    if (typeof startedMs === "number" && typeof ts === "number" && ts < startedMs) {
      // Older than this run — it belonged to a previous run on the
      // same session. Stop scanning to avoid clobbering.
      break;
    }
    chosen = { text, ts };
    break;
  }

  if (!chosen) {
    return { kind: "skipped", runId: run.id, reason: "no-qualifying-message" };
  }

  try {
    await applyCronRunMessageBySession({
      sessionKey: run.sessionKey,
      state: "final",
      text: chosen.text,
      error: null,
    });
  } catch (err) {
    return {
      kind: "failed",
      runId: run.id,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return { kind: "applied", runId: run.id, chars: chosen.text.length };
}

/**
 * Helper for the cron modal: scan a job's runs and reconcile every
 * stuck one in parallel. Returns the count that actually got applied
 * so the caller knows whether to refresh.
 */
export async function reconcileStuckRunsForJob(params: {
  client: GatewayClientLike | null | undefined;
  job: CronJob | null | undefined;
}): Promise<number> {
  const job = params.job;
  if (!job?.runs?.length) return 0;
  const candidates = job.runs.filter(
    (r) => (r.status === "running" || r.status === "queued") && Boolean(r.sessionKey),
  );
  if (candidates.length === 0) return 0;

  const outcomes = await Promise.all(
    candidates.map((run) => reconcileStuckCronRun({ client: params.client, run })),
  );
  return outcomes.filter((o) => o.kind === "applied").length;
}
