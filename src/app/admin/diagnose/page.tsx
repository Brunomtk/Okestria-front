/**
 * v145.1 — Admin diagnose page.
 *
 * Pure server component with ZERO data fetching, ZERO shared
 * admin imports beyond requireAdminSession (so the layout's
 * sidebar still renders). If this page 500s while other admin
 * pages also 500 with the same digest, the problem is in the
 * shared admin layout chain. If this page renders cleanly while
 * others don't, the problem is in the per-page shared primitives.
 *
 * Visit: /admin/diagnose
 */

import { requireAdminSession } from "../_lib/admin";

export default async function AdminDiagnosePage() {
  // requireAdminSession only redirects on no-token / non-admin.
  // We capture the result and dump a tiny report.
  let info: Record<string, unknown> = {};
  try {
    const session = await requireAdminSession();
    info = {
      ok: true,
      hasToken: Boolean(session.token),
      userId: session.userId ?? null,
      role: session.role ?? null,
      roleType: session.roleType ?? null,
      fullName: session.fullName ?? null,
      email: session.email ?? null,
      apiBaseUrl:
        process.env.NEXT_PUBLIC_OKESTRIA_API_URL ||
        process.env.OKESTRIA_API_URL ||
        "(default localhost:5227)",
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
          If you can read this, the admin layout + session guard are
          working. The numbers below come from this exact request.
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
