"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  ArrowDown,
  Crown,
  Loader2,
  Paperclip,
  RefreshCcw,
  Send,
  Users2,
  Workflow,
  X as XIcon,
  Zap,
} from "lucide-react";

// v93 — initials helper retired; <AgentAvatar /> now owns initials and the
// multiavatar SVG fallback. We still keep the hue helper around so the
// thinking bubble can derive a deterministic accent per agent.

// Stable hash → hue, so each agent always renders with the same colour.
const SQUAD_HUE_FROM = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
};

const MODE_LABEL: Record<string, string> = {
  workflow: "Workflow",
  leader: "Leader first",
  all: "All at once",
  all_at_once: "All at once",
  manual: "Manual",
  sequential: "Workflow",
};

const MODE_DESCRIPTION: Record<string, string> = {
  workflow: "Each agent runs in order, building on the previous step.",
  leader: "Leader runs first; members work from the leader's brief.",
  all: "Every member runs in parallel and answers independently.",
  all_at_once: "Every member runs in parallel and answers independently.",
  manual: "Agents stay idle until you trigger them by hand.",
  sequential: "Each agent runs in order, building on the previous step.",
};

const ATTACHMENT_MAX_FILES = 6;
const ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024; // 15 MB per file
const ATTACHMENT_TOTAL_MAX_BYTES = 25 * 1024 * 1024; // 25 MB total
const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
import type { SquadSummary, SquadTask } from "@/lib/squads/api";
import { ackSquadTaskRender, fetchSquadTask, fetchSquadTasks } from "@/lib/squads/api";
import { isNearBottom } from "@/lib/dom";
// v93 — share the agent chat's avatar component so cron, squad, and agent
// surfaces all render the same multiavatar fallback (or real photo) for
// every author bubble.
import { AgentAvatar } from "@/features/agents/components/AgentAvatar";
// v95 — render assistant text as proper markdown (headings, lists, links)
// instead of dumping `##` and `**` straight on the screen.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MARKDOWN_COMPONENTS } from "./shared/chatMarkdownComponents";

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
  /** v93 — optional lookup so each member bubble can render the agent's
   *  real avatar photo. Keyed by gatewayAgentId; falls back to a
   *  multiavatar SVG when the entry is missing. */
  agentAvatars?: Record<string, string | null | undefined>;
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

