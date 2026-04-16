import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Loader2,
  RefreshCcw,
  Send,
  Users2,
  XCircle,
} from "lucide-react";
import type { SquadSummary, SquadTask, SquadTaskRun } from "@/lib/squads/api";
import { fetchSquadTask, fetchSquadTasks } from "@/lib/squads/api";
import { isNearBottom } from "@/lib/dom";

/* ── Types ── */
type SquadChatPanelProps = {
  squad: SquadSummary;
  onSendMessage?: (squad: SquadSummary, message: string) => void;
  onOpenOps?: (squadId: string) => void;
};

/* ── Helpers ── */
const fmtTime = (v: string | null | undefined) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: true }).format(d);
};

const fmtDate = (v: string | null | undefined) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

const isFinished = (s: string) => ["completed", "done", "success", "failed", "error", "cancelled"].includes(norm(s));
const isSuccess = (s: string) => ["completed", "done", "success"].includes(norm(s));
const isFailed = (s: string) => ["failed", "error", "cancelled"].includes(norm(s));
const isRunning = (s: string) => ["running", "processing", "dispatching", "in_progress"].includes(norm(s));

const statusIcon = (s: string) => {
  if (isSuccess(s)) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (isFailed(s)) return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  if (isRunning(s)) return <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />;
  return <Clock3 className="h-3.5 w-3.5 text-amber-400/60" />;
};

