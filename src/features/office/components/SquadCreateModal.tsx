import { useEffect, useMemo, useState } from "react";
import { Check, Crown, Search, Shuffle, Users2, X, Zap } from "lucide-react";
import type { SquadCatalogAgent, SquadCatalogWorkspace, SquadExecutionMode } from "@/lib/squads/api";

type SquadCreateModalProps = {
  open: boolean;
  busy: boolean;
  error: string | null;
  agents: SquadCatalogAgent[];
  workspaces?: SquadCatalogWorkspace[];
  preferredAgentId?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    iconEmoji: string | null;
    color: string | null;
    memberAgentIds: number[];
    leaderAgentId: number | null;
    executionMode: SquadExecutionMode;
    workspaceId: number | null;
  }) => void;
};

/* ── Preset palette ── */
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

const EXECUTION_MODES: Array<{
  value: SquadExecutionMode;
  label: string;
  icon: string;
  hint: string;
}> = [
  { value: "leader", label: "Leader first", icon: "👑", hint: "Leader receives work first" },
  { value: "all", label: "All at once", icon: "⚡", hint: "Every member gets the task" },
  { value: "manual", label: "Manual", icon: "✋", hint: "You decide who works" },
  { value: "workflow", label: "Workflow", icon: "🔄", hint: "Staged sequential execution" },
];

/* ── Step indicator ── */
const STEPS = ["Identity", "Members", "Settings"] as const;

