import {
  Bot,
  Building2,
  History,
  Plus,
  ShieldCheck,
  Target,
  UserPlus,
} from "lucide-react";
import { fetchAdminActivity, type AdminActivityEvent } from "@/lib/auth/api";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section, StatCard, StatusPill } from "../_components/AdminUI";
import {
  AdminCellAvatar,
  AdminCellTitle,
  AdminMonoText,
  AdminTable,
} from "../_components/AdminTable";
import { safeAdminPage } from "../_lib/safe-page";

/**
 * v147 — Admin · Activity log.
 *
 * Wired to /api/AdminOverview/activity/recent. The back synthesizes
 * a unified activity feed by reading recent rows from User,
 * Company, Lead and SquadExecution and merging them by created
 * date. No new schema — pure projection over what already exists.
 */

function fmtAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h ago`;
  return `${Math.round(diff / 86400_000)}d ago`;
}

type Pill = "ok" | "warn" | "info" | "error" | "idle";

function kindPresentation(kind: string): {
  emoji: string;
  accent: string;
  pill: Pill;
  label: string;
} {
  const k = kind.toLowerCase();
  if (k === "company.created") return { emoji: "🏢", accent: "#a78bfa", pill: "ok", label: "company.created" };
  if (k.startsWith("user.admin.")) return { emoji: "🛡️", accent: "#fb7185", pill: "info", label: "admin.created" };
  if (k.startsWith("user.")) return { emoji: "👤", accent: "#22d3ee", pill: "info", label: "user.created" };
  if (k.startsWith("lead.")) return { emoji: "🎯", accent: "#f59e0b", pill: "info", label: "lead.created" };
  if (k.includes("squad.execution")) {
    if (k.endsWith(".running")) return { emoji: "🚀", accent: "#34d399", pill: "info", label: "execution.running" };
    if (k.endsWith(".completed") || k.endsWith(".succeeded") || k.endsWith(".done"))
      return { emoji: "✅", accent: "#34d399", pill: "ok", label: "execution.done" };
    if (k.endsWith(".failed") || k.endsWith(".error"))
      return { emoji: "⚠️", accent: "#fb7185", pill: "error", label: "execution.failed" };
    return { emoji: "🛡️", accent: "#22d3ee", pill: "idle", label: "execution.created" };
  }
  return { emoji: "·", accent: "#94a3b8", pill: "idle", label: kind };
}

export default async function AdminActivityPage() {
  return safeAdminPage("admin/activity", renderActivityPage);
}

async function renderActivityPage() {
  const session = await requireAdminSession();
  const events: AdminActivityEvent[] = await fetchAdminActivity(
    session.token!,
    50,
  ).catch(() => []);

  const counts = events.reduce(
    (acc, e) => {
      const k = e.kind.toLowerCase();
      if (k === "company.created") acc.companies++;
      else if (k.startsWith("user.")) acc.users++;
      else if (k.startsWith("lead.")) acc.leads++;
      else if (k.includes("squad.execution")) acc.executions++;
      return acc;
    },
    { companies: 0, users: 0, leads: 0, executions: 0 },
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Activity log"
        subtitle="Latest events across the whole platform — new tenants, sign-ups, leads dropped, squad runs. Synthesized live from the database."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New tenants" value={counts.companies} icon={Plus} accent="violet" hint="recent" />
        <StatCard label="New users" value={counts.users} icon={UserPlus} accent="cyan" hint="recent" />
        <StatCard label="New leads" value={counts.leads} icon={Target} accent="amber" hint="recent" />
        <StatCard label="Squad runs" value={counts.executions} icon={Bot} accent="emerald" hint="recent" />
      </div>

      <Section title={`Recent events · ${events.length}`} subtitle="newest first" accent="cyan">
        <AdminTable
          columns={[
            { key: "kind", header: "Event", className: "w-44" },
            { key: "title", header: "What happened" },
            { key: "company", header: "Tenant" },
            { key: "ago", header: "When", className: "w-28" },
          ]}
          rows={events.map((e) => {
            const p = kindPresentation(e.kind);
            return {
              id: e.id,
              cells: {
                kind: (
                  <div className="flex items-center gap-2.5">
                    <AdminCellAvatar emoji={p.emoji} accent={p.accent} />
                    <StatusPill status={p.pill} label={p.label} />
                  </div>
                ),
                title: (
                  <AdminCellTitle
                    primary={e.title}
                    secondary={e.subtitle ?? undefined}
                  />
                ),
                company: e.companyName ? (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                    {e.companyName}
                  </div>
                ) : (
                  <span className="font-mono text-[11px] text-white/30">—</span>
                ),
                ago: (
                  <AdminMonoText>{fmtAgo(e.atUtc)}</AdminMonoText>
                ),
              },
            };
          })}
          emptyHint="No activity yet — once tenants/users/leads land, they'll appear here."
        />
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <History className="mr-1 inline h-3 w-3" />
        live · {events.length} event{events.length === 1 ? "" : "s"} ·{" "}
        <ShieldCheck className="ml-1 inline h-3 w-3" />
        admin-only feed
      </p>
    </div>
  );
}
