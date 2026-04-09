import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Play, RefreshCcw, Rocket, Users2, XCircle } from "lucide-react";
import type { SquadSummary, SquadTask, SquadTaskSummary } from "@/lib/squads/api";

type SquadOpsModalProps = {
  open: boolean;
  squad: SquadSummary | null;
  tasks: SquadTaskSummary[];
  selectedTask: SquadTask | null;
  loading: boolean;
  refreshingTask: boolean;
  createBusy: boolean;
  dispatchBusy: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onSelectTask: (taskId: number) => void;
  onCreateTask: (payload: { title: string; prompt: string }) => void;
  onDispatchTask: (taskId: number, mode: "pending" | "retryFailed" | "redispatchAll") => void;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const normalizeStatus = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

const statusTone = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);
  if (["completed", "success", "done"].includes(normalized)) {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }
  if (["failed", "error", "cancelled"].includes(normalized)) {
    return "border-red-400/20 bg-red-500/10 text-red-100";
  }
  if (["running", "dispatching", "processing", "inprogress", "in_progress"].includes(normalized)) {
    return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
  }
  return "border-white/10 bg-white/5 text-white/70";
};

const statusLabel = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);
  if (!normalized) return "Draft";
  return normalized.replace(/_/g, " ");
};

const modeLabel = (mode: string | null | undefined) => {
  const normalized = (mode ?? "leader").trim();
  if (!normalized) return "Leader";
  return normalized.replace(/([a-z])([A-Z])/g, "$1 $2");
};

