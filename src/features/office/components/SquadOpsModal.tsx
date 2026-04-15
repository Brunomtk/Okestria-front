import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Play,
  RefreshCcw,
  Rocket,
  Send,
  Users2,
  XCircle,
  Zap,
} from "lucide-react";
import type { SquadSummary, SquadTask, SquadTaskDispatchEstimate, SquadTaskSummary } from "@/lib/squads/api";
import type { GatewayModelChoice } from "@/lib/gateway/models";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
  dispatchApprovalMode: "pending" | "retryFailed" | "redispatchAll" | null;
  error: string | null;
  hooksConfigured: boolean;
  hooksMessage: string | null;
  availableModels: GatewayModelChoice[];
  onClose: () => void;
  onRefresh: () => void;
  onSelectSquad: (squadId: string) => void;
  onSelectTask: (taskId: number) => void;
  onCreateTask: (payload: { title: string; prompt: string; preferredModel: string | null }) => void;
  onPreviewDispatchTask: (taskId: number, mode: "pending" | "retryFailed" | "redispatchAll") => void;
  onConfirmDispatchTask: (taskId: number, mode: "pending" | "retryFailed" | "redispatchAll") => void;
  onCancelDispatchApproval: () => void;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const normalizeStatus = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

const statusTone = (status: string | null | undefined) => {
  const n = normalizeStatus(status);
  if (["completed", "success", "done"].includes(n)) return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  if (["failed", "error", "cancelled"].includes(n)) return "border-red-400/20 bg-red-500/10 text-red-100";
  if (["running", "dispatching", "processing", "inprogress", "in_progress"].includes(n)) return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
  return "border-white/10 bg-white/5 text-white/70";
};

const statusIcon = (status: string | null | undefined) => {
  const n = normalizeStatus(status);
  if (["completed", "success", "done"].includes(n)) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (["failed", "error", "cancelled"].includes(n)) return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  if (["running", "dispatching", "processing", "inprogress", "in_progress"].includes(n)) return <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />;
  return <Clock3 className="h-3.5 w-3.5 text-white/40" />;
};

const statusLabel = (status: string | null | undefined) => {
  const n = normalizeStatus(status);
  if (!n) return "Draft";
  return n.charAt(0).toUpperCase() + n.slice(1).replace(/_/g, " ");
};

const modeLabel = (mode: string | null | undefined) => {
  const n = (mode ?? "leader").trim();
  if (!n) return "Leader";
  return n.charAt(0).toUpperCase() + n.slice(1).replace(/([a-z])([A-Z])/g, "$1 $2");
};

const dispatchModeLabel = (mode: "pending" | "retryFailed" | "redispatchAll" | null) => {
  if (mode === "pending") return "Dispatch pending runs";
  if (mode === "retryFailed") return "Retry failed runs";
  if (mode === "redispatchAll") return "Redispatch all runs";
  return "Dispatch runs";
};

