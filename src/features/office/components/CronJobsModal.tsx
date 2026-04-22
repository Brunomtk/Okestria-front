"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleStop,
  Loader2,
  Mail,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCcw,
  Save,
  Timer,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  cancelCronJob,
  createCronJob,
  deleteCronJob,
  DELIVERY_LABEL,
  fetchCronJob,
  fetchCronJobRuns,
  fetchCronJobs,
  resolveEmailToolDefaults,
  formatCronDate,
  formatRelativeTime,
  KIND_LABEL,
  pauseCronJob,
  resumeCronJob,
  SESSION_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  triggerCronJobRun,
  updateCronJob,
  WAKE_LABEL,
  type CronJob,
  type CronJobDeliveryMode,
  type CronJobKind,
  type CronJobListItem,
  type CronJobRun,
  type CronJobSessionMode,
  type CronJobStatus,
  type CronJobWakeMode,
  type CreateCronJobInput,
  type UpdateCronJobInput,
  type CronEmailToolConfig,
  type CronJobToolsConfig,
  type CronEmailToolDefaults,
} from "@/lib/cron/api";
import {
  listLeadGenerationJobs,
  listLeadsByCompany,
  type LeadGenerationJob,
  type LeadSummary,
} from "@/lib/leads/lead-generation-api";
import {
  LeadContextAttachmentsSection,
  type LeadContextAttachmentsValue,
} from "./shared/LeadContextAttachmentsSection";

type CronAgentOption = {
  id: number;
  name: string;
};

type CronSquadOption = {
  id: string;
  name: string;
};

type CronJobsModalProps = {
  open: boolean;
  companyId: number | null;
  agents: CronAgentOption[];
  squads: CronSquadOption[];
  onClose: () => void;
};

type Tab = "jobs" | "new";

const ACCENT = "#f59e0b"; // warm amber to match HUD button

