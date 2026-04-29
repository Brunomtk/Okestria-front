"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  RefreshCcw,
  Trash2,
  Users2,
  X,
  Zap,
} from "lucide-react";
import type {
  SquadExecutionMode,
  SquadSummary,
  SquadTask,
  SquadTaskAttachment,
  SquadTaskDispatchEstimate,
  SquadTaskRun,
  SquadTaskSummary,
} from "@/lib/squads/api";
import type { GatewayModelChoice } from "@/lib/gateway/models";
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
// v97 — render assistant text as proper markdown (headings, lists, links)
// instead of dumping `##` and `**` straight on the screen, matching the
// agent / cron / squad-chat surfaces.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MARKDOWN_COMPONENTS } from "./shared/chatMarkdownComponents";
import { AgentAvatar } from "@/features/agents/components/AgentAvatar";

type DispatchMode = "pending" | "retryFailed" | "redispatchAll";

type SquadOpsModalProps = {
  open: boolean;
  squads: SquadSummary[];
  squad: SquadSummary | null;
  selectedSquadId: string | null;
  tasks: SquadTaskSummary[];
  selectedTask: SquadTask | null;
  loading: boolean;
  refreshingTask: boolean;
  createBusy: boolean;
  dispatchBusy: boolean;
  dispatchEstimate: SquadTaskDispatchEstimate | null;
  dispatchEstimateBusy: boolean;
  dispatchApprovalMode: DispatchMode | null;
  error: string | null;
  hooksConfigured: boolean;
  hooksMessage: string | null;
  availableModels: GatewayModelChoice[];
  onClose: () => void;
  onRefresh: () => void;
  onSelectSquad: (squadId: string) => void;
  onSelectTask: (taskId: number) => void;
  onCreateTask: (payload: {
    title: string;
    prompt: string;
    preferredModel: string | null;
    executionMode: SquadExecutionMode | null;
    /** Pin the task to a specific lead — backend injects the full lead record
     *  into every step's system prompt as an OKESTRIA_LEAD_CHAT_CONTEXT block. */
    leadId: number | null;
    /** Same as leadId but scoped to a whole lead generation mission. */
    leadGenerationJobId: number | null;
    /** Up to 6 base64-encoded files (15MB each, 25MB total). */
    attachments: SquadTaskAttachment[] | null;
  }) => void;
  onPreviewDispatchTask: (taskId: number, mode: DispatchMode) => void;
  onConfirmDispatchTask: (taskId: number, mode: DispatchMode) => void;
  onCancelDispatchApproval: () => void;
  /** Delete the task, cascading cleanup across every agent's session state. */
  onDeleteTask?: (taskId: number) => Promise<void> | void;
  onEditSquad?: (
    squadId: string,
    payload: {
      name?: string;
      description?: string | null;
      iconEmoji?: string | null;
      color?: string | null;
      executionMode?: SquadExecutionMode | null;
    },
  ) => Promise<void> | void;
  onDeleteSquad?: (squadId: string) => Promise<void> | void;
};

/* ── Labels & helpers ── */

const MODE_LABEL: Record<string, string> = {
  leader: "Leader first",
  all: "All at once",
  manual: "Manual",
  workflow: "Workflow",
};

const DEFAULT_COLOR = "#22d3ee";

const normalize = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase();

const isActuallyRunningStatus = (s?: string | null) =>
  ["running", "dispatching", "processing", "in_progress"].includes(normalize(s));
const isQueuedStatus = (s?: string | null) =>
  ["pending", "queued"].includes(normalize(s));
const isAnyLiveStatus = (s?: string | null) =>
  isActuallyRunningStatus(s) || isQueuedStatus(s);
const isFailedStatus = (s?: string | null) =>
  ["failed", "error", "cancelled"].includes(normalize(s));

/** A run is "thinking" only when the back has actually dispatched it and
 *  is now waiting for the agent's reply. Pending/queued steps that
 *  haven't been triggered yet are NOT thinking — they are waiting their
 *  turn. This matters in workflow mode, where only one step at a time is
 *  ever actually active. */
const runIsThinking = (run: SquadTaskRun) => {
  const out = (run.outputText || "").trim();
  const err = (run.dispatchError || "").trim();
  if (out.length > 0 || err.length > 0) return false;
  return isActuallyRunningStatus(run.status);
};
const runIsQueued = (run: SquadTaskRun) => {
  const out = (run.outputText || "").trim();
  const err = (run.dispatchError || "").trim();
  if (out.length > 0 || err.length > 0) return false;
  return isQueuedStatus(run.status);
};
const runHasResponded = (run: SquadTaskRun) =>
  (run.outputText || "").trim().length > 0;
const runHasFailed = (run: SquadTaskRun) => {
  const err = (run.dispatchError || "").trim();
  if (err.length > 0) return true;
  return isFailedStatus(run.status);
};

const fmtDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
};

const relativeTime = (value: string | null | undefined): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(Math.max(diff, 0) / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(value);
};

/**
 * v113 — task completion duration label.
 *
 * The bridge dispatch (back v64) returns the agent's reply synchronously,
 * so completed tasks now have meaningful startedAt → finishedAt deltas
 * (typically a few seconds for a single agent). We surface that on the
 * task row as a small "8.5s" pill so the operator can read at a glance
 * how snappy the dispatch is. Returns "" for tasks that never started
 * or that haven't finished yet.
 */
