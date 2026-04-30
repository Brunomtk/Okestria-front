"use client";

/**
 * v156 — Admin · Sync agent TOOLS.md to OpenClaw.
 *
 * One-click button. Calls our internal POST
 * /api/admin/sync-agent-tools which:
 *   1. Re-saves every agent's profile to trigger v84's
 *      ComposeAutoInjectedToolsAsync (composes operator content +
 *      cortex/Apify recipes into the AgentFile "TOOLS" row).
 *   2. Opens a server-side WS to the gateway proxy and calls
 *      agents.files.set to push the composed TOOLS.md straight
 *      into the OpenClaw filesystem for each agent.
 *
 * Live progress is rendered as the response streams back as JSON.
 */

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";

type AgentReport = {
  companyId: number;
  companyName: string;
  agentId: number;
  agentName: string;
  agentSlug: string | null;
  step: "resave" | "fetch" | "push" | "done" | "skip";
  ok: boolean;
  error?: string;
  toolsChars?: number;
};

type Result =
  | {
      ok: boolean;
      summary: {
        companies: number;
        agents: number;
        pushed: number;
        failed: number;
        skipped: number;
      };
      agents: AgentReport[];
      finishedAt: string;
    }
  | {
      ok: false;
      stage: string;
      error: string;
      gatewayUrl?: string;
    };

export function AdminSyncToolsButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync-agent-tools", {
        method: "POST",
        cache: "no-store",
      });
      const json = (await res.json()) as Result;
      setResult(json);
    } catch (err) {
      setResult({
        ok: false,
        stage: "request",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.10] to-cyan-500/[0.06] p-5">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-violet-200/80">
            One-click
          </p>
          <p className="mt-1 text-[16px] font-semibold text-white">
            Sync TOOLS.md to OpenClaw
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-white/65">
            Re-saves each agent profile (rebuilds the TOOLS file with the
            cortex + Apify recipes) and pushes the result straight into
            the OpenClaw filesystem via the gateway WebSocket. Run this
            once after a back deploy that touches{" "}
            <code className="rounded bg-white/10 px-1 font-mono text-[11px] text-cyan-200">
              ComposeAutoInjectedToolsAsync
            </code>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-400/45 bg-gradient-to-r from-violet-500/40 to-cyan-500/30 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_18px_rgba(167,139,250,0.35)] transition hover:from-violet-500/55 hover:to-cyan-500/40 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Sync all agents
            </>
          )}
        </button>
      </div>

      {result ? <ResultPanel result={result} onRerun={run} busy={busy} /> : null}
    </div>
  );
}

function ResultPanel({
  result,
  onRerun,
  busy,
}: {
  result: Result;
  onRerun: () => void;
  busy: boolean;
}) {
  if ("stage" in result && !("summary" in result)) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/[0.06] p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-300" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-rose-300/80">
            Failed at {result.stage}
          </p>
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/75">
          {result.error}
        </p>
        {result.gatewayUrl ? (
          <p className="mt-2 break-all font-mono text-[10.5px] text-white/45">
            gateway URL · {result.gatewayUrl}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onRerun}
          disabled={busy}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/75 transition hover:bg-white/[0.08] disabled:opacity-40"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    );
  }

  const summary = result.summary;
  const failedAgents = result.agents.filter((a) => !a.ok && a.step !== "skip");
  const skippedAgents = result.agents.filter((a) => a.step === "skip");
  const okAgents = result.agents.filter((a) => a.ok);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Companies scanned" value={summary.companies} />
        <SummaryCard
          label="Agents pushed"
          value={summary.pushed}
          tone="ok"
        />
        <SummaryCard
          label="Failed"
          value={summary.failed}
          tone={summary.failed > 0 ? "error" : "idle"}
        />
        <SummaryCard
          label="Skipped"
          value={summary.skipped}
          tone={summary.skipped > 0 ? "warn" : "idle"}
          hint="no slug"
        />
      </div>

      {failedAgents.length > 0 ? (
        <DetailList
          title={`Failures · ${failedAgents.length}`}
          rows={failedAgents}
          tone="error"
        />
      ) : null}
      {skippedAgents.length > 0 ? (
        <DetailList
          title={`Skipped · ${skippedAgents.length}`}
          rows={skippedAgents}
          tone="warn"
        />
      ) : null}
      {okAgents.length > 0 ? (
        <DetailList
          title={`Pushed · ${okAgents.length}`}
          rows={okAgents}
          tone="ok"
          collapsed
        />
      ) : null}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40">
          finished · {new Date(result.finishedAt).toLocaleString()}
        </p>
        <button
          type="button"
          onClick={onRerun}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/75 transition hover:bg-white/[0.08] disabled:opacity-40"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Run again
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "idle",
  hint,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "error" | "idle";
  hint?: string;
}) {
  const palette = {
    ok: { color: "#34d399", bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.30)" },
    warn: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" },
    error: { color: "#fb7185", bg: "rgba(251,113,133,0.10)", border: "rgba(251,113,133,0.30)" },
    idle: { color: "#94a3b8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.18)" },
  }[tone];
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: palette.bg, borderColor: palette.border }}
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
        {label}
      </p>
      <p
        className="mt-1 text-[24px] font-semibold leading-none tracking-tight"
        style={{ color: palette.color }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 font-mono text-[10px] text-white/40">{hint}</p>
      ) : null}
    </div>
  );
}

function DetailList({
  title,
  rows,
  tone,
  collapsed = false,
}: {
  title: string;
  rows: AgentReport[];
  tone: "ok" | "warn" | "error";
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  const Icon = tone === "ok" ? CheckCircle2 : tone === "error" ? XCircle : AlertTriangle;
  const accent = tone === "ok" ? "#34d399" : tone === "error" ? "#fb7185" : "#f59e0b";

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="overflow-hidden rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.6)]"
    >
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3"
        style={{ borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none" }}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
          <span className="text-[13px] font-semibold text-white/85">{title}</span>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40">
          {open ? "hide" : "show"}
        </span>
      </summary>
      <ul className="divide-y divide-white/[0.04]">
        {rows.map((r) => (
          <li
            key={`${r.companyId}-${r.agentId}`}
            className="flex items-start justify-between gap-3 px-5 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-white/85">
                {r.agentName}{" "}
                <span className="font-mono text-[10.5px] text-white/40">
                  · {r.companyName}
                </span>
              </p>
              <p className="mt-0.5 font-mono text-[10.5px] text-white/45">
                {r.agentSlug ? `@${r.agentSlug}` : "(no slug)"}
                {typeof r.toolsChars === "number"
                  ? ` · ${r.toolsChars} chars`
                  : ""}
                {" · step "}
                {r.step}
              </p>
              {r.error ? (
                <p
                  className="mt-1 break-words font-mono text-[10.5px]"
                  style={{ color: accent }}
                >
                  {r.error}
                </p>
              ) : null}
            </div>
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
          </li>
        ))}
      </ul>
    </details>
  );
}
