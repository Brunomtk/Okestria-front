import {
  Bot,
  Building2,
  MessageSquare,
  ShieldCheck,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { fetchAdminChats, type AdminChatRow } from "@/lib/auth/api";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section, StatCard } from "../_components/AdminUI";
import {
  AdminCellAvatar,
  AdminMonoText,
  AdminTable,
} from "../_components/AdminTable";
import { safeAdminPage } from "../_lib/safe-page";

/**
 * v155 — Admin · Chats.
 *
 * One row per CONVERSATION (squad-execution), not per message.
 * Showing every individual message in the table makes it overflow
 * horizontally — the long markdown previews "##" + tons of text
 * blow past the column width. Grouping by execution gives the
 * operator the right unit-of-attention (a chat thread) and a
 * single "Open chat" button per row that jumps to the mission
 * detail page (which already renders the full conversation as
 * markdown chat bubbles).
 */

type GroupedChat = {
  executionId: number;
  executionTitle: string;
  squadId?: number | null;
  squadName?: string | null;
  companyId: number;
  companyName: string;
  messageCount: number;
  agentMessages: number;
  userMessages: number;
  toolMessages: number;
  lastMessage: AdminChatRow;
  lastMessageAtMs: number;
};

function fmtAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h ago`;
  return `${Math.round(diff / 86400_000)}d ago`;
}

/** Strip markdown noise so the preview reads as plain text in a row. */
function flattenPreview(raw: string): string {
  return (raw ?? "")
    .replace(/```[\s\S]*?```/g, " «code» ")
    .replace(/`[^`]+`/g, (s) => s.slice(1, -1))
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\r/g, "")
    .replace(/\n+/g, " · ")
    .replace(/\s+/g, " ")
    .trim();
}

function rolePresentation(role: string, authorType: string): {
  emoji: string;
  accent: string;
  label: string;
} {
  const r = role.toLowerCase();
  const a = authorType.toLowerCase();
  if (r === "user" || a === "user")
    return { emoji: "👤", accent: "#22d3ee", label: "user" };
  if (r === "assistant" || a === "agent")
    return { emoji: "🤖", accent: "#a78bfa", label: "agent" };
  if (a === "tool")
    return { emoji: "🔧", accent: "#f59e0b", label: "tool" };
  return { emoji: "·", accent: "#94a3b8", label: r || "system" };
}

function groupByExecution(messages: AdminChatRow[]): GroupedChat[] {
  const buckets = new Map<number, GroupedChat>();
  for (const m of messages) {
    const key = m.executionId;
    const at = new Date(m.createdDate).getTime();
    const existing = buckets.get(key);
    if (existing) {
      existing.messageCount += 1;
      const role = m.role.toLowerCase();
      const author = m.authorType.toLowerCase();
      if (role === "user" || author === "user") existing.userMessages += 1;
      else if (role === "assistant" || author === "agent")
        existing.agentMessages += 1;
      else if (author === "tool") existing.toolMessages += 1;
      if (Number.isFinite(at) && at > existing.lastMessageAtMs) {
        existing.lastMessageAtMs = at;
        existing.lastMessage = m;
      }
    } else {
      const role = m.role.toLowerCase();
      const author = m.authorType.toLowerCase();
      buckets.set(key, {
        executionId: key,
        executionTitle: m.executionTitle,
        squadId: m.squadId,
        squadName: m.squadName,
        companyId: m.companyId,
        companyName: m.companyName,
        messageCount: 1,
        agentMessages: role === "assistant" || author === "agent" ? 1 : 0,
        userMessages: role === "user" || author === "user" ? 1 : 0,
        toolMessages: author === "tool" ? 1 : 0,
        lastMessage: m,
        lastMessageAtMs: Number.isFinite(at) ? at : 0,
      });
    }
  }
  return [...buckets.values()].sort(
    (a, b) => b.lastMessageAtMs - a.lastMessageAtMs,
  );
}

export default async function AdminChatsPage() {
  return safeAdminPage("admin/chats", renderChatsPage);
}

