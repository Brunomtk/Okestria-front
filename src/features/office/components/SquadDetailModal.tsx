import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  Crown,
  Edit3,
  Loader2,
  Save,
  Shield,
  Trash2,
  Users2,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import type {
  SquadCatalog,
  SquadCatalogAgent,
  SquadCatalogWorkspace,
  SquadExecutionMode,
  SquadMember,
  SquadSummary,
} from "@/lib/squads/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SquadDetailModalProps = {
  open: boolean;
  squad: SquadSummary | null;
  catalog: SquadCatalog | null;
  catalogLoading: boolean;
  saveBusy: boolean;
  deleteBusy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: {
    squadId: number;
    name: string;
    description: string;
    memberAgentIds: number[];
    leaderAgentId: number | null;
    executionMode: SquadExecutionMode;
    workspaceId: number | null;
  }) => void;
  onDelete: (squadId: number) => void;
  onOpenOps: (squadId: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EXECUTION_MODES: Array<{
  value: SquadExecutionMode;
  label: string;
  icon: typeof Crown;
  desc: string;
  color: string;
}> = [
  {
    value: "leader",
    label: "Leader",
    icon: Crown,
    desc: "Leader receives the task first and delegates.",
    color: "amber",
  },
  {
    value: "all",
    label: "All members",
    icon: Users2,
    desc: "Same task sent to every member simultaneously.",
    color: "cyan",
  },
  {
    value: "workflow",
    label: "Workflow",
    icon: Workflow,
    desc: "Staged execution through the leader entry point.",
    color: "violet",
  },
  {
    value: "manual",
    label: "Manual",
    icon: Shield,
    desc: "Organization and chat targeting only.",
    color: "zinc",
  },
];

const modeAccent = (mode: SquadExecutionMode) => {
  switch (mode) {
    case "leader":
      return { border: "border-amber-400/30", bg: "bg-amber-500/10", text: "text-amber-200", dot: "bg-amber-400" };
    case "all":
      return { border: "border-cyan-400/30", bg: "bg-cyan-500/10", text: "text-cyan-200", dot: "bg-cyan-400" };
    case "workflow":
      return { border: "border-violet-400/30", bg: "bg-violet-500/10", text: "text-violet-200", dot: "bg-violet-400" };
    default:
      return { border: "border-white/15", bg: "bg-white/5", text: "text-white/70", dot: "bg-white/40" };
  }
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SquadDetailModal({
  open,
  squad,
  catalog,
  catalogLoading,
  saveBusy,
  deleteBusy,
  error,
  onClose,
  onSave,
  onDelete,
  onOpenOps,
}: SquadDetailModalProps) {
  /* ---------- view state ---------- */
  const [view, setView] = useState<"detail" | "edit" | "confirmDelete">("detail");

  /* ---------- edit state ---------- */
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMode, setEditMode] = useState<SquadExecutionMode>("leader");
  const [editWorkspaceId, setEditWorkspaceId] = useState<number | null>(null);
  const [editMemberIds, setEditMemberIds] = useState<number[]>([]);
  const [editLeaderId, setEditLeaderId] = useState<number | null>(null);
  const [editSearch, setEditSearch] = useState("");

  /* ---------- reset on open / squad change ---------- */
  useEffect(() => {
    if (!open || !squad) return;
    setView("detail");
    setEditName(squad.name);
    setEditDescription(squad.description);
    setEditMode(squad.executionMode);
    setEditWorkspaceId(null);
    setEditSearch("");
    const memberBackendIds = squad.members
      .map((m) => m.backendAgentId)
      .filter((id): id is number => id !== null && id > 0);
    setEditMemberIds(memberBackendIds);
    const leaderBackendId =
      squad.members.find((m) => m.isLeader)?.backendAgentId ?? memberBackendIds[0] ?? null;
    setEditLeaderId(leaderBackendId);
  }, [open, squad]);

  /* ---------- catalog helpers ---------- */
  const sortedAgents = useMemo(
    () =>
      [...(catalog?.agents ?? [])].sort(
        (a, b) =>
          Number(b.status) - Number(a.status) ||
          Number(b.isDefault) - Number(a.isDefault) ||
          a.agentName.localeCompare(b.agentName),
      ),
    [catalog],
  );

  const filteredAgents = useMemo(() => {
    const needle = editSearch.trim().toLowerCase();
    if (!needle) return sortedAgents;
    return sortedAgents.filter((a) =>
      [a.agentName, a.agentSlug, a.role].join(" ").toLowerCase().includes(needle),
    );
  }, [editSearch, sortedAgents]);

  const workspaces = useMemo(
    () => (catalog?.workspaces ?? []).filter((w) => w.status),
    [catalog],
  );

  const selectedCatalogMembers = useMemo(
    () => sortedAgents.filter((a) => editMemberIds.includes(a.agentId)),
    [editMemberIds, sortedAgents],
  );

  /* ---------- handlers ---------- */
  const handleStartEdit = useCallback(() => {
    setView("edit");
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (!squad) return;
    setView("detail");
    setEditName(squad.name);
    setEditDescription(squad.description);
    setEditMode(squad.executionMode);
    setEditWorkspaceId(null);
    setEditSearch("");
    const memberBackendIds = squad.members
      .map((m) => m.backendAgentId)
      .filter((id): id is number => id !== null && id > 0);
    setEditMemberIds(memberBackendIds);
    setEditLeaderId(
      squad.members.find((m) => m.isLeader)?.backendAgentId ?? memberBackendIds[0] ?? null,
    );
  }, [squad]);

  const handleSave = useCallback(() => {
    if (!squad) return;
    onSave({
      squadId: Number(squad.id),
      name: editName.trim(),
      description: editDescription.trim(),
      memberAgentIds: editMemberIds,
      leaderAgentId: editLeaderId,
      executionMode: editMode,
      workspaceId: editWorkspaceId,
    });
  }, [squad, editName, editDescription, editMemberIds, editLeaderId, editMode, editWorkspaceId, onSave]);

  const handleConfirmDelete = useCallback(() => {
    if (!squad) return;
    onDelete(Number(squad.id));
  }, [squad, onDelete]);

  const toggleMember = useCallback(
    (agentId: number, checked: boolean) => {
      setEditMemberIds((current) => {
        const next = checked ? [...current, agentId] : current.filter((id) => id !== agentId);
        if (!next.includes(editLeaderId ?? -1)) {
          setEditLeaderId(next[0] ?? null);
        }
        return next;
      });
    },
    [editLeaderId],
  );

  if (!open || !squad) return null;

  const accent = modeAccent(squad.executionMode);
  const leader = squad.members.find((m) => m.isLeader);
  const saveDisabled = saveBusy || !editName.trim() || editMemberIds.length === 0 || !editLeaderId;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <section className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-amber-500/20 bg-[#0a0603] shadow-[0_32px_120px_rgba(0,0,0,0.72)]">
        {/* ---- HEADER ---- */}
        <header className="border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-300/70">
                {view === "edit" ? "Edit squad" : view === "confirmDelete" ? "Delete squad" : "Squad detail"}
              </div>
              <h2 className="mt-2 truncate text-2xl font-semibold text-white">{squad.name}</h2>
              {squad.description && view === "detail" && (
                <p className="mt-2 text-sm leading-relaxed text-white/50">{squad.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick stats row – detail view only */}
          {view === "detail" && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${accent.border} ${accent.bg} ${accent.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
                {EXECUTION_MODES.find((m) => m.value === squad.executionMode)?.label ?? squad.executionMode}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                <Users2 className="h-3 w-3" />
                {squad.members.length} member{squad.members.length !== 1 ? "s" : ""}
              </span>
              {leader && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
                  <Crown className="h-3 w-3" />
                  {leader.name}
                </span>
              )}
            </div>
          )}
        </header>

        {/* ---- BODY ---- */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* =========== DETAIL VIEW =========== */}
          {view === "detail" && (
            <div className="p-6 space-y-6">
              {/* Members grid */}
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 mb-3">Members</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {squad.members.map((member, idx) => (
                    <div
                      key={member.backendAgentId ?? `m-${idx}`}
                      className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                        member.isLeader
                          ? "border-amber-400/25 bg-amber-500/8"
                          : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          member.isLeader
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-white/5 text-white/40"
                        }`}
                      >
                        {member.isLeader ? <Crown className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{member.name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/40">
                          {member.isLeader && (
                            <span className="text-amber-300/80">Leader</span>
                          )}
                          {member.gatewayAgentId ? (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Connected
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                              No gateway
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {squad.members.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/35">
                      No members in this squad yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Execution mode info */}
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 mb-3">Execution mode</div>
                {(() => {
                  const modeInfo = EXECUTION_MODES.find((m) => m.value === squad.executionMode);
                  const Icon = modeInfo?.icon ?? Workflow;
                  return (
                    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${accent.border} ${accent.bg}`}>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${accent.text}`}>{modeInfo?.label ?? squad.executionMode}</div>
                        <div className="mt-1 text-xs text-white/45">{modeInfo?.desc ?? ""}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
              )}
            </div>
          )}

          {/* =========== EDIT VIEW =========== */}
          {view === "edit" && (
            <div className="p-6 space-y-5">
              {catalogLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-300/60" />
                  <span className="ml-3 text-sm text-white/45">Loading catalog...</span>
                </div>
              ) : (
                <>
                  {/* Name */}
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Squad name</span>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
                    />
                  </label>

                  {/* Description */}
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Description</span>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
                    />
                  </label>

                  {/* Execution mode */}
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 mb-2">Execution mode</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {EXECUTION_MODES.map((opt) => {
                        const active = opt.value === editMode;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEditMode(opt.value)}
                            className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                              active
                                ? "border-amber-300/40 bg-amber-500/10 text-white"
                                : "border-white/10 bg-black/15 text-white/60 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-amber-300" : "text-white/35"}`} />
                            <div>
                              <div className="text-xs font-medium">{opt.label}</div>
                              <div className="mt-0.5 text-[11px] text-white/40">{opt.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Workspace */}
                  {workspaces.length > 0 && (
                    <label className="block">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Workspace</span>
                      <select
                        value={editWorkspaceId ?? ""}
                        onChange={(e) => setEditWorkspaceId(e.target.value ? Number(e.target.value) : null)}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
                      >
                        <option value="">No workspace</option>
                        {workspaces.map((w) => (
                          <option key={w.workspaceId} value={w.workspaceId}>{w.workspaceName}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {/* Members */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Members</div>
                        <div className="mt-0.5 text-[11px] text-white/30">
                          {editMemberIds.length} selected
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const allActive = sortedAgents.filter((a) => a.status).map((a) => a.agentId);
                          setEditMemberIds(allActive);
                          if (!allActive.includes(editLeaderId ?? -1)) {
                            setEditLeaderId(allActive[0] ?? null);
                          }
                        }}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
                      >
                        Select all active
                      </button>
                    </div>

                    <input
                      value={editSearch}
                      onChange={(e) => setEditSearch(e.target.value)}
                      placeholder="Search agents..."
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none transition focus:border-amber-300/45 mb-2"
                    />

                    <div className="max-h-[220px] space-y-1.5 overflow-y-auto rounded-xl border border-white/8 bg-black/10 p-2">
                      {filteredAgents.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-white/35">No agents found.</div>
                      ) : (
                        filteredAgents.map((agent) => {
                          const checked = editMemberIds.includes(agent.agentId);
                          return (
                            <label
                              key={agent.agentId}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                                checked
                                  ? "border-amber-300/30 bg-amber-500/8 text-white"
                                  : "border-transparent bg-transparent text-white/55 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => toggleMember(agent.agentId, e.target.checked)}
                                className="h-4 w-4 rounded border-white/15 bg-black/20 text-amber-300 accent-amber-400"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium">{agent.agentName}</span>
                                  {!agent.status && (
                                    <span className="rounded border border-red-400/20 bg-red-500/10 px-1.5 py-0.5 text-[9px] text-red-200">Inactive</span>
                                  )}
                                </div>
                                {agent.role && <div className="mt-0.5 truncate text-[11px] text-white/35">{agent.role}</div>}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Leader select */}
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Leader agent</span>
                    <select
                      value={editLeaderId ?? ""}
                      onChange={(e) => setEditLeaderId(e.target.value ? Number(e.target.value) : null)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
                    >
                      {selectedCatalogMembers.length === 0 ? (
                        <option value="">Select members first</option>
                      ) : (
                        selectedCatalogMembers.map((a) => (
                          <option key={a.agentId} value={a.agentId}>{a.agentName}</option>
                        ))
                      )}
                    </select>
                  </label>

                  {error && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
                  )}
                </>
              )}
            </div>
          )}

          {/* =========== CONFIRM DELETE VIEW =========== */}
          {view === "confirmDelete" && (
            <div className="p-6">
              <div className="flex flex-col items-center text-center py-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">Delete this squad?</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/50">
                  This will permanently remove <strong className="text-white/80">{squad.name}</strong> and
                  all its {squad.members.length} member{squad.members.length !== 1 ? "s" : ""}.
                  Tasks already dispatched won&apos;t be affected, but you won&apos;t be able to manage them from this squad anymore.
                </p>
                <p className="mt-3 text-xs text-red-300/70">This action cannot be undone.</p>

                {error && (
                  <div className="mt-4 w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
                )}

                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setView("detail")}
                    disabled={deleteBusy}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-45"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteBusy}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/15 px-5 py-2.5 text-sm font-medium text-red-100 transition hover:bg-red-500/25 disabled:opacity-45"
                  >
                    {deleteBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete squad
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---- FOOTER ---- */}
        <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
          {view === "detail" && (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setView("confirmDelete")}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-300/80 transition hover:bg-red-500/15 hover:text-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
              <button
                type="button"
                onClick={() => onOpenOps(squad.id)}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/15"
              >
                <Zap className="h-3.5 w-3.5" />
                Squad Ops
              </button>
            </>
          )}

          {view === "edit" && (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saveBusy}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-45"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveDisabled}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saveBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save changes
                  </>
                )}
              </button>
            </>
          )}

          {view === "confirmDelete" && (
            <div />
          )}
        </footer>
      </section>
    </div>
  );
}
