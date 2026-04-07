"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-4 px-6 py-10">
          <div className="inline-flex w-fit rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-200">
            Application error
          </div>
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="max-w-2xl text-sm text-white/70">
            The app hit an unexpected error. The details are shown below so it is easier to debug without digging through the console.
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-words text-xs text-red-100">
              {error?.message}
              {error?.stack ? `\n\n${error.stack}` : ""}
            </pre>
          </div>
          <div>
            <button
              onClick={reset}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
