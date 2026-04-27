"use client";

import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronRight, Loader2, RefreshCcw, Send, Sparkles, Users2 } from "lucide-react";
import type { SquadSummary, SquadTask } from "@/lib/squads/api";
import { ackSquadTaskRender, fetchSquadTask, fetchSquadTasks } from "@/lib/squads/api";
import { isNearBottom } from "@/lib/dom";

type SquadTaskSessionFeedMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestampMs: number;
};

type SquadChatPanelProps = {
  squad: SquadSummary;
  activeTaskId?: number | null;
  activeSessionKey?: string | null;
  sessionMessages?: SquadTaskSessionFeedMessage[];
  sessionLoading?: boolean;
  sessionError?: string | null;
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

function SquadChatPanelInner({ squad, activeTaskId, activeSessionKey, sessionMessages, sessionLoading, sessionError, taskCache, onTaskFocusChange, onSendMessage, onOpenOps }: SquadChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [tasks, setTasks] = useState<SquadTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // Track message IDs that have already been ACKed in this browser session to
  // avoid hammering the backend with duplicate render-acks when the polling
  // cycle re-renders the same message. The backend is idempotent, but we still
  // want to be a good citizen.
  const ackedMessageIdsRef = useRef<Set<number>>(new Set());

  // ---------------------------------------------------------------
  // v58 perf: the old poll loop fired every 3s and fanned out into
  // N + 1 GETs (list + up to 20 /SquadExecutions/{id} details).
  // That hammered the backend at ~7 requests/second per mounted panel
  // and turned the office scene into a slideshow. We now:
  //   • poll every 15s instead of 3s
  //   • pause the polling entirely while the tab is hidden
  //   • only re-fetch detail for tasks whose summary status/updated
  //     date actually changed since the last poll (delta-fetch)
  //   • keep a manual refresh path so the user can still force refresh
  // ---------------------------------------------------------------
  const POLL_INTERVAL_MS = 15_000;
  const taskSignatureRef = useRef<Map<number, string>>(new Map());
  const computeSignature = (summary: { id: number; status?: string | null; updatedDate?: string | null }) =>
    `${summary.status ?? ""}|${summary.updatedDate ?? ""}`;

  const loadTasks = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const squadId = Number(squad.id);
      const summaries = await fetchSquadTasks(Number.isFinite(squadId) ? { squadId } : undefined);
      // Only hit /SquadExecutions/{id} for tasks whose summary changed
      // since last poll (or on the very first load / manual refresh).
      const selected = summaries.slice(0, 20);
      const stale: typeof selected = [];
      const unchanged: typeof selected = [];
      for (const entry of selected) {
        const sig = computeSignature(entry);
        const prev = taskSignatureRef.current.get(entry.id);
        if (force || prev !== sig) {
          stale.push(entry);
        } else {
          unchanged.push(entry);
        }
        taskSignatureRef.current.set(entry.id, sig);
      }
      const refreshed = await Promise.all(
        stale.map(async (entry) => {
          try {
            return await fetchSquadTask(entry.id);
          } catch {
            return null;
          }
        }),
      );
      setTasks((current) => {
        const byId = new Map(current.map((t) => [t.id, t]));
        for (const task of refreshed) if (task) byId.set(task.id, task);
        // Drop tasks that no longer appear in the summary list.
        const keep = new Set(selected.map((s) => s.id));
        const next: SquadTask[] = [];
        for (const id of keep) {
          const found = byId.get(id);
          if (found) next.push(found);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load squad tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset delta cache whenever we switch squads.
    taskSignatureRef.current = new Map();
    void loadTasks(true);
    let timer: number | null = null;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void loadTasks();
    };
    timer = window.setInterval(tick, POLL_INTERVAL_MS);
    const onVis = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void loadTasks();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }
    return () => {
      if (timer) window.clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
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


  const timelineMessages = useMemo(() => {
    if (!resolvedActiveTask) return [] as Array<{ id: string; role: "user" | "assistant" | "system"; text: string; timestampMs: number }>;

    const fromExecution = (resolvedActiveTask.messages ?? []).map((entry) => ({
      id: `msg-${entry.id}`,
      role: entry.role === "assistant" ? "assistant" as const : entry.role === "user" ? "user" as const : "system" as const,
      text: entry.content,
      timestampMs: entry.createdDate ? new Date(entry.createdDate).getTime() : 0,
    }));

    const fromSession = (sessionMessages ?? []).map((entry) => ({
      id: `session-${entry.id}`,
      role: entry.role,
      text: entry.text,
      timestampMs: entry.timestampMs,
    }));

    const merged = [...fromExecution, ...fromSession]
      .filter((entry) => entry.text.trim().length > 0)
      .sort((a, b) => a.timestampMs - b.timestampMs);

    if (merged.length > 0) return merged;

    const synthetic = [];
    synthetic.push({
      id: `prompt-${resolvedActiveTask.id}`,
      role: "user" as const,
      text: resolvedActiveTask.prompt || "",
      timestampMs: resolvedActiveTask.createdDate ? new Date(resolvedActiveTask.createdDate).getTime() : 0,
    });

    const finalText = (resolvedActiveTask.finalResponse || resolvedActiveTask.summary || "").trim();
    if (finalText) {
      synthetic.push({
        id: `final-${resolvedActiveTask.id}`,
        role: "assistant" as const,
        text: finalText,
        timestampMs: resolvedActiveTask.updatedDate ? new Date(resolvedActiveTask.updatedDate).getTime() : Date.now(),
      });
    }

    return synthetic.filter((entry) => entry.text.trim().length > 0);
  }, [resolvedActiveTask, sessionMessages]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || !isNearBottom(node, 140)) return;
    node.scrollTop = node.scrollHeight;
  }, [resolvedActiveTask, visibleTasks, loading]);

  // v9: ACK rendered assistant turns. We only ACK messages that are backed by
  // a real numeric id (i.e., came from the execution feed, not synthesized).
  // Each message is ACKed at most once per client session.
  useEffect(() => {
    if (!resolvedActiveTask) return;
    const taskId = resolvedActiveTask.id;
    const alreadyAckedHere =
      resolvedActiveTask.lastRenderedMessageId ?? 0;

    (resolvedActiveTask.messages ?? []).forEach((message) => {
      if (message.role !== "assistant") return;
      if (!message.content || !message.content.trim()) return;
      if (message.id <= 0) return;
      if (message.id <= alreadyAckedHere) return;
      if (ackedMessageIdsRef.current.has(message.id)) return;
      ackedMessageIdsRef.current.add(message.id);
      void ackSquadTaskRender(taskId, {
        messageId: message.id,
        renderedText: message.content,
        clientTurnId: `squadchat-${taskId}-${message.id}`,
      }).catch(() => {
        // Best-effort: if the ACK fails, drop it from the set so we can retry
        // on the next render loop.
        ackedMessageIdsRef.current.delete(message.id);
      });
    });
  }, [resolvedActiveTask]);

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
      {/* v90 — single-pane squad chat. The outer office sidebar already
          owns the agents/squads list, so we no longer ship a duplicated
          sidebar inside the panel. The active task is picked from one
          dropdown in the header. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#8f84ff]">
                <Users2 className="h-3.5 w-3.5" />
                <span>Squad · {squad.name}</span>
                <span className="text-white/30">·</span>
                <span className="text-white/45 normal-case tracking-normal">
                  {squad.members.length} members
                </span>
              </div>
              <div className="mt-1 truncate text-2xl font-semibold text-white">
                {resolvedActiveTask ? resolvedActiveTask.title || `Task #${resolvedActiveTask.id}` : "Pick a squad task"}
              </div>
              <div className="mt-1 text-xs text-white/45">
                {resolvedActiveTask
                  ? `${resolvedActiveTask.executionMode || squad.executionMode || "leader"} • ${fmtDate(resolvedActiveTask.createdDate)}`
                  : "Use Squad Ops to create a task — its session opens here."}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Single task selector — the only place to switch the
                  active task within this squad. */}
              {visibleTasks.length > 0 ? (
                <select
                  value={resolvedActiveTask?.id ?? ""}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) onTaskFocusChange?.(next);
                  }}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/85 outline-none transition hover:border-white/25 focus:border-white/40"
                  title="Choose which squad task to view"
                >
                  {visibleTasks.map((task) => {
                    const label = task.title?.trim()
                      ? task.title.trim()
                      : `Task #${task.id}`;
                    const status = task.status?.trim() || "pending";
                    return (
                      <option key={task.id} value={task.id}>
                        {label} — {status}
                      </option>
                    );
                  })}
                </select>
              ) : null}

              <button
                type="button"
                onClick={() => void loadTasks()}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65 transition hover:bg-white/5"
                title="Refresh tasks"
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
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

              {resolvedActiveTask ? (
                <div
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    isFailed(resolvedActiveTask.status)
                      ? "border-red-400/25 bg-red-500/10 text-red-200"
                      : "border-white/10 bg-white/5 text-white/55"
                  }`}
                >
                  {resolvedActiveTask.status || "pending"}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {!resolvedActiveTask ? (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-white/35">
              Create a squad task to open its session here.
            </div>
          ) : (
            <div className="space-y-4">
              {/* User prompt bubble — opens the conversation, just like
                  the squad ops timeline. */}
              <div className="ml-auto max-w-[78%] rounded-[24px] border border-[#4b3b86]/35 bg-[#1a1326] px-5 py-4 text-sm text-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
                <div className="text-base font-semibold text-white">{resolvedActiveTask.title}</div>
                {resolvedActiveTask.prompt ? <div className="mt-2 whitespace-pre-wrap leading-7 text-white/72">{resolvedActiveTask.prompt}</div> : null}
                <div className="mt-3 text-xs text-white/30">{fmtDate(resolvedActiveTask.createdDate)}</div>
              </div>

              {sessionError ? (
                <div className="rounded-[24px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">{sessionError}</div>
              ) : null}

              {/* v90 — render one bubble per run so the squad chat shows
                  every agent's reply, not just the squad's final response.
                  Order by step number so workflow output reads top-to-bottom
                  the same way the user defined it. */}
              {(() => {
                const orderedRuns = [...(resolvedActiveTask.runs ?? [])].sort((a, b) => {
                  const ta = a.finishedAtUtc ? new Date(a.finishedAtUtc).getTime() : 0;
                  const tb = b.finishedAtUtc ? new Date(b.finishedAtUtc).getTime() : 0;
                  if (ta && tb && ta !== tb) return ta - tb;
                  return a.id - b.id;
                });
                if (orderedRuns.length === 0) return null;
                return orderedRuns.map((run, idx) => {
                  const out = (run.outputText || "").trim();
                  const err = (run.dispatchError || "").trim();
                  const status = normalize(run.status);
                  const author = run.agentName || `Agent #${run.agentId}`;
                  const stepLabel = `Step ${idx + 1}`;
                  const fmtTs = run.finishedAtUtc || run.startedAtUtc;

                  if (out.length > 0) {
                    return (
                      <div key={`run-${run.id}`} className="max-w-[84%]">
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/82 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
                          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                            <span>{stepLabel}</span>
                            <span className="opacity-50">·</span>
                            <span className="text-white/55">{author}</span>
                          </div>
                          <div className="whitespace-pre-wrap leading-7">{out}</div>
                          <div className="mt-3 text-xs text-white/30">{fmtDate(fmtTs)}</div>
                        </div>
                      </div>
                    );
                  }

                  if (err.length > 0 || isFailed(status)) {
                    return (
                      <div key={`run-${run.id}`} className="max-w-[84%]">
                        <div className="rounded-[24px] border border-red-400/25 bg-red-500/10 px-5 py-4 text-sm text-red-100/90">
                          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200/70">
                            <span>{stepLabel}</span>
                            <span className="opacity-50">·</span>
                            <span>{author}</span>
                            <span className="rounded-full border border-red-400/30 bg-red-500/15 px-1.5 py-0.5 text-[9px] tracking-wider">failed</span>
                          </div>
                          <div className="whitespace-pre-wrap leading-7">{err || "This agent failed without a message."}</div>
                          <div className="mt-3 text-xs text-red-200/40">{fmtDate(fmtTs)}</div>
                        </div>
                      </div>
                    );
                  }

                  if (isRunning(status)) {
                    return (
                      <div key={`run-${run.id}`} className="max-w-[84%]">
                        <div className="inline-flex items-center gap-3 rounded-[24px] border border-cyan-400/15 bg-cyan-500/5 px-5 py-3 text-sm text-cyan-100/85">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">{stepLabel} · {author}</span>
                          <span className="text-cyan-200/80">{status === "queued" || status === "pending" ? "queued" : "thinking..."}</span>
                        </div>
                      </div>
                    );
                  }

                  return null;
                });
              })()}

              {/* Live session feed bubbles (gateway WS deltas) — kept after
                  the per-run bubbles so streaming partials still show up
                  while a run hasn't been finalised yet. */}
              {(sessionMessages ?? []).length > 0 ? (
                (sessionMessages ?? []).map((message) => (
                  <div
                    key={message.id}
                    className={message.role === "user" ? "ml-auto max-w-[78%]" : "max-w-[84%]"}
                  >
                    <div className={`rounded-[24px] border px-5 py-4 text-sm shadow-[0_18px_60px_rgba(0,0,0,0.18)] ${message.role === "user" ? "border-[#4b3b86]/35 bg-[#1a1326] text-white/80" : message.role === "assistant" ? "border-white/10 bg-white/[0.03] text-white/82" : "border-cyan-400/15 bg-cyan-500/5 text-cyan-100/90"}`}>
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{message.role} (live)</div>
                      <div className="whitespace-pre-wrap leading-7">{message.text}</div>
                      <div className="mt-3 text-xs text-white/30">{fmtDate(new Date(message.timestampMs).toISOString())}</div>
                    </div>
                  </div>
                ))
              ) : null}

              {sessionLoading
                || (resolvedActiveTask.runs.length === 0 && !sessionError && isRunning(resolvedActiveTask.status))
                ? (
                <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200/90">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening the task session thread...
                  </span>
                </div>
              ) : null}
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
