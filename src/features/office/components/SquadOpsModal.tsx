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

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPrompt("");
    setPreferredModel("");
    setShowModelSelect(false);
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
        <header className="border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300/60">Squad Ops</div>
                <div className="flex items-center gap-2">
                  {hasSquads ? (
                    <select
                      value={selectedSquadId ?? ""}
                      onChange={(e) => onSelectSquad(e.target.value)}
                      className="max-w-[240px] truncate rounded-lg border border-white/10 bg-transparent px-2 py-1 text-base font-semibold text-white outline-none transition focus:border-cyan-300/40"
                    >
                      <option value="" className="bg-[#07090c]">Select a squad</option>
                      {squads.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#07090c]">{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-base font-semibold text-white/40">No squads available</span>
                  )}
                  {squad && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/45">
                      {squad.members.length} members · {modeLabel(squad.executionMode)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
                title="Refresh"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>

          {/* Hooks status banner */}
          {hooksMessage && (
            <div className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-5 ${
              hooksConfigured
                ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-200/80"
                : "border-amber-500/20 bg-amber-500/8 text-amber-200/80"
            }`}>
              {hooksMessage}
            </div>
          )}

          {/* Tabs */}
          {selectedSquadId && (
            <div className="mt-3 flex gap-1">
              <button
                type="button"
                onClick={() => setTab("tasks")}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  tab === "tasks"
                    ? "bg-white/8 text-white"
                    : "text-white/45 hover:bg-white/5 hover:text-white/70"
                }`}
              >
                Tasks ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("create")}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  tab === "create"
                    ? "bg-cyan-500/10 text-cyan-200"
                    : "text-white/45 hover:bg-white/5 hover:text-white/70"
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                <Users2 className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">Select a squad to start</h3>
              <p className="mt-2 max-w-sm text-sm text-white/40">
                Choose a squad from the dropdown above to create tasks, dispatch runs, and review results.
              </p>
            </div>
          )}

          {/* =========== CREATE TAB =========== */}
          {selectedSquadId && tab === "create" && (
            <div className="mx-auto max-w-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white">Create a new task</h3>
                <p className="mt-1 text-sm text-white/40">
                  Describe what the squad should do. The task will be sent according to the squad&apos;s execution mode.
                </p>
              </div>

              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">Task title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Review the landing page and suggest improvements"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">Instructions</span>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Explain the goal, expected output, tone, constraints, and who should focus on what."
                  rows={6}
                  className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                />
              </label>

              {/* Collapsible model select */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowModelSelect(!showModelSelect)}
                  className="flex items-center gap-2 text-xs text-white/35 transition hover:text-white/55"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${showModelSelect ? "rotate-90" : ""}`} />
                  Advanced: override AI model
                </button>
                {showModelSelect && (
                  <select
                    value={preferredModel}
                    onChange={(e) => setPreferredModel(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  >
                    <option value="" className="bg-[#07090c]">Use squad default model</option>
                    {availableModels.map((m) => (
                      <option key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id}`} className="bg-[#07090c]">
                        {m.name || m.id} · {m.provider}
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {createBusy ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating task...</>
                ) : (
                  <><Send className="h-4 w-4" /> Create task</>
                )}
              </button>
            </div>
          )}

          {/* =========== TASKS TAB =========== */}
          {selectedSquadId && tab === "tasks" && (
            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[300px_minmax(0,1fr)]">
              {/* Task list sidebar */}
              <aside className="min-h-0 overflow-y-auto border-r border-white/8 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Tasks</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/40">{tasks.length}</span>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
                    <Rocket className="mx-auto h-6 w-6 text-white/20" />
                    <p className="mt-2 text-xs text-white/35">No tasks yet.</p>
                    <button
                      type="button"
                      onClick={() => setTab("create")}
                      className="mt-3 text-xs font-medium text-cyan-300/80 transition hover:text-cyan-200"
                    >
                      Create your first task
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {tasks.map((task) => {
                      const active = task.id === selectedTask?.id;
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => onSelectTask(task.id)}
                          className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                            active
                              ? "border-cyan-300/30 bg-cyan-500/8 text-white"
                              : "border-white/8 bg-transparent text-white/65 hover:border-white/15 hover:bg-white/[0.03] hover:text-white"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {statusIcon(task.status)}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{task.title}</div>
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-white/35">
                                <span>{statusLabel(task.status)}</span>
                                <span>·</span>
                                <span>{task.runCount} runs</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </aside>

              {/* Task detail */}
              <main className="min-h-0 overflow-y-auto p-5">
                {!selectedTask ? (
                  <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                    <Rocket className="h-8 w-8 text-white/15" />
                    <h3 className="mt-3 text-base font-semibold text-white/60">Select a task</h3>
                    <p className="mt-1 text-sm text-white/30">
                      Pick a task from the list to see runs and dispatch actions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Task header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-white">{selectedTask.title}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-white/40">
                          <span>{modeLabel(selectedTask.executionMode)}</span>
                          <span>·</span>
                          <span>{formatDateTime(selectedTask.createdDate)}</span>
                          {selectedTask.preferredModel && (
                            <>
                              <span>·</span>
                              <span className="text-cyan-300/60">{selectedTask.preferredModel}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${statusTone(selectedTask.status)}`}>
                        {statusLabel(selectedTask.status)}
                      </span>
                    </div>

                    {/* Instructions */}
                    {selectedTask.prompt && (
                      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-sm leading-relaxed text-white/65">
                        {selectedTask.prompt}
                      </div>
                    )}

                    {/* Run stats */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                        <div className="text-xl font-semibold text-white">{runSummary.total}</div>
                        <div className="mt-0.5 text-[10px] text-white/35">Total</div>
                      </div>
                      <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-3 text-center">
                        <div className="text-xl font-semibold text-cyan-100">{runSummary.running}</div>
                        <div className="mt-0.5 text-[10px] text-cyan-200/50">Running</div>
                      </div>
                      <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-3 text-center">
                        <div className="text-xl font-semibold text-emerald-100">{runSummary.completed}</div>
                        <div className="mt-0.5 text-[10px] text-emerald-200/50">Done</div>
                      </div>
                      <div className="rounded-xl border border-red-400/15 bg-red-500/5 p-3 text-center">
                        <div className="text-xl font-semibold text-red-100">{runSummary.failed}</div>
                        <div className="mt-0.5 text-[10px] text-red-200/50">Failed</div>
                      </div>
                    </div>

                    {/* Dispatch approval */}
                    {dispatchApprovalMode && (
                      <div className="rounded-xl border border-amber-400/20 bg-amber-500/8 p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <div className="text-sm font-medium text-amber-100">{dispatchModeLabel(dispatchApprovalMode)}</div>
                            <div className="mt-0.5 text-xs text-amber-200/50">Review estimated usage before sending.</div>
                          </div>
                          <span className="rounded-full border border-amber-300/20 bg-black/20 px-2 py-0.5 text-[10px] text-amber-200/70">
                            Approval
                          </span>
                        </div>

                        {dispatchEstimateBusy ? (
                          <div className="flex items-center gap-2 py-3 text-sm text-white/40">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Estimating token usage...
                          </div>
                        ) : dispatchEstimate ? (
                          <>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-center">
                                <div className="text-xs text-white/35">Runs</div>
                                <div className="mt-1 text-base font-semibold text-white">{dispatchEstimate.selectedRuns}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-center">
                                <div className="text-xs text-white/35">In/run</div>
                                <div className="mt-1 text-base font-semibold text-white">~{dispatchEstimate.estimatedInputTokensPerRun}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-center">
                                <div className="text-xs text-white/35">Out/run</div>
                                <div className="mt-1 text-base font-semibold text-white">~{dispatchEstimate.estimatedOutputTokensPerRun}</div>
                              </div>
                              <div className="rounded-lg border border-amber-400/25 bg-amber-500/8 p-2.5 text-center">
                                <div className="text-xs text-amber-200/60">Total</div>
                                <div className="mt-1 text-base font-semibold text-amber-100">~{dispatchEstimate.estimatedTotalTokens}</div>
                              </div>
                            </div>
                            {dispatchEstimate.notes && (
                              <div className="mb-3 rounded-lg border border-white/8 bg-black/15 px-3 py-2 text-xs text-white/40">
                                {dispatchEstimate.notes} Model: {dispatchEstimate.model || selectedTask.preferredModel || "default"}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => onConfirmDispatchTask(selectedTask.id, dispatchApprovalMode)}
                                disabled={dispatchBusy || dispatchEstimateBusy || !hooksConfigured}
                                className="inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-500/12 px-4 py-2.5 text-sm font-medium text-amber-50 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {dispatchBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                                {dispatchBusy ? "Sending..." : "Approve & run"}
                              </button>
                              <button
                                type="button"
                                onClick={onCancelDispatchApproval}
                                disabled={dispatchBusy}
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-45"
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
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={dispatchDisabled}
                          onClick={() => onPreviewDispatchTask(selectedTask.id, "pending")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-500/8 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Send className="h-3 w-3" />
                          Dispatch pending
                        </button>
                        <button
                          type="button"
                          disabled={dispatchDisabled}
                          onClick={() => onPreviewDispatchTask(selectedTask.id, "retryFailed")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <RefreshCcw className="h-3 w-3" />
                          Retry failed
                        </button>
                        <button
                          type="button"
                          disabled={dispatchDisabled}
                          onClick={() => onPreviewDispatchTask(selectedTask.id, "redispatchAll")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/15 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/70 transition hover:bg-amber-500/12 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Zap className="h-3 w-3" />
                          Redispatch all
                        </button>
                      </div>
                    )}

                    {/* Agent runs */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                          Agent runs {refreshingTask ? "(refreshing...)" : ""}
                        </span>
                        <span className="text-[10px] text-white/30">{selectedTask.runs.length} runs</span>
                      </div>

                      {selectedTask.runs.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/30">
                          No runs yet. Dispatch the task to start agent runs.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedTask.runs.map((run) => (
                            <article key={run.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  {statusIcon(run.status)}
                                  <div>
                                    <span className="text-sm font-medium text-white">{run.agentName}</span>
                                    {run.role && <span className="ml-2 text-xs text-white/30">{run.role}</span>}
                                  </div>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusTone(run.status)}`}>
                                  {statusLabel(run.status || "pending")}
                                </span>
                              </div>

                              {run.dispatchError && (
                                <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-200/80">
                                  {run.dispatchError}
                                </div>
                              )}

                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/30">
                                <span>Started: {formatDateTime(run.startedAtUtc)}</span>
                                <span>Finished: {formatDateTime(run.finishedAtUtc)}</span>
                              </div>

                              {run.outputText?.trim() && (
                                <div className="mt-3 rounded-lg border border-white/8 bg-black/20 p-3 text-sm leading-relaxed text-white/65">
                                  {run.outputText.trim()}
                                </div>
                              )}
                            </article>
                          ))}
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
        {error && (
          <div className="border-t border-red-500/20 bg-red-500/8 px-6 py-3">
            <div className="flex items-center gap-2 text-sm text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
