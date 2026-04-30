import {
  AlertCircle,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Layers3,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  filterBillingRows,
  getAdminBillingData,
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

function getBillingStatus(status: string): {
  label: string;
  pill: "ok" | "warn" | "error" | "idle" | "info";
} {
  switch (status) {
    case "active":
    case "paid":
    case "trialing":
      return { label: "active", pill: "ok" };
    case "pending":
    case "past_due":
      return { label: "pending", pill: "warn" };
    case "overdue":
    case "canceled":
    case "cancelled":
    case "inactive":
      return { label: "overdue", pill: "error" };
    default:
      return { label: status || "no status", pill: "idle" };
  }
}

function formatCurrency(value: number | null | undefined, currency = "USD") {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUsage(used: number, limit: number | null) {
  if (limit == null || limit <= 0) return `${used} / ∞`;
  return `${used} / ${limit}`;
}

export default async function AdminBillingPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const billing = await getAdminBillingData(session.token!).catch(() => ({
    rows: [],
  }));
  const filtered = filterBillingRows(billing.rows, query);
  const pagination = paginate(filtered, page, 10);

  const activeRows = filtered.filter((row) =>
    ["active", "paid", "trialing"].includes(row.subscriptionStatus),
  ).length;
  const pendingRows = filtered.filter((row) =>
    ["pending", "past_due"].includes(row.subscriptionStatus),
  ).length;
  const overdueRows = filtered.filter((row) =>
    ["overdue", "canceled", "cancelled", "inactive"].includes(
      row.subscriptionStatus,
    ),
  ).length;
  const totalRevenue = filtered.reduce((acc, row) => acc + (row.amount ?? 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Finance"
        title="Billing"
        subtitle="Plans, subscriptions and usage rolled up per tenant — sourced from the live billing endpoints."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Listed volume"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          accent="emerald"
          hint="filtered"
        />
        <StatCard
          label="Active subscriptions"
          value={activeRows}
          icon={CheckCircle2}
          accent="cyan"
        />
        <StatCard label="Pending" value={pendingRows} icon={Clock} accent="amber" />
        <StatCard
          label="Needs attention"
          value={overdueRows}
          icon={AlertCircle}
          accent="rose"
        />
      </div>

      <SearchBar
        query={query}
        basePath="/admin/billing"
        placeholder="Search by company, plan or status…"
      />

      <Section
        title={`Tenants · ${filtered.length}`}
        subtitle="largest first"
        accent="amber"
        right={
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40">
            <BarChart3 className="mr-1 inline h-3 w-3" />
            from /api/Billing
          </span>
        }
      >
        <AdminTable
          columns={[
            { key: "company", header: "Tenant" },
            { key: "plan", header: "Plan", className: "w-32" },
            { key: "amount", header: "Amount", className: "w-28" },
            { key: "status", header: "Status", className: "w-32" },
            { key: "leads", header: "Leads", className: "w-32" },
            { key: "users", header: "Users", className: "w-28" },
            { key: "agents", header: "Agents", className: "w-28" },
            { key: "period", header: "Period end", className: "w-32" },
          ]}
          rows={pagination.items.map((record) => {
            const status = getBillingStatus(record.subscriptionStatus);
            return {
              id: record.companyId,
              cells: {
                company: (
                  <div className="flex items-center gap-3">
                    <AdminCellAvatar emoji="🏢" accent="#a78bfa" />
                    <AdminCellTitle
                      primary={record.companyName}
                      secondary={record.companyEmail ?? "—"}
                    />
                  </div>
                ),
                plan: (
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/70">
                    {record.planName ?? "—"}
                  </span>
                ),
                amount: (
                  <span className="font-mono text-[13px] font-semibold text-white/90">
                    {formatCurrency(record.amount, record.currency)}
                  </span>
                ),
                status: <StatusPill status={status.pill} label={status.label} />,
                leads: (
                  <UsageCell
                    icon={<Layers3 className="h-3 w-3" />}
                    text={formatUsage(record.leadsUsed, record.leadsLimit)}
                  />
                ),
                users: (
                  <UsageCell
                    icon={<Users className="h-3 w-3" />}
                    text={formatUsage(record.usersUsed, record.usersLimit)}
                  />
                ),
                agents: (
                  <UsageCell
                    icon={<Bot className="h-3 w-3" />}
                    text={formatUsage(record.agentsUsed, record.agentsLimit)}
                  />
                ),
                period: (
                  <AdminMonoText>
                    {record.periodEnd
                      ? new Date(record.periodEnd).toLocaleDateString("en-US")
                      : "—"}
                  </AdminMonoText>
                ),
              },
            };
          })}
          emptyHint="No billing record matches the current filters."
        />
      </Section>

      <Pagination
        basePath="/admin/billing"
        currentPage={pagination.currentPage}
        pageCount={pagination.pageCount}
        params={params}
        totalLabel={`${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
      />

      <Section title="How it's wired" subtitle="endpoints powering this view" accent="violet">
        <div className="space-y-2 p-5 text-[12.5px] leading-relaxed text-white/65">
          <p className="flex items-start gap-2">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 text-violet-300/70" />
            <span>
              Each row aggregates{" "}
              <code className="rounded bg-white/10 px-1 font-mono text-[11px] text-cyan-200">
                /api/Billing/plans
              </code>
              ,{" "}
              <code className="rounded bg-white/10 px-1 font-mono text-[11px] text-cyan-200">
                /api/Billing/subscription/&#123;companyId&#125;
              </code>
              {" "}and{" "}
              <code className="rounded bg-white/10 px-1 font-mono text-[11px] text-cyan-200">
                /api/Billing/usage/&#123;companyId&#125;
              </code>
              {" "}so a tenant only appears once. Pending status follows the
              subscription state from Stripe / the chosen processor.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <CreditCard className="mt-0.5 h-3.5 w-3.5 text-amber-300/70" />
            <span>
              Export and per-tenant detail panes are next. The drill-down will
              open the Stripe-backed history without leaving the admin.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <Building2 className="mt-0.5 h-3.5 w-3.5 text-cyan-300/70" />
            <span>
              Need to change a plan? Open the tenant on the Companies page and
              edit billing inside the tenant&apos;s context.
            </span>
          </p>
        </div>
      </Section>
    </div>
  );
}

function UsageCell({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-white/70">
      <span className="text-white/40">{icon}</span>
      {text}
    </span>
  );
}
