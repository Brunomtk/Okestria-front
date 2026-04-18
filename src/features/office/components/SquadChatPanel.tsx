"use client";

import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronRight, Loader2, RefreshCcw, Send, Users2 } from "lucide-react";
import type { SquadSummary, SquadTask } from "@/lib/squads/api";
import { fetchSquadTask, fetchSquadTasks } from "@/lib/squads/api";
import { isNearBottom } from "@/lib/dom";

type SquadChatPanelProps = {
  squad: SquadSummary;
  activeTaskId?: number | null;
  taskCache?: SquadTask[];
  onTaskFocusChange?: (taskId: number | null) => void;
  onSendMessage?: (squad: SquadSummary, message: string) => void;
  onOpenOps?: (squadId: string) => void;
};

const fmtDate = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const normalize = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();
const isRunning = (value: string | null | undefined) => ["running", "queued", "pending", "dispatching", "processing", "in_progress"].includes(normalize(value));
const isFailed = (value: string | null | undefined) => ["failed", "error", "cancelled"].includes(normalize(value));

function SquadChatPanelInner({ squad, activeTaskId, taskCache, onTaskFocusChange, onSendMessage, onOpenOps }: SquadChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [tasks, setTasks] = useState<SquadTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const squadId = Number(squad.id);
      const summaries = await fetchSquadTasks(Number.isFinite(squadId) ? { squadId } : undefined);
      const detailed = await Promise.all(summaries.slice(0, 20).map((entry) => fetchSquadTask(entry.id)));
      setTasks(detailed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load squad tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
    const timer = window.setInterval(() => {
      void loadTasks();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [squad.id]);

  const visibleTasks = useMemo(() => {
    const merged = new Map<number, SquadTask>();
    for (const entry of taskCache ?? []) {
      if (entry.squadId === Number(squad.id)) {
        merged.set(entry.id, entry);
      }
    }
    for (const entry of tasks) {
      merged.set(entry.id, entry);
    }
    return Array.from(merged.values()).sort((a, b) => b.id - a.id);
  }, [squad.id, taskCache, tasks]);

  const resolvedActiveTask = useMemo(() => {
    if (typeof activeTaskId === "number" && Number.isFinite(activeTaskId)) {
      return visibleTasks.find((task) => task.id === activeTaskId) ?? null;
    }
    return visibleTasks[0] ?? null;
  }, [activeTaskId, visibleTasks]);

  useEffect(() => {
    const nextTaskId = resolvedActiveTask?.id ?? null;
    if (nextTaskId !== (activeTaskId ?? null)) {
      onTaskFocusChange?.(nextTaskId);
    }
  }, [activeTaskId, onTaskFocusChange, resolvedActiveTask]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || !isNearBottom(node, 140)) return;
    node.scrollTop = node.scrollHeight;
  }, [resolvedActiveTask, visibleTasks, loading]);

  const send = () => {
    const message = draft.trim();
    if (!message) return;
    onSendMessage?.(squad, message);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-[#120c08]">
      <div className="flex w-[320px] min-w-[280px] max-w-[360px] flex-col border-r border-white/10 bg-black/20">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#8f84ff]">
              <Users2 className="h-3.5 w-3.5" />
              <span>Squad</span>
            </div>
            <div className="mt-1 truncate text-xl font-semibold text-white">{squad.name}</div>
            <div className="text-xs text-white/45">{squad.members.length} members • task sessions</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65 transition hover:bg-white/5"
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </span>
            </button>
            {onOpenOps ? (
              <button
                type="button"
                onClick={() => onOpenOps(squad.id)}
                className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Ops
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {error ? <div className="mb-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
          {visibleTasks.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/35">
              No squad task sessions yet.
            </div>
          ) : null}
          <div className="space-y-2">
            {visibleTasks.map((task) => {
              const selected = resolvedActiveTask?.id === task.id;
              const latestRun = task.runs[0] ?? null;
              const sessionKey = latestRun?.externalSessionKey?.trim() ?? "";
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onTaskFocusChange?.(task.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-[#8f84ff]/45 bg-[#221936]" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{task.title || `Task #${task.id}`}</div>
                      <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">{task.prompt || "No prompt"}</div>
                    </div>
                    <ChevronRight className={`mt-0.5 h-4 w-4 flex-none ${selected ? "text-[#b4acff]" : "text-white/25"}`} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-white/35">
                    <span>{task.status || "pending"}</span>
                    <span>#{task.id}</span>
                  </div>
                  {sessionKey ? <div className="mt-2 truncate font-mono text-[10px] text-cyan-200/75">{sessionKey}</div> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#8f84ff]">Task session</div>
              <div className="mt-1 truncate text-2xl font-semibold text-white">
                {resolvedActiveTask ? resolvedActiveTask.title || `Task #${resolvedActiveTask.id}` : "New squad task"}
              </div>
              <div className="mt-1 text-xs text-white/45">
                {resolvedActiveTask ? `${resolvedActiveTask.executionMode || squad.executionMode || "leader"} • ${fmtDate(resolvedActiveTask.createdDate)}` : "Send a message below to create and open a squad task session."}
              </div>
            </div>
            {resolvedActiveTask ? (
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                {resolvedActiveTask.status || "pending"}
              </div>
            ) : null}
          </div>
        </div>

        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {!resolvedActiveTask ? (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-white/35">
              Create a squad task to open its session here.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="ml-auto max-w-[78%] rounded-[24px] border border-[#4b3b86]/35 bg-[#1a1326] px-5 py-4 text-sm text-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
                <div className="text-base font-semibold text-white">{resolvedActiveTask.title}</div>
                {resolvedActiveTask.prompt ? <div className="mt-2 whitespace-pre-wrap leading-7 text-white/72">{resolvedActiveTask.prompt}</div> : null}
                <div className="mt-3 text-xs text-white/30">{fmtDate(resolvedActiveTask.createdDate)}</div>
              </div>

              {resolvedActiveTask.runs.length === 0 ? (
                <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200/90">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing the squad task session...
                  </span>
                </div>
              ) : (
                resolvedActiveTask.runs.map((run) => {
                  const result = (run.outputText || "").trim();
                  const sessionKey = run.externalSessionKey?.trim() ?? "";
                  return (
                    <div key={run.id} className="space-y-3">
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">{run.agentName || "Squad agent"}</div>
                            <div className="text-xs text-white/35">{run.role || resolvedActiveTask.executionMode || "Task execution"}</div>
                            {sessionKey ? <div className="mt-2 truncate font-mono text-[11px] text-cyan-200/75">{sessionKey}</div> : null}
                          </div>
                          <div className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${isFailed(run.status) ? "border-red-400/25 bg-red-500/10 text-red-200" : "border-white/10 bg-white/5 text-white/55"}`}>
                            {run.status || resolvedActiveTask.status || "pending"}
                          </div>
                        </div>

                        {result ? (
                          <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm leading-7 text-white/80">{result}</div>
                        ) : isFailed(run.status) ? (
                          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">
                            {run.dispatchError?.trim() || "This run failed before a response was synced."}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200/90">
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              This task session is running now...
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-end gap-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Create a new squad task and open its session..."
              className="min-h-[72px] flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/25"
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              className="rounded-full border border-[#4b3b86]/45 bg-[#1b1327] p-3 text-white transition hover:bg-[#241935] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SquadChatPanel = memo(SquadChatPanelInner);
