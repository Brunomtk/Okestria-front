import { useEffect, useMemo, useRef, useState } from "react";
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

type FormState = {
  name: string;
  description: string;
  executionMode: SquadExecutionMode;
  memberIds: string[];
  leaderId: string | null;
};

const EXECUTION_MODE_OPTIONS: Array<{
  value: SquadExecutionMode;
  label: string;
  description: string;
}> = [
  { value: "leader", label: "Leader first", description: "Send the chat task to the leader first." },
  { value: "all", label: "Everyone", description: "Send the same task to every squad member." },
  { value: "workflow", label: "Workflow", description: "Use the leader as the squad entry point." },
  { value: "manual", label: "Manual", description: "Create the squad now and route tasks manually." },
];

function buildInitialState(agents: SquadCreateAgentOption[], preferredAgentId?: string | null): FormState {
  const sortedAgents = [...agents].sort(
    (left, right) =>
      Number(right.isDefault === true) - Number(left.isDefault === true) || left.name.localeCompare(right.name),
  );

  const fallbackAgentId =
    preferredAgentId && sortedAgents.some((agent) => agent.id === preferredAgentId)
      ? preferredAgentId
      : sortedAgents[0]?.id ?? null;

  const fallbackAgentName = sortedAgents.find((agent) => agent.id === fallbackAgentId)?.name ?? "New";

  return {
    name: fallbackAgentId ? `${fallbackAgentName} Squad` : "New Squad",
    description: "",
    executionMode: "leader",
    memberIds: fallbackAgentId ? [fallbackAgentId] : [],
    leaderId: fallbackAgentId,
  };
}

export function SquadCreateModal({
  open,
  busy,
  error,
  agents,
  preferredAgentId,
  onClose,
  onSubmit,
}: SquadCreateModalProps) {
  const hasInitializedRef = useRef(false);

  const sortedAgents = useMemo(
    () =>
      [...agents].sort(
        (left, right) =>
          Number(right.isDefault === true) - Number(left.isDefault === true) || left.name.localeCompare(right.name),
      ),
    [agents],
  );

  const [form, setForm] = useState<FormState>(() => buildInitialState(agents, preferredAgentId));

  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      return;
    }

    if (!hasInitializedRef.current) {
      setForm(buildInitialState(agents, preferredAgentId));
      hasInitializedRef.current = true;
      return;
    }

    setForm((current) => {
      const validAgentIds = new Set(sortedAgents.map((agent) => agent.id));
      const memberIds = current.memberIds.filter((id) => validAgentIds.has(id));
      const nextMemberIds = memberIds.length > 0 ? memberIds : current.memberIds.length === 0 ? [] : sortedAgents[0] ? [sortedAgents[0].id] : [];
      const leaderId = current.leaderId && nextMemberIds.includes(current.leaderId)
        ? current.leaderId
        : nextMemberIds[0] ?? null;

      if (
        leaderId === current.leaderId &&
        nextMemberIds.length === current.memberIds.length &&
        nextMemberIds.every((entry, index) => entry === current.memberIds[index])
      ) {
        return current;
      }

      return {
        ...current,
        memberIds: nextMemberIds,
        leaderId,
      };
    });
  }, [open, preferredAgentId, agents, sortedAgents]);

  const selectedMembers = useMemo(
    () => sortedAgents.filter((agent) => form.memberIds.includes(agent.id)),
    [sortedAgents, form.memberIds],
  );

  const submitDisabled = busy || !form.name.trim() || selectedMembers.length === 0 || !form.leaderId;

  if (!open) return null;

  const toggleMember = (agentId: string) => {
    setForm((current) => {
      const checked = current.memberIds.includes(agentId);
      const memberIds = checked
        ? current.memberIds.filter((entry) => entry !== agentId)
        : [...current.memberIds, agentId];
      const leaderId = memberIds.includes(current.leaderId ?? "") ? current.leaderId : memberIds[0] ?? null;
      return { ...current, memberIds, leaderId };
    });
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close squad modal" />

      <section className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-amber-500/20 bg-[#0a0603] shadow-[0_32px_120px_rgba(0,0,0,0.72)]">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-300/70">Create squad</div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Build your squad</h2>
              <p className="mt-2 text-sm text-white/55">Choose the members, define the leader and save.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)]">
          <div className="min-h-0 overflow-y-auto border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
            <div className="grid gap-4">
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Squad name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Revenue Squad"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
                />
              </label>

              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Squad focused on qualification, outreach and follow-up."
                  className="mt-2 min-h-[110px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45"
                />
              </label>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Execution mode</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {EXECUTION_MODE_OPTIONS.map((option) => {
                    const active = option.value === form.executionMode;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, executionMode: option.value }))}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
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
          </div>

          <div className="min-h-0 overflow-y-auto p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Members</div>
                <div className="mt-1 text-sm text-white/45">Select who belongs to this squad.</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
                {selectedMembers.length} selected
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {sortedAgents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-white/40">
                  No company agents are available yet.
                </div>
              ) : (
                sortedAgents.map((agent) => {
                  const checked = form.memberIds.includes(agent.id);
                  const isLeader = form.leaderId === agent.id;
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => toggleMember(agent.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        checked
                          ? "border-amber-300/40 bg-amber-500/10 text-white"
                          : "border-white/10 bg-black/15 text-white/65 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md border text-[12px] ${
                          checked
                            ? "border-amber-300/50 bg-amber-300/20 text-amber-100"
                            : "border-white/15 bg-black/20 text-transparent"
                        }`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{agent.name}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
                          {agent.isDefault ? "Default agent" : "Company agent"}
                        </div>
                      </div>
                      {isLeader ? (
                        <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-amber-100">
                          Leader
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            <label className="mt-5 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Leader</span>
              <select
                value={form.leaderId ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, leaderId: event.target.value || null }))}
                disabled={selectedMembers.length === 0}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectedMembers.length === 0 ? <option value="">Select members first</option> : null}
                {selectedMembers.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Summary</div>
              <div className="mt-3 grid gap-3 text-sm text-white/70">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/45">Mode</span>
                  <span className="text-white">{EXECUTION_MODE_OPTIONS.find((item) => item.value === form.executionMode)?.label}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/45">Leader</span>
                  <span className="truncate text-white">{selectedMembers.find((agent) => agent.id === form.leaderId)?.name ?? "Not selected"}</span>
                </div>
                <div>
                  <div className="mb-2 text-white/45">Members</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.length === 0 ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/35">No members selected</span>
                    ) : (
                      selectedMembers.map((agent) => (
                        <span key={agent.id} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
                          {agent.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitDisabled}
            onClick={() =>
              onSubmit({
                name: form.name.trim(),
                description: form.description.trim(),
                memberGatewayAgentIds: form.memberIds,
                leaderGatewayAgentId: form.leaderId,
                executionMode: form.executionMode,
              })
            }
            className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? "Creating squad..." : "Create squad"}
          </button>
        </div>
      </section>
    </div>
  );
}
