import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Hash,
  ListChecks,
  MessageSquare,
  Paperclip,
  ScrollText,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  fetchCompaniesPaged,
  fetchSquadExecutionById,
  type OkestriaSquadExecutionMessage,
  type OkestriaSquadExecutionStep,
} from "@/lib/auth/api";
import { requireAdminSession } from "../../_lib/admin";
import { Section, StatCard, StatusPill } from "../../_components/AdminUI";
import {
  DetailFact,
  DetailHeader,
  DetailLinkRow,
  DetailTagPill,
} from "../../_components/AdminDetail";
import { safeAdminPage } from "../../_lib/safe-page";
import { AdminChatMessage } from "../../cron/[cronId]/_components/AdminChatMessage";

/**
 * v151 — Admin · Mission detail.
 *
 * One squad-execution rendered as a full timeline: prompt + steps
 * + chat-style messages + events + the final response. Every field
 * comes from `/api/SquadExecutions/{id}` which already returns the
 * complete graph inline.
 */

type Pill = "ok" | "warn" | "info" | "error" | "idle";

function statusPill(status: string): { pill: Pill; label: string } {
  const v = status.toLowerCase();
  if (v === "running") return { pill: "info", label: "running" };
  if (v === "succeeded" || v === "completed" || v === "done")
    return { pill: "ok", label: "done" };
  if (v === "failed" || v === "error") return { pill: "error", label: "failed" };
  if (v === "paused" || v === "blocked") return { pill: "warn", label: v };
  if (v === "draft") return { pill: "idle", label: "draft" };
  return { pill: "idle", label: v || "unknown" };
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US");
}

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

