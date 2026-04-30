import { Building2, Crown, Layers, Plus, UsersRound, Workflow } from "lucide-react";
import Link from "next/link";
import {
  fetchCompaniesPaged,
  fetchSquadsByCompany,
  type OkestriaSquad,
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
type SquadRow = OkestriaSquad & { companyName: string };

function filterSquads(items: SquadRow[], query: string) {
  if (!query) return items;
  return items.filter((item) =>
    [item.name, item.description, item.companyName, item.workspaceName, item.leaderAgentName].some(
      (v) => (v ?? "").toLowerCase().includes(query),
    ),
  );
}

function modeLabel(mode?: string | null): { label: string; status: "ok" | "warn" | "info" | "idle" } {
  switch ((mode ?? "").toLowerCase()) {
    case "leader":   return { label: "leader",   status: "info" };
    case "all":      return { label: "all",      status: "ok" };
    case "workflow": return { label: "workflow", status: "info" };
    default:         return { label: "manual",   status: "idle" };
  }
}

export default async function AdminSquadsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const companiesResp = await fetchCompaniesPaged(session.token!, {
    pageNumber: 1,
    pageSize: 200,
  }).catch(() => null);
  const companies = companiesResp?.result ?? [];

  const all: SquadRow[] = (
    await Promise.all(
      companies.map(async (c) => {
        const squads = await fetchSquadsByCompany(c.id, session.token!).catch(() => []);
        return squads.map((s) => ({ ...s, companyName: c.name ?? `Company #${c.id}` }));
      }),
    )
  ).flat();

  const filtered = filterSquads(all, query);
  const pagination = paginate(filtered, page, 12);
  const totalLeader = filtered.filter((s) => (s.defaultExecutionMode ?? "").toLowerCase() === "leader").length;
  const totalWorkflow = filtered.filter((s) => (s.defaultExecutionMode ?? "").toLowerCase() === "workflow").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Squads"
        subtitle="Multi-agent missions composed across all tenants. Each squad bundles 2–5 agents with a shared goal."
        right={
          <Link
            href="/admin/squads/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-[13px] font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
          >
            <Plus className="h-3.5 w-3.5" /> New squad
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={filtered.length} icon={UsersRound} accent="cyan" hint="filtered" />
        <StatCard label="Leader-led" value={totalLeader} icon={Crown} accent="violet" />
        <StatCard label="Workflow" value={totalWorkflow} icon={Workflow} accent="emerald" />
        <StatCard label="Tenants" value={new Set(filtered.map((s) => s.companyName)).size} icon={Building2} accent="amber" />
      </div>

      <SearchBar query={query} basePath="/admin/squads" placeholder="Search by name, workspace, leader…" />

      <Section title={`Squads · ${filtered.length}`} subtitle="latest first" accent="cyan">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-16" },
            { key: "squad", header: "Squad" },
            { key: "company", header: "Tenant" },
            { key: "workspace", header: "Workspace" },
            { key: "mode", header: "Mode", className: "w-28" },
            { key: "leader", header: "Leader" },
            { key: "actions", header: "", className: "w-24 text-right" },
          ]}
          rows={pagination.items.map((squad) => {
            const m = modeLabel(squad.defaultExecutionMode);
            return {
              id: squad.id,
              cells: {
                id: <AdminMonoText>#{squad.id}</AdminMonoText>,
                squad: (
                  <div className="flex items-center gap-3">
                    <AdminCellAvatar emoji="🛡️" accent="#22d3ee" />
                    <AdminCellTitle
                      primary={squad.name ?? `Squad #${squad.id}`}
                      secondary={squad.description ?? "no description"}
                      href={`/admin/squads/${squad.id}`}
                    />
                  </div>
                ),
                company: (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                    {squad.companyName}
                  </div>
                ),
                workspace: (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/65">
                    <Layers className="h-3.5 w-3.5 text-white/35" />
                    {squad.workspaceName ?? <span className="text-white/35">—</span>}
                  </div>
                ),
                mode: <StatusPill status={m.status} label={m.label} />,
                leader: (
                  <span className="text-[12.5px] text-white/70">
                    {squad.leaderAgentName ?? <span className="text-white/35">—</span>}
                  </span>
                ),
                actions: (
                  <Link
                    href={`/admin/squads/${squad.id}`}
                    className="text-[12px] font-medium text-cyan-300 transition-colors hover:text-cyan-100"
                  >
                    Open →
                  </Link>
                ),
              },
            };
          })}
          emptyHint="No squads found."
        />
      </Section>

      <Pagination
        basePath="/admin/squads"
        currentPage={pagination.currentPage}
        pageCount={pagination.pageCount}
        params={params}
        totalLabel={`${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
