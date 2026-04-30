"use client";

/**
 * v145 — Admin error boundary.
 *
 * Catches any uncaught exception from a server component below
 * /admin and shows a calm, on-brand fallback instead of React's
 * generic "An error occurred in the Server Components render"
 * crash. Surfaces the production digest so we can correlate with
 * server logs without leaking the underlying error message.
 */

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort breadcrumb in the browser console for ourselves.
    console.error("[admin]", error.digest ?? error.message ?? error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-10">
      <div
        className="relative max-w-md overflow-hidden rounded-2xl border border-rose-400/25 bg-[rgba(8,11,20,0.7)] p-7 backdrop-blur-md"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(251,113,133,0.6) 50%, transparent 100%)",
          }}
        />
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "rgba(251,113,133,0.12)",
              border: "1px solid rgba(251,113,133,0.30)",
              color: "#fb7185",
            }}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-rose-300/80">
              Admin error
            </p>
            <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-white">
              Something went wrong while rendering this view.
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/55">
              The rest of the admin still works — you can retry, jump to
              the dashboard, or come back in a moment.
            </p>
            {error.digest ? (
              <p className="mt-3 break-all rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-white/55">
                digest:{" "}
                <span className="text-cyan-200/85">{error.digest}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-3.5 py-2 text-[12.5px] font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white"
          >
            Back to dashboard
          </Link>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/45 bg-gradient-to-r from-violet-500/30 to-cyan-500/25 px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_0_18px_rgba(167,139,250,0.35)] transition hover:from-violet-500/45 hover:to-cyan-500/35"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
