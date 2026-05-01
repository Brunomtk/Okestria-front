"use client";

/**
 * v166 — Office · Gateway cron tab (lives inside CronJobsModal).
 * v167 — moved the editor modal into the shared
 * `@/features/gateway-cron/CronEditorModal` so the admin tab and the
 * office tab can never drift on payload semantics. The list / row /
 * confirm-delete UI stays here.
 *
 * The office tab calls the gateway directly through the GatewayClient
 * the office already has open — no new server routes, no new WS,
 * naturally scoped to this company's gateway/token.
 *
 * Edit semantics mirror PTX (no cron.update on the gateway, so save
 * runs cron.remove(existingId) + cron.add(input); id changes; the
 * list refreshes and the job shows up in place with the new fields).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { GatewayCronEditorModal } from "@/features/gateway-cron/CronEditorModal";
import type { CronInput, CronJob, Payload, Schedule } from "@/features/gateway-cron/types";

type Banner =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string }
  | null;

export type OfficeGatewayClientLike = {
  call?: <T = unknown>(method: string, params: unknown) => Promise<T>;
};

const fmtNextRun = (ms?: number) => {
  if (!ms) return "—";
  const delta = ms - Date.now();
  if (delta <= 0) return "due now";
  if (delta < 60_000) return `${Math.round(delta / 1000)}s`;
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m`;
  if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h`;
  return `${Math.round(delta / 86_400_000)}d`;
};

const fmtAgo = (ms?: number) => {
  if (!ms) return "—";
  const delta = Date.now() - ms;
  if (delta < 60_000) return `${Math.round(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h ago`;
  return `${Math.round(delta / 86_400_000)}d ago`;
};

const fmtSchedule = (s: Schedule): string => {
  if (s.kind === "cron") return s.tz ? `cron ${s.expr} (${s.tz})` : `cron ${s.expr}`;
  if (s.kind === "every") {
    if (s.everyMs % 3_600_000 === 0) return `every ${s.everyMs / 3_600_000}h`;
    if (s.everyMs % 60_000 === 0) return `every ${s.everyMs / 60_000}m`;
    if (s.everyMs % 1000 === 0) return `every ${s.everyMs / 1000}s`;
    return `every ${s.everyMs}ms`;
  }
  const d = new Date(s.at);
  return Number.isFinite(d.getTime()) ? `at ${d.toLocaleString()}` : `at ${s.at}`;
};

const fmtPayload = (p: Payload): string =>
  p.kind === "systemEvent" ? `system: ${p.text.slice(0, 80)}` : `turn: ${p.message.slice(0, 80)}`;

export function OfficeGatewayCronTab({
  gatewayClient,
  gatewayConnected,
  agentSlugSuggestions,
}: {
  gatewayClient: OfficeGatewayClientLike | null | undefined;
  gatewayConnected: boolean;
  /** Optional list of agent slugs known in this office, to power the
   *  autocomplete in the editor. */
  agentSlugSuggestions?: string[];
}) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editorJob, setEditorJob] = useState<CronJob | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const canCall = Boolean(gatewayConnected && gatewayClient?.call);

  const showBanner = useCallback((b: Banner) => {
    setBanner(b);
    if (b) {
      window.setTimeout(() => setBanner((cur) => (cur === b ? null : cur)), 4500);
    }
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!gatewayClient?.call) {
        setLoading(false);
        return;
      }
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      try {
        const result = await gatewayClient.call<{ jobs: CronJob[] }>("cron.list", {
          includeDisabled: true,
        });
        setJobs(Array.isArray(result?.jobs) ? result.jobs : []);
      } catch (err) {
        showBanner({
          kind: "error",
          text: err instanceof Error ? err.message : "Failed to list gateway crons.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [gatewayClient, showBanner],
  );

  useEffect(() => {
    if (canCall) {
      void load("initial");
    } else {
      setLoading(false);
    }
  }, [canCall, load]);

  const handleRunNow = useCallback(
    async (job: CronJob) => {
      if (!gatewayClient?.call) return;
      setBusyId(job.id);
      try {
        await gatewayClient.call("cron.run", { id: job.id, mode: "force" });
        showBanner({ kind: "success", text: `Triggered ${job.name}.` });
        await load("refresh");
      } catch (err) {
        showBanner({
          kind: "error",
          text: err instanceof Error ? err.message : "Run failed.",
        });
      } finally {
        setBusyId(null);
      }
    },
    [gatewayClient, load, showBanner],
  );

  const handleDelete = useCallback(
    async (job: CronJob) => {
      if (!gatewayClient?.call) return;
      setBusyId(job.id);
      try {
        await gatewayClient.call("cron.remove", { id: job.id });
        showBanner({ kind: "success", text: `Deleted ${job.name}.` });
        setConfirmDeleteId(null);
        await load("refresh");
      } catch (err) {
        showBanner({
          kind: "error",
          text: err instanceof Error ? err.message : "Delete failed.",
        });
      } finally {
        setBusyId(null);
      }
    },
    [gatewayClient, load, showBanner],
  );

  const handleSave = useCallback(
    async (input: CronInput, existingId?: string) => {
      if (!gatewayClient?.call) {
        throw new Error("Gateway client not available.");
      }
      if (existingId) {
        try {
          await gatewayClient.call("cron.remove", { id: existingId });
        } catch (err) {
          throw new Error(
            `cron.remove(${existingId}) failed before recreate — original kept: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
        try {
          await gatewayClient.call("cron.add", input);
        } catch (err) {
          throw new Error(
            `cron.add failed after removing original ${existingId} — the cron was DELETED and could not be recreated. Cause: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      } else {
        await gatewayClient.call("cron.add", input);
      }
      showBanner({
        kind: "success",
        text: existingId ? `Updated ${input.name}.` : `Created ${input.name}.`,
      });
      setEditorJob(null);
      await load("refresh");
    },
    [gatewayClient, load, showBanner],
  );

  const summary = useMemo(() => {
    const enabled = jobs.filter((j) => j.enabled).length;
    const disabled = jobs.length - enabled;
    const lastErrors = jobs.filter((j) => j.state?.lastStatus === "error").length;
    return { total: jobs.length, enabled, disabled, lastErrors };
  }, [jobs]);

  const confirmDeleteJob = jobs.find((j) => j.id === confirmDeleteId) ?? null;

  if (!canCall) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10">
        <div className="max-w-md rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-5 text-center">
          <AlertTriangle className="mx-auto h-5 w-5 text-amber-300" />
          <p className="mt-2 text-[13px] text-amber-100/90">
            Gateway not connected — agent crons need an active OpenClaw connection.
          </p>
          <p className="mt-1 text-[11.5px] text-amber-100/65">
            Reconnect the gateway and reopen this tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <Stat label="Total" value={summary.total} tone="info" />
          <Stat label="Active" value={summary.enabled} tone="ok" />
          <Stat label="Disabled" value={summary.disabled} tone={summary.disabled > 0 ? "warn" : "idle"} />
          <Stat label="Last failed" value={summary.lastErrors} tone={summary.lastErrors > 0 ? "error" : "idle"} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load("refresh")}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/75 transition hover:bg-white/[0.08] disabled:opacity-40"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setEditorJob("new")}
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo cron
          </button>
        </div>
      </div>

      {banner ? (
        <div
          className={`mx-5 mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-[12.5px] leading-relaxed ${
            banner.kind === "error"
              ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
              : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {banner.kind === "error" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : null}
          <span className="min-w-0 break-words">{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="ml-auto shrink-0 rounded p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-[13px] text-white/65">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
            Loading agent crons…
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-[13px] text-white/55">
            No agent crons yet. Click <strong className="text-white/85">Novo cron</strong> to schedule one.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.55)]">
            {[...jobs]
              .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
              .map((job) => (
                <CronRow
                  key={job.id}
                  job={job}
                  busy={busyId === job.id}
                  onRunNow={() => void handleRunNow(job)}
                  onEdit={() => setEditorJob(job)}
                  onAskDelete={() => setConfirmDeleteId(job.id)}
                />
              ))}
          </ul>
        )}
      </div>

      {editorJob !== null ? (
        <GatewayCronEditorModal
          initial={editorJob === "new" ? null : editorJob}
          agentSlugSuggestions={agentSlugSuggestions}
          onClose={() => setEditorJob(null)}
          onSave={handleSave}
        />
      ) : null}

      {confirmDeleteJob ? (
        <ConfirmDeleteModal
          job={confirmDeleteJob}
          busy={busyId === confirmDeleteJob.id}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => void handleDelete(confirmDeleteJob)}
        />
      ) : null}
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "error" | "idle" | "info";
}) {
  const palette = {
    ok: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    warn: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    error: "border-rose-400/30 bg-rose-500/10 text-rose-200",
    idle: "border-white/12 bg-white/[0.04] text-white/65",
    info: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${palette}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
        {label}
      </span>
      <span className="font-mono text-[12px] font-semibold">{value}</span>
    </span>
  );
}

// ─── Per-row ──────────────────────────────────────────────────────────────

function CronRow({
  job,
  busy,
  onRunNow,
  onEdit,
  onAskDelete,
}: {
  job: CronJob;
  busy: boolean;
  onRunNow: () => void;
  onEdit: () => void;
  onAskDelete: () => void;
}) {
  const lastStatus = job.state?.lastStatus;
  const pill = !job.enabled
    ? { color: "amber", label: "disabled" }
    : lastStatus === "error"
      ? { color: "rose", label: "last failed" }
      : lastStatus === "ok"
        ? { color: "emerald", label: "ok" }
        : { color: "cyan", label: "armed" };

  return (
    <li className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-semibold text-white">{job.name}</span>
          <Pill color={pill.color}>{pill.label}</Pill>
          {job.deleteAfterRun ? <Pill color="amber">one-shot</Pill> : null}
        </div>
        <p className="mt-1 font-mono text-[10.5px] text-white/45">
          id <span className="text-white/65">{job.id}</span>
          {job.agentId ? (
            <>
              {" · "}agent <span className="text-cyan-200/85">{job.agentId}</span>
            </>
          ) : null}
          {" · "}session <span className="text-white/65">{job.sessionTarget}</span>
          {" · "}wake <span className="text-white/65">{job.wakeMode}</span>
        </p>
        <p className="mt-1 text-[12px] text-white/75">{fmtSchedule(job.schedule)}</p>
        <p className="mt-0.5 truncate text-[12px] text-white/55">{fmtPayload(job.payload)}</p>
        {job.description ? (
          <p className="mt-1 text-[11.5px] italic text-white/45">{job.description}</p>
        ) : null}
        <p className="mt-2 font-mono text-[10px] text-white/45">
          next: <span className="text-white/70">{fmtNextRun(job.state?.nextRunAtMs)}</span>
          {" · "}last: <span className="text-white/70">{fmtAgo(job.state?.lastRunAtMs)}</span>
          {typeof job.state?.lastDurationMs === "number" ? (
            <>
              {" · "}duration{" "}
              <span className="text-white/70">{job.state.lastDurationMs}ms</span>
            </>
          ) : null}
        </p>
        {job.state?.lastError ? (
          <p className="mt-1 break-words font-mono text-[10.5px] text-rose-300/90">
            {job.state.lastError}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:flex-col sm:items-stretch">
        <button
          type="button"
          onClick={onRunNow}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run now
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/[0.08] disabled:opacity-40"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={onAskDelete}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </li>
  );
}

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  const palette: Record<string, string> = {
    cyan: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    rose: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] ${
        palette[color] ?? palette.cyan
      }`}
    >
      {children}
    </span>
  );
}

function ConfirmDeleteModal({
  job,
  busy,
  onCancel,
  onConfirm,
}: {
  job: CronJob;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-rose-400/30 bg-[rgba(13,16,28,0.95)] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-200">
            <Trash2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14.5px] font-semibold text-white">Delete this cron?</h3>
            <p className="mt-1 text-[12.5px] text-white/65">
              <strong className="text-white/85">{job.name}</strong> will be removed from the
              gateway. This is immediate and cannot be undone.
            </p>
            <p className="mt-1 font-mono text-[10.5px] text-white/40">id {job.id}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/75 transition hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/45 bg-rose-500/25 px-3 py-1.5 text-[12px] font-semibold text-rose-100 transition hover:bg-rose-500/35 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete cron
          </button>
        </div>
      </div>
    </div>
  );
}
