import { NextResponse, type NextRequest } from "next/server";
import { withGatewayClient } from "@/app/api/admin/gateway-crons/_lib/withGatewayClient";

/**
 * v165 — POST to delete an OpenClaw cron job (`cron.remove`).
 *
 * Body: { id: string }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let id = "";
  try {
    const body = (await request.json()) as { id?: unknown };
    id = typeof body.id === "string" ? body.id.trim() : "";
  } catch {
    /* fall through to validation */
  }
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  }
  const result = await withGatewayClient(request, (client) =>
    client.request<{ ok?: boolean; removed?: boolean }>("cron.remove", { id }),
  );
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, removed: Boolean(result.data?.removed) });
}
