import { Building2, Layers } from "lucide-react";
import { notFound } from "next/navigation";
import { fetchCompaniesPaged, fetchWorkspaceById } from "@/lib/auth/api";
import { requireAdminSession } from "../../_lib/admin";
import { Section } from "../../_components/AdminUI";
import {
  DetailActionLink,
  DetailFact,
  DetailHeader,
  DetailLinkRow,
  DetailTagPill,
} from "../../_components/AdminDetail";

export default async function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const id = Number(workspaceId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [workspace, companies] = await Promise.all([
    fetchWorkspaceById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!workspace) notFound();

  const companyName =
    (companies?.result ?? []).find((item) => item.id === workspace.companyId)
      ?.name ?? `Company #${workspace.companyId}`;

  const isActive = workspace.status !== false;

  return (
    <div className="space-y-8">
      <DetailHeader
        backHref="/admin/workspaces"
        backLabel="Back to workspaces"
        eyebrow={`Workspace · #${workspace.id}`}
        title={workspace.name ?? `Workspace #${workspace.id}`}
        subtitle="Live administrative view of this workspace."
        pills={
          <>
            <DetailTagPill variant={isActive ? "emerald" : "outline"}>
              {isActive ? "active" : "inactive"}
            </DetailTagPill>
            <DetailTagPill>ID #{workspace.id}</DetailTagPill>
          </>
        }
        actions={
          <DetailActionLink
            href={`/admin/workspaces/${workspace.id}/edit`}
            accent="violet"
          >
            Edit
          </DetailActionLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Section title="Identity" subtitle="how it shows up" accent="emerald">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-emerald-200"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(52,211,153,0.30) 0%, rgba(34,211,238,0.16) 60%, transparent 100%)",
                border: "1px solid rgba(52,211,153,0.32)",
              }}
            >
              <Layers className="h-12 w-12" />
            </div>
            <p className="text-[18px] font-semibold text-white/95">
              {workspace.name ?? "—"}
            </p>
          </div>
        </Section>

        <Section title="Workspace details" subtitle="primary record" accent="cyan">
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <DetailFact
              label="Tenant"
              value={companyName}
              icon={Building2}
            />
            <DetailFact
              label="Status"
              value={isActive ? "Active" : "Inactive"}
            />
            <DetailFact
              label="Description"
              span={2}
              value={workspace.description ?? "No description set."}
            />
          </div>
        </Section>
      </div>

      <Section title="Quick access" accent="violet">
        <div className="space-y-2 p-5">
          <DetailLinkRow
            href={`/admin/companies/${workspace.companyId}`}
            icon={Building2}
          >
            Open linked tenant
          </DetailLinkRow>
        </div>
      </Section>
    </div>
  );
}
