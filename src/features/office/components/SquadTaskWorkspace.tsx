"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, MessageSquareText, Users } from "lucide-react";
import type { SquadSummary, SquadTask, SquadTaskRun, SquadTaskSummary } from "@/lib/squads/api";

type SquadTaskWorkspaceProps = {
  squad?: SquadSummary | null;
  tasks: SquadTaskSummary[];
  selectedTask: SquadTask | null;
  selectedTaskId?: number | null;
  loading?: boolean;
  refreshingTask?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  taskListLabel?: string;
  onSelectTask?: (taskId: number) => void;
  topActions?: ReactNode;
  className?: string;
  compact?: boolean;
};

const normalize = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const getTaskStatusTone = (value: string | null | undefined) => {
  const status = normalize(value);
  if (["completed", "done", "success"].includes(status)) {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  }
  if (["failed", "error", "cancelled"].includes(status)) {
    return "border-red-400/20 bg-red-500/10 text-red-200";
  }
  if (["running", "queued", "pending", "dispatching", "processing", "in_progress"].includes(status)) {
    return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
  }
  return "border-white/10 bg-white/[0.04] text-white/70";
};

const deriveTaskStats = (task: SquadTask | null) => {
  const runs = task?.runs ?? [];
  return {
    total: runs.length,
    running: runs.filter((run) => ["running", "queued", "pending", "dispatching", "processing", "in_progress"].includes(normalize(run.status))).length,
    completed: runs.filter((run) => ["completed", "done", "success"].includes(normalize(run.status))).length,
    failed: runs.filter((run) => ["failed", "error", "cancelled"].includes(normalize(run.status))).length,
  };
};

const chooseInitialRun = (task: SquadTask | null) => {
  if (!task || task.runs.length === 0) return null;
  return task.runs.find((run) => normalize(run.status) === "running")?.id
    ?? task.runs.find((run) => normalize(run.status) === "pending")?.id
    ?? task.runs[0]?.id
    ?? null;
};

const buildRunTranscript = (task: SquadTask, run: SquadTaskRun | null) => {
  const output = run?.outputText?.trim() ?? "";
  if (output) return output;

  const relevantMessages = task.messages.filter((message) => {
    if (run?.agentId && message.authorId === run.agentId) return true;
    const authorName = message.authorName?.trim().toLowerCase() ?? "";
    const runName = run?.agentName?.trim().toLowerCase() ?? "";
    return Boolean(authorName && runName && authorName === runName);
  });

  const combined = relevantMessages
    .map((message) => {
      const author = message.authorName?.trim() || message.role || "system";
      const content = message.content?.trim() || "";
      return content ? `${author}\n${content}` : null;
    })
    .filter((entry): entry is string => Boolean(entry))
    .join("\n\n");

  if (combined) return combined;
  return task.finalResponse?.trim() || task.summary?.trim() || "";
};

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-2xl font-semibold text-white">{value}</div>
        <div className="text-white/55">{icon}</div>
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</div>
    </div>
  );
}

