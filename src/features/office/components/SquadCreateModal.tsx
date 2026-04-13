import { useEffect, useMemo, useState } from "react";
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
    memberAgentIds: number[];
    leaderAgentId: number | null;
    executionMode: SquadExecutionMode;
    workspaceId: number | null;
  }) => void;
};

const EXECUTION_MODE_OPTIONS: Array<{
  value: SquadExecutionMode;
  label: string;
  description: string;
}> = [
  { value: "leader", label: "Leader first", description: "One leader receives the squad work first. Best for most teams." },
  { value: "all", label: "All members", description: "Send the same task to every selected member at the same time." },
  { value: "manual", label: "Manual", description: "Use the squad mainly for organization and chat targeting." },
  { value: "workflow", label: "Workflow", description: "Use the leader as the entry point for staged execution." },
];

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
        (left, right) =>
          Number(right.status) - Number(left.status) ||
          Number(right.isDefault) - Number(left.isDefault) ||
          left.agentName.localeCompare(right.agentName),
      ),
    [agents],
  );
  const activeAgents = useMemo(() => sortedAgents.filter((agent) => agent.status), [sortedAgents]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [executionMode, setExecutionMode] = useState<SquadExecutionMode>("leader");
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [leaderId, setLeaderId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    const fallbackAgent =
      (preferredAgentId ? sortedAgents.find((agent) => agent.gatewayAgentId === preferredAgentId) : null) ??
      activeAgents[0] ??
      sortedAgents[0] ??
      null;
    const initialMembers = fallbackAgent ? [fallbackAgent.agentId] : [];
    const defaultName = fallbackAgent ? `${fallbackAgent.agentName} Squad` : "New Squad";
    setName(defaultName);
    setDescription("");
    setExecutionMode("leader");
    setWorkspaceId(null);
    setMemberIds(initialMembers);
    setLeaderId(fallbackAgent?.agentId ?? null);
    setSearch("");
  }, [open, preferredAgentId, sortedAgents, activeAgents]);

  const filteredAgents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return sortedAgents;
    return sortedAgents.filter((agent) => {
      const haystack = [agent.agentName, agent.agentSlug, agent.role].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [search, sortedAgents]);

  const selectedMembers = useMemo(
    () => sortedAgents.filter((agent) => memberIds.includes(agent.agentId)),
    [memberIds, sortedAgents],
  );

  if (!open) return null;

  const submitDisabled = busy || !name.trim() || selectedMembers.length === 0 || !leaderId;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0a0603] shadow-[0_32px_120px_rgba(0,0,0,0.72)]">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-300/70">Create squad</div>
          <h2 className="mt-2 text-xl font-semibold text-white">Create a squad that really works</h2>
          <p className="mt-2 text-sm text-white/55">
            Choose the members, pick one leader, and set how tasks should be routed.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="min-h-0 overflow-y-auto border-r border-white/10 p-6">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Squad name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Frontend Delivery Squad"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
              />
            </label>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Who this squad is for, what it owns, and how it should help."
                className="mt-2 min-h-[120px] w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
              />
            </label>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Workspace</span>
              <select
                value={workspaceId ?? ""}
                onChange={(event) => setWorkspaceId(event.target.value ? Number(event.target.value) : null)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
              >
                <option value="">No workspace selected</option>
                {workspaces
                  .filter((workspace) => workspace.status)
                  .map((workspace) => (
                    <option key={workspace.workspaceId} value={workspace.workspaceId}>
                      {workspace.workspaceName}
                    </option>
                  ))}
              </select>
            </label>

            <div className="mt-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Execution mode</div>
              <div className="mt-3 grid gap-2">
                {EXECUTION_MODE_OPTIONS.map((option) => {
                  const active = option.value === executionMode;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setExecutionMode(option.value)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-amber-300/45 bg-amber-500/10 text-white"
                          : "border-white/10 bg-black/15 text-white/65 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <div className="font-mono text-[11px] uppercase tracking-[0.14em]">{option.label}</div>
                      <div className="mt-1 text-sm leading-5">{option.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Members</div>
                <div className="mt-1 text-xs text-white/40">Only company agents appear here.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = activeAgents.map((agent) => agent.agentId);
                  setMemberIds(next);
                  setLeaderId((current) => (current && next.includes(current) ? current : next[0] ?? null));
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Select all active
              </button>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search agent by name, slug, or role"
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
            />

            <div className="mt-3 space-y-2">
              {filteredAgents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-white/40">
                  No agents found.
                </div>
              ) : (
                filteredAgents.map((agent) => {
                  const checked = memberIds.includes(agent.agentId);
                  return (
                    <label
                      key={agent.agentId}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                        checked
                          ? "border-amber-300/40 bg-amber-500/10 text-white"
                          : "border-white/10 bg-black/15 text-white/65 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const nextChecked = event.target.checked;
                          setMemberIds((current) => {
                            const next = nextChecked
                              ? [...current, agent.agentId]
                              : current.filter((entry) => entry !== agent.agentId);
                            if (!next.includes(leaderId ?? -1)) {
                              setLeaderId(next[0] ?? null);
                            }
                            return next;
                          });
                        }}
                        className="mt-1 h-4 w-4 rounded border-white/15 bg-black/20 text-amber-300"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-medium">{agent.agentName}</div>
                          {agent.isDefault ? (
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-cyan-100">
                              Default
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
                              agent.status
                                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                                : "border-red-400/20 bg-red-500/10 text-red-100"
                            }`}
                          >
                            {agent.status ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-white/40">
                          {agent.role || "No role"}
                          {agent.agentSlug ? ` · ${agent.agentSlug}` : ""}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <label className="mt-6 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Leader agent</span>
              <select
                value={leaderId ?? ""}
                onChange={(event) => setLeaderId(event.target.value ? Number(event.target.value) : null)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
              >
                {selectedMembers.length === 0 ? <option value="">Select members first</option> : null}
                {selectedMembers.map((agent) => (
                  <option key={agent.agentId} value={agent.agentId}>
                    {agent.agentName}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Summary</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">Members</div>
                  <div className="mt-1 text-lg font-semibold text-white">{selectedMembers.length}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">Leader</div>
                  <div className="mt-1 truncate text-sm font-medium text-white">
                    {selectedMembers.find((agent) => agent.agentId === leaderId)?.agentName ?? "Not selected"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">Mode</div>
                  <div className="mt-1 text-sm font-medium text-white">
                    {EXECUTION_MODE_OPTIONS.find((option) => option.value === executionMode)?.label ?? executionMode}
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitDisabled}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                description: description.trim(),
                memberAgentIds: memberIds,
                leaderAgentId: leaderId,
                executionMode,
                workspaceId,
              })
            }
            className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? "Creating squad..." : "Create squad"}
          </button>
        </div>
      </section>
    </div>
  );
}
