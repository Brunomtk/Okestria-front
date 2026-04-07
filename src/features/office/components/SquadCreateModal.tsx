import { useEffect, useMemo, useState } from "react";
import type { SquadExecutionMode } from "@/lib/squads/api";

type SquadCreateAgentOption = {
  id: string;
  name: string;
  isDefault?: boolean;
};

type SquadCreateModalProps = {
  open: boolean;
  busy: boolean;
  error: string | null;
  agents: SquadCreateAgentOption[];
  preferredAgentId?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    memberGatewayAgentIds: string[];
    leaderGatewayAgentId: string | null;
    executionMode: SquadExecutionMode;
  }) => void;
};

const EXECUTION_MODE_OPTIONS: Array<{
  value: SquadExecutionMode;
  label: string;
  description: string;
}> = [
  { value: "leader", label: "Leader", description: "The leader agent receives chat tasks first." },
  { value: "all", label: "All members", description: "Send the same chat task to every member in the squad." },
  { value: "manual", label: "Manual", description: "Keep the squad for grouping and route tasks to the leader for now." },
  { value: "workflow", label: "Workflow", description: "Use the leader as the entry point for staged task execution." },
];

export function SquadCreateModal({
  open,
  busy,
  error,
  agents,
  preferredAgentId,
  onClose,
  onSubmit,
}: SquadCreateModalProps) {
  const sortedAgents = useMemo(
    () => [...agents].sort((left, right) => Number(right.isDefault === true) - Number(left.isDefault === true) || left.name.localeCompare(right.name)),
    [agents],
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [executionMode, setExecutionMode] = useState<SquadExecutionMode>("leader");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [leaderId, setLeaderId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const fallbackAgentId =
      preferredAgentId && sortedAgents.some((agent) => agent.id === preferredAgentId)
        ? preferredAgentId
        : sortedAgents[0]?.id ?? null;
    const initialMembers = fallbackAgentId ? [fallbackAgentId] : [];
    const defaultName = fallbackAgentId
      ? `${sortedAgents.find((agent) => agent.id === fallbackAgentId)?.name ?? "New"} Squad`
      : "New Squad";
    setName(defaultName);
    setDescription("");
    setExecutionMode("leader");
    setMemberIds(initialMembers);
    setLeaderId(fallbackAgentId);
  }, [open, preferredAgentId, sortedAgents]);

  if (!open) return null;

  const selectedMembers = sortedAgents.filter((agent) => memberIds.includes(agent.id));
  const submitDisabled = busy || !name.trim() || selectedMembers.length === 0 || !leaderId;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0a0603] shadow-[0_32px_120px_rgba(0,0,0,0.72)]">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-300/70">Create squad</div>
          <h2 className="mt-2 text-xl font-semibold text-white">Build a squad from your company agents</h2>
          <p className="mt-2 text-sm text-white/55">
            Pick the members, choose a leader and define how chat tasks should flow through the squad.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[1.05fr_0.95fr]">
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
                placeholder="Squad responsible for planning, coding and reviewing frontend work."
                className="mt-2 min-h-[120px] w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
              />
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
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Members</div>
            <div className="mt-3 space-y-2">
              {sortedAgents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-white/40">
                  No company agents are available yet.
                </div>
              ) : (
                sortedAgents.map((agent) => {
                  const checked = memberIds.includes(agent.id);
                  return (
                    <label
                      key={agent.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
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
                              ? [...current, agent.id]
                              : current.filter((entry) => entry !== agent.id);
                            if (!next.includes(leaderId ?? "")) {
                              setLeaderId(next[0] ?? null);
                            }
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-white/15 bg-black/20 text-amber-300"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{agent.name}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
                          {agent.isDefault ? "Default agent" : "Company agent"}
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
                onChange={(event) => setLeaderId(event.target.value || null)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
              >
                {selectedMembers.length === 0 ? <option value="">Select members first</option> : null}
                {selectedMembers.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </label>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Ready for chat</div>
              <div className="mt-2 text-sm text-white/70">
                The squad will appear in chat as a target, and messages will route using the selected execution mode.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedMembers.length === 0 ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/35">No members selected</span>
                ) : (
                  selectedMembers.map((agent) => (
                    <span key={agent.id} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
                      {agent.name}{leaderId === agent.id ? " · leader" : ""}
                    </span>
                  ))
                )}
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
                memberGatewayAgentIds: memberIds,
                leaderGatewayAgentId: leaderId,
                executionMode,
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
