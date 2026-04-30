import { NextResponse } from "next/server";

/**
 * v145.1 — Debug probe endpoint.
 *
 * The admin error boundary POSTs the digest + path here so the
 * server can log a correlation line to stdout / Vercel function
 * logs. Pure JSON in / JSON out, no auth required (it carries no
 * useful info to a malicious caller — they could just trigger
 * errors themselves).
 *
 * Format printed to stdout:
 *   [admin-error-probe] digest=<x> route=<y> ts=<iso>
 *
 * Use case:
 *   1. User loads /admin/companies and hits a 500.
 *   2. Browser fetches this endpoint with the digest.
 *   3. Vercel log shows the probe line side-by-side with the
 *      original error stack from the failed render, so the digest
 *      maps to the real exception message.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const digest =
      typeof body?.digest === "string" ? body.digest : "(no digest)";
    const route = typeof body?.route === "string" ? body.route : "(no route)";
    const message =
      typeof body?.message === "string" ? body.message : "(no message)";
    const ts = new Date().toISOString();
    console.error(
      `[admin-error-probe] digest=${digest} route=${route} ts=${ts} message=${message}`,
    );
    return NextResponse.json({ ok: true, ts });
  } catch (err) {
    console.error("[admin-error-probe] handler failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
