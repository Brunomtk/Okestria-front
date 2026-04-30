"use client";

/**
 * v145 — App-wide last-resort error boundary.
 *
 * Sits above the layout, so it must render its own <html>/<body>.
 * Triggered when a Server Component above an existing error.tsx
 * boundary throws (or when no closer boundary catches the error).
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global]", error.digest ?? error.message ?? error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#04060d",
          color: "#fff",
          fontFamily:
            'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            border: "1px solid rgba(251,113,133,0.25)",
            borderRadius: 18,
            padding: 28,
            background: "rgba(8,11,20,0.7)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            backdropFilter: "blur(8px)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily:
                "JetBrains Mono, ui-monospace, SFMono-Regular, monospace",
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(251,113,133,0.8)",
            }}
          >
            Unexpected error
          </p>
          <h2
            style={{
              margin: "8px 0 8px",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            We hit a snag rendering this page.
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Try reloading. If it keeps happening, copy the digest below
            and share it with the team.
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: 14,
                padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 10,
                background: "rgba(0,0,0,0.30)",
                fontFamily:
                  "JetBrains Mono, ui-monospace, SFMono-Regular, monospace",
                fontSize: 11,
                color: "rgba(255,255,255,0.55)",
                wordBreak: "break-all",
              }}
            >
              digest:{" "}
              <span style={{ color: "rgba(34,211,238,0.85)" }}>
                {error.digest}
              </span>
            </p>
          ) : null}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.75)",
                fontSize: 12.5,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Go home
            </a>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 16px",
                borderRadius: 10,
                border: "1px solid rgba(167,139,250,0.45)",
                background:
                  "linear-gradient(90deg, rgba(124,58,237,0.30), rgba(34,211,238,0.25))",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 0 18px rgba(167,139,250,0.35)",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
