import { Bot, Building2, Layers, Plus, Users } from "lucide-react";
import Link from "next/link";
import {
  fetchAgentsByCompany,
  fetchCompaniesPaged,
  fetchUsersByCompany,
  fetchWorkspacesByCompany,
  type OkestriaWorkspace,
} from "@/lib/auth/api";
import {
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
type WorkspaceRow = OkestriaWorkspace & {
  companyName: string;
  usersCount: number;
  agentsCount: number;
};

function filterWorkspaces(items: WorkspaceRow[], query: string) {
  if (!query) return items;
  return items.filter((item) =>
    [item.name, item.description, item.companyName].some((v) =>
      (v ?? "").toLowerCase().includes(query),
    ),
  );
}

export default async function AdminWorkspacesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const companiesResp = await fetchCompaniesPaged(session.token!, {
    pageNumber: 1,
    pageSize: 200,
  }).catch(() => null);
  const companies = companiesResp?.result ?? [];

  const all: WorkspaceRow[] = (
    await Promise.all(
      companies.map(async (c) => {
        const [workspaces, users, agents] = await Promise.all([
          fetchWorkspacesByCompany(c.id, session.token!).catch(() => []),
          fetchUsersByCompany(c.id, session.token!).catch(() => []),
          fetchAgentsByCompany(c.id, session.token!).catch(() => []),
        ]);
        return workspaces.map((w) => ({
          ...w,
          companyName: c.name ?? `Company #${c.id}`,
          usersCount: users.length,
          agentsCount: agents.length,
        }));
      }),
    )
  ).flat();

  const filtered = filterWorkspaces(all, query);
  const pagination = paginate(filtered, page, 12);
  const active = filtered.filter((w) => w.status !== false);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tenants"
        title="Workspaces"
        subtitle="Workspaces hold a tenant's office layout, agents, and squad templates. One company can have several."
        right={
          <Link
            href="/admin/workspaces/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-[13px] font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
          >
            <Plus className="h-3.5 w-3.5" /> New workspace
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={filtered.length} icon={Layers} accent="emerald" hint="filtered" />
        <StatCard label="Active" value={active.length} icon={Layers} accent="cyan" />
        <StatCard label="Tenants covered" value={new Set(filtered.map((w) => w.companyName)).size} icon={Building2} accent="violet" />
        <StatCard label="Agents (sum)" value={filtered.reduce((s, w) => s + w.agentsCount, 0)} icon={Bot} accent="amber" />
      </div>

      <SearchBar query={query} basePath="/admin/workspaces" placeholder="Search by name, description, company…" />

      <Section title={`Workspaces · ${filtered.length}`} subtitle="latest first" accent="emerald">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-16" },
            { key: "workspace", header: "Workspace" },
            { key: "company", header: "Tenant" },
            { key: "scope", header: "Scope" },
            { key: "status", header: "Status", className: "w-32" },
            { key: "actions", header: "", className: "w-24 text-right" },
          ]}
          rows={pagination.items.map((w) => ({
            id: w.id,
            cells: {
              id: <AdminMonoText>#{w.id}</AdminMonoText>,
              workspace: (
                <div className="flex items-center gap-3">
                  <AdminCellAvatar emoji="🗂️" accent="#34d399" />
                  <AdminCellTitle
                    primary={w.name ?? `Workspace #${w.id}`}
                    secondary={w.description ?? "no description"}
                    href={`/admin/workspaces/${w.id}`}
                  />
                </div>
              ),
              company: (
                <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                  <Building2 className="h-3.5 w-3.5 text-white/40" />
                  {w.companyName}
                </div>
              ),
              scope: (
                <div className="flex flex-wrap gap-2 font-mono text-[10.5px] text-white/45">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{w.usersCount}</span>
                  <span className="inline-flex items-center gap-1"><Bot className="h-3 w-3" />{w.agentsCount}</span>
                </div>
              ),
              status: (
                <StatusPill
                  status={w.status !== false ? "ok" : "idle"}
                  label={w.status !== false ? "active" : "inactive"}
                />
              ),
              actions: (
                <Link
                  href={`/admin/workspaces/${w.id}`}
                  className="text-[12px] font-medium text-emerald-300 transition-colors hover:text-emerald-100"
                >
                  Open →
                </Link>
              ),
            },
          }))}
          emptyHint="No workspaces found."
        />
      </Section>

      <Pagination
        basePath="/admin/workspaces"
        currentPage={pagination.currentPage}
        pageCount={pagination.pageCount}
        params={params}
        totalLabel={`${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
