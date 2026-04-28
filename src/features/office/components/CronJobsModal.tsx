"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  AlertTriangle,
  ArrowDown,
  CalendarClock,
  CircleStop,
  Clock,
  Loader2,
  Paperclip,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCcw,
  Save,
  Send,
  Sparkles,
  Timer,
  Trash2,
  X as XIcon,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentAvatar } from "@/features/agents/components/AgentAvatar";
import { MARKDOWN_COMPONENTS } from "./shared/chatMarkdownComponents";
import {
  applyCronRunMessageBySession,
  cancelCronJob,
  createCronJob,
  deleteCronJob,
  DELIVERY_LABEL,
  fetchCronJob,
  fetchCronJobs,
  formatCronDate,
  formatRelativeTime,
  KIND_LABEL,
  pauseCronJob,
  resumeCronJob,
  SESSION_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  triggerCronJobRun,
  updateCronJob,
  WAKE_LABEL,
  type CreateCronJobInput,
  type CronJob,
  type CronJobDeliveryMode,
  type CronJobKind,
  type CronJobListItem,
  type CronJobRun,
  type CronJobSessionMode,
  type CronJobWakeMode,
  type UpdateCronJobInput,
} from "@/lib/cron/api";
import { isNearBottom } from "@/lib/dom";

// ── Visual helpers ──────────────────────────────────────────────────────
const ACCENT = "#f59e0b"; // warm amber to match the HUD button

// v93 — INITIALS / HUE_FROM helpers retired in favour of <AgentAvatar />,
// which renders the agent's real photo and falls back to a multiavatar
// SVG keyed off the agent's slug. Same look as the agent chat panel.

const ATTACHMENT_MAX_FILES = 6;
const ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;
const ATTACHMENT_TOTAL_MAX_BYTES = 25 * 1024 * 1024;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const stripDataUrlPrefix = (dataUrl: string): string => {
  const idx = dataUrl.indexOf(",");
  return idx === -1 ? dataUrl : dataUrl.slice(idx + 1);
};
const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected file read result."));
        return;
      }
      resolve(stripDataUrlPrefix(result));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });

const PRESET_SCHEDULES: { label: string; expr: string; hint: string }[] = [
  { label: "Every 5 min", expr: "*/5 * * * *", hint: "Fires every five minutes" },
  { label: "Hourly", expr: "0 * * * *", hint: "Top of every hour" },
  { label: "Daily 9am", expr: "0 9 * * *", hint: "Every day at 9:00" },
  { label: "Weekdays 8am", expr: "0 8 * * 1-5", hint: "Mon–Fri at 8:00" },
  { label: "Mondays 7am", expr: "0 7 * * 1", hint: "Every Monday at 7:00" },
];

