import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  Pencil,
  Play,
  RefreshCcw,
  Rocket,
  Send,
  Sparkles,
  Trash2,
  Users2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import type { SquadExecutionMode, SquadSummary, SquadTask, SquadTaskDispatchEstimate, SquadTaskSummary } from "@/lib/squads/api";
import type { GatewayModelChoice } from "@/lib/gateway/models";

/* ── Shared constants (same as SquadCreateModal) ── */
const SQUAD_COLORS = [
  "#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#a855f7", "#84cc16",
];

const SQUAD_EMOJIS = [
  "🚀", "💰", "🛡️", "⚡", "🎯", "📊", "🔥", "💎",
  "🌟", "🏆", "🧠", "🔧", "📈", "🎨", "💼", "🤖",
  "🦾", "🌍", "📣", "🧩",
];

const EXECUTION_MODES: Array<{ value: SquadExecutionMode; label: string; icon: string }> = [
  { value: "leader", label: "Leader first", icon: "👑" },
  { value: "all", label: "All at once", icon: "⚡" },
  { value: "manual", label: "Manual", icon: "✋" },
  { value: "workflow", label: "Workflow", icon: "🔄" },
];

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

/* ── Helpers ── */
const fmtDate = (v: string | null | undefined) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
};

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

const statusClasses = (s: string | null | undefined) => {
  const n = norm(s);
  if (["completed", "success", "done"].includes(n)) return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  if (["failed", "error", "cancelled"].includes(n)) return "border-red-400/20 bg-red-500/10 text-red-200";
  if (["running", "dispatching", "processing", "inprogress", "in_progress"].includes(n)) return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
  return "border-white/10 bg-white/5 text-white/60";
};
const statusText = (s: string | null | undefined) => { const n = norm(s); return n ? n.replace(/_/g, " ") : "draft"; };
const modeText = (m: string | null | undefined) => { const n = (m ?? "leader").trim(); return n || "Leader"; };