function fmtDuration(start?: string | null, end?: string | null): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return "—";
  const ms = Math.max(0, e - s);
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 3600_000)}h`;
}

export default async function AdminMissionDetailPage({
  params,
}: {
  params: Promise<{ executionId: string }>;
}) {
  return safeAdminPage("admin/missions/[id]", () => render(params));
}

async function render(params: Promise<{ executionId: string }>) {
  const { executionId } = await params;
  const id = Number(executionId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [execution, companiesResp] = await Promise.all([
    fetchSquadExecutionById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!execution) notFound();

  const companyName =
    (companiesResp?.result ?? []).find((c) => c.id === execution.companyId)
      ?.name ?? `Company #${execution.companyId}`;

  const status = statusPill(execution.status);
  const steps = execution.steps ?? [];
  const messages = execution.messages ?? [];
  const events = execution.events ?? [];
  const stepsDone = steps.filter((s) =>
    ["succeeded", "completed", "done"].includes(s.status.toLowerCase()),
  ).length;
  const stepsFailed = steps.filter((s) =>
    ["failed", "error"].includes(s.status.toLowerCase()),
  ).length;

  return (
    <div className="space-y-8">
      <DetailHeader
        backHref="/admin/missions"
        backLabel="Back to missions"
        eyebrow={`Mission · #${execution.id}`}
        title={execution.title || `Mission #${execution.id}`}
        subtitle={
          execution.squadName
            ? `${execution.squadName} · ${execution.mode} · key ${execution.executionKey}`
            : `${execution.mode} · key ${execution.executionKey}`
        }
        pills={
          <>
            <DetailTagPill variant={status.pill === "ok" ? "emerald" : "outline"}>
              {status.label}
            </DetailTagPill>
            <DetailTagPill>ID #{execution.id}</DetailTagPill>
            <DetailTagPill variant="cyan">{execution.mode}</DetailTagPill>
            {execution.preferredModel ? (
              <DetailTagPill variant="violet">
                {execution.preferredModel}
              </DetailTagPill>
            ) : null}
            {execution.requestedByUserName ? (
              <DetailTagPill>by {execution.requestedByUserName}</DetailTagPill>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Steps"
          value={steps.length}
          icon={ListChecks}
          accent="violet"
          hint={`${stepsDone} done${stepsFailed > 0 ? ` · ${stepsFailed} failed` : ""}`}
        />
        <StatCard
          label="Messages"
          value={messages.length}
          icon={MessageSquare}
          accent="cyan"
        />
        <StatCard
          label="Events"
          value={events.length}
          icon={ScrollText}
          accent="amber"
        />
        <StatCard
          label="Duration"
          value={fmtDuration(execution.startedAtUtc, execution.finishedAtUtc)}
          icon={Clock}
          accent={status.pill === "error" ? "rose" : "emerald"}
          hint={fmtAgo(execution.startedAtUtc ?? execution.createdDate)}
        />
      </div>

      {/* ── Identity / context ─────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Identity"
          subtitle="who's running it and where"
          accent="violet"
          right={<UserRound className="h-4 w-4 text-violet-300/70" />}
        >
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <DetailFact label="Tenant" value={companyName} icon={Building2} />
            <DetailFact
              label="Squad"
              value={execution.squadName ?? `Squad #${execution.squadId}`}
              icon={Bot}
            />
            <DetailFact
              label="Requested by"
              value={execution.requestedByUserName ?? "—"}
              icon={UserRound}
            />
            <DetailFact
              label="Execution key"
              value={execution.executionKey}
              icon={Hash}
              mono
            />
            <DetailFact
              label="Mode"
              value={execution.mode}
            />
            <DetailFact
              label="Current step"
              value={`#${execution.currentStepOrder}`}
              mono
            />
            <DetailFact
              label="Started"
              value={fmtDate(execution.startedAtUtc)}
              mono
            />
            <DetailFact
              label="Finished"
              value={fmtDate(execution.finishedAtUtc)}
              mono
            />
          </div>
        </Section>

        <Section
          title="Initial prompt"
          subtitle="what kicked the mission off"
          accent="amber"
          right={<Sparkles className="h-4 w-4 text-amber-300/70" />}
        >
          <div className="space-y-3 p-5">
            {execution.prompt?.trim() ? (
              <AdminChatMessage content={execution.prompt} />
            ) : (
              <p className="text-[12.5px] italic text-white/40">
                No prompt recorded.
              </p>
            )}
            {execution.attachmentCount > 0 ? (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-[11.5px] text-white/65">
                <Paperclip className="h-3 w-3 text-white/45" />
                {execution.attachmentCount} attachment
                {execution.attachmentCount === 1 ? "" : "s"}
              </div>
            ) : null}
          </div>
        </Section>
      </div>

      {/* ── Steps timeline ─────────────────────────────────────── */}
      <Section
        title={`Steps · ${steps.length}`}
        subtitle="agent chain"
        accent="cyan"
        right={<ListChecks className="h-4 w-4 text-cyan-300/70" />}
      >
        {steps.length === 0 ? (
          <div className="p-5">
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-[13px] text-white/45">
              No steps yet — the squad hasn&apos;t dispatched any agent for
              this mission.
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-5">
            {steps
              .slice()
              .sort((a, b) => a.stepOrder - b.stepOrder)
              .map((step) => (
                <StepRow key={step.id} step={step} />
              ))}
          </div>
        )}
      </Section>

      {/* ── Final response ─────────────────────────────────────── */}
      {execution.finalResponse?.trim() ? (
        <Section
          title="Final response"
          subtitle="what the squad delivered"
          accent="emerald"
          right={<CheckCircle2 className="h-4 w-4 text-emerald-300/70" />}
        >
          <div className="p-5">
            <AdminChatMessage content={execution.finalResponse} />
          </div>
        </Section>
      ) : null}

      {/* ── Summary ─────────────────────────────────────────────── */}
      {execution.summary?.trim() ? (
        <Section
          title="Summary"
          subtitle="condensed wrap-up"
          accent="violet"
          right={<Sparkles className="h-4 w-4 text-violet-300/70" />}
        >
          <div className="p-5">
            <AdminChatMessage content={execution.summary} />
          </div>
        </Section>
      ) : null}

      {/* ── Error ─────────────────────────────────────────────── */}
      {execution.errorMessage?.trim() ? (
        <Section
          title="Error"
          subtitle="last failure on this mission"
          accent="rose"
          right={<AlertTriangle className="h-4 w-4 text-rose-300/70" />}
        >
          <pre className="m-5 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-rose-400/30 bg-rose-500/[0.06] p-4 font-mono text-[11.5px] leading-relaxed text-rose-100/85">
            {execution.errorMessage}
          </pre>
        </Section>
      ) : null}

      {/* ── Conversation (chat-style) ──────────────────────────── */}
      <Section
        title={`Conversation · ${messages.length}`}
        subtitle="every agent + system message"
        accent="cyan"
        right={<MessageSquare className="h-4 w-4 text-cyan-300/70" />}
      >
        {messages.length === 0 ? (
          <div className="p-5">
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-[13px] text-white/45">
              No messages persisted yet.
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            {messages
              .slice()
              .sort((a, b) => a.sequence - b.sequence)
              .map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
          </div>
        )}
      </Section>

      {/* ── Events ────────────────────────────────────────────── */}
      {events.length > 0 ? (
        <Section
          title={`Events · ${events.length}`}
          subtitle="lifecycle events the back logged"
          accent="amber"
          right={<ScrollText className="h-4 w-4 text-amber-300/70" />}
        >
          <div className="max-h-80 divide-y divide-white/[0.04] overflow-auto">
            {events
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.createdDate).getTime() -
                  new Date(a.createdDate).getTime(),
              )
              .map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start justify-between gap-3 px-5 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusPill
                        status={
                          ev.level === "error"
                            ? "error"
                            : ev.level === "warn"
                              ? "warn"
                              : ev.level === "info"
                                ? "info"
                                : "idle"
                        }
                        label={ev.level}
                      />
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
                        {ev.type}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-[12.5px] text-white/75">
                      {ev.message}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10.5px] text-white/40">
                    {fmtAgo(ev.createdDate)}
                  </span>
                </div>
              ))}
          </div>
        </Section>
      ) : null}

      {/* ── Quick links ────────────────────────────────────────── */}
      <Section title="Quick links" accent="violet">
        <div className="space-y-2 p-5">
          <DetailLinkRow
            href={`/admin/companies/${execution.companyId}`}
            icon={Building2}
          >
            Open linked tenant — {companyName}
          </DetailLinkRow>
          <DetailLinkRow
            href={`/admin/squads/${execution.squadId}`}
            icon={Bot}
          >
            Open squad — {execution.squadName ?? `#${execution.squadId}`}
          </DetailLinkRow>
          {execution.leadId ? (
            <DetailLinkRow
              href={`/admin/leads/${execution.leadId}`}
              icon={Target}
            >
              View linked lead · #{execution.leadId}
            </DetailLinkRow>
          ) : null}
        </div>
      </Section>
    </div>
  );
}

