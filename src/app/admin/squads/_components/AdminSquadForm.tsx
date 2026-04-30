"use client";

/**
 * v145 — Admin · Squad form (cosmic edition).
 *
 * Same logic and submitted FormData shape as v144 — only the visual
 * layer was rebuilt to match the rest of the dark-glass admin look.
 */

import { useMemo, useState } from "react";
import { Crown } from "lucide-react";
import { FormActions, FormSectionStacked } from "../../_lib/forms";
import { Section } from "../../_components/AdminUI";
import type {
  OkestriaCompany,
  OkestriaSquadCatalog,
  OkestriaSquadDetails,
} from "@/lib/auth/api";

type CompanyOption = Pick<OkestriaCompany, "id" | "name">;

type AdminSquadFormProps = {
  mode: "create" | "edit";
  companies: CompanyOption[];
  catalogs: Record<number, OkestriaSquadCatalog>;
  squad?: OkestriaSquadDetails | null;
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
};

const executionModeOptions = [
  { value: "manual", label: "Manual" },
  { value: "leader", label: "Leader" },
  { value: "all", label: "All members" },
  { value: "workflow", label: "Workflow" },
] as const;

/* shared cosmic input styles */
const inputCls =
  "block w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-[13.5px] text-white placeholder:text-white/30 transition focus:border-violet-400/55 focus:outline-none focus:ring-2 focus:ring-violet-400/20";
const labelCls =
  "block font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55";
const selectOptCls = "bg-[#0a0d18] text-white";

