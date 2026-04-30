import {
  Activity,
  ArrowUpRight,
  Bot,
  Building2,
  Database,
  History,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { requireAdminSession, getAdminDashboardData } from "./_lib/admin";
import { safeAdminPage } from "./_lib/safe-page";
import {
  PageHeader,
  Section,
  StatCard,
  StatusPill,
} from "./_components/AdminUI";

function formatRuntimeLabel(baseUrl: string | null) {
  if (!baseUrl) return "Not configured";
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

export default async function AdminDashboardPage() {
  return safeAdminPage("admin", renderDashboard);
}

async function renderDashboard() {
  const session = await requireAdminSession();
  const data = await getAdminDashboardData(session.token!);

  const activeCompanies = data.companies.filter((c) => c.status !== false).length;
  const adminUsers = data.users.filter((u) => u.type === 1).length;
  const activeAgents = data.agents.filter((a) => a.status !== false).length;
  const hotCompanies = data.companies.slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Welcome back, Admin"
        subtitle="System-wide health, tenants, operations, and infrastructure — all at a glance."
        right={
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.6)] px-4 py-2.5 backdrop-blur-md">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: "rgba(167,139,250,0.12)",
                border: "1px solid rgba(167,139,250,0.30)",
                color: "#a78bfa",
              }}
            >
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-violet-300/70">
                Signed in as
              </p>
              <p className="text-[13px] font-medium text-white/90">
                {session.fullName ?? "Administrator"}
              </p>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Companies" value={data.companies.length} delta={{ value: `${activeCompanies} active`, positive: true }} icon={Building2} accent="violet" href="/admin/companies" hint="multi-tenant base" />
        <StatCard label="Users" value={data.users.length} delta={{ value: `${adminUsers} admins`, positive: true }} icon={Users} accent="cyan" href="/admin/users" hint="all roles" />
        <StatCard label="Agents" value={data.agents.length} delta={{ value: `${activeAgents} active`, positive: true }} icon={Bot} accent="emerald" href="/admin/agents" hint="live + drafts" />
        <StatCard label="Leads" value={data.leads.length} icon={Target} accent="amber" href="/admin/leads" hint="loaded today" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Operational footprint" subtitle="Consolidated counts" accent="violet" right={<Activity className="h-4 w-4 text-violet-300" />} className="lg:col-span-2">
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <OpTile label="Workspaces" value={data.workspaces.length} icon={Building2} href="/admin/workspaces" accent="#a78bfa" />
            <OpTile label="Squads" value={data.squads.length} icon={UsersRound} href="/admin/squads" accent="#22d3ee" />
            <OpTile label="Active agents" value={activeAgents} icon={Bot} href="/admin/agents" accent="#34d399" />
            <OpTile label="Leads today" value={data.leads.length} icon={Target} href="/admin/leads" accent="#f59e0b" />
            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
                    Gateway endpoint
                  </p>
                  <p className="mt-1 truncate text-[15px] font-semibold text-white/90">
                    {formatRuntimeLabel(data.runtimeBaseUrl)}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-white/40">
                    Upstream token{" "}
                    {data.runtimeHasToken ? (
                      <span className="text-emerald-300">present</span>
                    ) : (
                      <span className="text-amber-300">missing</span>
                    )}
                  </p>
                </div>
                <StatusPill status={data.runtimeConfigured ? "ok" : "warn"} label={data.runtimeConfigured ? "configured" : "pending"} />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Quick health" subtitle="Live counts" accent="cyan">
          <div className="space-y-3 p-5">
            <HealthRow label="Active companies" value={activeCompanies} accent="violet" />
            <HealthRow label="Admin users" value={adminUsers} accent="cyan" />
            <HealthRow label="Active agents" value={activeAgents} accent="emerald" />
            <HealthRow label="Leads listed" value={data.leads.length} accent="amber" />
            <div className="mt-2 rounded-xl border border-emerald-400/20 p-3" style={{ background: "rgba(52,211,153,0.06)" }}>
              <div className="flex items-center gap-2 text-[12.5px] text-emerald-200/85">
                <TrendingUp className="h-4 w-4" />
                Pulled from live backend endpoints.
              </div>
            </div>
          </div>
        </Section>
      </div>

      <Section title="Quick actions" subtitle="Jump straight to" accent="amber">
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction label="View activity log" description="Last admin operations + agent events" icon={History} href="/admin/activity" accent="#22d3ee" />
          <QuickAction label="System health" description="Gateway, database, integrations" icon={ShieldCheck} href="/admin/health" accent="#34d399" />
          <QuickAction label="Gateway monitor" description="OpenClaw runtime + tokens" icon={Network} href="/admin/gateway" accent="#a78bfa" />
          <QuickAction label="Database stats" description="Tables, growth, slow queries" icon={Database} href="/admin/database" accent="#f59e0b" />
        </div>
      </Section>

      <Section title="Companies in focus" subtitle="First page from the back" accent="violet" right={<Link href="/admin/companies" className="inline-flex items-center gap-1 text-[12px] font-medium text-violet-300 transition-colors hover:text-violet-100">View all<ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
        <div className="divide-y divide-white/5">
          {hotCompanies.length > 0 ? (
            hotCompanies.map((company) => (
              <div key={company.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.25)", color: "#a78bfa" }}>
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-white/90">
                      {company.name ?? `Company #${company.id}`}
                    </p>
                    <p className="truncate font-mono text-[11px] text-white/45">
                      {company.email ?? "No contact email"}
                    </p>
                  </div>
                </div>
                <StatusPill status={company.status !== false ? "ok" : "idle"} label={company.status !== false ? "active" : "inactive"} />
              </div>
            ))
          ) : (
            <div className="px-5 py-12 text-center text-[13px] text-white/40">
              No companies returned by the backend yet.
            </div>
          )}
        </div>
      </Section>

      <div className="flex items-center justify-between pt-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <span>Orkestria · Admin · by Ptx</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-300/70">
          <Sparkles className="h-3 w-3" />
          consolidated · {new Date().toISOString().slice(0, 10)}
        </span>
      </div>
    </div>
  );
}

function OpTile({ label, value, icon: Icon, href, accent }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; href: string; accent: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-white/8 bg-white/[0.025] p-4 transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${accent}1f`, border: `1px solid ${accent}55`, color: accent }}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">{label}</p>
          <p className="text-[18px] font-semibold leading-tight text-white/90">{value}</p>
        </div>
        <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-white/30 transition-colors group-hover:text-white/70" />
      </div>
    </Link>
  );
}

function HealthRow({ label, value, accent }: { label: string; value: number | string; accent: "violet" | "cyan" | "amber" | "emerald" }) {
  const dotColor = { violet: "#a78bfa", cyan: "#22d3ee", amber: "#f59e0b", emerald: "#34d399" }[accent];
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />
        <span className="text-[12.5px] text-white/65">{label}</span>
      </div>
      <span className="text-[13.5px] font-semibold text-white/90">{value}</span>
    </div>
  );
}

function QuickAction({ label, description, icon: Icon, href, accent }: { label: string; description: string; icon: React.ComponentType<{ className?: string }>; href: string; accent: string }) {
  return (
    <Link href={href} className="group relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.025] p-4 transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}1f`, border: `1px solid ${accent}55`, color: accent }}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white/90">{label}</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-white/45">{description}</p>
        </div>
      </div>
    </Link>
  );
}
