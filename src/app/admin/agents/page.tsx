import { Bot, Building2, Plus, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import {
  fetchAgentsByCompany,
  fetchCompaniesPaged,
  type OkestriaAgent,
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
type AgentRow = OkestriaAgent & { companyName: string };

function filterAgents(items: AgentRow[], query: string) {
  if (!query) return items;
  return items.filter((item) =>
    [item.name, item.slug, item.role, item.companyName].some((v) =>
      (v ?? "").toLowerCase().includes(query),
    ),
  );
}

export default async function AdminAgentsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const companiesResp = await fetchCompaniesPaged(session.token!, {
    pageNumber: 1,
    pageSize: 200,
  }).catch(() => null);
  const companies = companiesResp?.result ?? [];

  const all: AgentRow[] = (
    await Promise.all(
      companies.map(async (c) => {
        const agents = await fetchAgentsByCompany(c.id, session.token!).catch(() => []);
        return agents.map((a) => ({ ...a, companyName: c.name ?? `Company #${c.id}` }));
      }),
    )
  ).flat();

  const filtered = filterAgents(all, query);
  const pagination = paginate(filtered, page, 12);
  const active = filtered.filter((a) => a.status !== false);
  const featured = filtered.filter((a) => a.featured);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Agents"
        subtitle="Every agent provisioned across all tenants. Each agent has its own role, prompt and tool kit."
        right={
          <Link
            href="/admin/agents/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-[13px] font-semibold text-violet-100 transition hover:bg-violet-500/25"
          >
            <Plus className="h-3.5 w-3.5" /> New agent
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={filtered.length} icon={Bot} accent="violet" hint="filtered" />
        <StatCard label="Active" value={active.length} icon={Sparkles} accent="emerald" />
        <StatCard label="Featured" value={featured.length} icon={Star} accent="amber" hint="marketplace" />
        <StatCard label="Tenants" value={new Set(filtered.map((a) => a.companyName)).size} icon={Building2} accent="cyan" />
      </div>

      <SearchBar query={query} basePath="/admin/agents" placeholder="Search by name, slug, role or company…" />

      <Section title={`Agents · ${filtered.length}`} subtitle="latest first" accent="violet">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-16" },
            { key: "agent", header: "Agent" },
            { key: "role", header: "Role" },
            { key: "company", header: "Tenant" },
            { key: "flags", header: "Flags", className: "w-28" },
            { key: "status", header: "Status", className: "w-32" },
            { key: "actions", header: "", className: "w-24 text-right" },
          ]}
          rows={pagination.items.map((agent) => ({
            id: agent.id,
            cells: {
              id: <AdminMonoText>#{agent.id}</AdminMonoText>,
              agent: (
                <div className="flex items-center gap-3">
                  <AdminCellAvatar emoji="🤖" accent="#a78bfa" />
                  <AdminCellTitle
                    primary={agent.name ?? agent.slug ?? `Agent #${agent.id}`}
                    secondary={agent.slug ?? "no slug"}
                    href={`/admin/agents/${agent.id}`}
                  />
                </div>
              ),
              role: (
                <span className="text-[12.5px] text-white/70">
                  {agent.role ?? <span className="text-white/35">—</span>}
                </span>
              ),
              company: (
                <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                  <Building2 className="h-3.5 w-3.5 text-white/40" />
                  {agent.companyName}
                </div>
              ),
              flags: (
                <div className="flex flex-wrap gap-1">
                  {agent.featured ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-amber-200">
                      <Star className="h-2.5 w-2.5" /> featured
                    </span>
                  ) : null}
                </div>
              ),
              status: (
                <StatusPill
                  status={agent.status !== false ? "ok" : "idle"}
                  label={agent.status !== false ? "active" : "inactive"}
                />
              ),
              actions: (
                <Link
                  href={`/admin/agents/${agent.id}`}
                  className="text-[12px] font-medium text-violet-300 transition-colors hover:text-violet-100"
                >
                  Open →
                </Link>
              ),
            },
          }))}
          emptyHint="No agents found."
        />
      </Section>

      <Pagination
        basePath="/admin/agents"
        currentPage={pagination.currentPage}
        pageCount={pagination.pageCount}
        params={params}
        totalLabel={`${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
