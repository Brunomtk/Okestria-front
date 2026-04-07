"use client";

import { useMemo, useState } from "react";

export default function OfficeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false);
  const errorText = useMemo(
    () => `${error?.message ?? "Unknown error"}${error?.stack ? `\n\n${error.stack}` : ""}`,
    [error],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#120702] px-6 py-10 text-white">
      <div className="w-full max-w-5xl rounded-3xl border border-amber-500/20 bg-black/35 p-6 shadow-2xl backdrop-blur-sm">
        <div className="mb-4 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
          Office error
        </div>
        <h2 className="mb-2 text-2xl font-bold">The office failed to render</h2>
        <p className="mb-5 text-sm text-white/70">
          The error details are shown here directly on the page to make debugging easier.
        </p>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-words text-xs text-red-100">
            {errorText}
          </pre>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleCopy}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
          >
            {copied ? "Copied" : "Copy error"}
          </button>
          <button
            onClick={reset}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
          >
            Reload office
          </button>
        </div>
      </div>
    </div>
  )
}
