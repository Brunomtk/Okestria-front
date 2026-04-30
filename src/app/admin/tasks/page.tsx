import {
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  ListTodo,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { fetchCompaniesPaged, fetchSquadsByCompany } from "@/lib/auth/api";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section, StatCard, StatusPill } from "../_components/AdminUI";
import {
  AdminCellAvatar,
  AdminCellTitle,
  AdminMonoText,
  AdminTable,
} from "../_components/AdminTable";

/**
 * v144 — Admin · Tasks. Squad task executions across tenants.
 * Each row is one self-contained task (an agent picked up an
 * action and is currently running, or completed it). Aggregates
 * squads per company since a unified task feed isn't shipped yet.
 */

type TaskMock = {
  id: string;
  title: string;
  agent: string;
  agentEmoji: string;
  agentColor: string;
  company: string;
  status: "running" | "queued" | "done" | "failed";
  durationSec: number;
  startedMinAgo: number;
};

const TASKS: TaskMock[] = [
  { id: "t-281", title: "Draft outreach for Aurora Spa",                   agent: "Lúcio", agentEmoji: "💼", agentColor: "#a78bfa", company: "PTX Growth",        status: "running", durationSec: 42,  startedMinAgo: 0 },
  { id: "t-280", title: "Enrich 23 Apollo leads with website + email",     agent: "Lúcia", agentEmoji: "🎯", agentColor: "#22d3ee", company: "PTX Growth",        status: "running", durationSec: 178, startedMinAgo: 3 },
  { id: "t-279", title: "Save daily news brief to Cortex",                  agent: "Mira",  agentEmoji: "📝", agentColor: "#fb7185", company: "Aurora Spa",        status: "done",    durationSec: 24,  startedMinAgo: 6 },
  { id: "t-278", title: "Reply to 3rd touch · Casa Verde",                  agent: "Olga",  agentEmoji: "🤝", agentColor: "#f59e0b", company: "Pinheiro Cleaning", status: "done",    durationSec: 19,  startedMinAgo: 9 },
  { id: "t-277", title: "Compile weekly competitor digest",                 agent: "Yann",  agentEmoji: "📊", agentColor: "#34d399", company: "Casa Verde",        status: "done",    durationSec: 312, startedMinAgo: 12 },
  { id: "t-276", title: "Schedule follow-up sequence (10 step) for Casa V.",agent: "Lúcio", agentEmoji: "💼", agentColor: "#a78bfa", company: "PTX Growth",        status: "done",    durationSec: 36,  startedMinAgo: 18 },
  { id: "t-275", title: "Birthday outreach · Jet Auto contacts",            agent: "Olga",  agentEmoji: "🤝", agentColor: "#f59e0b", company: "Jet Auto",          status: "queued",  durationSec: 0,   startedMinAgo: 22 },
  { id: "t-274", title: "Validate IMAP credentials for new operator",       agent: "Mira",  agentEmoji: "📝", agentColor: "#fb7185", company: "Aurora Spa",        status: "failed",  durationSec: 4,   startedMinAgo: 35 },
];

function fmtDuration(s: number): string {
  if (s < 1) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}
function fmtAgo(min: number): string {
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

export default async function AdminTasksPage() {
  const session = await requireAdminSession();
  const companiesResp = await fetchCompaniesPaged(session.token!, {
    pageNumber: 1,
    pageSize: 50,
  }).catch(() => null);
  const companies = companiesResp?.result ?? [];

  const squadGroups = await Promise.all(
    companies.map((c) =>
      fetchSquadsByCompany(c.id, session.token!).catch(() => []).then((s) => ({
        company: c.name ?? `Company #${c.id}`,
        count: s.length,
      })),
    ),
  );
  const totalSquads = squadGroups.reduce((s, x) => s + x.count, 0);

  const running = TASKS.filter((t) => t.status === "running").length;
  const queued = TASKS.filter((t) => t.status === "queued").length;
  const done = TASKS.filter((t) => t.status === "done").length;
  const failed = TASKS.filter((t) => t.status === "failed").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Tasks"
        title="Squad tasks"
        subtitle="Every individual agent action, executed or queued, across the whole platform."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Running" value={running} icon={PlayCircle} accent="cyan" />
        <StatCard label="Queued" value={queued} icon={PauseCircle} accent="amber" />
        <StatCard label="Done · last hour" value={done} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Failed · last hour" value={failed} icon={Clock} accent="rose" />
      </div>

      <Section title="Recent tasks" subtitle="newest first" accent="cyan">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-20" },
            { key: "task", header: "Task" },
            { key: "company", header: "Tenant" },
            { key: "duration", header: "Duration", className: "w-24" },
            { key: "ago", header: "Started", className: "w-24" },
            { key: "status", header: "Status", className: "w-28" },
          ]}
          rows={TASKS.map((t) => ({
            id: t.id,
            cells: {
              id: <AdminMonoText>{t.id}</AdminMonoText>,
              task: (
                <div className="flex items-center gap-3">
                  <AdminCellAvatar emoji={t.agentEmoji} accent={t.agentColor} />
                  <AdminCellTitle primary={t.title} secondary={t.agent} />
                </div>
              ),
              company: (
                <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                  <Building2 className="h-3.5 w-3.5 text-white/40" />
                  {t.company}
                </div>
              ),
              duration: (
                <span className="font-mono text-[11.5px] text-white/65">
                  {fmtDuration(t.durationSec)}
                </span>
              ),
              ago: (
                <span className="font-mono text-[11px] text-white/45">{fmtAgo(t.startedMinAgo)}</span>
              ),
              status: (
                <StatusPill
                  status={
                    t.status === "running" ? "info" :
                    t.status === "queued"  ? "warn" :
                    t.status === "done"    ? "ok"   :
                                              "error"
                  }
                  label={t.status}
                />
              ),
            },
          }))}
          emptyHint="No tasks running right now."
        />
      </Section>

      <Section title="Squads provisioned per tenant" subtitle="capacity" accent="violet">
        <AdminTable
          columns={[
            { key: "company", header: "Tenant" },
            { key: "squads", header: "Squads", className: "text-right" },
          ]}
          rows={squadGroups
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map((row, idx) => ({
              id: idx,
              cells: {
                company: (
                  <div className="flex items-center gap-2.5">
                    <AdminCellAvatar emoji="🏢" accent="#a78bfa" />
                    <span className="text-[13px] font-medium text-white/85">{row.company}</span>
                  </div>
                ),
                squads: (
                  <span className="font-mono text-[13px] font-semibold text-white/90">
                    {row.count}
                  </span>
                ),
              },
            }))}
          emptyHint="No squads provisioned yet."
        />
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <Bot className="mr-1 inline h-3 w-3" />
        Aggregating · {totalSquads} squads available · live task feed coming
      </p>

      <span className="hidden">{ListTodo ? null : null}</span>
    </div>
  );
}
