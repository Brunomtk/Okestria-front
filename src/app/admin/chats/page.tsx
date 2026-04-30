import { Bot, Building2, MessageSquare, ShieldCheck, User, Wrench } from "lucide-react";
import { fetchAdminChats, type AdminChatRow } from "@/lib/auth/api";
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
 * v147 — Admin · Chats.
 *
 * One row per agent message across all tenants. Wired to
 * /api/AdminOverview/chats/recent — pivots off
 * SquadExecutionMessage which is where actual agent conversation
 * persists in v80+.
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
function rolePresentation(role: string, authorType: string): {
  emoji: string;
  accent: string;
  pill: Pill;
  label: string;
} {
  const r = role.toLowerCase();
  const a = authorType.toLowerCase();
  if (r === "user" || a === "user")
    return { emoji: "👤", accent: "#22d3ee", pill: "info", label: "user" };
  if (r === "assistant" || a === "agent")
    return { emoji: "🤖", accent: "#a78bfa", pill: "ok", label: "agent" };
  if (a === "tool")
    return { emoji: "🔧", accent: "#f59e0b", pill: "warn", label: "tool" };
  return { emoji: "·", accent: "#94a3b8", pill: "idle", label: r || "system" };
}

export default async function AdminChatsPage() {
  return safeAdminPage("admin/chats", renderChatsPage);
}

async function renderChatsPage() {
  const session = await requireAdminSession();
  const messages: AdminChatRow[] = await fetchAdminChats(session.token!, 80).catch(
    () => [],
  );

  const userMsgs = messages.filter(
    (m) => m.role.toLowerCase() === "user" || m.authorType.toLowerCase() === "user",
  ).length;
  const agentMsgs = messages.filter(
    (m) => m.role.toLowerCase() === "assistant" || m.authorType.toLowerCase() === "agent",
  ).length;
  const toolMsgs = messages.filter((m) => m.authorType.toLowerCase() === "tool").length;

  // Distinct conversation count = distinct execution ids in the window.
  const conversations = new Set(messages.map((m) => m.executionId)).size;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Chats"
        title="Chats"
        subtitle="Latest agent conversations across the platform — every squad-execution message tail. Live data."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Conversations" value={conversations} icon={MessageSquare} accent="violet" hint="distinct executions" />
        <StatCard label="User messages" value={userMsgs} icon={User} accent="cyan" />
        <StatCard label="Agent replies" value={agentMsgs} icon={Bot} accent="emerald" />
        <StatCard label="Tool calls" value={toolMsgs} icon={Wrench} accent="amber" />
      </div>

      <Section title={`Recent messages · ${messages.length}`} subtitle="newest first" accent="violet">
        <AdminTable
          columns={[
            { key: "kind", header: "Role", className: "w-32" },
            { key: "preview", header: "Message" },
            { key: "execution", header: "Execution" },
            { key: "company", header: "Tenant" },
            { key: "ago", header: "When", className: "w-28" },
          ]}
          rows={messages.map((m) => {
            const p = rolePresentation(m.role, m.authorType);
            return {
              id: `${m.executionId}-${m.id}`,
              cells: {
                kind: (
                  <div className="flex items-center gap-2.5">
                    <AdminCellAvatar emoji={p.emoji} accent={p.accent} />
                    <StatusPill status={p.pill} label={p.label} />
                  </div>
                ),
                preview: (
                  <AdminCellTitle
                    primary={m.preview || "(empty)"}
                    secondary={m.authorName ?? p.label}
                  />
                ),
                execution: (
                  <AdminCellTitle
                    primary={m.executionTitle}
                    secondary={m.squadName ?? `Squad #${m.squadId ?? "—"}`}
                  />
                ),
                company: (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                    {m.companyName}
                  </div>
                ),
                ago: <AdminMonoText>{fmtAgo(m.createdDate)}</AdminMonoText>,
              },
            };
          })}
          emptyHint="No agent conversations yet. Once a squad starts running, messages flow in here."
        />
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <ShieldCheck className="mr-1 inline h-3 w-3" />
        live · {messages.length} message{messages.length === 1 ? "" : "s"} ·{" "}
        {conversations} conversation{conversations === 1 ? "" : "s"}
      </p>
    </div>
  );
}