/* Format run output with basic markdown-like rendering */
const formatRunOutput = (text: string): string => {
  let t = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Bold
  t = t.replace(/\*\*(.*?)\*\*/g, "<strong class='text-white'>$1</strong>");
  t = t.replace(/__(.*?)__/g, "<strong class='text-white'>$1</strong>");
  // Headings
  t = t.replace(/^#{1,3}\s+(.+)$/gm, '<div class="font-semibold text-white mt-3 mb-1">$1</div>');
  // Horizontal rules
  t = t.replace(/^[-–—]{3,}$/gm, '<hr class="border-white/10 my-2"/>');
  return t;
};

export function SquadOpsModal({
  open, squads, squad, selectedSquadId, tasks, selectedTask,
  loading, refreshingTask, createBusy, dispatchBusy,
  dispatchEstimate, dispatchEstimateBusy, dispatchApprovalMode,
  error, hooksConfigured, hooksMessage, availableModels,
  onClose, onRefresh, onSelectSquad, onSelectTask,
  onCreateTask, onPreviewDispatchTask, onConfirmDispatchTask, onCancelDispatchApproval,
  onEditSquad, onDeleteSquad,
}: SquadOpsModalProps) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preferredModel, setPreferredModel] = useState("");
  const [tab, setTab] = useState<"create" | "tasks" | "edit">("tasks");

  /* ── Edit state ── */
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editEmoji, setEditEmoji] = useState("🚀");
  const [editColor, setEditColor] = useState(SQUAD_COLORS[0]);
  const [editMode, setEditMode] = useState<SquadExecutionMode>("leader");
  const [editSaving, setEditSaving] = useState(false);
  const [editSaved, setEditSaved] = useState(false);

  /* ── Delete state ── */
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(""); setPrompt(""); setPreferredModel(""); setTab("tasks");
    setDeleteConfirm(false); setDeleting(false); setEditSaved(false);
  }, [open, squad?.id]);

  /* Seed edit form from current squad */
  useEffect(() => {
    if (!squad) return;
    setEditName(squad.name);
    setEditDesc(squad.description ?? "");
    setEditEmoji(squad.iconEmoji ?? "🚀");
    setEditColor(squad.color ?? SQUAD_COLORS[0]);
    setEditMode(squad.executionMode ?? "leader");
    setEditSaved(false);
  }, [squad]);

  const handleSaveEdit = useCallback(async () => {
    if (!onEditSquad || !selectedSquadId || editSaving) return;
    setEditSaving(true); setEditSaved(false);
    try {
      await onEditSquad(selectedSquadId, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        iconEmoji: editEmoji,
        color: editColor,
        executionMode: editMode,
      });
      setEditSaved(true);
      setTimeout(() => setEditSaved(false), 2500);
    } finally { setEditSaving(false); }
  }, [onEditSquad, selectedSquadId, editSaving, editName, editDesc, editEmoji, editColor, editMode]);

  const handleDelete = useCallback(async () => {
    if (!onDeleteSquad || !selectedSquadId || deleting) return;
    setDeleting(true);
    try { await onDeleteSquad(selectedSquadId); } finally { setDeleting(false); }
  }, [onDeleteSquad, selectedSquadId, deleting]);

  const submitDisabled = createBusy || !title.trim() || !prompt.trim() || !selectedSquadId;
  const dispatchDisabled = dispatchBusy || !hooksConfigured;
  const selectedTaskId = selectedTask?.id ?? null;

  const runSummary = useMemo(() => {
    const runs = selectedTask?.runs ?? [];
    return {
      total: runs.length,
      running: runs.filter((r) => ["running", "dispatching", "processing", "in_progress"].includes(norm(r.status))).length,
      completed: runs.filter((r) => ["completed", "success", "done"].includes(norm(r.status))).length,
      failed: runs.filter((r) => ["failed", "error", "cancelled"].includes(norm(r.status))).length,
    };
  }, [selectedTask]);

  if (!open) return null;

  const accent = squad?.color || "#3b82f6";

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e14] shadow-[0_40px_140px_rgba(0,0,0,.78)]">

        {/* ── Header ── */}
        <header className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
          {squad?.iconEmoji && (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
              style={{ backgroundColor: `${accent}20`, border: `1.5px solid ${accent}50` }}
            >
              {squad.iconEmoji}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              {squads.length > 1 ? (
                <select
                  value={selectedSquadId ?? ""}
                  onChange={(e) => onSelectSquad(e.target.value)}
                  className="max-w-[240px] truncate rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-base font-semibold text-white outline-none"
                >
                  <option value="">Select a squad</option>
                  {squads.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.iconEmoji ? `${s.iconEmoji} ` : ""}{s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <h2 className="truncate text-lg font-semibold text-white">{squad?.name ?? "Squad Ops"}</h2>
              )}
            </div>
            <p className="text-xs text-white/35">
              {squad ? `${squad.members.length} members · ${modeText(squad.executionMode)} mode` : "Select a squad to get started"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onRefresh} className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/40 transition hover:bg-white/10 hover:text-white" title="Refresh">
              <RefreshCcw className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/40 transition hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ── Hooks warning ── */}
        {hooksMessage && (
          <div className={`border-b px-6 py-2.5 text-xs ${hooksConfigured ? "border-emerald-500/15 bg-emerald-500/8 text-emerald-200" : "border-amber-500/15 bg-amber-500/8 text-amber-200"}`}>
            {hooksMessage}
          </div>
        )}

        {/* ── Body grid ── */}
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[340px_minmax(0,1fr)]">

          {/* ── Left sidebar ── */}
          <aside className="flex min-h-0 flex-col border-r border-white/10">
            {/* Sidebar tabs */}
            <div className="flex border-b border-white/10">
              {(["tasks", "create", "edit"] as const).map((t) => {
                const labels = { tasks: `Tasks (${tasks.length})`, create: "+ New", edit: "Edit" };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTab(t); setDeleteConfirm(false); }}
                    className={`flex-1 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider transition ${tab === t ? "border-b-2 text-white" : "text-white/35 hover:text-white/55"}`}
                    style={tab === t ? { borderColor: accent } : undefined}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {tab === "tasks" && (
                <>
                  {!selectedSquadId ? (
                    <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/25">
                      Select a squad above.
                    </div>
                  ) : loading ? (
                    <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/25">
                      Loading...
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
                      <Rocket className="h-6 w-6 text-white/15" />
                      <p className="text-sm text-white/30">No tasks yet.</p>
                      <button type="button" onClick={() => setTab("create")} className="text-xs font-medium transition" style={{ color: accent }}>
                        Create the first task →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {tasks.map((task) => {
                        const active = task.id === selectedTaskId;
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => onSelectTask(task.id)}
                            className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                              active ? "border-white/20 bg-white/[0.07]" : "border-transparent hover:bg-white/[0.04]"
                            }`}
                            style={active ? { borderColor: `${accent}40` } : undefined}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="truncate text-sm font-medium text-white">{task.title}</span>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${statusClasses(task.status)}`}>
                                {statusText(task.status)}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/30">
                              <span>{fmtDate(task.createdDate)}</span>
                              <span>·</span>
                              <span>{task.runCount} runs</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {tab === "create" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-white/40">Task title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Review landing page"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-white/25"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-white/40">Instructions</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Explain the goal, expected output, tone, and who should focus on what."
                      rows={6}
                      className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-white/25"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-white/40">AI Model <span className="normal-case text-white/20">(optional)</span></label>
                    <select
                      value={preferredModel}
                      onChange={(e) => setPreferredModel(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="">Default model</option>
                      {availableModels.map((m) => (
                        <option key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id}`}>
                          {m.name || m.id} · {m.provider}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={submitDisabled}
                    onClick={() => { onCreateTask({ title: title.trim(), prompt: prompt.trim(), preferredModel: preferredModel || null }); setTab("tasks"); }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ backgroundColor: `${accent}25`, border: `1px solid ${accent}40` }}
                  >
                    <Send className="h-4 w-4" />
                    {createBusy ? "Creating..." : "Create task"}
                  </button>
                </div>
              )}

              {/* ── Edit tab ── */}
              {tab === "edit" && squad && (
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-white/40">Squad name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-white/25"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-white/40">Description</label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-white/25"
                    />
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-white/40">Icon</label>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {SQUAD_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditEmoji(emoji)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition ${
                            editEmoji === emoji ? "bg-white/10" : "bg-white/[0.03] hover:bg-white/[0.07]"
                          }`}
                          style={editEmoji === emoji ? { boxShadow: `0 0 0 2px ${editColor}` } : undefined}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-white/40">Color</label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {SQUAD_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className="relative h-7 w-7 rounded-full border-2 transition hover:scale-110"
                          style={{
                            backgroundColor: c,
                            borderColor: editColor === c ? "#fff" : "transparent",
                            boxShadow: editColor === c ? `0 0 10px ${c}60` : undefined,
                          }}
                        >
                          {editColor === c && <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Execution mode */}
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-white/40">Execution mode</label>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {EXECUTION_MODES.map((m) => {
                        const active = m.value === editMode;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setEditMode(m.value)}
                            className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                              active ? "border-white/20 bg-white/[0.07] text-white" : "border-white/[0.06] text-white/40 hover:text-white/60"
                            }`}
                            style={active ? { borderColor: `${editColor}50` } : undefined}
                          >
                            <span className="mr-1">{m.icon}</span>{m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save button */}
                  <button
                    type="button"
                    disabled={editSaving || !editName.trim()}
                    onClick={() => { void handleSaveEdit(); }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ backgroundColor: `${editColor}25`, border: `1px solid ${editColor}40` }}
                  >
                    {editSaving ? (
                      <>Saving...</>
                    ) : editSaved ? (
                      <><Check className="h-4 w-4" /> Saved!</>
                    ) : (
                      <><Pencil className="h-4 w-4" /> Save changes</>
                    )}
                  </button>

                  {/* ── Delete zone ── */}
                  <div className="mt-2 border-t border-white/[0.06] pt-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-red-300/50">Danger zone</p>
                    {!deleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(true)}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
                      >
                        <Trash2 className="h-4 w-4" /> Delete squad
                      </button>
                    ) : (
                      <div className="mt-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3">
                        <p className="text-xs text-red-200">
                          Delete <span className="font-semibold">{squad.name}</span>? This removes the squad and its tasks. <span className="font-semibold text-emerald-300">Agents will NOT be deleted.</span>
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => { void handleDelete(); }}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500/20 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/30 disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />{deleting ? "Deleting..." : "Yes, delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(false)}
                            disabled={deleting}
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-white/50 transition hover:text-white disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {tab === "edit" && !squad && (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/25">
                  Select a squad to edit.
                </div>
              )}
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="min-h-0 overflow-y-auto p-5">
            {!selectedSquadId ? (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                <Users2 className="h-10 w-10 text-white/10" />
                <h3 className="mt-4 text-lg font-semibold text-white/60">Select a squad</h3>
                <p className="mt-1 max-w-sm text-sm text-white/30">Choose a squad from the header to view and manage tasks.</p>
              </div>
            ) : !selectedTask ? (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                <Rocket className="h-10 w-10 text-white/10" />
                <h3 className="mt-4 text-lg font-semibold text-white/60">Select a task</h3>
                <p className="mt-1 max-w-sm text-sm text-white/30">Pick a task from the sidebar, or create a new one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Task header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-white">{selectedTask.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/35">
                      <span>{modeText(selectedTask.executionMode)}</span>
                      <span>·</span>
                      <span>{selectedTask.runs.length} runs</span>
                      <span>·</span>
                      <span>{fmtDate(selectedTask.createdDate)}</span>
                      {selectedTask.preferredModel && (
                        <><span>·</span><span>{selectedTask.preferredModel}</span></>
                      )}
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${statusClasses(selectedTask.status)}`}>
                    {statusText(selectedTask.status)}
                  </span>
                </div>

                {/* Prompt */}
                {selectedTask.prompt && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/60">
                    {selectedTask.prompt}
                  </div>
                )}

                {/* Squad final answer — backend rolls up latest completed run output */}
                {selectedTask.finalResponse?.trim() && (
                  <div
                    className="rounded-xl border p-4"
                    style={{ borderColor: `${accent}35`, backgroundColor: `${accent}0d` }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" style={{ color: accent }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
                        Squad answer
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${statusClasses(selectedTask.status)}`}>
                        {statusText(selectedTask.status)}
                      </span>
                      {selectedTask.finishedAtUtc && (
                        <span className="ml-auto text-[10px] text-white/30">
                          Finished {fmtDate(selectedTask.finishedAtUtc)}
                        </span>
                      )}
                    </div>
                    <div
                      className="max-h-[360px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-white/80"
                      dangerouslySetInnerHTML={{ __html: formatRunOutput(selectedTask.finalResponse.trim()) }}
                    />
                  </div>
                )}

                {/* Run stats */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center">
                    <div className="text-xl font-bold text-white">{runSummary.total}</div>
                    <div className="text-[10px] uppercase text-white/30">Total</div>
                  </div>
                  <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/8 px-3 py-3 text-center">
                    <div className="text-xl font-bold text-cyan-200">{runSummary.running}</div>
                    <div className="text-[10px] uppercase text-cyan-200/50">Running</div>
                  </div>
                  <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/8 px-3 py-3 text-center">
                    <div className="text-xl font-bold text-emerald-200">{runSummary.completed}</div>
                    <div className="text-[10px] uppercase text-emerald-200/50">Done</div>
                  </div>
                  <div className="rounded-xl border border-red-400/15 bg-red-500/8 px-3 py-3 text-center">
                    <div className="text-xl font-bold text-red-200">{runSummary.failed}</div>
                    <div className="text-[10px] uppercase text-red-200/50">Failed</div>
                  </div>
                </div>

                {/* Dispatch approval */}
                {dispatchApprovalMode && (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/8 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
                      <AlertCircle className="h-4 w-4" />
                      {dispatchApprovalMode === "pending" ? "Dispatch pending runs" : dispatchApprovalMode === "retryFailed" ? "Retry failed runs" : "Redispatch all runs"}
                    </div>
                    {dispatchEstimateBusy ? (
                      <p className="mt-2 text-xs text-amber-100/60">Estimating token usage...</p>
                    ) : dispatchEstimate ? (
                      <>
                        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="rounded-lg bg-black/20 px-2 py-2">
                            <div className="font-bold text-white">{dispatchEstimate.selectedRuns}</div>
                            <div className="text-white/35">Runs</div>
                          </div>
                          <div className="rounded-lg bg-black/20 px-2 py-2">
                            <div className="font-bold text-white">~{dispatchEstimate.estimatedInputTokensPerRun}</div>
                            <div className="text-white/35">Input/run</div>
                          </div>
                          <div className="rounded-lg bg-black/20 px-2 py-2">
                            <div className="font-bold text-white">~{dispatchEstimate.estimatedOutputTokensPerRun}</div>
                            <div className="text-white/35">Output/run</div>
                          </div>
                          <div className="rounded-lg bg-amber-500/15 px-2 py-2">
                            <div className="font-bold text-amber-100">~{dispatchEstimate.estimatedTotalTokens}</div>
                            <div className="text-amber-100/50">Total</div>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => onConfirmDispatchTask(selectedTask.id, dispatchApprovalMode)}
                            disabled={dispatchBusy || dispatchEstimateBusy || !hooksConfigured}
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-40"
                          >
                            <Zap className="h-3.5 w-3.5" />{dispatchBusy ? "Sending..." : "Approve & run"}
                          </button>
                          <button type="button" onClick={onCancelDispatchApproval} disabled={dispatchBusy} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/50 transition hover:text-white disabled:opacity-40">
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                {/* Dispatch actions */}
                {!dispatchApprovalMode && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={dispatchDisabled}
                      onClick={() => onPreviewDispatchTask(selectedTask.id, "pending")}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:opacity-30"
                      style={{ borderColor: `${accent}40`, color: accent, backgroundColor: `${accent}10` }}
                    >
                      <Play className="h-3.5 w-3.5" />Dispatch pending
                    </button>
                    <button
                      type="button"
                      disabled={dispatchDisabled}
                      onClick={() => onPreviewDispatchTask(selectedTask.id, "retryFailed")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/50 transition hover:text-white disabled:opacity-30"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />Retry failed
                    </button>
                    <button
                      type="button"
                      disabled={dispatchDisabled}
                      onClick={() => onPreviewDispatchTask(selectedTask.id, "redispatchAll")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-500/8 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/12 disabled:opacity-30"
                    >
                      <Zap className="h-3.5 w-3.5" />Redispatch all
                    </button>
                  </div>
                )}

                {/* Agent runs */}
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-white/35">Agent runs</h4>
                    {refreshingTask && <span className="text-[10px] text-white/25">Refreshing...</span>}
                  </div>
                  <div className="mt-3 space-y-2">
                    {selectedTask.runs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/25">
                        No runs yet. Dispatch to start.
                      </div>
                    ) : (
                      selectedTask.runs.map((run) => (
                        <details key={run.id} className="group rounded-xl border border-white/10 bg-white/[0.02]">
                          <summary className="flex cursor-pointer items-center gap-3 px-4 py-3">
                            <ChevronRight className="h-4 w-4 shrink-0 text-white/25 transition group-open:rotate-90" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium text-white">{run.agentName}</span>
                                <span className="text-[11px] text-white/30">{run.role || run.agentSlug || ""}</span>
                              </div>
                            </div>
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${statusClasses(run.status)}`}>
                              {statusText(run.status || "pending")}
                            </span>
                          </summary>
                          <div className="border-t border-white/5 px-4 py-3">
                            {run.dispatchError && (
                              <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-200">{run.dispatchError}</div>
                            )}
                            <div className="grid grid-cols-3 gap-3 text-xs text-white/40">
                              <div><div className="text-white/25">Started</div><div className="mt-0.5 text-white/60">{fmtDate(run.startedAtUtc)}</div></div>
                              <div><div className="text-white/25">Finished</div><div className="mt-0.5 text-white/60">{fmtDate(run.finishedAtUtc)}</div></div>
                              <div><div className="text-white/25">Session</div><div className="mt-0.5 break-all text-white/60">{run.externalSessionKey || "—"}</div></div>
                            </div>
                            <div