import { Building2, Clock, Pause, Play, Timer, XCircle } from "lucide-react";
import Link from "next/link";
import { fetchAdminCronJobs, type AdminCronJobRow } from "@/lib/auth/api";
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
 * v146 — Admin · Cron jobs.
 *
 * Cross-tenant cron schedule, wired to /api/AdminOverview/cron/all.
 * The endpoint walks every company's cron table and returns one
 * flat array, ordered by next-run-utc descending.
 */

function fmtNextIn(iso?: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "due now";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)}h`;
  return `${Math.round(ms / 86400_000)}d`;
}

function statusToPill(s: string): { status: "ok" | "warn" | "info" | "error" | "idle"; label: string } {
  const v = s.toLowerCase();
  if (v === "running")  return { status: "info",  label: "running" };
  if (v === "paused")   return { status: "warn",  label: "paused"  };
  if (v === "failed")   return { status: "error", label: "failed"  };
  if (v === "canceled" || v === "cancelled") return { status: "idle", label: "canceled" };
  if (v === "active")   return { status: "ok",    label: "armed"   };
  return { status: "ok", label: v || "active" };
}

export default async function AdminCronPage() {
  return safeAdminPage("admin/cron", renderCronPage);
}

async function renderCronPage() {
  const session = await requireAdminSession();
  const jobs: AdminCronJobRow[] = await fetchAdminCronJobs(session.token!).catch(
    () => [],
  );

  const armed   = jobs.filter((j) => j.status.toLowerCase() === "active").length;
  const running = jobs.filter((j) => j.status.toLowerCase() === "running").length;
  const paused  = jobs.filter((j) => j.status.toLowerCase() === "paused").length;
  const failed  = jobs.filter((j) => (j.lastRunStatus ?? "").toLowerCase() === "failed").length;

  // group by tenant
  const byCompany = new Map<string, number>();
  for (const j of jobs) {
    byCompany.set(j.companyName, (byCompany.get(j.companyName) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Cron"
        title="Scheduled jobs"
        subtitle="Every recurring agent action across the platform — daily briefings, hourly sweeps, weekly digests, etc. Live data."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total jobs" value={jobs.length} icon={Timer} accent="amber" hint={`across ${byCompany.size} tenants`} />
        <StatCard label="Armed" value={armed} icon={Clock} accent="cyan" />
        <StatCard label="Running now" value={running} icon={Play} accent="emerald" />
        <StatCard label="Paused / failed" value={paused + failed} icon={paused >= failed ? Pause : XCircle} accent="rose" hint={`${paused} paused · ${failed} failed`} />
      </div>

      <Section title="All scheduled jobs" subtitle="next first" accent="amber">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-20" },
            { key: "job", header: "Job" },
            { key: "company", header: "Tenant" },
            { key: "schedule", header: "Schedule" },
            { key: "next", header: "Next in", className: "w-24" },
            { key: "runs", header: "Runs", className: "w-28" },
            { key: "status", header: "Status", className: "w-28" },
            { key: "actions", header: "", className: "w-24 text-right" },
          ]}
          rows={jobs.map((j) => {
            const pill = statusToPill(j.status);
            return {
              id: `${j.companyId}-${j.id}`,
              cells: {
                id: <AdminMonoText>#{j.id}</AdminMonoText>,
                job: (
                  <div className="flex items-center gap-3">
                    <AdminCellAvatar emoji="⏰" accent="#f59e0b" />
                    <AdminCellTitle
                      primary={j.name}
                      secondary={j.agentName ?? `${j.kind} · ${j.timezone}`}
                      href={`/admin/cron/${j.id}`}
                    />
                  </div>
                ),
                company: (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                    {j.companyName}
                  </div>
                ),
                schedule: (
                  <div>
                    <div className="font-mono text-[11.5px] text-white/75">
                      {j.cronExpression ?? "—"}
                    </div>
                    <div className="font-mono text-[10px] text-white/40">
                      {j.timezone}
                    </div>
                  </div>
                ),
                next: <span className="font-mono text-[11px] text-white/55">{fmtNextIn(j.nextRunAtUtc)}</span>,
                runs: (
                  <span className="font-mono text-[11px] text-white/65">
                    {j.runCount}{j.failureCount ? <span className="text-rose-300"> · {j.failureCount} fail</span> : null}
                  </span>
                ),
                status: <StatusPill status={pill.status} label={pill.label} />,
                actions: (
                  <Link
                    href={`/admin/cron/${j.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-500/25"
                  >
                    Open →
                  </Link>
                ),
              },
            };
          })}
          emptyHint="No cron jobs scheduled across any tenant."
        />
      </Section>

      <Section title="Cron load by tenant" subtitle="job count" accent="violet">
        <AdminTable
          columns={[
            { key: "company", header: "Tenant" },
            { key: "jobs", header: "Jobs", className: "text-right" },
          ]}
          rows={[...byCompany.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([company, count], idx) => ({
              id: idx,
              cells: {
                company: (
                  <div className="flex items-center gap-2.5">
                    <AdminCellAvatar emoji="🏢" accent="#a78bfa" />
                    <span className="text-[13px] font-medium text-white/85">{company}</span>
                  </div>
                ),
                jobs: (
                  <span className="font-mono text-[13px] font-semibold text-white/90">
                    {count}
                  </span>
                ),
              },
            }))}
          emptyHint="No cron jobs anywhere."
        />
      </Section>
    </div>
  );
}
