"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mail,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  cancelLeadFollowUp,
  getLeadFollowUpOverview,
  listLeadFollowUps,
  listLeadGenerationJobs,
  listLeadsByCompany,
  listLeadsByJob,
  pauseLeadFollowUp,
  processDueLeadFollowUps,
  resumeLeadFollowUp,
  scheduleLeadFollowUpsForLead,
  sendLeadFollowUpNow,
  type LeadFollowUp,
  type LeadFollowUpOverview,
  type LeadFollowUpStepInput,
  type LeadGenerationJob,
  type LeadSummary,
} from "@/lib/leads/lead-generation-api";
import {
  fetchCompanyEmailContext,
  fetchUserEmailContext,
  type OkestriaCompanyEmailContext,
  type OkestriaUserEmailContext,
} from "@/lib/auth/api";
import { getBrowserAccessToken } from "@/lib/agents/backend-api";
import { LeadOpsPanel } from "@/features/office/components/panels/LeadOpsPanel";
import type { AgentState } from "@/features/agents/state/store";

/* ───────────────────── Types & constants ───────────────────── */

type LeadOpsModalProps = {
  open: boolean;
  companyId: number | null;
  companyName?: string | null;
  agents: AgentState[];
  onSelectAgent: (
    agentId: string,
    options?: {
      sessionKey?: string | null;
      leadContext?: string | null;
      leadContextLabel?: string | null;
      draft?: string | null;
    },
  ) => void;
  onClose: () => void;
};

type TopTab = "leadops" | "followup";
type FollowUpTab = "overview" | "schedule" | "sessions";

type DraftStep = {
  sequenceNumber: number;
  name: string;
  subjectTemplate: string;
  introText: string;
  delayDays: number;
  preferredModel: string;
  notes: string;
};

const ACCENT = "#d946ef"; // fuchsia — unifies the Lead Ops modal vibe

const DEFAULT_STEPS: DraftStep[] = [
  {
    sequenceNumber: 1,
    name: "First touch",
    subjectTemplate: "{{businessName}} | quick idea to unlock more opportunities",
    introText:
      "Open the conversation with a short, consultative, value-first email. Use the freshest lead insight available.",
    delayDays: 0,
    preferredModel: "claude-sonnet-4-5-20250929",
    notes: "Human tone, direct, no hint of an automated sequence.",
  },
  {
    sequenceNumber: 2,
    name: "Second follow-up",
    subjectTemplate: "Can I show you a simple path for {{businessName}}?",
    introText:
      "Write a different email from the first one — bring a new value angle and reinforce credibility.",
    delayDays: 2,
    preferredModel: "claude-sonnet-4-5-20250929",
    notes: "Do not reuse the same CTA or phrases from the first email.",
  },
  {
    sequenceNumber: 3,
    name: "Final attempt",
    subjectTemplate: "Should I close the loop or does this week still work?",
    introText:
      "Write an elegant, short, respectful last attempt with a light CTA.",
    delayDays: 5,
    preferredModel: "claude-haiku-4-5-20251001",
    notes: "Hint at urgency without pressuring.",
  },
];

/* ───────────────────── Helpers ───────────────────── */

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
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
      return "Sent";
    case "paused":
      return "Paused";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "processing":
      return "Processing";
    case "pending":
      return "Pending";
    default:
      return status ?? "—";
  }
};