const SkeletonLoader = () => (
  <div className="flex flex-col gap-3 p-4">
    <div className="h-4 w-24 rounded-lg bg-gradient-to-r from-white/5 to-white/10 animate-pulse" />
    <div className="h-3 w-full rounded-lg bg-gradient-to-r from-white/5 to-white/10 animate-pulse" />
    <div className="h-3 w-5/6 rounded-lg bg-gradient-to-r from-white/5 to-white/10 animate-pulse" />
  </div>
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SquadOpsModal({
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
}: SquadOpsModalProps) {
  const [tab, setTab] = useState<"create" | "tasks">("tasks");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preferredModel, setPreferredModel] = useState("");
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPrompt("");
    setPreferredModel("");
    setShowModelSelect(false);
    setErrorDismissed(false);
    setTab(tasks.length > 0 ? "tasks" : "create");
  }, [open, squad?.id]);

  // Switch to tasks tab when tasks arrive
  useEffect(() => {
    if (tasks.length > 0 && tab === "create" && !title && !prompt) {
      setTab("tasks");
    }
  }, [tasks.length]);

  const submitDisabled = createBusy || !title.trim() || !prompt.trim() || !selectedSquadId;
  const dispatchDisabled = dispatchBusy || !hooksConfigured;

  const runSummary = useMemo(() => {
    const runs = selectedTask?.runs ?? [];
    return {
      total: runs.length,
      running: runs.filter((r) => ["running", "dispatching", "processing", "in_progress"].includes(normalizeStatus(r.status))).length,
      completed: runs.filter((r) => ["completed", "success", "done"].includes(normalizeStatus(r.status))).length,
      failed: runs.filter((r) => ["failed", "error", "cancelled"].includes(normalizeStatus(r.status))).length,
    };
  }, [selectedTask]);

  if (!open) return null;

  const hasSquads = squads.length > 0;

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <section className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#07090c] shadow-[0_40px_140px_rgba(0,0,0,0.78)]">
        {/* ---- HEADER ---- */}
        <header className="border-b border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 text-cyan-300 shadow-lg shadow-cyan-500/10">
                <Zap className="h-5.5 w-5.5" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-400/60">Squad Ops</div>
                <div className="flex items-center gap-2 mt-1">
                  {hasSquads ? (
                    <select
                      value={selectedSquadId ?? ""}
                      onChange={(e) => onSelectSquad(e.target.value)}
                      className="max-w-[280px] truncate rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5 text-sm font-bold text-cyan-100 outline-none transition focus:border-cyan-400/40 focus:bg-cyan-500/10"
                    >
                      <option value="" className="bg-[#07090c]">Select a squad</option>
                      {squads.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#07090c]">{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm font-semibold text-white/40">No squads available</span>
                  )}
                  {squad && (
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/8 px-2.5 py-0.5 text-[10px] font-medium text-cyan-200">
                      {squad.members.length} members • {modeLabel(squad.executionMode)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
                title="Refresh"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>

          {/* Hooks status banner */}
          {hooksMessage && (
            <div className={`mt-4 rounded-lg border px-4 py-2.5 text-xs leading-5 font-medium ${
              hooksConfigured
                ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-200"
                : "border-amber-500/20 bg-amber-500/8 text-amber-200"
            }`}>
              {hooksMessage}
            </div>
          )}

          {/* Tabs */}
          {selectedSquadId && (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTab("tasks")}
                className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
                  tab === "tasks"
                    ? "bg-cyan-500/15 text-cyan-100 border border-cyan-500/30"
                    : "text-white/50 border border-transparent hover:bg-white/5 hover:text-white/70"
                }`}
              >
                Tasks ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("create")}
                className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
                  tab === "create"
                    ? "bg-cyan-500/15 text-cyan-100 border border-cyan-500/30"
                    : "text-white/50 border border-transparent hover:bg-white/5 hover:text-white/70"
                }`}
              >
                + New task
              </button>
            </div>
          )}
        </header>

        {/* ---- BODY ---- */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* No squad selected */}
          {!selectedSquadId && (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center px-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
                <Users2 className="h-8 w-8 text-cyan-300/70" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">Select a squad to get started</h3>
              <p className="mt-3 max-w-md text-sm text-white/50 leading-relaxed">
                Choose a squad from the dropdown above to create tasks, dispatch agent runs, and review detailed results.
              </p>
            </div>
          )}

          {/* =========== CREATE TAB =========== */}
          {selectedSquadId && tab === "create" && (
            <div className="mx-auto max-w-2xl p-8">
              {/* Illustration */}
              <div className="mb-8 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
                  <Rocket className="h-10 w-10 text-cyan-300" />
                </div>
              </div>

              <div className="mb-8 text-center">
                <h3 className="text-xl font-bold text-white">Create a new task</h3>
                <p className="mt-2 text-sm text-white/50">
                  Describe what the squad should do. The task will be sent according to the squad's execution mode.
                </p>
              </div>

              <div className="space-y-6">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-cyan-300/70">Task title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Review the landing page and suggest improvements"
                    className="mt-2.5 w-full rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-5 py-3.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-cyan-400/40 focus:bg-cyan-500/10"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-cyan-300/70">Instructions</span>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Explain the goal, expected output, tone, constraints, and who should focus on what."
                    rows={7}
                    className="mt-2.5 w-full resize-none rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-5 py-3.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-cyan-400/40 focus:bg-cyan-500/10"
                  />
                </label>

                {/* Collapsible model select */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <button
                    type="button"
                    onClick={() => setShowModelSelect(!showModelSelect)}
                    className="flex w-full items-center justify-between py-1 text-sm font-medium text-cyan-300/80 transition hover:text-cyan-200"
                  >
                    <span className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full bg-cyan-400/40 transition-transform ${showModelSelect ? "rotate-45" : ""}`} />
                      Advanced: override AI model
                    </span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${showModelSelect ? "rotate-90" : ""}`} />
                  </button>
                  {showModelSelect && (
                    <select
                      value={preferredModel}
                      onChange={(e) => setPreferredModel(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/40"
                    >
                      <option value="" className="bg-[#07090c]">Use squad default model</option>
                      {availableModels.map((m) => (
                        <option key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id}`} className="bg-[#07090c]">
                          {m.name || m.id} • {m.provider}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  type="button"
                  disabled={submitDisabled}
                  onClick={() => {
                    onCreateTask({ title: title.trim(), prompt: prompt.trim(), preferredModel: preferredModel || null });
                    setTitle("");
                    setPrompt("");
                    setPreferredModel("");
                    setShowModelSelect(false);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 px-5 py-4 text-sm font-bold text-cyan-100 transition hover:border-cyan-400/60 hover:from-cyan-500/25 hover:to-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {createBusy ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating task...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Create task</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* =========== TASKS TAB =========== */}
          {selectedSquadId && tab === "tasks" && (
            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
              {/* Task list sidebar */}
              <aside className="min-h-0 overflow-y-auto border-r border-white/8 bg-white/[0.01] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400/60">Tasks</span>
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-200">{tasks.length}</span>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative h-8 w-8">
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
                    </div>
                    <p className="mt-3 text-xs text-white/40">Loading tasks...</p>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-cyan-500/20 px-4 py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10 mx-auto">
                      <Rocket className="h-6 w-6 text-cyan-300/60" />
                    </div>
                    <p className="mt-3 text-xs font-medium text-white/40">No tasks yet</p>
                    <p className="mt-1 text-xs text-white/30">Get started by creating your first task</p>
                    <button
                      type="button"
                      onClick={() => setTab("create")}
                      className="mt-4 text-xs font-bold text-cyan-300 transition hover:text-cyan-200"
                    >
                      Create task
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => {
                      const active = task.id === selectedTask?.id;
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => onSelectTask(task.id)}
                          className={`w-full rounded-lg border px-3 py-3.5 text-left transition-all duration-150 ${
                            active
                              ? "border-cyan-500/40 bg-cyan-500/15 text-white"
                              : "border-white/8 bg-transparent text-white/65 hover:border-white/15 hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5">{statusIcon(task.status)}</div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium leading-snug">{task.title}</div>
                              <div className="mt-1.5 flex items-center gap-2 text-xs text-white/45">
                                <span className="font-medium">{statusLabel(task.status)}</span>
                                <span className="opacity-40">•</span>
                                <span>{task.runCount} {task.runCount === 1 ? "run" : "runs"}</span>
                              </div>
                            </div>
                            {active && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-r" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </aside>

              {/* Task detail */}
              <main className="min-h-0 overflow-y-auto p-6">
                {!selectedTask ? (
                  <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                      <Rocket className="h-8 w-8 text-cyan-300/40" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white/70">Select a task</h3>
                    <p className="mt-2 text-sm text-white/40">
                      Pick a task from the list to see runs and dispatch actions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Task header */}
                    <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-white/8">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-bold text-white">{selectedTask.title}</h3>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-white/50 font-medium">
                          <span className="text-cyan-300/70">{modeLabel(selectedTask.executionMode)}</span>
                          <span className="opacity-30">•</span>
                          <span>{formatDateTime(selectedTask.createdDate)}</span>
                          {selectedTask.preferredModel && (
                            <>
                              <span className="opacity-30">•</span>
                              <span className="text-cyan-300">{selectedTask.preferredModel}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${statusTone(selectedTask.status)}`}>
                        {statusLabel(selectedTask.status)}
                      </span>
                    </div>

                    {/* Instructions */}
                    {selectedTask.prompt && (
                      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm leading-relaxed text-white/60 font-medium">
                        {selectedTask.prompt}
                      </div>
                    )}

                    {/* Run stats */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                        <div className="text-2xl font-bold text-white">{runSummary.total}</div>
                        <div className="mt-1.5 text-xs font-semibold text-white/40">Total</div>
                      </div>
                      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-center shadow-lg shadow-cyan-500/5">
                        <div className="text-2xl font-bold text-cyan-100">{runSummary.running}</div>
                        <div className="mt-1.5 text-xs font-semibold text-cyan-200/60">Running</div>
                      </div>
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center shadow-lg shadow-emerald-500/5">
                        <div className="text-2xl font-bold text-emerald-100">{runSummary.completed}</div>
                        <div className="mt-1.5 text-xs font-semibold text-emerald-200/60">Done</div>
                      </div>
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center shadow-lg shadow-red-500/5">
                        <div className="text-2xl font-bold text-red-100">{runSummary.failed}</div>
                        <div className="mt-1.5 text-xs font-semibold text-red-200/60">Failed</div>
                      </div>
                    </div>

                    {/* Dispatch approval */}
                    {dispatchApprovalMode && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/12 p-5">
                        <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-amber-500/20">
                          <div>
                            <div className="text-sm font-bold text-amber-100">{dispatchModeLabel(dispatchApprovalMode)}</div>
                            <div className="mt-1.5 text-xs text-amber-200/60 font-medium">Review estimated usage before confirming dispatch.</div>
                          </div>
                          <span className="rounded-full border border-amber-400/30 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200">
                            Review
                          </span>
                        </div>

                        {dispatchEstimateBusy ? (
                          <div className="flex items-center gap-3 py-4 text-sm text-white/40 font-medium">
                            <div className="h-4 w-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
                            Estimating token usage...
                          </div>
                        ) : dispatchEstimate ? (
                          <>
                            <div className="grid grid-cols-4 gap-3 mb-4">
                              <div className="rounded-lg border border-white/15 bg-white/5 p-3.5 text-center">
                                <div className="text-xs font-semibold text-white/50 uppercase">Runs</div>
                                <div className="mt-2 text-lg font-bold text-white">{dispatchEstimate.selectedRuns}</div>
                              </div>
                              <div className="rounded-lg border border-white/15 bg-white/5 p-3.5 text-center">
                                <div className="text-xs font-semibold text-white/50 uppercase">In/run</div>
                                <div className="mt-2 text-lg font-bold text-white">~{dispatchEstimate.estimatedInputTokensPerRun}</div>
                              </div>
                              <div className="rounded-lg border border-white/15 bg-white/5 p-3.5 text-center">
                                <div className="text-xs font-semibold text-white/50 uppercase">Out/run</div>
                                <div className="mt-2 text-lg font-bold text-white">~{dispatchEstimate.estimatedOutputTokensPerRun}</div>
                              </div>
                              <div className="rounded-lg border border-amber-500/40 bg-amber-500/15 p-3.5 text-center shadow-lg shadow-amber-500/5">
                                <div className="text-xs font-semibold text-amber-200/70 uppercase">Total</div>
                                <div className="mt-2 text-lg font-bold text-amber-100">~{dispatchEstimate.estimatedTotalTokens}</div>
                              </div>
                            </div>
                            {dispatchEstimate.notes && (
                              <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/50 font-medium">
                                {dispatchEstimate.notes} • Model: {dispatchEstimate.model || selectedTask.preferredModel || "default"}
                              </div>
                            )}
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => onConfirmDispatchTask(selectedTask.id, dispatchApprovalMode)}
                                disabled={dispatchBusy || dispatchEstimateBusy || !hooksConfigured}
                                className="inline-flex items-center gap-2.5 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-amber-500/10 px-5 py-3 text-sm font-bold text-amber-100 transition hover:border-amber-400/60 hover:from-amber-500/30 hover:to-amber-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {dispatchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                {dispatchBusy ? "Sending..." : "Confirm dispatch"}
                              </button>
                              <button
                                type="button"
                                onClick={onCancelDispatchApproval}
                                disabled={dispatchBusy}
                                className="rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-40"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}

                    {/* Dispatch actions */}
                    {!dispatchApprovalMode && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={dispatchDisabled}
                          onClick={() => onPreviewDispatchTask(selectedTask.id, "pending")}
                          className="inline-flex items-center gap-2.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/60 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Send className="h-4 w-4" />
                          Dispatch pending
                        </button>
                        <button
                          type="button"
                          disabled={dispatchDisabled}
                          onClick={() => onPreviewDispatchTask(selectedTask.id, "retryFailed")}
                          className="inline-flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <RefreshCcw className="h-4 w-4" />
                          Retry failed
                        </button>
                        <button
                          type="button"
                          disabled={dispatchDisabled}
                          onClick={() => onPreviewDispatchTask(selectedTask.id, "redispatchAll")}
                          className="inline-flex items-center gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/12 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:border-amber-400/60 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Zap className="h-4 w-4" />
                          Redispatch all
                        </button>
                      </div>
                    )}

                    {/* Agent runs */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400/60">
                          Agent runs {refreshingTask ? "(refreshing...)" : ""}
                        </span>
                        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-200">{selectedTask.runs.length}</span>
                      </div>

                      {selectedTask.runs.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-cyan-500/20 px-5 py-10 text-center">
                          <p className="text-sm font-medium text-white/40">No runs yet</p>
                          <p className="mt-1 text-xs text-white/30">Dispatch the task to start agent runs</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedTask.runs.map((run) => {
                            const n = normalizeStatus(run.status);
                            const isFailed = ["failed", "error", "cancelled"].includes(n);
                            const isDone = ["completed", "success", "done"].includes(n);
                            const isRunning = ["running", "dispatching", "processing", "in_progress"].includes(n);
                            let borderColor = "border-l-white/20";
                            if (isDone) borderColor = "border-l-emerald-400";
                            else if (isRunning) borderColor = "border-l-cyan-400";
                            else if (isFailed) borderColor = "border-l-red-400";

                            return (
                              <article key={run.id} className={`rounded-lg border border-white/8 bg-white/[0.02] p-4 border-l-4 ${borderColor} transition-all`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="mt-0.5">{statusIcon(run.status)}</div>
                                    <div className="flex-1">
                                      <span className="text-sm font-semibold text-white">{run.agentName}</span>
                                      {run.role && <span className="ml-2.5 text-xs text-white/40 font-medium">{run.role}</span>}
                                    </div>
                                  </div>
                                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${statusTone(run.status)}`}>
                                    {statusLabel(run.status || "pending")}
                                  </span>
                                </div>

                                {run.dispatchError && (
                                  <div className="mt-3.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-200/90 font-medium flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{run.dispatchError}</span>
                                  </div>
                                )}

                                <div className="mt-3.5 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-white/45 font-medium">
                                  <span>Started: {formatDateTime(run.startedAtUtc)}</span>
                                  <span>Finished: {formatDateTime(run.finishedAtUtc)}</span>
                                </div>

                                {run.outputText?.trim() && (
                                  <div className="mt-3.5 rounded-lg border border-white/10 bg-black/40 px-4 py-3 font-mono text-xs leading-relaxed text-white/70 overflow-x-auto">
                                    {run.outputText.trim()}
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </main>
            </div>
          )}
        </div>

        {/* ---- ERROR BAR ---- */}
        {error && !errorDismissed && (
          <div className="border-t border-red-500/30 bg-red-500/12 px-6 py-4">
            <div className="flex items-center gap-3 text-sm text-red-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <span className="flex-1 font-medium">{error}</span>
              <button
                type="button"
                onClick={() => setErrorDismissed(true)}
                className="rounded-lg p-1 text-red-300/60 transition hover:bg-red-500/20 hover:text-red-200"
                title="Dismiss"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
