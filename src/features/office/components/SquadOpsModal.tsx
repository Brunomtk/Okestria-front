"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, Play, RefreshCcw, X, XCircle } from "lucide-react";
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
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[820px] w-full max-w-[1320px] overflow-hidden rounded-[28px] border border-white/10 bg-[#040b16] shadow-2xl">
        <div className="flex w-[340px] flex-col border-r border-white/10 bg-[#050b18]">
          <div className="flex items-center justify-between px-5 py-5">
            <div>
              <div className="text-3xl font-semibold text-white">{squad?.name ?? "Squad Ops"}</div>
              <div className="text-sm text-white/35">{squad?.members.length ?? 0} members • leader mode</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onRefresh} className="rounded-xl border border-white/10 p-3 text-white/55 transition hover:bg-white/5">
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button type="button" onClick={onClose} className="rounded-xl border border-white/10 p-3 text-white/55 transition hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-y border-emerald-400/10 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-200/90">{hooksMessage ?? "Runtime status unavailable."}</div>

          <div className="border-b border-white/10 px-5 py-4">
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/35">Squad</label>
            <select
              value={selectedSquadId ?? ""}
              onChange={(event) => onSelectSquad(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none"
            >
              {squads.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-b border-white/10 px-5 py-4">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/35">New task</div>
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25" />
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Task instructions" className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25" />
              <select value={preferredModel} onChange={(e) => setPreferredModel(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none">
                <option value="">Default model</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>{model.label}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={createBusy || !title.trim() || !prompt.trim()}
                onClick={() => onCreateTask({ title: title.trim(), prompt: prompt.trim(), preferredModel: preferredModel || null })}
                className="w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createBusy ? "Creating..." : "Create task"}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="mb-2 px-2 text-xs uppercase tracking-[0.2em] text-white/35">Tasks ({tasks.length})</div>
            <div className="space-y-2">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${selectedTask?.id === task.id ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-semibold text-white">{task.title}</div>
                      <div className="mt-1 text-xs text-white/35">{fmtDate(task.createdDate)} • {task.runCount} runs</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone(task.status)}`}>{task.status || "draft"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {!selectedTask ? (
            <div className="flex h-full items-center justify-center text-white/35">Select a task to inspect runs and output.</div>
          ) : (
            <>
              <div className="border-b border-white/10 px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-4xl font-semibold text-white">{selectedTask.title}</div>
                    <div className="mt-2 text-sm text-white/35">{selectedTask.executionMode} • {fmtDate(selectedTask.createdDate)} • {selectedTask.preferredModel || "default model"}</div>
                  </div>
                  <span className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${statusTone(selectedTask.status)}`}>{selectedTask.status || "draft"}</span>
                </div>
                <div className="mt-5 whitespace-pre-wrap rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-4 text-lg leading-8 text-white/80">{selectedTask.prompt}</div>
              </div>

              <div className="grid grid-cols-4 gap-4 px-6 py-5">
                <StatCard label="TOTAL" value={stats.total} />
                <StatCard label="RUNNING" value={stats.running} accent="cyan" />
                <StatCard label="DONE" value={stats.done} accent="emerald" />
                <StatCard label="FAILED" value={stats.failed} accent="red" />
              </div>

              <div className="flex items-center gap-3 px-6 pb-5">
                <ActionButton busy={dispatchBusy && dispatchApprovalMode === "pending"} onClick={() => dispatchApprovalMode === "pending" ? onConfirmDispatchTask(selectedTask.id, "pending") : onPreviewDispatchTask(selectedTask.id, "pending")}>
                  <Play className="h-4 w-4" />
                  {dispatchApprovalMode === "pending" ? "Confirm dispatch" : "Dispatch pending"}
                </ActionButton>
                <ActionButton busy={dispatchBusy && dispatchApprovalMode === "retryFailed"} onClick={() => dispatchApprovalMode === "retryFailed" ? onConfirmDispatchTask(selectedTask.id, "retryFailed") : onPreviewDispatchTask(selectedTask.id, "retryFailed")}>
                  <RefreshCcw className="h-4 w-4" />
                  {dispatchApprovalMode === "retryFailed" ? "Confirm retry" : "Retry failed"}
                </ActionButton>
                <ActionButton busy={dispatchBusy && dispatchApprovalMode === "redispatchAll"} onClick={() => dispatchApprovalMode === "redispatchAll" ? onConfirmDispatchTask(selectedTask.id, "redispatchAll") : onPreviewDispatchTask(selectedTask.id, "redispatchAll")}>
                  <Loader2 className="h-4 w-4" />
                  {dispatchApprovalMode === "redispatchAll" ? "Confirm redispatch" : "Redispatch all"}
                </ActionButton>
                {dispatchApprovalMode ? (
                  <button type="button" onClick={onCancelDispatchApproval} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:bg-white/5">Cancel</button>
                ) : null}
                {(dispatchEstimate || dispatchEstimateBusy) ? (
                  <div className="ml-auto rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/55">
                    {dispatchEstimateBusy ? "Estimating dispatch..." : `Estimate: ${dispatchEstimate?.selectedRuns ?? 0} runs • ${dispatchEstimate?.estimatedTotalTokens ?? 0} tokens`}
                  </div>
                ) : null}
              </div>

              {error ? <div className="mx-6 mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
                <div className="space-y-4">
                  {selectedRuns.map((run) => {
                    const output = (run.outputText || "").trim();
                    const hasError = !!run.dispatchError?.trim();
                    return (
                      <div key={run.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-2xl font-semibold text-white">{run.agentName}</div>
                            <div className="mt-1 text-sm text-white/35">{run.role || run.agentSlug || "Agent run"}</div>
                          </div>
                          <span className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${statusTone(run.status)}`}>{run.status || "pending"}</span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-white/45">
                          <div>Started<br /><span className="text-white/80">{fmtDate(run.startedAtUtc)}</span></div>
                          <div>Finished<br /><span className="text-white/80">{fmtDate(run.finishedAtUtc)}</span></div>
                          <div>Session<br /><span className="break-all text-white/80">{run.externalSessionKey || "—"}</span></div>
                        </div>
                        {hasError ? <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{run.dispatchError}</div> : null}
                        {output ? <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/80">{output}</div> : null}
                        {!output && !hasError ? (
                          <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200/90">Agent is working...</div>
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
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: "cyan" | "emerald" | "red" }) {
  const tone = accent === "cyan"
    ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
    : accent === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : accent === "red"
        ? "border-red-400/20 bg-red-500/10 text-red-200"
        : "border-white/10 bg-white/[0.03] text-white";
  return (
    <div className={`rounded-3xl border p-6 ${tone}`}>
      <div className="text-4xl font-semibold">{value}</div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{label}</div>
    </div>
  );
}

function ActionButton({ children, busy, onClick }: { children: ReactNode; busy?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60">
      <span className="inline-flex items-center gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{children}</span>
    </button>
  );
}
