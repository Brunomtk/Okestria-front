import { NextResponse, type NextRequest } from "next/server";
import { withGatewayClient } from "@/app/api/admin/gateway-crons/_lib/withGatewayClient";
import { requireAdminSession } from "@/app/admin/_lib/admin";

/**
 * v170 — GET cron jobs from OpenClaw, cross-referenced with the back
 * DB by agent slug. Used by /admin/gateway-reconcile (alongside
 * list/route.ts for orphan agents) so the operator can also clean up
 * cron jobs that target agents which no longer exist (or were
 * created behind our back).
 *
 * An "orphan cron" is a `cron.list` entry whose `agentId` is not in
 * any company's slug roster — typically left behind after an agent
 * was reconciled away, or scheduled by an autonomous agent against
 * an agent it just spun up.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HTTP_TIMEOUT_MS = 12_000;

function resolveBackendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_OKESTRIA_API_URL ||
    process.env.OKESTRIA_API_URL ||
    "http://localhost:5227"
  ).replace(/\/$/, "");
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

type CompanyRow = { id: number; name?: string | null };
type AgentRow = { id: number; name?: string | null; slug?: string | null };
type CronEntry = {
  id?: string;
  name?: string;
  agentId?: string;
  enabled?: boolean;
  updatedAtMs?: number;
  schedule?: unknown;
  payload?: unknown;
  state?: { lastStatus?: string; lastError?: string; nextRunAtMs?: number };
};

type CronReportItem = {
  cronId: string;
  cronName: string | null;
  agentId: string | null;
  isOrphan: boolean;
  enabled: boolean;
  backendCompanyName: string | null;
  nextRunAtMs: number | null;
  lastStatus: string | null;
  scheduleSummary: string;
};

const formatScheduleSummary = (schedule: unknown): string => {
  if (!schedule || typeof schedule !== "object") return "unknown";
  const s = schedule as { kind?: string; expr?: string; tz?: string; everyMs?: number; at?: string };
  if (s.kind === "cron") return s.tz ? `cron ${s.expr} (${s.tz})` : `cron ${s.expr}`;
  if (s.kind === "every" && typeof s.everyMs === "number") {
    if (s.everyMs % 3_600_000 === 0) return `every ${s.everyMs / 3_600_000}h`;
    if (s.everyMs % 60_000 === 0) return `every ${s.everyMs / 60_000}m`;
    return `every ${Math.round(s.everyMs / 1000)}s`;
  }
  if (s.kind === "at" && s.at) return `at ${new Date(s.at).toLocaleString()}`;
  return s.kind ?? "unknown";
};

export async function GET(request: NextRequest) {
  // 1. Build a Set of every back agent slug.
  const session = await requireAdminSession();
  const apiBase = resolveBackendBaseUrl();
  const auth = { Authorization: `Bearer ${session.token!}` };

  const knownBackAgents = new Map<string, { name: string; companyName: string }>();
  try {
    const companiesRes = await fetchWithTimeout(
      `${apiBase}/api/Companies/paged?pageNumber=1&pageSize=200`,
      { headers: auth, cache: "no-store" },
    );
    const companiesJson = (await companiesRes.json()) as { result?: CompanyRow[] };
    for (const c of companiesJson.result ?? []) {
      try {
        const agentsRes = await fetchWithTimeout(
          `${apiBase}/api/Agents/by-company/${c.id}`,
          { headers: auth, cache: "no-store" },
        );
        const agents = (await agentsRes.json()) as AgentRow[];
        for (const a of agents) {
          const slug = (a.slug ?? "").trim();
          if (!slug) continue;
          knownBackAgents.set(slug, {
            name: a.name ?? `Agent #${a.id}`,
            companyName: c.name ?? `Company #${c.id}`,
          });
        }
      } catch {
        /* skip company that fails — others continue */
      }
    }
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `failed to read back agents: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }

  // 2. Pull every cron from OpenClaw (includeDisabled so we see them all).
  const gatewayResult = await withGatewayClient(request, async (client) => {
    const result = await client.request<{ jobs?: CronEntry[] }>("cron.list", {
      includeDisabled: true,
    });
    return result;
  });
  if (!gatewayResult.ok) {
    return NextResponse.json(
      { ok: false, error: gatewayResult.error },
      { status: gatewayResult.status },
    );
  }

  const crons = Array.isArray(gatewayResult.data.jobs) ? gatewayResult.data.jobs : [];

  // 3. Cross-reference: a cron is an orphan when its agentId isn't in
  //    the back roster. Crons without any agentId are also flagged as
  //    orphans because we have no way to scope them.
  const items: CronReportItem[] = crons.map((cron) => {
    const cronId = (cron.id ?? "").toString().trim();
    const agentId = cron.agentId ? cron.agentId.toString().trim() : null;
    const back = agentId ? knownBackAgents.get(agentId) ?? null : null;
    return {
      cronId,
      cronName: cron.name ? String(cron.name) : null,
      agentId,
      isOrphan: !back,
      enabled: Boolean(cron.enabled),
      backendCompanyName: back?.companyName ?? null,
      nextRunAtMs: typeof cron.state?.nextRunAtMs === "number" ? cron.state.nextRunAtMs : null,
      lastStatus: cron.state?.lastStatus ?? null,
      scheduleSummary: formatScheduleSummary(cron.schedule),
    };
  });

  const summary = {
    totalCrons: crons.length,
    orphans: items.filter((i) => i.isOrphan).length,
  };

  return NextResponse.json({ ok: true, items, summary });
}
