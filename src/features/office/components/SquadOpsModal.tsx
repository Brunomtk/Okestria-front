"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Crown, GitBranch, Hand, Layers3, Loader2, Play, RefreshCcw, Trash2, X } from "lucide-react";
import type { GatewayModelChoice } from "@/lib/gateway/models";
import type { SquadExecutionMode, SquadSummary, SquadTask, SquadTaskDispatchEstimate, SquadTaskSummary } from "@/lib/squads/api";
import { SquadTaskWorkspace } from "@/features/office/components/SquadTaskWorkspace";

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
  onEditSquad?: (squadId: string, payload: {
    name?: string;
    description?: string | null;
    iconEmoji?: string | null;
    color?: string | null;
    executionMode?: SquadExecutionMode | null;
  }) => Promise<void> | void;
  onDeleteSquad?: (squadId: string) => Promise<void> | void;
};

const MODE_OPTIONS: Array<{ value: SquadExecutionMode; label: string; hint: string; icon: ReactNode }> = [
  { value: "leader", label: "Leader first", hint: "Leader coordinates and starts the flow.", icon: <Crown className="h-4 w-4" /> },
  { value: "all", label: "All at once", hint: "Everyone receives the task immediately.", icon: <Layers3 className="h-4 w-4" /> },
  { value: "manual", label: "Manual", hint: "You choose when each member runs.", icon: <Hand className="h-4 w-4" /> },
  { value: "workflow", label: "Workflow", hint: "Members run in ordered stages.", icon: <GitBranch className="h-4 w-4" /> },
];

