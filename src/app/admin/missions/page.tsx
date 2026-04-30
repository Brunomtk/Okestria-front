import {
  Bot,
  Building2,
  CheckCircle2,
  Pause,
  Play,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { fetchAdminMissions, type AdminMissionRow } from "@/lib/auth/api";
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
 * v146 — Admin · Missions.
 *
 * "Missions" are squad executions running across tenants. Wired to
 * /api/AdminOverview/missions/all — one flat array ordered by last
 * updated, with every step's status and the requesting user.
 */

function fmtAgo(iso?: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h ago`;
  return `${Math.round(diff / 86400_000)}d ago`;
}

function statusToPill(s: string): {
  status: "ok" | "warn" | "info" | "error" | "idle";
  label: string;
} {
  const v = s.toLowerCase();
  if (v === "running") return { status: "info", label: "running" };
  if (v === "paused") return { status: "warn", label: "paused" };
  if (v === "failed" || v === "error") return { status: "error", label: "failed" };
  if (v === "completed" || v === "done" || v === "succeeded") return { status: "ok", label: "done" };
  if (v === "draft") return { status: "idle", label: "draft" };
  return { status: "idle", label: v || "unknown" };
}

export default async function AdminMissionsPage() {
  return safeAdminPage("admin/missions", renderMissionsPage);
}

async function renderMissionsPage() {
  const session = await requireAdminSession();
  const missions: AdminMissionRow[] = await fetchAdminMissions(
    session.token!,
  ).catch(() => []);

  const running = missions.filter((m) => m.status.toLowerCase() === "running").length;
  const paused = missions.filter((m) => m.status.toLowerCase() === "paused").length;
  const done = missions.filter((m) =>
    ["completed", "done", "succeeded"].includes(m.status.toLowerCase()),
  ).length;
  const failed = missions.filter((m) =>
    ["failed", "error"].includes(m.status.toLowerCase()),
  ).length;

  // Squad load by tenant (count of executions per company).
  const byCompany = new Map<string, number>();
  for (const m of missions) {
    byCompany.set(m.companyName, (byCompany.get(m.companyName) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Leads & Missions"
        title="Missions"
        subtitle="Squad executions running across all tenants. Each mission is a chained agent flow — lead scout → sales rep → closer → analyst, etc. Live data."
        right={
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-[13px] font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
          >
            <Target className="h-3.5 w-3.5" /> View leads
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total missions" value={missions.length} icon={Sparkles} accent="emerald" hint={`${byCompany.size} tenants`} />
        <StatCard label="Running" value={running} icon={Play} accent="cyan" />
        <StatCard label="Paused" value={paused} icon={Pause} accent="amber" />
        <StatCard label={failed > 0 ? "Failed" : "Completed"} value={failed > 0 ? failed : done} icon={failed > 0 ? XCircle : CheckCircle2} accent={failed > 0 ? "rose" : "violet"} hint={failed > 0 ? `${done} done` : "lifetime"} />
      </div>

      <Section title="All missions" subtitle="latest update first" accent="emerald">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-20" },
            { key: "mission", header: "Mission" },
            { key: "company", header: "Tenant" },
            { key: "step", header: "Step", className: "w-20" },
            { key: "ago", header: "Updated", className: "w-28" },
            { key: "status", header: "Status", className: "w-32" },
          ]}
          rows={missions.map((m) => {
            const pill = statusToPill(m.status);
            return {
              id: `${m.companyId}-${m.id}`,
              cells: {
                id: <AdminMonoText>#{m.id}</AdminMonoText>,
                mission: (
                  <div className="flex items-center gap-3">
                    <AdminCellAvatar emoji="🎯" accent="#34d399" />
                    <AdminCellTitle
                      primary={m.title || `Mission #${m.id}`}
                      secondary={`${m.squadName ?? `Squad #${m.squadId}`} · ${m.mode} · started ${fmtAgo(m.startedAtUtc ?? m.createdDate)}`}
                      href={`/admin/missions/${m.id}`}
                    />
                  </div>
                ),
                company: (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                    {m.companyName}
                  </div>
                ),
                step: (
                  <span className="font-mono text-[11px] text-white/65">
                    #{m.currentStepOrder}
                  </span>
                ),
                ago: (
                  <span className="font-mono text-[11px] text-white/55">
                    {fmtAgo(m.updatedDate)}
                  </span>
                ),
                status: <StatusPill status={pill.status} label={pill.label} />,
              },
            };
          })}
          emptyHint="No squad executions across any tenant yet."
        />
      </Section>

      <Section title="Mission load by tenant" subtitle="live count" accent="violet">
        <AdminTable
          columns={[
            { key: "company", header: "Tenant" },
            { key: "count", header: "Missions", className: "text-right" },
          ]}
          rows={[...byCompany.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([company, count], idx) => ({
              id: idx,
              cells: {
                company: (
                  <div className="flex items-center gap-2.5">
                    <AdminCellAvatar emoji="🏢" accent="#a78bfa" />
                    <span className="text-[13px] font-medium text-white/85">
                      {company}
                    </span>
                  </div>
                ),
                count: (
                  <span className="font-mono text-[13px] font-semibold text-white/90">
                    {count}
                  </span>
                ),
              },
            }))}
          emptyHint="No missions executed anywhere yet."
        />
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <Bot className="mr-1 inline h-3 w-3" />
        live · {missions.length} mission{missions.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