const DEFAULT_TZ =
  (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";

const toLocalDateTimeInput = (offsetMinutes = 30): string => {
  const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalDateTimeInput = (value: string): string | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const ALLOWED_SESSION_KEY_PREFIXES = ["agent:", "hook:", "studio:", "web:"];
const previewEffectiveSessionKey = (rawKey: string): string => {
  const trimmed = rawKey.trim();
  if (!trimmed) return "hook:cron-<jobId>-run-<n>";
  const lower = trimmed.toLowerCase();
  if (ALLOWED_SESSION_KEY_PREFIXES.some((p) => lower.startsWith(p))) return trimmed;
  return `hook:${trimmed}`;
};

// ── Props ───────────────────────────────────────────────────────────────
type CronAgentOption = {
  id: number;
  name: string;
  slug?: string | null;
  avatarUrl?: string | null;
};

type CronSquadOption = { id: string; name: string };

type CronJobsModalProps = {
  open: boolean;
  companyId: number | null;
  agents: CronAgentOption[];
  squads: CronSquadOption[];
  onClose: () => void;
  /** GatewayClient — when supplied, the modal listens for chat events on cron
   *  run sessions and forwards the assistant text to the back's apply-message
   *  endpoint. Mirrors the squad chat bridge. */
  gatewayClient?: {
    onEvent: (
      handler: (event: { event: string; payload?: unknown }) => void,
    ) => () => void;
  } | null;
  gatewayConnected?: boolean;
};

// Local pending attachment (not yet base64-encoded).
type PendingAttachment = { id: string; file: File };

// ─────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────
function CronJobsModalInner({
  open,
  companyId,
  agents,
  squads,
  onClose,
  gatewayClient,
  gatewayConnected,
}: CronJobsModalProps) {
  const [jobs, setJobs] = useState<CronJobListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);

  const agentLookup = useMemo(() => {
    const m = new Map<number, CronAgentOption>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  // ── Load jobs list ────────────────────────────────────────────────────
  const loadJobs = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchCronJobs(companyId);
      setJobs(list);
      setSelectedJobId((prev) => {
        if (prev && list.some((j) => j.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // ── Load detail (with runs) ───────────────────────────────────────────
  const loadJobDetail = useCallback(async (jobId: number) => {
    setDetailLoading(true);
    try {
      const job = await fetchCronJob(jobId);
      setSelectedJob(job);
    } catch (e) {
      // v102 — a 404 here means the job was deleted (likely by this
      // operator a moment ago). Clear the selection silently instead
      // of surfacing a scary "Not Found" toast — the list reload will
      // already have reflected the deletion.
      const message = e instanceof Error ? e.message : String(e);
      if (
        /\b404\b|not[\s-]?found/i.test(message) ||
        message.includes("Request failed with status 404")
      ) {
        setSelectedJob((prev) => (prev?.id === jobId ? null : prev));
        setSelectedJobId((prev) => (prev === jobId ? null : prev));
      } else {
        setError(message);
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadJobs();
  }, [open, loadJobs]);

  useEffect(() => {
    if (!open || selectedJobId == null) {
      setSelectedJob(null);
      return;
    }
    void loadJobDetail(selectedJobId);
  }, [open, selectedJobId, loadJobDetail]);

  // v96 — Auto-refresh on a 5 s heartbeat whenever the modal is open and
  // a cron is selected. Previously we only polled while a run was already
  // in flight, which meant scheduler-fired runs (created server-side)
  // never showed up if the operator wasn't watching that cron at the
  // exact moment they queued. With a steady heartbeat the timeline
  // catches up automatically and the WS bridge can match the new run.
  useEffect(() => {
    if (!open || !selectedJob) return;
    const id = window.setInterval(() => {
      void loadJobDetail(selectedJob.id);
    }, 5000);
    return () => window.clearInterval(id);
  }, [open, selectedJob, loadJobDetail]);

  // v96 — On a slower heartbeat, refresh the cron list itself so new
  // jobs created by other tabs (or the scheduler) show up in the rail.
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      void loadJobs();
    }, 15000);
    return () => window.clearInterval(id);
  }, [open, loadJobs]);

  // ── Gateway WS bridge — forward chat events to apply-message ──────────
  //
  // v103 — back v59 switched the cron sessionKey prefix from `hook:`
  // to `agent:` (so the gateway groups the session under the selected
  // agent instead of dumping it under "main"). The bridge now:
  //
  //   1. Detects cron events by looking for the `:cron-{N}` segment
  //      anywhere in the sessionKey. That covers both the new shape
  //      (`agent:news-pulse:cron-19`) and the legacy hook shape
  //      (`hook:cron-19`, `hook:okestria-cron-19`). Squad events
  //      (`hook:sqexec-…`) stay out — they flow through the squad bridge.
  //   2. Posts the raw sessionKey to /by-session/apply-message and lets
  //      the back's tolerant resolver match it. We no longer strip
  //      `agent:<slug>:` on the front because the back v59 handles all
  //      strip variants server-side.
  //   3. Idempotency stays on a per-(sessionKey + state + text-hash)
  //      fingerprint so the SAME final isn't re-delivered, but a new
  //      run on the same persistent session always goes through.
  useEffect(() => {
    if (!open || !gatewayClient || !gatewayConnected) return;

    const extractText = (message: unknown): string | null => {
      if (!message) return null;
      if (typeof message === "string") return message.trim() || null;
      if (typeof message !== "object") return null;
      const m = message as Record<string, unknown>;
      const role = typeof m.role === "string" ? m.role.toLowerCase() : null;
      if (
        role &&
        !role.includes("assistant") &&
        !role.includes("agent") &&
        !role.includes("model")
      )
        return null;
      const content = m.content;
      if (typeof content === "string" && content.trim().length > 0)
        return content.trim();
      if (Array.isArray(content)) {
        const parts: string[] = [];
        for (const item of content) {
          if (typeof item === "string") parts.push(item);
          else if (item && typeof item === "object") {
            const it = item as Record<string, unknown>;
            const t =
              typeof it.text === "string"
                ? it.text
                : typeof it.content === "string"
                  ? it.content
                  : null;
            if (t) parts.push(t);
          }
        }
        const joined = parts.join("\n").trim();
        if (joined.length > 0) return joined;
      }
      for (const k of [
        "text",
        "markdown",
        "outputText",
        "output_text",
        "message",
        "response",
      ]) {
        const v = m[k];
        if (typeof v === "string" && v.trim().length > 0) return v.trim();
      }
      return null;
    };

    // v103 — anything that contains a `:cron-{N}` segment counts as a
    // cron event. The SAME regex matches:
    //   agent:news-pulse:cron-19         (v59 default)
    //   agent:news-pulse:main             (v59 main mode — drops here
    //                                      via fingerprint dedup unless
    //                                      the operator wants chat
    //                                      mirroring; we keep it OUT of
    //                                      the cron filter to avoid
    //                                      forwarding regular chat).
    //   hook:cron-19                      (legacy v54-v57)
    //   hook:okestria-cron-19             (legacy v54)
    //   agent:news-pulse:agent:news-pulse:cron-19  (gateway echo)
    const CRON_KEY_PATTERN = /(?:^|:)cron-\d+(?::|$)/i;
    const isCronSessionKey = (raw: string): boolean => CRON_KEY_PATTERN.test(raw);

    // Cheap deterministic fingerprint so the same `final` event isn't
    // posted twice if the gateway replays it. Different runs on the
    // same session naturally produce different text, so they get
    // different fingerprints and pass through.
    const fingerprint = (sessionKey: string, state: string, text: string | null) => {
      const body = `${sessionKey}|${state}|${text ?? ""}`;
      let hash = 0;
      for (let i = 0; i < body.length; i++) {
        hash = (hash * 31 + body.charCodeAt(i)) | 0;
      }
      return `${sessionKey}::${state}::${hash}`;
    };

    const seenFingerprints = new Set<string>();

    const unsubscribe = gatewayClient.onEvent((event) => {
      try {
        if (event.event !== "chat") return;
        const payload = event.payload as
          | {
              runId?: string;
              sessionKey?: string;
              state?: string;
              message?: unknown;
              errorMessage?: string;
            }
          | undefined;
        if (!payload) return;
        const sessionKey = (payload.sessionKey ?? "").trim();
        if (!sessionKey) return;

        // Only forward terminal-ish events. Running/delta/thinking are
        // UI signals — the back's apply-message would no-op anyway, so
        // we just skip them to avoid network noise.
        const state = (payload.state ?? "").toLowerCase();
        if (state !== "final" && state !== "aborted" && state !== "error") return;

        const text = extractText(payload.message);
        const errorMessage = payload.errorMessage ?? null;
        if (state === "final" && (!text || text.length === 0)) return;

        // v103 — single regex filter, prefix-agnostic. Squad events
        // (`hook:sqexec-…`) miss the `cron-{N}` pattern and stay out.
        if (!isCronSessionKey(sessionKey)) return;

        // Idempotency: same fingerprint = duplicate replay.
        const fp = fingerprint(sessionKey, state, text);
        if (seenFingerprints.has(fp)) return;
        seenFingerprints.add(fp);

        // Send the raw key — the back v59 resolver tolerates any
        // gateway-prepended `agent:<slug>:` prefix.
        void applyCronRunMessageBySession({
          state: state as "final" | "aborted" | "error",
          text: text ?? null,
          error: errorMessage,
          sessionKey,
        })
          .then((updated) => {
            void loadJobs();
            if (updated && selectedJob && updated.cronJobId === selectedJob.id) {
              void loadJobDetail(selectedJob.id);
            }
          })
          .catch((err) => {
            seenFingerprints.delete(fp);
            console.error("CronBridge: by-session apply-message failed", err);
          });
      } catch (err) {
        console.error("CronBridge: onEvent error", err);
      }
    });

    return () => unsubscribe();
  }, [open, gatewayClient, gatewayConnected, selectedJob, loadJobs, loadJobDetail]);

  // ── Lifecycle actions ─────────────────────────────────────────────────
  const callAction = useCallback(
    async <T,>(label: string, fn: () => Promise<T>): Promise<T | null> => {
      setActionBusy(label);
      setError(null);
      try {
        const r = await fn();
        await loadJobs();
        if (selectedJobId) await loadJobDetail(selectedJobId);
        return r;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setActionBusy(null);
      }
    },
    [loadJobs, loadJobDetail, selectedJobId],
  );

  const handlePause = useCallback(
    (id: number) => callAction(`pause-${id}`, () => pauseCronJob(id)),
    [callAction],
  );
  const handleResume = useCallback(
    (id: number) => callAction(`resume-${id}`, () => resumeCronJob(id)),
    [callAction],
  );
  const handleCancel = useCallback(
    (id: number) => {
      if (!window.confirm("Cancel this cron job? It will stop firing immediately.")) return;
      void callAction(`cancel-${id}`, () => cancelCronJob(id));
    },
    [callAction],
  );
  // v102 — handleDelete bypasses callAction. The shared helper
  // re-fetches the selected job's detail at the end, which would 404
  // when we just deleted the row the operator was viewing.
  const handleDelete = useCallback(
    async (id: number) => {
      if (!window.confirm("Delete this cron job and all its run history? This cannot be undone."))
        return;
      setActionBusy(`delete-${id}`);
      setError(null);
      try {
        await deleteCronJob(id);
        // Clear local state of the deleted job BEFORE reloading the
        // list, so the auto-refresh effects don't re-fetch its detail
        // and surface a 404.
        setSelectedJob((prev) => (prev?.id === id ? null : prev));
        setSelectedJobId((prev) => (prev === id ? null : prev));
        await loadJobs();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setActionBusy(null);
      }
    },
    [loadJobs],
  );

  const handleRunNow = useCallback(
    async (id: number, override?: string) => {
      const trimmed = override?.trim() || undefined;
      await callAction(`run-${id}`, () =>
        triggerCronJobRun(id, { systemEventOverride: trimmed }),
      );
    },
    [callAction],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cron-modal-title"
    >
      {/* v100 — cron modal widened to match the squad chat
          (1480px max, 92vw on smaller screens) so the run timeline
          breathes the same way the squad chat does. */}
      <div
        className="flex h-full max-h-[92vh] w-full max-w-[1480px] flex-col overflow-hidden rounded-[28px] border border-white/12 bg-[#0c0810] shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
        style={{ width: "min(1480px, 92vw)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: `${ACCENT}22`, border: `1px solid ${ACCENT}44` }}
              aria-hidden
            >
              <CalendarClock className="h-4 w-4" style={{ color: ACCENT }} />
            </span>
            <div>
              <h2 id="cron-modal-title" className="text-base font-semibold text-white">
                Cron jobs
              </h2>
              <p className="text-[11px] text-white/40">
                Schedule agent-driven runs and watch the replies land in chat.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => loadJobs()}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2.5 text-[11px] text-white/70 transition hover:bg-white/10 disabled:opacity-50"
              title="Refresh list"
            >
              <RefreshCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-white transition"
              style={{ backgroundColor: `${ACCENT}33`, border: `1px solid ${ACCENT}66` }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New cron</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/65 transition hover:bg-white/10 hover:text-white"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Body — list rail + chat panel */}
        <div className="flex min-h-0 flex-1">
          {/* List rail */}
          <aside className="flex w-72 flex-none flex-col overflow-hidden border-r border-white/10 bg-black/30">
            <div className="flex items-center justify-between px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              <span>Scheduled</span>
              <span>{jobs.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {loading && jobs.length === 0 ? (
                <div className="flex items-center justify-center px-3 py-10 text-xs text-white/40">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : jobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
                  No cron jobs yet. Hit
                  <span className="mx-1 inline-flex items-center gap-1 rounded-full border border-white/15 px-1.5 text-[10px] uppercase tracking-wider text-white/60">
                    <Plus className="h-2.5 w-2.5" /> New cron
                  </span>
                  to schedule one.
                </div>
              ) : (
                <ul className="space-y-1">
                  {jobs.map((job) => (
                    <CronListRow
                      key={job.id}
                      job={job}
                      agent={job.agentId ? agentLookup.get(job.agentId) : null}
                      selected={selectedJobId === job.id}
                      onSelect={() => setSelectedJobId(job.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
            {error ? (
              <div className="m-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-200/85">
                {error}
              </div>
            ) : null}
          </aside>

          {/* Chat panel */}
          <main className="flex min-w-0 flex-1 flex-col">
            {selectedJob ? (
              <CronChatPanel
                job={selectedJob}
                agent={selectedJob.agentId ? agentLookup.get(selectedJob.agentId) : null}
                detailLoading={detailLoading}
                actionBusy={actionBusy}
                composerError={composerError}
                onComposerError={setComposerError}
                onRunNow={handleRunNow}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={handleCancel}
                onDelete={handleDelete}
                onEdit={() => setEditingJob(selectedJob)}
                onRefresh={() => loadJobDetail(selectedJob.id)}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6">
                <div className="max-w-md rounded-3xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-white/45">
                  <CalendarClock className="mx-auto mb-2 h-5 w-5 text-white/30" />
                  <div className="font-medium text-white/60">Pick a cron job</div>
                  <div className="mt-1 text-xs">
                    Or create a new one — the agent will run on schedule and the reply will appear here as a chat bubble.
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Create dialog */}
      {createOpen && companyId ? (
        <CronJobFormDialog
          mode="create"
          companyId={companyId}
          agents={agents}
          squads={squads}
          onClose={() => setCreateOpen(false)}
          onSaved={async (job) => {
            setCreateOpen(false);
            await loadJobs();
            setSelectedJobId(job.id);
          }}
        />
      ) : null}

      {/* Edit dialog */}
      {editingJob && companyId ? (
        <CronJobFormDialog
          mode="edit"
          companyId={companyId}
          job={editingJob}
          agents={agents}
          squads={squads}
          onClose={() => setEditingJob(null)}
          onSaved={async (job) => {
            setEditingJob(null);
            await loadJobs();
            await loadJobDetail(job.id);
          }}
        />
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// List row
// ─────────────────────────────────────────────────────────────────────────
function CronListRow({
  job,
  agent,
  selected,
  onSelect,
}: {
  job: CronJobListItem;
  agent: CronAgentOption | null | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const seed = (agent?.slug ?? agent?.name ?? job.name ?? "?").toString();
  const status = job.status;
  const statusDot = STATUS_COLOR[status] ?? "#94a3b8";
  const scheduleLabel =
    job.kind === "one-shot"
      ? job.runAtUtc
        ? formatCronDate(job.runAtUtc)
        : "One-shot"
      : job.cronExpression || "Recurring";
  const nextRel = formatRelativeTime(job.nextRunAtUtc) || "—";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`group flex w-full items-start gap-2.5 rounded-2xl px-2.5 py-2.5 text-left transition ${
          selected
            ? "bg-white/[0.06] ring-1 ring-white/15"
            : "hover:bg-white/[0.03]"
        }`}
      >
        <div className="relative mt-0.5 flex-none">
          <AgentAvatar
            seed={seed}
            name={agent?.name ?? job.name}
            avatarUrl={agent?.avatarUrl ?? null}
            size={36}
          />
          <span
            className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: statusDot, border: "1.5px solid #0c0810" }}
            title={STATUS_LABEL[status]}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-white/85">{job.name}</span>
            {job.kind === "recurring" ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/55">
                {KIND_LABEL.recurring}
              </span>
            ) : null}
          </div>
          <div className="truncate text-[11px] text-white/45">
            <Clock className="mr-1 inline-block h-3 w-3 align-text-bottom text-white/35" />
            {scheduleLabel}
          </div>
          <div className="mt-0.5 truncate text-[10.5px] text-white/35">
            Next: {nextRel}
            {job.runCount > 0 ? <span className="ml-2">· {job.runCount} runs</span> : null}
          </div>
        </div>
      </button>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Chat panel — header + run timeline + composer
// ─────────────────────────────────────────────────────────────────────────
function CronChatPanel({
  job,
  agent,
  detailLoading,
  actionBusy,
  composerError,
  onComposerError,
  onRunNow,
  onPause,
  onResume,
  onCancel,
  onDelete,
  onEdit,
  onRefresh,
}: {
  job: CronJob;
  agent: CronAgentOption | null | undefined;
  detailLoading: boolean;
  actionBusy: string | null;
  composerError: string | null;
  onComposerError: (msg: string | null) => void;
  onRunNow: (id: number, override?: string) => void | Promise<void>;
  onPause: (id: number) => void | Promise<unknown>;
  onResume: (id: number) => void | Promise<unknown>;
  onCancel: (id: number) => void | Promise<unknown>;
  onDelete: (id: number) => void | Promise<unknown>;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [running, setRunning] = useState(false);

  const seed = (agent?.slug ?? agent?.name ?? job.name).toString();

  const status = job.status;
  const statusColor = STATUS_COLOR[status] ?? "#94a3b8";

  const scheduleLabel = useMemo(() => {
    if (job.kind === "one-shot") {
      return job.runAtUtc ? `Runs once at ${formatCronDate(job.runAtUtc)}` : "Run once";
    }
    return `Cron: ${job.cronExpression ?? "?"} (${job.timezone ?? "UTC"})`;
  }, [job]);

  const sortedRuns = useMemo(() => {
    const list = [...(job.runs ?? [])];
    list.sort((a, b) => {
      const ta = a.finishedAtUtc
        ? new Date(a.finishedAtUtc).getTime()
        : a.startedAtUtc
          ? new Date(a.startedAtUtc).getTime()
          : new Date(a.createdDate).getTime();
      const tb = b.finishedAtUtc
        ? new Date(b.finishedAtUtc).getTime()
        : b.startedAtUtc
          ? new Date(b.startedAtUtc).getTime()
          : new Date(b.createdDate).getTime();
      if (ta !== tb) return ta - tb;
      return a.runNumber - b.runNumber;
    });
    return list;
  }, [job]);

  const scrollToBottom = useCallback(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    if (!pinned) return;
    scrollToBottom();
  }, [sortedRuns, pinned, scrollToBottom]);

  const onScrollerScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setPinned(
      isNearBottom(
        { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight },
        80,
      ),
    );
  }, []);

  const send = useCallback(async () => {
    const trimmed = draft.trim();
    onComposerError(null);
    if (!trimmed) {
      onComposerError("Type something for this run.");
      return;
    }
    setRunning(true);
    try {
      // Attachments override is not yet supported on TriggerRun (the
      // back's manual trigger endpoint accepts only systemEventOverride).
      // Keep the chips as a visual reminder — they'll roll into the next
      // edit save instead.
      await onRunNow(job.id, trimmed);
      setDraft("");
    } finally {
      setRunning(false);
    }
  }, [draft, job.id, onRunNow, onComposerError]);

  const totalAttachmentBytes = useMemo(
    () => attachments.reduce((sum, a) => sum + a.file.size, 0),
    [attachments],
  );

  const isPaused = status === "paused";
  const isCancelled = status === "cancelled" || status === "completed" || status === "failed";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header strip — v100: single-line with the action buttons no
          longer wrapping. The wider modal (1480px) makes this safe. */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="relative flex-none">
          <AgentAvatar
            seed={seed}
            name={agent?.name ?? job.name}
            avatarUrl={agent?.avatarUrl ?? null}
            size={44}
          />
          <span
            className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full"
            style={{ backgroundColor: statusColor, border: "2px solid #0c0810" }}
            title={STATUS_LABEL[status]}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-base font-semibold text-white">{job.name}</h3>
            <span
              className="rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
              style={{
                borderColor: `${statusColor}55`,
                backgroundColor: `${statusColor}18`,
                color: statusColor,
              }}
            >
              {STATUS_LABEL[status]}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/55">
              {KIND_LABEL[job.kind]}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {scheduleLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3 w-3" /> Next: {formatRelativeTime(job.nextRunAtUtc) || "—"}
            </span>
            {agent ? (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {agent.name}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              {DELIVERY_LABEL[job.deliveryMode]}
            </span>
          </div>
        </div>
        <div className="flex flex-none items-center gap-1.5">
          <button
            type="button"
            onClick={() => onRunNow(job.id)}
            disabled={isCancelled || actionBusy === `run-${job.id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 text-[11px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
            title="Run this cron once now"
          >
            {actionBusy === `run-${job.id}` ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
            <span>Run now</span>
          </button>
          {isPaused ? (
            <button
              type="button"
              onClick={() => onResume(job.id)}
              disabled={actionBusy === `resume-${job.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 text-[11px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
            >
              <Play className="h-3 w-3" />
              <span>Resume</span>
            </button>
          ) : status === "active" ? (
            <button
              type="button"
              onClick={() => onPause(job.id)}
              disabled={actionBusy === `pause-${job.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 text-[11px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
            >
              <Pause className="h-3 w-3" />
              <span>Pause</span>
            </button>
          ) : null}
          {!isCancelled ? (
            <button
              type="button"
              onClick={() => onCancel(job.id)}
              disabled={actionBusy === `cancel-${job.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 text-[11px] text-white/75 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-40"
            >
              <CircleStop className="h-3 w-3" />
              <span>Cancel</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 text-[11px] text-white/75 transition hover:bg-white/10"
          >
            <Pencil className="h-3 w-3" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(job.id)}
            disabled={actionBusy === `delete-${job.id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 text-[11px] text-white/65 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={detailLoading}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCcw className={`h-3 w-3 ${detailLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* v94 — System event preview strip removed; the chat timeline now
          owns the full vertical space between header and composer.
          The saved system event still drives every run; review/edit it
          from the cron's Edit dialog. */}

      {/* Run timeline */}
      <div
        ref={scrollerRef}
        onScroll={onScrollerScroll}
        className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5"
      >
        {sortedRuns.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-white/35">
            No runs yet. Hit "Run now" or wait for the schedule to fire.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRuns.map((run) => (
              <RunBubble
                key={run.id}
                run={run}
                agent={agent}
                seed={seed}
              />
            ))}
            <div ref={chatBottomRef} aria-hidden className="h-px w-px" />
          </div>
        )}

        {!pinned && sortedRuns.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setPinned(true);
              scrollToBottom();
            }}
            aria-label="Jump to latest"
            className="sticky bottom-3 left-1/2 mt-2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-[#1a1326]/95 px-3 py-1.5 text-xs font-medium tracking-wide text-white/85 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur transition hover:bg-[#241935]"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Jump to latest
          </button>
        ) : null}
      </div>

      {/* Composer */}
      <div className="border-t border-white/10 px-5 py-4">
        {composerError ? (
          <div className="mb-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200/90">
            {composerError}
          </div>
        ) : null}
        {attachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((att) => (
              <span
                key={att.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/80"
              >
                <Paperclip className="h-3 w-3 text-white/55" />
                <span className="max-w-[200px] truncate" title={att.file.name}>
                  {att.file.name}
                </span>
                <span className="text-white/40">{formatBytes(att.file.size)}</span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                  }
                  className="rounded-full p-0.5 text-white/45 transition hover:bg-white/10 hover:text-white"
                  aria-label={`Remove ${att.file.name}`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            <span className="self-center text-[10px] text-white/35">
              {formatBytes(totalAttachmentBytes)} of {formatBytes(ATTACHMENT_TOTAL_MAX_BYTES)}
            </span>
          </div>
        ) : null}

        <div
          className="flex items-end gap-2 rounded-[24px] border bg-black/25 px-3 py-2.5 transition focus-within:border-white/25"
          style={{ borderColor: `${ACCENT}33` }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const picked = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (picked.length === 0) return;
              let nextErr: string | null = null;
              const accepted: PendingAttachment[] = [];
              let runningTotal = totalAttachmentBytes;
              for (const file of picked) {
                if (attachments.length + accepted.length >= ATTACHMENT_MAX_FILES) {
                  nextErr = `Up to ${ATTACHMENT_MAX_FILES} files per run.`;
                  break;
                }
                if (file.size > ATTACHMENT_MAX_BYTES) {
                  nextErr = `${file.name} is over 15 MB (per-file limit).`;
                  continue;
                }
                if (runningTotal + file.size > ATTACHMENT_TOTAL_MAX_BYTES) {
                  nextErr = "Combined attachments would exceed the 25 MB total limit.";
                  break;
                }
                runningTotal += file.size;
                accepted.push({
                  id: `${file.name}-${file.size}-${file.lastModified}`,
                  file,
                });
              }
              onComposerError(nextErr);
              if (accepted.length > 0) {
                setAttachments((prev) => [...prev, ...accepted]);
              }
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach files for the next run (saved with the cron on edit)"
            aria-label="Attach files"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Override prompt for the next run · Enter to fire, Shift+Enter for newline"
            rows={2}
            className="min-h-[44px] max-h-[180px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 text-white outline-none placeholder:text-white/25"
          />

          <button
            type="button"
            onClick={() => void send()}
            disabled={!draft.trim() || running}
            className="flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundColor: `${ACCENT}33`,
              border: `1px solid ${ACCENT}66`,
            }}
            aria-label="Run with override"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>Run</span>
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/40">
          <Sparkles className="h-3 w-3" />
          <span>
            Without an override the cron uses its saved system event. Attachments need to be
            saved on the cron (use Edit) to ride along on every run.
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Single run bubble
// ─────────────────────────────────────────────────────────────────────────
function RunBubble({
  run,
  agent,
  seed,
}: {
  run: CronJobRun;
  agent: CronAgentOption | null | undefined;
  seed: string;
}) {
  const status = run.status;
  const out = (run.resultText ?? "").trim();
  const err = (run.errorMessage ?? "").trim();
  const isFailed = status === "failed";
  const isRunning = status === "queued" || status === "running";
  const isCancelled = status === "cancelled" || status === "skipped";
  const ts = run.finishedAtUtc || run.startedAtUtc || run.createdDate;

  return (
    <div className="flex items-start gap-3">
      <div className="relative flex-none">
        <AgentAvatar
          seed={seed}
          name={agent?.name ?? "Agent"}
          avatarUrl={agent?.avatarUrl ?? null}
          size={40}
        />
        {isFailed ? (
          <span
            className="absolute -right-0.5 -bottom-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500"
            style={{ border: "1.5px solid #0c0810" }}
            title="Failed"
          >
            <span className="block h-1.5 w-1.5 rounded-full bg-white/80" />
          </span>
        ) : null}
        {isRunning ? (
          <span
            className="absolute -right-0.5 -bottom-0.5 h-3 w-3 animate-pulse rounded-full"
            style={{ backgroundColor: "#22d3ee", border: "1.5px solid #0c0810" }}
            title="Working on it"
          />
        ) : null}
      </div>
      <div className="min-w-0 max-w-[84%] flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-semibold text-white/85">{agent?.name ?? "Agent"}</span>
          <span className="text-white/35">·</span>
          <span className="text-white/45">Run #{run.runNumber}</span>
          <span className="text-white/35">·</span>
          <span className="text-white/45 capitalize">{run.triggerSource}</span>
          {ts ? <span className="text-white/30">· {formatCronDate(ts)}</span> : null}
          {isFailed ? (
            <span className="rounded-full border border-red-400/30 bg-red-500/15 px-1.5 py-0.5 text-[9px] tracking-wider text-red-200">
              failed
            </span>
          ) : null}
          {isCancelled ? (
            <span className="rounded-full border border-white/15 bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/55">
              {status}
            </span>
          ) : null}
        </div>

        {out.length > 0 ? (
          <div className="rounded-[20px] rounded-tl-md border border-white/10 bg-white/[0.03] px-5 py-4 text-sm leading-7 text-white/82 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <div className="agent-markdown break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>{out}</ReactMarkdown>
            </div>
          </div>
        ) : isFailed ? (
          <div className="rounded-[20px] rounded-tl-md border border-red-400/25 bg-red-500/10 px-5 py-4 text-sm leading-7 text-red-100/90">
            <div className="agent-markdown break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                {err || "This run failed without a message."}
              </ReactMarkdown>
            </div>
          </div>
        ) : isRunning ? (
          <div className="inline-flex items-center gap-2 rounded-[20px] rounded-tl-md border border-cyan-400/25 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-100/85">
            <span className="inline-flex gap-1">
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-200"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-200"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-200"
                style={{ animationDelay: "300ms" }}
              />
            </span>
            <span className="opacity-90">
              {status === "queued" ? "queued — waiting in line" : "thinking..."}
            </span>
          </div>
        ) : (
          <div className="rounded-[20px] rounded-tl-md border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm italic text-white/45">
            (no message)
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Create / edit dialog
// ─────────────────────────────────────────────────────────────────────────
function CronJobFormDialog({
  mode,
  companyId,
  job,
  agents,
  squads,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  companyId: number;
  job?: CronJob;
  agents: CronAgentOption[];
  squads: CronSquadOption[];
  onClose: () => void;
  onSaved: (job: CronJob) => void;
}) {
  const [name, setName] = useState(job?.name ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [kind, setKind] = useState<CronJobKind>(job?.kind ?? "one-shot");
  const [runAt, setRunAt] = useState(() => {
    if (job?.runAtUtc) {
      const d = new Date(job.runAtUtc);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return toLocalDateTimeInput(30);
  });
  const [cronExpr, setCronExpr] = useState(job?.cronExpression ?? "0 9 * * *");
  const [tz, setTz] = useState(job?.timezone ?? DEFAULT_TZ);
  const [systemEvent, setSystemEvent] = useState(job?.systemEvent ?? "");
  const [sessionMode, setSessionMode] = useState<CronJobSessionMode>(job?.sessionMode ?? "fresh");
  const [sessionKey, setSessionKey] = useState(job?.sessionKey ?? "");
  const [wakeMode, setWakeMode] = useState<CronJobWakeMode>(job?.wakeMode ?? "now");
  const [deliveryMode, setDeliveryMode] = useState<CronJobDeliveryMode>(job?.deliveryMode ?? "announce");
  const [webhookUrl, setWebhookUrl] = useState(job?.webhookUrl ?? "");
  const [webhookToken, setWebhookToken] = useState("");
  const [agentId, setAgentId] = useState<string>(job?.agentId ? String(job.agentId) : "");
  const [squadId, setSquadId] = useState<string>(job?.squadId ?? "");
  const [deleteAfterRun, setDeleteAfterRun] = useState(job?.deleteAfterRun ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleLabel = mode === "create" ? "Schedule a new cron" : `Edit “${job?.name ?? ""}”`;

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!name.trim()) {
      setError("Give the cron job a name.");
      return;
    }
    if (!systemEvent.trim()) {
      setError("Add a system event prompt — that's what the agent will receive.");
      return;
    }
    if (kind === "one-shot" && !runAt) {
      setError("Pick a run time for the one-shot job.");
      return;
    }
    if (kind === "recurring" && !cronExpr.trim()) {
      setError("Add a cron expression.");
      return;
    }
    if (sessionMode === "named" && !sessionKey.trim()) {
      setError("Named sessions need a session key.");
      return;
    }
    if (deliveryMode === "webhook" && !webhookUrl.trim()) {
      setError("Webhook delivery needs a URL.");
      return;
    }

    setBusy(true);
    try {
      const runAtIso = kind === "one-shot" ? fromLocalDateTimeInput(runAt) : null;
      if (mode === "create") {
        const input: CreateCronJobInput = {
          companyId,
          name: name.trim(),
          description: description.trim() || null,
          kind,
          cronExpression: kind === "recurring" ? cronExpr.trim() : null,
          timezone: tz || null,
          runAtUtc: runAtIso,
          sessionMode,
          sessionKey: sessionMode === "named" ? sessionKey.trim() || null : null,
          systemEvent: systemEvent.trim(),
          wakeMode,
          deliveryMode,
          webhookUrl: deliveryMode === "webhook" ? webhookUrl.trim() : null,
          webhookToken: deliveryMode === "webhook" && webhookToken.trim() ? webhookToken.trim() : null,
          deleteAfterRun,
          agentId: agentId ? Number(agentId) : null,
          squadId: squadId || null,
        };
        const created = await createCronJob(input);
        onSaved(created);
      } else if (job) {
        const patch: UpdateCronJobInput = {
          name: name.trim(),
          description: description.trim() || null,
          cronExpression: kind === "recurring" ? cronExpr.trim() : null,
          timezone: tz || null,
          runAtUtc: runAtIso,
          sessionMode,
          sessionKey: sessionMode === "named" ? sessionKey.trim() || null : null,
          systemEvent: systemEvent.trim(),
          wakeMode,
          deliveryMode,
          webhookUrl: deliveryMode === "webhook" ? webhookUrl.trim() : null,
          deleteAfterRun,
        };
        if (webhookToken.trim()) patch.webhookToken = webhookToken.trim();
        if (!agentId) patch.clearAgent = true;
        else patch.agentId = Number(agentId);
        if (!squadId) patch.clearSquad = true;
        else patch.squadId = squadId;
        const updated = await updateCronJob(job.id, patch);
        onSaved(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [
    mode,
    job,
    companyId,
    name,
    description,
    kind,
    runAt,
    cronExpr,
    tz,
    systemEvent,
    sessionMode,
    sessionKey,
    wakeMode,
    deliveryMode,
    webhookUrl,
    webhookToken,
    deleteAfterRun,
    agentId,
    squadId,
    onSaved,
  ]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-full max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[24px] border border-white/12 bg-[#0c0810] shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-white">{titleLabel}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/65 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 overflow-y-auto px-5 py-4 text-sm">
          <Field label="Name" full>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daily morning brief"
              className="cron-input"
            />
          </Field>
          <Field label="Description" full>
            <input
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="cron-input"
            />
          </Field>

          <Field label="Kind">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as CronJobKind)}
              className="cron-input"
            >
              <option value="one-shot">{KIND_LABEL["one-shot"]}</option>
              <option value="recurring">{KIND_LABEL["recurring"]}</option>
            </select>
          </Field>
          <Field label="Timezone">
            <input
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              placeholder="UTC"
              className="cron-input"
            />
          </Field>

          {kind === "one-shot" ? (
            <Field label="Run at" full>
              <input
                type="datetime-local"
                value={runAt}
                onChange={(e) => setRunAt(e.target.value)}
                className="cron-input"
              />
            </Field>
          ) : (
            <Field label="Cron expression" full>
              <input
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                placeholder="0 9 * * *"
                className="cron-input font-mono"
              />
              <div className="mt-1 flex flex-wrap gap-1.5">
                {PRESET_SCHEDULES.map((preset) => (
                  <button
                    type="button"
                    key={preset.expr}
                    onClick={() => setCronExpr(preset.expr)}
                    className="rounded-full border border-white/12 bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/65 hover:bg-white/10"
                    title={preset.hint}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label="Agent">
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="cron-input"
            >
              <option value="">— None —</option>
              {agents.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Squad (optional)">
            <select
              value={squadId}
              onChange={(e) => setSquadId(e.target.value)}
              className="cron-input"
            >
              <option value="">— None —</option>
              {squads.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="System event prompt" full>
            <textarea
              value={systemEvent}
              onChange={(e) => setSystemEvent(e.target.value)}
              rows={4}
              placeholder='e.g. Reply with one short sentence: "PING-OK from <your name>".'
              className="cron-input min-h-[88px] resize-y"
            />
          </Field>

          <Field label="Session mode">
            <select
              value={sessionMode}
              onChange={(e) => setSessionMode(e.target.value as CronJobSessionMode)}
              className="cron-input"
            >
              {(Object.keys(SESSION_LABEL) as CronJobSessionMode[]).map((k) => (
                <option key={k} value={k}>
                  {SESSION_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Wake mode">
            <select
              value={wakeMode}
              onChange={(e) => setWakeMode(e.target.value as CronJobWakeMode)}
              className="cron-input"
            >
              {(Object.keys(WAKE_LABEL) as CronJobWakeMode[]).map((k) => (
                <option key={k} value={k}>
                  {WAKE_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>

          {sessionMode === "named" ? (
            <Field label="Session key" full>
              <input
                value={sessionKey}
                onChange={(e) => setSessionKey(e.target.value)}
                placeholder="my-team:daily-digest"
                className="cron-input font-mono"
              />
              <div className="mt-1 text-[10px] text-white/40">
                Effective: <span className="font-mono text-white/65">{previewEffectiveSessionKey(sessionKey)}</span>
              </div>
            </Field>
          ) : null}

          <Field label="Delivery">
            <select
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value as CronJobDeliveryMode)}
              className="cron-input"
            >
              {(Object.keys(DELIVERY_LABEL) as CronJobDeliveryMode[]).map((k) => (
                <option key={k} value={k}>
                  {DELIVERY_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Auto-delete on success">
            <label className="flex h-9 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3 text-xs text-white/70">
              <input
                type="checkbox"
                checked={deleteAfterRun}
                onChange={(e) => setDeleteAfterRun(e.target.checked)}
                className="h-3.5 w-3.5 accent-amber-400"
              />
              <span>Remove job after a successful one-shot run</span>
            </label>
          </Field>

          {deliveryMode === "webhook" ? (
            <>
              <Field label="Webhook URL" full>
                <input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://…"
                  className="cron-input"
                />
              </Field>
              <Field label="Webhook bearer (optional)" full>
                <input
                  value={webhookToken}
                  onChange={(e) => setWebhookToken(e.target.value)}
                  placeholder="Stored encrypted on the back"
                  className="cron-input"
                />
              </Field>
            </>
          ) : null}

          {error ? (
            <div className="col-span-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200/90">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              {error}
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-full border border-white/12 bg-white/[0.03] px-3 text-xs text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-xs font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: `${ACCENT}33`, border: `1px solid ${ACCENT}66` }}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            <span>{mode === "create" ? "Create cron" : "Save"}</span>
          </button>
        </div>
      </div>
      <style jsx>{`
        :global(.cron-input) {
          width: 100%;
          height: 36px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.9);
          padding: 0 12px;
          font-size: 13px;
          outline: none;
          transition: background 120ms ease, border-color 120ms ease;
        }
        :global(.cron-input:focus) {
          border-color: rgba(245, 158, 11, 0.5);
          background: rgba(255, 255, 255, 0.06);
        }
        :global(textarea.cron-input) {
          height: auto;
          padding: 10px 12px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "col-span-2" : ""}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
        {label}
      </span>
      {children}
    </label>
  );
}

export const CronJobsModal = memo(CronJobsModalInner);