const DEFAULT_TZ =
  (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
  "UTC";

const PRESET_SCHEDULES: { label: string; expr: string; hint: string }[] = [
  { label: "Every 5 minutes", expr: "*/5 * * * *", hint: "Fires every five minutes" },
  { label: "Every hour", expr: "0 * * * *", hint: "Top of every hour" },
  { label: "Daily 9am", expr: "0 9 * * *", hint: "Every day at 9:00" },
  { label: "Weekdays 8am", expr: "0 8 * * 1-5", hint: "Mon–Fri at 8:00" },
  { label: "Monday 7am", expr: "0 7 * * 1", hint: "Every Monday at 7:00" },
];

const toLocalDateTimeInput = (offsetMinutes = 30): string => {
  const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalDateTimeInput = (value: string): string | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

export function CronJobsModal({
  open,
  companyId,
  agents,
  squads,
  onClose,
}: CronJobsModalProps) {
  const [tab, setTab] = useState<Tab>("jobs");
  const [jobs, setJobs] = useState<CronJobListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);
  const [selectedJobRuns, setSelectedJobRuns] = useState<CronJobRun[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Edit dialog — holds the job currently being edited (null = no dialog).
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formKind, setFormKind] = useState<CronJobKind>("one-shot");
  const [formRunAt, setFormRunAt] = useState(() => toLocalDateTimeInput(30));
  const [formCron, setFormCron] = useState("0 9 * * *");
  const [formTimezone, setFormTimezone] = useState(DEFAULT_TZ);
  const [formSystemEvent, setFormSystemEvent] = useState("");
  const [formSessionMode, setFormSessionMode] = useState<CronJobSessionMode>("fresh");
  const [formSessionKey, setFormSessionKey] = useState("");
  const [formWake, setFormWake] = useState<CronJobWakeMode>("now");
  const [formDelivery, setFormDelivery] = useState<CronJobDeliveryMode>("announce");
  const [formWebhookUrl, setFormWebhookUrl] = useState("");
  const [formWebhookToken, setFormWebhookToken] = useState("");
  const [formAgentId, setFormAgentId] = useState<string>("");
  const [formSquadId, setFormSquadId] = useState<string>("");
  const [formDeleteAfterRun, setFormDeleteAfterRun] = useState(true);
  // ── Tools (v28) ─────────────────────────────────────────────────────────
  // The email tool lets the cron-driven agent send transactional emails via
  // the company's Resend account. Credentials live on the server; the UI
  // only captures the "shape" of the email (who it's from, default subject,
  // optional footer banner).
  const [formEmailEnabled, setFormEmailEnabled] = useState(false);
  const [formEmailFrom, setFormEmailFrom] = useState("");
  const [formEmailFromName, setFormEmailFromName] = useState("");
  // Reply-To is no longer an editable form field — OpenClaw picks the
  // reply address at dispatch (verified Resend sender), so we just
  // always submit `null` for this job shape.
  const [formEmailSubject, setFormEmailSubject] = useState("");
  const [formEmailFooterDataUrl, setFormEmailFooterDataUrl] = useState<string | null>(null);
  const [formEmailFooterName, setFormEmailFooterName] = useState<string | null>(null);
  const [formEmailHint, setFormEmailHint] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Lead context + attachments (backend v14 context_attachments feature).
  const [contextValue, setContextValue] = useState<LeadContextAttachmentsValue>({
    leadId: null,
    leadGenerationJobId: null,
    attachments: [],
  });
  const [contextLeads, setContextLeads] = useState<LeadSummary[]>([]);
  const [contextMissions, setContextMissions] = useState<LeadGenerationJob[]>([]);

  // Email-tool defaults (back v29). Lazily fetched the first time the "new"
  // tab is opened so the operator sees their real email / name / footer
  // before even toggling the tool on. Re-used by the edit dialog too.
  const [emailDefaults, setEmailDefaults] = useState<CronEmailToolDefaults | null>(
    null,
  );
  const [emailDefaultsLoaded, setEmailDefaultsLoaded] = useState(false);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormDescription("");
    setFormKind("one-shot");
    setFormRunAt(toLocalDateTimeInput(30));
    setFormCron("0 9 * * *");
    setFormTimezone(DEFAULT_TZ);
    setFormSystemEvent("");
    setFormSessionMode("fresh");
    setFormSessionKey("");
    setFormWake("now");
    setFormDelivery("announce");
    setFormWebhookUrl("");
    setFormWebhookToken("");
    setFormAgentId("");
    setFormSquadId("");
    setFormDeleteAfterRun(true);
    setFormEmailEnabled(false);
    setFormEmailFrom("");
    setFormEmailFromName("");
    setFormEmailSubject("");
    setFormEmailFooterDataUrl(null);
    setFormEmailFooterName(null);
    setFormEmailHint("");
    setContextValue({ leadId: null, leadGenerationJobId: null, attachments: [] });
    setCreateError(null);
  }, []);

  // Lazy-load lead/mission options the first time the user opens the "new"
  // tab — avoids burning a list round-trip every time the jobs tab loads.
  useEffect(() => {
    if (!open || tab !== "new" || !companyId) return;
    let cancelled = false;
    const loadContextOptions = async () => {
      try {
        const [leads, missions] = await Promise.all([
          listLeadsByCompany(companyId).catch(() => [] as LeadSummary[]),
          listLeadGenerationJobs(companyId).catch(() => [] as LeadGenerationJob[]),
        ]);
        if (cancelled) return;
        setContextLeads(leads);
        setContextMissions(missions);
      } catch {
        // Non-fatal — the section simply shows no options.
      }
    };
    void loadContextOptions();
    return () => {
      cancelled = true;
    };
  }, [open, tab, companyId]);

  // Resolve the email-tool defaults as soon as the modal opens. We use
  // `resolveEmailToolDefaults` (not the raw endpoint) so even if the v29
  // backend endpoint is missing we still get the operator's profile data
  // from /Users/me + /Companies/by-company + /Users/{id}/email-context +
  // the session cookie. This is what the user explicitly asked for:
  // "puxar tudo prenchido do usuario logado, footer, ...".
  useEffect(() => {
    if (!open || !companyId || emailDefaultsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const defaults = await resolveEmailToolDefaults(companyId);
        if (cancelled) return;
        setEmailDefaults(defaults);
      } catch {
        if (!cancelled) setEmailDefaults(null);
      } finally {
        if (!cancelled) setEmailDefaultsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, companyId, emailDefaultsLoaded]);

  // Reset the "loaded" latch when the modal closes so a second open (for
  // example after editing the user profile) re-fetches fresh defaults.
  useEffect(() => {
    if (!open) {
      setEmailDefaultsLoaded(false);
      setEmailDefaults(null);
    }
  }, [open]);

  // Eagerly prefill the create form's email fields the moment defaults
  // arrive — regardless of whether the operator toggled the tool on.
  // This is what makes the "Email tool (Resend)" card visibly populated
  // the second the modal opens instead of sitting empty until the user
  // checks the box. We only write into blank fields to avoid clobbering
  // values the operator may have already typed.
  useEffect(() => {
    if (!emailDefaults) return;
    setFormEmailFrom((current) => current || emailDefaults.fromEmail || "");
    setFormEmailFromName((current) => current || emailDefaults.fromName || "");
    // Reply-To: no UI field → no prefill.
    setFormEmailFooterDataUrl((current) =>
      current ? current : emailDefaults.footerImageDataUrl || null,
    );
    setFormEmailFooterName((current) =>
      current
        ? current
        : emailDefaults.footerImageDataUrl
          ? emailDefaults.footerImageFileName || "Your profile footer"
          : null,
    );
  }, [emailDefaults]);

  const leadOptions = useMemo(
    () =>
      contextLeads.map((lead) => ({
        id: lead.id,
        label: lead.businessName || `Lead #${lead.id}`,
        sublabel:
          [lead.city, lead.state].filter(Boolean).join(", ") || lead.category || null,
      })),
    [contextLeads],
  );

  const missionOptions = useMemo(
    () =>
      contextMissions.map((mission) => ({
        id: mission.id,
        label: mission.title || `Mission #${mission.id}`,
        sublabel: mission.query || null,
      })),
    [contextMissions],
  );

  const loadJobs = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchCronJobs(companyId);
      // Sort: active first, then by nextRunAt, then by createdDate.
      const sorted = [...list].sort((a, b) => {
        const aActive = a.status === "active" ? 0 : 1;
        const bActive = b.status === "active" ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        const aNext = a.nextRunAtUtc ? new Date(a.nextRunAtUtc).getTime() : Infinity;
        const bNext = b.nextRunAtUtc ? new Date(b.nextRunAtUtc).getTime() : Infinity;
        if (aNext !== bNext) return aNext - bNext;
        return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
      });
      setJobs(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const loadJobDetail = useCallback(async (jobId: number) => {
    setDetailLoading(true);
    try {
      const [job, runs] = await Promise.all([
        fetchCronJob(jobId),
        fetchCronJobRuns(jobId, 20).catch(() => [] as CronJobRun[]),
      ]);
      setSelectedJob(job);
      setSelectedJobRuns(runs);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !companyId) return;
    void loadJobs();
  }, [open, companyId, loadJobs]);

  useEffect(() => {
    if (!open) return;
    if (selectedJobId == null) {
      setSelectedJob(null);
      setSelectedJobRuns([]);
      return;
    }
    void loadJobDetail(selectedJobId);
  }, [open, selectedJobId, loadJobDetail]);

  // Auto-refresh running jobs every 10s
  useEffect(() => {
    if (!open || !companyId) return;
    const hasActive = jobs.some((j) => j.status === "active");
    if (!hasActive) return;
    const intervalId = window.setInterval(() => {
      void loadJobs();
      if (selectedJobId != null) void loadJobDetail(selectedJobId);
    }, 10_000);
    return () => window.clearInterval(intervalId);
  }, [open, companyId, jobs, loadJobs, selectedJobId, loadJobDetail]);

  const handleSelectJob = useCallback((jobId: number) => {
    setSelectedJobId((current) => (current === jobId ? null : jobId));
  }, []);

  const runAction = useCallback(
    async (
      key: string,
      action: () => Promise<unknown>,
      postAction?: () => Promise<void>,
    ) => {
      setActionBusy(key);
      setError(null);
      try {
        await action();
        await loadJobs();
        if (postAction) await postAction();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setActionBusy(null);
      }
    },
    [loadJobs],
  );

  const handlePause = (jobId: number) =>
    void runAction(
      `pause-${jobId}`,
      () => pauseCronJob(jobId),
      async () => {
        if (selectedJobId === jobId) await loadJobDetail(jobId);
      },
    );
  const handleResume = (jobId: number) =>
    void runAction(
      `resume-${jobId}`,
      () => resumeCronJob(jobId),
      async () => {
        if (selectedJobId === jobId) await loadJobDetail(jobId);
      },
    );
  const handleCancel = (jobId: number) =>
    void runAction(
      `cancel-${jobId}`,
      () => cancelCronJob(jobId),
      async () => {
        if (selectedJobId === jobId) await loadJobDetail(jobId);
      },
    );
  const handleDelete = (jobId: number) => {
    if (!confirm("Delete this cron job? This cannot be undone.")) return;
    void runAction(
      `delete-${jobId}`,
      () => deleteCronJob(jobId),
      async () => {
        if (selectedJobId === jobId) setSelectedJobId(null);
      },
    );
  };
  const handleRunNow = (jobId: number) =>
    void runAction(
      `run-${jobId}`,
      () => triggerCronJobRun(jobId),
      async () => {
        if (selectedJobId === jobId) await loadJobDetail(jobId);
      },
    );

  // Open the edit dialog for the currently selected job (or fetch if needed).
  const handleOpenEdit = useCallback(
    async (jobId: number) => {
      try {
        const job =
          selectedJob && selectedJob.id === jobId ? selectedJob : await fetchCronJob(jobId);
        setEditingJob(job);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [selectedJob],
  );

  // After a successful save: refresh list + detail so the new values show up
  // immediately in the expanded row.
  const handleEditSaved = useCallback(
    async (jobId: number) => {
      setEditingJob(null);
      await loadJobs();
      if (selectedJobId === jobId) {
        await loadJobDetail(jobId);
      }
    },
    [loadJobs, loadJobDetail, selectedJobId],
  );

  const canCreate =
    !!companyId &&
    formName.trim().length > 0 &&
    formSystemEvent.trim().length > 0 &&
    (formKind === "one-shot"
      ? !!fromLocalDateTimeInput(formRunAt)
      : formCron.trim().length > 0);

  const handleCreate = useCallback(async () => {
    if (!companyId || !canCreate) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const payload: CreateCronJobInput = {
        companyId,
        name: formName.trim(),
        description: formDescription.trim() || null,
        kind: formKind,
        cronExpression: formKind === "recurring" ? formCron.trim() : null,
        timezone: formKind === "recurring" ? formTimezone.trim() || null : null,
        runAtUtc:
          formKind === "one-shot" ? fromLocalDateTimeInput(formRunAt) : null,
        sessionMode: formSessionMode,
        sessionKey:
          formSessionMode === "named" && formSessionKey.trim()
            ? formSessionKey.trim()
            : null,
        systemEvent: formSystemEvent.trim(),
        wakeMode: formWake,
        deliveryMode: formDelivery,
        webhookUrl:
          formDelivery === "webhook" && formWebhookUrl.trim()
            ? formWebhookUrl.trim()
            : null,
        webhookToken:
          formDelivery === "webhook" && formWebhookToken.trim()
            ? formWebhookToken.trim()
            : null,
        deleteAfterRun: formKind === "one-shot" ? formDeleteAfterRun : false,
        agentId:
          formAgentId.trim() && !Number.isNaN(Number(formAgentId))
            ? Number(formAgentId)
            : null,
        squadId: formSquadId.trim() || null,
        leadId: contextValue.leadId,
        leadGenerationJobId: contextValue.leadGenerationJobId,
        attachments:
          contextValue.attachments.length > 0 ? contextValue.attachments : null,
        tools: buildToolsPayload({
          emailEnabled: formEmailEnabled,
          fromEmail: formEmailFrom,
          fromName: formEmailFromName,
          // OpenClaw resolves Reply-To at dispatch (verified From sender).
          replyTo: "",
          subjectTemplate: formEmailSubject,
          footerImageDataUrl: formEmailFooterDataUrl,
          instructionsHint: formEmailHint,
        }),
      };
      await createCronJob(payload);
      resetForm();
      await loadJobs();
      setTab("jobs");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreateBusy(false);
    }
  }, [
    canCreate,
    companyId,
    contextValue,
    formAgentId,
    formCron,
    formDelivery,
    formDeleteAfterRun,
    formDescription,
    formKind,
    formName,
    formRunAt,
    formSessionKey,
    formSessionMode,
    formSquadId,
    formSystemEvent,
    formTimezone,
    formWake,
    formWebhookToken,
    formWebhookUrl,
    formEmailEnabled,
    formEmailFrom,
    formEmailFromName,
    formEmailSubject,
    formEmailFooterDataUrl,
    formEmailHint,
    loadJobs,
    resetForm,
  ]);

  const scheduleSummary = useMemo(() => {
    if (formKind === "one-shot") {
      const parsed = fromLocalDateTimeInput(formRunAt);
      if (!parsed) return "Pick a date and time";
      return `Runs once · ${formatCronDate(parsed)}`;
    }
    return `${formCron.trim() || "?"} · ${formTimezone || DEFAULT_TZ}`;
  }, [formKind, formRunAt, formCron, formTimezone]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-[#0b0e14] shadow-[0_32px_120px_rgba(0,0,0,.72)]"
        style={{ borderColor: `${ACCENT}30` }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${ACCENT}20`, border: `1.5px solid ${ACCENT}50` }}
          >
            <Timer className="h-5 w-5" style={{ color: ACCENT }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-white">
              Cron jobs
            </h2>
            <p className="text-xs text-white/40">
              Scheduled one-shot reminders and recurring background tasks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadJobs()}
            disabled={loading}
            title="Refresh"
            className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-white/10">
          <button
            type="button"
            onClick={() => setTab("jobs")}
            className={`flex-1 py-3 text-center text-xs font-medium tracking-wide transition ${
              tab === "jobs" ? "border-b-2 text-white" : "text-white/40 hover:text-white/60"
            }`}
            style={tab === "jobs" ? { borderColor: ACCENT } : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              Jobs
              <span
                className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                style={{ backgroundColor: `${ACCENT}25`, color: ACCENT }}
              >
                {jobs.length}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("new")}
            className={`flex-1 py-3 text-center text-xs font-medium tracking-wide transition ${
              tab === "new" ? "border-b-2 text-white" : "text-white/40 hover:text-white/60"
            }`}
            style={tab === "new" ? { borderColor: ACCENT } : undefined}
          >
            New job
          </button>
        </div>

        {/* ── Content ── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-6">{error}</span>
            </div>
          )}

          {tab === "jobs" && (
            <div className="space-y-2">
              {jobs.length === 0 && !loading ? (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
                  <div
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${ACCENT}15`, border: `1.5px solid ${ACCENT}30` }}
                  >
                    <CalendarClock className="h-5 w-5" style={{ color: ACCENT }} />
                  </div>
                  <div className="text-sm font-medium text-white">No cron jobs yet</div>
                  <div className="mt-1 text-xs text-white/35">
                    Schedule a one-shot reminder or a recurring background task.
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab("new")}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
                    style={{ backgroundColor: `${ACCENT}25`, border: `1px solid ${ACCENT}40` }}
                  >
                    <Plus className="h-4 w-4" />
                    New job
                  </button>
                </div>
              ) : (
                jobs.map((job) => {
                  const isExpanded = selectedJobId === job.id;
                  const statusColor = STATUS_COLOR[job.status];
                  return (
                    <div
                      key={job.id}
                      className={`overflow-hidden rounded-xl border transition ${
                        isExpanded
                          ? "bg-white/[0.04]"
                          : "border-white/[0.06] bg-transparent hover:border-white/12 hover:bg-white/[0.03]"
                      }`}
                      style={isExpanded ? { borderColor: `${ACCENT}40` } : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectJob(job.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <span className="text-white/30">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-medium text-white">
                              {job.name || `Job #${job.id}`}
                            </div>
                            <span
                              className="shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                              style={{
                                borderColor: `${statusColor}40`,
                                backgroundColor: `${statusColor}15`,
                                color: statusColor,
                              }}
                            >
                              {STATUS_LABEL[job.status]}
                            </span>
                            <ToolsBadge summary={job.toolsSummary} compact />
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/35">
                            <span>{KIND_LABEL[job.kind]}</span>
                            <span className="text-white/20">·</span>
                            <span>
                              {job.kind === "recurring"
                                ? job.cronExpression || "—"
                                : job.runAtUtc
                                  ? formatRelativeTime(job.runAtUtc)
                                  : "—"}
                            </span>
                            {job.runCount > 0 && (
                              <>
                                <span className="text-white/20">·</span>
                                <span>
                                  {job.runCount} run{job.runCount === 1 ? "" : "s"}
                                </span>
                              </>
                            )}
                            {job.failureCount > 0 && (
                              <>
                                <span className="text-white/20">·</span>
                                <span className="text-red-300">
                                  {job.failureCount} failed
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="space-y-3 border-t border-white/[0.06] bg-black/20 px-4 py-4">
                          {detailLoading && !selectedJob ? (
                            <div className="flex items-center justify-center py-6 text-white/40">
                              <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                          ) : selectedJob ? (
                            <>
                              {selectedJob.description && (
                                <div className="text-xs leading-5 text-white/60">
                                  {selectedJob.description}
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-white/60">
                                <DetailRow
                                  label="Schedule"
                                  value={
                                    selectedJob.kind === "recurring"
                                      ? `${selectedJob.cronExpression ?? ""} (${selectedJob.timezone ?? DEFAULT_TZ})`
                                      : formatCronDate(selectedJob.runAtUtc)
                                  }
                                />
                                <DetailRow
                                  label="Next run"
                                  value={
                                    selectedJob.nextRunAtUtc
                                      ? `${formatCronDate(selectedJob.nextRunAtUtc)} · ${formatRelativeTime(selectedJob.nextRunAtUtc)}`
                                      : "—"
                                  }
                                />
                                <DetailRow
                                  label="Session"
                                  value={SESSION_LABEL[selectedJob.sessionMode]}
                                />
                                <DetailRow
                                  label="Delivery"
                                  value={DELIVERY_LABEL[selectedJob.deliveryMode]}
                                />
                                <DetailRow
                                  label="Wake"
                                  value={WAKE_LABEL[selectedJob.wakeMode]}
                                />
                                <DetailRow
                                  label="Last result"
                                  value={
                                    selectedJob.lastRunStatus
                                      ? `${selectedJob.lastRunStatus}${
                                          selectedJob.lastRunAtUtc
                                            ? ` · ${formatRelativeTime(selectedJob.lastRunAtUtc)}`
                                            : ""
                                        }`
                                      : "never run"
                                  }
                                />
                                <DetailRow
                                  label="Gateway sync"
                                  value={
                                    selectedJob.openClawJobId
                                      ? `mirrored · ${selectedJob.openClawJobId}`
                                      : "local only"
                                  }
                                />
                              </div>

                              {selectedJob.systemEvent && (
                                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                                    System event
                                  </div>
                                  <div className="whitespace-pre-wrap text-[12px] leading-5 text-white/85">
                                    {selectedJob.systemEvent}
                                  </div>
                                </div>
                              )}

                              {selectedJob.toolsSummary?.emailEnabled && (
                                <div
                                  className="rounded-lg border p-3"
                                  style={{
                                    borderColor: `${ACCENT}30`,
                                    backgroundColor: `${ACCENT}0D`,
                                  }}
                                >
                                  <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-white/55">
                                    <Mail className="h-3 w-3" style={{ color: ACCENT }} />
                                    Tools · Email (Resend) · Custom overrides
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-white/75">
                                    <div>
                                      <span className="text-white/40">From: </span>
                                      <span className="font-mono text-white/85">
                                        {selectedJob.toolsSummary.emailFromEmail ??
                                          "—"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-white/40">Name: </span>
                                      <span className="text-white/85">
                                        {selectedJob.toolsSummary.emailFromName ??
                                          "—"}
                                      </span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-white/40">Footer: </span>
                                      <span className="text-white/85">
                                        {selectedJob.toolsSummary.hasFooterImage
                                          ? "custom image"
                                          : "author default"}
                                      </span>
                                    </div>
                                    {selectedJob.tools?.email?.subjectTemplate && (
                                      <div className="col-span-2">
                                        <span className="text-white/40">
                                          Default subject:{" "}
                                        </span>
                                        <span className="text-white/85">
                                          {selectedJob.tools.email.subjectTemplate}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {selectedJob.lastErrorMessage && (
                                <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-[11px] text-red-100">
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider">
                                    Last error
                                  </div>
                                  <div className="whitespace-pre-wrap leading-5">
                                    {selectedJob.lastErrorMessage}
                                  </div>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex flex-wrap gap-2 pt-1">
                                <ActionButton
                                  icon={<Play className="h-3.5 w-3.5" />}
                                  label="Run now"
                                  tone="accent"
                                  busy={actionBusy === `run-${job.id}`}
                                  onClick={() => handleRunNow(job.id)}
                                />
                                <ActionButton
                                  icon={<Pencil className="h-3.5 w-3.5" />}
                                  label="Edit"
                                  tone="muted"
                                  busy={false}
                                  onClick={() => void handleOpenEdit(job.id)}
                                />
                                {job.status === "active" && (
                                  <ActionButton
                                    icon={<Pause className="h-3.5 w-3.5" />}
                                    label="Pause"
                                    tone="muted"
                                    busy={actionBusy === `pause-${job.id}`}
                                    onClick={() => handlePause(job.id)}
                                  />
                                )}
                                {job.status === "paused" && (
                                  <ActionButton
                                    icon={<Play className="h-3.5 w-3.5" />}
                                    label="Resume"
                                    tone="muted"
                                    busy={actionBusy === `resume-${job.id}`}
                                    onClick={() => handleResume(job.id)}
                                  />
                                )}
                                {(job.status === "active" || job.status === "paused") && (
                                  <ActionButton
                                    icon={<CircleStop className="h-3.5 w-3.5" />}
                                    label="Cancel"
                                    tone="muted"
                                    busy={actionBusy === `cancel-${job.id}`}
                                    onClick={() => handleCancel(job.id)}
                                  />
                                )}
                                <ActionButton
                                  icon={<Trash2 className="h-3.5 w-3.5" />}
                                  label="Delete"
                                  tone="danger"
                                  busy={actionBusy === `delete-${job.id}`}
                                  onClick={() => handleDelete(job.id)}
                                />
                              </div>

                              {/* Runs */}
                              {selectedJobRuns.length > 0 && (
                                <div className="pt-2">
                                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                                    Recent runs
                                  </div>
                                  <div className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.08]">
                                    {selectedJobRuns.slice(0, 8).map((run) => (
                                      <RunRow key={run.id} run={run} />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "new" && (
            <div className="space-y-4">
              {createError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="leading-6">{createError}</span>
                </div>
              )}

              <Field label="Name" required>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Daily brief for Ops"
                  className={inputClass}
                />
              </Field>

              <Field label="Description" hint="Internal note — not sent to the agent.">
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Remind me to check the morning inbox."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </Field>

              {/* Kind toggle */}
              <div className="grid grid-cols-2 gap-2">
                <KindButton
                  active={formKind === "one-shot"}
                  onClick={() => setFormKind("one-shot")}
                  icon={<Timer className="h-4 w-4" />}
                  label="Run once"
                  hint="Fire at an exact date & time"
                />
                <KindButton
                  active={formKind === "recurring"}
                  onClick={() => setFormKind("recurring")}
                  icon={<RefreshCcw className="h-4 w-4" />}
                  label="Recurring"
                  hint="Cron expression, repeats forever"
                />
              </div>

              {formKind === "one-shot" ? (
                <Field label="Run at" required hint="Your local time — stored as UTC.">
                  <input
                    type="datetime-local"
                    value={formRunAt}
                    onChange={(e) => setFormRunAt(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              ) : (
                <>
                  <Field label="Cron expression" required hint="Standard 5-field syntax (min hour day month dow).">
                    <input
                      type="text"
                      value={formCron}
                      onChange={(e) => setFormCron(e.target.value)}
                      placeholder="0 9 * * *"
                      className={`${inputClass} font-mono tracking-wider`}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SCHEDULES.map((p) => (
                      <button
                        key={p.expr}
                        type="button"
                        onClick={() => setFormCron(p.expr)}
                        title={p.hint}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                          formCron.trim() === p.expr
                            ? "border-[var(--accent)] bg-[var(--accent)]/15 text-white"
                            : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white"
                        }`}
                        style={{ ["--accent" as string]: ACCENT } as React.CSSProperties}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <Field label="Timezone" hint="IANA zone (e.g. America/Los_Angeles).">
                    <input
                      type="text"
                      value={formTimezone}
                      onChange={(e) => setFormTimezone(e.target.value)}
                      placeholder="America/Los_Angeles"
                      className={inputClass}
                    />
                  </Field>
                </>
              )}

              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/60">
                <span className="font-semibold text-white/70">Schedule preview:</span>{" "}
                {scheduleSummary}
              </div>

              <Field
                label="System event"
                required
                hint="The message the cron will deliver to the agent when it fires."
              >
                <textarea
                  value={formSystemEvent}
                  onChange={(e) => setFormSystemEvent(e.target.value)}
                  placeholder="Reminder: check the cron docs draft."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Session mode">
                  <select
                    value={formSessionMode}
                    onChange={(e) =>
                      setFormSessionMode(e.target.value as CronJobSessionMode)
                    }
                    className={inputClass}
                  >
                    <option value="fresh">Fresh session per run</option>
                    <option value="main">Main session</option>
                    <option value="named">Named session</option>
                  </select>
                </Field>
                <Field label="Wake mode">
                  <select
                    value={formWake}
                    onChange={(e) => setFormWake(e.target.value as CronJobWakeMode)}
                    className={inputClass}
                  >
                    <option value="now">Wake immediately</option>
                    <option value="idle">Only when idle</option>
                    <option value="next-turn">Wait for next turn</option>
                  </select>
                </Field>
              </div>

              {formSessionMode === "named" && (
                <Field
                  label="Session key"
                  hint="Prefixes accepted by the gateway: agent:, hook:, studio:, web:. If you only type an identifier (e.g. daily-brief) the backend normalizes it automatically."
                >
                  <input
                    type="text"
                    value={formSessionKey}
                    onChange={(e) => setFormSessionKey(e.target.value)}
                    placeholder="daily-brief or hook:okestria-cron-daily-brief"
                    className={`${inputClass} font-mono`}
                  />
                  {formSessionKey.trim() && (
                    <div className="mt-1 font-mono text-[10px] leading-4 text-white/45">
                      Gateway will see:{" "}
                      <span className="text-white/70">
                        {previewEffectiveSessionKey(formSessionKey)}
                      </span>
                    </div>
                  )}
                </Field>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Agent (optional)">
                  <select
                    value={formAgentId}
                    onChange={(e) => setFormAgentId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">— None —</option>
                    {agents.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Squad (optional)">
                  <select
                    value={formSquadId}
                    onChange={(e) => setFormSquadId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">— None —</option>
                    {squads.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Delivery">
                <select
                  value={formDelivery}
                  onChange={(e) =>
                    setFormDelivery(e.target.value as CronJobDeliveryMode)
                  }
                  className={inputClass}
                >
                  <option value="announce">Announce in chat</option>
                  <option value="webhook">Webhook callback</option>
                  <option value="none">Silent (no delivery)</option>
                </select>
              </Field>

              {formDelivery === "webhook" && (
                <div className="grid grid-cols-1 gap-3">
                  <Field label="Webhook URL">
                    <input
                      type="text"
                      value={formWebhookUrl}
                      onChange={(e) => setFormWebhookUrl(e.target.value)}
                      placeholder="https://your-host/callbacks/cron"
                      className={`${inputClass} font-mono`}
                    />
                  </Field>
                  <Field label="Webhook bearer token (optional)">
                    <input
                      type="text"
                      value={formWebhookToken}
                      onChange={(e) => setFormWebhookToken(e.target.value)}
                      placeholder="tok_…"
                      className={`${inputClass} font-mono`}
                    />
                  </Field>
                </div>
              )}

              {formKind === "one-shot" && (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={formDeleteAfterRun}
                    onChange={(e) => setFormDeleteAfterRun(e.target.checked)}
                    className="h-3.5 w-3.5 accent-amber-400"
                  />
                  Delete the job automatically after it runs
                </label>
              )}

              <LeadContextAttachmentsSection
                value={contextValue}
                onChange={setContextValue}
                leadOptions={leadOptions}
                missionOptions={missionOptions}
                accent="amber"
                disabled={createBusy}
                description="Pin a lead or mission so every firing of this cron sees the same briefing, and drop up to 6 files the agent can open at runtime (15MB each, 25MB total)."
              />

              <EmailToolCard
                enabled={formEmailEnabled}
                onEnabledChange={setFormEmailEnabled}
                fromEmail={formEmailFrom}
                onFromEmailChange={setFormEmailFrom}
                fromName={formEmailFromName}
                onFromNameChange={setFormEmailFromName}
                subjectTemplate={formEmailSubject}
                onSubjectTemplateChange={setFormEmailSubject}
                footerDataUrl={formEmailFooterDataUrl}
                footerName={formEmailFooterName}
                onFooterChange={(dataUrl, name) => {
                  setFormEmailFooterDataUrl(dataUrl);
                  setFormEmailFooterName(name);
                }}
                instructionsHint={formEmailHint}
                onInstructionsHintChange={setFormEmailHint}
                defaults={emailDefaults}
                onResetToDefaults={() => {
                  if (!emailDefaults) return;
                  setFormEmailFrom(emailDefaults.fromEmail ?? "");
                  setFormEmailFromName(emailDefaults.fromName ?? "");
                  // Reply-To intentionally not restored — no UI field.
                  setFormEmailFooterDataUrl(emailDefaults.footerImageDataUrl ?? null);
                  setFormEmailFooterName(
                    emailDefaults.footerImageDataUrl
                      ? emailDefaults.footerImageFileName || "Your profile footer"
                      : null,
                  );
                }}
                disabled={createBusy}
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setTab("jobs");
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-white/55 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={!canCreate || createBusy}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: ACCENT }}
                >
                  {createBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Schedule job
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Edit dialog — opens on top of the main modal when a job is picked */}
      {editingJob && (
        <EditCronJobDialog
          job={editingJob}
          agents={agents}
          squads={squads}
          emailDefaults={emailDefaults}
          onClose={() => setEditingJob(null)}
          onSaved={() => void handleEditSaved(editingJob.id)}
        />
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/25";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/50">
        {label}
        {required ? <span className="text-amber-300">*</span> : null}
      </div>
      {children}
      {hint ? <div className="text-[10px] text-white/35">{hint}</div> : null}
    </label>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-white/35">
        {label}
      </span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function KindButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? "border-amber-400/50 bg-amber-500/10 text-white"
          : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5"
      }`}
    >
      <span className={active ? "text-amber-300" : "text-white/40"}>{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-[11px] leading-4 text-white/40">{hint}</span>
      </span>
    </button>
  );
}

function ActionButton({
  icon,
  label,
  tone,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "accent" | "muted" | "danger";
  busy?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === "accent"
      ? "border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
      : tone === "danger"
        ? "border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EditCronJobDialog
//
// Secondary modal-on-top-of-modal that edits the editable subset of a
// CronJob. It pre-fills from the current job, sends only changed fields
// through `updateCronJob`, and bubbles a `onSaved` event so the parent
// can refresh both the list and the expanded detail view.
// ─────────────────────────────────────────────────────────────────────────

type EditCronJobDialogProps = {
  job: CronJob;
  agents: CronAgentOption[];
  squads: CronSquadOption[];
  emailDefaults: CronEmailToolDefaults | null;
  onClose: () => void;
  onSaved: () => void;
};

// Convert an ISO string back to the value a <input type="datetime-local"/>
// expects (YYYY-MM-DDTHH:mm in local time).
const isoToLocalDateTimeInput = (iso: string | null): string => {
  if (!iso) return toLocalDateTimeInput(30);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return toLocalDateTimeInput(30);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function EditCronJobDialog({
  job,
  agents,
  squads,
  emailDefaults,
  onClose,
  onSaved,
}: EditCronJobDialogProps) {
  // ── Form state, seeded from the job ──
  const [name, setName] = useState(job.name ?? "");
  const [description, setDescription] = useState(job.description ?? "");
  const [runAt, setRunAt] = useState(() =>
    job.kind === "one-shot" ? isoToLocalDateTimeInput(job.runAtUtc) : toLocalDateTimeInput(30),
  );
  const [cronExpr, setCronExpr] = useState(job.cronExpression ?? "0 9 * * *");
  const [timezone, setTimezone] = useState(job.timezone ?? DEFAULT_TZ);
  const [systemEvent, setSystemEvent] = useState(job.systemEvent ?? "");
  const [sessionMode, setSessionMode] = useState<CronJobSessionMode>(job.sessionMode);
  const [sessionKey, setSessionKey] = useState(job.sessionKey ?? "");
  const [wakeMode, setWakeMode] = useState<CronJobWakeMode>(job.wakeMode);
  const [deliveryMode, setDeliveryMode] = useState<CronJobDeliveryMode>(job.deliveryMode);
  const [webhookUrl, setWebhookUrl] = useState(job.webhookUrl ?? "");
  const [webhookToken, setWebhookToken] = useState(job.webhookToken ?? "");
  const [agentId, setAgentId] = useState<string>(
    job.agentId != null ? String(job.agentId) : "",
  );
  const [squadId, setSquadId] = useState<string>(job.squadId ?? "");
  const [deleteAfterRun, setDeleteAfterRun] = useState(job.deleteAfterRun);

  // Tools (v28) — seeded from job.tools.email, plus a flag tracking whether
  // the operator touched any tools field (to decide between patch / no-op).
  const initialEmail = job.tools?.email ?? null;
  const [emailEnabled, setEmailEnabled] = useState<boolean>(
    !!initialEmail?.enabled,
  );
  const [emailFrom, setEmailFrom] = useState<string>(initialEmail?.fromEmail ?? "");
  const [emailFromName, setEmailFromName] = useState<string>(
    initialEmail?.fromName ?? "",
  );
  // Reply-To is not editable anymore — OpenClaw picks it at dispatch.
  // We don't track it as a form field; the submission always sends
  // `null` for replyTo.
  const [emailSubject, setEmailSubject] = useState<string>(
    initialEmail?.subjectTemplate ?? "",
  );
  const [emailFooterDataUrl, setEmailFooterDataUrl] = useState<string | null>(
    initialEmail?.footerImageDataUrl ?? null,
  );
  const [emailFooterName, setEmailFooterName] = useState<string | null>(
    initialEmail?.footerImageDataUrl ? "footer atual" : null,
  );
  const [emailHint, setEmailHint] = useState<string>(
    initialEmail?.instructionsHint ?? "",
  );

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Prefill the email-tool fields from the resolved defaults as soon as
  // they arrive — same eager behavior as the create form. We only write
  // into blank fields so saved job values (and operator-typed overrides)
  // are preserved. This runs regardless of whether `emailEnabled` is true,
  // so when the operator flips the tool ON later the card is already
  // populated with their profile data.
  useEffect(() => {
    if (!emailDefaults) return;
    setEmailFrom((current) => current || emailDefaults.fromEmail || "");
    setEmailFromName((current) => current || emailDefaults.fromName || "");
    // Reply-To: no UI field → no prefill.
    setEmailFooterDataUrl((current) =>
      current ? current : emailDefaults.footerImageDataUrl || null,
    );
    setEmailFooterName((current) =>
      current
        ? current
        : emailDefaults.footerImageDataUrl
          ? emailDefaults.footerImageFileName || "Your profile footer"
          : null,
    );
  }, [emailDefaults]);

  const canSave =
    name.trim().length > 0 &&
    systemEvent.trim().length > 0 &&
    (job.kind === "one-shot"
      ? !!fromLocalDateTimeInput(runAt)
      : cronExpr.trim().length > 0);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setBusy(true);
    setErr(null);
    try {
      // Build the update payload — only include fields that actually changed.
      const payload: UpdateCronJobInput = {};

      const nextName = name.trim();
      if (nextName !== (job.name ?? "")) payload.name = nextName;

      const nextDescription = description.trim() || null;
      if (nextDescription !== (job.description ?? null)) {
        payload.description = nextDescription;
      }

      if (job.kind === "one-shot") {
        const nextRunAt = fromLocalDateTimeInput(runAt);
        if (nextRunAt !== job.runAtUtc) payload.runAtUtc = nextRunAt;
        if (deleteAfterRun !== job.deleteAfterRun) {
          payload.deleteAfterRun = deleteAfterRun;
        }
      } else {
        const nextCron = cronExpr.trim() || null;
        if (nextCron !== (job.cronExpression ?? null)) {
          payload.cronExpression = nextCron;
        }
        const nextTz = timezone.trim() || null;
        if (nextTz !== (job.timezone ?? null)) payload.timezone = nextTz;
      }

      const nextSystemEvent = systemEvent.trim();
      if (nextSystemEvent !== (job.systemEvent ?? "")) {
        payload.systemEvent = nextSystemEvent;
      }

      if (sessionMode !== job.sessionMode) payload.sessionMode = sessionMode;
      const nextSessionKey =
        sessionMode === "named" && sessionKey.trim() ? sessionKey.trim() : null;
      if (nextSessionKey !== (job.sessionKey ?? null)) {
        payload.sessionKey = nextSessionKey;
      }

      if (wakeMode !== job.wakeMode) payload.wakeMode = wakeMode;
      if (deliveryMode !== job.deliveryMode) payload.deliveryMode = deliveryMode;

      const nextWebhookUrl =
        deliveryMode === "webhook" && webhookUrl.trim() ? webhookUrl.trim() : null;
      if (nextWebhookUrl !== (job.webhookUrl ?? null)) {
        payload.webhookUrl = nextWebhookUrl;
      }
      const nextWebhookToken =
        deliveryMode === "webhook" && webhookToken.trim() ? webhookToken.trim() : null;
      if (nextWebhookToken !== (job.webhookToken ?? null)) {
        payload.webhookToken = nextWebhookToken;
        if (nextWebhookToken === null) payload.clearWebhookToken = true;
      }

      // Agent / squad retarget.
      const nextAgentId =
        agentId.trim() && !Number.isNaN(Number(agentId)) ? Number(agentId) : null;
      if (nextAgentId !== (job.agentId ?? null)) {
        if (nextAgentId === null) {
          payload.clearAgent = true;
        } else {
          payload.agentId = nextAgentId;
        }
      }
      const nextSquadId = squadId.trim() || null;
      if (nextSquadId !== (job.squadId ?? null)) {
        if (nextSquadId === null) {
          payload.clearSquad = true;
        } else {
          payload.squadId = nextSquadId;
        }
      }

      // ── Tools (v28) ─────────────────────────────────────────────────
      // Three scenarios:
      //   1. Operator toggled the tool ON or changed any sub-field → send
      //      the whole `tools` bundle.
      //   2. Operator toggled OFF an existing tool → set `clearTools`.
      //   3. Nothing changed → don't include `tools` in the payload at all
      //      (avoids retransmitting the footer data-URL unnecessarily).
      const nextTools = buildToolsPayload({
        emailEnabled,
        fromEmail: emailFrom,
        fromName: emailFromName,
        // OpenClaw resolves Reply-To at dispatch (verified From sender).
        replyTo: "",
        subjectTemplate: emailSubject,
        footerImageDataUrl: emailFooterDataUrl,
        instructionsHint: emailHint,
      });
      const previousTools = job.tools ?? null;
      if (!toolsBundlesEqual(previousTools, nextTools)) {
        if (nextTools === null && previousTools !== null) {
          payload.clearTools = true;
        } else {
          payload.tools = nextTools;
        }
      }

      if (Object.keys(payload).length === 0) {
        // Nothing to do — just close.
        onSaved();
        return;
      }

      await updateCronJob(job.id, payload);
      onSaved();
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }, [
    agentId,
    canSave,
    cronExpr,
    deleteAfterRun,
    deliveryMode,
    description,
    emailEnabled,
    emailFooterDataUrl,
    emailFrom,
    emailFromName,
    emailHint,
    emailSubject,
    job,
    name,
    onSaved,
    runAt,
    sessionKey,
    sessionMode,
    squadId,
    systemEvent,
    timezone,
    wakeMode,
    webhookToken,
    webhookUrl,
  ]);

  const scheduleSummary =
    job.kind === "one-shot"
      ? (() => {
          const parsed = fromLocalDateTimeInput(runAt);
          if (!parsed) return "Pick a date and time";
          return `Runs once · ${formatCronDate(parsed)}`;
        })()
      : `${cronExpr.trim() || "?"} · ${timezone || DEFAULT_TZ}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <section
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-[#0b0e14] shadow-[0_32px_120px_rgba(0,0,0,.72)]"
        style={{ borderColor: `${ACCENT}30` }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${ACCENT}20`, border: `1.5px solid ${ACCENT}50` }}
          >
            <Pencil className="h-4 w-4" style={{ color: ACCENT }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-white">
              Edit cron job
            </h2>
            <p className="truncate text-xs text-white/40">
              {job.name || `Job #${job.id}`} · {KIND_LABEL[job.kind]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          {err && (
            <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-6">{err}</span>
            </div>
          )}

          <Field label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Description" hint="Internal note — not sent to the agent.">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </Field>

          {job.kind === "one-shot" ? (
            <Field label="Run at" required hint="Your local time — stored as UTC.">
              <input
                type="datetime-local"
                value={runAt}
                onChange={(e) => setRunAt(e.target.value)}
                className={inputClass}
              />
            </Field>
          ) : (
            <>
              <Field
                label="Cron expression"
                required
                hint="Standard 5-field syntax (min hour day month dow)."
              >
                <input
                  type="text"
                  value={cronExpr}
                  onChange={(e) => setCronExpr(e.target.value)}
                  className={`${inputClass} font-mono tracking-wider`}
                />
              </Field>
              <Field label="Timezone" hint="IANA zone (e.g. America/Los_Angeles).">
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </>
          )}

          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/60">
            <span className="font-semibold text-white/70">Schedule preview:</span>{" "}
            {scheduleSummary}
          </div>

          <Field
            label="System event"
            required
            hint="The message the cron will deliver to the agent when it fires."
          >
            <textarea
              value={systemEvent}
              onChange={(e) => setSystemEvent(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Session mode">
              <select
                value={sessionMode}
                onChange={(e) => setSessionMode(e.target.value as CronJobSessionMode)}
                className={inputClass}
              >
                <option value="fresh">Fresh session per run</option>
                <option value="main">Main session</option>
                <option value="named">Named session</option>
              </select>
            </Field>
            <Field label="Wake mode">
              <select
                value={wakeMode}
                onChange={(e) => setWakeMode(e.target.value as CronJobWakeMode)}
                className={inputClass}
              >
                <option value="now">Wake immediately</option>
                <option value="idle">Only when idle</option>
                <option value="next-turn">Wait for next turn</option>
              </select>
            </Field>
          </div>

          {sessionMode === "named" && (
            <Field
              label="Session key"
              hint="Prefixes accepted by the gateway: agent:, hook:, studio:, web:. If you only type an identifier (e.g. daily-brief) the backend normalizes it automatically."
            >
              <input
                type="text"
                value={sessionKey}
                onChange={(e) => setSessionKey(e.target.value)}
                placeholder="daily-brief or hook:okestria-cron-daily-brief"
                className={`${inputClass} font-mono`}
              />
              {sessionKey.trim() && (
                <div className="mt-1 font-mono text-[10px] leading-4 text-white/45">
                  Gateway will see:{" "}
                  <span className="text-white/70">
                    {previewEffectiveSessionKey(sessionKey)}
                  </span>
                </div>
              )}
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Agent (optional)">
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className={inputClass}
              >
                <option value="">— None —</option>
                {agents.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Squad (optional)">
              <select
                value={squadId}
                onChange={(e) => setSquadId(e.target.value)}
                className={inputClass}
              >
                <option value="">— None —</option>
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Delivery">
            <select
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value as CronJobDeliveryMode)}
              className={inputClass}
            >
              <option value="announce">Announce in chat</option>
              <option value="webhook">Webhook callback</option>
              <option value="none">Silent (no delivery)</option>
            </select>
          </Field>

          {deliveryMode === "webhook" && (
            <div className="grid grid-cols-1 gap-3">
              <Field label="Webhook URL">
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-host/callbacks/cron"
                  className={`${inputClass} font-mono`}
                />
              </Field>
              <Field label="Webhook bearer token (optional)">
                <input
                  type="text"
                  value={webhookToken}
                  onChange={(e) => setWebhookToken(e.target.value)}
                  placeholder="tok_…"
                  className={`${inputClass} font-mono`}
                />
              </Field>
            </div>
          )}

          {job.kind === "one-shot" && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={deleteAfterRun}
                onChange={(e) => setDeleteAfterRun(e.target.checked)}
                className="h-3.5 w-3.5 accent-amber-400"
              />
              Delete the job automatically after it runs
            </label>
          )}

          <EmailToolCard
            enabled={emailEnabled}
            onEnabledChange={setEmailEnabled}
            fromEmail={emailFrom}
            onFromEmailChange={setEmailFrom}
            fromName={emailFromName}
            onFromNameChange={setEmailFromName}
            subjectTemplate={emailSubject}
            onSubjectTemplateChange={setEmailSubject}
            footerDataUrl={emailFooterDataUrl}
            footerName={emailFooterName}
            onFooterChange={(dataUrl, nextName) => {
              setEmailFooterDataUrl(dataUrl);
              setEmailFooterName(nextName);
            }}
            instructionsHint={emailHint}
            onInstructionsHintChange={setEmailHint}
            defaults={emailDefaults}
            onResetToDefaults={() => {
              if (!emailDefaults) return;
              setEmailFrom(emailDefaults.fromEmail ?? "");
              setEmailFromName(emailDefaults.fromName ?? "");
              // Reply-To intentionally not restored — no UI field.
              setEmailFooterDataUrl(emailDefaults.footerImageDataUrl ?? null);
              setEmailFooterName(
                emailDefaults.footerImageDataUrl
                  ? emailDefaults.footerImageFileName || "Your profile footer"
                  : null,
              );
            }}
            disabled={busy}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-white/55 transition hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave || busy}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </section>
    </div>
  );
}

function RunRow({ run }: { run: CronJobRun }) {
  const status = run.status;
  const color =
    status === "succeeded"
      ? "#22c55e"
      : status === "failed"
        ? "#ef4444"
        : status === "running" || status === "queued"
          ? "#22d3ee"
          : "#94a3b8";

  const hint = buildGatewayErrorHint(run.errorMessage ?? null, run.httpStatus ?? null);

  return (
    <div className="flex flex-col gap-1 px-3 py-2 text-[11px]">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="w-8 shrink-0 text-white/35">#{run.runNumber}</span>
        <span
          className="shrink-0 font-semibold uppercase tracking-wider"
          style={{ color }}
        >
          {status}
        </span>
        {typeof run.httpStatus === "number" && run.httpStatus > 0 && (
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-white/55">
            HTTP {run.httpStatus}
          </span>
        )}
        <span className="ml-auto text-white/40">
          {formatRelativeTime(run.startedAtUtc ?? run.createdDate)}
        </span>
      </div>
      {run.errorMessage && (
        <div className="ml-5 rounded-md border border-red-400/25 bg-red-500/10 px-2 py-1.5 text-[10px] leading-4 text-red-100">
          <div className="whitespace-pre-wrap break-words">{run.errorMessage}</div>
          {hint && (
            <div className="mt-1 border-t border-red-400/20 pt-1 text-red-200/80">
              {hint}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Turns the verbose backend dispatch error into an actionable hint (in PT-BR
 * so it's understandable for the operator). Recognizes the v26 "Gateway
 * responded 404 at /hooks/agent" and the missing-runtime-agent-id case.
 */
function buildGatewayErrorHint(
  errorMessage: string | null,
  httpStatus: number | null,
): string | null {
  if (!errorMessage) return null;
  const lower = errorMessage.toLowerCase();
  if (httpStatus === 404 || lower.includes("404")) {
    if (lower.includes("/hooks/agent") || lower.includes("host=")) {
      return "Tip: check OPENCLAW_HOOKS_BASE_URL / OPENCLAW_HOOKS_TOKEN and confirm the agent is registered in OpenClaw with the same agentId.";
    }
    return "Tip: endpoint not found on the gateway. Check that the hooks are published and the token has permission.";
  }
  if (lower.includes("sessionkey must start with")) {
    return "Tip: back v27 already normalizes the sessionKey to the hook:okestria-cron-… prefix. If you're still seeing this error, upgrade the backend to v27 or above.";
  }
  if (lower.includes("no runtime agent id")) {
    return "Tip: this cron doesn't have an agentId known to OpenClaw. Open the agent and set gatewayAgentId in its profile (or make sure it has a valid slug).";
  }
  if (lower.includes("runtime hooks not configured")) {
    return "Tip: runtime hooks aren't configured yet. Once OPENCLAW_HOOKS_BASE_URL and OPENCLAW_HOOKS_TOKEN are set, this run will complete via webhook.";
  }
  return null;
}

/**
 * Mirrors the backend v27 normalization (NormalizeNamedSessionKey) so the UI
 * can show the operator the exact sessionKey that will be sent to the
 * OpenClaw gateway for a "named" cron. Keys already using a valid prefix
 * (agent: / hook: / studio: / web:) pass through untouched; anything else is
 * wrapped under `hook:okestria-cron-…`.
 */
const ALLOWED_SESSION_KEY_PREFIXES = ["agent:", "hook:", "studio:", "web:"];

function previewEffectiveSessionKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (!trimmed) return "hook:okestria-cron-<job-id>";
  const lower = trimmed.toLowerCase();
  if (ALLOWED_SESSION_KEY_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return trimmed;
  }
  return `hook:okestria-cron-${trimmed}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Tools (v28) — email capability bundle
//
// The backend owns the credentials (Resend apiKey lives in server config)
// and will splice them in at dispatch time. The UI only captures the
// "shape" of the email: who it's from, default subject, an optional
// footer banner (stored as a data-URL the server will forward verbatim),
// and free-form guidance appended to the dispatch payload.
//
// `buildToolsPayload` returns `null` when nothing is configured so the
// backend can treat "no tools" uniformly with "tools cleared".
// ─────────────────────────────────────────────────────────────────────────

type BuildToolsPayloadInput = {
  emailEnabled: boolean;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  subjectTemplate: string;
  footerImageDataUrl: string | null;
  instructionsHint: string;
};

function buildToolsPayload(
  input: BuildToolsPayloadInput,
): CronJobToolsConfig | null {
  const email: CronEmailToolConfig | null = input.emailEnabled
    ? {
        enabled: true,
        fromEmail: input.fromEmail.trim() || null,
        fromName: input.fromName.trim() || null,
        replyTo: input.replyTo.trim() || null,
        subjectTemplate: input.subjectTemplate.trim() || null,
        footerImageDataUrl: input.footerImageDataUrl || null,
        instructionsHint: input.instructionsHint.trim() || null,
      }
    : null;

  if (!email) return null;
  return { email };
}

/**
 * Detects whether the two tool bundles are materially different. Used by
 * the edit dialog so we can skip the `tools` field entirely when the
 * operator didn't touch anything — this also avoids accidentally
 * resubmitting a data-URL footer that the server already has.
 */
function toolsBundlesEqual(
  a: CronJobToolsConfig | null,
  b: CronJobToolsConfig | null,
): boolean {
  const ae = a?.email ?? null;
  const be = b?.email ?? null;
  if (!ae && !be) return true;
  if (!ae || !be) return false;
  return (
    (ae.enabled ?? false) === (be.enabled ?? false) &&
    (ae.fromEmail ?? null) === (be.fromEmail ?? null) &&
    (ae.fromName ?? null) === (be.fromName ?? null) &&
    (ae.replyTo ?? null) === (be.replyTo ?? null) &&
    (ae.subjectTemplate ?? null) === (be.subjectTemplate ?? null) &&
    (ae.footerImageDataUrl ?? null) === (be.footerImageDataUrl ?? null) &&
    (ae.instructionsHint ?? null) === (be.instructionsHint ?? null)
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EmailToolCard
//
// Collapsible tool-bundle card. Visually mirrors the LeadContextAttachmentsSection
// so the two sections sit side-by-side in the form without feeling alien.
// Amber accent everywhere to match the modal's tone.
// ─────────────────────────────────────────────────────────────────────────

type EmailToolCardProps = {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  fromEmail: string;
  onFromEmailChange: (next: string) => void;
  fromName: string;
  onFromNameChange: (next: string) => void;
  // Reply-To is no longer operator-editable — OpenClaw picks it at
  // dispatch (verified Resend sender), so the card doesn't take a
  // replyTo / onReplyToChange pair anymore.
  subjectTemplate: string;
  onSubjectTemplateChange: (next: string) => void;
  footerDataUrl: string | null;
  footerName: string | null;
  onFooterChange: (dataUrl: string | null, name: string | null) => void;
  instructionsHint: string;
  onInstructionsHintChange: (next: string) => void;
  /** Resolved defaults from the backend — drives the "Usar meus dados" button
   *  and the subtle placeholder text that hints at the fallback values. */
  defaults?: CronEmailToolDefaults | null;
  onResetToDefaults?: () => void;
  disabled?: boolean;
};

// Approx. 2MB — Resend caps each attachment at ~25MB but this is a footer
// banner, not an essay. Keeping it small protects the agent's context too.
const FOOTER_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

function EmailToolCard({
  enabled,
  onEnabledChange,
  fromEmail,
  onFromEmailChange,
  fromName,
  onFromNameChange,
  subjectTemplate,
  onSubjectTemplateChange,
  footerDataUrl,
  footerName,
  onFooterChange,
  instructionsHint,
  onInstructionsHintChange,
  defaults,
  onResetToDefaults,
  disabled,
}: EmailToolCardProps) {
  const [footerError, setFooterError] = useState<string | null>(null);

  const handleFooterPick = useCallback(
    async (file: File | null) => {
      setFooterError(null);
      if (!file) {
        onFooterChange(null, null);
        return;
      }
      if (!file.type.startsWith("image/")) {
        setFooterError("The footer must be an image (PNG or JPG).");
        return;
      }
      if (file.size > FOOTER_IMAGE_MAX_BYTES) {
        setFooterError("The image is larger than 2MB — compress it before uploading.");
        return;
      }
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Failed to read the file."));
          reader.readAsDataURL(file);
        });
        onFooterChange(dataUrl, file.name);
      } catch (err) {
        setFooterError(err instanceof Error ? err.message : String(err));
      }
    },
    [onFooterChange],
  );

  return (
    <div
      className="rounded-xl border px-4 py-3.5"
      style={{
        borderColor: enabled ? `${ACCENT}40` : "rgba(255,255,255,0.08)",
        backgroundColor: enabled ? `${ACCENT}0D` : "rgba(255,255,255,0.02)",
      }}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="mt-1 h-3.5 w-3.5 accent-amber-400"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${ACCENT}20`,
                border: `1px solid ${ACCENT}40`,
              }}
            >
              <Mail className="h-3.5 w-3.5" style={{ color: ACCENT }} />
            </span>
            <span className="text-sm font-semibold text-white">
              Email tool (Resend)
            </span>
            {enabled ? (
              <span
                className="rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                style={{
                  borderColor: `${ACCENT}50`,
                  backgroundColor: `${ACCENT}20`,
                  color: ACCENT,
                }}
                title="Custom sender/subject/footer for this job"
              >
                Custom
              </span>
            ) : defaults?.resendConfigured !== false ? (
              <span
                className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-200"
                title="Resend is configured on the platform — the agent can send email on every run"
              >
                Always on
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] leading-5 text-white/50">
            The <span className="font-mono text-white/75">resend_email</span>{" "}
            capability ships with every cron run automatically — the platform's
            Resend key is{" "}
            <span className="font-semibold">already on the server</span>. Toggle
            this on only if you want to override the default sender, subject
            or footer banner for this specific job. Leave it off to send with
            your profile defaults.
          </p>
          {!enabled && defaults?.resendConfigured === false && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
              <span
                className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400/25 text-amber-200"
                style={{ fontSize: 9, fontWeight: 700 }}
              >
                !
              </span>
              <span>
                Resend is not configured on the platform — the agent won't be
                able to send email until the admin connects it.
              </span>
            </div>
          )}
          {!enabled && defaults?.resendConfigured !== false && (defaults?.fromName || defaults?.footerImageDataUrl) && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/60">
              <span
                className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full"
                style={{ backgroundColor: `${ACCENT}25`, color: ACCENT, fontSize: 9, fontWeight: 700 }}
              >
                i
              </span>
              <span>
                Defaults active — sending as{" "}
                <span className="font-mono text-white/80">
                  {defaults?.fromName ?? "—"}
                </span>
                {defaults?.fromEmail && (
                  <>
                    {" "}
                    <span className="text-white/45">·</span>{" "}
                    <span className="font-mono text-white/80">
                      {defaults.fromEmail}
                    </span>
                  </>
                )}
                {defaults?.footerImageDataUrl && (
                  <span className="text-white/55"> · with your profile footer</span>
                )}
              </span>
            </div>
          )}
        </div>
      </label>

      {enabled && (
        <div className="mt-3 space-y-3 border-t border-white/[0.08] pt-3">
          {/* Defaults banner — shows the resolved fallback chain + a quick
             "restore my profile defaults" button so operators can revert
             after experimenting with overrides. */}
          {defaults && (
            <div className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[11px] md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-2 text-white/65">
                <span
                  className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `${ACCENT}25`,
                    color: ACCENT,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  i
                </span>
                <div className="leading-5">
                  <span className="font-semibold text-white/80">
                    Using your profile:
                  </span>{" "}
                  <span className="font-mono text-white/85">
                    {defaults.fromName ?? "—"}
                  </span>
                  {defaults.fromEmail && (
                    <>
                      {" "}
                      <span className="text-white/55">·</span>{" "}
                      <span className="font-mono text-white/85">
                        {defaults.fromEmail}
                      </span>
                    </>
                  )}
                  {/* Reply-To chip removed — OpenClaw decides the reply
                      address at dispatch time (defaults to the verified
                      From sender), so it's not a user-editable field. */}
                  {defaults.footerImageDataUrl && (
                    <span className="text-white/55"> · personal footer</span>
                  )}
                  <span className="text-white/55"> · OpenClaw may override</span>
                  {!defaults.resendConfigured && (
                    <span className="ml-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-200">
                      Resend off
                    </span>
                  )}
                </div>
              </div>
              {onResetToDefaults && (
                <button
                  type="button"
                  onClick={onResetToDefaults}
                  disabled={disabled}
                  className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Use my data
                </button>
              )}
            </div>
          )}
          {defaults?.note && (
            <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-100/90">
              {defaults.note}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              label="From email"
              hint={
                defaults?.fromEmail
                  ? `Blank uses: ${defaults.fromEmail} (OpenClaw may override).`
                  : "Blank lets OpenClaw pick a verified sender per request."
              }
            >
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => onFromEmailChange(e.target.value)}
                placeholder={defaults?.fromEmail ?? "you@yourdomain.com"}
                disabled={disabled}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field
              label="From name"
              hint={
                defaults?.fromName
                  ? `Blank uses: ${defaults.fromName}`
                  : "Friendly sender name."
              }
            >
              <input
                type="text"
                value={fromName}
                onChange={(e) => onFromNameChange(e.target.value)}
                placeholder={defaults?.fromName ?? "Lucas @ PTX"}
                disabled={disabled}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Reply-To input intentionally removed — OpenClaw picks the
              reply address at dispatch (defaults to the verified From
              sender from Resend), so there is nothing for the operator
              to fill in here. */}
          <Field
            label="Default subject"
            hint="The agent can override this per email."
          >
            <input
              type="text"
              value={subjectTemplate}
              onChange={(e) => onSubjectTemplateChange(e.target.value)}
              placeholder="PTX · Daily update"
              disabled={disabled}
              className={inputClass}
            />
          </Field>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Footer image
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
              {footerDataUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={footerDataUrl}
                    alt={footerName ?? "Email footer"}
                    className="h-12 max-w-[220px] rounded border border-white/10 bg-black/30 object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-semibold text-white/85">
                      {footerName ?? "footer"}
                    </div>
                    <div className="text-[10px] text-white/45">
                      Appended to every email the agent sends.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onFooterChange(null, null)}
                    disabled={disabled}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-start gap-1">
                  <span className="text-[11px] text-white/55">
                    PNG or JPG · up to 2MB · suggested width 600px
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={disabled}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handleFooterPick(file);
                      // Reset so picking the same file twice re-triggers
                      e.target.value = "";
                    }}
                    className="block text-[11px] text-white/60 file:mr-2 file:rounded-md file:border-0 file:bg-amber-500/20 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-amber-100 hover:file:bg-amber-500/30"
                  />
                </label>
              )}
              {footerError && (
                <div className="mt-2 text-[10px] text-red-200">{footerError}</div>
              )}
            </div>
          </div>

          <Field
            label="Extra instructions for the agent"
            hint="Free-form text sent inside [OKESTRIA_CRON_TOOLS]. e.g. &ldquo;Always sign as Lucas.&rdquo;"
          >
            <textarea
              value={instructionsHint}
              onChange={(e) => onInstructionsHintChange(e.target.value)}
              placeholder="Always sign as Lucas / PTX. Keep the tone formal."
              rows={2}
              disabled={disabled}
              className={`${inputClass} resize-none`}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

// Tools badge used in the jobs list + detail drawer so the operator can see
// at a glance that a job has the email tool wired up.
function ToolsBadge({
  summary,
  compact = false,
}: {
  summary: { emailEnabled: boolean; hasFooterImage: boolean } | null;
  compact?: boolean;
}) {
  // In v31 the resend_email tool ships with every dispatch when the
  // platform has Resend configured, so a missing `emailEnabled` flag
  // no longer means the agent can't email — it just means the operator
  // didn't set any overrides for this job. The badge reflects that:
  // - no summary at all → don't show anything (older cron jobs / non-cron)
  // - emailEnabled true → "EMAIL · Custom" (operator overrides live)
  // - emailEnabled false → "EMAIL" (platform defaults)
  if (!summary) return null;
  const isCustom = summary.emailEnabled;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold tracking-wider ${
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      }`}
      style={{
        borderColor: isCustom ? `${ACCENT}40` : "rgba(255,255,255,0.15)",
        backgroundColor: isCustom ? `${ACCENT}15` : "rgba(255,255,255,0.04)",
        color: isCustom ? ACCENT : "rgba(255,255,255,0.65)",
      }}
      title={
        isCustom
          ? summary.hasFooterImage
            ? "Email tool · custom sender + footer for this job"
            : "Email tool · custom sender for this job"
          : "Email tool available via the platform's Resend — defaults from your profile"
      }
    >
      <Mail className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {isCustom ? "EMAIL · CUSTOM" : "EMAIL"}
    </span>
  );
}
