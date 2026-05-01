import { NextResponse, type NextRequest } from "next/server";
import { withGatewayClient } from "@/app/api/admin/gateway-crons/_lib/withGatewayClient";
import { requireAdminSession } from "@/app/admin/_lib/admin";

/**
 * v169 — GET the cross-reference between OpenClaw gateway agents and
 * our back DB agents. Used by /admin/gateway-reconcile to show which
 * gateway agents are ORPHANS (exist on the gateway but not on the
 * back). Orphans are the agents an autonomous agent created behind
 * our back via agents.create — they're the ones the reconciler can
 * safely delete.
 *
 * Cross-reference key: the back's `slug` matches the gateway's
 * `agents.list` item id. (Same convention v162 sync-agent-tools uses
 * to push TOOLS.md to OpenClaw.)
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
type GatewayAgentEntry = {
  id?: string;
  name?: string;
  createdAt?: string | number;
  status?: string;
  [key: string]: unknown;
};

type ReconcileItem = {
  gatewayAgentId: string;
  gatewayName: string | null;
  isOrphan: boolean;
  backendAgentId: number | null;
  backendName: string | null;
  backendCompanyId: number | null;
  backendCompanyName: string | null;
};

export async function GET(request: NextRequest) {
  // 1. Auth + collect every back agent slug across every company.
  const session = await requireAdminSession();
  const apiBase = resolveBackendBaseUrl();
  const auth = { Authorization: `Bearer ${session.token!}` };

  const knownBackAgents = new Map<
    string,
    { id: number; name: string; companyId: number; companyName: string }
  >();
  try {
    const companiesRes = await fetchWithTimeout(
      `${apiBase}/api/Companies/paged?pageNumber=1&pageSize=200`,
      { headers: auth, cache: "no-store" },
    );
    const companiesJson = (await companiesRes.json()) as { result?: CompanyRow[] };
    const companies = companiesJson.result ?? [];
    for (const c of companies) {
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
            id: a.id,
            name: a.name ?? `Agent #${a.id}`,
            companyId: c.id,
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

  // 2. Pull the live gateway agents.list.
  const gatewayResult = await withGatewayClient(request, async (client) => {
    const result = await client.request<{ agents?: GatewayAgentEntry[]; mainKey?: string }>(
      "agents.list",
      {},
    );
    return result;
  });
  if (!gatewayResult.ok) {
    return NextResponse.json(
      { ok: false, error: gatewayResult.error },
      { status: gatewayResult.status },
    );
  }

  const gatewayAgents = Array.isArray(gatewayResult.data.agents) ? gatewayResult.data.agents : [];

  // 3. Cross-reference and produce a per-gateway-agent report.
  const items: ReconcileItem[] = gatewayAgents.map((entry) => {
    const id = (entry.id ?? "").toString().trim();
    const back = id ? knownBackAgents.get(id) ?? null : null;
    return {
      gatewayAgentId: id,
      gatewayName: entry.name ? String(entry.name) : null,
      isOrphan: !back,
      backendAgentId: back?.id ?? null,
      backendName: back?.name ?? null,
      backendCompanyId: back?.companyId ?? null,
      backendCompanyName: back?.companyName ?? null,
    };
  });

  const summary = {
    totalGateway: gatewayAgents.length,
    totalBack: knownBackAgents.size,
    orphans: items.filter((i) => i.isOrphan).length,
  };

  return NextResponse.json({ ok: true, items, summary });
}
