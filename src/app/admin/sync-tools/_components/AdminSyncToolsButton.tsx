"use client";

/**
 * v159 — Admin · Sync agent TOOLS to OpenClaw (chunked).
 *
 * Listing + per-agent processing happen in SEPARATE HTTP calls so a
 * single hung gateway WS can NEVER hold the whole sync hostage. The
 * per-agent route enforces an overall 25s budget; the browser shows
 * each agent flip from "queued" → "syncing" → "done" / "failed" as
 * its fetch completes.
 *
 * Concurrency: 2 in-flight at a time. High enough to be quick on
 * many agents, low enough not to swamp the gateway proxy.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";

const CONCURRENCY = 2;

type ListItem = {
  companyId: number;
  companyName: string;
  agentId: number;
  agentName: string;
  agentSlug: string | null;
};

type Step =
  | "queued"
  | "syncing"
  | "auth"
  | "fetch"
  | "resave"
  | "compose"
  | "push"
  | "done";

type AgentRow = ListItem & {
  step: Step;
  ok?: boolean;
  error?: string;
  toolsChars?: number;
  ms?: number;
};

export function AdminSyncToolsButton() {
  const [phase, setPhase] = useState<
    "idle" | "listing" | "syncing" | "done" | "error"
  >("idle");
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const cancelRef = useRef<boolean>(false);

  const summary = useMemo(() => {
    const ok = rows.filter((r) => r.step === "done" && r.ok).length;
    const failed = rows.filter(
      (r) => r.step !== "queued" && r.step !== "syncing" && r.ok === false,
    ).length;
    const inflight = rows.filter((r) => r.step === "syncing").length;
    const queued = rows.filter((r) => r.step === "queued").length;
    return { ok, failed, inflight, queued };
  }, [rows]);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const run = async () => {
    cancelRef.current = false;
    setPhase("listing");
    setRows([]);
    setGlobalError(null);

    let items: ListItem[] = [];
    try {
      const res = await fetch("/api/admin/sync-agent-tools/list", {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        items?: ListItem[];
        error?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      items = json.items ?? [];
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : String(err));
      setPhase("error");
      return;
    }

    if (items.length === 0) {
      setPhase("done");
      return;
    }

    setRows(items.map((it) => ({ ...it, step: "queued" as Step })));
    setPhase("syncing");

    let cursor = 0;
    const total = items.length;

    const updateRow = (agentId: number, patch: Partial<AgentRow>) => {
      setRows((prev) =>
        prev.map((r) => (r.agentId === agentId ? { ...r, ...patch } : r)),
      );
    };

    const worker = async () => {
      while (!cancelRef.current) {
        const myIdx = cursor++;
        if (myIdx >= total) return;
        const item = items[myIdx];
        updateRow(item.agentId, { step: "syncing" });
        try {
          const res = await fetch(
            `/api/admin/sync-agent-tools/single?agentId=${item.agentId}`,
            { method: "POST", cache: "no-store" },
          );
          const json = (await res.json()) as {
            ok?: boolean;
            step?: Step;
            error?: string;
            toolsChars?: number;
            ms?: number;
          };
          updateRow(item.agentId, {
            step: (json.step as Step) ?? "done",
            ok: Boolean(json.ok),
            error: json.error,
            toolsChars: json.toolsChars,
            ms: json.ms,
          });
        } catch (err) {
          updateRow(item.agentId, {
            step: "push",
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    setPhase(cancelRef.current ? "idle" : "done");
  };

  const cancel = () => {
    cancelRef.current = true;
  };

  const busy = phase === "listing" || phase === "syncing";

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
            Lists every agent, then re-saves their profile (rebuilds the
            TOOLS file with the cortex + Apify recipes) and pushes it
            into the OpenClaw filesystem. Processes 2 agents at a time
            with 25s budget per agent — a stuck gateway never blocks
            the rest.
          </p>
        </div>
        {busy ? (
          <button
            type="button"
            onClick={cancel}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2 text-[13px] font-semibold text-rose-100 transition hover:bg-rose-500/25"
          >
            <XCircle className="h-4 w-4" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={run}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-400/45 bg-gradient-to-r from-violet-500/40 to-cyan-500/30 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_18px_rgba(167,139,250,0.35)] transition hover:from-violet-500/55 hover:to-cyan-500/40"
          >
            <Play className="h-4 w-4" />
            {phase === "done" || phase === "error"
              ? "Run again"
              : "Sync all agents"}
          </button>
        )}
      </div>

      {phase === "listing" ? (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
          <span className="text-[13px] text-white/75">Listing agents…</span>
        </div>
      ) : null}

      {globalError ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/[0.06] p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-300" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-rose-300/80">
              Sync failed
            </p>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-white/75">
            {globalError}
          </p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Total" value={rows.length} tone="idle" />
            <Stat label="Pushed" value={summary.ok} tone="ok" />
            <Stat
              label="Failed"
              value={summary.failed}
              tone={summary.failed > 0 ? "error" : "idle"}
            />
            <Stat
              label="In flight"
              value={summary.inflight + summary.queued}
              tone={summary.inflight > 0 ? "warn" : "idle"}
              hint={`${summary.inflight} syncing · ${summary.queued} queued`}
            />
          </div>

          <ul className="divide-y divide-white/[0.04] rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.6)]">
            {rows.map((r) => (
              <RowItem key={r.agentId} row={r} />
            ))}
          </ul>
        </>
      ) : null}

      {phase === "done" && rows.length > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40">
            done · {summary.ok}/{rows.length} pushed
            {summary.failed > 0 ? ` · ${summary.failed} failed` : ""}
          </p>
          <button
            type="button"
            onClick={run}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/75 transition hover:bg-white/[0.08]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Run again
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "error" | "idle";
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

function RowItem({ row }: { row: AgentRow }) {
  const status = (() => {
    if (row.step === "queued")
      return { Icon: Loader2, color: "#94a3b8", label: "queued", spin: false };
    if (row.step === "syncing")
      return { Icon: Loader2, color: "#a78bfa", label: "syncing…", spin: true };
    if (row.step === "done" && row.ok)
      return { Icon: CheckCircle2, color: "#34d399", label: "ok", spin: false };
    return {
      Icon: XCircle,
      color: "#fb7185",
      label: row.step ?? "failed",
      spin: false,
    };
  })();

  return (
    <li className="flex items-start justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-white/90">
          {row.agentName}{" "}
          <span className="font-mono text-[10.5px] text-white/40">
            · {row.companyName}
          </span>
        </p>
        <p className="mt-0.5 font-mono text-[10.5px] text-white/45">
          {row.agentSlug ? `@${row.agentSlug}` : "(no slug)"}
          {typeof row.toolsChars === "number"
            ? ` · ${row.toolsChars} chars`
            : ""}
          {typeof row.ms === "number" ? ` · ${row.ms}ms` : ""}
        </p>
        {row.error ? (
          <p
            className="mt-1 break-words font-mono text-[10.5px]"
            style={{ color: "#fb7185" }}
          >
            {row.error}
          </p>
        ) : null}
      </div>
      <span
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{
          color: status.color,
          borderColor: `${status.color}55`,
          background: `${status.color}1a`,
        }}
      >
        <status.Icon
          className={`h-2.5 w-2.5 ${status.spin ? "animate-spin" : ""}`}
        />
        {status.label}
      </span>
    </li>
  );
}
