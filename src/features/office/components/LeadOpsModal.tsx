"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Mail,
  Pause,
  Play,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  cancelLeadFollowUp,
  listLeadFollowUps,
  listLeadGenerationJobs,
  listLeadsByCompany,
  listLeadsByJob,
  pauseLeadFollowUp,
  processDueLeadFollowUps,
  resumeLeadFollowUp,
  scheduleLeadFollowUpsForGeneration,
  scheduleLeadFollowUpsForLead,
  sendLeadFollowUpNow,
  type LeadFollowUp,
  type LeadFollowUpStepInput,
  type LeadGenerationJob,
  type LeadSummary,
} from "@/lib/leads/lead-generation-api";

/* ───────────────────── Types & constants ───────────────────── */

type LeadOpsModalProps = {
  open: boolean;
  companyId: number | null;
  companyName?: string | null;
  onClose: () => void;
};

type Tab = "overview" | "schedule" | "sessions";

type DraftStep = {
  sequenceNumber: number;
  name: string;
  subjectTemplate: string;
  introText: string;
  delayDays: number;
  preferredModel: string;
  notes: string;
};

const ACCENT = "#d946ef"; // fuchsia — Lead follow-up vibe

const DEFAULT_STEPS: DraftStep[] = [
  {
    sequenceNumber: 1,
    name: "Primeiro contato",
    subjectTemplate: "{{businessName}} | Ideia rápida para gerar mais oportunidades",
    introText:
      "Quero retomar o contato com uma mensagem curta, consultiva e objetiva, usando o contexto mais recente do lead.",
    delayDays: 0,
    preferredModel: "anthropic/claude-sonnet-4-6",
    notes: "Tom humano, direto e sem parecer sequência automática.",
  },
  {
    sequenceNumber: 2,
    name: "Segundo follow-up",
    subjectTemplate: "Posso te mostrar um caminho simples para {{businessName}}?",
    introText:
      "Escreva um follow-up diferente do primeiro, citando novo ângulo de valor e reforçando credibilidade.",
    delayDays: 2,
    preferredModel: "anthropic/claude-sonnet-4-6",
    notes: "Evitar repetir CTA e frases do primeiro email.",
  },
  {
    sequenceNumber: 3,
    name: "Última tentativa",
    subjectTemplate: "Fecho por aqui ou faz sentido falar esta semana?",
    introText:
      "Escreva uma última tentativa elegante, curta e respeitosa, com CTA leve.",
    delayDays: 5,
    preferredModel: "anthropic/claude-haiku-3-5",
    notes: "Mostrar urgência leve sem pressionar.",
  },
];

