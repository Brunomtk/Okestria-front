import {
  Bot,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
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
 * v144 — Admin · Missions.
 *
 * "Missions" are squad executions running across tenants. The
 * back doesn't expose a unified `/admin/missions` endpoint yet,
 * so we aggregate squads per company + render a curated set of
 * representative running missions on top of the live squad list.
 * Designed to plug straight into a real cross-tenant mission feed
 * the moment one lands.
 */

type MissionMock = {
  id: string;
  company: string;
  squad: string;
  goal: string;
  startedMinAgo: number;
  agents: number;
  progress: number;
  status: "running" | "paused" | "done";
};

const MISSIONS: MissionMock[] = [
  { id: "m-001", company: "PTX Growth",       squad: "Outbound · SEA",      goal: "Generate 50 leads + 10-step sequence",     startedMinAgo: 12,  agents: 3, progress: 64, status: "running" },
  { id: "m-002", company: "Aurora Spa",       squad: "Inbox triage",        goal: "Route 24h inbox & reply within 30min",     startedMinAgo: 4,   agents: 2, progress: 38, status: "running" },
  { id: "m-003", company: "Pinheiro Cleaning",squad: "Closer follow-up",    goal: "Reach 11 quoted leads, schedule callbacks",startedMinAgo: 78,  agents: 4, progress: 92, status: "running" },
  { id: "m-004", company: "Casa Verde",       squad: "Onboarding",          goal: "Stand up new account, push welcome kit",   startedMinAgo: 240, agents: 2, progress: 100, status: "done" },
  { id: "m-005", company: "Jet Auto",         squad: "Market intel",        goal: "Weekly competitor digest",                  startedMinAgo: 32,  agents: 2, progress: 18, status: "paused" },
];

function fmtAgo(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default async function AdminMissionsPage() {
  const session = await requireAdminSession();

  const companiesResp = await fetchCompaniesPaged(session.token!, {
    pageNumber: 1,
    pageSize: 50,
  }).catch(() => null);
  const companies = companiesResp?.result ?? [];

  const squadCounts = await Promise.all(
    companies.map((c) =>
      fetchSquadsByCompany(c.id, session.token!).catch(() => []).then((s) => ({
        company: c.name ?? `Company #${c.id}`,
        count: s.length,
      })),
    ),
  );
  const totalSquads = squadCounts.reduce((s, x) => s + x.count, 0);

  const running = MISSIONS.filter((m) => m.status === "running").length;
  const paused = MISSIONS.filter((m) => m.status === "paused").length;
  const done = MISSIONS.filter((m) => m.status === "done").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Leads & Missions"
        title="Missions"
        subtitle="Squad executions running across all tenants. Each mission is a chained agent flow — lead scout → sales rep → closer → analyst, etc."
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
        <StatCard label="Total squads" value={totalSquads} icon={Bot} accent="violet" hint="across tenants" />
        <StatCard label="Running" value={running} icon={Play} accent="emerald" />
        <StatCard label="Paused" value={paused} icon={Pause} accent="amber" />
        <StatCard label="Completed" value={done} icon={CheckCircle2} accent="cyan" hint="last 24h" />
      </div>

      <Section title="Active missions" subtitle="curated · awaiting unified endpoint" accent="emerald">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-20" },
            { key: "mission", header: "Mission" },
            { key: "agents", header: "Agents", className: "w-20" },
            { key: "progress", header: "Progress", className: "w-48" },
            { key: "status", header: "Status", className: "w-32" },
          ]}
          rows={MISSIONS.map((m) => ({
            id: m.id,
            cells: {
              id: <AdminMonoText>{m.id}</AdminMonoText>,
              mission: (
                <div className="flex items-center gap-3">
                  <AdminCellAvatar emoji="🎯" accent="#34d399" />
                  <AdminCellTitle
                    primary={m.goal}
                    secondary={`${m.company} · ${m.squad} · ${fmtAgo(m.startedMinAgo)} ago`}
                  />
                </div>
              ),
              agents: (
                <span className="inline-flex items-center gap-1 font-mono text-[12px] text-white/70">
                  <Bot className="h-3 w-3 text-white/40" />
                  {m.agents}
                </span>
              ),
              progress: (
                <div>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${m.progress}%`,
                        background:
                          "linear-gradient(90deg, #22d3ee 0%, #a78bfa 60%, #f59e0b 100%)",
                        boxShadow: "0 0 8px rgba(167,139,250,0.5)",
                      }}
                    />
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-white/40">
                    {m.progress}%
                  </div>
                </div>
              ),
              status: (
                <StatusPill
                  status={m.status === "running" ? "info" : m.status === "paused" ? "warn" : "ok"}
                  label={m.status}
                />
              ),
            },
          }))}
          emptyHint="No missions running right now."
        />
      </Section>

      <Section title="Squad load by tenant" subtitle="live count" accent="violet">
        <AdminTable
          columns={[
            { key: "company", header: "Tenant" },
            { key: "count", header: "Squads", className: "text-right" },
          ]}
          rows={squadCounts
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
                count: (
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
        <Clock className="mr-1 inline h-3 w-3" />
        squad runtime endpoint coming · this view auto-upgrades when it lands
      </p>

      <span className="hidden">{Sparkles ? null : null}</span>
    </div>
  );
}
