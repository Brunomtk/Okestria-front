"use client";

import { memo, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Loader2, Paperclip, RefreshCcw, Send, Users2, X } from "lucide-react";
import type { ChatSendAttachment } from "@/features/agents/operations/chatSendOperation";
import type { SquadSummary, SquadTask } from "@/lib/squads/api";
import { fetchSquadTask, fetchSquadTasks } from "@/lib/squads/api";
import { isNearBottom } from "@/lib/dom";

const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

type SquadChatPanelProps = {
  squad: SquadSummary;
  onSendMessage?: (
    squad: SquadSummary,
    payload: { text: string; taskId?: number | null; attachments?: ChatSendAttachment[] },
  ) => void;
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
const resolveMimeType = (file: File) => file.type?.trim() || "application/octet-stream";
const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};
const formatBytes = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

function SquadChatPanelInner({ squad, onSendMessage, onOpenOps }: SquadChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [tasks, setTasks] = useState<SquadTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ChatSendAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const squadId = Number(squad.id);
      const summaries = await fetchSquadTasks(Number.isFinite(squadId) ? { squadId } : undefined);
      const detailed = await Promise.all(summaries.slice(0, 12).map((entry) => fetchSquadTask(entry.id)));
      setTasks(detailed.sort((a, b) => a.id - b.id));
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
    if (!node || !isNearBottom(node, 180)) return;
    node.scrollTop = node.scrollHeight;
  }, [tasks, loading]);

  const latestTask = tasks[tasks.length - 1] ?? null;
  const composedItems = useMemo(() => tasks.flatMap((task) => {
    const msgs = task.messages.length > 0
      ? task.messages.map((message) => ({ kind: "message" as const, task, message }))
      : [{ kind: "prompt" as const, task }];
    const tailStatus = !task.messages.some((message) => normalize(message.role) === "assistant") || isRunning(task.status)
      ? [{ kind: "status" as const, task }]
      : [];
    return [...msgs, ...tailStatus];
  }), [tasks]);

  const send = () => {
    const text = draft.trim();
    if (!text && attachments.length === 0) return;
    onSendMessage?.(squad, { text, taskId: latestTask?.id ?? null, attachments });
    setDraft("");
    setAttachments([]);
    setAttachmentError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const handlePickAttachment = () => fileInputRef.current?.click();

  const handleAttachmentFiles = async (files: File[]) => {
    if (files.length === 0) return;
    let nextError: string | null = null;
    const allowed = files.slice(0, Math.max(0, MAX_ATTACHMENTS - attachments.length));
    if (allowed.length < files.length) nextError = `You can attach up to ${MAX_ATTACHMENTS} files at a time.`;
    const total = attachments.reduce((sum, file) => sum + file.sizeBytes, 0);
    let runningTotal = total;
    const prepared: ChatSendAttachment[] = [];
    for (const file of allowed) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        nextError = `${file.name} exceeds ${formatBytes(MAX_ATTACHMENT_BYTES)}.`;
        continue;
      }
      if (runningTotal + file.size > MAX_TOTAL_BYTES) {
        nextError = `Attachments exceed ${formatBytes(MAX_TOTAL_BYTES)} total.`;
        continue;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      prepared.push({
        filename: file.name || `attachment-${prepared.length + 1}`,
        mimeType: resolveMimeType(file),
        sizeBytes: file.size,
        dataBase64: toBase64(bytes),
      });
      runningTotal += file.size;
    }
    if (prepared.length > 0) setAttachments((current) => [...current, ...prepared].slice(0, MAX_ATTACHMENTS));
    setAttachmentError(nextError);
  };

  const handleAttachmentSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) await handleAttachmentFiles(files);
    event.target.value = "";
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#120c08]">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => { void handleAttachmentSelection(event); }} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#8f84ff]">
            <Users2 className="h-3.5 w-3.5" />
            <span>Squad</span>
          </div>
          <div className="mt-1 truncate text-xl font-semibold text-white sm:text-2xl">{squad.name}</div>
          <div className="text-xs text-white/45">{squad.members.length} members • {squad.executionMode} mode</div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadTasks()} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65 transition hover:bg-white/5">
            <span className="inline-flex items-center gap-2">
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </span>
          </button>
          {onOpenOps ? (
            <button type="button" onClick={() => onOpenOps(squad.id)} className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200 transition hover:bg-cyan-500/20">
              Squad Ops
            </button>
          ) : null}
        </div>
      </div>

      <div ref={scrollerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
        {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
        {composedItems.length === 0 && !loading ? <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-white/35">No squad conversation yet. Send a message below to create one.</div> : null}

        {composedItems.map((entry, index) => {
          if (entry.kind === "prompt") {
            return <div key={`task-${entry.task.id}-prompt-${index}`} className="ml-auto max-w-[90%] rounded-[24px] border border-[#4b3b86]/35 bg-[#1a1326] px-4 py-4 text-sm text-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:max-w-[78%]">
              <div className="text-base font-semibold text-white">{entry.task.title}</div>
              {entry.task.prompt ? <div className="mt-2 whitespace-pre-wrap leading-7 text-white/72">{entry.task.prompt}</div> : null}
              <div className="mt-3 text-xs text-white/30">{fmtDate(entry.task.createdDate)}</div>
            </div>;
          }
          if (entry.kind === "status") {
            const latestRun = entry.task.runs[0] ?? null;
            return <div key={`task-${entry.task.id}-status-${index}`} className="max-w-[92%] rounded-[24px] border border-cyan-400/15 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200/90 sm:max-w-[82%]">
              <span className="inline-flex items-center gap-2">
                {isRunning(entry.task.status) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Loader2 className="h-4 w-4" />}
                {latestRun?.agentName || "Squad"}: {isRunning(entry.task.status) ? "processing..." : "waiting for response..."}
              </span>
            </div>;
          }
          const isAssistant = normalize(entry.message.role) === "assistant";
          return <div key={`task-${entry.task.id}-message-${entry.message.id || index}`} className={isAssistant ? "max-w-[92%] rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:max-w-[82%]" : "ml-auto max-w-[90%] rounded-[24px] border border-[#4b3b86]/35 bg-[#1a1326] px-4 py-4 text-sm text-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:max-w-[78%]"}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">
                {isAssistant ? (entry.message.agentName || entry.task.targetAgentName || "Squad") : (entry.message.userName || "You")}
              </div>
              <div className="text-[11px] text-white/35">{fmtDate(entry.message.createdDate || entry.task.createdDate)}</div>
            </div>
            <div className="mt-2 whitespace-pre-wrap leading-7 text-white/80">{entry.message.content}</div>
          </div>;
        })}
      </div>

      <div className="border-t border-white/10 px-4 py-4 sm:px-5">
        {attachmentError ? <div className="mb-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{attachmentError}</div> : null}
        {attachments.length > 0 ? <div className="mb-2 flex flex-wrap gap-1.5">{attachments.map((attachment, index) => (
          <div key={`${attachment.filename}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <span className="max-w-[170px] truncate">{attachment.filename}</span>
            <span className="text-white/30">{formatBytes(attachment.sizeBytes)}</span>
            <button type="button" onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))} className="text-white/40 transition hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}</div> : null}
        <div className="flex items-end gap-3 rounded-[24px] border border-white/10 bg-black/20 px-3 py-3 sm:px-4">
          <button type="button" onClick={handlePickAttachment} className="rounded-full border border-white/10 bg-white/5 p-3 text-white/75 transition hover:bg-white/10">
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} placeholder="Send a message to the squad..." className="min-h-[72px] flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/25" />
          <button type="button" onClick={send} disabled={!draft.trim() && attachments.length === 0} className="rounded-full border border-[#4b3b86]/45 bg-[#1b1327] p-3 text-white transition hover:bg-[#241935] disabled:cursor-not-allowed disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const SquadChatPanel = memo(SquadChatPanelInner);