const taskDurationLabel = (
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined,
): string => {
  if (!startedAt || !finishedAt) return "";
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
  const ms = Math.max(0, end - start);
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const min = Math.floor(s / 60);
  const restSec = Math.floor(s % 60);
  return restSec > 0 ? `${min}m ${restSec}s` : `${min}m`;
};

// v97 — `initialsOf` was retired in favour of <AgentAvatar />, which
// owns initials + multiavatar SVG fallback internally. Kept here only as
// a comment pointer in case future code wants the original helper back.

/* ── Chat timeline types ── */

type ChatBubble =
  | { id: string; kind: "user"; text: string; timestampMs: number; authorName: string | null }
  | {
      id: string;
      kind: "assistant";
      text: string;
      timestampMs: number;
      authorName: string;
      status: "ok" | "failed";
      errorText?: string | null;
      // v97 — optional avatar metadata so the bubble matches the agent's
      // identity in the squad chat / cron surfaces.
      avatarSeed?: string | null;
      avatarUrl?: string | null;
    }
  | {
      id: string;
      kind: "thinking";
      authorName: string;
      timestampMs: number;
      avatarSeed?: string | null;
      avatarUrl?: string | null;
    };

/* ── Component ── */

export function SquadOpsModal(props: SquadOpsModalProps) {
  const {
    open,
    squads,
    squad,
    selectedSquadId,
    tasks,
    selectedTask,
    loading,
    refreshingTask,
    createBusy,
    dispatchBusy,
    dispatchEstimate,
    dispatchEstimateBusy,
    dispatchApprovalMode,
    error,
    hooksConfigured,
    hooksMessage,
    availableModels,
    onClose,
    onRefresh,
    onSelectSquad,
    onSelectTask,
    onCreateTask,
    onPreviewDispatchTask,
    onConfirmDispatchTask,
    onCancelDispatchApproval,
    onDeleteTask,
  } = props;

  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  const [tab, setTab] = useState<"tasks" | "new">("tasks");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preferredModel, setPreferredModel] = useState("");
  // Allow overriding the squad's default execution mode for this specific task.
  const [taskExecutionMode, setTaskExecutionMode] = useState<SquadExecutionMode | "">("");

  // Lead context + attachments (backend v14 context_attachments feature).
  const [contextValue, setContextValue] = useState<LeadContextAttachmentsValue>({
    leadId: null,
    leadGenerationJobId: null,
    attachments: [],
  });
  const [contextLeads, setContextLeads] = useState<LeadSummary[]>([]);
  const [contextMissions, setContextMissions] = useState<LeadGenerationJob[]>([]);

  /* Reset on open / squad change */
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPrompt("");
    setPreferredModel("");
    setTaskExecutionMode("");
    setContextValue({ leadId: null, leadGenerationJobId: null, attachments: [] });
    setTab("tasks");
  }, [open, selectedSquadId]);

  // Lazy-load lead / mission options the first time the user opens the "new"
  // tab — avoids a list round-trip every time the sessions tab is loaded.
  useEffect(() => {
    const companyId = squad?.companyId ?? null;
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
        // Non-fatal — section simply shows no options.
      }
    };
    void loadContextOptions();
    return () => {
      cancelled = true;
    };
  }, [open, tab, squad?.companyId]);

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

  /* Auto-expand the selected task */
  useEffect(() => {
    if (selectedTask?.id) setExpandedId(selectedTask.id);
  }, [selectedTask?.id]);

  const color = squad?.color?.trim() || DEFAULT_COLOR;
  const iconEmoji = squad?.iconEmoji?.trim() || "🚀";
  const memberCount = squad?.members?.length ?? 0;

  // v97 — lookup so each bubble can render the agent's real avatar (or a
  // stable multiavatar fallback). Keyed by backendAgentId because that's
  // what SquadTaskRun carries.
  const memberAvatarLookup = useMemo(() => {
    const map = new Map<number, { gatewayAgentId: string | null; name: string }>();
    for (const m of squad?.members ?? []) {
      if (typeof m.backendAgentId === "number") {
        map.set(m.backendAgentId, {
          gatewayAgentId: m.gatewayAgentId,
          name: m.name,
        });
      }
    }
    return map;
  }, [squad?.members]);
  const activeMode = (squad?.executionMode ?? "leader") as SquadExecutionMode;
  const modeLabel = MODE_LABEL[activeMode] ?? activeMode;

  const runs = selectedTask?.runs ?? [];
  const thinkingAgents = useMemo(() => runs.filter(runIsThinking), [runs]);
  const queuedAgents = useMemo(() => runs.filter(runIsQueued), [runs]);
  const failedAgents = useMemo(() => runs.filter(runHasFailed), [runs]);
  const respondedAgents = useMemo(() => runs.filter(runHasResponded), [runs]);
  const hasAnyDispatched = runs.length > 0;

  // The squad task's execution mode (workflow / leader / all / manual).
  // This dictates whether a "leader synthesises last" indicator should
  // ever appear: workflow runs sequentially with no dedicated synthesis
  // pass, so the indicator stays hidden in that mode.
  // Named `selectedTaskMode` to avoid colliding with the new-task form's
  // `taskExecutionMode` state declared above.
  const selectedTaskMode = normalize(selectedTask?.executionMode ?? activeMode);
  // v114 — three flavors of "this mode has a leader":
  //
  //   • isParallelSynthesisMode (leader / all): members run together,
  //     leader synthesizes after. The steps strip lists MEMBERS only;
  //     the leader's reply is the highlighted "Squad final answer"
  //     section below.
  //   • isWorkflowMode: sequential chain; leader is typically the last
  //     step in the chain. The steps strip shows EVERY step in order
  //     (so the operator sees the cascade), AND we also pin the
  //     leader's reply at the bottom as the final answer (back v65
  //     guarantees task.finalResponse = leader's text in this mode).
  //   • manual: single run, no synthesis section.
  //
  // The two flags split the rendering responsibilities cleanly.
  const isParallelSynthesisMode =
    selectedTaskMode === "leader" || selectedTaskMode === "all" || selectedTaskMode === "all_at_once";
  const isWorkflowMode = selectedTaskMode === "workflow" || selectedTaskMode === "sequential";
  const hasFinalAnswerHighlight = isParallelSynthesisMode || isWorkflowMode;
  // Kept under the old name so existing render code below that filters
  // the steps strip ("members only") doesn't change behavior.
  const isLeaderSynthesisMode = isParallelSynthesisMode;

  // v45 — pull the leader run out of the roster so the modal can render its
  // synthesis distinctly. v114 — extended to workflow mode too: in workflow
  // the leader's reply is the final answer (back v65 enforces this).
  const leaderRun = useMemo(() => {
    if (!hasFinalAnswerHighlight) return null;
    const explicit = runs.find((r) => normalize(r.role) === "leader");
    if (explicit) return explicit;
    // For workflow mode, fall back to the last run in the chain — that's
    // the synthesis step in the typical squad config.
    if (isWorkflowMode && runs.length > 0) return runs[runs.length - 1];
    return runs[0] ?? null;
  }, [runs, hasFinalAnswerHighlight, isWorkflowMode]);
  const memberRuns = useMemo(
    // In workflow mode we DON'T filter the leader out of the steps strip —
    // the operator wants to see "step 1 → step 2 → leader" in order. The
    // strip still shows every run; the leader gets its second appearance
    // in the "Squad final answer" section below.
    () => isWorkflowMode
      ? runs
      : runs.filter((r) => !leaderRun || r.id !== leaderRun.id),
    [runs, leaderRun, isWorkflowMode],
  );
  const memberRunsAllTerminal = useMemo(
    () =>
      memberRuns.length > 0 &&
      memberRuns.every((r) =>
        ["completed", "failed", "cancelled", "skipped"].includes(normalize(r.status)),
      ),
    [memberRuns],
  );
  const leaderIsThinking = leaderRun ? runIsThinking(leaderRun) : false;
  const leaderIsResponded = leaderRun ? runHasResponded(leaderRun) : false;
  // Only show "Synthesising every member's reply…" when the leader has
  // actually been dispatched. While members are still running the leader
  // sits as pending/queued and we say so explicitly.
  const leaderIsWaitingForMembers =
    !!leaderRun &&
    !leaderIsResponded &&
    !runHasFailed(leaderRun) &&
    !memberRunsAllTerminal &&
    memberRuns.length > 0;

  /* Build a chat timeline from selectedTask.messages, falling back to
     synthesising from prompt + run outputs when messages haven't been
     persisted yet (identical intent to SquadChatPanel.timelineMessages). */
  const timeline = useMemo<ChatBubble[]>(() => {
    if (!selectedTask) return [];

    const fromMessages: ChatBubble[] = (selectedTask.messages ?? [])
      .filter((m) => (m.content ?? "").trim().length > 0 && normalize(m.role) !== "system")
      .map((m) => {
        const ts = m.createdDate ? new Date(m.createdDate).getTime() : 0;
        const role = normalize(m.role);
        if (role === "user") {
          return {
            id: `msg-${m.id}`,
            kind: "user",
            text: m.content,
            timestampMs: ts,
            authorName: m.authorName || null,
          } as ChatBubble;
        }
        const meta =
          typeof m.authorId === "number" ? memberAvatarLookup.get(m.authorId) : null;
        return {
          id: `msg-${m.id}`,
          kind: "assistant",
          text: m.content,
          timestampMs: ts,
          authorName: m.authorName || "Agent",
          status: "ok",
          avatarSeed: meta?.gatewayAgentId ?? m.authorName ?? `author-${m.authorId ?? "?"}`,
          avatarUrl: null,
        } as ChatBubble;
      });

    if (fromMessages.length > 0) {
      // Append live thinking placeholders for agents still working,
      // so the chat feels alive while responses stream in.
      const extra: ChatBubble[] = thinkingAgents.map((run) => {
        const meta = memberAvatarLookup.get(run.agentId);
        return {
          id: `thinking-${run.id}`,
          kind: "thinking",
          authorName: run.agentName || "Agent",
          timestampMs: Date.now(),
          avatarSeed: meta?.gatewayAgentId ?? run.agentName ?? `agent-${run.agentId}`,
          avatarUrl: null,
        } as ChatBubble;
      });
      return [...fromMessages.sort((a, b) => a.timestampMs - b.timestampMs), ...extra];
    }

    /* Synthetic fallback — no persisted messages yet */
    const synthetic: ChatBubble[] = [];
    const promptText = (selectedTask.prompt || "").trim();
    if (promptText) {
      synthetic.push({
        id: `prompt-${selectedTask.id}`,
        kind: "user",
        text: promptText,
        authorName: null,
        timestampMs: selectedTask.createdDate
          ? new Date(selectedTask.createdDate).getTime()
          : 0,
      });
    }

    for (const run of runs) {
      const out = (run.outputText || "").trim();
      const err = (run.dispatchError || "").trim();
      const meta = memberAvatarLookup.get(run.agentId);
      const avatarSeed = meta?.gatewayAgentId ?? run.agentName ?? `agent-${run.agentId}`;
      if (out.length > 0) {
        synthetic.push({
          id: `run-out-${run.id}`,
          kind: "assistant",
          text: out,
          authorName: run.agentName || "Agent",
          status: "ok",
          timestampMs: run.finishedAtUtc
            ? new Date(run.finishedAtUtc).getTime()
            : run.startedAtUtc
              ? new Date(run.startedAtUtc).getTime()
              : 0,
          avatarSeed,
          avatarUrl: null,
        });
      } else if (err.length > 0 || runHasFailed(run)) {
        synthetic.push({
          id: `run-err-${run.id}`,
          kind: "assistant",
          text: err || "This agent failed without a message.",
          authorName: run.agentName || "Agent",
          status: "failed",
          timestampMs: run.finishedAtUtc
            ? new Date(run.finishedAtUtc).getTime()
            : run.startedAtUtc
              ? new Date(run.startedAtUtc).getTime()
              : 0,
          errorText: err || null,
          avatarSeed,
          avatarUrl: null,
        });
      } else if (runIsThinking(run)) {
        synthetic.push({
          id: `thinking-${run.id}`,
          kind: "thinking",
          authorName: run.agentName || "Agent",
          timestampMs: Date.now(),
          avatarSeed,
          avatarUrl: null,
        });
      }
    }

    return synthetic;
  }, [selectedTask, runs, thinkingAgents, memberAvatarLookup]);

  if (!open) return null;

  /* ── Form validation ── */

  const canCreate = title.trim().length > 0 && prompt.trim().length > 0 && !createBusy;

  const primaryMode: DispatchMode = hasAnyDispatched ? "redispatchAll" : "pending";
  const primaryLabel = hasAnyDispatched ? "Run again" : "Send";
  const primaryIsConfirming = dispatchApprovalMode === primaryMode;

  /* ── Handlers ── */

  const handleCreate = () => {
    onCreateTask({
      title: title.trim(),
      prompt: prompt.trim(),
      preferredModel: preferredModel || null,
      executionMode: taskExecutionMode || null,
      leadId: contextValue.leadId,
      leadGenerationJobId: contextValue.leadGenerationJobId,
      attachments:
        contextValue.attachments.length > 0 ? contextValue.attachments : null,
    });
  };

  const handleTaskClick = (taskId: number) => {
    if (expandedId === taskId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(taskId);
    if (taskId !== selectedTask?.id) onSelectTask(taskId);
  };

  const handlePrimaryDispatch = () => {
    if (!selectedTask) return;
    if (dispatchApprovalMode === primaryMode) {
      onConfirmDispatchTask(selectedTask.id, primaryMode);
    } else {
      onPreviewDispatchTask(selectedTask.id, primaryMode);
    }
  };

  const handleRetryFailed = () => {
    if (!selectedTask || failedAgents.length === 0) return;
    if (dispatchApprovalMode === "retryFailed") {
      onConfirmDispatchTask(selectedTask.id, "retryFailed");
    } else {
      onPreviewDispatchTask(selectedTask.id, "retryFailed");
    }
  };

  const handleDeleteTask = async (taskId: number, taskTitle: string) => {
    if (!onDeleteTask) return;
    const label = taskTitle.trim() || `task #${taskId}`;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Delete ${label}? The conversation will be cleared from every agent associated with this task.`,
      )
    ) {
      return;
    }
    try {
      setDeletingTaskId(taskId);
      await onDeleteTask(taskId);
      if (expandedId === taskId) setExpandedId(null);
    } finally {
      setDeletingTaskId((prev) => (prev === taskId ? null : prev));
    }
  };

  /* ── Render ── */

  return (
    // v121 — outer overlay: smaller padding on mobile (12px) so the modal
    // gets the full viewport width on phones; touch-pan disabled on the
    // backdrop so swiping the task list inside doesn't dismiss the modal.
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      {/* v121 — responsive sizing.
          - <sm: 100vw × 100vh (modal fills the screen on phones).
          - sm:  92vw, capped at 1480 px for the desktop chat surface.
          Border colour stays tied to the squad colour so the operator
          always sees the brand framing. */}
      <section
        className="relative z-10 flex max-h-[100vh] w-full max-w-[1480px] flex-col overflow-hidden rounded-none border bg-[#0b0e14] shadow-[0_32px_120px_rgba(0,0,0,.72)] sm:max-h-[92vh] sm:rounded-2xl"
        style={{ borderColor: `${color}30`, width: "min(1480px, 100vw)" }}
      >
        {/* ── Header ──
            v121 — paddings collapse on mobile (px-4 py-3) and grow on
            sm+ (px-6 py-4). Title and subtitle truncate; refresh + close
            buttons never wrap. The "Bridge ready" badge from v113 was
            removed — operators don't need to see internal plumbing
            status in the title bar. */}
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg sm:h-12 sm:w-12 sm:text-xl"
            style={{ backgroundColor: `${color}20`, border: `1.5px solid ${color}50` }}
          >
            {iconEmoji}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold text-white sm:text-lg">
              {squad?.name ?? "Squad"}
            </h2>
            <p className="truncate text-[11px] text-white/45 sm:text-xs">
              {memberCount} member{memberCount !== 1 ? "s" : ""} · {modeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh"
            className="shrink-0 rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:p-2"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* ── Squad switcher (only when >1) ──
            v121 — same horizontal padding rhythm as the header. */}
        {squads.length > 1 && (
          <div className="border-b border-white/10 px-4 py-3 sm:px-6">
            <select
              value={selectedSquadId ?? ""}
              onChange={(event) => onSelectSquad(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/25"
            >
              {squads.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── Tabs ──
            v121 — slightly tighter (py-2.5) so the header + tabs combo
            doesn't eat 96px on mobile screens. Equal-weight columns,
            colored bottom-border on the active tab, count pill on
            "Sessions". The "New task" tab gets its own subtle accent
            when active too. */}
        <nav className="flex border-b border-white/10" role="tablist" aria-label="Squad ops tabs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "tasks"}
            onClick={() => setTab("tasks")}
            className={`flex-1 border-b-2 py-2.5 text-center text-xs font-medium tracking-wide transition sm:py-3 ${
              tab === "tasks" ? "text-white" : "border-transparent text-white/40 hover:text-white/60"
            }`}
            style={tab === "tasks" ? { borderColor: color } : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              Sessions
              <span
                className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                style={{ backgroundColor: `${color}25`, color }}
              >
                {tasks.length}
              </span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "new"}
            onClick={() => setTab("new")}
            className={`flex-1 border-b-2 py-2.5 text-center text-xs font-medium tracking-wide transition sm:py-3 ${
              tab === "new" ? "text-white" : "border-transparent text-white/40 hover:text-white/60"
            }`}
            style={tab === "new" ? { borderColor: color } : undefined}
          >
            New task
          </button>
        </nav>

        {/* ── Content ──
            v121 — paddings shrink on mobile (p-4) and grow on sm+ (p-6).
            Vertical scroll is the only one allowed; horizontal overflow
            wraps inside child cards instead of forcing the whole modal
            to scroll sideways. */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {!hooksConfigured && hooksMessage && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-6">{hooksMessage}</span>
            </div>
          )}

          {/* ── TASKS TAB ── */}
          {tab === "tasks" && (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
                  <div
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${color}15`, border: `1.5px solid ${color}30` }}
                  >
                    <Users2 className="h-5 w-5" style={{ color }} />
                  </div>
                  <div className="text-sm font-medium text-white">No sessions yet</div>
                  <div className="mt-1 text-xs text-white/35">
                    Start your first conversation with this squad.
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab("new")}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
                    style={{ backgroundColor: `${color}25`, border: `1px solid ${color}40` }}
                  >
                    <Plus className="h-4 w-4" />
                    New task
                  </button>
                  {/* v121 — internal "bridge wired" note removed.
                      The operator just needs to know they can dispatch
                      a new task; the wiring detail is plumbing. */}
                </div>
              ) : (
                tasks.map((task) => {
                  const expanded = expandedId === task.id;
                  const isActive = selectedTask?.id === task.id;
                  const activity = task.updatedDate || task.createdDate;
                  // v113 — task completion duration. Only computed when
                  // the task actually finished (startedAt + finishedAt
                  // both populated). Empty string elsewhere — no badge.
                  const taskStatus = normalize(task.status);
                  const taskIsDone =
                    taskStatus === "completed" || taskStatus === "failed";
                  const durationLabel = taskIsDone
                    ? taskDurationLabel(task.startedAtUtc, task.finishedAtUtc)
                    : "";
                  return (
                    <div
                      key={task.id}
                      className={`overflow-hidden rounded-xl border transition ${
                        expanded
                          ? "bg-white/[0.04]"
                          : "border-white/[0.06] bg-transparent hover:border-white/12 hover:bg-white/[0.03]"
                      }`}
                      style={expanded ? { borderColor: `${color}40` } : undefined}
                    >
                      {/* ── Row ── */}
                      <button
                        type="button"
                        onClick={() => handleTaskClick(task.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <span className="text-white/30">
                          {expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">
                            {task.title || `Task #${task.id}`}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/35">
                            <MessageSquare className="h-3 w-3" />
                            <span>
                              {task.runCount} {task.runCount === 1 ? "agent" : "agents"}
                            </span>
                            {activity && (
                              <>
                                <span className="text-white/20">·</span>
                                <span>{relativeTime(activity)}</span>
                              </>
                            )}
                            {/* v113 — completion duration pill. Only shows
                                for done/failed tasks with both timestamps
                                populated. Helps the operator see at a
                                glance how snappy the bridge dispatch is. */}
                            {durationLabel && (
                              <>
                                <span className="text-white/20">·</span>
                                <span
                                  className={
                                    taskStatus === "failed"
                                      ? "rounded-full bg-rose-500/10 px-1.5 py-px font-mono text-[10px] tracking-wider text-rose-200/80"
                                      : "rounded-full bg-emerald-500/10 px-1.5 py-px font-mono text-[10px] tracking-wider text-emerald-200/80"
                                  }
                                  title={
                                    taskStatus === "failed"
                                      ? "Time spent before failing"
                                      : "Total dispatch time (start → reply)"
                                  }
                                >
                                  {durationLabel}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Live thinking pill — only when we actually know */}
                        {expanded && isActive && thinkingAgents.length > 0 && (
                          <span
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                            style={{ borderColor: `${color}40`, backgroundColor: `${color}15`, color }}
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            {thinkingAgents.length === 1
                              ? "1 thinking"
                              : `${thinkingAgents.length} thinking`}
                          </span>
                        )}
                        {/* Failed pill — only useful long-lived signal */}
                        {expanded && isActive && thinkingAgents.length === 0 && failedAgents.length > 0 && (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-200">
                            {failedAgents.length} failed
                          </span>
                        )}
                      </button>

                      {/* ── Expanded: chat-like session view ── */}
                      {expanded && isActive && selectedTask && (
                        <div className="border-t border-white/10 px-4 pb-4 pt-3">
                          {refreshingTask && (
                            <div className="mb-3 flex items-center gap-2 text-[11px] text-white/40">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Syncing latest replies…
                            </div>
                          )}

                          {/* v47 — Per-step progress strip. Each agent shows
                              its current state (waiting → thinking → done /
                              failed). In workflow / sequential mode only one
                              step is "thinking" at any moment; the others
                              show as queued so the operator sees the order
                              the squad will execute in. */}
                          {runs.length > 0 && (
                            <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                              <div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-white/40">
                                <span>{isLeaderSynthesisMode ? "Members" : "Steps"}</span>
                                <span>
                                  {
                                    runs.filter((r) =>
                                      ["completed", "failed", "cancelled", "skipped"].includes(
                                        normalize(r.status),
                                      ),
                                    ).length
                                  }
                                  /{runs.length} done
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {(isLeaderSynthesisMode ? memberRuns : runs).map((r, idx) => {
                                  const s = normalize(r.status);
                                  const isDone = s === "completed";
                                  const isFail = ["failed", "cancelled"].includes(s);
                                  const isLiveNow = isActuallyRunningStatus(s);
                                  const isQueued = isQueuedStatus(s);
                                  const bg = isDone
                                    ? `${color}25`
                                    : isFail
                                      ? "rgba(239,68,68,.18)"
                                      : isLiveNow
                                        ? `${color}15`
                                        : isQueued
                                          ? "rgba(255,255,255,.04)"
                                          : "rgba(255,255,255,.04)";
                                  const border = isDone
                                    ? `${color}55`
                                    : isFail
                                      ? "rgba(239,68,68,.4)"
                                      : isLiveNow
                                        ? `${color}55`
                                        : isQueued
                                          ? "rgba(255,255,255,.1)"
                                          : "rgba(255,255,255,.1)";
                                  const txt = isDone
                                    ? color
                                    : isFail
                                      ? "#fca5a5"
                                      : isLiveNow
                                        ? color
                                        : "rgba(255,255,255,.5)";
                                  const stateLabel = isDone
                                    ? "✓"
                                    : isFail
                                      ? "✕"
                                      : isLiveNow
                                        ? "thinking"
                                        : isQueued
                                          ? "queued"
                                          : "";
                                  // Workflow ordering: prefix each pill with
                                  // its 1-based step number so the operator
                                  // sees the cascade order at a glance.
                                  const stepNum = !isLeaderSynthesisMode ? `${idx + 1}.` : "";
                                  return (
                                    <span
                                      key={r.id}
                                      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                                      style={{ backgroundColor: bg, borderColor: border, color: txt }}
                                      title={`${stepNum} ${r.agentName || "Agent"} · ${r.status}`}
                                    >
                                      {isLiveNow && (
                                        <span
                                          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                                          style={{ backgroundColor: txt }}
                                        />
                                      )}
                                      {stepNum && <span className="opacity-50">{stepNum}</span>}
                                      <span className="truncate max-w-[140px]">
                                        {r.agentName || `Agent #${r.agentId}`}
                                      </span>
                                      <span className="opacity-60">{stateLabel}</span>
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Leader synthesis indicator — only relevant
                                  when the squad's execution mode actually has
                                  a synthesis pass (leader / all). Workflow
                                  has no separate synthesis — the leader's
                                  step is just another sequential step. */}
                              {leaderRun && isLeaderSynthesisMode && (
                                <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-2">
                                  <span
                                    className="inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[10px] font-bold uppercase tracking-wider"
                                    style={{
                                      borderColor: `${color}40`,
                                      backgroundColor: `${color}15`,
                                      color,
                                    }}
                                  >
                                    Leader · {leaderRun.agentName || "Lead"}
                                  </span>
                                  {leaderIsResponded ? (
                                    <span className="text-[11px] text-white/55">
                                      Final synthesis delivered.
                                    </span>
                                  ) : runHasFailed(leaderRun) ? (
                                    <span className="text-[11px] text-red-200/85">
                                      Leader failed — see chat below.
                                    </span>
                                  ) : leaderIsThinking ? (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/55">
                                      <Loader2 className="h-3 w-3 animate-spin" style={{ color }} />
                                      Synthesising every member&rsquo;s reply…
                                    </span>
                                  ) : leaderIsWaitingForMembers ? (
                                    <span className="text-[11px] text-white/55">
                                      Waiting for members to finish before synthesising.
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-white/40">
                                      Pending.
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Timeline — chat bubbles */}
                          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                            {timeline.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-white/35">
                                Opening session…
                              </div>
                            ) : (
                              timeline.map((bubble) =>
                                bubble.kind === "user" ? (
                                  <UserBubble
                                    key={bubble.id}
                                    text={bubble.text}
                                    when={bubble.timestampMs}
                                    color={color}
                                  />
                                ) : bubble.kind === "thinking" ? (
                                  <ThinkingBubble
                                    key={bubble.id}
                                    author={bubble.authorName}
                                    color={color}
                                    avatarSeed={bubble.avatarSeed}
                                    avatarUrl={bubble.avatarUrl}
                                  />
                                ) : (
                                  <AgentBubble
                                    key={bubble.id}
                                    author={bubble.authorName}
                                    text={bubble.text}
                                    when={bubble.timestampMs}
                                    failed={bubble.status === "failed"}
                                    color={color}
                                    avatarSeed={bubble.avatarSeed}
                                    avatarUrl={bubble.avatarUrl}
                                  />
                                ),
                              )
                            )}
                          </div>

                          {/* v45 — Leader synthesis card. Once the leader has
                              produced its synthesis, surface it as the squad's
                              authoritative answer, separated from the
                              chronological chat above.
                              v114 — also rendered in workflow mode (the
                              leader's reply is the final answer of the chain;
                              back v65 pins task.finalResponse to it). The
                              caption changes depending on mode. */}
                          {leaderRun && leaderIsResponded && hasFinalAnswerHighlight && (
                            <div
                              className="mt-4 overflow-hidden rounded-xl border"
                              style={{
                                borderColor: `${color}55`,
                                backgroundColor: `${color}0d`,
                              }}
                            >
                              <div
                                className="flex items-center justify-between gap-2 border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                                style={{ borderColor: `${color}22`, color }}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <Zap className="h-3.5 w-3.5" />
                                  Squad final answer · {leaderRun.agentName || "Lead"}
                                </span>
                                <span className="text-[10px] text-white/45">
                                  {isWorkflowMode
                                    ? `Workflow · ${runs.length} step${runs.length === 1 ? "" : "s"}`
                                    : `${memberRuns.length} member${memberRuns.length === 1 ? "" : "s"} synthesised`}
                                </span>
                              </div>
                              <div className="agent-markdown break-words px-4 py-3 text-sm leading-6 text-white/90">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                                  {(leaderRun.outputText || "").trim()}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {/* Error */}
                          {error && (
                            <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                              {error}
                            </div>
                          )}

                          {/* Estimate preview */}
                          {dispatchApprovalMode && (dispatchEstimate || dispatchEstimateBusy) && (
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/70">
                              <span>
                                {dispatchEstimateBusy
                                  ? "Estimating…"
                                  : `${dispatchEstimate?.selectedRuns ?? 0} agent(s) · ~${
                                      dispatchEstimate?.estimatedTotalTokens ?? 0
                                    } tokens`}
                              </span>
                              <button
                                type="button"
                                onClick={onCancelDispatchApproval}
                                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {/* Footer actions: run-again / retry-failed */}
                          {hooksConfigured && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                              <button
                                type="button"
                                disabled={dispatchBusy}
                                onClick={handlePrimaryDispatch}
                                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                                style={{
                                  backgroundColor: `${color}30`,
                                  border: `1px solid ${color}50`,
                                }}
                              >
                                {dispatchBusy && primaryIsConfirming ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                                {primaryIsConfirming ? "Confirm" : primaryLabel}
                              </button>
                              {failedAgents.length > 0 && (
                                <button
                                  type="button"
                                  disabled={dispatchBusy}
                                  onClick={handleRetryFailed}
                                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {dispatchBusy && dispatchApprovalMode === "retryFailed" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCcw className="h-4 w-4" />
                                  )}
                                  {dispatchApprovalMode === "retryFailed"
                                    ? "Confirm retry"
                                    : `Retry ${failedAgents.length} failed`}
                                </button>
                              )}
                              <span className="ml-auto text-[10px] text-white/30">
                                {respondedAgents.length}/{runs.length || memberCount} replied
                              </span>
                              {onDeleteTask ? (
                                <button
                                  type="button"
                                  disabled={deletingTaskId === task.id || dispatchBusy}
                                  onClick={() => void handleDeleteTask(task.id, task.title ?? "")}
                                  title="Delete this task and clear it from every agent"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-200 transition hover:bg-red-500/15 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deletingTaskId === task.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                  Delete task
                                </button>
                              ) : null}
                            </div>
                          )}
                          {/* When hooks are not configured, still expose delete so stale sessions
                              can be cleaned up from the UI. */}
                          {!hooksConfigured && onDeleteTask ? (
                            <div className="mt-3 flex justify-end border-t border-white/5 pt-3">
                              <button
                                type="button"
                                disabled={deletingTaskId === task.id}
                                onClick={() => void handleDeleteTask(task.id, task.title ?? "")}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-200 transition hover:bg-red-500/15 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingTaskId === task.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                Delete task
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── NEW TASK TAB ── */}
          {tab === "new" && (
            <div className="space-y-5">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/45">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short task name"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/45">
                  Execution mode{" "}
                  <span className="normal-case text-white/25">
                    (override for this task)
                  </span>
                </label>
                <select
                  value={taskExecutionMode}
                  onChange={(e) =>
                    setTaskExecutionMode(
                      (e.target.value as SquadExecutionMode | "") ?? "",
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
                >
                  <option value="">
                    Use squad default ({MODE_LABEL[activeMode] ?? activeMode})
                  </option>
                  <option value="leader">Leader first</option>
                  <option value="all">All at once</option>
                  <option value="workflow">Workflow</option>
                  <option value="manual">Manual</option>
                </select>
                <p className="mt-2 text-[11px] text-white/35">
                  Leader first runs the squad leader before delegating.
                  All at once dispatches every member in parallel.
                  Workflow follows the squad&rsquo;s step order. Manual only
                  primes the session so you can dispatch by hand later.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/45">
                  Model <span className="normal-case text-white/25">(optional)</span>
                </label>
                <select
                  value={preferredModel}
                  onChange={(e) => setPreferredModel(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
                >
                  <option value="">Default model</option>
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/45">
                  Instructions
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what this squad should do."
                  rows={6}
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
                />
              </div>

              <LeadContextAttachmentsSection
                value={contextValue}
                onChange={setContextValue}
                leadOptions={leadOptions}
                missionOptions={missionOptions}
                accent="cyan"
                disabled={createBusy}
                description="Pin a lead or full mission so every agent on this task sees the same frozen briefing, and drop up to 6 files (15MB each, 25MB total) the squad can open at runtime."
              />

              {/* Preview card, same feel as SquadCreateModal */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/35">
                  Preview
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${color}20`, border: `1.5px solid ${color}50` }}
                  >
                    {iconEmoji}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {title.trim() || "Untitled task"}
                    </div>
                    <div className="text-[11px] text-white/40">
                      {squad?.name ?? "Squad"} ·{" "}
                      {MODE_LABEL[taskExecutionMode || activeMode] ??
                        (taskExecutionMode || activeMode)}
                      {taskExecutionMode && taskExecutionMode !== activeMode ? (
                        <span className="ml-1 text-white/25">(task override)</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ──
            v121 — same px/py rhythm as the header. Buttons keep their
            full text on sm+ but truncate to icons-only on very narrow
            phones via responsive utility classes. */}
        <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/65 transition hover:bg-white/10 hover:text-white sm:px-4"
          >
            Close
          </button>

          {tab === "new" ? (
            <button
              type="button"
              disabled={!canCreate}
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
              style={{ backgroundColor: `${color}30`, border: `1px solid ${color}50` }}
            >
              <Zap className="h-4 w-4" />
              <span className="whitespace-nowrap">{createBusy ? "Creating…" : "Create task"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setTab("new")}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition sm:px-4"
              style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
            >
              <Plus className="h-4 w-4" />
              <span className="whitespace-nowrap">New task</span>
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

/* ── Chat bubble sub-components ── */

function UserBubble({ text, when, color }: { text: string; when: number; color: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%]">
        <div
          className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-6 text-white/90"
          style={{ backgroundColor: `${color}18`, border: `1px solid ${color}35` }}
        >
          {/* User-typed prompts render as plain text (no markdown) so an
              accidental `#` in the prompt doesn't become a heading. */}
          <div className="whitespace-pre-wrap break-words">{text}</div>
        </div>
        <div className="mt-1 text-right text-[10px] text-white/25">
          {relativeTime(when ? new Date(when).toISOString() : null) || "—"}
        </div>
      </div>
    </div>
  );
}

function AgentBubble({
  author,
  text,
  when,
  failed,
  color,
  avatarSeed,
  avatarUrl,
}: {
  author: string;
  text: string;
  when: number;
  failed: boolean;
  color: string;
  /** v97 — stable seed so the multiavatar fallback matches the agent's
   *  identity in the squad chat / cron surfaces. */
  avatarSeed?: string | null;
  /** v97 — real photo URL when the agent has one. */
  avatarUrl?: string | null;
}) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="mt-0.5 shrink-0 rounded-full"
        style={{
          boxShadow: failed
            ? "0 0 0 1.5px rgba(239,68,68,.45)"
            : `0 0 0 1px ${color}45`,
        }}
        title={author}
      >
        <AgentAvatar
          seed={(avatarSeed ?? author ?? "agent").toString()}
          name={author}
          avatarUrl={avatarUrl ?? null}
          size={28}
        />
      </div>
      <div className="min-w-0 max-w-[88%] flex-1">
        <div className="mb-1 flex items-center gap-2 text-[11px]">
          <span className="font-medium text-white/70">{author}</span>
          {failed && (
            <span className="rounded-full border border-red-400/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-red-200">
              failed
            </span>
          )}
        </div>
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-6 ${
            failed
              ? "border border-red-400/25 bg-red-500/10 text-red-100/90"
              : "border border-white/10 bg-white/[0.03] text-white/82"
          }`}
        >
          <div className="agent-markdown break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
              {text}
            </ReactMarkdown>
          </div>
        </div>
        <div className="mt-1 text-[10px] text-white/25">
          {relativeTime(when ? new Date(when).toISOString() : null) || ""}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble({
  author,
  color,
  avatarSeed,
  avatarUrl,
}: {
  author: string;
  color: string;
  avatarSeed?: string | null;
  avatarUrl?: string | null;
}) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="mt-0.5 shrink-0 rounded-full"
        style={{ boxShadow: `0 0 0 1px ${color}45` }}
        title={author}
      >
        <AgentAvatar
          seed={(avatarSeed ?? author ?? "agent").toString()}
          name={author}
          avatarUrl={avatarUrl ?? null}
          size={28}
        />
      </div>
      <div className="min-w-0 max-w-[88%] flex-1">
        <div className="mb-1 text-[11px] font-medium text-white/70">{author}</div>
        <div
          className="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm border px-4 py-3 text-sm"
          style={{ borderColor: `${color}30`, backgroundColor: `${color}08`, color }}
        >
          <span className="inline-flex gap-1">
            <span
              className="inline-block h-1.5 w-1.5 animate-bounce rounded-full"
              style={{ backgroundColor: color, animationDelay: "0ms" }}
            />
            <span
              className="inline-block h-1.5 w-1.5 animate-bounce rounded-full"
              style={{ backgroundColor: color, animationDelay: "150ms" }}
            />
            <span
              className="inline-block h-1.5 w-1.5 animate-bounce rounded-full"
              style={{ backgroundColor: color, animationDelay: "300ms" }}
            />
          </span>
          <span className="text-[12px] opacity-80">thinking…</span>
        </div>
      </div>
    </div>
  );
}
