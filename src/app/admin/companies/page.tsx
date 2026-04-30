import {
  Bot,
  Building2,
  CheckCircle2,
  Layers,
  Plus,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  fetchAgentsByCompany,
  fetchCompaniesPaged,
  fetchUsersByCompany,
  fetchWorkspacesByCompany,
  type OkestriaCompany,
} from "@/lib/auth/api";
import {
  filterCompanies,
  getPageNumber,
  getSearchTerm,
  paginate,
  requireAdminSession,
  type AdminSearchParams,
} from "../_lib/admin";
import { PageHeader, Section, StatCard, StatusPill } from "../_components/AdminUI";
import {
  AdminCellAvatar,
  AdminCellTitle,
  AdminMonoText,
  AdminTable,
} from "../_components/AdminTable";
import { Pagination, SearchBar } from "../_components/AdminListChrome";

type PageProps = { searchParams?: Promise<AdminSearchParams> };

export default async function AdminCompaniesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const companiesResponse = await fetchCompaniesPaged(session.token!, {
    pageNumber: 1,
    pageSize: 100,
  }).catch(() => null);
  const allCompanies: OkestriaCompany[] = companiesResponse?.result ?? [];
  const filtered = filterCompanies(allCompanies, query);
  const pagination = paginate(filtered, page, 10);

  const rows = await Promise.all(
    pagination.items.map(async (company) => {
      const [users, agents, workspaces] = await Promise.all([
        fetchUsersByCompany(company.id, session.token!).catch(() => []),
        fetchAgentsByCompany(company.id, session.token!).catch(() => []),
        fetchWorkspacesByCompany(company.id, session.token!).catch(() => []),
      ]);
      return {
        company,
        usersCount: users.length,
        agentsCount: agents.length,
        workspacesCount: workspaces.length,
      };
    }),
  );

  const totalActive = filtered.filter((c) => c.status !== false).length;
  const totalInactive = filtered.filter((c) => c.status === false).length;
  const totalWorkspacesOnPage = rows.reduce((s, r) => s + r.workspacesCount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tenants"
        title="Companies"
        subtitle="All multi-tenant companies registered on Orkestria. Click a row to drill in."
        right={
          <Link
            href="/admin/companies/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-[13px] font-semibold text-violet-100 transition hover:bg-violet-500/25"
          >
            <Plus className="h-3.5 w-3.5" /> New company
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={filtered.length} icon={Building2} accent="violet" hint="filtered" />
        <StatCard label="Active" value={totalActive} icon={CheckCircle2} accent="emerald" hint="status = true" />
        <StatCard label="Inactive" value={totalInactive} icon={XCircle} accent="rose" hint="status = false" />
        <StatCard label="Workspaces (page)" value={totalWorkspacesOnPage} icon={Layers} accent="amber" hint="this page only" />
      </div>

      <SearchBar query={query} basePath="/admin/companies" placeholder="Search by name, email or CNPJ…" />

      <Section title={`Companies · ${filtered.length}`} subtitle="latest first" accent="violet">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-16" },
            { key: "company", header: "Company" },
            { key: "contact", header: "Contact" },
            { key: "usage", header: "Usage" },
            { key: "status", header: "Status", className: "w-32" },
            { key: "actions", header: "", className: "w-24 text-right" },
          ]}
          rows={rows.map(({ company, usersCount, agentsCount, workspacesCount }) => ({
            id: company.id,
            cells: {
              id: <AdminMonoText>#{company.id}</AdminMonoText>,
              company: (
                <div className="flex items-center gap-3">
                  <AdminCellAvatar emoji="🏢" accent="#a78bfa" />
                  <AdminCellTitle
                    primary={company.name ?? `Company #${company.id}`}
                    secondary={company.cnpj ?? "no CNPJ on file"}
                    href={`/admin/companies/${company.id}`}
                  />
                </div>
              ),
              contact: (
                <div className="space-y-0.5">
                  <div className="truncate text-[12.5px] text-white/75">
                    {company.email ?? <span className="text-white/40">no email</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 font-mono text-[10.5px] text-white/45">
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{usersCount}</span>
                    <span className="inline-flex items-center gap-1"><Bot className="h-3 w-3" />{agentsCount}</span>
                    <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" />{workspacesCount}</span>
                  </div>
                </div>
              ),
              usage: (
                <AdminMonoText>
                  {usersCount} users · {agentsCount} agents · {workspacesCount} workspaces
                </AdminMonoText>
              ),
              status: (
                <StatusPill
                  status={company.status !== false ? "ok" : "idle"}
                  label={company.status !== false ? "active" : "inactive"}
                />
              ),
              actions: (
                <Link
                  href={`/admin/companies/${company.id}`}
                  className="text-[12px] font-medium text-violet-300 transition-colors hover:text-violet-100"
                >
                  Open →
                </Link>
              ),
            },
          }))}
          emptyHint="No companies found."
        />
      </Section>

      <Pagination
        basePath="/admin/companies"
        currentPage={pagination.currentPage}
        pageCount={pagination.pageCount}
        params={params}
        totalLabel={`${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
