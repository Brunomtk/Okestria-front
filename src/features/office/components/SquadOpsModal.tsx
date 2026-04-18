"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, GitBranch, Hand, Layers3, Loader2, Play, RefreshCcw, Users, XCircle, Crown } from "lucide-react";
import type { SquadExecutionMode, SquadSummary, SquadTask, SquadTaskDispatchEstimate, SquadTaskSummary } from "@/lib/squads/api";
import type { GatewayModelChoice } from "@/lib/gateway/models";

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

const fmtDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const normalize = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

const MODE_OPTIONS: Array<{ value: SquadExecutionMode; label: string; hint: string; icon: ReactNode }> = [
  { value: "leader", label: "Leader first", hint: "Leader starts and coordinates the flow.", icon: <Crown className="h-4 w-4" /> },
  { value: "all", label: "All at once", hint: "Dispatch to every member immediately.", icon: <Layers3 className="h-4 w-4" /> },
  { value: "manual", label: "Manual", hint: "You choose when each agent should run.", icon: <Hand className="h-4 w-4" /> },
  { value: "workflow", label: "Workflow", hint: "Run in ordered stages across the squad.", icon: <GitBranch className="h-4 w-4" /> },
];

const modeLabel = (value: SquadExecutionMode | string | null | undefined) =>
  MODE_OPTIONS.find((entry) => entry.value === value)?.label ?? (value ? String(value) : "Leader first");