/* ── Render markdown-ish output ── */
function OutputBlock({ text }: { text: string }) {
  // Simple rendering: preserve whitespace, highlight tables, bold, etc
  const html = useMemo(() => {
    let t = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    // Bold: **text** or __text__
    t = t.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/__(.*?)__/g, "<strong>$1</strong>");
    // Italic
    t = t.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
    // Headings (## at start of line)
    t = t.replace(/^#{1,3}\s+(.+)$/gm, '<div class="font-semibold text-white mt-2 mb-1">$1</div>');
    // Horizontal rules
    t = t.replace(/^[-–—]{3,}$/gm, '<hr class="border-white/10 my-2"/>');
    return t;
  }, [text]);

  return (
    <div
      className="whitespace-pre-wrap break-words text-[13px] leading-[1.65] text-white/75"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ── Run card ── */
function RunCard({ run }: { run: SquadTaskRun }) {
  const [expanded, setExpanded] = useState(true);
  const hasOutput = run.outputText?.trim();

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        {statusIcon(run.status)}
        <span className="flex-1 truncate text-sm font-medium text-white/80">
          {run.agentName}
        </span>
        {run.role && (
          <span className="hidden text-[10px] text-white/25 sm:inline">{run.role}</span>
        )}
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-white/20" /> : <ChevronRight className="h-3.5 w-3.5 text-white/20" />}
      </button>

      {expanded && (
        <div className="border-t border-white/[0.05] px-3.5 pb-3.5 pt-2.5">
          {run.dispatchError && (
            <div className="mb-2 rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-200">
              {run.dispatchError}
            </div>
          )}
          {hasOutput ? (
            <OutputBlock text={run.outputText!} />
          ) : isRunning(run.status) ? (
            <div className="flex items-center gap-2 text-xs text-cyan-300/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Agent is working...
            </div>
          ) : isFinished(run.status) ? (
            <div className="text-xs text-white/30 italic">No output produced.</div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-300/50">
              <Clock3 className="h-3 w-3" />
              Waiting to be dispatched...
            </div>
          )}
          <div className="mt-2 flex gap-3 text-[10px] text-white/25">
            {run.startedAtUtc && <span>Started {fmtTime(run.startedAtUtc)}</span>}
            {run.finishedAtUtc && <span>Finished {fmtTime(run.finishedAtUtc)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Task block (looks like a conversation pair) ── */
function TaskBlock({ task, accent }: { task: SquadTask; accent: string }) {
  const runs = task.runs ?? [];
  const hasAnyOutput = runs.some((r) => r.outputText?.trim());

  return (
    <div className="space-y-3">
      {/* User message: the task prompt */}
      <div className="flex justify-end">
        <div
          className="max-w-[88%] rounded-2xl rounded-tr-md px-4 py-3"
          style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}25` }}
        >
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
              {task.title}
            </span>
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
              isSuccess(task.status) ? "bg-emerald-500/15 text-emerald-300" :
              isFailed(task.status) ? "bg-red-500/15 text-red-300" :
              isRunning(task.status) ? "bg-cyan-500/15 text-cyan-300" :
              "bg-white/[0.07] text-white/40"
            }`}>
              {norm(task.status) || "draft"}
            </span>
          </div>
          <div className="whitespace-pre-wrap text-[13px] leading-[1.55] text-white/60">
            {task.prompt}
          </div>
          <div className="mt-2 text-[10px] text-white/25">{fmtDate(task.createdDate)}</div>
        </div>
      </div>

      {/* Agent responses */}
      {runs.length > 0 && (
        <div className="ml-1 space-y-2 border-l-2 pl-3" style={{ borderColor: `${accent}20` }}>
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}

      {!hasAnyOutput && runs.length > 0 && runs.every((r) => isRunning(r.status) || norm(r.status) === "queued") && (
        <div className="ml-4 flex items-center gap-2 text-xs text-cyan-300/50">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Agents are processing this task...
        </div>
      )}
    </div>
  );
}

/* ── Scroll threshold ── */
const NEAR_BOTTOM_PX = 48;

/** Build a lightweight fingerprint of tasks so we only auto-scroll when data actually changes. */
const buildTaskFingerprint = (tasks: SquadTask[]): string =>
  tasks.map((t) => {
    const runParts = (t.runs ?? []).map((r) => `${r.id}:${r.status}:${(r.outputText?.length ?? 0)}`).join(",");
    return `${t.id}|${t.status}|${runParts}`;
  }).join(";");

/* ── Main panel ── */
export const SquadChatPanel = memo(function SquadChatPanel({
  squad,
  onSendMessage,
  onOpenOps,
}: SquadChatPanelProps) {
  const [tasks, setTasks] = useState<SquadTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  /* ── Scroll refs & state ── */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const pinnedRef = useRef(true);
  const [isPinned, setIsPinned] = useState(true);
  const prevFingerprintRef = useRef("");
  const isFirstLoadRef = useRef(true);
  /** Block onScroll from re-pinning while we're processing a data update */
  const scrollLockRef = useRef(false);

  const accent = squad.color || "#3b82f6";

  /* ── Scroll helpers ── */
  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ block: "end" });
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  const setPinned = useCallback((next: boolean) => {
    if (pinnedRef.current === next) return;
    pinnedRef.current = next;
    setIsPinned(next);
  }, []);

  const handleScroll = useCallback(() => {
    // Don't update pinned state during programmatic scrolls or re-renders from polling
    if (scrollLockRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    setPinned(
      isNearBottom(
        { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight },
        NEAR_BOTTOM_PX,
      ),
    );
  }, [setPinned]);

  // Load tasks (with full run details)
  const loadTasks = useCallback(async () => {
    const numericId = Number(squad.id);
    if (!Number.isFinite(numericId)) return;
    setLoading(true);
    try {
      const summaries = await fetchSquadTasks({ squadId: numericId });
      const fullTasks = await Promise.all(
        summaries.slice(0, 20).map((s) => fetchSquadTask(s.id).catch(() => null)),
      );
      setTasks(fullTasks.filter((t): t is SquadTask => t !== null).reverse());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [squad.id]);

  // Initial load + polling
  useEffect(() => {
    void loadTasks();
    const interval = window.setInterval(() => { void loadTasks(); }, 8000);
    return () => window.clearInterval(interval);
  }, [loadTasks]);

  /* ── Scroll on squad change: reset to bottom ── */
  useEffect(() => {
    pinnedRef.current = true;
    setIsPinned(true);
    isFirstLoadRef.current = true;
    prevFingerprintRef.current = "";
  }, [squad.id]);

  /* ── Smart scroll when task DATA changes (not just reference) ── */
  useEffect(() => {
    const fp = buildTaskFingerprint(tasks);
    const changed = fp !== prevFingerprintRef.current;
    const wasEmpty = prevFingerprintRef.current === "";
    prevFingerprintRef.current = fp;

    if (!changed) return; // Same data — polling returned identical results, skip scroll

    if (isFirstLoadRef.current && tasks.length > 0) {
      // First load after mount or squad switch: always scroll to bottom
      isFirstLoadRef.current = false;
      scrollLockRef.current = true;
      requestAnimationFrame(() => {
        scrollToBottom();
        requestAnimationFrame(() => {
          scrollToBottom();
          // Unlock after browser has settled
          requestAnimationFrame(() => { scrollLockRef.current = false; });
        });
      });
      return;
    }

    // Data changed (new tasks, status update, output appeared)
    // Only auto-scroll if user was already at the bottom
    if (pinnedRef.current) {
      scrollLockRef.current = true;
      requestAnimationFrame(() => {
        scrollToBottom();
        requestAnimationFrame(() => { scrollLockRef.current = false; });
      });
    }
  }, [tasks, scrollToBottom]);

  /* ── Cleanup scroll frames on unmount ── */
  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, []);

  const handleSend = useCallback(() => {
    const msg = draft.trim();
    if (!msg || !onSendMessage) return;
    setSending(true);
    onSendMessage(squad, msg);
    setDraft("");
    setTimeout(() => setSending(false), 800);
  }, [draft, onSendMessage, squad]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showJumpToLatest = !isPinned && tasks.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0e0a04]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        {squad.iconEmoji && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
            style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}
          >
            {squad.iconEmoji}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
              Squad
            </span>
          </div>
          <div className="text-sm font-medium text-white">{squad.name}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void loadTasks()}
            className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/5 hover:text-white/60"
            title="Refresh tasks"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          {onOpenOps && (
            <button
              type="button"
              onClick={() => onOpenOps(squad.id)}
              className="rounded-lg border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition hover:bg-white/5"
              style={{ borderColor: `${accent}30`, color: accent }}
            >
              Ops
            </button>
          )}
        </div>
      </div>

      {/* Messages feed — overflow-hidden wrapper + scrollable inner (matches AgentChatPanel) */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className={`h-full overflow-auto p-4 ${showJumpToLatest ? "pb-16" : ""}`}
          onScroll={handleScroll}
          onWheel={(e) => e.stopPropagation()}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-6">
            {loading && tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-white/25">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs">Loading squad tasks...</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Users2 className="h-8 w-8 text-white/10" />
                <p className="text-sm text-white/30">No tasks yet for this squad.</p>
                <p className="max-w-xs text-xs text-white/20">
                  Create a task from the Ops panel or type a message below to send to the squad agents.
                </p>
              </div>
            ) : (
              tasks.map((task) => <TaskBlock key={task.id} task={task} accent={accent} />)
            )}
            {/* Bottom sentinel for scrollIntoView */}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Jump to latest button */}
        {showJumpToLatest && (
          <button
            type="button"
            className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-md border border-white/15 bg-[#1a1510]/95 px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.02em] text-white/70 shadow-lg backdrop-blur transition hover:bg-[#1a1510] hover:text-white/90"
            onClick={() => {
              setPinned(true);
              scrollToBottom();
            }}
            aria-label="Jump to latest"
          >
            Jump to latest
          </button>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-white/10 px-4 py-3">
        <div className="mb-2 text-[10px] text-white/30">
          Messages are routed to {squad.executionMode === "all" ? "all members" : "the squad leader"}. Tasks and responses appear above.
        </div>
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message to the squad..."
            rows={2}
            className="min-h-[52px] flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-white/25"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="self-end rounded-xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-30"
            style={{ backgroundColor: `${accent}20`, border: `1px solid ${accent}35` }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