/* ───────────────────── Helpers ───────────────────── */

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const relativeTime = (value?: string | null): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(Math.max(diff, 0) / 1000);
  if (sec < 45) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d`;
  return fmtDate(value);
};

const startOfTodayLocal = () => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
};

const buildStepsPayload = (steps: DraftStep[]): LeadFollowUpStepInput[] => {
  const base = startOfTodayLocal();
  return steps
    .map((step, index) => {
      const scheduled = new Date(base);
      scheduled.setDate(base.getDate() + Math.max(0, step.delayDays));
      scheduled.setHours(9 + Math.min(index, 8), 0, 0, 0);
      return {
        sequenceNumber: index + 1,
        name: step.name.trim() || `Follow-up ${index + 1}`,
        subjectTemplate: step.subjectTemplate.trim(),
        introText: step.introText.trim(),
        preferredModel: step.preferredModel.trim() || null,
        notes: step.notes.trim() || null,
        scheduledAtUtc: scheduled.toISOString(),
        generateInsightsIfMissing: true,
        forceRegenerateInsights: false,
      };
    })
    .filter((step) => step.subjectTemplate.length > 0);
};

const toneByStatus = (status?: string | null) => {
  switch ((status ?? "").toLowerCase()) {
    case "sent":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "paused":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "failed":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    case "cancelled":
      return "border-white/15 bg-white/5 text-white/50";
    case "processing":
      return "border-sky-400/30 bg-sky-500/10 text-sky-200";
    default:
      return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200";
  }
};

const labelByStatus = (status?: string | null) => {
  switch ((status ?? "").toLowerCase()) {
    case "sent":
      return "Enviado";
    case "paused":
      return "Pausado";
    case "failed":
      return "Falhou";
    case "cancelled":
      return "Cancelado";
    case "processing":
      return "Processando";
    case "pending":
      return "Pendente";
    default:
      return status ?? "—";
  }
};

/* ───────────────────── Small UI atoms ───────────────────── */

const StatCard = ({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) => {
  const toneMap: Record<typeof tone, { border: string; bg: string; text: string }> = {
    neutral: {
      border: "border-white/10",
      bg: "bg-white/[0.03]",
      text: "text-white",
    },
    accent: {
      border: "border-fuchsia-400/25",
      bg: "bg-fuchsia-500/[0.07]",
      text: "text-fuchsia-100",
    },
    success: {
      border: "border-emerald-400/25",
      bg: "bg-emerald-500/[0.07]",
      text: "text-emerald-100",
    },
    warning: {
      border: "border-amber-400/25",
      bg: "bg-amber-500/[0.07]",
      text: "text-amber-100",
    },
    danger: {
      border: "border-rose-400/25",
      bg: "bg-rose-500/[0.07]",
      text: "text-rose-100",
    },
  };
  const t = toneMap[tone];
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} px-4 py-3`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-semibold ${t.text}`}>{value}</div>
      {helper ? <div className="mt-0.5 text-[11px] text-white/40">{helper}</div> : null}
    </div>
  );
};

const EmptyState = ({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) => (
  <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
    <div
      className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${ACCENT}15`, border: `1.5px solid ${ACCENT}30` }}
    >
      {icon}
    </div>
    <div className="text-sm font-medium text-white">{title}</div>
    {hint ? <div className="mt-1 text-xs text-white/35">{hint}</div> : null}
  </div>
);

/* ───────────────────── Main modal ───────────────────── */

