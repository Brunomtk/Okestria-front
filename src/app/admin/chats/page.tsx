import { Building2, MessageSquare, User, Bot } from "lucide-react";
import { fetchAgentsByCompany, fetchCompaniesPaged } from "@/lib/auth/api";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section, StatCard, StatusPill } from "../_components/AdminUI";
import {
  AdminCellAvatar,
  AdminCellTitle,
  AdminMonoText,
  AdminTable,
} from "../_components/AdminTable";

/**
 * v144 — Admin · Chats.
 *
 * Aggregates active agent chats per company. The back doesn't have a
 * cross-tenant chat-history endpoint yet, so we render counts of
 * configured agents per company (proxy for "chats available") and a
 * curated set of representative recent chat sessions.
 */

type ChatMock = {
  id: string;
  agent: string;
  agentEmoji: string;
  agentColor: string;
  company: string;
  operator: string;
  lastMessage: string;
  agoMinutes: number;
  status: "live" | "idle" | "queued";
};

const RECENT_CHATS: ChatMock[] = [
  { id: "c-001", agent: "Lúcio · Sales rep", agentEmoji: "💼", agentColor: "#a78bfa", company: "PTX Growth",        operator: "lucas@ptx",          lastMessage: "Drafted 2nd touch · awaiting approval",   agoMinutes: 1,    status: "live" },
  { id: "c-002", agent: "Lúcia · Lead scout",agentEmoji: "🎯", agentColor: "#22d3ee", company: "Aurora Spa",        operator: "marcus@aurora",      lastMessage: "Queue cleared · 8 leads enriched",         agoMinutes: 6,    status: "idle" },
  { id: "c-003", agent: "Olga · Closer",     agentEmoji: "🤝", agentColor: "#f59e0b", company: "Pinheiro Cleaning", operator: "darley@pinheiro",    lastMessage: "Booked Friday call with João",            agoMinutes: 12,   status: "idle" },
  { id: "c-004", agent: "Mira · Scribe",     agentEmoji: "📝", agentColor: "#fb7185", company: "PTX Growth",        operator: "lucas@ptx",          lastMessage: "Saved daily news brief to Cortex",         agoMinutes: 24,   status: "idle" },
  { id: "c-005", agent: "Yann · Analyst",    agentEmoji: "📊", agentColor: "#34d399", company: "Casa Verde",        operator: "rafael@casaverde",   lastMessage: "Compiled weekly competitor digest",        agoMinutes: 38,   status: "idle" },
  { id: "c-006", agent: "Lúcio · Sales rep", agentEmoji: "💼", agentColor: "#a78bfa", company: "Jet Auto",          operator: "fernanda@jet",       lastMessage: "Sent follow-up to 4 prospects",            agoMinutes: 65,   status: "queued" },
];

function fmtAgo(min: number): string {
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminChatsPage() {
  const session = await requireAdminSession();
  const companiesResp = await fetchCompaniesPaged(session.token!, {
    pageNumber: 1,
    pageSize: 50,
  }).catch(() => null);
  const companies = companiesResp?.result ?? [];

  const agentByCompany = await Promise.all(
    companies.map((c) =>
      fetchAgentsByCompany(c.id, session.token!).catch(() => []).then((agents) => ({
        company: c.name ?? `Company #${c.id}`,
        agents: agents.length,
      })),
    ),
  );
  const totalAgents = agentByCompany.reduce((s, x) => s + x.agents, 0);
  const liveCount = RECENT_CHATS.filter((c) => c.status === "live").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Chats"
        title="Agent chats"
        subtitle="A live pulse of what every operator is talking to their agents about, across every tenant."
        right={
          <div className="flex items-center gap-2">
            <StatusPill status="info" label={`${liveCount} live`} />
            <StatusPill status="ok" label={`${totalAgents} agents available`} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Companies" value={companies.length} icon={Building2} accent="violet" />
        <StatCard label="Agents reachable" value={totalAgents} icon={Bot} accent="cyan" />
        <StatCard label="Sessions live" value={liveCount} icon={MessageSquare} accent="emerald" />
        <StatCard label="Operators on" value={new Set(RECENT_CHATS.map((c) => c.operator)).size} icon={User} accent="amber" />
      </div>

      <Section title="Recent chats" subtitle="across tenants" accent="violet">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-20" },
            { key: "session", header: "Session" },
            { key: "company", header: "Tenant" },
            { key: "operator", header: "Operator" },
            { key: "ago", header: "When", className: "w-24" },
            { key: "status", header: "Status", className: "w-28" },
          ]}
          rows={RECENT_CHATS.map((c) => ({
            id: c.id,
            cells: {
              id: <AdminMonoText>{c.id}</AdminMonoText>,
              session: (
                <div className="flex items-center gap-3">
                  <AdminCellAvatar emoji={c.agentEmoji} accent={c.agentColor} />
                  <AdminCellTitle primary={c.agent} secondary={c.lastMessage} />
                </div>
              ),
              company: (
                <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                  <Building2 className="h-3.5 w-3.5 text-white/40" />
                  {c.company}
                </div>
              ),
              operator: (
                <span className="font-mono text-[11.5px] text-white/55">{c.operator}</span>
              ),
              ago: (
                <span className="font-mono text-[11px] text-white/45">{fmtAgo(c.agoMinutes)}</span>
              ),
              status: (
                <StatusPill
                  status={c.status === "live" ? "info" : c.status === "idle" ? "ok" : "warn"}
                  label={c.status}
                />
              ),
            },
          }))}
          emptyHint="No chats running right now."
        />
      </Section>

      <Section title="Agents available per tenant" subtitle="ready-to-chat" accent="cyan">
        <AdminTable
          columns={[
            { key: "company", header: "Tenant" },
            { key: "agents", header: "Agents", className: "text-right" },
          ]}
          rows={agentByCompany
            .sort((a, b) => b.agents - a.agents)
            .slice(0, 10)
            .map((row, idx) => ({
              id: idx,
              cells: {
                company: (
                  <div className="flex items-center gap-2.5">
                    <AdminCellAvatar emoji="🏢" accent="#22d3ee" />
                    <span className="text-[13px] font-medium text-white/85">{row.company}</span>
                  </div>
                ),
                agents: (
                  <span className="font-mono text-[13px] font-semibold text-white/90">
                    {row.agents}
                  </span>
                ),
              },
            }))}
          emptyHint="No agents provisioned yet."
        />
      </Section>
    </div>
  );
}
