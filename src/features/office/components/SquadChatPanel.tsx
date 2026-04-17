"use client";

import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, RefreshCcw, Send, Users2 } from "lucide-react";
import type { SquadSummary, SquadTask } from "@/lib/squads/api";
import { fetchSquadTasks } from "@/lib/squads/api";
import { isNearBottom } from "@/lib/dom";

type SquadChatPanelProps = {
  squad: SquadSummary;
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

function SquadChatPanelInner({ squad, onSendMessage, onOpenOps }: SquadChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [tasks, setTasks] = useState<SquadTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchSquadTasks(squad.id, 12);
      setTasks(next);
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
    }, 4000);
    return () => window.clearInterval(timer);
  }, [squad.id]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || !isNearBottom(node, 120)) return;
    node.scrollTop = node.scrollHeight;
  }, [tasks, loading]);

  const visibleTasks = useMemo(() => tasks.slice().sort((a, b) => b.id - a.id), [tasks]);

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
    <div className="flex h-full min-h-0 flex-col bg-[#120c08]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#8f84ff]">
            <Users2 className="h-3.5 w-3.5" />
            <span>Squad</span>
          </div>
          <div className="mt-1 truncate text-2xl font-semibold text-white">{squad.name}</div>
          <div className="text-xs text-white/45">{squad.members.length} members • leader mode</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadTasks()}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65 transition hover:bg-white/5"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </span>
          </button>
          {onOpenOps ? (
            <button
              type="button"
              onClick={() => onOpenOps(squad.id)}
              className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200 transition hover:bg-cyan-500/20"
            >
              Squad Ops
            </button>
          ) : null}
        </div>
      </div>

      <div ref={scrollerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

        {visibleTasks.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-white/35">
            No squad tasks yet. Send a message below to create one.
          </div>
        ) : null}

        {visibleTasks.map((task) => {
          const latestRun = task.runs[0] ?? null;
          const result = (task.finalResponse || latestRun?.outputText || "").trim();
          return (
            <div key={task.id} className="space-y-3">
              <div className="ml-auto max-w-[78%] rounded-[24px] border border-[#4b3b86]/35 bg-[#1a1326] px-5 py-4 text-sm text-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
                <div className="text-base font-semibold text-white">{task.title}</div>
                {task.prompt ? <div className="mt-2 whitespace-pre-wrap leading-7 text-white/72">{task.prompt}</div> : null}
                <div className="mt-3 text-xs text-white/30">{fmtDate(task.createdDate)}</div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{latestRun?.agentName || "Squad agent"}</div>
                    <div className="text-xs text-white/35">{latestRun?.role || task.executionMode || "Task execution"}</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    {task.status || "pending"}
                  </div>
                </div>

                {result ? (
                  <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm leading-7 text-white/80">{result}</div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200/90">
                    <span className="inline-flex items-center gap-2">
                      {isRunning(task.status) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Loader2 className="h-4 w-4" />}
                      {isRunning(task.status) ? "Agents are processing this task..." : "Waiting for squad response..."}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-end gap-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Send a message to the squad..."
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
  );
}

export const SquadChatPanel = memo(SquadChatPanelInner);
