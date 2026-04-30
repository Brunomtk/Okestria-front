import { Building2, Crown, Layers, ListTodo, UsersRound, Workflow } from "lucide-react";
import { notFound } from "next/navigation";
import { fetchCompaniesPaged, fetchSquadById } from "@/lib/auth/api";
import { deleteSquadAction } from "../../_actions";
import { requireAdminSession } from "../../_lib/admin";
import { Section, StatCard } from "../../_components/AdminUI";
import {
  DetailActionLink,
  DetailFact,
  DetailHeader,
  DetailTagPill,
} from "../../_components/AdminDetail";
import { AdminDeleteButton } from "../../_components/AdminDeleteButton";

function modeLabel(mode?: string | null) {
  switch ((mode ?? "").toLowerCase()) {
    case "leader":
      return "Leader";
    case "all":
      return "All members";
    case "workflow":
      return "Workflow";
    default:
      return "Manual";
  }
}

export default async function AdminSquadDetailPage({
  params,
}: {
  params: Promise<{ squadId: string }>;
}) {
  const { squadId } = await params;
  const id = Number(squadId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [squad, companies] = await Promise.all([
    fetchSquadById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!squad) notFound();

  const fallbackCompanyName =
    (companies?.result ?? []).find((item) => item.id === squad.companyId)?.name ??
    `Company #${squad.companyId}`;
  const companyName = squad.companyName?.trim() || fallbackCompanyName;
  const isActive = squad.status ?? squad.isActive ?? true;

  return (
    <div className="space-y-8">
      <DetailHeader
        backHref="/admin/squads"
        backLabel="Back to squads"
        eyebrow={`Squad · #${squad.id}`}
        title={squad.name ?? `Squad #${squad.id}`}
        subtitle="Members, workspace and default execution mode in one view."
        pills={
          <>
            <DetailTagPill variant={isActive ? "emerald" : "outline"}>
              {isActive ? "active" : "inactive"}
            </DetailTagPill>
            <DetailTagPill variant="cyan">
              {modeLabel(squad.defaultExecutionMode).toLowerCase()}
            </DetailTagPill>
            <DetailTagPill>ID #{squad.id}</DetailTagPill>
          </>
        }
        actions={
          <>
            <DetailActionLink
              href={`/admin/squads/${squad.id}/edit`}
              accent="cyan"
            >
              Edit
            </DetailActionLink>
            <form action={deleteSquadAction}>
              <input type="hidden" name="squadId" value={squad.id} />
              <AdminDeleteButton />
            </form>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Members"
          value={squad.memberCount ?? squad.members?.length ?? 0}
          icon={UsersRound}
          accent="cyan"
        />
        <StatCard
          label="Active"
          value={squad.activeMemberCount ?? 0}
          icon={UsersRound}
          accent="emerald"
        />
        <StatCard
          label="Tasks"
          value={squad.taskCount ?? 0}
          icon={ListTodo}
          accent="amber"
        />
        <StatCard
          label="Workspace"
          value={squad.workspaceName?.trim() || "Free"}
          icon={Layers}
          accent="violet"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Section title="Summary" subtitle="quick read" accent="violet">
          <div className="space-y-4 p-5">
            <DetailFact label="Tenant" value={companyName} icon={Building2} />
            <DetailFact
              label="Leader"
              value={squad.leaderAgentName?.trim() || "—"}
              icon={Crown}
            />
            <DetailFact
              label="Workspace"
              value={squad.workspaceName?.trim() || "Unattached"}
              icon={Layers}
            />
            <DetailFact
              label="Default mode"
              value={modeLabel(squad.defaultExecutionMode)}
              icon={Workflow}
            />
            <DetailFact
              label="Description"
              value={squad.description?.trim() || "No description set."}
            />
          </div>
        </Section>

        <Section title="Members" subtitle="agents on this squad" accent="cyan">
          <div className="space-y-3 p-5">
            {squad.members?.length ? (
              squad.members.map((member) => (
                <div
                  key={`${member.id ?? member.agentId}-${member.agentId}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/25 p-4"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white/90">
                      {member.agentName?.trim() || `Agent #${member.agentId}`}
                    </p>
                    <p className="mt-1 text-[11.5px] text-white/45">
                      {member.role?.trim() ||
                        member.agentSlug?.trim() ||
                        "No role set"}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {member.isLeader ? (
                      <DetailTagPill variant="amber">leader</DetailTagPill>
                    ) : null}
                    <DetailTagPill
                      variant={member.canReceiveTasks ? "cyan" : "outline"}
                    >
                      {member.canReceiveTasks ? "tasks on" : "tasks off"}
                    </DetailTagPill>
                    <DetailTagPill
                      variant={member.agentStatus ? "emerald" : "outline"}
                    >
                      {member.agentStatus ? "active" : "inactive"}
                    </DetailTagPill>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-[13px] text-white/45">
                No members on this squad yet.
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
