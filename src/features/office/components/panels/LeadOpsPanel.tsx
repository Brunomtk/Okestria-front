"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelLeadFollowUp,
  type LeadFollowUp,
  type LeadFollowUpOverview,
  type LeadSummary,
  type LeadFollowUpStepInput,
  listLeadFollowUps,
  pauseLeadFollowUp,
  processDueLeadFollowUps,
  resumeLeadFollowUp,
  scheduleLeadFollowUpsForGeneration,
  scheduleLeadFollowUpsForLead,
  sendLeadFollowUpNow,
} from "@/lib/leads/lead-generation-api";

type LeadOpsPanelProps = {
  leads: LeadSummary[];
  selectedLeadId: number | null;
  onSelectLead: (leadId: number | null) => void;
  onRefresh?: () => Promise<void> | void;
};

type DraftStep = {
  sequenceNumber: number;
  name: string;
  subjectTemplate: string;
  introText: string;
  delayDays: number;
  preferredModel: string;
  notes: string;
};

const DEFAULT_STEPS: DraftStep[] = [
  {
    sequenceNumber: 1,
    name: "Primeiro contato",
    subjectTemplate: "{{businessName}} | Ideia rápida para gerar mais oportunidades",
    introText: "Quero retomar o contato com uma mensagem curta, consultiva e objetiva, usando o contexto mais recente do lead.",
    delayDays: 0,
    preferredModel: "anthropic/claude-sonnet-4-6",
    notes: "Tom humano, direto e sem parecer sequência automática.",
  },
  {
    sequenceNumber: 2,
    name: "Segundo follow-up",
    subjectTemplate: "Posso te mostrar um caminho simples para {{businessName}}?",
    introText: "Escreva um follow-up diferente do primeiro, citando novo ângulo de valor e reforçando credibilidade.",
    delayDays: 2,
    preferredModel: "anthropic/claude-sonnet-4-6",
    notes: "Evitar repetir CTA e frases do primeiro email.",
  },
  {
    sequenceNumber: 3,
    name: "Última tentativa",
    subjectTemplate: "Fecho por aqui ou faz sentido falar esta semana?",
    introText: "Escreva uma última tentativa elegante, curta e respeitosa, com CTA leve.",
    delayDays: 5,
    preferredModel: "anthropic/claude-haiku-3-5",
    notes: "Mostrar urgência leve sem pressionar.",
  },
];

const fmtDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const startOfTodayLocal = () => {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  return date;
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

const StatCard = ({ label, value, helper }: { label: string; value: string | number; helper?: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
    <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</div>
    <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    {helper ? <div className="mt-1 text-xs text-white/45">{helper}</div> : null}
  </div>
);

export function LeadOpsPanel({ leads, selectedLeadId, onSelectLead, onRefresh }: LeadOpsPanelProps) {
  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  );

  const [steps, setSteps] = useState<DraftStep[]>(DEFAULT_STEPS);
  const [replacePending, setReplacePending] = useState(false);
  const [overview, setOverview] = useState<LeadFollowUpOverview | null>(null);
  const [followUps, setFollowUps] = useState<LeadFollowUp[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshFollowUps = useCallback(async () => {
    try {
      const [overviewResponse, followUpsResponse] = await Promise.all([
        listLeadFollowUps(null).then(async (items) => {
          const counts = {
            total: items.length,
            pending: items.filter((item) => item.status === "pending").length,
            processing: items.filter((item) => item.status === "processing").length,
            paused: items.filter((item) => item.status === "paused").length,
            sent: items.filter((item) => item.status === "sent").length,
            failed: items.filter((item) => item.status === "failed").length,
            cancelled: items.filter((item) => item.status === "cancelled").length,
            nextScheduledAtUtc:
              [...items]
                .filter((item) => ["pending", "processing"].includes((item.status ?? "").toLowerCase()))
                .sort((left, right) => new Date(left.scheduledAtUtc).getTime() - new Date(right.scheduledAtUtc).getTime())[0]
                ?.scheduledAtUtc ?? null,
          } satisfies LeadFollowUpOverview;
          return counts;
        }).catch(async () => null),
        listLeadFollowUps(selectedLeadId ?? undefined),
      ]);
      setOverview(overviewResponse);
      setFollowUps(followUpsResponse.sort((a, b) => new Date(a.scheduledAtUtc).getTime() - new Date(b.scheduledAtUtc).getTime()));
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Não foi possível carregar os follow-ups.";
      setError(detail);
    }
  }, [selectedLeadId]);

  useEffect(() => {
    void refreshFollowUps();
  }, [refreshFollowUps]);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const updateStep = (index: number, patch: Partial<DraftStep>) => {
    setSteps((current) => current.map((step, currentIndex) => (currentIndex === index ? { ...step, ...patch } : step)));
  };

  const scheduleForLead = async () => {
    if (!selectedLead) {
      setError("Selecione um lead para agendar um follow-up individual.");
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
      setMessage(`${created.length} follow-up(s) agendado(s) para ${selectedLead.businessName || selectedLead.email || `lead ${selectedLead.id}`}.`);
      await refreshFollowUps();
      await onRefresh?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível agendar o follow-up do lead.");
    } finally {
      setBusyAction(null);
    }
  };

  const scheduleForVisibleLeads = async () => {
    const payload = buildStepsPayload(steps);
    const leadIds = leads.map((lead) => lead.id).filter((value) => Number.isFinite(value));
    if (!leadIds.length) {
      setError("Não há leads carregados para criar follow-ups em lote.");
      return;
    }
    if (!payload.length) {
      setError("Preencha pelo menos um assunto de follow-up.");
      return;
    }
    resetFeedback();
    setBusyAction("bulk");
    try {
      const companyId = leads[0]?.companyId ?? selectedLead?.companyId ?? 0;
      const jobId = (leads[0] as { sourceLeadJobId?: number | null } | undefined)?.sourceLeadJobId ?? null;
      const created = await scheduleLeadFollowUpsForGeneration({
        companyId,
        jobId,
        leadIds,
        replacePending,
        steps: payload,
      });
      setMessage(`${created.length} follow-up(s) agendado(s) para ${leadIds.length} lead(s) visíveis.`);
      await refreshFollowUps();
      await onRefresh?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível agendar o follow-up em lote.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleItemAction = async (action: "pause" | "resume" | "cancel" | "send", followUp: LeadFollowUp) => {
    resetFeedback();
    setBusyAction(`${action}-${followUp.id}`);
    try {
      if (action === "pause") await pauseLeadFollowUp(followUp.id);
      if (action === "resume") await resumeLeadFollowUp(followUp.id);
      if (action === "cancel") await cancelLeadFollowUp(followUp.id);
      if (action === "send") await sendLeadFollowUpNow(followUp.id);
      setMessage(`Follow-up #${followUp.sequenceNumber} atualizado com sucesso.`);
      await refreshFollowUps();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o follow-up.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleProcessDue = async () => {
    resetFeedback();
    setBusyAction("process");
    try {
      const result = await processDueLeadFollowUps();
      setMessage(`Processados: ${result.checked}. Enviados: ${result.sent}. Falharam: ${result.failed}. Pulados: ${result.skipped}.`);
      await refreshFollowUps();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível processar os follow-ups pendentes.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-4 text-white">
      <div className="rounded-3xl border border-white/10 bg-[#0f1322]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-200/70">Lead follow-up</div>
            <h2 className="mt-2 text-xl font-semibold">Cadência inteligente para leads gerados</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/55">
              Gere emails diferentes com base no contexto do lead, acompanhe o panorama da cadência e pause, retome ou envie manualmente quando precisar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshFollowUps()}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            Atualizar panorama
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total" value={overview?.total ?? followUps.length} helper="Cadência carregada" />
          <StatCard label="Pendentes" value={overview?.pending ?? 0} helper="Aguardando envio" />
          <StatCard label="Enviados" value={overview?.sent ?? 0} helper="Entregues com sucesso" />
          <StatCard label="Pausados" value={overview?.paused ?? 0} helper="Parados manualmente" />
          <StatCard label="Falharam" value={overview?.failed ?? 0} helper="Precisam de revisão" />
          <StatCard label="Próximo" value={overview?.nextScheduledAtUtc ? fmtDate(overview.nextScheduledAtUtc) : "-"} helper="Próximo disparo" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1.35fr]">
        <section className="rounded-3xl border border-white/10 bg-[#0b1020]/85 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Leads visíveis</div>
              <div className="mt-1 text-lg font-semibold">Selecione um lead ou programe em lote</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              {leads.length} lead(s)
            </div>
          </div>

          <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {leads.length ? (
              leads.map((lead) => {
                const isActive = lead.id === selectedLeadId;
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => onSelectLead(isActive ? null : lead.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-fuchsia-400/50 bg-fuchsia-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{lead.businessName || lead.email || `Lead #${lead.id}`}</div>
                        <div className="mt-1 text-xs text-white/50">{lead.email || "Sem email"}</div>
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">ID {lead.id}</div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-white/45">
                Nenhum lead carregado nesta geração.
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <label className="inline-flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={replacePending}
                onChange={(event) => setReplacePending(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent"
              />
              Substituir follow-ups pendentes já existentes
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0b1020]/85 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Modelo da cadência</div>
              <div className="mt-1 text-lg font-semibold">Configure passos com assuntos diferentes</div>
            </div>
            <button
              type="button"
              onClick={() => setSteps(DEFAULT_STEPS)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
            >
              Restaurar modelo
            </button>
          </div>

          <div className="mt-4 max-h-[420px] space-y-4 overflow-y-auto pr-1">
            {steps.map((step, index) => (
              <div key={step.sequenceNumber} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">Passo {index + 1}</div>
                  <div className="text-xs text-white/40">Envio em D+{step.delayDays}</div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-xs uppercase tracking-[0.18em] text-white/45">
                    Nome
                    <input
                      value={step.name}
                      onChange={(event) => updateStep(index, { name: event.target.value })}
                      className="w-full rounded-2xl border border-white/10 bg-[#090d18] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
                    />
                  </label>
                  <label className="space-y-2 text-xs uppercase tracking-[0.18em] text-white/45">
                    Modelo
                    <input
                      value={step.preferredModel}
                      onChange={(event) => updateStep(index, { preferredModel: event.target.value })}
                      className="w-full rounded-2xl border border-white/10 bg-[#090d18] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
                    />
                  </label>
                </div>
                <label className="mt-3 block space-y-2 text-xs uppercase tracking-[0.18em] text-white/45">
                  Assunto
                  <input
                    value={step.subjectTemplate}
                    onChange={(event) => updateStep(index, { subjectTemplate: event.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-[#090d18] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
                  />
                </label>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_150px]">
                  <label className="space-y-2 text-xs uppercase tracking-[0.18em] text-white/45">
                    Instrução para IA
                    <textarea
                      value={step.introText}
                      onChange={(event) => updateStep(index, { introText: event.target.value })}
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-[#090d18] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
                    />
                  </label>
                  <label className="space-y-2 text-xs uppercase tracking-[0.18em] text-white/45">
                    Atraso em dias
                    <input
                      type="number"
                      min={0}
                      value={step.delayDays}
                      onChange={(event) => updateStep(index, { delayDays: Number(event.target.value) || 0 })}
                      className="w-full rounded-2xl border border-white/10 bg-[#090d18] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
                    />
                  </label>
                </div>
                <label className="mt-3 block space-y-2 text-xs uppercase tracking-[0.18em] text-white/45">
                  Observações
                  <textarea
                    value={step.notes}
                    onChange={(event) => updateStep(index, { notes: event.target.value })}
                    rows={2}
                    className="w-full rounded-2xl border border-white/10 bg-[#090d18] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void scheduleForLead()}
              disabled={!selectedLead || busyAction === "lead"}
              className="rounded-2xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyAction === "lead" ? "Agendando..." : "Agendar para lead selecionado"}
            </button>
            <button
              type="button"
              onClick={() => void scheduleForVisibleLeads()}
              disabled={!leads.length || busyAction === "bulk"}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyAction === "bulk" ? "Agendando..." : "Agendar para todos os leads visíveis"}
            </button>
            <button
              type="button"
              onClick={() => void handleProcessDue()}
              disabled={busyAction === "process"}
              className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyAction === "process" ? "Processando..." : "Processar envios pendentes"}
            </button>
          </div>

          {message ? <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}
          {error ? <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        </section>
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#0b1020]/85 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Panorama do lead</div>
            <div className="mt-1 text-lg font-semibold">
              {selectedLead ? `Follow-ups de ${selectedLead.businessName || selectedLead.email || `Lead #${selectedLead.id}`}` : "Selecione um lead para ver a cadência"}
            </div>
          </div>
          {selectedLead ? (
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
              {followUps.length} item(ns)
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {selectedLead ? (
            followUps.length ? (
              followUps.map((followUp) => (
                <div key={followUp.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneByStatus(followUp.status)}`}>
                          {followUp.status}
                        </span>
                        <span className="text-sm font-semibold text-white">#{followUp.sequenceNumber} · {followUp.name}</span>
                      </div>
                      <div className="mt-2 text-sm text-white/70">{followUp.subjectTemplate || "Sem assunto"}</div>
                      <div className="mt-2 grid gap-2 text-xs text-white/45 md:grid-cols-3">
                        <div>Agendado: {fmtDate(followUp.scheduledAtUtc)}</div>
                        <div>Última tentativa: {fmtDate(followUp.lastAttemptAtUtc)}</div>
                        <div>Enviado: {fmtDate(followUp.sentAtUtc)}</div>
                      </div>
                      {followUp.errorMessage ? (
                        <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                          {followUp.errorMessage}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleItemAction("send", followUp)}
                        disabled={busyAction === `send-${followUp.id}`}
                        className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:opacity-50"
                      >
                        Enviar agora
                      </button>
                      {followUp.status === "paused" ? (
                        <button
                          type="button"
                          onClick={() => void handleItemAction("resume", followUp)}
                          disabled={busyAction === `resume-${followUp.id}`}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                        >
                          Retomar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleItemAction("pause", followUp)}
                          disabled={busyAction === `pause-${followUp.id}`}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                        >
                          Pausar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleItemAction("cancel", followUp)}
                        disabled={busyAction === `cancel-${followUp.id}`}
                        className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-sm text-white/45">
                Este lead ainda não possui follow-ups agendados.
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-sm text-white/45">
              Selecione um lead na lista ao lado para visualizar e controlar a cadência individual.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
