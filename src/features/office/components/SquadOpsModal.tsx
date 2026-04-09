import { useEffect, useMemo, useState } from "react";
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
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const statusTone = (status: string | null | undefined) => {
  const normalized = (status ?? "").toLowerCase();
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
      running: runs.filter((run) => ["running", "dispatching", "processing", "in_progress"].includes(run.status.toLowerCase())).length,
      completed: runs.filter((run) => ["completed", "success", "done"].includes(run.status.toLowerCase())).length,
      failed: runs.filter((run) => ["failed", "error", "cancelled"].includes(run.status.toLowerCase())).length,
    };
  }, [selectedTask]);

  if (!open || !squad) return null;

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#07090c] shadow-[0_40px_140px_rgba(0,0,0,0.78)]">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300/70">Squad ops</div>
            <h2 className="mt-2 truncate text-2xl font-semibold text-white">{squad.name}</h2>
            <p className="mt-2 text-sm text-white/50">
              Crie uma task, dispare os sub-agents do squad e acompanhe o status de cada run sem sair do office.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/15"
            >
              Fechar
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[360px_minmax(0,1fr)_420px]">
          <aside className="min-h-0 overflow-y-auto border-r border-white/10 p-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Nova task</div>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Revisar landing page e apontar melhorias"
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/45"
              />
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Descreva o que os agentes precisam fazer, o que deve ser entregue e o tom esperado."
                className="mt-3 min-h-[180px] w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/45"
              />
              <button
                type="button"
                disabled={submitDisabled}
                onClick={() => onCreateTask({ title: title.trim(), prompt: prompt.trim() })}
                className="mt-3 w-full rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {createBusy ? "Criando task..." : "Criar task do squad"}
              </button>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Tasks recentes</div>
                <div className="text-xs text-white/35">{tasks.length}</div>
              </div>
              <div className="mt-3 space-y-2">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/35">
                    Carregando tasks...
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/35">
                    Nenhuma task criada ainda para esse squad.
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
                            {task.status || "draft"}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-white/45">
                          <span>{task.executionMode || "leader"}</span>
                          <span>{task.runCount} runs</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto border-r border-white/10 p-5">
            {!selectedTask ? (
              <div className="flex h-full min-h-[360px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 text-center text-sm text-white/40">
                Selecione uma task para ver os runs e disparar os sub-agents.
              </div>
            ) : (
              <div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Task selecionada</div>
                      <h3 className="mt-2 text-xl font-semibold text-white">{selectedTask.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/45">
                        <span>{selectedTask.executionMode || "leader"}</span>
                        <span>•</span>
                        <span>{selectedTask.runs.length} runs</span>
                        <span>•</span>
                        <span>{formatDateTime(selectedTask.createdDate)}</span>
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] ${statusTone(selectedTask.status)}`}>
                      {selectedTask.status || "draft"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/75">
                    {selectedTask.prompt || "Sem prompt informado."}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-white/40">Total</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{runSummary.total}</div>
                    </div>
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                      <div className="text-xs text-cyan-100/70">Em andamento</div>
                      <div className="mt-2 text-2xl font-semibold text-cyan-50">{runSummary.running}</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
                      <div className="text-xs text-emerald-100/70">Concluídos</div>
                      <div className="mt-2 text-2xl font-semibold text-emerald-50">{runSummary.completed}</div>
                    </div>
                    <div className="rounded-2xl border border-red-400/15 bg-red-500/10 p-4">
                      <div className="text-xs text-red-100/70">Falharam</div>
                      <div className="mt-2 text-2xl font-semibold text-red-50">{runSummary.failed}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={dispatchBusy}
                      onClick={() => onDispatchTask(selectedTask.id, "pending")}
                      className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {dispatchBusy ? "Disparando..." : "Dispatch pending"}
                    </button>
                    <button
                      type="button"
                      disabled={dispatchBusy}
                      onClick={() => onDispatchTask(selectedTask.id, "retryFailed")}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Retry failed
                    </button>
                    <button
                      type="button"
                      disabled={dispatchBusy}
                      onClick={() => onDispatchTask(selectedTask.id, "redispatchAll")}
                      className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Redispatch all
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Runs por agent</div>
                    <div className="text-xs text-white/35">{refreshingTask ? "Atualizando..." : `${selectedTask.runs.length} itens`}</div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedTask.runs.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/35">
                        Essa task ainda não gerou runs.
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
                              {run.status || "pending"}
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
                            {run.outputText?.trim() || "Sem resposta final ainda para esse run."}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>

          <aside className="min-h-0 overflow-y-auto p-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Resumo do squad</div>
              <div className="mt-3 text-lg font-semibold text-white">{squad.name}</div>
              <div className="mt-2 text-sm text-white/60">{squad.description || "Sem descrição informada."}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                  {squad.executionMode}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  {squad.members.length} membros
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Membros</div>
              <div className="mt-4 space-y-2">
                {squad.members.map((member) => (
                  <div key={`${member.backendAgentId ?? "na"}-${member.gatewayAgentId ?? member.name}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-white">{member.name}</div>
                      <div className="mt-1 text-xs text-white/40">{member.gatewayAgentId || member.backendAgentId || "No gateway id"}</div>
                    </div>
                    {member.isLeader ? (
                      <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-100">
                        Leader
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}
