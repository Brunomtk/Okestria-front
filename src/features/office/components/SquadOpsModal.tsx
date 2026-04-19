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
  Users2,
  X,
  Zap,
} from "lucide-react";
import type {
  SquadExecutionMode,
  SquadSummary,
  SquadTask,
  SquadTaskDispatchEstimate,
  SquadTaskRun,
  SquadTaskSummary,
} from "@/lib/squads/api";
import type { GatewayModelChoice } from "@/lib/gateway/models";

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
  onCreateTask: (payload: { title: string; prompt: string; preferredModel: string | null }) => void;
  onPreviewDispatchTask: (taskId: number, mode: DispatchMode) => void;
  onConfirmDispatchTask: (taskId: number, mode: DispatchMode) => void;
  onCancelDispatchApproval: () => void;
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

const isRunningStatus = (s?: string | null) =>
  ["running", "queued", "pending", "dispatching", "processing", "in_progress"].includes(
    normalize(s),
  );
const isFailedStatus = (s?: string | null) =>
  ["failed", "error", "cancelled"].includes(normalize(s));

/** A run is "thinking" when it has been dispatched but hasn't produced
 *  any output or error yet. This is what we actually care about for UI
 *  feedback — the raw task.status keeps saying "running" even after
 *  every agent already answered, which is useless for the user. */
const runIsThinking = (run: SquadTaskRun) => {
  const out = (run.outputText || "").trim();
  const err = (run.dispatchError || "").trim();
  if (out.length > 0 || err.length > 0) return false;
  return isRunningStatus(run.status);
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

/** Initials from an agent / author name, for the chat bubble avatar. */
const initialsOf = (name: string | null | undefined) => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ── Chat timeline types ── */

type ChatBubble =
  | { id: string; kind: "user"; text: string; timestampMs: number; authorName: string | null }
  | { id: string; kind: "assistant"; text: string; timestampMs: number; authorName: string; status: "ok" | "failed"; errorText?: string | null }
  | { id: string; kind: "thinking"; authorName: string; timestampMs: number };

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
  } = props;

  const [tab, setTab] = useState<"tasks" | "new">("tasks");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preferredModel, setPreferredModel] = useState("");

  /* Reset on open / squad change */
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPrompt("");
    setPreferredModel("");
    setTab("tasks");
  }, [open, selectedSquadId]);

  /* Auto-expand the selected task */
  useEffect(() => {
    if (selectedTask?.id) setExpandedId(selectedTask.id);
  }, [selectedTask?.id]);

  const color = squad?.color?.trim() || DEFAULT_COLOR;
  const iconEmoji = squad?.iconEmoji?.trim() || "🚀";
  const memberCount = squad?.members?.length ?? 0;
  const activeMode = (squad?.executionMode ?? "leader") as SquadExecutionMode;
  const modeLabel = MODE_LABEL[activeMode] ?? activeMode;

  const runs = selectedTask?.runs ?? [];
  const thinkingAgents = useMemo(() => runs.filter(runIsThinking), [runs]);
  const failedAgents = useMemo(() => runs.filter(runHasFailed), [runs]);
  const respondedAgents = useMemo(() => runs.filter(runHasResponded), [runs]);
  const hasAnyDispatched = runs.length > 0;

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
        return {
          id: `msg-${m.id}`,
          kind: "assistant",
          text: m.content,
          timestampMs: ts,
          authorName: m.authorName || "Agent",
          status: "ok",
        } as ChatBubble;
      });

    if (fromMessages.length > 0) {
      // Append live thinking placeholders for agents still working,
      // so the chat feels alive while responses stream in.
      const extra: ChatBubble[] = thinkingAgents.map((run) => ({
        id: `thinking-${run.id}`,
        kind: "thinking",
        authorName: run.agentName || "Agent",
        timestampMs: Date.now(),
      }));
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
        });
      } else if (runIsThinking(run)) {
        synthetic.push({
          id: `thinking-${run.id}`,
          kind: "thinking",
          authorName: run.agentName || "Agent",
          timestampMs: Date.now(),
        });
      }
    }

    return synthetic;
  }, [selectedTask, runs, thinkingAgents]);

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

  /* ── Render ── */

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-[#0b0e14] shadow-[0_32px_120px_rgba(0,0,0,.72)]"
        style={{ borderColor: `${color}30` }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: `${color}20`, border: `1.5px solid ${color}50` }}
          >
            {iconEmoji}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-white">
              {squad?.name ?? "Squad"}
            </h2>
            <p className="text-xs text-white/40">
              {memberCount} member{memberCount !== 1 ? "s" : ""} · {modeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
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

        {/* ── Squad switcher (only when >1) ── */}
        {squads.length > 1 && (
          <div className="border-b border-white/10 px-6 py-3">
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

        {/* ── Tabs ── */}
        <div className="flex border-b border-white/10">
          <button
            type="button"
            onClick={() => setTab("tasks")}
            className={`flex-1 py-3 text-center text-xs font-medium tracking-wide transition ${
              tab === "tasks" ? "border-b-2 text-white" : "text-white/40 hover:text-white/60"
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
            onClick={() => setTab("new")}
            className={`flex-1 py-3 text-center text-xs font-medium tracking-wide transition ${
              tab === "new" ? "border-b-2 text-white" : "text-white/40 hover:text-white/60"
            }`}
            style={tab === "new" ? { borderColor: color } : undefined}
          >
            New task
          </button>
        </div>

        {/* ── Content ── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
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
                </div>
              ) : (
                tasks.map((task) => {
                  const expanded = expandedId === task.id;
                  const isActive = selectedTask?.id === task.id;
                  const activity = task.updatedDate || task.createdDate;
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
                                  />
                                ) : (
                                  <AgentBubble
                                    key={bubble.id}
                                    author={bubble.authorName}
                                    text={bubble.text}
                                    when={bubble.timestampMs}
                                    failed={bubble.status === "failed"}
                                    color={color}
                                  />
                                ),
                              )
                            )}
                          </div>

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
                            </div>
                          )}
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
                      {squad?.name ?? "Squad"} · {modeLabel}
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

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>

          {tab === "new" ? (
            <button
              type="button"
              disabled={!canCreate}
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: `${color}30`, border: `1px solid ${color}50` }}
            >
              <Zap className="h-4 w-4" />
              {createBusy ? "Creating…" : "Create task"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setTab("new")}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
              style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
            >
              <Plus className="h-4 w-4" />
              New task
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── Chat bubble sub-components ── */

function UserBubble({ text, when, color }: { text: string; when: number; color: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%]">
        <div
          className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-6 text-white/90"
          style={{ backgroundColor: `${color}18`, border: `1px solid ${color}35` }}
        >
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
}: {
  author: string;
  text: string;
  when: number;
  failed: boolean;
  color: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase"
        style={{
          backgroundColor: failed ? "rgba(239,68,68,.15)" : `${color}20`,
          color: failed ? "#fca5a5" : color,
          border: failed ? "1px solid rgba(239,68,68,.35)" : `1px solid ${color}45`,
        }}
      >
        {initialsOf(author)}
      </div>
      <div className="min-w-0 max-w-[82%] flex-1">
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
          <div className="whitespace-pre-wrap break-words">{text}</div>
        </div>
        <div className="mt-1 text-[10px] text-white/25">
          {relativeTime(when ? new Date(when).toISOString() : null) || ""}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble({ author, color }: { author: string; color: string }) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase"
        style={{
          backgroundColor: `${color}20`,
          color,
          border: `1px solid ${color}45`,
        }}
      >
        {initialsOf(author)}
      </div>
      <div className="min-w-0 max-w-[82%] flex-1">
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