const normalize = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

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
  onEditSquad,
  onDeleteSquad,
}: SquadOpsModalProps) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preferredModel, setPreferredModel] = useState("");
  const [modeBusy, setModeBusy] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPrompt("");
    setPreferredModel("");
    setModeError(null);
  }, [open, selectedSquadId]);

  const memberCount = squad?.members?.length ?? 0;
  const activeMode = (selectedTask?.executionMode ?? squad?.executionMode ?? "leader") as SquadExecutionMode;
  const selectedRuns = selectedTask?.runs ?? [];
  const taskStats = useMemo(() => ({
    total: selectedRuns.length,
    running: selectedRuns.filter((run) => ["running", "queued", "pending", "dispatching", "processing", "in_progress"].includes(normalize(run.status))).length,
    failed: selectedRuns.filter((run) => ["failed", "error", "cancelled"].includes(normalize(run.status))).length,
  }), [selectedRuns]);

  if (!open) return null;

  const handleCreateTask = () => {
    const nextTitle = title.trim();
    const nextPrompt = prompt.trim();
    if (!nextTitle || !nextPrompt) return;
    onCreateTask({
      title: nextTitle,
      prompt: nextPrompt,
      preferredModel: preferredModel.trim() || null,
    });
  };

  const handleChangeMode = async (nextMode: SquadExecutionMode) => {
    if (!squad || !onEditSquad || nextMode === squad.executionMode || modeBusy) return;
    try {
      setModeBusy(true);
      setModeError(null);
      await onEditSquad(squad.id, { executionMode: nextMode });
    } catch (err) {
      setModeError(err instanceof Error ? err.message : "Unable to update squad mode right now.");
    } finally {
      setModeBusy(false);
    }
  };

  const handleDeleteSquad = async () => {
    if (!squad || !onDeleteSquad || deleteBusy) return;
    const accepted = window.confirm(`Delete squad \"${squad.name}\"? This will remove the squad configuration.`);
    if (!accepted) return;
    try {
      setDeleteBusy(true);
      await onDeleteSquad(squad.id);
    } finally {
      setDeleteBusy(false);
    }
  };

  const topActions = selectedTask ? (
    <div className="flex flex-wrap items-center gap-2">
      <DispatchButton
        label="Dispatch pending"
        busy={dispatchBusy && dispatchApprovalMode === "pending"}
        onClick={() => {
          if (!selectedTask) return;
          dispatchEstimate && dispatchApprovalMode === "pending"
            ? onConfirmDispatchTask(selectedTask.id, "pending")
            : onPreviewDispatchTask(selectedTask.id, "pending");
        }}
      />
      <DispatchButton
        label="Retry failed"
        busy={dispatchBusy && dispatchApprovalMode === "retryFailed"}
        onClick={() => {
          if (!selectedTask) return;
          dispatchEstimate && dispatchApprovalMode === "retryFailed"
            ? onConfirmDispatchTask(selectedTask.id, "retryFailed")
            : onPreviewDispatchTask(selectedTask.id, "retryFailed");
        }}
      />
      <DispatchButton
        label="Redispatch all"
        busy={dispatchBusy && dispatchApprovalMode === "redispatchAll"}
        onClick={() => {
          if (!selectedTask) return;
          dispatchEstimate && dispatchApprovalMode === "redispatchAll"
            ? onConfirmDispatchTask(selectedTask.id, "redispatchAll")
            : onPreviewDispatchTask(selectedTask.id, "redispatchAll");
        }}
      />
      {dispatchApprovalMode && dispatchEstimate ? (
        <button
          type="button"
          onClick={onCancelDispatchApproval}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/75 transition hover:bg-white/[0.08]"
        >
          Cancel approval
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/78 px-3 py-3 backdrop-blur-sm sm:px-5 sm:py-5">
      <section className="mx-auto flex h-[min(96vh,1040px)] w-full max-w-[1640px] flex-col overflow-hidden rounded-[30px] border border-cyan-400/15 bg-[#03141b]/95 shadow-[0_30px_120px_rgba(0,0,0,0.58)]">
        <header className="shrink-0 border-b border-cyan-400/10 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-200/75">Squad Ops</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-white">
                <span className="truncate text-2xl font-semibold">{squad?.name ?? "Squad workspace"}</span>
                <span className="text-white/20">•</span>
                <span className="text-sm text-white/60">{memberCount} members</span>
                <span className="text-white/20">•</span>
                <span className="text-sm text-white/60">{MODE_OPTIONS.find((entry) => entry.value === activeMode)?.label ?? activeMode}</span>
              </div>
              <div className="mt-2 text-sm text-white/45">
                Create tasks, switch execution mode, and inspect each member session in one workspace.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              {onDeleteSquad && squad ? (
                <button
                  type="button"
                  onClick={() => void handleDeleteSquad()}
                  disabled={deleteBusy}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete squad
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 transition hover:bg-white/[0.08]"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid min-h-full gap-6 px-4 py-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-5 lg:py-5 xl:px-6">
            <aside className="space-y-5 self-start">
              <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Selected squad</label>
                <select
                  value={selectedSquadId ?? ""}
                  onChange={(event) => onSelectSquad(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30"
                >
                  <option value="">Select a squad</option>
                  {squads.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </section>

              <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-2">
                  {hooksConfigured ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <AlertTriangle className="h-5 w-5 text-amber-300" />}
                  <div className="font-medium text-white">Runtime status</div>
                </div>
                <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${hooksConfigured ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100/90" : "border-amber-400/20 bg-amber-500/10 text-amber-100/90"}`}>
                  {hooksMessage || (hooksConfigured ? "OpenClaw hooks are configured." : "Hooks are not configured yet.")}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <MiniStat label="Runs" value={taskStats.total} />
                  <MiniStat label="Running" value={taskStats.running} />
                  <MiniStat label="Failed" value={taskStats.failed} />
                </div>
              </section>

              <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Execution mode</div>
                <div className="mt-4 grid gap-3">
                  {MODE_OPTIONS.map((option) => {
                    const active = (squad?.executionMode ?? "leader") === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => void handleChangeMode(option.value)}
                        disabled={!squad || !onEditSquad || modeBusy}
                        className={`rounded-[20px] border px-4 py-3 text-left transition ${
                          active
                            ? "border-cyan-400/35 bg-cyan-500/12"
                            : "border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/[0.04]"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70">
                            {option.icon}
                          </div>
                          <div>
                            <div className="font-medium text-white">{option.label}</div>
                            <div className="text-sm text-white/45">{option.hint}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {modeBusy ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] text-cyan-100">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Updating mode...
                  </div>
                ) : null}
                {modeError ? <div className="mt-3 text-sm text-red-200">{modeError}</div> : null}
              </section>

              <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Create task</div>
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Task title"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30"
                  />
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Describe what the squad should do..."
                    rows={6}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30"
                  />
                  <select
                    value={preferredModel}
                    onChange={(event) => setPreferredModel(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30"
                  >
                    <option value="">Use squad default model</option>
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name || model.id}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCreateTask}
                    disabled={createBusy || !selectedSquadId || !title.trim() || !prompt.trim()}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/12 px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Create squad task
                  </button>
                </div>
              </section>

              {(dispatchEstimate || dispatchEstimateBusy) ? (
                <section className="rounded-[26px] border border-cyan-400/20 bg-cyan-500/10 p-5 text-cyan-100">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100/70">Dispatch approval</div>
                  <div className="mt-3 text-sm leading-7">
                    {dispatchEstimateBusy
                      ? "Estimating token usage..."
                      : `Selected runs: ${dispatchEstimate?.selectedRuns ?? 0} • Estimated tokens: ${dispatchEstimate?.estimatedTotalTokens ?? 0}`}
                  </div>
                </section>
              ) : null}

              {error ? (
                <section className="rounded-[26px] border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
                  {error}
                </section>
              ) : null}
            </aside>

            <div className="min-w-0">
              <SquadTaskWorkspace
                squad={squad}
                tasks={tasks}
                selectedTask={selectedTask}
                selectedTaskId={selectedTask?.id ?? null}
                loading={loading}
                refreshingTask={refreshingTask}
                onSelectTask={onSelectTask}
                emptyTitle="No squad task selected"
                emptyDescription="Create a task on the left or pick one from the task row to inspect member sessions and final output."
                topActions={topActions}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function DispatchButton({
  label,
  busy,
  onClick,
}: {
  label: string;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-55"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {label}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-center">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</div>
    </div>
  );
}
