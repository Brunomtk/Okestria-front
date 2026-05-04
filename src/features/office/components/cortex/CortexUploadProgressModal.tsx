"use client";

/**
 * v185 — Per-file progress modal for the Cortex .md uploader.
 *
 * Operator clicks Upload in the Cortex editor sidebar, picks N files,
 * this modal opens immediately and ticks through them. Each row shows
 *
 *   ●  filename.md  ·  12.4 KB  →  imports/filename.md     ✔ done
 *   ◌  giant.md     ·  890 KB                              ✖ exceeds 256 KB
 *   …  notas.md     ·  4.1 KB                              uploading
 *   ○  briefing.md  ·  8.7 KB                              queued
 *
 * Header counts (done · failed · queued) live-update as the parent
 * walks the queue. Bottom Close button is enabled the moment the
 * batch finishes; if NO files failed, the modal auto-dismisses 1.5s
 * after completion so the operator doesn't have to click for the
 * happy path.
 */

import { useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Upload,
  X,
} from "lucide-react";

export type CortexUploadStatus = "queued" | "uploading" | "done" | "failed";

export type CortexUploadEntry = {
  /** Stable id so React keeps row identity across status flips. */
  id: string;
  filename: string;
  sizeBytes: number;
  /** Resolved vault path (`imports/<name>.md`). Set as soon as it's
   *  decided, even before the network round-trip completes. */
  vaultPath: string | null;
  status: CortexUploadStatus;
  error: string | null;
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function CortexUploadProgressModal({
  open,
  entries,
  onClose,
}: {
  open: boolean;
  entries: CortexUploadEntry[];
  onClose: () => void;
}) {
  const total = entries.length;
  const done = entries.filter((e) => e.status === "done").length;
  const failed = entries.filter((e) => e.status === "failed").length;
  const inflight = entries.filter((e) => e.status === "uploading").length;
  const queued = entries.filter((e) => e.status === "queued").length;
  const finished = total > 0 && done + failed === total;
  const allOk = finished && failed === 0;

  // Auto-dismiss the happy path so the operator doesn't have to click
  // a Close button after a clean upload.
  useEffect(() => {
    if (!open || !allOk) return;
    const id = window.setTimeout(onClose, 1500);
    return () => window.clearTimeout(id);
  }, [open, allOk, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cortex-upload-title"
    >
      <div
        className="relative flex max-h-[80vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-cyan-400/25 shadow-[0_30px_120px_rgba(0,0,0,0.8)]"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(8,145,178,0.20) 0%, rgba(15,23,42,0.96) 50%, rgba(2,6,23,0.99) 100%)",
        }}
      >
        {/* Top hairline */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent" />

        {/* ── Header ────────────────────────────────────────────── */}
        <header className="flex items-center gap-3 border-b border-white/8 bg-black/15 px-5 py-4 backdrop-blur">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-cyan-400/35"
            style={{
              background:
                "radial-gradient(circle at 30% 25%, rgba(34,211,238,0.55), rgba(8,145,178,0.4) 60%, rgba(15,23,42,0.85) 100%)",
              boxShadow:
                "0 8px 24px rgba(34,211,238,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            <Upload className="h-4 w-4 text-cyan-50" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/85">
              Cortex upload
            </p>
            <h3
              id="cortex-upload-title"
              className="mt-0.5 text-[15px] font-semibold tracking-tight text-white"
            >
              {finished
                ? allOk
                  ? `Uploaded ${done} note${done === 1 ? "" : "s"} into imports/`
                  : `Done with ${failed} issue${failed === 1 ? "" : "s"}`
                : `Uploading ${total} file${total === 1 ? "" : "s"}…`}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.16em]">
              <span className="text-emerald-300/80">{done} done</span>
              <span className="text-white/30">·</span>
              <span className={failed > 0 ? "text-rose-300/85" : "text-white/35"}>
                {failed} failed
              </span>
              <span className="text-white/30">·</span>
              <span className="text-cyan-300/75">{inflight} uploading</span>
              <span className="text-white/30">·</span>
              <span className="text-white/40">{queued} queued</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!finished}
            aria-label="Close upload progress"
            title={finished ? "Close" : "Wait for the batch to finish"}
            className="shrink-0 rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* ── Top progress bar ─────────────────────────────────── */}
        <div className="h-1 w-full bg-white/[0.04]">
          <div
            className="h-full bg-gradient-to-r from-cyan-400/80 via-cyan-300 to-violet-400/80 transition-all duration-300"
            style={{ width: total > 0 ? `${((done + failed) / total) * 100}%` : "0%" }}
          />
        </div>

        {/* ── Per-file rows ────────────────────────────────────── */}
        <ul className="min-h-0 flex-1 divide-y divide-white/[0.05] overflow-y-auto bg-black/20">
          {entries.map((entry) => (
            <CortexUploadRow key={entry.id} entry={entry} />
          ))}
        </ul>

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer className="flex items-center justify-between gap-3 border-t border-white/8 bg-black/25 px-5 py-3">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/40">
            {finished
              ? allOk
                ? "all done — closing in a moment"
                : "review the failures above; the rest landed safely"
              : "do not close the modal until the batch finishes"}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={!finished}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
              finished
                ? "border-white/15 bg-white/[0.04] text-white/85 hover:bg-white/[0.08]"
                : "cursor-not-allowed border-white/8 bg-white/[0.02] text-white/30"
            }`}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function CortexUploadRow({ entry }: { entry: CortexUploadEntry }) {
  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-3 px-5 py-3">
      <CortexUploadStatusDot status={entry.status} />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-white/90">
          {entry.filename}
        </p>
        {entry.vaultPath ? (
          <p className="mt-0.5 truncate font-mono text-[10.5px] text-cyan-200/65">
            → {entry.vaultPath}
          </p>
        ) : null}
        {entry.error ? (
          <p className="mt-1 break-words font-mono text-[10.5px] text-rose-300/90">
            {entry.error}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[10.5px] text-white/55">{formatSize(entry.sizeBytes)}</p>
        <p
          className={`mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
            entry.status === "done"
              ? "text-emerald-300/85"
              : entry.status === "failed"
                ? "text-rose-300/85"
                : entry.status === "uploading"
                  ? "text-cyan-300/85"
                  : "text-white/40"
          }`}
        >
          {entry.status}
        </p>
      </div>
    </li>
  );
}

function CortexUploadStatusDot({ status }: { status: CortexUploadStatus }) {
  if (status === "done") {
    return <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />;
  }
  if (status === "failed") {
    return <AlertCircle className="mt-0.5 h-4 w-4 text-rose-300" />;
  }
  if (status === "uploading") {
    return <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-cyan-300" />;
  }
  return <Clock className="mt-0.5 h-4 w-4 text-white/30" />;
}
