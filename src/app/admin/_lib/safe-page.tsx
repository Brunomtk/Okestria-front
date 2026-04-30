/**
 * v145.1 — Server-only "safe page" wrapper.
 *
 * Wrap every admin page render with this helper so a thrown
 * exception NEVER turns into a generic "Server Components render"
 * 500. Instead the page returns a calm, in-context fallback that
 * shows the route name + the real error message (server-side
 * logged via console.error so it shows up in host stdout / Vercel
 * function logs).
 *
 * Usage:
 *   export default async function MyAdminPage() {
 *     return safeAdminPage("admin/whatever", async () => {
 *       const data = await fetchSomething();
 *       return <SomeLayout data={data} />;
 *     });
 *   }
 *
 * IMPORTANT: this helper re-throws Next.js' tagged redirect /
 * not-found errors so the framework can do its job. Only "real"
 * exceptions are converted to the fallback UI.
 */

import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export async function safeAdminPage(
  routeId: string,
  render: () => Promise<ReactNode>,
): Promise<ReactNode> {
  try {
    return await render();
  } catch (err) {
    if (isNextControlFlowError(err)) {
      throw err;
    }
    const message =
      err instanceof Error ? err.message : "Unknown error during render.";
    const stack = err instanceof Error ? err.stack ?? "" : "";
    console.error(`[admin/${routeId}] safeAdminPage caught:`, message);
    if (stack) console.error(stack);
    return <SafePageFallback routeId={routeId} message={message} />;
  }
}

function isNextControlFlowError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const digest = (err as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  return (
    digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND")
  );
}

function SafePageFallback({
  routeId,
  message,
}: {
  routeId: string;
  message: string;
}) {
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-rose-300/70">
          Admin · render guard
        </p>
        <h1 className="mt-1 bg-gradient-to-r from-white via-rose-100 to-amber-100 bg-clip-text text-[26px] font-semibold tracking-tight text-transparent">
          This view is temporarily offline
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/55">
          A non-recoverable error happened while rendering{" "}
          <code className="rounded bg-white/10 px-1 font-mono text-[11.5px] text-cyan-200">
            /{routeId}
          </code>
          . The rest of the admin still works — pick another section
          from the sidebar, or retry later.
        </p>
      </header>

      <section
        className="relative overflow-hidden rounded-2xl border border-rose-400/25 bg-[rgba(8,11,20,0.6)] p-6 backdrop-blur-md"
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(251,113,133,0.55) 50%, transparent 100%)",
          }}
        />
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "rgba(251,113,133,0.12)",
              border: "1px solid rgba(251,113,133,0.30)",
              color: "#fb7185",
            }}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white/90">
              Render guard activated
            </p>
            <p className="mt-1 break-words text-[12.5px] text-white/55">
              {message}
            </p>
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40">
              Route · {routeId}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