export default function AdminSquadForm({
  mode,
  companies,
  catalogs,
  squad,
  action,
  cancelHref,
}: AdminSquadFormProps) {
  const initialCompanyId = squad?.companyId ?? companies[0]?.id ?? 0;
  const [companyId, setCompanyId] = useState<number>(initialCompanyId);
  const [leaderAgentId, setLeaderAgentId] = useState<number>(
    squad?.leaderAgentId ?? 0,
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>(
    squad?.members
      ?.map((member) => member.agentId)
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      ) ?? [],
  );

  const catalog = catalogs[companyId] ?? {
    companyId,
    agents: [],
    workspaces: [],
  };
  const agents = useMemo(
    () =>
      [...(catalog.agents ?? [])].sort(
        (a, b) =>
          Number(b.status) - Number(a.status) ||
          (a.agentName ?? "").localeCompare(b.agentName ?? ""),
      ),
    [catalog.agents],
  );
  const workspaces = useMemo(
    () =>
      [...(catalog.workspaces ?? [])].sort(
        (a, b) =>
          Number(b.status) - Number(a.status) ||
          (a.workspaceName ?? "").localeCompare(b.workspaceName ?? ""),
      ),
    [catalog.workspaces],
  );

  const selectedMembers = useMemo(
    () => agents.filter((agent) => selectedMemberIds.includes(agent.agentId)),
    [agents, selectedMemberIds],
  );

  const toggleMember = (agentId: number) => {
    setSelectedMemberIds((current) =>
      current.includes(agentId)
        ? current.filter((value) => value !== agentId)
        : [...current, agentId],
    );
  };

  const handleCompanyChange = (value: string) => {
    const nextCompanyId = Number(value);
    if (!Number.isFinite(nextCompanyId) || nextCompanyId <= 0) return;
    setCompanyId(nextCompanyId);
    const nextCatalog =
      catalogs[nextCompanyId] ?? { agents: [], workspaces: [] };
    const activeAgents = nextCatalog.agents?.filter((agent) => agent.status) ??
      [];
    setSelectedMemberIds([]);
    setLeaderAgentId(activeAgents[0]?.agentId ?? 0);
  };

  return (
    <form action={action} className="max-w-5xl space-y-6">
      {squad?.id ? (
        <input type="hidden" name="squadId" value={squad.id} />
      ) : null}

      {/* ----- Identity ----- */}
      <FormSectionStacked
        title="Identity"
        description="Where the squad lives and what it's called."
        accent="violet"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block space-y-2">
            <span className={labelCls}>Company</span>
            <select
              name="companyId"
              value={String(companyId || "")}
              onChange={(event) => handleCompanyChange(event.target.value)}
              className={inputCls}
            >
              <option value="" className={selectOptCls}>
                Select…
              </option>
              {companies.map((company) => (
                <option
                  key={company.id}
                  value={company.id}
                  className={selectOptCls}
                >
                  {company.name ?? `Company #${company.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className={labelCls}>
              Name <span className="text-rose-300">*</span>
            </span>
            <input
              name="name"
              required
              defaultValue={squad?.name ?? ""}
              placeholder="e.g. Sales squad"
              className={inputCls}
            />
          </label>

          <label className="block space-y-2">
            <span className={labelCls}>Slug</span>
            <input
              name="slug"
              defaultValue={squad?.slug ?? ""}
              placeholder="sales-squad"
              className={inputCls}
            />
          </label>

          <label className="block space-y-2">
            <span className={labelCls}>Workspace</span>
            <select
              name="workspaceId"
              defaultValue={String(squad?.workspaceId ?? "")}
              key={`workspace-${companyId}-${squad?.workspaceId ?? "new"}`}
              className={inputCls}
            >
              <option value="" className={selectOptCls}>
                Unattached
              </option>
              {workspaces.map((workspace) => (
                <option
                  key={workspace.workspaceId}
                  value={workspace.workspaceId}
                  className={selectOptCls}
                >
                  {workspace.workspaceName ??
                    `Workspace #${workspace.workspaceId}`}
                  {workspace.status ? "" : " · inactive"}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className={labelCls}>Leader</span>
            <select
              name="leaderAgentId"
              value={String(leaderAgentId || "")}
              onChange={(event) =>
                setLeaderAgentId(Number(event.target.value) || 0)
              }
              className={inputCls}
            >
              <option value="" className={selectOptCls}>
                Select…
              </option>
              {agents.map((agent) => (
                <option
                  key={agent.agentId}
                  value={agent.agentId}
                  className={selectOptCls}
                >
                  {agent.agentName ?? `Agent #${agent.agentId}`}
                  {agent.role ? ` · ${agent.role}` : ""}
                  {agent.status ? "" : " · inactive"}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className={labelCls}>Default mode</span>
            <select
              name="defaultExecutionMode"
              defaultValue={squad?.defaultExecutionMode ?? "manual"}
              className={inputCls}
            >
              {executionModeOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className={selectOptCls}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 xl:col-span-3">
            <span className={labelCls}>Description</span>
            <textarea
              name="description"
              defaultValue={squad?.description ?? ""}
              placeholder="One sentence describing this squad's responsibility."
              rows={3}
              className={`${inputCls} min-h-[6rem] resize-y`}
            />
          </label>

          <label className="block space-y-2">
            <span className={labelCls}>Status</span>
            <select
              name="status"
              defaultValue={
                (squad?.status ?? squad?.isActive ?? true) ? "true" : "false"
              }
              className={inputCls}
            >
              <option value="true" className={selectOptCls}>
                Active
              </option>
              <option value="false" className={selectOptCls}>
                Inactive
              </option>
            </select>
          </label>
        </div>
      </FormSectionStacked>

      {/* ----- Members ----- */}
      <Section
        title="Members"
        subtitle="Pick the agents that actually run this squad."
        accent="cyan"
      >
        <div className="grid gap-5 p-5 lg:grid-cols-[1.35fr_0.65fr]">
          {/* Available agents */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="border-b border-white/10 px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
              Available agents · {agents.length}
            </div>
            <div className="max-h-[360px] divide-y divide-white/5 overflow-auto">
              {agents.length ? (
                agents.map((agent) => {
                  const checked = selectedMemberIds.includes(agent.agentId);
                  const leader = leaderAgentId === agent.agentId;
                  return (
                    <label
                      key={agent.agentId}
                      className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-white/[0.04]"
                    >
                      <input
                        type="checkbox"
                        name="memberAgentIds"
                        value={agent.agentId}
                        checked={checked}
                        onChange={() => toggleMember(agent.agentId)}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-black/40 accent-violet-400"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold text-white/90">
                            {agent.agentName ?? `Agent #${agent.agentId}`}
                          </span>
                          {leader ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-amber-200">
                              <Crown className="h-2.5 w-2.5" />
                              leader
                            </span>
                          ) : null}
                          {!agent.status ? (
                            <span className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/45">
                              inactive
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[11.5px] text-white/45">
                          {agent.role?.trim() ||
                            agent.agentSlug?.trim() ||
                            `Agent ID ${agent.agentId}`}
                        </p>
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-[13px] text-white/45">
                  No agents available for this company.
                </div>
              )}
            </div>
          </div>

          {/* Summary + selected list */}
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/[0.05] to-cyan-500/[0.04] p-4">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-violet-200/70">
                Summary
              </p>
              <div className="mt-3 space-y-2 text-[12.5px]">
                <SumRow label="Members" value={String(selectedMembers.length)} />
                <SumRow
                  label="Leader"
                  value={
                    agents.find((item) => item.agentId === leaderAgentId)
                      ?.agentName ?? "—"
                  }
                />
                <SumRow
                  label="Workspace"
                  value={
                    workspaces.find(
                      (item) =>
                        item.workspaceId === Number(squad?.workspaceId ?? 0),
                    )?.workspaceName ?? "Free"
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
                Selected members
              </p>
              <div className="mt-3 space-y-2">
                {selectedMembers.length ? (
                  selectedMembers.map((agent) => (
                    <div
                      key={agent.agentId}
                      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2"
                    >
                      <div className="text-[12.5px] font-semibold text-white/90">
                        {agent.agentName ?? `Agent #${agent.agentId}`}
                      </div>
                      <div className="text-[11px] text-white/45">
                        {agent.role?.trim() ||
                          agent.agentSlug?.trim() ||
                          "No role set"}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-white/45">
                    Select at least the leader to make the squad ready.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Section>

      <FormActions
        cancelHref={cancelHref}
        submitLabel={mode === "create" ? "Create squad" : "Save changes"}
      />
    </form>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/55">{label}</span>
      <span className="truncate text-right font-medium text-white/90">
        {value}
      </span>
    </div>
  );
}
