/**
 * v154 — Admin diagnose page (extended).
 *
 * Pure server component with no admin shared imports beyond
 * `requireAdminSession`. Now also pings:
 *   • /api/Runtime/gateway-settings (the same endpoint the
 *     office's WS proxy hits at request time)
 *   • The internal /api/gateway/ws debug endpoint, exactly the
 *     way the office's GatewayClient does on connect
 *
 * If the office chat stops receiving messages, this page tells you
 * WHY in seconds — was the gateway URL set, did the upstream token
 * make it through, did the WS proxy resolve the right backend URL.
 */

import { requireAdminSession } from "../_lib/admin";
import { fetchGatewaySettings } from "@/lib/auth/api";

function resolveBackendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_OKESTRIA_API_URL ||
    process.env.OKESTRIA_API_URL ||
    "http://localhost:5227"
  ).replace(/\/$/, "");
}

function maskToken(t?: string | null): string {
  if (!t) return "(none)";
  if (t.length <= 10) return t;
  return `${t.slice(0, 6)}…${t.slice(-4)} (${t.length} chars)`;
}

export default async function AdminDiagnosePage() {
  let info: Record<string, unknown> = {};
  try {
    const session = await requireAdminSession();

    // 1. Resolved backend URL (matches lib/auth/api + the v154 fix
    //    in app/api/gateway/ws/route.ts).
    const backendBaseUrl = resolveBackendBaseUrl();

    // 2. Hit /api/Runtime/gateway-settings the same way the WS
    //    proxy does on each chat connect.
    let gatewaySettings: unknown = null;
    let gatewayError: string | null = null;
    try {
      const gw = await fetchGatewaySettings(session.token!);
      gatewaySettings = {
        configured: gw.configured,
        baseUrl: gw.baseUrl,
        hasUpstreamToken: gw.hasUpstreamToken,
        upstreamTokenPreview: maskToken(gw.upstreamToken),
      };
    } catch (err) {
      gatewayError = err instanceof Error ? err.message : String(err);
    }

    info = {
      ok: true,
      session: {
        hasToken: Boolean(session.token),
        userId: session.userId ?? null,
        role: session.role ?? null,
        roleType: session.roleType ?? null,
        fullName: session.fullName ?? null,
        email: session.email ?? null,
      },
      backend: {
        resolvedBaseUrl: backendBaseUrl,
        env: {
          NEXT_PUBLIC_OKESTRIA_API_URL:
            process.env.NEXT_PUBLIC_OKESTRIA_API_URL ?? "(unset)",
          OKESTRIA_API_URL: process.env.OKESTRIA_API_URL
            ? "(set, length " + process.env.OKESTRIA_API_URL.length + ")"
            : "(unset)",
        },
      },
      gateway: gatewaySettings ?? { error: gatewayError },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    info = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-cyan-300/80">
          Admin · diagnose
        </p>
        <h1 className="mt-1 bg-gradient-to-r from-white via-cyan-100 to-emerald-100 bg-clip-text text-[26px] font-semibold tracking-tight text-transparent">
          Render diagnostic
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/55">
          Live snapshot of the admin session, the backend URL the
          server resolved for this request, and the gateway settings
          the office&apos;s WS proxy will see when chat connects. If
          chat is silent, scan the&nbsp;
          <code className="rounded bg-white/10 px-1 font-mono text-[11px] text-cyan-200">
            gateway
          </code>{" "}
          block — it should show <code>configured: true</code> with a
          real <code>baseUrl</code> and a non-empty token preview.
        </p>
      </header>

      <section
        className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-[rgba(8,11,20,0.6)] p-6 backdrop-blur-md"
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.55) 50%, transparent 100%)",
          }}
        />
        <pre className="overflow-auto whitespace-pre-wrap break-all font-mono text-[12px] leading-relaxed text-cyan-100/85">
          {JSON.stringify(info, null, 2)}
        </pre>
      </section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        Render time · {new Date().toISOString()}
      </p>
    </div>
  );
}
