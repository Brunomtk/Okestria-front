import { Building2, Plus, Shield, UserCheck, UserX, Users } from "lucide-react";
import Link from "next/link";
import { fetchCompaniesPaged, fetchUsersPaged } from "@/lib/auth/api";
import {
  filterUsers,
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

function getUserType(type?: number) {
  switch (type) {
    case 1:
      return { label: "Admin", accent: "violet" as const };
    case 2:
      return { label: "Company", accent: "cyan" as const };
    default:
      return { label: "Member", accent: "emerald" as const };
  }
}

const TYPE_TONE = {
  violet: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.30)", text: "#c4b5fd" },
  cyan:   { bg: "rgba(34,211,238,0.10)",  border: "rgba(34,211,238,0.30)",  text: "#67e8f9" },
  emerald:{ bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.30)",  text: "#86efac" },
} as const;

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const [usersResponse, companiesResponse] = await Promise.all([
    fetchUsersPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
  ]);

  const companyMap = new Map(
    (companiesResponse?.result ?? []).map((c) => [c.id, c.name ?? `Company #${c.id}`]),
  );
  const filtered = filterUsers(usersResponse?.result ?? [], query);
  const pagination = paginate(filtered, page, 12);
  const activeUsers = filtered.filter((u) => u.status === 1);
  const adminUsers = filtered.filter((u) => u.type === 1);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tenants"
        title="Users"
        subtitle="Every operator across every tenant. Search by name, email or company."
        right={
          <Link
            href="/admin/users/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-[13px] font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
          >
            <Plus className="h-3.5 w-3.5" /> New user
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={filtered.length} icon={Users} accent="cyan" hint="filtered" />
        <StatCard label="Active" value={activeUsers.length} icon={UserCheck} accent="emerald" hint="status = 1" />
        <StatCard label="Inactive" value={filtered.length - activeUsers.length} icon={UserX} accent="rose" />
        <StatCard label="Admins" value={adminUsers.length} icon={Shield} accent="violet" hint="type = 1" />
      </div>

      <SearchBar query={query} basePath="/admin/users" placeholder="Search by name, email or company…" />

      <Section title={`Users · ${filtered.length}`} subtitle="latest first" accent="cyan">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-16" },
            { key: "user", header: "User" },
            { key: "type", header: "Type", className: "w-32" },
            { key: "company", header: "Company" },
            { key: "status", header: "Status", className: "w-32" },
            { key: "actions", header: "", className: "w-24 text-right" },
          ]}
          rows={pagination.items.map((user) => {
            const t = getUserType(user.type);
            const tone = TYPE_TONE[t.accent];
            const initials = (user.name ?? "U")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return {
              id: user.id,
              cells: {
                id: <AdminMonoText>#{user.id}</AdminMonoText>,
                user: (
                  <div className="flex items-center gap-3">
                    <AdminCellAvatar
                      emoji={initials}
                      accent={t.accent === "violet" ? "#a78bfa" : t.accent === "cyan" ? "#22d3ee" : "#34d399"}
                    />
                    <AdminCellTitle
                      primary={user.name ?? "Unnamed"}
                      secondary={user.email ?? "no email"}
                      href={`/admin/users/${user.id}`}
                    />
                  </div>
                ),
                type: (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
                    style={{
                      background: tone.bg,
                      borderColor: tone.border,
                      color: tone.text,
                    }}
                  >
                    {user.type === 1 ? <Shield className="h-3 w-3" /> : null}
                    {t.label}
                  </span>
                ),
                company: user.companyId ? (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                    {companyMap.get(user.companyId) ?? `Company #${user.companyId}`}
                  </div>
                ) : (
                  <span className="font-mono text-[10.5px] text-white/30">—</span>
                ),
                status: (
                  <StatusPill
                    status={user.status === 1 ? "ok" : "idle"}
                    label={user.status === 1 ? "active" : "inactive"}
                  />
                ),
                actions: (
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-[12px] font-medium text-cyan-300 transition-colors hover:text-cyan-100"
                  >
                    Open →
                  </Link>
                ),
              },
            };
          })}
          emptyHint="No users found."
        />
      </Section>

      <Pagination
        basePath="/admin/users"
        currentPage={pagination.currentPage}
        pageCount={pagination.pageCount}
        params={params}
        totalLabel={`${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
