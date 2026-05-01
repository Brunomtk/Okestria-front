import { NextResponse, type NextRequest } from "next/server";
import { withGatewayClient } from "@/app/api/admin/gateway-crons/_lib/withGatewayClient";

/**
 * v165 — GET every OpenClaw cron job (`cron.list`).
 *
 * The browser tab calls this on mount + on any "refresh" click.
 * Uses includeDisabled=true so paused jobs show up too (operator
 * needs to see them to re-enable).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const result = await withGatewayClient(request, (client) =>
    client.request<{ jobs: unknown[] }>("cron.list", { includeDisabled: true }),
  );
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, jobs: result.data.jobs ?? [] });
}
