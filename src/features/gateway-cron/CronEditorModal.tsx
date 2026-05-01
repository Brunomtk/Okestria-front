"use client";

/**
 * v167 — Shared cron editor used by both /admin/cron's "Agents" tab
 * and the office CronJobsModal "Agents" tab. Single source of truth
 * for what we send to the gateway's `cron.add`.
 *
 * Parity with the existing PTX `buildCronJobCreateInput` (see
 * lib/cron/createPayloadBuilder.ts) on the parts that overlap:
 *
 *   • DEFAULT sessionTarget = "isolated"   (PTX default)
 *   • DEFAULT wakeMode      = "now"        (PTX default)
 *   • Single "task / prompt" textarea     (PTX has one taskText too).
 *   • Payload kind is DERIVED from sessionTarget — operators cannot
 *     mix-and-match a "main" session with an "agentTurn" payload by
 *     accident. The mapping mirrors PTX exactly:
 *         main      → { kind: "systemEvent", text }
 *         isolated  → { kind: "agentTurn",   message }
 *   • For isolated sessions we ship `delivery: { mode: "none" }` by
 *     default — same as PTX.
 *
 * Above the form we render an explanation strip so the operator sees
 * exactly what context the gateway will hydrate at run-time (the
 * agent's SOUL/AGENTS/USER/TOOLS/MEMORY files; the v84 auto-injected
 * tool recipes are inside TOOLS already and ride along automatically
 * — provided the operator has run Admin → Sync tools after editing
 * the recipes).
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Info, Loader2, X } from "lucide-react";
import type { CronInput, CronJob, Delivery, Payload, Schedule } from "./types";

type EveryUnit = "s" | "m" | "h";
type ScheduleKind = "cron" | "every" | "at";

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
  // Single field — payload kind is derived from sessionTarget.
  taskText: string;
  // Optional model override for isolated sessions (agentTurn). PTX
  // omits this in its builder, but the gateway accepts it.
  agentTurnModel: string;
  deliveryMode: "none" | "announce";
  deliveryChannel: string;
  deliveryTo: string;
};

const DEFAULT_TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  } catch {
    return "America/Sao_Paulo";
  }
})();

function jobToFormState(job: CronJob | null): FormState {
  const base: FormState = {
    name: "",
    agentId: "",
    description: "",
    sessionKey: "",
    enabled: true,
    deleteAfterRun: false,
    // ── PTX parity ───────────────────────────────────────────────
    sessionTarget: "isolated",
    wakeMode: "now",
    deliveryMode: "none",
    deliveryChannel: "last",
    deliveryTo: "",
    // ─────────────────────────────────────────────────────────────
    scheduleKind: "cron",
    cronExpr: "0 9 * * 1-5",
    cronTz: DEFAULT_TZ,
    everyValue: 30,
    everyUnit: "m",
    atIso: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    taskText: "",
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
    base.cronTz = job.schedule.tz ?? DEFAULT_TZ;
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
    base.taskText = job.payload.text;
  } else {
    base.taskText = job.payload.message;
    base.agentTurnModel = job.payload.model ?? "";
  }

  if (job.delivery) {
    base.deliveryMode = job.delivery.mode;
    base.deliveryChannel = job.delivery.channel ?? "last";
    base.deliveryTo = job.delivery.to ?? "";
  }
  return base;
}

function formToInput(f: FormState): { ok: true; input: CronInput } | { ok: false; error: string } {
  const name = f.name.trim();
  const agentId = f.agentId.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (!agentId) return { ok: false, error: "Agent slug is required." };
  if (!f.taskText.trim()) {
    return {
      ok: false,
      error:
        f.sessionTarget === "main"
          ? "System event text is required — that's what the agent receives on its main session."
          : "Task / prompt text is required — that's what the agent receives on each isolated run.",
    };
  }

  // Schedule
  let schedule: Schedule;
  if (f.scheduleKind === "cron") {
    if (!f.cronExpr.trim()) return { ok: false, error: "Cron expression is required." };
    schedule = {
      kind: "cron",
      expr: f.cronExpr.trim(),
      tz: f.cronTz.trim() || undefined,
    };
  } else if (f.scheduleKind === "every") {
    const v = Number(f.everyValue);
    if (!Number.isFinite(v) || v <= 0) return { ok: false, error: "Every value must be > 0." };
    const factor =
      f.everyUnit === "h" ? 3_600_000 : f.everyUnit === "m" ? 60_000 : 1000;
    schedule = { kind: "every", everyMs: Math.round(v * factor) };
  } else {
    if (!f.atIso) return { ok: false, error: "At-time is required." };
    const d = new Date(f.atIso);
    if (!Number.isFinite(d.getTime())) return { ok: false, error: "At-time is invalid." };
    schedule = { kind: "at", at: d.toISOString() };
  }

  // Payload — derived from sessionTarget (PTX parity).
  const payload: Payload =
    f.sessionTarget === "main"
      ? { kind: "systemEvent", text: f.taskText.trim() }
      : {
          kind: "agentTurn",
          message: f.taskText.trim(),
          ...(f.agentTurnModel.trim() ? { model: f.agentTurnModel.trim() } : {}),
        };

  // Delivery — only meaningful for isolated sessions; PTX does the
  // same and omits delivery entirely on `main`.
  let delivery: Delivery | undefined;
  if (f.sessionTarget === "isolated") {
    if (f.deliveryMode === "announce") {
      delivery = {
        mode: "announce",
        channel: f.deliveryChannel.trim() || "last",
        ...(f.deliveryTo.trim() ? { to: f.deliveryTo.trim() } : {}),
      };
    } else {
      delivery = { mode: "none" };
    }
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
      ...(delivery ? { delivery } : {}),
    },
  };
}

export function GatewayCronEditorModal({
  initial,
  agentSlugSuggestions,
  onClose,
  onSave,
}: {
  initial: CronJob | null;
  /** Optional list of known agent slugs to power autocompletion. */
  agentSlugSuggestions?: string[];
  onClose: () => void;
  onSave: (input: CronInput, existingId?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => jobToFormState(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial);

  // Re-derive when `initial` switches (e.g. user closes + reopens for
  // a different job without unmounting the modal).
  useEffect(() => {
    setForm(jobToFormState(initial));
    setError(null);
  }, [initial]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const previewInput = useMemo(() => {
    const built = formToInput(form);
    return built.ok ? built.input : null;
  }, [form]);

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

  const datalistId = "gateway-cron-agent-slugs";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-[rgba(13,16,28,0.96)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cyan-200/80">
              {isEdit ? "edit agent cron" : "new agent cron"}
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

        {/* Context banner — explains what the gateway hydrates at run-time. */}
        <div className="border-b border-white/8 bg-cyan-500/[0.04] px-5 py-3">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300/80" />
            <div className="text-[11.5px] leading-relaxed text-white/75">
              When this cron fires, the gateway loads the agent with its
              current{" "}
              <span className="font-mono text-cyan-200/85">SOUL.md</span>,{" "}
              <span className="font-mono text-cyan-200/85">AGENTS.md</span>,{" "}
              <span className="font-mono text-cyan-200/85">USER.md</span>,{" "}
              <span className="font-mono text-cyan-200/85">TOOLS.md</span>{" "}
              <span className="text-white/55">(with the v84 auto-injected recipes — Notes vault, Apify, etc.)</span>
              {" "}and{" "}
              <span className="font-mono text-cyan-200/85">MEMORY.md</span>.
              The cron payload is just the trigger.
              <span className="mt-1 block text-white/45">
                If you changed any TOOLS recipes recently, push them via{" "}
                <span className="font-mono text-white/65">Admin → Sync tools</span>{" "}
                so the gateway has the freshest TOOLS.md before the next firing.
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-auto px-5 py-5">
          {/* Identity */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name *">
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="cron-tab-input"
                placeholder="Daily morning briefing"
              />
            </Field>
            <Field
              label="Agent slug *"
              hint={
                agentSlugSuggestions && agentSlugSuggestions.length > 0
                  ? "Pick from the list or type a custom slug"
                  : "Same id you'd type in OpenClaw"
              }
            >
              <input
                value={form.agentId}
                onChange={(e) => update("agentId", e.target.value)}
                className="cron-tab-input font-mono text-[12px]"
                placeholder="performance-analyst"
                list={datalistId}
              />
              {agentSlugSuggestions && agentSlugSuggestions.length > 0 ? (
                <datalist id={datalistId}>
                  {agentSlugSuggestions.map((slug) => (
                    <option key={slug} value={slug} />
                  ))}
                </datalist>
              ) : null}
            </Field>
          </div>
          <Field label="Description" hint="Optional context for operators">
            <input
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="cron-tab-input"
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
                    className="cron-tab-input font-mono text-[12px]"
                    placeholder="0 9 * * 1-5"
                  />
                </Field>
                <Field label="Timezone">
                  <input
                    value={form.cronTz}
                    onChange={(e) => update("cronTz", e.target.value)}
                    className="cron-tab-input font-mono text-[12px]"
                    placeholder={DEFAULT_TZ}
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
                    className="cron-tab-input"
                  />
                </Field>
                <Field label="Unit">
                  <select
                    value={form.everyUnit}
                    onChange={(e) => update("everyUnit", e.target.value as EveryUnit)}
                    className="cron-tab-input"
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
                  className="cron-tab-input"
                />
              </Field>
            )}
          </div>

          {/* Session + payload — combined card. Payload kind is auto-derived. */}
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cyan-200/70">
              How it runs
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Session"
                hint="main = persists context · isolated = one-shot"
              >
                <select
                  value={form.sessionTarget}
                  onChange={(e) =>
                    update("sessionTarget", e.target.value as FormState["sessionTarget"])
                  }
                  className="cron-tab-input"
                >
                  <option value="isolated">isolated (one-shot turn)</option>
                  <option value="main">main (shared, persistent)</option>
                </select>
              </Field>
              <Field label="Wake mode" hint="now = fire instantly · next-heartbeat = wait">
                <select
                  value={form.wakeMode}
                  onChange={(e) => update("wakeMode", e.target.value as FormState["wakeMode"])}
                  className="cron-tab-input"
                >
                  <option value="now">now</option>
                  <option value="next-heartbeat">next-heartbeat</option>
                </select>
              </Field>
            </div>
            <Field
              label={
                form.sessionTarget === "main"
                  ? "System event prompt *"
                  : "Task / prompt *"
              }
              hint={
                form.sessionTarget === "main"
                  ? "Sent into the agent's main session as a system event"
                  : "Sent as the user message to a fresh isolated session"
              }
            >
              <textarea
                value={form.taskText}
                onChange={(e) => update("taskText", e.target.value)}
                rows={5}
                className="cron-tab-input font-mono text-[12px]"
                placeholder={
                  form.sessionTarget === "main"
                    ? "Run the daily Meta Ads sweep across all accounts and post to #ops."
                    : "Pull yesterday's Meta Ads numbers and produce a 5-bullet summary."
                }
              />
            </Field>
            {form.sessionTarget === "isolated" ? (
              <Field label="Model override (optional)" hint="Defaults to the agent's configured model">
                <input
                  value={form.agentTurnModel}
                  onChange={(e) => update("agentTurnModel", e.target.value)}
                  className="cron-tab-input font-mono text-[12px]"
                  placeholder="claude-sonnet-4-6"
                />
              </Field>
            ) : null}
            <Field label="Session key (optional)" hint="Pin runs to a named session bucket">
              <input
                value={form.sessionKey}
                onChange={(e) => update("sessionKey", e.target.value)}
                className="cron-tab-input font-mono text-[12px]"
              />
            </Field>
          </div>

          {/* Delivery — only relevant for isolated, mirrors PTX. */}
          {form.sessionTarget === "isolated" ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cyan-200/70">
                Delivery
              </p>
              <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                <Field label="Mode">
                  <select
                    value={form.deliveryMode}
                    onChange={(e) =>
                      update("deliveryMode", e.target.value as FormState["deliveryMode"])
                    }
                    className="cron-tab-input"
                  >
                    <option value="none">none (silent)</option>
                    <option value="announce">announce in chat</option>
                  </select>
                </Field>
                {form.deliveryMode === "announce" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Channel">
                      <input
                        value={form.deliveryChannel}
                        onChange={(e) => update("deliveryChannel", e.target.value)}
                        className="cron-tab-input"
                        placeholder="last"
                      />
                    </Field>
                    <Field label="To (optional)">
                      <input
                        value={form.deliveryTo}
                        onChange={(e) => update("deliveryTo", e.target.value)}
                        className="cron-tab-input"
                      />
                    </Field>
                  </div>
                ) : (
                  <p className="self-center text-[11.5px] text-white/55">
                    Silent — the agent processes the run but doesn't post a message into chat.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* Flags */}
          <div className="flex flex-wrap gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <Toggle label="Enabled" checked={form.enabled} onChange={(v) => update("enabled", v)} />
            <Toggle
              label="Delete after run"
              checked={form.deleteAfterRun}
              onChange={(v) => update("deleteAfterRun", v)}
            />
          </div>

          {/* Live JSON preview — operator can verify the wire payload. */}
          {previewInput ? (
            <details className="rounded-xl border border-white/8 bg-black/30">
              <summary className="cursor-pointer px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/45 transition hover:text-white/70">
                cron.add payload preview
              </summary>
              <pre className="m-3 mt-0 max-h-48 overflow-auto rounded-lg border border-white/8 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-cyan-100/85">
                {JSON.stringify(previewInput, null, 2)}
              </pre>
            </details>
          ) : null}

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
          .cron-tab-input {
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
          .cron-tab-input:focus {
            border-color: rgba(34,211,238,0.5);
            background: rgba(255,255,255,0.05);
          }
          .cron-tab-input::placeholder {
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
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
      <span className="text-[12px] text-white/85">{label}</span>
    </label>
  );
}
