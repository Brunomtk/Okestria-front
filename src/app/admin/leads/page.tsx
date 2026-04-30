import {
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Plus,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { fetchCompaniesPaged, fetchLeadsPaged } from "@/lib/auth/api";
import {
  filterLeads,
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

function getLeadStatus(status?: string | null): {
  label: string;
  status: "ok" | "warn" | "error" | "idle" | "info";
} {
  const normalized = (status ?? "").toLowerCase();
  switch (normalized) {
    case "new":       return { label: "new",       status: "info" };
    case "contacted": return { label: "contacted", status: "info" };
    case "qualified": return { label: "qualified", status: "ok" };
    case "lost":      return { label: "lost",      status: "error" };
    default:          return { label: status ?? "—", status: "idle" };
  }
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const [leadsResponse, companiesResponse] = await Promise.all([
    fetchLeadsPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
  ]);

  const companyMap = new Map(
    (companiesResponse?.result ?? []).map((c) => [c.id, c.name ?? `Company #${c.id}`]),
  );
  const filtered = filterLeads(leadsResponse?.result ?? [], query);
  const pagination = paginate(filtered, page, 12);
  const newCount = filtered.filter((l) => (l.status ?? "").toLowerCase() === "new").length;
  const qualifiedCount = filtered.filter((l) => (l.status ?? "").toLowerCase() === "qualified").length;
  const lostCount = filtered.filter((l) => (l.status ?? "").toLowerCase() === "lost").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Leads & Missions"
        title="Leads"
        subtitle="Inbound + outbound prospects across all tenants. Each row is the entry point for a sales mission."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/missions"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-[13px] font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
            >
              <Sparkles className="h-3.5 w-3.5" /> View missions
            </Link>
            <Link
              href="/admin/leads/new"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-[13px] font-semibold text-amber-100 transition hover:bg-amber-500/25"
            >
              <Plus className="h-3.5 w-3.5" /> New lead
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={filtered.length} icon={Target} accent="amber" hint="filtered" />
        <StatCard label="New" value={newCount} icon={Clock} accent="cyan" hint="status = new" />
        <StatCard label="Qualified" value={qualifiedCount} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Lost" value={lostCount} icon={XCircle} accent="rose" />
      </div>

      <SearchBar query={query} basePath="/admin/leads" placeholder="Search by business, contact, email, city…" />

      <Section title={`Leads · ${filtered.length}`} subtitle="latest first" accent="amber">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-16" },
            { key: "lead", header: "Lead" },
            { key: "contact", header: "Contact" },
            { key: "company", header: "Tenant" },
            { key: "status", header: "Status", className: "w-32" },
            { key: "actions", header: "", className: "w-24 text-right" },
          ]}
          rows={pagination.items.map((lead) => {
            const statusInfo = getLeadStatus(lead.status);
            const displayName = lead.businessName ?? lead.contactName ?? `Lead #${lead.id}`;
            const initials = displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return {
              id: lead.id,
              cells: {
                id: <AdminMonoText>#{lead.id}</AdminMonoText>,
                lead: (
                  <div className="flex items-center gap-3">
                    <AdminCellAvatar emoji={initials} accent="#f59e0b" />
                    <AdminCellTitle
                      primary={displayName}
                      secondary={[lead.city, lead.state].filter(Boolean).join(", ") || "no location"}
                      href={`/admin/leads/${lead.id}`}
                    />
                  </div>
                ),
                contact: (
                  <div className="space-y-0.5 font-mono text-[11px] text-white/55">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-white/35" />
                      {lead.email ?? <span className="text-white/30">—</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-white/35" />
                      {lead.phone ?? <span className="text-white/30">—</span>}
                    </div>
                  </div>
                ),
                company: (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                    {lead.companyId
                      ? companyMap.get(lead.companyId) ?? `Company #${lead.companyId}`
                      : <span className="text-white/40">—</span>}
                  </div>
                ),
                status: <StatusPill status={statusInfo.status} label={statusInfo.label} />,
                actions: (
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="text-[12px] font-medium text-amber-300 transition-colors hover:text-amber-100"
                  >
                    Open →
                  </Link>
                ),
              },
            };
          })}
          emptyHint="No leads found yet."
        />
      </Section>

      <Pagination
        basePath="/admin/leads"
        currentPage={pagination.currentPage}
        pageCount={pagination.pageCount}
        params={params}
        totalLabel={`${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