function StepRow({ step }: { step: OkestriaSquadExecutionStep }) {
  const status = statusPill(step.status);
  const duration = fmtDuration(step.startedAtUtc, step.finishedAtUtc);
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] font-mono text-[10.5px] text-white/70">
              {step.stepOrder}
            </span>
            <span className="text-[13px] font-semibold text-white/90">
              {step.title || `Step ${step.stepOrder}`}
            </span>
            <StatusPill status={status.pill} label={status.label} />
            <DetailTagPill variant="cyan">{step.stepKind}</DetailTagPill>
          </div>
          <p className="mt-1 font-mono text-[11px] text-white/50">
            {step.agentName ?? `Agent #${step.agentId}`}
            {step.agentSlug ? ` · @${step.agentSlug}` : ""}
            {step.startedAtUtc
              ? ` · started ${fmtAgo(step.startedAtUtc)}`
              : ""}
            {duration !== "—" ? ` · ${duration}` : ""}
          </p>
        </div>
        {step.externalSessionKey ? (
          <span className="shrink-0 break-all font-mono text-[10px] text-white/35">
            session · {step.externalSessionKey.slice(0, 16)}…
          </span>
        ) : null}
      </div>

      {step.outputText?.trim() ? (
        <div className="mt-3">
          <AdminChatMessage content={step.outputText} />
        </div>
      ) : null}

      {step.errorMessage?.trim() ? (
        <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-rose-400/30 bg-rose-500/[0.06] p-3 font-mono text-[11.5px] leading-relaxed text-rose-100/85">
          {step.errorMessage}
        </pre>
      ) : null}
    </div>
  );
}

function MessageBubble({ message }: { message: OkestriaSquadExecutionMessage }) {
  const role = message.role.toLowerCase();
  const author = message.authorType.toLowerCase();
  const isAssistant = role === "assistant" || author === "agent";
  const isUser = role === "user" || author === "user";
  const accent = isAssistant ? "#a78bfa" : isUser ? "#22d3ee" : "#94a3b8";
  const emoji = isAssistant ? "🤖" : isUser ? "👤" : "·";
  const label = isAssistant ? "agent" : isUser ? "user" : author || role;

  return (
    <div className={`flex items-start gap-3 ${isUser ? "" : "pl-2"}`}>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px]"
        style={{
          background: `${accent}26`,
          border: `1px solid ${accent}55`,
          color: accent,
        }}
      >
        {emoji}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
            {label}
          </span>
          {message.authorName ? (
            <span className="text-[11.5px] text-white/65">
              {message.authorName}
            </span>
          ) : null}
          <span className="font-mono text-[10.5px] text-white/35">
            #{message.sequence} · {fmtAgo(message.createdDate)}
          </span>
        </div>
        {message.content?.trim() ? (
          <AdminChatMessage content={message.content} />
        ) : (
          <p className="text-[12px] italic text-white/40">(empty message)</p>
        )}
      </div>
    </div>
  );
}