export function SquadCreateModal({
  open,
  busy,
  error,
  agents,
  workspaces = [],
  preferredAgentId,
  onClose,
  onSubmit,
}: SquadCreateModalProps) {
  const sortedAgents = useMemo(
    () =>
      [...agents].sort(
        (a, b) =>
          Number(b.status) - Number(a.status) ||
          Number(b.isDefault) - Number(a.isDefault) ||
          a.agentName.localeCompare(b.agentName),
      ),
    [agents],
  );
  const activeAgents = useMemo(() => sortedAgents.filter((a) => a.status), [sortedAgents]);

  /* ── Form state ── */
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconEmoji, setIconEmoji] = useState("🚀");
  const [color, setColor] = useState(SQUAD_COLORS[0]);
  const [executionMode, setExecutionMode] = useState<SquadExecutionMode>("leader");
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [leaderId, setLeaderId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  /* Reset on open */
  useEffect(() => {
    if (!open) return;
    const fallback =
      (preferredAgentId ? sortedAgents.find((a) => a.gatewayAgentId === preferredAgentId) : null) ??
      activeAgents[0] ??
      sortedAgents[0] ??
      null;
    setStep(0);
    setName(fallback ? `${fallback.agentName} Squad` : "New Squad");
    setDescription("");
    setIconEmoji(SQUAD_EMOJIS[Math.floor(Math.random() * SQUAD_EMOJIS.length)]);
    setColor(SQUAD_COLORS[Math.floor(Math.random() * SQUAD_COLORS.length)]);
    setExecutionMode("leader");
    setWorkspaceId(null);
    setMemberIds(fallback ? [fallback.agentId] : []);
    setLeaderId(fallback?.agentId ?? null);
    setSearch("");
  }, [open, preferredAgentId, sortedAgents, activeAgents]);

  /* ── Filtered agents ── */
  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedAgents;
    return sortedAgents.filter((a) =>
      [a.agentName, a.agentSlug, a.role].join(" ").toLowerCase().includes(q),
    );
  }, [search, sortedAgents]);

  const selectedMembers = useMemo(
    () => sortedAgents.filter((a) => memberIds.includes(a.agentId)),
    [memberIds, sortedAgents],
  );

  if (!open) return null;

  /* ── Step validation ── */
  const step0Valid = name.trim().length > 0;
  const step1Valid = selectedMembers.length > 0 && leaderId !== null;
  const canSubmit = step0Valid && step1Valid && !busy;

  const handleSubmit = () => {
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      iconEmoji,
      color,
      memberAgentIds: memberIds,
      leaderAgentId: leaderId,
      executionMode,
      workspaceId,
    });
  };

  const toggleMember = (agentId: number) => {
    setMemberIds((cur) => {
      const next = cur.includes(agentId) ? cur.filter((id) => id !== agentId) : [...cur, agentId];
      if (!next.includes(leaderId ?? -1)) setLeaderId(next[0] ?? null);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-[#0b0e14] shadow-[0_32px_120px_rgba(0,0,0,.72)]"
        style={{ borderColor: `${color}30` }}
      >
        {/* ── Header with live badge ── */}
        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: `${color}20`, border: `1.5px solid ${color}50` }}
          >
            {iconEmoji}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-white">
              {name.trim() || "New Squad"}
            </h2>
            <p className="text-xs text-white/40">
              {selectedMembers.length} member{selectedMembers.length !== 1 ? "s" : ""} · {EXECUTION_MODES.find((m) => m.value === executionMode)?.label ?? executionMode}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Step tabs ── */}
        <div className="flex border-b border-white/10">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`flex-1 py-3 text-center text-xs font-medium tracking-wide transition ${
                step === i
                  ? "border-b-2 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
              style={step === i ? { borderColor: color } : undefined}
            >
              <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                style={step === i ? { backgroundColor: `${color}30`, color } : { backgroundColor: "rgba(255,255,255,.08)" }}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {/* STEP 0 — Identity */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/45">Squad name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Growth Squad"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/45">Description <span className="normal-case text-white/25">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this squad owns and how it helps."
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
                />
              </div>

              {/* Icon picker */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/45">Icon</label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SQUAD_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIconEmoji(emoji)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-base transition ${
                        iconEmoji === emoji
                          ? "bg-white/10"
                          : "bg-white/5 hover:bg-white/10"
                      }`}
                      style={iconEmoji === emoji ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/45">Color</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SQUAD_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="relative h-8 w-8 rounded-full border-2 transition hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: color === c ? "#fff" : "transparent",
                        boxShadow: color === c ? `0 0 12px ${c}60` : undefined,
                      }}
                    >
                      {color === c && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1 — Members */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-white/45">Select agents and pick a leader.</p>
                <button
                  type="button"
                  onClick={() => {
                    const ids = activeAgents.map((a) => a.agentId);
                    setMemberIds(ids);
                    setLeaderId((cur) => (cur && ids.includes(cur) ? cur : ids[0] ?? null));
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  Select all active
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search agents..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white outline-none transition focus:border-white/25"
                />
              </div>

              <div className="space-y-1.5">
                {filteredAgents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/30">
                    No agents found.
                  </div>
                ) : (
                  filteredAgents.map((agent) => {
                    const checked = memberIds.includes(agent.agentId);
                    const isLeader = leaderId === agent.agentId;
                    return (
                      <div
                        key={agent.agentId}
                        className={`group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition cursor-pointer ${
                          checked
                            ? "border-white/20 bg-white/[0.06]"
                            : "border-white/[0.06] bg-transparent hover:border-white/12 hover:bg-white/[0.03]"
                        }`}
                        onClick={() => toggleMember(agent.agentId)}
                      >
                        {/* checkbox */}
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                            checked ? "border-transparent" : "border-white/20 bg-transparent"
                          }`}
                          style={checked ? { backgroundColor: color } : undefined}
                        >
                          {checked && <Check className="h-3 w-3 text-white" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-white">{agent.agentName}</span>
                            {!agent.status && (
                              <span className="rounded-full border border-red-400/20 bg-red-500/10 px-1.5 py-0.5 text-[9px] uppercase text-red-200">off</span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/35">{agent.role || agent.agentSlug || "No role"}</div>
                        </div>

                        {/* Leader button */}
                        {checked && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setLeaderId(agent.agentId); }}
                            title="Set as leader"
                            className={`flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-bold uppercase tracking-wider transition ${
                              isLeader
                                ? "text-amber-200"
                                : "text-white/25 hover:text-white/50"
                            }`}
                            style={isLeader ? { backgroundColor: "rgba(245,158,11,.15)" } : undefined}
                          >
                            <Crown className="h-3.5 w-3.5" />
                            {isLeader ? "Leader" : ""}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STEP 2 — Settings */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/45">Execution mode</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {EXECUTION_MODES.map((m) => {
                    const active = m.value === executionMode;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setExecutionMode(m.value)}
                        className={`rounded-xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-white/20 bg-white/[0.07] text-white"
                            : "border-white/[0.06] text-white/50 hover:border-white/15 hover:text-white/70"
                        }`}
                        style={active ? { borderColor: `${color}50` } : undefined}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{m.icon}</span>
                          <span className="text-sm font-medium">{m.label}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-white/35">{m.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {workspaces.filter((w) => w.status).length > 0 && (
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/45">Workspace <span className="normal-case text-white/25">(optional)</span></label>
                  <select
                    value={workspaceId ?? ""}
                    onChange={(e) => setWorkspaceId(e.target.value ? Number(e.target.value) : null)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="">No workspace</option>
                    {workspaces
                      .filter((w) => w.status)
                      .map((w) => (
                        <option key={w.workspaceId} value={w.workspaceId}>
                          {w.workspaceName}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Preview card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/35">Preview</div>
                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${color}20`, border: `1.5px solid ${color}50` }}
                  >
                    {iconEmoji}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{name.trim() || "New Squad"}</div>
                    <div className="text-[11px] text-white/40">
                      {selectedMembers.length} member{selectedMembers.length !== 1 ? "s" : ""}
                      {selectedMembers.find((a) => a.agentId === leaderId) && (
                        <> · <Crown className="mb-0.5 inline h-3 w-3 text-amber-400" /> {selectedMembers.find((a) => a.agentId === leaderId)?.agentName}</>
                      )}
                    </div>
                  </div>
                </div>
                {description.trim() && (
                  <p className="mt-2 text-xs text-white/35">{description}</p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            {step > 0 ? "Back" : "Cancel"}
          </button>

          <div className="flex items-center gap-2">
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={step === 0 ? !step0Valid : !step1Valid}
                onClick={() => setStep(step + 1)}
                className="rounded-lg px-5 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: `${color}25`, border: `1px solid ${color}40` }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: `${color}30`, border: `1px solid ${color}50` }}
              >
                <Zap className="h-4 w-4" />
                {busy ? "Creating..." : "Create squad"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
