import { Bot, Building2, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { fetchAgentById, fetchCompaniesPaged } from "@/lib/auth/api";
import { deleteAgentAction } from "../../_actions";
import { requireAdminSession } from "../../_lib/admin";
import { Section } from "../../_components/AdminUI";
import {
  DetailActionLink,
  DetailFact,
  DetailHeader,
  DetailTagPill,
} from "../../_components/AdminDetail";
import { AdminDeleteButton } from "../../_components/AdminDeleteButton";

export default async function AdminAgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const id = Number(agentId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [agent, companies] = await Promise.all([
    fetchAgentById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!agent) notFound();
  const companyName =
    (companies?.result ?? []).find((item) => item.id === agent.companyId)
      ?.name ?? `Company #${agent.companyId}`;

  return (
    <div className="space-y-8">
      <DetailHeader
        backHref="/admin/agents"
        backLabel="Back to agents"
        eyebrow={`Agent · #${agent.id}`}
        title={agent.name ?? `Agent #${agent.id}`}
        subtitle="Live administrative view of this agent."
        pills={
          <>
            <DetailTagPill variant={agent.status !== false ? "emerald" : "outline"}>
              {agent.status !== false ? "active" : "inactive"}
            </DetailTagPill>
            <DetailTagPill>ID #{agent.id}</DetailTagPill>
            {agent.isDefault ? (
              <DetailTagPill variant="amber">default</DetailTagPill>
            ) : null}
          </>
        }
        actions={
          <>
            <DetailActionLink
              href={`/admin/agents/${agent.id}/edit`}
              accent="violet"
            >
              Edit
            </DetailActionLink>
            <form action={deleteAgentAction}>
              <input type="hidden" name="agentId" value={agent.id} />
              <AdminDeleteButton />
            </form>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Section title="Avatar" subtitle="how the agent shows up" accent="violet">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-violet-200 text-[34px]"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(167,139,250,0.30) 0%, rgba(34,211,238,0.16) 60%, transparent 100%)",
                border: "1px solid rgba(167,139,250,0.32)",
              }}
            >
              {agent.emoji?.trim() ? (
                <span>{agent.emoji}</span>
              ) : (
                <Bot className="h-12 w-12" />
              )}
            </div>
            <div>
              <p className="text-[18px] font-semibold text-white/95">
                {agent.name ?? "—"}
              </p>
              <p className="font-mono text-[11px] text-white/50">
                @{agent.slug ?? `agent-${agent.id}`}
              </p>
            </div>
          </div>
        </Section>

        <Section title="Identity" subtitle="primary record" accent="cyan">
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <DetailFact label="Role" value={agent.role ?? "—"} />
            <DetailFact
              label="Tenant"
              value={companyName}
              icon={Building2}
            />
            <DetailFact
              label="Description"
              span={2}
              value={agent.description ?? "No description set."}
            />
            <DetailFact label="Emoji" value={agent.emoji ?? "—"} />
            <DetailFact
              label="Default agent"
              value={
                <span className="inline-flex items-center gap-1.5">
                  {agent.isDefault ? (
                    <Star className="h-3.5 w-3.5 text-amber-300" />
                  ) : null}
                  {agent.isDefault ? "Yes" : "No"}
                </span>
              }
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