const statusTone = (value: string | null | undefined) => {
  const n = normalize(value);
  if (["completed", "done", "success"].includes(n)) return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  if (["failed", "error", "cancelled"].includes(n)) return "border-red-400/20 bg-red-500/10 text-red-200";
  if (["running", "queued", "pending", "dispatching", "processing", "in_progress"].includes(n)) return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
  return "border-white/10 bg-white/5 text-white/65";
};

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
    onEditSquad,
  } = props;

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preferredModel, setPreferredModel] = useState<string>("");
  const [modeSaving, setModeSaving] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPrompt("");
    setPreferredModel("");
  }, [open, selectedSquadId]);

  const selectedRuns = selectedTask?.runs ?? [];
  const activeMode = (selectedTask?.executionMode ?? squad?.executionMode ?? "leader") as SquadExecutionMode;

  const handleModeChange = async (nextMode: SquadExecutionMode) => {
    if (!squad || !onEditSquad || modeSaving || nextMode === squad.executionMode) return;
    try {
      setModeSaving(true);
      setModeError(null);
      await onEditSquad(squad.id, { executionMode: nextMode });
    } catch (error) {
      setModeError(error instanceof Error ? error.message : "Unable to update squad mode right now.");
    } finally {
      setModeSaving(false);
    }
  };
  const stats = useMemo(() => {
    const total = selectedRuns.length;
    const running = selectedRuns.filter((run) => ["running", "queued", "pending", "dispatching", "processing", "in_progress"].includes(normalize(run.status))).length;
    const done = selectedRuns.filter((run) => ["completed", "done", "success"].includes(normalize(run.status))).length;
    const failed = selectedRuns.filter((run) => ["failed", "error", "cancelled"].includes(normalize(run.status))).length;
    return { total, running, done, failed };
  }, [selectedRuns]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/78 p-3 backdrop-blur-sm md:p-4"
      onClick={onClose}
    >
      <section
        className="relative flex h-[min(92vh,980px)] w-full max-w-[1380px] min-h-0 flex-col overflow-hidden rounded-[32px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.12),_transparent_38%),linear-gradient(180deg,_rgba(2,12,18,0.98),_rgba(1,7,10,0.98))] shadow-[0_40px_140px_rgba(0,0,0,0.62)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-cyan-400/10 bg-black/10 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200/85">Squad Ops</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/60">
                <span className="max-w-full truncate text-lg font-semibold text-white sm:text-[1.7rem]">{squad?.name ?? "Select a squad"}</span>
                <span className="text-white/25">•</span>
                <span>{squad?.members.length ?? 0} members</span>
                <span className="text-white/25">•</span>
                <span>{modeLabel(activeMode)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/75 transition hover:border-cyan-400/20 hover:bg-cyan-500/10 hover:text-white"
              >
                <RefreshCcw className={`h-4 w-4 ${loading || refreshingTask ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/65 transition hover:bg-white/[0.08] hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col overflow-hidden border-b border-cyan-400/10 bg-white/[0.02] lg:border-b-0 lg:border-r lg:border-cyan-400/10">
            <div className={`border-b px-5 py-4 text-sm ${hooksConfigured ? "border-emerald-400/10 bg-emerald-500/10 text-emerald-100/90" : "border-amber-400/10 bg-amber-500/10 text-amber-100/90"}`}>
              <div className="flex items-start gap-3">
                {hooksConfigured ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>{hooksMessage ?? "Runtime status unavailable."}</div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-5 p-5">
                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Selected squad</label>
                  <select
                    value={selectedSquadId ?? ""}
                    onChange={(event) => onSelectSquad(event.target.value)}
                    className="w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-white/[0.08]"
                  >
                    {squads.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[26px] border border-cyan-500/15 bg-cyan-500/[0.05] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Squad mode</div>
                      <div className="mt-1 text-xs leading-5 text-white/55">Dynamic switch for new tasks created in Squad Ops.</div>
                    </div>
                    {modeSaving ? <Loader2 className="h-4 w-4 animate-spin text-cyan-200" /> : null}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {MODE_OPTIONS.map((option) => {
                      const active = activeMode === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => void handleModeChange(option.value)}
                          disabled={!squad || !onEditSquad || modeSaving}
                          className={`rounded-[22px] border px-3 py-3 text-left transition ${
                            active
                              ? "border-cyan-400/40 bg-cyan-500/15 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/75 hover:border-cyan-400/20 hover:bg-cyan-500/10"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <span className="text-xs font-semibold">{option.label}</span>
                          </div>
                          <div className="mt-1 text-[11px] leading-4 text-white/50">{option.hint}</div>
                        </button>
                      );
                    })}
                  </div>
                  {modeError ? <div className="mt-2 text-[11px] text-red-300">{modeError}</div> : null}
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">New task</div>
                  <div className="space-y-3">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Task title"
                      className="w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/30 focus:bg-white/[0.08]"
                    />
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Task instructions"
                      className="min-h-[148px] w-full resize-none rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/30 focus:bg-white/[0.08]"
                    />
                    <select
                      value={preferredModel}
                      onChange={(e) => setPreferredModel(e.target.value)}
                      className="w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-white/[0.08]"
                    >
                      <option value="">Default model</option>
                      {availableModels.map((model) => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={createBusy || !title.trim() || !prompt.trim()}
                      onClick={() => onCreateTask({ title: title.trim(), prompt: prompt.trim(), preferredModel: preferredModel || null })}
                      className="w-full rounded-[22px] border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {createBusy ? "Creating task..." : "Create task"}
                    </button>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Tasks ({tasks.length})</div>
                  <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
                    {tasks.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/45">
                        No tasks created yet for this squad.
                      </div>
                    ) : null}

                    {tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onSelectTask(task.id)}
                        className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${selectedTask?.id === task.id ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">{task.title}</div>
                            <div className="mt-1 text-xs text-white/35">{fmtDate(task.createdDate)}</div>
                            <div className="mt-2 text-[11px] text-white/45">{task.runCount} runs</div>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone(task.status)}`}>
                            {task.status || "draft"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 flex-col overflow-hidden">
            {!selectedTask ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-white/35">
                Select a squad task to inspect dispatch, runs and synced output.
              </div>
            ) : (
              <>
                <div className="border-b border-cyan-400/10 px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-2xl font-semibold leading-tight text-white sm:text-3xl">{selectedTask.title}</div>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone(selectedTask.status)}`}>
                          {selectedTask.status || "draft"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/45">
                        <span>{selectedTask.executionMode}</span>
                        <span className="text-white/25">•</span>
                        <span>{fmtDate(selectedTask.createdDate)}</span>
                        <span className="text-white/25">•</span>
                        <span>{selectedTask.preferredModel || "default model"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:w-[430px]">
                      <StatCard label="Total" value={stats.total} icon={<Users className="h-4 w-4" />} />
                      <StatCard label="Running" value={stats.running} accent="cyan" icon={<Loader2 className="h-4 w-4" />} />
                      <StatCard label="Done" value={stats.done} accent="emerald" icon={<CheckCircle2 className="h-4 w-4" />} />
                      <StatCard label="Failed" value={stats.failed} accent="red" icon={<XCircle className="h-4 w-4" />} />
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-5 p-4 sm:p-5">
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/80">
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Task prompt</div>
                      <div className="max-h-[28vh] overflow-y-auto pr-2 whitespace-pre-wrap break-words">{selectedTask.prompt}</div>
                    </div>

                    {(selectedTask.finalResponse || selectedTask.summary) ? (
                      <div className="rounded-[28px] border border-cyan-400/15 bg-cyan-500/5 px-4 py-4 text-sm leading-7 text-white/85">
                        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/80">Final synced response</div>
                        <div className="max-h-[24vh] overflow-y-auto pr-2 whitespace-pre-wrap break-words">{selectedTask.finalResponse || selectedTask.summary}</div>
                      </div>
                    ) : null}

                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <ActionButton
                            busy={dispatchBusy && dispatchApprovalMode === "pending"}
                            onClick={() => dispatchApprovalMode === "pending" ? onConfirmDispatchTask(selectedTask.id, "pending") : onPreviewDispatchTask(selectedTask.id, "pending")}
                          >
                            <Play className="h-4 w-4" />
                            {dispatchApprovalMode === "pending" ? "Confirm dispatch" : "Dispatch pending"}
                          </ActionButton>
                          <ActionButton
                            busy={dispatchBusy && dispatchApprovalMode === "retryFailed"}
                            onClick={() => dispatchApprovalMode === "retryFailed" ? onConfirmDispatchTask(selectedTask.id, "retryFailed") : onPreviewDispatchTask(selectedTask.id, "retryFailed")}
                          >
                            <RefreshCcw className="h-4 w-4" />
                            {dispatchApprovalMode === "retryFailed" ? "Confirm retry" : "Retry failed"}
                          </ActionButton>
                          <ActionButton
                            busy={dispatchBusy && dispatchApprovalMode === "redispatchAll"}
                            onClick={() => dispatchApprovalMode === "redispatchAll" ? onConfirmDispatchTask(selectedTask.id, "redispatchAll") : onPreviewDispatchTask(selectedTask.id, "redispatchAll")}
                          >
                            <Loader2 className="h-4 w-4" />
                            {dispatchApprovalMode === "redispatchAll" ? "Confirm redispatch" : "Redispatch all"}
                          </ActionButton>
                          {dispatchApprovalMode ? (
                            <button
                              type="button"
                              onClick={onCancelDispatchApproval}
                              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/65 transition hover:bg-white/[0.08] hover:text-white"
                            >
                              Cancel
                            </button>
                          ) : null}
                        </div>

                        {(dispatchEstimate || dispatchEstimateBusy) ? (
                          <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/65">
                            {dispatchEstimateBusy
                              ? "Estimating dispatch..."
                              : `Estimate: ${dispatchEstimate?.selectedRuns ?? 0} runs • ${dispatchEstimate?.estimatedTotalTokens ?? 0} tokens`}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {error ? (
                      <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                      </div>
                    ) : null}

                    <div className="space-y-4">
                      {selectedRuns.map((run) => {
                        const output = (run.outputText || "").trim();
                        const hasError = !!run.dispatchError?.trim();
                        return (
                          <div key={run.id} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.18)]">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-lg font-semibold text-white">{run.agentName}</div>
                                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone(run.status)}`}>
                                    {run.status || "pending"}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-white/40">{run.role || run.agentSlug || "Agent run"}</div>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 text-sm text-white/45 sm:grid-cols-2 xl:grid-cols-3">
                              <MetaCard label="Started" value={fmtDate(run.startedAtUtc)} />
                              <MetaCard label="Finished" value={fmtDate(run.finishedAtUtc)} />
                              <MetaCard label="Session" value={run.externalSessionKey || "—"} mono />
                            </div>

                            {hasError ? (
                              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {run.dispatchError}
                              </div>
                            ) : null}

                            {output ? (
                              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Synced output</div>
                                <div className="max-h-[36vh] overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-7 text-white/80">{output}</div>
                              </div>
                            ) : null}

                            {!output && !hasError ? (
                              <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200/90">
                                Agent is working...
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetaCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className={`mt-1 text-white/85 ${mono ? "break-all font-mono text-[12px]" : "text-sm"}`}>{value}</div>
    </div>
  );
}

function StatCard({ label, value, accent, icon }: { label: string; value: number; accent?: "cyan" | "emerald" | "red"; icon?: ReactNode }) {
  const tone = accent === "cyan"
    ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
    : accent === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : accent === "red"
        ? "border-red-400/20 bg-red-500/10 text-red-200"
        : "border-white/10 bg-white/[0.03] text-white";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-2xl font-semibold">{value}</div>
        {icon ? <div className="opacity-80">{icon}</div> : null}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">{label}</div>
    </div>
  );
}

function ActionButton({ children, busy, onClick }: { children: ReactNode; busy?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="inline-flex items-center gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{children}</span>
    </button>
  );
}
