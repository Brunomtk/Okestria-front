"use client";

/**
 * v165 — Admin · Gateway cron tab.
 *
 * Lists every OpenClaw cron job (cron.list) and lets the operator
 * run-now / edit / delete / create. All RPCs go through the four
 * /api/admin/gateway-crons/* routes (which proxy via NodeGatewayClient
 * with the v164 device handshake + Origin header).
 *
 * Edit semantics: gateway has no cron.update, so editing performs a
 * remove + add. The id changes; the list refreshes and shows the
 * job in place.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bot,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Section, StatCard, StatusPill } from "../../_components/AdminUI";

type Schedule =
  | { kind: "at"; at: string }
  | { kind: "every"; everyMs: number; anchorMs?: number }
  | { kind: "cron"; expr: string; tz?: string };

type Payload =
  | { kind: "systemEvent"; text: string }
  | { kind: "agentTurn"; message: string; model?: string; thinking?: string };

type Delivery = { mode: "none" | "announce"; channel?: string; to?: string; bestEffort?: boolean };

type CronJobState = {
  nextRunAtMs?: number;
  runningAtMs?: number;
  lastRunAtMs?: number;
  lastStatus?: "ok" | "error" | "skipped";
  lastError?: string;
  lastDurationMs?: number;
};

type CronJob = {
  id: string;
  name: string;
  agentId?: string;
  sessionKey?: string;
  description?: string;
  enabled: boolean;
  deleteAfterRun?: boolean;
  updatedAtMs: number;
  schedule: Schedule;
  sessionTarget: "main" | "isolated";
  wakeMode: "next-heartbeat" | "now";
  payload: Payload;
  state?: CronJobState;
  delivery?: Delivery;
};

type Banner =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string }
  | null;

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

export function GatewayCronTab() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editorJob, setEditorJob] = useState<CronJob | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const showBanner = useCallback((b: Banner) => {
    setBanner(b);
    if (b) {
      window.setTimeout(() => setBanner((cur) => (cur === b ? null : cur)), 4500);
    }
  }, []);

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/admin/gateway-crons/list", { cache: "no-store" });
      const json = (await res.json()) as { ok?: boolean; jobs?: CronJob[]; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setJobs(Array.isArray(json.jobs) ? json.jobs : []);
    } catch (err) {
      showBanner({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to list gateway crons.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showBanner]);

  useEffect(() => {
    void load("initial");
  }, [load]);

  const handleRunNow = useCallback(
    async (job: CronJob) => {
      setBusyId(job.id);
      try {
        const res = await fetch("/api/admin/gateway-crons/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: job.id }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
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
    [load, showBanner],
  );

  const handleDelete = useCallback(
    async (job: CronJob) => {
      setBusyId(job.id);
      try {
        const res = await fetch("/api/admin/gateway-crons/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: job.id }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
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
    [load, showBanner],
  );

  const handleSave = useCallback(
    async (input: CronInput, existingId?: string) => {
      const res = await fetch("/api/admin/gateway-crons/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, existingId }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      showBanner({
        kind: "success",
        text: existingId ? `Updated ${input.name}.` : `Created ${input.name}.`,
      });
      setEditorJob(null);
      await load("refresh");
    },
    [load, showBanner],
  );

  const summary = useMemo(() => {
    const enabled = jobs.filter((j) => j.enabled).length;
    const disabled = jobs.length - enabled;
    const lastErrors = jobs.filter((j) => j.state?.lastStatus === "error").length;
    return { total: jobs.length, enabled, disabled, lastErrors };
  }, [jobs]);

  const confirmDeleteJob = jobs.find((j) => j.id === confirmDeleteId) ?? null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={summary.total} icon={Bot} accent="cyan" />
        <StatCard label="Active" value={summary.enabled} icon={Play} accent="emerald" />
        <StatCard
          label="Disabled"
          value={summary.disabled}
          icon={X}
          accent={summary.disabled > 0 ? "amber" : "violet"}
        />
        <StatCard
          label="Last failed"
          value={summary.lastErrors}
          icon={AlertTriangle}
          accent={summary.lastErrors > 0 ? "rose" : "violet"}
        />
      </div>

      {banner ? (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-[12.5px] leading-relaxed ${
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

      <Section
        title={`Gateway crons · ${jobs.length}`}
        subtitle="powered by cron.list — newest update first"
        accent="cyan"
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load("refresh")}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/75 transition hover:bg-white/[0.08] disabled:opacity-40"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo cron
            </button>
          </div>
        }
      >
        <div className="p-5">
          {loading ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-[13px] text-white/65">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
              Loading gateway crons…
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-[13px] text-white/55">
              No gateway crons yet. Click <strong className="text-white/85">Novo cron</strong> to
              schedule one.
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
      </Section>

      {editorJob !== null ? (
        <CronEditorModal
          initial={editorJob === "new" ? null : editorJob}
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
  const pill =
    !job.enabled
      ? { status: "warn" as const, label: "disabled" }
      : lastStatus === "error"
        ? { status: "error" as const, label: "last failed" }
        : lastStatus === "ok"
          ? { status: "ok" as const, label: "ok" }
          : { status: "info" as const, label: "armed" };

  return (
    <li className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-semibold text-white">{job.name}</span>
          <StatusPill status={pill.status} label={pill.label} />
          {job.deleteAfterRun ? (
            <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-amber-200/85">
              one-shot
            </span>
          ) : null}
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
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
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

// ─── Editor modal ─────────────────────────────────────────────────────────

type CronInput = {
  name: string;
  agentId: string;
  sessionKey?: string;
  description?: string;
  enabled: boolean;
  deleteAfterRun?: boolean;
  schedule: Schedule;
  sessionTarget: "main" | "isolated";
  wakeMode: "next-heartbeat" | "now";
  payload: Payload;
};

type EveryUnit = "s" | "m" | "h";
type ScheduleKind = "cron" | "every" | "at";
type PayloadKind = "systemEvent" | "agentTurn";

type FormState = {
  name: string;
  agentId: string;
  description: string;
  sessionKey: string;
  enabled: boolean;
  deleteAfterRun: boolean;
  sessionTarget: "main" | "isolated";
  wakeMode: "next-heartbeat" | "now";
  scheduleKind: ScheduleKind;
  cronExpr: string;
  cronTz: string;
  everyValue: number;
  everyUnit: EveryUnit;
  atIso: string;
  payloadKind: PayloadKind;
  systemEventText: string;
  agentTurnMessage: string;
  agentTurnModel: string;
};

function jobToFormState(job: CronJob | null): FormState {
  const base: FormState = {
    name: "",
    agentId: "",
    description: "",
    sessionKey: "",
    enabled: true,
    deleteAfterRun: false,
    sessionTarget: "main",
    wakeMode: "next-heartbeat",
    scheduleKind: "cron",
    cronExpr: "0 9 * * 1-5",
    cronTz: "America/Sao_Paulo",
    everyValue: 30,
    everyUnit: "m",
    atIso: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    payloadKind: "systemEvent",
    systemEventText: "",
    agentTurnMessage: "",
    agentTurnModel: "",
  };
  if (!job) return base;
  base.name = job.name;
  base.agentId = job.agentId ?? "";
  base.description = job.description ?? "";
  base.sessionKey = job.sessionKey ?? "";
  base.enabled = job.enabled;
  base.deleteAfterRun = Boolean(job.deleteAfterRun);
  base.sessionTarget = job.sessionTarget;
  base.wakeMode = job.wakeMode;
  if (job.schedule.kind === "cron") {
    base.scheduleKind = "cron";
    base.cronExpr = job.schedule.expr;
    base.cronTz = job.schedule.tz ?? "America/Sao_Paulo";
  } else if (job.schedule.kind === "every") {
    base.scheduleKind = "every";
    if (job.schedule.everyMs % 3_600_000 === 0) {
      base.everyValue = job.schedule.everyMs / 3_600_000;
      base.everyUnit = "h";
    } else if (job.schedule.everyMs % 60_000 === 0) {
      base.everyValue = job.schedule.everyMs / 60_000;
      base.everyUnit = "m";
    } else {
      base.everyValue = Math.max(1, Math.round(job.schedule.everyMs / 1000));
      base.everyUnit = "s";
    }
  } else {
    base.scheduleKind = "at";
    const d = new Date(job.schedule.at);
    base.atIso = Number.isFinite(d.getTime())
      ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : base.atIso;
  }
  if (job.payload.kind === "systemEvent") {
    base.payloadKind = "systemEvent";
    base.systemEventText = job.payload.text;
  } else {
    base.payloadKind = "agentTurn";
    base.agentTurnMessage = job.payload.message;
    base.agentTurnModel = job.payload.model ?? "";
  }
  return base;
}

function formToInput(f: FormState): { ok: true; input: CronInput } | { ok: false; error: string } {
  const name = f.name.trim();
  const agentId = f.agentId.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (!agentId) return { ok: false, error: "Agent ID (slug) is required." };

  let schedule: Schedule;
  if (f.scheduleKind === "cron") {
    if (!f.cronExpr.trim()) return { ok: false, error: "Cron expression is required." };
    schedule = { kind: "cron", expr: f.cronExpr.trim(), tz: f.cronTz.trim() || undefined };
  } else if (f.scheduleKind === "every") {
    const v = Number(f.everyValue);
    if (!Number.isFinite(v) || v <= 0) return { ok: false, error: "Every value must be > 0." };
    const factor = f.everyUnit === "h" ? 3_600_000 : f.everyUnit === "m" ? 60_000 : 1000;
    schedule = { kind: "every", everyMs: Math.round(v * factor) };
  } else {
    if (!f.atIso) return { ok: false, error: "At-time is required." };
    const d = new Date(f.atIso);
    if (!Number.isFinite(d.getTime())) return { ok: false, error: "At-time is invalid." };
    schedule = { kind: "at", at: d.toISOString() };
  }

  let payload: Payload;
  if (f.payloadKind === "systemEvent") {
    if (!f.systemEventText.trim())
      return { ok: false, error: "System event text is required." };
    payload = { kind: "systemEvent", text: f.systemEventText };
  } else {
    if (!f.agentTurnMessage.trim())
      return { ok: false, error: "Agent turn message is required." };
    payload = {
      kind: "agentTurn",
      message: f.agentTurnMessage,
      ...(f.agentTurnModel.trim() ? { model: f.agentTurnModel.trim() } : {}),
    };
  }

  return {
    ok: true,
    input: {
      name,
      agentId,
      description: f.description.trim() || undefined,
      sessionKey: f.sessionKey.trim() || undefined,
      enabled: f.enabled,
      deleteAfterRun: f.deleteAfterRun || undefined,
      schedule,
      sessionTarget: f.sessionTarget,
      wakeMode: f.wakeMode,
      payload,
    },
  };
}

function CronEditorModal({
  initial,
  onClose,
  onSave,
}: {
  initial: CronJob | null;
  onClose: () => void;
  onSave: (input: CronInput, existingId?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => jobToFormState(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setError(null);
    const built = formToInput(form);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setSaving(true);
    try {
      await onSave(built.input, initial?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-[rgba(13,16,28,0.96)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cyan-200/80">
              {isEdit ? "edit gateway cron" : "new gateway cron"}
            </p>
            <h3 className="mt-0.5 text-[16px] font-semibold text-white">
              {isEdit ? `Edit · ${initial?.name}` : "Schedule a new agent cron"}
            </h3>
            {isEdit ? (
              <p className="mt-1 font-mono text-[10px] text-amber-200/70">
                heads up — gateway has no cron.update, so save = remove + recreate (id will change)
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-auto px-5 py-5">
          {/* Identity */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name *">
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="cron-input"
                placeholder="Daily morning briefing"
              />
            </Field>
            <Field label="Agent slug *" hint="Same id you'd type in OpenClaw (e.g. performance-analyst)">
              <input
                value={form.agentId}
                onChange={(e) => update("agentId", e.target.value)}
                className="cron-input font-mono text-[12px]"
                placeholder="performance-analyst"
              />
            </Field>
          </div>
          <Field label="Description" hint="Optional context for operators">
            <input
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="cron-input"
            />
          </Field>

          {/* Schedule */}
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cyan-200/70">
              Schedule
            </p>
            <div className="flex flex-wrap gap-2">
              {(["cron", "every", "at"] as ScheduleKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => update("scheduleKind", k)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                    form.scheduleKind === k
                      ? "border border-cyan-400/45 bg-cyan-500/15 text-cyan-100"
                      : "border border-white/12 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            {form.scheduleKind === "cron" ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                <Field label="Expression">
                  <input
                    value={form.cronExpr}
                    onChange={(e) => update("cronExpr", e.target.value)}
                    className="cron-input font-mono text-[12px]"
                    placeholder="0 9 * * 1-5"
                  />
                </Field>
                <Field label="Timezone">
                  <input
                    value={form.cronTz}
                    onChange={(e) => update("cronTz", e.target.value)}
                    className="cron-input font-mono text-[12px]"
                    placeholder="America/Sao_Paulo"
                  />
                </Field>
              </div>
            ) : form.scheduleKind === "every" ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <Field label="Interval">
                  <input
                    type="number"
                    min={1}
                    value={form.everyValue}
                    onChange={(e) => update("everyValue", Number(e.target.value))}
                    className="cron-input"
                  />
                </Field>
                <Field label="Unit">
                  <select
                    value={form.everyUnit}
                    onChange={(e) => update("everyUnit", e.target.value as EveryUnit)}
                    className="cron-input"
                  >
                    <option value="s">seconds</option>
                    <option value="m">minutes</option>
                    <option value="h">hours</option>
                  </select>
                </Field>
              </div>
            ) : (
              <Field label="When (local time)">
                <input
                  type="datetime-local"
                  value={form.atIso}
                  onChange={(e) => update("atIso", e.target.value)}
                  className="cron-input"
                />
              </Field>
            )}
          </div>

          {/* Payload */}
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cyan-200/70">
              Payload
            </p>
            <div className="flex flex-wrap gap-2">
              {(["systemEvent", "agentTurn"] as PayloadKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => update("payloadKind", k)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                    form.payloadKind === k
                      ? "border border-cyan-400/45 bg-cyan-500/15 text-cyan-100"
                      : "border border-white/12 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]"
                  }`}
                >
                  {k === "systemEvent" ? "System event" : "Agent turn"}
                </button>
              ))}
            </div>
            {form.payloadKind === "systemEvent" ? (
              <Field label="System event text">
                <textarea
                  value={form.systemEventText}
                  onChange={(e) => update("systemEventText", e.target.value)}
                  rows={4}
                  className="cron-input font-mono text-[12px]"
                  placeholder="Run the daily Meta Ads sweep across all accounts and post to #ops."
                />
              </Field>
            ) : (
              <>
                <Field label="Agent turn message">
                  <textarea
                    value={form.agentTurnMessage}
                    onChange={(e) => update("agentTurnMessage", e.target.value)}
                    rows={4}
                    className="cron-input font-mono text-[12px]"
                  />
                </Field>
                <Field label="Model (optional)">
                  <input
                    value={form.agentTurnModel}
                    onChange={(e) => update("agentTurnModel", e.target.value)}
                    className="cron-input font-mono text-[12px]"
                    placeholder="claude-sonnet-4-6"
                  />
                </Field>
              </>
            )}
          </div>

          {/* Session + wake + flags */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Session target">
              <select
                value={form.sessionTarget}
                onChange={(e) =>
                  update("sessionTarget", e.target.value as FormState["sessionTarget"])
                }
                className="cron-input"
              >
                <option value="main">main (shared)</option>
                <option value="isolated">isolated (one-shot)</option>
              </select>
            </Field>
            <Field label="Wake mode">
              <select
                value={form.wakeMode}
                onChange={(e) => update("wakeMode", e.target.value as FormState["wakeMode"])}
                className="cron-input"
              >
                <option value="next-heartbeat">next-heartbeat</option>
                <option value="now">now</option>
              </select>
            </Field>
          </div>
          <Field label="Session key (optional)" hint="Pin runs to a specific session bucket">
            <input
              value={form.sessionKey}
              onChange={(e) => update("sessionKey", e.target.value)}
              className="cron-input font-mono text-[12px]"
            />
          </Field>

          <div className="flex flex-wrap gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <ToggleField
              label="Enabled"
              hint="Cron runs on schedule"
              checked={form.enabled}
              onChange={(v) => update("enabled", v)}
            />
            <ToggleField
              label="Delete after run"
              hint="Removes itself after first execution"
              checked={form.deleteAfterRun}
              onChange={(v) => update("deleteAfterRun", v)}
            />
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/75 transition hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/45 bg-gradient-to-r from-cyan-500/40 to-violet-500/35 px-4 py-1.5 text-[12px] font-semibold text-white shadow-[0_0_18px_rgba(34,211,238,0.25)] transition hover:from-cyan-500/55 hover:to-violet-500/45 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isEdit ? "Save changes" : "Create cron"}
          </button>
        </div>

        <style>{`
          .cron-input {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.03);
            padding: 0.5rem 0.75rem;
            font-size: 12.5px;
            color: rgba(255,255,255,0.92);
            outline: none;
            transition: border-color 120ms ease, background 120ms ease;
          }
          .cron-input:focus {
            border-color: rgba(34,211,238,0.5);
            background: rgba(255,255,255,0.05);
          }
          .cron-input::placeholder {
            color: rgba(255,255,255,0.35);
          }
        `}</style>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
          {label}
        </span>
        {hint ? <span className="text-[10.5px] text-white/40">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3">
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-cyan-500/55" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      <span className="text-[12px] text-white/85">
        {label}
        {hint ? <span className="ml-1 text-[11px] text-white/45">— {hint}</span> : null}
      </span>
    </label>
  );
}
