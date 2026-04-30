import {
  BadgeCheck,
  Bot,
  Building2,
  Layers,
  Mail,
  Power,
  Target,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  fetchAgentsByCompany,
  fetchBillingSubscription,
  fetchBillingUsage,
  fetchCompanyById,
  fetchLeadsPaged,
  fetchUsersByCompany,
  fetchWorkspacesByCompany,
} from "@/lib/auth/api";
import { deleteCompanyAction, toggleCompanyStatusAction } from "../../_actions";
import { requireAdminSession } from "../../_lib/admin";
import { Section, StatCard } from "../../_components/AdminUI";
import {
  DetailActionLink,
  DetailFact,
  DetailHeader,
  DetailLinkRow,
  DetailTagPill,
} from "../../_components/AdminDetail";
import { AdminDeleteButton } from "../../_components/AdminDeleteButton";

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-US");
}

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const id = Number(companyId);
  if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession();

  const company = await fetchCompanyById(id, session.token!).catch(() => null);
  if (!company) notFound();

  const [users, agents, workspaces, leadsRes, subscription, usage] =
    await Promise.all([
      fetchUsersByCompany(id, session.token!).catch(() => []),
      fetchAgentsByCompany(id, session.token!).catch(() => []),
      fetchWorkspacesByCompany(id, session.token!).catch(() => []),
      fetchLeadsPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
        () => null,
      ),
      fetchBillingSubscription(id, session.token!).catch(() => null),
      fetchBillingUsage(id, session.token!).catch(() => null),
    ]);

  const leads = (leadsRes?.result ?? []).filter((lead) => lead.companyId === id);

  return (
    <div className="space-y-8">
      <DetailHeader
        backHref="/admin/companies"
        backLabel="Back to companies"
        eyebrow={`Company · #${company.id}`}
        title={company.name ?? `Company #${company.id}`}
        subtitle="Live administrative view of this tenant — usage, plan, and quick links to the data they own."
        pills={
          <>
            <DetailTagPill variant={company.status ? "emerald" : "outline"}>
              {company.status ? "active" : "inactive"}
            </DetailTagPill>
            <DetailTagPill>ID #{company.id}</DetailTagPill>
            {company.cnpj ? <DetailTagPill>tax · {company.cnpj}</DetailTagPill> : null}
          </>
        }
        actions={
          <>
            <form action={toggleCompanyStatusAction}>
              <input type="hidden" name="companyId" value={company.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={`/admin/companies/${company.id}`}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-3.5 py-2 text-[12.5px] font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white"
              >
                <Power className="h-3.5 w-3.5" />
                {company.status ? "Deactivate" : "Activate"}
              </button>
            </form>
            <DetailActionLink
              href={`/admin/companies/${company.id}/edit`}
              accent="violet"
            >
              Edit
            </DetailActionLink>
            <form action={deleteCompanyAction}>
              <input type="hidden" name="companyId" value={company.id} />
              <AdminDeleteButton />
            </form>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={users.length} icon={Users} accent="cyan" />
        <StatCard label="Agents" value={agents.length} icon={Bot} accent="violet" />
        <StatCard
          label="Workspaces"
          value={workspaces.length}
          icon={Layers}
          accent="emerald"
        />
        <StatCard label="Leads" value={leads.length} icon={Target} accent="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Section title="Overview" subtitle="primary record" accent="violet">
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <DetailFact label="Name" value={company.name ?? "—"} icon={Building2} />
            <DetailFact label="Email" value={company.email ?? "—"} icon={Mail} />
            <DetailFact label="Plan" value={subscription?.planName ?? "No plan"} />
            <DetailFact
              label="Subscription status"
              value={subscription?.status ?? "unknown"}
            />
            <DetailFact
              label="Leads used"
              value={`${usage?.leadsUsed ?? 0}${
                usage?.leadsLimit ? ` / ${usage.leadsLimit}` : ""
              }`}
              mono
            />
            <DetailFact
              label="Users used"
              value={`${usage?.usersUsed ?? 0}${
                usage?.usersLimit ? ` / ${usage.usersLimit}` : ""
              }`}
              mono
            />
            <DetailFact
              label="Current period"
              span={2}
              value={`${fmtDate(subscription?.currentPeriodStartUtc)} → ${fmtDate(
                subscription?.currentPeriodEndUtc,
              )}`}
              mono
            />
          </div>
        </Section>

        <Section title="Quick access" subtitle="related data" accent="cyan">
          <div className="space-y-2 p-5">
            <DetailLinkRow
              href={`/admin/users?q=${encodeURIComponent(String(company.id))}`}
              icon={Users}
            >
              View users on this tenant
            </DetailLinkRow>
            <DetailLinkRow
              href={`/admin/agents?q=${encodeURIComponent(company.name ?? "")}`}
              icon={Bot}
            >
              View related agents
            </DetailLinkRow>
            <DetailLinkRow
              href={`/admin/workspaces?q=${encodeURIComponent(company.name ?? "")}`}
              icon={Layers}
            >
              View related workspaces
            </DetailLinkRow>
            <DetailLinkRow
              href={`/admin/leads?q=${encodeURIComponent(company.name ?? "")}`}
              icon={Target}
            >
              View related leads
            </DetailLinkRow>
            <DetailLinkRow
              href={`/admin/billing?q=${encodeURIComponent(company.name ?? "")}`}
              icon={BadgeCheck}
            >
              View billing for this tenant
            </DetailLinkRow>
          </div>
        </Section>
      </div>
    </div>
  );
}