export function SquadOpsModal({
  open,
  squad,
  tasks,
  selectedTask,
  loading,
  refreshingTask,
  createBusy,
  dispatchBusy,
  error,
  onClose,
  onRefresh,
  onSelectTask,
  onCreateTask,
  onDispatchTask,
}: SquadOpsModalProps) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPrompt("");
  }, [open, squad?.id]);

  const submitDisabled = createBusy || !title.trim() || !prompt.trim() || !squad;
  const selectedTaskId = selectedTask?.id ?? null;
  const runSummary = useMemo(() => {
    const runs = selectedTask?.runs ?? [];
    return {
      total: runs.length,
      running: runs.filter((run) => ["running", "dispatching", "processing", "in_progress"].includes(normalizeStatus(run.status))).length,
      completed: runs.filter((run) => ["completed", "success", "done"].includes(normalizeStatus(run.status))).length,
      failed: runs.filter((run) => ["failed", "error", "cancelled"].includes(normalizeStatus(run.status))).length,
    };
  }, [selectedTask]);

  if (!open || !squad) return null;

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[30px] border border-cyan-500/20 bg-[#07090c] shadow-[0_40px_140px_rgba(0,0,0,0.78)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300/70">Squad Ops</div>
            <h2 className="mt-2 truncate text-2xl font-semibold text-white">{squad.name}</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/55">
              Create a task, dispatch the squad, and review each run from one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/15"
            >
              Close
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-r border-white/10 p-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-cyan-100">
                <Rocket className="h-4 w-4" />
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">Create task</div>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Write a clear title and explain what the squad should deliver.
              </p>
              <label className="mt-4 block text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">Task title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Review the landing page and suggest improvements"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/45"
              />
              <label className="mt-4 block text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">Instructions</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Explain the goal, expected output, tone, constraints, and who should focus on what."
                className="mt-2 min-h-[200px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/45"
              />
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-white/45">
                Good prompt example: “Audit the landing page. CRO focuses on conversion issues, content agent rewrites copy, and design agent lists layout fixes. Return a concise prioritized plan.”
              </div>
              <button
                type="button"
                disabled={submitDisabled}
                onClick={() => onCreateTask({ title: title.trim(), prompt: prompt.trim() })}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Play className="h-4 w-4" />
                {createBusy ? "Creating task..." : "Create task"}
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Recent tasks</div>
                  <div className="mt-1 text-xs text-white/35">Pick one to inspect runs and dispatch actions.</div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">{tasks.length}</div>
              </div>
              <div className="mt-4 space-y-2">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/35">
                    Loading tasks...
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/35">
                    No tasks yet for this squad.
                  </div>
                ) : (
                  tasks.map((task) => {
                    const active = task.id === selectedTaskId;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onSelectTask(task.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-cyan-300/35 bg-cyan-500/10 text-white"
                            : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{task.title}</div>
                            <div className="mt-1 text-xs text-white/40">{formatDateTime(task.createdDate)}</div>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${statusTone(task.status)}`}>
                            {statusLabel(task.status)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-white/45">
                          <span>{modeLabel(task.executionMode)}</span>
                          <span>{task.runCount} runs</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto p-5">
            {!selectedTask ? (
              <div className="flex h-full min-h-[520px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 px-8 text-center">
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 p-4 text-cyan-100">
                  <Rocket className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">Choose a task to continue</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/45">
                  After you select a task, you will see run status, agent responses, and dispatch actions here.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Selected task</div>
                      <h3 className="mt-2 text-xl font-semibold text-white">{selectedTask.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/45">
                        <span>{modeLabel(selectedTask.executionMode)}</span>
                        <span>•</span>
                        <span>{selectedTask.runs.length} runs</span>
                        <span>•</span>
                        <span>{formatDateTime(selectedTask.createdDate)}</span>
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] ${statusTone(selectedTask.status)}`}>
                      {statusLabel(selectedTask.status)}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/75">
                    {selectedTask.prompt || "No instructions were provided for this task."}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Users2 className="h-4 w-4" />
                        Total runs
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">{runSummary.total}</div>
                    </div>
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                      <div className="flex items-center gap-2 text-xs text-cyan-100/70">
                        <Clock3 className="h-4 w-4" />
                        Running
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-cyan-50">{runSummary.running}</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
                      <div className="flex items-center gap-2 text-xs text-emerald-100/70">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-emerald-50">{runSummary.completed}</div>
                    </div>
                    <div className="rounded-2xl border border-red-400/15 bg-red-500/10 p-4">
                      <div className="flex items-center gap-2 text-xs text-red-100/70">
                        <XCircle className="h-4 w-4" />
                        Failed
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-red-50">{runSummary.failed}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <button
                      type="button"
                      disabled={dispatchBusy}
                      onClick={() => onDispatchTask(selectedTask.id, "pending")}
                      className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-left text-sm text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <div className="font-medium">Dispatch pending runs</div>
                      <div className="mt-1 text-xs text-cyan-100/65">Only sends runs that are still waiting.</div>
                    </button>
                    <button
                      type="button"
                      disabled={dispatchBusy}
                      onClick={() => onDispatchTask(selectedTask.id, "retryFailed")}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/75 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <div className="font-medium">Retry failed runs</div>
                      <div className="mt-1 text-xs text-white/45">Only retries runs that finished with an error.</div>
                    </button>
                    <button
                      type="button"
                      disabled={dispatchBusy}
                      onClick={() => onDispatchTask(selectedTask.id, "redispatchAll")}
                      className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <div className="font-medium">Redispatch all runs</div>
                      <div className="mt-1 text-xs text-amber-100/65">Sends the full task again to every run.</div>
                    </button>
                  </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Agent runs</div>
                      <div className="mt-1 text-xs text-white/35">{refreshingTask ? "Refreshing task details..." : "Review what each agent produced."}</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">{selectedTask.runs.length}</div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedTask.runs.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/35">
                        This task does not have runs yet.
                      </div>
                    ) : (
                      selectedTask.runs.map((run) => (
                        <article key={run.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">{run.agentName}</div>
                              <div className="mt-1 text-xs text-white/40">{run.role || run.agentSlug || `Agent #${run.agentId}`}</div>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${statusTone(run.status)}`}>
                              {statusLabel(run.status || "pending")}
                            </span>
                          </div>

                          {run.dispatchError ? (
                            <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                              {run.dispatchError}
                            </div>
                          ) : null}

                          <div className="mt-3 grid gap-3 text-xs text-white/45 sm:grid-cols-3">
                            <div>
                              <div className="text-white/35">Started</div>
                              <div className="mt-1 text-white/70">{formatDateTime(run.startedAtUtc)}</div>
                            </div>
                            <div>
                              <div className="text-white/35">Finished</div>
                              <div className="mt-1 text-white/70">{formatDateTime(run.finishedAtUtc)}</div>
                            </div>
                            <div>
                              <div className="text-white/35">Session</div>
                              <div className="mt-1 break-all text-white/70">{run.externalSessionKey || "—"}</div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-6 text-white/75">
                            {run.outputText?.trim() || "No final response yet for this run."}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              </div>
            )}
          </main>

          {error ? (
            <div className="border-t border-red-500/20 bg-red-500/8 px-6 py-4 text-sm text-red-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