function SquadChatPanelInner({ squad, activeTaskId, activeSessionKey, sessionMessages, sessionLoading, sessionError, taskCache, onTaskFocusChange, onSendMessage, onOpenOps, agentAvatars }: SquadChatPanelProps) {
  const [draft, setDraft] = useState("");
  // v90.1 — attachment staging. We surface the same UX the squad ops modal
  // exposes (clip button → up to 6 files / 15MB each / 25MB total) so the
  // user can attach context without leaving the chat. Files stay client-
  // side until they hit "Send" — at that point they ride along with the
  // task creation payload upstream.
  const [attachments, setAttachments] = useState<Array<{ id: string; file: File }>>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  // v90 — auto-scroll + "Jump to latest" pinned to the AgentChatPanel
  // pattern. The scroller stays pinned to the bottom while the user
  // hasn't scrolled away. Once they scroll up, the pin releases and a
  // floating button appears to jump back to the latest message.
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);
  const [isPinned, setIsPinned] = useState(true);
  const scrollFrameRef = useRef<number | null>(null);

  const scrollToBottom = useCallback(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ block: "end" });
      return;
    }
    const node = scrollerRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, []);

  const setPinned = useCallback((next: boolean) => {
    if (pinnedRef.current === next) return;
    pinnedRef.current = next;
    setIsPinned(next);
  }, []);

  const updatePinnedFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const near = isNearBottom(
      { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight },
      48,
    );
    setPinned(near);
  }, [setPinned]);

  const scheduleScrollToBottom = useCallback(() => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      scrollToBottom();
    });
  }, [scrollToBottom]);

  // Reset pin and snap to the latest when the user switches between tasks.
  useEffect(() => {
    setPinned(true);
    let frameOne: number | null = requestAnimationFrame(() => {
      scrollToBottom();
      frameOne = null;
      const frameTwo = requestAnimationFrame(() => scrollToBottom());
      scrollFrameRef.current = frameTwo;
    });
    return () => {
      if (frameOne !== null) cancelAnimationFrame(frameOne);
    };
  }, [resolvedActiveTask?.id, scrollToBottom, setPinned]);

  // While pinned, follow new content. When the user has scrolled up,
  // leave them alone and surface the Jump button instead.
  useEffect(() => {
    if (pinnedRef.current) scheduleScrollToBottom();
  }, [
    resolvedActiveTask,
    visibleTasks,
    sessionMessages,
    loading,
    scheduleScrollToBottom,
  ]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, []);

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

  // v90.1 — execution mode resolution + icon. Always trust the task's
  // override, fall back to the squad default, fall back to "leader".
  const taskMode = (resolvedActiveTask?.executionMode || squad.executionMode || "leader").toLowerCase();
  const modeLabel = MODE_LABEL[taskMode] ?? taskMode;
  const modeDescription = MODE_DESCRIPTION[taskMode] ?? "";
  const ModeIcon = taskMode === "workflow" || taskMode === "sequential" ? Workflow
    : taskMode === "leader" ? Crown
    : taskMode === "all" || taskMode === "all_at_once" ? Zap
    : Users2;
  const accent = squad.color?.trim() || "#8f84ff";

  // v90.1 — agent → metadata index for richer per-bubble cards.
  const memberByAgentId = useMemo(() => {
    const map = new Map<number, { name: string; isLeader: boolean; gatewayAgentId: string | null }>();
    for (const m of squad.members) {
      if (typeof m.backendAgentId === "number") {
        map.set(m.backendAgentId, {
          name: m.name,
          isLeader: m.isLeader,
          gatewayAgentId: m.gatewayAgentId,
        });
      }
    }
    return map;
  }, [squad.members]);

  return (
    <div className="flex h-full min-h-0 bg-[#120c08]">
      {/* v90 — single-pane squad chat. The outer office sidebar already
          owns the agents/squads list, so we no longer ship a duplicated
          sidebar inside the panel. The active task is picked from one
          dropdown in the header. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* v99/v128 — slim header. The outer chat modal carries the
            squad emblem + name; this inner row hosts the task selector
            + status pill + action buttons. v128 adds a SUBTLE squad
            color hairline at the top + faint background tint so the
            operator sees the brand color in two places (outer bar AND
            inner row), reinforcing which squad they're in.  The squad
            icon is also rendered as a small affordance to the left of
            the task selector — same icon as the outer bar, helps when
            the chat scrolls and the outer bar is offscreen. */}
        <div
          className="relative flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3"
          style={{ backgroundColor: `${accent}06` }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${accent}66, transparent)`,
            }}
          />
          {squad.iconEmoji ? (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm"
              style={{
                backgroundColor: `${accent}1a`,
                border: `1px solid ${accent}55`,
              }}
              title={squad.name}
            >
              {squad.iconEmoji}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            {visibleTasks.length > 0 ? (
              <select
                value={resolvedActiveTask?.id ?? ""}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) onTaskFocusChange?.(next);
                }}
                className="w-full max-w-md rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/85 outline-none transition hover:border-white/25 focus:border-white/40"
                title="Choose which squad task to view"
              >
                {visibleTasks.map((task) => {
                  const label = task.title?.trim() ? task.title.trim() : `Task #${task.id}`;
                  const status = task.status?.trim() || "pending";
                  return (
                    <option key={task.id} value={task.id}>
                      {label} — {status}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="text-xs text-white/35">
                Use Squad Ops to create a task — its session opens here.
              </div>
            )}
          </div>

          {/* Mode + status pills — sit between the dropdown and the
              action buttons so the operator can scan task context at a
              glance. */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{
              borderColor: `${accent}55`,
              backgroundColor: `${accent}15`,
              color: accent,
            }}
            title={modeDescription}
          >
            <ModeIcon className="h-3 w-3" />
            {modeLabel}
          </span>
          {resolvedActiveTask ? (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                isFailed(resolvedActiveTask.status)
                  ? "border-red-400/25 bg-red-500/10 text-red-200"
                  : "border-white/10 bg-white/5 text-white/55"
              }`}
            >
              {resolvedActiveTask.status || "pending"}
            </span>
          ) : null}

          {/* Action buttons — Ops + Refresh, right-aligned and compact. */}
          <div className="flex flex-none items-center gap-1.5">
            {onOpenOps ? (
              <button
                type="button"
                onClick={() => onOpenOps(squad.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-200 transition hover:bg-cyan-500/20"
                title="Open Squad Ops"
              >
                <Users2 className="h-3.5 w-3.5" />
                <span>Ops</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-white/65 transition hover:bg-white/5"
              title="Refresh tasks"
              aria-label="Refresh tasks"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          onScroll={updatePinnedFromScroll}
          className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5"
        >
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

              {/* v90.1 — render one bubble per run with a circular agent
                  avatar (initials fallback, deterministic colour). Workflow
                  step numbers are surfaced inline. */}
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
                  const meta = memberByAgentId.get(run.agentId);
                  const isLeader = !!meta?.isLeader;
                  // v93 — keep the deterministic colour palette around for
                  // the "thinking..." bubble background; the actual avatar
                  // is now rendered by <AgentAvatar /> below, which already
                  // owns initials + multiavatar fallback internally.
                  const hue = SQUAD_HUE_FROM(author);
                  const avatarBg = `hsl(${hue}, 60%, 22%)`;
                  const avatarBorder = `hsl(${hue}, 70%, 45%)`;
                  const avatarText = `hsl(${hue}, 80%, 80%)`;
                  const isRunningNow = isRunning(status);
                  const failedRun = !out && (err.length > 0 || isFailed(status));

                  // v93 — match the agent chat's avatar treatment: prefer
                  // the agent's gatewayAgentId / slug as a stable seed so
                  // each agent always renders the same multiavatar across
                  // cron, squad, and direct chat surfaces. When the parent
                  // supplies `agentAvatars`, we render the real photo.
                  const avatarSeed = (meta?.gatewayAgentId ?? author ?? `agent-${run.agentId}`).toString();
                  const resolvedAvatarUrl =
                    (meta?.gatewayAgentId && agentAvatars?.[meta.gatewayAgentId]) ?? null;
                  return (
                    <div key={`run-${run.id}`} className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative flex-none">
                        <div
                          className="rounded-full"
                          style={{
                            boxShadow: failedRun
                              ? "0 0 0 1.5px rgba(239,68,68,.45)"
                              : "0 8px 24px rgba(0,0,0,0.35)",
                          }}
                          title={author}
                        >
                          <AgentAvatar
                            seed={avatarSeed}
                            name={author}
                            avatarUrl={resolvedAvatarUrl}
                            size={40}
                          />
                        </div>
                        {isLeader ? (
                          <span
                            className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full"
                            style={{ backgroundColor: accent, color: "#0a0612" }}
                            title="Squad leader"
                          >
                            <Crown className="h-2.5 w-2.5" />
                          </span>
                        ) : null}
                        {isRunningNow ? (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full"
                            style={{ backgroundColor: "#22d3ee", border: "1.5px solid #0c1820" }}
                            title="Working on it"
                          />
                        ) : null}
                      </div>

                      {/* Bubble */}
                      <div className="min-w-0 max-w-[84%] flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="font-semibold text-white/85">{author}</span>
                          {isLeader ? (
                            <span
                              className="rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                              style={{ borderColor: `${accent}55`, backgroundColor: `${accent}18`, color: accent }}
                            >
                              leader
                            </span>
                          ) : null}
                          <span className="text-white/35">·</span>
                          <span className="text-white/45">{stepLabel}</span>
                          {fmtTs ? <span className="text-white/30">· {fmtDate(fmtTs)}</span> : null}
                          {failedRun ? (
                            <span className="rounded-full border border-red-400/30 bg-red-500/15 px-1.5 py-0.5 text-[9px] tracking-wider text-red-200">
                              failed
                            </span>
                          ) : null}
                        </div>

                        {out.length > 0 ? (
                          <div className="rounded-[20px] rounded-tl-md border border-white/10 bg-white/[0.03] px-5 py-4 text-sm leading-7 text-white/82 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
                            <div className="agent-markdown break-words">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                                {out}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ) : failedRun ? (
                          <div className="rounded-[20px] rounded-tl-md border border-red-400/25 bg-red-500/10 px-5 py-4 text-sm leading-7 text-red-100/90">
                            <div className="agent-markdown break-words">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                                {err || "This agent failed without a message."}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ) : isRunningNow ? (
                          <div
                            className="inline-flex items-center gap-2 rounded-[20px] rounded-tl-md border px-4 py-2.5 text-sm"
                            style={{ borderColor: `${avatarBorder}55`, backgroundColor: `${avatarBg}aa`, color: avatarText }}
                          >
                            <span className="inline-flex gap-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: avatarText, animationDelay: "0ms" }} />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: avatarText, animationDelay: "150ms" }} />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: avatarText, animationDelay: "300ms" }} />
                            </span>
                            <span className="opacity-80">
                              {status === "queued" || status === "pending" ? "queued — waiting in line" : "thinking..."}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
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
                      <div className="agent-markdown break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                          {message.text}
                        </ReactMarkdown>
                      </div>
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

              {/* v90 — bottom anchor for scrollIntoView pinning. */}
              <div ref={chatBottomRef} aria-hidden className="h-px w-px" />
            </div>
          )}

          {/* v90 — "Jump to latest" button, mirrors the AgentChatPanel UX.
              Only visible when the user has scrolled away from the bottom
              and there's content to jump to. */}
          {!isPinned && resolvedActiveTask ? (
            <button
              type="button"
              onClick={() => {
                setPinned(true);
                scrollToBottom();
              }}
              aria-label="Jump to latest"
              className="sticky bottom-3 left-1/2 mt-2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-[#1a1326]/95 px-3 py-1.5 text-xs font-medium tracking-wide text-white/85 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur transition hover:bg-[#241935]"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Jump to latest
            </button>
          ) : null}
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          {/* Attachment chips + error — stacked above the composer so the
              user always sees what's about to be uploaded. */}
          {attachmentError ? (
            <div className="mb-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200/90">
              {attachmentError}
            </div>
          ) : null}
          {attachments.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((att) => (
                <span
                  key={att.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/80"
                >
                  <Paperclip className="h-3 w-3 text-white/55" />
                  <span className="max-w-[200px] truncate" title={att.file.name}>
                    {att.file.name}
                  </span>
                  <span className="text-white/40">{formatBytes(att.file.size)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
                      setAttachmentError(null);
                    }}
                    className="rounded-full p-0.5 text-white/45 transition hover:bg-white/10 hover:text-white"
                    aria-label={`Remove ${att.file.name}`}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div
            className="flex items-end gap-2 rounded-[24px] border bg-black/25 px-3 py-2.5 transition focus-within:border-white/25"
            style={{ borderColor: `${accent}33` }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const picked = Array.from(event.target.files ?? []);
                event.target.value = "";
                if (picked.length === 0) return;
                let nextErr: string | null = null;
                const accepted: typeof attachments = [];
                let runningTotal = attachments.reduce((sum, a) => sum + a.file.size, 0);
                for (const file of picked) {
                  if (attachments.length + accepted.length >= ATTACHMENT_MAX_FILES) {
                    nextErr = `Up to ${ATTACHMENT_MAX_FILES} files per task.`;
                    break;
                  }
                  if (file.size > ATTACHMENT_MAX_BYTES) {
                    nextErr = `${file.name} is over 15 MB (per-file limit).`;
                    continue;
                  }
                  if (runningTotal + file.size > ATTACHMENT_TOTAL_MAX_BYTES) {
                    nextErr = "Combined attachments would exceed the 25 MB total limit.";
                    break;
                  }
                  runningTotal += file.size;
                  accepted.push({ id: `${file.name}-${file.size}-${file.lastModified}`, file });
                }
                setAttachmentError(nextErr);
                if (accepted.length > 0) {
                  setAttachments((prev) => [...prev, ...accepted]);
                }
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files (max 6 · 15 MB each · 25 MB total)"
              aria-label="Attach files"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Describe the next squad task — Enter to dispatch, Shift+Enter for a new line"
              rows={2}
              className="min-h-[44px] max-h-[180px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 text-white outline-none placeholder:text-white/25"
            />

            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              className="flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                backgroundColor: `${accent}33`,
                border: `1px solid ${accent}66`,
              }}
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </div>

          {/* Mode hint — small caption that demystifies the chosen mode. */}
          {modeDescription ? (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/40">
              <ModeIcon className="h-3 w-3" />
              <span>{modeLabel}: {modeDescription}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const SquadChatPanel = memo(SquadChatPanelInner);
