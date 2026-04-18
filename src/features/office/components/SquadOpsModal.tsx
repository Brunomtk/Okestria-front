"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Play, RefreshCcw, Users , XCircle } from "lucide-react";
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
  } = props;

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preferredModel, setPreferredModel] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPrompt("");
    setPreferredModel("");
  }, [open, selectedSquadId]);

  const selectedRuns = selectedTask?.runs ?? [];
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
      className="pointer-events-auto fixed inset-0 z-[130] overflow-y-auto bg-black/72 p-3 backdrop-blur-sm md:p-4"
      onClick={onClose}
    >
      <section
        className="mx-auto my-4 flex h-[min(92vh,960px)] min-h-[620px] w-[min(1320px,96vw)] flex-col overflow-hidden rounded-[28px] border border-cyan-500/20 bg-[#02090b]/96 shadow-[0_30px_120px_rgba(0,0,0,0.65)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-4 border-b border-cyan-500/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">Squad Ops</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/65">
              <span className="max-w-full truncate text-white">{squad?.name ?? "Select a squad"}</span>
              <span className="text-white/25">•</span>
              <span>{squad?.members.length ?? 0} members</span>
              <span className="text-white/25">•</span>
              <span>{selectedTask?.executionMode ?? squad?.executionMode ?? "leader"} mode</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className={`h-4 w-4 ${loading || refreshingTask ? "animate-spin" : ""}`} />
                Refresh
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/65 transition hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-cyan-500/10 bg-[#061118]/80 lg:border-b-0 lg:border-r">
            <div className={`border-b px-5 py-3 text-sm ${hooksConfigured ? "border-emerald-400/10 bg-emerald-500/10 text-emerald-100/90" : "border-amber-400/10 bg-amber-500/10 text-amber-100/90"}`}>
              <div className="flex items-start gap-3">
                {hooksConfigured ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>{hooksMessage ?? "Runtime status unavailable."}</div>
              </div>
            </div>

            <div className="border-b border-cyan-500/10 px-5 py-4">
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Selected squad</label>
              <select
                value={selectedSquadId ?? ""}
                onChange={(event) => onSelectSquad(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-white/[0.08]"
              >
                {squads.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-b border-cyan-500/10 px-5 py-4">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">New task</div>
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/30 focus:bg-white/[0.08]"
                />
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Task instructions"
                  className="min-h-[128px] w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/30 focus:bg-white/[0.08]"
                />
                <select
                  value={preferredModel}
                  onChange={(e) => setPreferredModel(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-white/[0.08]"
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
                  className="w-full rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createBusy ? "Creating task..." : "Create task"}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Tasks ({tasks.length})</div>
              <div className="space-y-2">
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
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${selectedTask?.id === task.id ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}
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
          </aside>

          <div className="flex min-h-0 flex-col">
            {!selectedTask ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-white/35">
                Select a squad task to inspect dispatch, runs and synced output.
              </div>
            ) : (
              <>
                <div className="border-b border-cyan-500/10 px-5 py-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-2xl font-semibold text-white sm:text-3xl">{selectedTask.title}</div>
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

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[420px]">
                      <StatCard label="Total" value={stats.total} icon={<Users className="h-4 w-4" />} />
                      <StatCard label="Running" value={stats.running} accent="cyan" icon={<Loader2 className="h-4 w-4" />} />
                      <StatCard label="Done" value={stats.done} accent="emerald" icon={<CheckCircle2 className="h-4 w-4" />} />
                      <StatCard label="Failed" value={stats.failed} accent="red" icon={<XCircle className="h-4 w-4" />} />
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/80">
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Task prompt</div>
                    <div className="max-h-[32vh] overflow-y-auto pr-2 whitespace-pre-wrap break-words">{selectedTask.prompt}</div>
                  </div>

                  {(selectedTask.finalResponse || selectedTask.summary) ? (
                    <div className="mt-4 rounded-3xl border border-cyan-400/15 bg-cyan-500/5 px-4 py-4 text-sm leading-7 text-white/85">
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/80">Final synced response</div>
                      <div className="max-h-[28vh] overflow-y-auto pr-2 whitespace-pre-wrap break-words">{selectedTask.finalResponse || selectedTask.summary}</div>
                    </div>
                  ) : null}
                </div>

                <div className="border-b border-cyan-500/10 px-5 py-4">
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
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/65 transition hover:bg-white/10 hover:text-white"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>

                    {(dispatchEstimate || dispatchEstimateBusy) ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
                        {dispatchEstimateBusy
                          ? "Estimating dispatch..."
                          : `Estimate: ${dispatchEstimate?.selectedRuns ?? 0} runs • ${dispatchEstimate?.estimatedTotalTokens ?? 0} tokens`}
                      </div>
                    ) : null}
                  </div>
                </div>

                {error ? (
                  <div className="mx-5 mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  <div className="space-y-4">
                    {selectedRuns.map((run) => {
                      const output = (run.outputText || "").trim();
                      const hasError = !!run.dispatchError?.trim();
                      return (
                        <div key={run.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.18)]">
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
                              <div className="whitespace-pre-wrap text-sm leading-7 text-white/80">{output}</div>
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
