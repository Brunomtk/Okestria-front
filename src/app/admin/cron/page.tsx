import { Building2, Clock, Pause, Play, Timer } from "lucide-react";
import { fetchCompaniesPaged } from "@/lib/auth/api";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section, StatCard, StatusPill } from "../_components/AdminUI";
import {
  AdminCellAvatar,
  AdminCellTitle,
  AdminMonoText,
  AdminTable,
} from "../_components/AdminTable";

/**
 * v144 — Admin · Cron jobs.
 *
 * Cross-tenant cron schedule. The back has a per-company cron table
 * but no admin-wide aggregator yet, so we render a curated set of
 * representative jobs across known tenants. When the unified
 * endpoint lands, swap CRON_JOBS for the live response.
 */

type CronMock = {
  id: string;
  name: string;
  schedule: string;
  scheduleHuman: string;
  agent: string;
  agentEmoji: string;
  agentColor: string;
  company: string;
  nextInSec: number;
  status: "armed" | "running" | "ok" | "paused";
};

const CRON_JOBS: CronMock[] = [
  { id: "cj-1", name: "Daily news brief",       schedule: "0 8 * * *",     scheduleHuman: "every day · 8am",         agent: "Mira",  agentEmoji: "📝", agentColor: "#fb7185", company: "PTX Growth",        nextInSec: 47,  status: "armed" },
  { id: "cj-2", name: "Stale leads sweep",      schedule: "*/15 * * * *",  scheduleHuman: "every 15 min",            agent: "Lúcia", agentEmoji: "🎯", agentColor: "#22d3ee", company: "PTX Growth",        nextInSec: 12,  status: "running" },
  { id: "cj-3", name: "Pipeline digest",        schedule: "0 17 * * 1-5",  scheduleHuman: "weekdays · 5pm",          agent: "Yann",  agentEmoji: "📊", agentColor: "#34d399", company: "Aurora Spa",        nextInSec: 380, status: "armed" },
  { id: "cj-4", name: "Birthday outreach",      schedule: "0 9 * * *",     scheduleHuman: "every day · 9am",         agent: "Olga",  agentEmoji: "🤝", agentColor: "#f59e0b", company: "Pinheiro Cleaning", nextInSec: 5,   status: "armed" },
  { id: "cj-5", name: "Weekly competitor scan", schedule: "0 6 * * 1",     scheduleHuman: "mondays · 6am",           agent: "Yann",  agentEmoji: "📊", agentColor: "#34d399", company: "Casa Verde",        nextInSec: 1820,status: "armed" },
  { id: "cj-6", name: "Inbox triage",           schedule: "0 9 * * *",     scheduleHuman: "every day · 9am",         agent: "Lúcio", agentEmoji: "💼", agentColor: "#a78bfa", company: "Jet Auto",          nextInSec: 0,   status: "paused" },
];

function fmtNext(s: number): string {
  if (s <= 0) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

export default async function AdminCronPage() {
  const session = await requireAdminSession();
  const companiesResp = await fetchCompaniesPaged(session.token!, {
    pageNumber: 1,
    pageSize: 50,
  }).catch(() => null);
  const companies = companiesResp?.result ?? [];

  const armed = CRON_JOBS.filter((j) => j.status === "armed").length;
  const running = CRON_JOBS.filter((j) => j.status === "running").length;
  const paused = CRON_JOBS.filter((j) => j.status === "paused").length;

  // group by company
  const byCompany = new Map<string, number>();
  for (const j of CRON_JOBS) {
    byCompany.set(j.company, (byCompany.get(j.company) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Cron"
        title="Scheduled jobs"
        subtitle="Every recurring agent action across the platform — daily briefings, hourly sweeps, weekly digests, etc."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total jobs" value={CRON_JOBS.length} icon={Timer} accent="amber" hint={`across ${companies.length} tenants`} />
        <StatCard label="Armed" value={armed} icon={Clock} accent="cyan" hint="next within 1h" />
        <StatCard label="Running now" value={running} icon={Play} accent="emerald" />
        <StatCard label="Paused" value={paused} icon={Pause} accent="rose" />
      </div>

      <Section title="All scheduled jobs" subtitle="next first" accent="amber">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-20" },
            { key: "job", header: "Job" },
            { key: "company", header: "Tenant" },
            { key: "schedule", header: "Schedule" },
            { key: "next", header: "Next in", className: "w-24" },
            { key: "status", header: "Status", className: "w-28" },
          ]}
          rows={[...CRON_JOBS]
            .sort((a, b) => a.nextInSec - b.nextInSec)
            .map((j) => ({
              id: j.id,
              cells: {
                id: <AdminMonoText>{j.id}</AdminMonoText>,
                job: (
                  <div className="flex items-center gap-3">
                    <AdminCellAvatar emoji={j.agentEmoji} accent={j.agentColor} />
                    <AdminCellTitle primary={j.name} secondary={`${j.agent}`} />
                  </div>
                ),
                company: (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                    {j.company}
                  </div>
                ),
                schedule: (
                  <div>
                    <div className="font-mono text-[11.5px] text-white/75">{j.schedule}</div>
                    <div className="font-mono text-[10px] text-white/40">{j.scheduleHuman}</div>
                  </div>
                ),
                next: <span className="font-mono text-[11px] text-white/55">{fmtNext(j.nextInSec)}</span>,
                status: (
                  <StatusPill
                    status={
                      j.status === "running" ? "info" :
                      j.status === "ok"      ? "ok"   :
                      j.status === "paused"  ? "warn" :
                                                "ok"
                    }
                    label={j.status}
                  />
                ),
              },
            }))}
          emptyHint="No cron jobs scheduled."
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
