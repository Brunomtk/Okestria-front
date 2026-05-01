import { NextResponse, type NextRequest } from "next/server";
import { withGatewayClient } from "@/app/api/admin/gateway-crons/_lib/withGatewayClient";

/**
 * v169 — POST to delete an OpenClaw gateway agent (`agents.delete`).
 *
 * Body: { agentId: string }
 *
 * Used by /admin/gateway-reconcile to garbage-collect orphan gateway
 * agents — agents that exist on the gateway but have no matching
 * back DB record. The browser tab calls this once per orphan or in
 * a tight loop for "delete all orphans".
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let agentId = "";
  try {
    const body = (await request.json()) as { agentId?: unknown };
    agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
  } catch {
    /* fall through to validation */
  }
  if (!agentId) {
    return NextResponse.json({ ok: false, error: "missing agentId" }, { status: 400 });
  }

  const result = await withGatewayClient(request, async (client) => {
    return client.request<unknown>("agents.delete", { id: agentId });
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