export function LeadOpsModal({
  open,
  companyId,
  companyName,
  onClose,
}: LeadOpsModalProps) {
  const [tab, setTab] = useState<Tab>("overview");

  // Company data loaded from backend by companyId
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [missions, setMissions] = useState<LeadGenerationJob[]>([]);
  const [allFollowUps, setAllFollowUps] = useState<LeadFollowUp[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Per-lead view state
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedLeadFollowUps, setSelectedLeadFollowUps] = useState<LeadFollowUp[]>([]);
  const [selectedLeadLoading, setSelectedLeadLoading] = useState(false);

  // Scheduling form state
  const [steps, setSteps] = useState<DraftStep[]>(DEFAULT_STEPS);
  const [replacePending, setReplacePending] = useState(false);
  const [missionFilter, setMissionFilter] = useState<number | "all">("all");
  const [leadSearch, setLeadSearch] = useState("");
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  // Action state
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetFeedback = useCallback(() => {
    setMessage(null);
    setError(null);
  }, []);

  /* ──────────── Loading ──────────── */

  const loadCompanyData = useCallback(async () => {
    if (!companyId) {
      setLoadError("Empresa não identificada. Faça login novamente para continuar.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      // Leads: if a mission is selected, pull scoped list from the mission's
      // endpoint (back returns only that mission's leads); otherwise pull the
      // full company list. Missions + all follow-ups always come from the
      // company-level endpoints so the header stats stay global.
      const leadsPromise =
        missionFilter === "all"
          ? listLeadsByCompany(companyId)
          : listLeadsByJob(missionFilter);
      const [leadsResult, missionsResult, followUpsResult] = await Promise.all([
        leadsPromise,
        listLeadGenerationJobs(companyId),
        listLeadFollowUps(null),
      ]);
      setLeads(leadsResult);
      setMissions(missionsResult);
      setAllFollowUps(followUpsResult);
    } catch (cause) {
      const detail =
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar os dados da empresa.";
      setLoadError(detail);
    } finally {
      setLoading(false);
    }
  }, [companyId, missionFilter]);

  useEffect(() => {
    if (!open) return;
    resetFeedback();
    void loadCompanyData();
  }, [open, loadCompanyData, resetFeedback]);

  // Re-load follow-ups for the selected lead whenever selection changes.
  useEffect(() => {
    if (!open || !selectedLeadId) {
      setSelectedLeadFollowUps([]);
      return;
    }
    let cancelled = false;
    setSelectedLeadLoading(true);
    listLeadFollowUps(selectedLeadId)
      .then((items) => {
        if (cancelled) return;
        setSelectedLeadFollowUps(
          items.sort(
            (a, b) =>
              new Date(a.scheduledAtUtc).getTime() -
              new Date(b.scheduledAtUtc).getTime(),
          ),
        );
      })
      .catch((cause) => {
        if (cancelled) return;
        const detail =
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar os follow-ups do lead.";
        setError(detail);
      })
      .finally(() => {
        if (!cancelled) setSelectedLeadLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedLeadId]);

  /* ──────────── Derived values ──────────── */

  const overview = useMemo(() => {
    const total = allFollowUps.length;
    const counts = {
      total,
      pending: allFollowUps.filter((f) => (f.status ?? "").toLowerCase() === "pending").length,
      processing: allFollowUps.filter((f) => (f.status ?? "").toLowerCase() === "processing").length,
      sent: allFollowUps.filter((f) => (f.status ?? "").toLowerCase() === "sent").length,
      paused: allFollowUps.filter((f) => (f.status ?? "").toLowerCase() === "paused").length,
      failed: allFollowUps.filter((f) => (f.status ?? "").toLowerCase() === "failed").length,
      cancelled: allFollowUps.filter((f) => (f.status ?? "").toLowerCase() === "cancelled").length,
    };
    const nextScheduled = [...allFollowUps]
      .filter((f) => ["pending", "processing"].includes((f.status ?? "").toLowerCase()))
      .sort(
        (a, b) =>
          new Date(a.scheduledAtUtc).getTime() -
          new Date(b.scheduledAtUtc).getTime(),
      )[0]?.scheduledAtUtc;
    return { ...counts, nextScheduled: nextScheduled ?? null };
  }, [allFollowUps]);

  const recentActivity = useMemo(() => {
    return [...allFollowUps]
      .sort((a, b) => {
        const aDate = new Date(a.updatedDate ?? a.scheduledAtUtc).getTime();
        const bDate = new Date(b.updatedDate ?? b.scheduledAtUtc).getTime();
        return bDate - aDate;
      })
      .slice(0, 8);
  }, [allFollowUps]);

  const filteredLeads = useMemo(() => {
    // Mission filtering is already handled server-side by swapping endpoints
    // in loadCompanyData. Here we only apply the client-side text search.
    const needle = leadSearch.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter((lead) => {
      const haystack = [
        lead.businessName,
        lead.email,
        lead.category,
        lead.city,
        lead.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [leads, leadSearch]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  );

  /* ──────────── Scheduling handlers ──────────── */

  const updateStep = (index: number, patch: Partial<DraftStep>) => {
    setSteps((current) =>
      current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  };

  const scheduleForSelectedLead = async () => {
    if (!selectedLead) {
      setError("Selecione um lead para agendar a cadência individual.");
      return;
    }
    const payload = buildStepsPayload(steps);
    if (!payload.length) {
      setError("Preencha pelo menos um assunto de follow-up.");
      return;
    }
    resetFeedback();
    setBusyAction("lead");
    try {
      const created = await scheduleLeadFollowUpsForLead(selectedLead.id, payload);
      setMessage(
        `${created.length} follow-up(s) agendado(s) para ${
          selectedLead.businessName || selectedLead.email || `lead ${selectedLead.id}`
        }.`,
      );
      await loadCompanyData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível agendar o follow-up do lead.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const scheduleForFilteredLeads = async () => {
    if (!companyId) {
      setError("Empresa não identificada.");
      return;
    }
    const leadIds = filteredLeads.map((l) => l.id).filter((n) => Number.isFinite(n));
    if (!leadIds.length) {
      setError("Nenhum lead corresponde ao filtro atual. Ajuste o filtro e tente de novo.");
      return;
    }
    const payload = buildStepsPayload(steps);
    if (!payload.length) {
      setError("Preencha pelo menos um assunto de follow-up.");
      return;
    }
    resetFeedback();
    setBusyAction("bulk");
    try {
      const created = await scheduleLeadFollowUpsForGeneration({
        companyId,
        jobId: missionFilter === "all" ? null : missionFilter,
        leadIds,
        replacePending,
        steps: payload,
      });
      setMessage(
        `${created.length} follow-up(s) agendado(s) para ${leadIds.length} lead(s).`,
      );
      await loadCompanyData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível agendar os follow-ups em lote.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleItemAction = async (
    action: "pause" | "resume" | "cancel" | "send",
    followUp: LeadFollowUp,
  ) => {
    resetFeedback();
    setBusyAction(`${action}-${followUp.id}`);
    try {
      if (action === "pause") await pauseLeadFollowUp(followUp.id);
      if (action === "resume") await resumeLeadFollowUp(followUp.id);
      if (action === "cancel") await cancelLeadFollowUp(followUp.id);
      if (action === "send") await sendLeadFollowUpNow(followUp.id);
      setMessage(`Follow-up #${followUp.sequenceNumber} atualizado com sucesso.`);
      if (selectedLeadId) {
        const refreshed = await listLeadFollowUps(selectedLeadId);
        setSelectedLeadFollowUps(
          refreshed.sort(
            (a, b) =>
              new Date(a.scheduledAtUtc).getTime() -
              new Date(b.scheduledAtUtc).getTime(),
          ),
        );
      }
      await loadCompanyData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar o follow-up.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleProcessDue = async () => {
    resetFeedback();
    setBusyAction("process");
    try {
      const result = await processDueLeadFollowUps();
      setMessage(
        `Processados: ${result.checked}. Enviados: ${result.sent}. Falharam: ${result.failed}. Pulados: ${result.skipped}.`,
      );
      await loadCompanyData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível processar os envios pendentes.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  if (!open) return null;

  /* ───────────────────── Render ───────────────────── */

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section
        className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-[#0b0e14] shadow-[0_32px_120px_rgba(0,0,0,.72)]"
        style={{ borderColor: `${ACCENT}30` }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${ACCENT}20`, border: `1.5px solid ${ACCENT}50` }}
          >
            <Mail className="h-5 w-5" style={{ color: ACCENT }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-white">
              Lead follow-up
            </h2>
            <p className="text-xs text-white/40">
              {companyName
                ? `Cadência inteligente de emails para ${companyName}.`
                : "Cadência inteligente de emails com IA."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadCompanyData()}
            disabled={loading}
            title="Recarregar"
            className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-white/10">
          {(
            [
              { id: "overview" as const, label: "Panorama", count: overview.total },
              { id: "schedule" as const, label: "Agendar", count: leads.length },
              {
                id: "sessions" as const,
                label: "Sessões",
                count: selectedLead ? selectedLeadFollowUps.length : null,
              },
            ]
          ).map((entry) => {
            const active = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={`flex-1 py-3 text-center text-xs font-medium tracking-wide transition ${
                  active
                    ? "border-b-2 text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
                style={active ? { borderColor: ACCENT } : undefined}
              >
                <span className="inline-flex items-center gap-1.5">
                  {entry.label}
                  {entry.count !== null && entry.count !== undefined ? (
                    <span
                      className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                      style={{ backgroundColor: `${ACCENT}25`, color: ACCENT }}
                    >
                      {entry.count}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadError ? (
            <div className="m-6 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-6">{loadError}</span>
            </div>
          ) : null}

          {tab === "overview" && (
            <OverviewTab
              loading={loading}
              overview={overview}
              recentActivity={recentActivity}
              missions={missions}
              leadsCount={leads.length}
              busyAction={busyAction}
              onProcessDue={handleProcessDue}
              onJumpToSchedule={() => setTab("schedule")}
              onOpenLead={(leadId) => {
                setSelectedLeadId(leadId);
                setTab("sessions");
              }}
            />
          )}

          {tab === "schedule" && (
            <ScheduleTab
              loading={loading}
              missions={missions}
              leads={filteredLeads}
              leadSearch={leadSearch}
              onLeadSearch={setLeadSearch}
              missionFilter={missionFilter}
              onMissionFilter={setMissionFilter}
              replacePending={replacePending}
              onReplacePendingChange={setReplacePending}
              selectedLeadId={selectedLeadId}
              onSelectLead={setSelectedLeadId}
              steps={steps}
              expandedStep={expandedStep}
              onToggleStep={(index) =>
                setExpandedStep((current) => (current === index ? null : index))
              }
              onUpdateStep={updateStep}
              onResetSteps={() => setSteps(DEFAULT_STEPS)}
              busyAction={busyAction}
              canScheduleLead={Boolean(selectedLeadId)}
              canScheduleBulk={filteredLeads.length > 0}
              onScheduleLead={() => void scheduleForSelectedLead()}
              onScheduleBulk={() => void scheduleForFilteredLeads()}
            />
          )}

          {tab === "sessions" && (
            <SessionsTab
              loading={loading || selectedLeadLoading}
              leads={leads}
              selectedLead={selectedLead}
              selectedLeadId={selectedLeadId}
              onSelectLead={setSelectedLeadId}
              followUps={selectedLeadFollowUps}
              busyAction={busyAction}
              onAction={handleItemAction}
              onJumpToSchedule={() => setTab("schedule")}
            />
          )}

          {message ? (
            <div className="sticky bottom-0 border-t border-emerald-400/20 bg-emerald-500/10 px-6 py-3 text-sm text-emerald-100 backdrop-blur">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="sticky bottom-0 border-t border-rose-400/20 bg-rose-500/10 px-6 py-3 text-sm text-rose-100 backdrop-blur">
              {error}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

/* ───────────────────── Tab: Overview ───────────────────── */

function OverviewTab({
  loading,
  overview,
  recentActivity,
  missions,
  leadsCount,
  busyAction,
  onProcessDue,
  onJumpToSchedule,
  onOpenLead,
}: {
  loading: boolean;
  overview: {
    total: number;
    pending: number;
    processing: number;
    sent: number;
    paused: number;
    failed: number;
    cancelled: number;
    nextScheduled: string | null;
  };
  recentActivity: LeadFollowUp[];
  missions: LeadGenerationJob[];
  leadsCount: number;
  busyAction: string | null;
  onProcessDue: () => void;
  onJumpToSchedule: () => void;
  onOpenLead: (leadId: number) => void;
}) {
  if (loading && overview.total === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-white/40">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando panorama...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total agendado"
          value={overview.total}
          helper="Todos os follow-ups da empresa"
          tone="accent"
        />
        <StatCard
          label="Pendentes"
          value={overview.pending + overview.processing}
          helper={
            overview.processing
              ? `${overview.processing} em processamento`
              : "Aguardando envio"
          }
          tone="warning"
        />
        <StatCard
          label="Enviados"
          value={overview.sent}
          helper="Entregues com sucesso"
          tone="success"
        />
        <StatCard
          label="Falharam"
          value={overview.failed}
          helper={overview.failed ? "Precisam de revisão" : "Nenhum erro"}
          tone={overview.failed ? "danger" : "neutral"}
        />
      </div>

      {/* Meta row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Próximo envio
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {overview.nextScheduled ? fmtDate(overview.nextScheduled) : "Nada na fila"}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Leads na base
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {leadsCount} lead{leadsCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Missões
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {missions.length} cadastrada{missions.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onJumpToSchedule}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
          style={{ backgroundColor: `${ACCENT}25`, border: `1px solid ${ACCENT}50` }}
        >
          <Sparkles className="h-4 w-4" />
          Nova cadência
        </button>
        <button
          type="button"
          onClick={onProcessDue}
          disabled={busyAction === "process"}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-50"
          title="Dispara o worker para tentar enviar os follow-ups vencidos agora"
        >
          {busyAction === "process" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Processar envios pendentes
        </button>
      </div>

      {/* Recent */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Atividade recente</div>
          <div className="text-[11px] text-white/35">
            Últimas {recentActivity.length} atualizações
          </div>
        </div>
        {recentActivity.length === 0 ? (
          <EmptyState
            icon={<Mail className="h-5 w-5" style={{ color: ACCENT }} />}
            title="Nenhum follow-up ainda"
            hint="Crie uma cadência para começar a nutrir os leads da empresa."
          />
        ) : (
          <div className="space-y-2">
            {recentActivity.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenLead(item.leadId)}
                className="flex w-full items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/15 hover:bg-white/[0.05]"
              >
                <span
                  className={`mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${toneByStatus(item.status)}`}
                >
                  {labelByStatus(item.status)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">
                    {item.leadBusinessName ||
                      item.leadEmail ||
                      `Lead #${item.leadId}`}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-white/45">
                    #{item.sequenceNumber} · {item.subjectTemplate || item.name}
                  </div>
                </div>
                <div className="shrink-0 text-[11px] text-white/35">
                  {relativeTime(item.updatedDate ?? item.scheduledAtUtc)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────── Tab: Schedule ───────────────────── */

function ScheduleTab({
  loading,
  missions,
  leads,
  leadSearch,
  onLeadSearch,
  missionFilter,
  onMissionFilter,
  replacePending,
  onReplacePendingChange,
  selectedLeadId,
  onSelectLead,
  steps,
  expandedStep,
  onToggleStep,
  onUpdateStep,
  onResetSteps,
  busyAction,
  canScheduleLead,
  canScheduleBulk,
  onScheduleLead,
  onScheduleBulk,
}: {
  loading: boolean;
  missions: LeadGenerationJob[];
  leads: LeadSummary[];
  leadSearch: string;
  onLeadSearch: (value: string) => void;
  missionFilter: number | "all";
  onMissionFilter: (value: number | "all") => void;
  replacePending: boolean;
  onReplacePendingChange: (value: boolean) => void;
  selectedLeadId: number | null;
  onSelectLead: (leadId: number | null) => void;
  steps: DraftStep[];
  expandedStep: number | null;
  onToggleStep: (index: number) => void;
  onUpdateStep: (index: number, patch: Partial<DraftStep>) => void;
  onResetSteps: () => void;
  busyAction: string | null;
  canScheduleLead: boolean;
  canScheduleBulk: boolean;
  onScheduleLead: () => void;
  onScheduleBulk: () => void;
}) {
  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      {/* LEFT — Leads list with filters */}
      <aside className="border-white/10 p-6 lg:border-r">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Leads da empresa</div>
          <span className="text-[11px] text-white/40">
            {leads.length} visível{leads.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Mission filter */}
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Missão
        </label>
        <select
          value={missionFilter === "all" ? "all" : String(missionFilter)}
          onChange={(e) =>
            onMissionFilter(e.target.value === "all" ? "all" : Number(e.target.value))
          }
          className="mb-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
        >
          <option value="all">Todas as missões</option>
          {missions.map((mission) => (
            <option key={mission.id} value={mission.id}>
              {mission.title || `Mission #${mission.id}`}
            </option>
          ))}
        </select>

        {/* Lead search */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            placeholder="Buscar lead, cidade, nicho..."
            value={leadSearch}
            onChange={(e) => onLeadSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/25"
          />
        </div>

        {/* Replace pending */}
        <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition hover:bg-white/[0.06]">
          <input
            type="checkbox"
            checked={replacePending}
            onChange={(e) => onReplacePendingChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-transparent"
          />
          Substituir follow-ups pendentes existentes
        </label>

        {/* Leads list */}
        <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
          {loading && leads.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-white/40">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando leads...
            </div>
          ) : leads.length === 0 ? (
            <EmptyState
              icon={<Target className="h-5 w-5" style={{ color: ACCENT }} />}
              title="Nenhum lead encontrado"
              hint="Ajuste o filtro de missão ou rode uma nova geração de leads."
            />
          ) : (
            leads.map((lead) => {
              const active = lead.id === selectedLeadId;
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onSelectLead(active ? null : lead.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-fuchsia-400/50 bg-fuchsia-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">
                        {lead.businessName || lead.email || `Lead #${lead.id}`}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-white/45">
                        {lead.email || "Sem email"}
                      </div>
                      {(lead.city || lead.state || lead.category) && (
                        <div className="mt-0.5 truncate text-[10px] text-white/35">
                          {[lead.city, lead.state, lead.category]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/30">
                      #{lead.id}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT — Cadence builder */}
      <div className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Cadência</div>
            <div className="text-[11px] text-white/40">
              Cada passo gera um email diferente — o agente de IA adapta o texto ao
              contexto do lead.
            </div>
          </div>
          <button
            type="button"
            onClick={onResetSteps}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Restaurar padrão
          </button>
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => {
            const expanded = expandedStep === step.sequenceNumber;
            return (
              <div
                key={step.sequenceNumber}
                className={`overflow-hidden rounded-xl border transition ${
                  expanded
                    ? "border-fuchsia-400/30 bg-white/[0.04]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleStep(step.sequenceNumber)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="text-white/30">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: `${ACCENT}20`,
                      color: ACCENT,
                      border: `1px solid ${ACCENT}30`,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">
                      {step.name || `Passo ${index + 1}`}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-white/40">
                      {step.subjectTemplate || "Sem assunto definido"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/50">
                    D+{step.delayDays}
                  </span>
                </button>

                {expanded && (
                  <div className="space-y-3 border-t border-white/10 px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Nome interno">
                        <input
                          value={step.name}
                          onChange={(e) =>
                            onUpdateStep(index, { name: e.target.value })
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
                        />
                      </Field>
                      <Field label="Modelo de IA">
                        <input
                          value={step.preferredModel}
                          onChange={(e) =>
                            onUpdateStep(index, { preferredModel: e.target.value })
                          }
                          placeholder="anthropic/claude-sonnet-4-6"
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/25"
                        />
                      </Field>
                    </div>
                    <Field label="Assunto do email (suporta {{businessName}})">
                      <input
                        value={step.subjectTemplate}
                        onChange={(e) =>
                          onUpdateStep(index, { subjectTemplate: e.target.value })
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                      <Field label="Instrução para a IA">
                        <textarea
                          value={step.introText}
                          onChange={(e) =>
                            onUpdateStep(index, { introText: e.target.value })
                          }
                          rows={3}
                          className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
                        />
                      </Field>
                      <Field label="Atraso (dias)">
                        <input
                          type="number"
                          min={0}
                          value={step.delayDays}
                          onChange={(e) =>
                            onUpdateStep(index, {
                              delayDays: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
                        />
                      </Field>
                    </div>
                    <Field label="Observações internas">
                      <textarea
                        value={step.notes}
                        onChange={(e) =>
                          onUpdateStep(index, { notes: e.target.value })
                        }
                        rows={2}
                        className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
                      />
                    </Field>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onScheduleLead}
            disabled={!canScheduleLead || busyAction === "lead"}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: `${ACCENT}25`, border: `1px solid ${ACCENT}50` }}
          >
            {busyAction === "lead" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Target className="h-4 w-4" />
            )}
            Agendar para lead selecionado
          </button>
          <button
            type="button"
            onClick={onScheduleBulk}
            disabled={!canScheduleBulk || busyAction === "bulk"}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyAction === "bulk" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Agendar para todos os leads filtrados
          </button>
        </div>
      </div>
    </div>
  );
}

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
      {label}
    </span>
    {children}
  </label>
);

/* ───────────────────── Tab: Sessions ───────────────────── */

function SessionsTab({
  loading,
  leads,
  selectedLead,
  selectedLeadId,
  onSelectLead,
  followUps,
  busyAction,
  onAction,
  onJumpToSchedule,
}: {
  loading: boolean;
  leads: LeadSummary[];
  selectedLead: LeadSummary | null;
  selectedLeadId: number | null;
  onSelectLead: (leadId: number | null) => void;
  followUps: LeadFollowUp[];
  busyAction: string | null;
  onAction: (
    action: "pause" | "resume" | "cancel" | "send",
    followUp: LeadFollowUp,
  ) => void;
  onJumpToSchedule: () => void;
}) {
  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      {/* LEFT — Leads (condensed) */}
      <aside className="border-white/10 p-6 lg:border-r">
        <div className="mb-3 text-sm font-semibold text-white">Leads</div>
        <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
          {leads.length === 0 ? (
            <EmptyState
              icon={<Target className="h-5 w-5" style={{ color: ACCENT }} />}
              title="Nenhum lead carregado"
            />
          ) : (
            leads.map((lead) => {
              const active = lead.id === selectedLeadId;
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onSelectLead(active ? null : lead.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? "border-fuchsia-400/50 bg-fuchsia-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="truncate text-sm font-medium text-white">
                    {lead.businessName || lead.email || `Lead #${lead.id}`}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-white/45">
                    {lead.email || "Sem email"}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT — Timeline */}
      <div className="p-6">
        {!selectedLead ? (
          <EmptyState
            icon={<Mail className="h-5 w-5" style={{ color: ACCENT }} />}
            title="Selecione um lead para ver a cadência"
            hint="A lista ao lado mostra todos os leads da empresa."
          />
        ) : loading ? (
          <div className="flex min-h-[300px] items-center justify-center text-sm text-white/40">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando cadência...
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-white">
                  {selectedLead.businessName ||
                    selectedLead.email ||
                    `Lead #${selectedLead.id}`}
                </div>
                <div className="mt-0.5 truncate text-xs text-white/45">
                  {selectedLead.email || "Sem email"}
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/55">
                {followUps.length} follow-up{followUps.length === 1 ? "" : "s"}
              </span>
            </div>

            {followUps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${ACCENT}15`,
                    border: `1.5px solid ${ACCENT}30`,
                  }}
                >
                  <Mail className="h-5 w-5" style={{ color: ACCENT }} />
                </div>
                <div className="text-sm font-medium text-white">
                  Nenhum follow-up agendado ainda
                </div>
                <div className="mt-1 text-xs text-white/35">
                  Crie uma cadência para começar a nutrir esse lead.
                </div>
                <button
                  type="button"
                  onClick={onJumpToSchedule}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
                  style={{
                    backgroundColor: `${ACCENT}25`,
                    border: `1px solid ${ACCENT}40`,
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Ir para agendar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {followUps.map((followUp) => (
                  <FollowUpRow
                    key={followUp.id}
                    followUp={followUp}
                    busyAction={busyAction}
                    onAction={onAction}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FollowUpRow({
  followUp,
  busyAction,
  onAction,
}: {
  followUp: LeadFollowUp;
  busyAction: string | null;
  onAction: (
    action: "pause" | "resume" | "cancel" | "send",
    followUp: LeadFollowUp,
  ) => void;
}) {
  const status = (followUp.status ?? "").toLowerCase();
  const isTerminal = ["sent", "cancelled"].includes(status);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${toneByStatus(followUp.status)}`}
            >
              {labelByStatus(followUp.status)}
            </span>
            <span className="text-sm font-semibold text-white">
              #{followUp.sequenceNumber} · {followUp.name}
            </span>
          </div>
          <div className="mt-1.5 truncate text-sm text-white/70">
            {followUp.subjectTemplate || "Sem assunto"}
          </div>
          <div className="mt-2 grid gap-1 text-[11px] text-white/40 sm:grid-cols-3">
            <div>Agendado: {fmtDate(followUp.scheduledAtUtc)}</div>
            <div>Tentativa: {fmtDate(followUp.lastAttemptAtUtc)}</div>
            <div>Enviado: {fmtDate(followUp.sentAtUtc)}</div>
          </div>
          {followUp.errorMessage ? (
            <div className="mt-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-100">
              {followUp.errorMessage}
            </div>
          ) : null}
        </div>

        {!isTerminal && (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onAction("send", followUp)}
              disabled={busyAction === `send-${followUp.id}`}
              title="Enviar agora"
              className="inline-flex items-center gap-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1.5 text-[11px] font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:opacity-50"
            >
              {busyAction === `send-${followUp.id}` ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Enviar
            </button>
            {status === "paused" ? (
              <button
                type="button"
                onClick={() => onAction("resume", followUp)}
                disabled={busyAction === `resume-${followUp.id}`}
                title="Retomar"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
              >
                {busyAction === `resume-${followUp.id}` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Retomar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAction("pause", followUp)}
                disabled={busyAction === `pause-${followUp.id}`}
                title="Pausar"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
              >
                {busyAction === `pause-${followUp.id}` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
                Pausar
              </button>
            )}
            <button
              type="button"
              onClick={() => onAction("cancel", followUp)}
              disabled={busyAction === `cancel-${followUp.id}`}
              title="Cancelar"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50"
            >
              {busyAction === `cancel-${followUp.id}` ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