export function SquadTaskWorkspace({
  squad,
  tasks,
  selectedTask,
  selectedTaskId,
  loading = false,
  refreshingTask = false,
  emptyTitle = "No squad task selected",
  emptyDescription = "Create a task or pick one from the list to inspect the execution.",
  taskListLabel = "Tasks",
  onSelectTask,
  topActions,
  className,
  compact = false,
}: SquadTaskWorkspaceProps) {
  const [selectedRunIdByTaskId, setSelectedRunIdByTaskId] = useState<Record<number, number | null>>({});

  useEffect(() => {
    if (!selectedTask) return;
    setSelectedRunIdByTaskId((current) => {
      if (selectedTask.id in current) return current;
      return {
        ...current,
        [selectedTask.id]: chooseInitialRun(selectedTask),
      };
    });
  }, [selectedTask]);

  const taskStats = useMemo(() => deriveTaskStats(selectedTask), [selectedTask]);
  const activeRunId = selectedTask ? selectedRunIdByTaskId[selectedTask.id] ?? chooseInitialRun(selectedTask) : null;
  const activeRun = selectedTask?.runs.find((run) => run.id === activeRunId) ?? selectedTask?.runs[0] ?? null;
  const activeTranscript = selectedTask && activeRun ? buildRunTranscript(selectedTask, activeRun) : selectedTask?.finalResponse?.trim() || selectedTask?.summary?.trim() || "";
  const promptText = selectedTask?.prompt?.trim() || "";
  const finalText = selectedTask?.finalResponse?.trim() || selectedTask?.summary?.trim() || "";
  const wrapperClassName = className ?? "flex min-h-0 flex-1 flex-col";

  return (
    <div className={wrapperClassName}>
      <div className="rounded-[28px] border border-white/10 bg-[#051b24]/90 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
        <div className="border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">{taskListLabel}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-white">
                  <span className="truncate text-xl font-semibold">{squad?.name ?? "Squad workspace"}</span>
                  {selectedTask ? (
                    <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${getTaskStatusTone(selectedTask.status)}`}>
                      {selectedTask.status || "pending"}
                    </span>
                  ) : null}
                </div>
              </div>
              {topActions ? <div className="flex flex-wrap items-center gap-2">{topActions}</div> : null}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/45">
                  No tasks yet.
                </div>
              ) : (
                tasks.map((task) => {
                  const active = (selectedTaskId ?? selectedTask?.id ?? null) === task.id;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onSelectTask?.(task.id)}
                      className={`min-w-[210px] rounded-[22px] border px-4 py-3 text-left transition ${
                        active
                          ? "border-cyan-400/35 bg-cyan-500/12"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="truncate font-semibold text-white">{task.title || `Task ${task.id}`}</div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-white/55">
                        <span className={`rounded-full border px-2 py-0.5 font-mono uppercase tracking-[0.14em] ${getTaskStatusTone(task.status)}`}>
                          {task.status || "pending"}
                        </span>
                        <span>{task.runCount} runs</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {(loading || refreshingTask) && tasks.length > 0 ? (
          <div className="border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-medium text-cyan-100">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing squad task...
            </div>
          </div>
        ) : null}

        {!selectedTask ? (
          <div className="px-5 py-16 text-center sm:px-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/50">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <div className="mt-4 text-xl font-semibold text-white">{emptyTitle}</div>
            <div className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-white/50">{emptyDescription}</div>
          </div>
        ) : (
          <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
            <div className={`grid gap-3 ${compact ? "grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
              <StatCard label="Members" value={taskStats.total} icon={<Users className="h-5 w-5" />} />
              <StatCard label="Running" value={taskStats.running} icon={<Clock3 className="h-5 w-5" />} />
              <StatCard label="Completed" value={taskStats.completed} icon={<CheckCircle2 className="h-5 w-5" />} />
              <StatCard label="Failed" value={taskStats.failed} icon={<AlertTriangle className="h-5 w-5" />} />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-5">
                <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-xl font-semibold text-white">{selectedTask.title || `Task ${selectedTask.id}`}</div>
                    <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${getTaskStatusTone(selectedTask.status)}`}>
                      {selectedTask.status || "pending"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-white/55 md:grid-cols-2">
                    <InfoCard label="Execution mode" value={selectedTask.executionMode || squad?.executionMode || "leader"} />
                    <InfoCard label="Model" value={selectedTask.preferredModel || "Default squad model"} />
                    <InfoCard label="Started" value={formatDate(selectedTask.startedAtUtc || selectedTask.createdDate)} />
                    <InfoCard label="Finished" value={formatDate(selectedTask.finishedAtUtc)} />
                  </div>
                </section>

                <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Prompt</div>
                  <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-white/82">
                    {promptText || "No prompt recorded for this task yet."}
                  </div>
                </section>

                <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Task events</div>
                  {selectedTask.events.length === 0 ? (
                    <div className="mt-3 text-sm text-white/45">No events recorded yet.</div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {selectedTask.events.map((event) => (
                        <div key={event.id} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium text-white">{event.message || event.type || `Event ${event.id}`}</div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">{formatDate(event.createdDate)}</div>
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.14em] text-white/40">{event.level || "info"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="space-y-5">
                <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Agent sessions</div>
                      <div className="mt-1 text-sm text-white/50">Switch between member outputs from this task.</div>
                    </div>
                    <div className="text-sm text-white/40">{selectedTask.runs.length} session{selectedTask.runs.length === 1 ? "" : "s"}</div>
                  </div>

                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {selectedTask.runs.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-3 text-sm text-white/45">
                        No member sessions yet.
                      </div>
                    ) : (
                      selectedTask.runs.map((run) => {
                        const active = activeRun?.id === run.id;
                        return (
                          <button
                            key={run.id}
                            type="button"
                            onClick={() => {
                              setSelectedRunIdByTaskId((current) => ({
                                ...current,
                                [selectedTask.id]: run.id,
                              }));
                            }}
                            className={`min-w-[200px] rounded-[20px] border px-4 py-3 text-left transition ${
                              active
                                ? "border-cyan-400/35 bg-cyan-500/12"
                                : "border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="truncate font-semibold text-white">{run.agentName || `Agent ${run.agentId}`}</div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${getTaskStatusTone(run.status)}`}>
                                {run.status || "pending"}
                              </span>
                              <span className="text-xs text-white/35">#{run.id}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {activeRun ? (
                    <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-white">{activeRun.agentName || `Agent ${activeRun.agentId}`}</div>
                          <div className="mt-1 text-sm text-white/45">{activeRun.role || activeRun.agentSlug || "Squad member"}</div>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${getTaskStatusTone(activeRun.status)}`}>
                          {activeRun.status || "pending"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <InfoCard label="Session key" value={activeRun.externalSessionKey || "—"} mono />
                        <InfoCard label="Run id" value={activeRun.externalRunId || String(activeRun.id)} mono />
                        <InfoCard label="Started" value={formatDate(activeRun.startedAtUtc)} />
                        <InfoCard label="Finished" value={formatDate(activeRun.finishedAtUtc)} />
                      </div>

                      {activeRun.dispatchError?.trim() ? (
                        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                          {activeRun.dispatchError}
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-[20px] border border-white/10 bg-[#03151d] px-4 py-4">
                        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Session output</div>
                        <div className="whitespace-pre-wrap break-words text-sm leading-7 text-white/82">
                          {activeTranscript || "No synced output for this member yet."}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Final response</div>
                  <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-white/82">
                    {finalText || "This task does not have a final response yet."}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className={`mt-1 text-white/82 ${mono ? "break-all font-mono text-[12px]" : "text-sm"}`}>{value}</div>
    </div>
  );
}
