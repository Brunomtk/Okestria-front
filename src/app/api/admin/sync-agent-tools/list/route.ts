import { NextResponse } from "next/server";
import { requireAdminSession } from "@/app/admin/_lib/admin";

/**
 * v159 — Step 1 of the chunked sync flow.
 *
 * Just lists every agent the admin should re-sync. Fast — no WS,
 * no profile re-save, no OpenClaw push. Browser uses this once,
 * then loops the per-agent endpoint to do the real work without
 * any single HTTP call risking a Vercel timeout.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveBackendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_OKESTRIA_API_URL ||
    process.env.OKESTRIA_API_URL ||
    "http://localhost:5227"
  ).replace(/\/$/, "");
}

export async function GET() {
  const session = await requireAdminSession();
  const auth = { Authorization: `Bearer ${session.token!}` };
  const apiBase = resolveBackendBaseUrl();

  type CompanyRow = { id: number; name?: string | null };
  type AgentRow = { id: number; name?: string | null; slug?: string | null };

  try {
    const companies =
      ((await (
        await fetch(
          `${apiBase}/api/Companies/paged?pageNumber=1&pageSize=200`,
          { headers: auth, cache: "no-store" },
        )
      ).json()) as { result?: CompanyRow[] }).result ?? [];

    const items: Array<{
      companyId: number;
      companyName: string;
      agentId: number;
      agentName: string;
      agentSlug: string | null;
    }> = [];

    for (const c of companies) {
      try {
        const agents = (await (
          await fetch(`${apiBase}/api/Agents/by-company/${c.id}`, {
            headers: auth,
            cache: "no-store",
          })
        ).json()) as AgentRow[];
        for (const a of agents) {
          items.push({
            companyId: c.id,
            companyName: c.name ?? `Company #${c.id}`,
            agentId: a.id,
            agentName: a.name ?? `Agent #${a.id}`,
            agentSlug: (a.slug ?? "").trim() || null,
          });
        }
      } catch {
        /* skip a company that fails to list — others continue */
      }
    }

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