const readBrowserUserId = (): number | null => {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("okestria_session="));
  if (!entry) return null;
  try {
    const raw = decodeURIComponent(entry.slice("okestria_session=".length));
    const parsed = JSON.parse(raw) as { userId?: number | null };
    return typeof parsed.userId === "number" && Number.isFinite(parsed.userId)
      ? parsed.userId
      : null;
  } catch {
    return null;
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
  agents,
  onSelectAgent,
  onClose,
}: LeadOpsModalProps) {
  const [topTab, setTopTab] = useState<TopTab>("leadops");
  const [followUpTab, setFollowUpTab] = useState<FollowUpTab>("overview");

  // Follow-up data (loaded only when the Follow-up tab is active so we
  // don't pay for these calls when the user is doing lead generation).
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [missions, setMissions] = useState<LeadGenerationJob[]>([]);
  const [overview, setOverview] = useState<LeadFollowUpOverview | null>(null);
  const [followUpLoadError, setFollowUpLoadError] = useState<string | null>(null);

  const [companyContext, setCompanyContext] =
    useState<OkestriaCompanyEmailContext | null>(null);
  const [userContext, setUserContext] = useState<OkestriaUserEmailContext | null>(
    null,
  );

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedLeadFollowUps, setSelectedLeadFollowUps] = useState<LeadFollowUp[]>(
    [],
  );
  const [selectedLeadLoading, setSelectedLeadLoading] = useState(false);

  const [steps, setSteps] = useState<DraftStep[]>(DEFAULT_STEPS);
  const [replacePending, setReplacePending] = useState(false);
  const [missionFilter, setMissionFilter] = useState<number | "all">("all");
  const [leadSearch, setLeadSearch] = useState("");
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Live progress for "Schedule for all filtered leads". Mirrors the
   * same pattern we use for bulk insight generation: we loop the
   * individual per-lead endpoint from the frontend so each call is
   * small, atomic, and the UI can show which lead is being processed.
   * The old single-shot /followups/bulk endpoint stayed up but in
   * practice returned 502s under load — looping works reliably.
   */
  const [bulkScheduleProgress, setBulkScheduleProgress] = useState<{
    current: number;
    total: number;
    currentName: string;
    succeeded: number;
    failed: number;
    cancelRequested: boolean;
  } | null>(null);

  const resetFeedback = useCallback(() => {
    setMessage(null);
    setError(null);
  }, []);

  /* ──────────── Loading (follow-up side) ──────────── */

  const loadFollowUpData = useCallback(async () => {
    if (!companyId) {
      setFollowUpLoadError("Company not identified. Please sign in again to continue.");
      return;
    }
    setFollowUpLoading(true);
    setFollowUpLoadError(null);
    try {
      const leadsPromise =
        missionFilter === "all"
          ? listLeadsByCompany(companyId)
          : listLeadsByJob(missionFilter);
      const [leadsResult, missionsResult, overviewResult] = await Promise.all([
        leadsPromise,
        listLeadGenerationJobs(companyId),
        getLeadFollowUpOverview().catch(() => null),
      ]);
      setLeads(leadsResult);
      setMissions(missionsResult);
      setOverview(overviewResult);
    } catch (cause) {
      const detail =
        cause instanceof Error
          ? cause.message
          : "Failed to load follow-up data.";
      setFollowUpLoadError(detail);
    } finally {
      setFollowUpLoading(false);
    }
  }, [companyId, missionFilter]);

  // Kick follow-up loads when that tab is opened (or its mission filter changes).
  useEffect(() => {
    if (!open) return;
    if (topTab !== "followup") return;
    resetFeedback();
    void loadFollowUpData();
  }, [open, topTab, loadFollowUpData, resetFeedback]);

  // Load email context (best-effort) when the modal opens.
  useEffect(() => {
    if (!open || !companyId) return;
    const token = getBrowserAccessToken();
    if (!token) return;
    let cancelled = false;
    fetchCompanyEmailContext(companyId, token)
      .then((ctx) => {
        if (!cancelled) setCompanyContext(ctx);
      })
      .catch(() => {});
    const userId = readBrowserUserId();
    if (userId) {
      fetchUserEmailContext(userId, token)
        .then((ctx) => {
          if (!cancelled) setUserContext(ctx);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  // Re-load follow-ups for the selected lead when selection changes.
  useEffect(() => {
    if (!open || topTab !== "followup" || !selectedLeadId) {
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
        setError(
          cause instanceof Error
            ? cause.message
            : "Failed to load this lead's follow-ups.",
        );
      })
      .finally(() => {
        if (!cancelled) setSelectedLeadLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, topTab, selectedLeadId]);

  /* ──────────── Derived values ──────────── */

  const overviewSafe = useMemo(
    () => ({
      total: overview?.total ?? 0,
      pending: overview?.pending ?? 0,
      processing: overview?.processing ?? 0,
      sent: overview?.sent ?? 0,
      paused: overview?.paused ?? 0,
      failed: overview?.failed ?? 0,
      cancelled: overview?.cancelled ?? 0,
      nextScheduled: overview?.nextScheduledAtUtc ?? null,
    }),
    [overview],
  );

  const filteredLeads = useMemo(() => {
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

  /**
   * Appends a new cadence step to the end of the list. The new step gets
   * sensible defaults derived from the previous step so the operator just
   * has to tweak the copy, not set up timing from scratch.
   */
  const addStep = () => {
    setSteps((current) => {
      const last = current[current.length - 1];
      const nextNumber = current.length + 1;
      // Keep a gentle cadence ladder: each new step lands 3 days after
      // the previous one's delay. Stops growing past 30 days so we never
      // silently schedule a follow-up a month out without the operator
      // noticing.
      const nextDelay = Math.min((last?.delayDays ?? 0) + 3, 30);
      const newStep: DraftStep = {
        sequenceNumber: nextNumber,
        name: `Follow-up ${nextNumber}`,
        subjectTemplate:
          nextNumber <= 2
            ? `Quick check-in about {{businessName}}`
            : `Last note about {{businessName}} — should I close the loop?`,
        introText:
          "Write a short, human, respectful touch that brings a fresh angle. Do not repeat earlier phrases.",
        delayDays: nextDelay,
        preferredModel: last?.preferredModel || "claude-sonnet-4-5-20250929",
        notes: "",
      };
      setExpandedStep(nextNumber); // open the newly added step for editing
      return [...current, newStep];
    });
  };

  /**
   * Removes a step by index. Keeps at least one step — the backend rejects
   * an empty cadence (see ValidateFollowUpSteps on the server). After
   * removing we re-number the remaining steps so sequenceNumber stays 1..N
   * contiguous.
   */
  const removeStep = (index: number) => {
    setSteps((current) => {
      if (current.length <= 1) return current;
      const next = current
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, sequenceNumber: i + 1 }));
      // If the removed step was the one open for editing, collapse.
      setExpandedStep((openSeq) => {
        const removed = current[index];
        if (removed && openSeq === removed.sequenceNumber) return null;
        // Re-map openSeq through the renumbering so the same step stays open.
        const remainingIndex = current.findIndex(
          (_, i) => i !== index && current[i].sequenceNumber === openSeq,
        );
        return remainingIndex >= 0 ? remainingIndex + 1 : openSeq;
      });
      return next;
    });
  };

  const scheduleForSelectedLead = async () => {
    if (!selectedLead) {
      setError("Pick a lead to schedule an individual cadence.");
      return;
    }
    const payload = buildStepsPayload(steps);
    if (!payload.length) {
      setError("Fill in at least one follow-up subject.");
      return;
    }
    resetFeedback();
    setBusyAction("lead");
    try {
      const created = await scheduleLeadFollowUpsForLead(selectedLead.id, payload);
      setMessage(
        `${created.length} follow-up(s) scheduled for ${
          selectedLead.businessName || selectedLead.email || `lead ${selectedLead.id}`
        }.`,
      );
      await loadFollowUpData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to schedule the follow-up for this lead.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const scheduleForFilteredLeads = async () => {
    if (!companyId) {
      setError("Company not identified.");
      return;
    }
    const targets = filteredLeads.filter((l) => Number.isFinite(l.id));
    if (!targets.length) {
      setError("No leads match the current filter. Adjust the filter and try again.");
      return;
    }
    const payload = buildStepsPayload(steps);
    if (!payload.length) {
      setError("Fill in at least one follow-up subject.");
      return;
    }

    resetFeedback();
    setBusyAction("bulk");
    setBulkScheduleProgress({
      current: 0,
      total: targets.length,
      currentName: "",
      succeeded: 0,
      failed: 0,
      cancelRequested: false,
    });

    // Loop the per-lead endpoint instead of a single /followups/bulk
    // call. Each iteration mirrors the "Schedule for selected lead"
    // button, which is known-good. Small per-request payload means no
    // 502 timeouts and we can show live progress.
    let succeeded = 0;
    let failed = 0;
    let totalCreated = 0;

    try {
      for (let i = 0; i < targets.length; i++) {
        const lead = targets[i];

        // Cancellation check — reads latest state via setter.
        let shouldStop = false;
        setBulkScheduleProgress((prev) => {
          if (prev?.cancelRequested) shouldStop = true;
          return prev
            ? {
                ...prev,
                current: i + 1,
                currentName:
                  lead.businessName || lead.email || `Lead #${lead.id}`,
              }
            : prev;
        });
        if (shouldStop) break;

        try {
          const created = await scheduleLeadFollowUpsForLead(lead.id, payload);
          totalCreated += created.length;
          succeeded++;
          setBulkScheduleProgress((prev) =>
            prev ? { ...prev, succeeded } : prev,
          );
        } catch (cause) {
          failed++;
          setBulkScheduleProgress((prev) =>
            prev ? { ...prev, failed } : prev,
          );
          console.warn(
            `[bulk schedule] lead ${lead.id} failed:`,
            cause instanceof Error ? cause.message : cause,
          );
        }
      }

      const parts: string[] = [];
      if (succeeded > 0)
        parts.push(
          `${totalCreated} follow-up(s) scheduled across ${succeeded} lead(s)`,
        );
      if (failed > 0) parts.push(`${failed} failed`);
      setMessage(
        parts.length > 0
          ? parts.join(" · ")
          : "No follow-ups were created. Check the cadence fields and try again.",
      );
      await loadFollowUpData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to schedule follow-ups in bulk.",
      );
    } finally {
      setBusyAction(null);
      setBulkScheduleProgress(null);
    }
  };

  const cancelBulkSchedule = useCallback(() => {
    setBulkScheduleProgress((prev) =>
      prev ? { ...prev, cancelRequested: true } : prev,
    );
  }, []);

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
      setMessage(`Follow-up #${followUp.sequenceNumber} updated successfully.`);
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
      await loadFollowUpData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to update the follow-up.",
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
        `Checked: ${result.checked}. Sent: ${result.sent}. Failed: ${result.failed}. Skipped: ${result.skipped}.`,
      );
      await loadFollowUpData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to process pending follow-ups.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  if (!open) return null;

  /* ───────────────────── Render ───────────────────── */

  const bulkScheduleOverlay = bulkScheduleProgress ? (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
      <section
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border bg-[#0b0e14] shadow-[0_32px_120px_rgba(0,0,0,.72)]"
        style={{ borderColor: `${ACCENT}40` }}
      >
        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `${ACCENT}20`,
              border: `1.5px solid ${ACCENT}50`,
              color: ACCENT,
            }}
          >
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-white">
              Scheduling cadences…
            </h3>
            <p className="truncate text-xs text-white/50">
              One lead at a time, same as the single-lead button.
            </p>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Current lead
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: ACCENT }} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                {bulkScheduleProgress.currentName || "Preparing…"}
              </span>
              <span className="shrink-0 text-[11px] text-white/50">
                {Math.min(bulkScheduleProgress.current, bulkScheduleProgress.total)} /{" "}
                {bulkScheduleProgress.total}
              </span>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${
                  bulkScheduleProgress.total > 0
                    ? Math.min(
                        100,
                        Math.floor(
                          ((bulkScheduleProgress.succeeded + bulkScheduleProgress.failed) /
                            bulkScheduleProgress.total) *
                            100,
                        ),
                      )
                    : 0
                }%`,
                backgroundColor: ACCENT,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/[0.07] px-2 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Scheduled
              </div>
              <div className="mt-0.5 text-base font-semibold text-emerald-200">
                {bulkScheduleProgress.succeeded}
              </div>
            </div>
            <div
              className={`rounded-lg border px-2 py-2 ${
                bulkScheduleProgress.failed > 0
                  ? "border-rose-400/25 bg-rose-500/[0.07]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Failed
              </div>
              <div
                className={`mt-0.5 text-base font-semibold ${
                  bulkScheduleProgress.failed > 0 ? "text-rose-200" : "text-white/80"
                }`}
              >
                {bulkScheduleProgress.failed}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-[11px] text-white/40">
              {bulkScheduleProgress.cancelRequested
                ? "Stopping after the current lead…"
                : "The window stays open until every lead is done."}
            </div>
            <button
              type="button"
              onClick={cancelBulkSchedule}
              disabled={bulkScheduleProgress.cancelRequested}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
    {/* Bulk schedule progress sits on z-96 so it stacks above the main
        modal when the user fires a "Schedule for all filtered leads"
        pass. It unmounts automatically once the loop finishes. */}
    {bulkScheduleOverlay}
    {/* Note: we intentionally avoid putting `backdrop-filter` on the
        outermost container, otherwise the sub-modals that LeadOpsPanel
        renders (New Mission, Lead Vault, Lead Detail, Email Batch,
        Single Email) would be trapped inside its containing block and
        fail to cover the full viewport. The blur now lives on the
        backdrop sibling, which is not an ancestor of the sub-modals,
        so `fixed inset-0` inside them escapes back to the viewport. */}
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        className="relative z-10 flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-[#0b0e14] shadow-[0_32px_120px_rgba(0,0,0,.72)]"
        style={{ borderColor: `${ACCENT}30` }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${ACCENT}20`, border: `1.5px solid ${ACCENT}50` }}
          >
            <Target className="h-5 w-5" style={{ color: ACCENT }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-white">
              Lead Ops
            </h2>
            <p className="text-xs text-white/40">
              {companyName
                ? `Prospecting, outreach and follow-up for ${companyName}.`
                : "Prospecting, outreach and follow-up."}
            </p>
          </div>
          {topTab === "followup" ? (
            <button
              type="button"
              onClick={() => void loadFollowUpData()}
              disabled={followUpLoading}
              title="Reload follow-up data"
              className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCcw
                className={`h-4 w-4 ${followUpLoading ? "animate-spin" : ""}`}
              />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Top-level tabs: Lead operations vs Follow-up ── */}
        <div className="flex border-b border-white/10">
          {(
            [
              {
                id: "leadops" as const,
                label: "Lead operations",
                helper: "Generate, browse and send outreach",
                icon: <Users className="h-4 w-4" />,
              },
              {
                id: "followup" as const,
                label: "Follow-up cadence",
                helper: "Schedule AI-driven email sequences",
                icon: <Mail className="h-4 w-4" />,
              },
            ]
          ).map((entry) => {
            const active = topTab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTopTab(entry.id)}
                className={`group flex flex-1 flex-col items-center gap-0.5 py-3 text-center transition ${
                  active ? "text-white" : "text-white/50 hover:text-white/80"
                }`}
                style={
                  active
                    ? { borderBottom: `2px solid ${ACCENT}` }
                    : { borderBottom: "2px solid transparent" }
                }
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md"
                    style={
                      active
                        ? {
                            backgroundColor: `${ACCENT}20`,
                            color: ACCENT,
                            border: `1px solid ${ACCENT}40`,
                          }
                        : { color: "rgba(255,255,255,0.5)" }
                    }
                  >
                    {entry.icon}
                  </span>
                  {entry.label}
                </span>
                <span className="text-[10px] text-white/35">{entry.helper}</span>
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {topTab === "leadops" ? (
            // The LeadOpsPanel owns its own scrollable body. We give it
            // a flex column of flex-1 + min-h-0 so the inner overflow-y-auto
            // works inside a nested flex layout.
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              <LeadOpsPanel
                agents={agents}
                companyName={companyName ?? undefined}
                onSelectAgent={onSelectAgent}
                embedded
              />
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              {/* Follow-up sub-tabs */}
              <div className="flex border-b border-white/10 px-6">
                {(
                  [
                    {
                      id: "overview" as const,
                      label: "Overview",
                      count: overviewSafe.total,
                    },
                    {
                      id: "schedule" as const,
                      label: "Schedule",
                      count: leads.length,
                    },
                    {
                      id: "sessions" as const,
                      label: "Sessions",
                      count: selectedLead ? selectedLeadFollowUps.length : null,
                    },
                  ]
                ).map((entry) => {
                  const active = followUpTab === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setFollowUpTab(entry.id)}
                      className={`px-3 py-2.5 text-xs font-medium tracking-wide transition ${
                        active ? "text-white" : "text-white/40 hover:text-white/60"
                      }`}
                      style={
                        active
                          ? { borderBottom: `2px solid ${ACCENT}` }
                          : { borderBottom: "2px solid transparent" }
                      }
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

              <div className="min-h-0 flex-1 overflow-y-auto">
                {followUpLoadError ? (
                  <div className="m-6 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="leading-6">{followUpLoadError}</span>
                  </div>
                ) : null}

                {followUpTab === "overview" && (
                  <OverviewTab
                    loading={followUpLoading}
                    overview={overviewSafe}
                    missions={missions}
                    leadsCount={leads.length}
                    busyAction={busyAction}
                    onProcessDue={handleProcessDue}
                    onJumpToSchedule={() => setFollowUpTab("schedule")}
                  />
                )}

                {followUpTab === "schedule" && (
                  <ScheduleTab
                    loading={followUpLoading}
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
                      setExpandedStep((current) =>
                        current === index ? null : index,
                      )
                    }
                    onUpdateStep={updateStep}
                    onResetSteps={() => setSteps(DEFAULT_STEPS)}
                    onAddStep={addStep}
                    onRemoveStep={removeStep}
                    busyAction={busyAction}
                    canScheduleLead={Boolean(selectedLeadId)}
                    canScheduleBulk={filteredLeads.length > 0}
                    onScheduleLead={() => void scheduleForSelectedLead()}
                    onScheduleBulk={() => void scheduleForFilteredLeads()}
                    companyContext={companyContext}
                    userContext={userContext}
                    contextPanelOpen={contextPanelOpen}
                    onToggleContextPanel={() =>
                      setContextPanelOpen((current) => !current)
                    }
                  />
                )}

                {followUpTab === "sessions" && (
                  <SessionsTab
                    loading={followUpLoading || selectedLeadLoading}
                    leads={leads}
                    selectedLead={selectedLead}
                    selectedLeadId={selectedLeadId}
                    onSelectLead={setSelectedLeadId}
                    followUps={selectedLeadFollowUps}
                    busyAction={busyAction}
                    onAction={handleItemAction}
                    onJumpToSchedule={() => setFollowUpTab("schedule")}
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
            </div>
          )}
        </div>
      </section>
    </div>
    </>
  );
}

/* ───────────────────── Tab: Overview ───────────────────── */

function OverviewTab({
  loading,
  overview,
  missions,
  leadsCount,
  busyAction,
  onProcessDue,
  onJumpToSchedule,
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
  missions: LeadGenerationJob[];
  leadsCount: number;
  busyAction: string | null;
  onProcessDue: () => void;
  onJumpToSchedule: () => void;
}) {
  if (loading && overview.total === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-white/40">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading overview…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total scheduled"
          value={overview.total}
          helper="Every follow-up in this workspace"
          tone="accent"
        />
        <StatCard
          label="Pending"
          value={overview.pending + overview.processing}
          helper={
            overview.processing
              ? `${overview.processing} processing`
              : "Awaiting send"
          }
          tone="warning"
        />
        <StatCard
          label="Sent"
          value={overview.sent}
          helper="Delivered successfully"
          tone="success"
        />
        <StatCard
          label="Failed"
          value={overview.failed}
          helper={overview.failed ? "Need review" : "No errors"}
          tone={overview.failed ? "danger" : "neutral"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Next send
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {overview.nextScheduled ? fmtDate(overview.nextScheduled) : "Nothing in the queue"}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Leads in base
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {leadsCount} lead{leadsCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Missions
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {missions.length} registered
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onJumpToSchedule}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
          style={{ backgroundColor: `${ACCENT}25`, border: `1px solid ${ACCENT}50` }}
        >
          <Sparkles className="h-4 w-4" />
          New cadence
        </button>
        <button
          type="button"
          onClick={onProcessDue}
          disabled={busyAction === "process"}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-50"
          title="Trigger the worker to try sending all due follow-ups right now"
        >
          {busyAction === "process" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Process pending sends
        </button>
      </div>

      <div>
        <div className="mb-3 text-sm font-semibold text-white">Status breakdown</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Paused
            </div>
            <div className="mt-1 text-lg font-semibold text-amber-200">
              {overview.paused}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Processing
            </div>
            <div className="mt-1 text-lg font-semibold text-sky-200">
              {overview.processing}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Cancelled
            </div>
            <div className="mt-1 text-lg font-semibold text-white/60">
              {overview.cancelled}
            </div>
          </div>
        </div>
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
  onAddStep,
  onRemoveStep,
  busyAction,
  canScheduleLead,
  canScheduleBulk,
  onScheduleLead,
  onScheduleBulk,
  companyContext,
  userContext,
  contextPanelOpen,
  onToggleContextPanel,
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
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  busyAction: string | null;
  canScheduleLead: boolean;
  canScheduleBulk: boolean;
  onScheduleLead: () => void;
  onScheduleBulk: () => void;
  companyContext: OkestriaCompanyEmailContext | null;
  userContext: OkestriaUserEmailContext | null;
  contextPanelOpen: boolean;
  onToggleContextPanel: () => void;
}) {
  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <aside className="border-white/10 p-6 lg:border-r">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Company leads</div>
          <span className="text-[11px] text-white/40">
            {leads.length} visible
          </span>
        </div>

        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Mission
        </label>
        <select
          value={missionFilter === "all" ? "all" : String(missionFilter)}
          onChange={(e) =>
            onMissionFilter(e.target.value === "all" ? "all" : Number(e.target.value))
          }
          className="mb-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
        >
          <option value="all">All missions</option>
          {missions.map((mission) => (
            <option key={mission.id} value={mission.id}>
              {mission.title || `Mission #${mission.id}`}
            </option>
          ))}
        </select>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            placeholder="Search lead, city, niche…"
            value={leadSearch}
            onChange={(e) => onLeadSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/25"
          />
        </div>

        <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition hover:bg-white/[0.06]">
          <input
            type="checkbox"
            checked={replacePending}
            onChange={(e) => onReplacePendingChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-transparent"
          />
          Replace existing pending follow-ups
        </label>

        <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
          {loading && leads.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-white/40">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading leads…
            </div>
          ) : leads.length === 0 ? (
            <EmptyState
              icon={<Target className="h-5 w-5" style={{ color: ACCENT }} />}
              title="No leads found"
              hint="Adjust the mission filter or run a new lead generation."
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
                        {lead.email || "No email"}
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

      <div className="p-6">
        <ContextPreview
          open={contextPanelOpen}
          onToggle={onToggleContextPanel}
          companyContext={companyContext}
          userContext={userContext}
        />

        <div className="mb-3 mt-5 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Cadence</span>
              <span
                className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                style={{ backgroundColor: `${ACCENT}25`, color: ACCENT }}
              >
                {steps.length}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-white/40">
              Each step generates a different email — the AI agent adapts the copy
              to the lead&apos;s context.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddStep}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
              style={{
                backgroundColor: `${ACCENT}20`,
                borderColor: `${ACCENT}50`,
                color: "white",
              }}
              title="Add a new step to the end of the cadence"
            >
              <Plus className="h-3.5 w-3.5" />
              Add step
            </button>
            <button
              type="button"
              onClick={onResetSteps}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
              title="Restore the 3-step default cadence"
            >
              Reset to default
            </button>
          </div>
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
                <div className="flex w-full items-center gap-2 pr-2">
                  {/* The main clickable area — expands/collapses the step.
                      Uses flex-1 so the delete button can sit flush on the
                      right without getting captured by the toggle click. */}
                  <button
                    type="button"
                    onClick={() => onToggleStep(step.sequenceNumber)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
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
                        {step.name || `Step ${index + 1}`}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-white/40">
                        {step.subjectTemplate || "No subject yet"}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/50">
                      D+{step.delayDays}
                    </span>
                  </button>

                  {/* Remove step — hidden when only one step is left because
                      the backend rejects an empty cadence. Sits outside the
                      toggle button so clicking it doesn't collapse/expand. */}
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveStep(index);
                      }}
                      title="Remove this step"
                      aria-label={`Remove step ${index + 1}`}
                      className="shrink-0 rounded-lg border border-white/10 bg-white/[0.02] p-1.5 text-white/40 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {expanded && (
                  <div className="space-y-3 border-t border-white/10 px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Internal name">
                        <input
                          value={step.name}
                          onChange={(e) =>
                            onUpdateStep(index, { name: e.target.value })
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
                        />
                      </Field>
                      <Field label="AI model">
                        <input
                          value={step.preferredModel}
                          onChange={(e) =>
                            onUpdateStep(index, { preferredModel: e.target.value })
                          }
                          placeholder="claude-sonnet-4-5-20250929"
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/25"
                        />
                      </Field>
                    </div>
                    <Field label="Email subject (supports {{businessName}})">
                      <input
                        value={step.subjectTemplate}
                        onChange={(e) =>
                          onUpdateStep(index, { subjectTemplate: e.target.value })
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                      <Field label="Instruction for the AI">
                        <textarea
                          value={step.introText}
                          onChange={(e) =>
                            onUpdateStep(index, { introText: e.target.value })
                          }
                          rows={3}
                          className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
                        />
                      </Field>
                      <Field label="Delay (days)">
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
                    <Field label="Internal notes">
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

          {/* Friendly secondary "Add step" row at the bottom of the list —
              mirrors the button in the header so the control stays reachable
              after the user scrolls through a long cadence. */}
          <button
            type="button"
            onClick={onAddStep}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] py-3 text-xs font-medium text-white/55 transition hover:border-fuchsia-400/40 hover:bg-fuchsia-500/[0.05] hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add another step
          </button>
        </div>

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
            Schedule for selected lead
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
            Schedule for all filtered leads
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Context preview ───────────────────── */

function ContextPreview({
  open,
  onToggle,
  companyContext,
  userContext,
}: {
  open: boolean;
  onToggle: () => void;
  companyContext: OkestriaCompanyEmailContext | null;
  userContext: OkestriaUserEmailContext | null;
}) {
  const hasContext = Boolean(
    companyContext &&
      (companyContext.description ||
        companyContext.products ||
        companyContext.tone ||
        companyContext.website ||
        companyContext.phone ||
        companyContext.extraNotes),
  );
  const footerImage =
    userContext?.footerImageBase64 || companyContext?.footerImageBase64 || "";

  return (
    <div
      className={`overflow-hidden rounded-xl border transition ${
        open ? "border-fuchsia-400/25 bg-white/[0.03]" : "border-white/[0.08] bg-white/[0.02]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-white/30">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `${ACCENT}15`,
            color: ACCENT,
            border: `1px solid ${ACCENT}25`,
          }}
        >
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white">Email context &amp; footer</div>
          <div className="mt-0.5 truncate text-[11px] text-white/45">
            The AI will use the company context and your signature footer — same as before.
          </div>
        </div>
        <span
          className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider"
          style={{
            borderColor: `${ACCENT}40`,
            color: ACCENT,
            backgroundColor: `${ACCENT}10`,
          }}
        >
          {hasContext ? "Context loaded" : "No context yet"}
        </span>
      </button>

      {open && (
        <div className="grid gap-3 border-t border-white/10 px-4 py-4 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              <FileText className="h-3 w-3" />
              Company context
            </div>
            {hasContext ? (
              <dl className="space-y-2 text-xs text-white/70">
                {companyContext?.description ? (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-white/35">
                      About
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-white/75">
                      {companyContext.description}
                    </dd>
                  </div>
                ) : null}
                {companyContext?.products ? (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-white/35">
                      Products / services
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-white/75">
                      {companyContext.products}
                    </dd>
                  </div>
                ) : null}
                {companyContext?.tone ? (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-white/35">
                      Tone
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-white/75">
                      {companyContext.tone}
                    </dd>
                  </div>
                ) : null}
                {companyContext?.website ? (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-white/35">
                      Website
                    </dt>
                    <dd className="mt-0.5 text-white/75">{companyContext.website}</dd>
                  </div>
                ) : null}
                {companyContext?.phone ? (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-white/35">
                      Phone
                    </dt>
                    <dd className="mt-0.5 text-white/75">{companyContext.phone}</dd>
                  </div>
                ) : null}
                {companyContext?.extraNotes ? (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-white/35">
                      Extra notes
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-white/75">
                      {companyContext.extraNotes}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <div className="text-xs text-white/40">
                No email context saved yet. Set it in{" "}
                <span className="text-white/70">Company profile → Email context</span>.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              <ImageIcon className="h-3 w-3" />
              Signature footer
            </div>
            {footerImage ? (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-md border border-white/10 bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={footerImage}
                    alt="Email footer preview"
                    className="block w-full object-contain"
                  />
                </div>
                <div className="text-[11px] text-white/40">
                  This banner is appended below every follow-up sent.
                </div>
              </div>
            ) : (
              <div className="text-xs text-white/40">
                No footer banner uploaded. Upload one in{" "}
                <span className="text-white/70">Company profile → Email context</span>.
              </div>
            )}
          </div>
        </div>
      )}
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
      <aside className="border-white/10 p-6 lg:border-r">
        <div className="mb-3 text-sm font-semibold text-white">Leads</div>
        <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
          {leads.length === 0 ? (
            <EmptyState
              icon={<Target className="h-5 w-5" style={{ color: ACCENT }} />}
              title="No leads loaded"
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
                    {lead.email || "No email"}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className="p-6">
        {!selectedLead ? (
          <EmptyState
            icon={<Mail className="h-5 w-5" style={{ color: ACCENT }} />}
            title="Pick a lead to view the cadence"
            hint="The list on the side shows every lead in the company."
          />
        ) : loading ? (
          <div className="flex min-h-[300px] items-center justify-center text-sm text-white/40">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading cadence…
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
                  {selectedLead.email || "No email"}
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
                  No follow-ups scheduled yet
                </div>
                <div className="mt-1 text-xs text-white/35">
                  Build a cadence to start nurturing this lead.
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
                  Go to Schedule
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
            {followUp.subjectTemplate || "No subject"}
          </div>
          <div className="mt-2 grid gap-1 text-[11px] text-white/40 sm:grid-cols-3">
            <div>Scheduled: {fmtDate(followUp.scheduledAtUtc)}</div>
            <div>Last attempt: {fmtDate(followUp.lastAttemptAtUtc)}</div>
            <div>Sent: {fmtDate(followUp.sentAtUtc)}</div>
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
              title="Send now"
              className="inline-flex items-center gap-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1.5 text-[11px] font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:opacity-50"
            >
              {busyAction === `send-${followUp.id}` ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Send
            </button>
            {status === "paused" ? (
              <button
                type="button"
                onClick={() => onAction("resume", followUp)}
                disabled={busyAction === `resume-${followUp.id}`}
                title="Resume"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
              >
                {busyAction === `resume-${followUp.id}` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAction("pause", followUp)}
                disabled={busyAction === `pause-${followUp.id}`}
                title="Pause"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
              >
                {busyAction === `pause-${followUp.id}` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={() => onAction("cancel", followUp)}
              disabled={busyAction === `cancel-${followUp.id}`}
              title="Cancel"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50"
            >
              {busyAction === `cancel-${followUp.id}` ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