async function renderChatsPage() {
  const session = await requireAdminSession();
  const messages: AdminChatRow[] = await fetchAdminChats(
    session.token!,
    150,
  ).catch(() => []);

  const conversations = groupByExecution(messages);

  const userMsgs = messages.filter(
    (m) =>
      m.role.toLowerCase() === "user" ||
      m.authorType.toLowerCase() === "user",
  ).length;
  const agentMsgs = messages.filter(
    (m) =>
      m.role.toLowerCase() === "assistant" ||
      m.authorType.toLowerCase() === "agent",
  ).length;
  const toolMsgs = messages.filter(
    (m) => m.authorType.toLowerCase() === "tool",
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Chats"
        title="Chats"
        subtitle="Latest agent conversations across the platform — grouped by squad-execution. Click ‘Open chat’ to read the full thread with markdown."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Conversations"
          value={conversations.length}
          icon={MessageSquare}
          accent="violet"
          hint="distinct executions"
        />
        <StatCard
          label="User messages"
          value={userMsgs}
          icon={User}
          accent="cyan"
        />
        <StatCard
          label="Agent replies"
          value={agentMsgs}
          icon={Bot}
          accent="emerald"
        />
        <StatCard
          label="Tool calls"
          value={toolMsgs}
          icon={Wrench}
          accent="amber"
        />
      </div>

      <Section
        title={`Conversations · ${conversations.length}`}
        subtitle="newest first"
        accent="violet"
      >
        <AdminTable
          columns={[
            { key: "execution", header: "Conversation" },
            { key: "preview", header: "Latest message" },
            { key: "counts", header: "Counts", className: "w-36" },
            { key: "company", header: "Tenant", className: "w-44" },
            { key: "ago", header: "When", className: "w-24" },
            { key: "actions", header: "", className: "w-28 text-right" },
          ]}
          rows={conversations.map((conv) => {
            const lastRole = rolePresentation(
              conv.lastMessage.role,
              conv.lastMessage.authorType,
            );
            const flat = flattenPreview(conv.lastMessage.preview ?? "");
            const truncated =
              flat.length > 110 ? `${flat.slice(0, 109)}…` : flat;
            return {
              id: conv.executionId,
              cells: {
                execution: (
                  <div className="flex items-start gap-3">
                    <AdminCellAvatar emoji="💬" accent="#a78bfa" />
                    <div className="min-w-0 max-w-[28ch]">
                      <p className="truncate text-[13px] font-semibold text-white/90">
                        {conv.executionTitle ||
                          `Mission #${conv.executionId}`}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10.5px] text-white/45">
                        {conv.squadName ?? `Squad #${conv.squadId ?? "—"}`} · #
                        {conv.executionId}
                      </p>
                    </div>
                  </div>
                ),
                preview: (
                  <div className="min-w-0 max-w-[44ch]">
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em]">
                      <span style={{ color: lastRole.accent }}>
                        {lastRole.emoji}
                      </span>
                      <span className="text-white/65">{lastRole.label}</span>
                    </div>
                    <p className="line-clamp-2 break-words text-[12.5px] leading-snug text-white/75">
                      {truncated || (
                        <span className="italic text-white/35">
                          (empty message)
                        </span>
                      )}
                    </p>
                  </div>
                ),
                counts: (
                  <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/[0.10] px-1.5 py-0.5 font-mono uppercase tracking-[0.18em] text-violet-200">
                      <Bot className="h-2.5 w-2.5" />
                      {conv.agentMessages}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/[0.10] px-1.5 py-0.5 font-mono uppercase tracking-[0.18em] text-cyan-200">
                      <User className="h-2.5 w-2.5" />
                      {conv.userMessages}
                    </span>
                    {conv.toolMessages > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/[0.10] px-1.5 py-0.5 font-mono uppercase tracking-[0.18em] text-amber-200">
                        <Wrench className="h-2.5 w-2.5" />
                        {conv.toolMessages}
                      </span>
                    ) : null}
                    <span className="font-mono text-[10px] text-white/35">
                      Σ {conv.messageCount}
                    </span>
                  </div>
                ),
                company: (
                  <div className="flex min-w-0 items-center gap-1.5 truncate text-[12.5px] text-white/70">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-white/40" />
                    <span className="truncate">{conv.companyName}</span>
                  </div>
                ),
                ago: (
                  <AdminMonoText>
                    {fmtAgo(conv.lastMessage.createdDate)}
                  </AdminMonoText>
                ),
                actions: (
                  <Link
                    href={`/admin/missions/${conv.executionId}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-100 transition hover:bg-violet-500/25"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Open chat
                  </Link>
                ),
              },
            };
          })}
          emptyHint="No agent conversations yet. Once a squad starts running, messages flow in here."
        />
      </Section>

      <Section
        title={`Recent stream · ${Math.min(messages.length, 30)}`}
        subtitle="raw messages — newest first · click to open the conversation"
        accent="cyan"
      >
        <div className="divide-y divide-white/[0.04] p-2">
          {messages.length === 0 ? (
            <p className="p-5 text-center text-[13px] text-white/45">
              No messages yet.
            </p>
          ) : (
            messages.slice(0, 30).map((m) => {
              const role = rolePresentation(m.role, m.authorType);
              const flat = flattenPreview(m.preview ?? "");
              const truncated =
                flat.length > 200 ? `${flat.slice(0, 199)}…` : flat;
              return (
                <Link
                  key={`${m.executionId}-${m.id}`}
                  href={`/admin/missions/${m.executionId}`}
                  className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.025]"
                >
                  <AdminCellAvatar emoji={role.emoji} accent={role.accent} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
                        {role.label}
                      </span>
                      {m.authorName ? (
                        <span className="text-[11.5px] text-white/65">
                          {m.authorName}
                        </span>
                      ) : null}
                      <span className="font-mono text-[10.5px] text-white/35">
                        {m.companyName} · #{m.executionId}
                      </span>
                      <span className="ml-auto font-mono text-[10.5px] text-white/35">
                        {fmtAgo(m.createdDate)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 break-words text-[12.5px] leading-snug text-white/80 group-hover:text-white/95">
                      {truncated || (
                        <span className="italic text-white/35">
                          (empty message)
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="hidden shrink-0 self-center font-mono text-[10.5px] text-violet-300/65 group-hover:text-violet-200 sm:inline">
                    open →
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <ShieldCheck className="mr-1 inline h-3 w-3" />
        live · {messages.length} message{messages.length === 1 ? "" : "s"} ·{" "}
        {conversations.length} conversation
        {conversations.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
