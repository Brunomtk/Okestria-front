"use client";

import { useEffect } from "react";

export default function SpotifyCallbackPage() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code") ?? undefined;
    const error = url.searchParams.get("error") ?? undefined;
    const state = url.searchParams.get("state") ?? undefined;

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: "soundclaw-spotify-auth",
            code,
            error,
            state,
          },
          window.location.origin,
        );
      }
    } finally {
      window.close();
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/95 px-6 py-5 text-center shadow-2xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">
          Soundclaw
        </div>
        <h1 className="mt-2 text-base font-semibold text-white">Finalizing Spotify authentication</h1>
        <p className="mt-2 text-sm text-slate-300">You can close this window if it does not close automatically.</p>
      </div>
    </main>
  );
}
