import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Pause,
  Play,
  Power,
  Settings as SettingsIcon,
  Sparkles,
  Square,
  Timer,
  Webhook,
  XCircle,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  fetchCompaniesPaged,
  fetchCronJobById,
  type OkestriaCronJob,
  type OkestriaCronJobRun,
} from "@/lib/auth/api";
import {
  cancelCronJobAction,
  deleteCronJobAction,
  pauseCronJobAction,
  resumeCronJobAction,
  runCronJobAction,
} from "../../_actions";
import { requireAdminSession } from "../../_lib/admin";
import { Section, StatCard, StatusPill } from "../../_components/AdminUI";
import {
  DetailActionLink,
  DetailFact,
  DetailHeader,
  DetailTagPill,
} from "../../_components/AdminDetail";
import { AdminDeleteButton } from "../../_components/AdminDeleteButton";
import { safeAdminPage } from "../../_lib/safe-page";

/**
 * v149 — Admin · Cron job detail.
 *
 * Wired to GET /api/CronJobs/{jobId} which already returns the
 * job + last 50 runs inline. Renders runs as chat bubbles (same
 * idiom the office uses for its cron modal), exposes Run / Pause /
 * Resume / Cancel / Delete actions wired to the existing
 * CronJobsController endpoints, and links to the edit form.
 */

type RunPill = "ok" | "warn" | "info" | "error" | "idle";

function runStatus(s: string): { pill: RunPill; label: string } {
  const v = s.toLowerCase();
  if (v === "succeeded") return { pill: "ok", label: "succeeded" };
  if (v === "running") return { pill: "info", label: "running" };
  if (v === "queued" || v === "deferred" || v === "retrying")
    return { pill: "warn", label: v };
  if (v === "failed") return { pill: "error", label: "failed" };
  if (v === "cancelled" || v === "canceled" || v === "skipped")
    return { pill: "idle", label: v };
  return { pill: "idle", label: v || "—" };
}

function jobStatus(s: string): { pill: RunPill; label: string } {
  const v = s.toLowerCase();
  if (v === "active") return { pill: "ok", label: "armed" };
  if (v === "paused") return { pill: "warn", label: "paused" };
  if (v === "running") return { pill: "info", label: "running" };
  if (v === "cancelled" || v === "canceled")
    return { pill: "idle", label: "canceled" };
  if (v === "failed") return { pill: "error", label: "failed" };
  return { pill: "idle", label: v || "—" };
}

function fmtAgo(iso?: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 0) {
    const ahead = -diff;
    if (ahead < 60_000) return `in ${Math.round(ahead / 1000)}s`;
    if (ahead < 3600_000) return `in ${Math.round(ahead / 60_000)}m`;
    if (ahead < 86400_000) return `in ${Math.round(ahead / 3600_000)}h`;
    return `in ${Math.round(ahead / 86400_000)}d`;
  }
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h ago`;
  return `${Math.round(diff / 86400_000)}d ago`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US");
}

function fmtDuration(start?: string | null, end?: string | null): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return "—";
  const ms = Math.max(0, e - s);
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 3600_000)}h`;
}

export default async function AdminCronDetailPage({
  params,
}: {
  params: Promise<{ cronId: string }>;
}) {
  return safeAdminPage("admin/cron/[id]", () => render(params));
}

async function render(params: Promise<{ cronId: string }>) {
  const { cronId } = await params;
  const id = Number(cronId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [job, companiesResp] = await Promise.all([
    fetchCronJobById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!job) notFound();

  const companyName =
    (companiesResp?.result ?? []).find((c) => c.id === job.companyId)?.name ??
    `Company #${job.companyId}`;

  const status = jobStatus(job.status);
  const runs = job.runs ?? [];
  const succeeded = runs.filter(
    (r) => r.status.toLowerCase() === "succeeded",
  ).length;
  const failed = runs.filter((r) => r.status.toLowerCase() === "failed").length;

  return (
    <div className="space-y-8">
      <DetailHeader
        backHref="/admin/cron"
        backLabel="Back to cron"
        eyebrow={`Cron · #${job.id}`}
        title={job.name || `Cron #${job.id}`}
        subtitle={
          job.description?.trim() ||
          (job.cronExpression ? `${job.cronExpression} · ${job.timezone}` : `${job.kind} · ${job.timezone}`)
        }
        pills={
          <>
            <DetailTagPill variant={status.pill === "ok" ? "emerald" : "outline"}>
              {status.label}
            </DetailTagPill>
            <DetailTagPill>ID #{job.id}</DetailTagPill>
            <DetailTagPill variant="cyan">{job.kind}</DetailTagPill>
            {job.agentName ? (
              <DetailTagPill variant="violet">@ {job.agentName}</DetailTagPill>
            ) : null}
            {job.deleteAfterRun ? (
              <DetailTagPill variant="amber">delete-after-run</DetailTagPill>
            ) : null}
          </>
        }
        actions={
          <>
            <RunActionButton job={job} />
            {job.status.toLowerCase() === "paused" ? (
              <ResumeButton jobId={job.id} />
            ) : (
              <PauseButton jobId={job.id} />
            )}
            <CancelButton jobId={job.id} />
            <DetailActionLink
              href={`/admin/cron/${job.id}/edit`}
              accent="violet"
              icon={SettingsIcon}
            >
              Edit
            </DetailActionLink>
            <form action={deleteCronJobAction}>
              <input type="hidden" name="jobId" value={job.id} />
              <AdminDeleteButton
                confirmText={`Delete "${job.name}"? ${job.runCount} run${
                  job.runCount === 1 ? "" : "s"
                } on record. Cannot be undone.`}
              />
            </form>
          </>
        }
      />

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Lifetime runs"
          value={job.runCount}
          icon={Timer}
          accent="amber"
          hint={`${job.failureCount} failure${job.failureCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Succeeded"
          value={succeeded}
          icon={CheckCircle2}
          accent="emerald"
          hint="recent window"
        />
        <StatCard
          label="Failed"
          value={failed}
          icon={XCircle}
          accent={failed > 0 ? "rose" : "violet"}
          hint="recent window"
        />
        <StatCard
          label="Next run"
          value={fmtAgo(job.nextRunAtUtc)}
          icon={Clock}
          accent="cyan"
          hint={fmtDate(job.nextRunAtUtc)}
        />
      </div>

      {/* ── Identity / schedule ─────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Identity"
          subtitle="who runs this"
          accent="cyan"
          right={<Bot className="h-4 w-4 text-cyan-300/70" />}
        >
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <DetailFact label="Tenant" value={companyName} icon={Building2} />
            <DetailFact label="Agent" value={job.agentName ?? "—"} icon={Bot} />
            <DetailFact
              label="Created by"
              value={job.createdByUserName ?? "—"}
            />
            <DetailFact label="Squad" value={job.squadName ?? "—"} />
            <DetailFact
              label="Description"
              span={2}
              value={job.description ?? "No description set."}
            />
          </div>
        </Section>

        <Section
          title="Schedule"
          subtitle="when it fires"
          accent="amber"
          right={<Timer className="h-4 w-4 text-amber-300/70" />}
        >
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <DetailFact label="Kind" value={job.kind} />
            <DetailFact label="Timezone" value={job.timezone} mono />
            <DetailFact
              label="Cron expression"
              value={job.cronExpression ?? "—"}
              mono
              span={2}
            />
            <DetailFact
              label="Run-at (one-shot)"
              value={fmtDate(job.runAtUtc)}
              mono
            />
            <DetailFact
              label="Next run"
              value={fmtDate(job.nextRunAtUtc)}
              mono
            />
            <DetailFact
              label="Last run"
              value={fmtDate(job.lastRunAtUtc)}
              mono
            />
            <DetailFact
              label="Last status"
              value={job.lastRunStatus ?? "—"}
            />
          </div>
        </Section>
      </div>

      {/* ── Delivery + system event ─────────────────────────────── */}
      <Section
        title="Dispatch"
        subtitle="prompt, delivery and webhook"
        accent="violet"
        right={<Sparkles className="h-4 w-4 text-violet-300/70" />}
      >
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <DetailFact label="Session mode" value={job.sessionMode} />
          <DetailFact label="Wake mode" value={job.wakeMode} />
          <DetailFact label="Delivery mode" value={job.deliveryMode} icon={Mail} />
          <DetailFact
            label="Webhook URL"
            value={job.webhookUrl ?? "—"}
            icon={Webhook}
            mono
          />
          <DetailFact
            label="System event prompt"
            span={2}
            value={
              job.systemEvent?.trim()
                ? job.systemEvent
                : "(empty — agent gets no system prompt override)"
            }
          />
        </div>
      </Section>

      {/* ── Last error if any ──────────────────────────────────── */}
      {job.lastErrorMessage ? (
        <Section
          title="Last error"
          subtitle="from the most recent failed dispatch"
          accent="rose"
          right={<AlertTriangle className="h-4 w-4 text-rose-300/70" />}
        >
          <pre className="m-5 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-rose-400/30 bg-rose-500/[0.06] p-4 font-mono text-[11.5px] leading-relaxed text-rose-100/85">
            {job.lastErrorMessage}
          </pre>
        </Section>
      ) : null}

      {/* ── Run history (chat-style) ────────────────────────────── */}
      <Section
        title={`Runs · ${runs.length}`}
        subtitle="newest first · agent's reply rendered like a chat"
        accent="emerald"
        right={<MessageSquare className="h-4 w-4 text-emerald-300/70" />}
      >
        {runs.length === 0 ? (
          <div className="p-5">
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
              <p className="text-[13px] text-white/55">
                No runs on record yet — trigger one with the{" "}
                <strong className="text-white/85">Run now</strong> button above.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            {runs.map((run) => (
              <RunBubble
                key={run.id}
                run={run}
                agentName={job.agentName ?? "agent"}
                agentAvatarUrl={job.agentAvatarUrl ?? null}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Action buttons                                                     */
/* ─────────────────────────────────────────────────────────────────── */

function RunActionButton({ job }: { job: OkestriaCronJob }) {
  const disabled =
    job.status.toLowerCase() === "cancelled" ||
    job.status.toLowerCase() === "canceled";
  return (
    <form action={runCronJobAction}>
      <input type="hidden" name="jobId" value={job.id} />
      <input type="hidden" name="onlyIfDue" value="false" />
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/45 bg-gradient-to-r from-emerald-500/30 to-cyan-500/25 px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_0_18px_rgba(52,211,153,0.30)] transition hover:from-emerald-500/45 hover:to-cyan-500/35 disabled:opacity-40"
      >
        <Play className="h-3.5 w-3.5" />
        Run now
      </button>
    </form>
  );
}

function PauseButton({ jobId }: { jobId: number }) {
  return (
    <form action={pauseCronJobAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3.5 py-2 text-[12.5px] font-semibold text-amber-100 transition hover:bg-amber-500/25"
      >
        <Pause className="h-3.5 w-3.5" />
        Pause
      </button>
    </form>
  );
}

function ResumeButton({ jobId }: { jobId: number }) {
  return (
    <form action={resumeCronJobAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2 text-[12.5px] font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
      >
        <Power className="h-3.5 w-3.5" />
        Resume
      </button>
    </form>
  );
}

function CancelButton({ jobId }: { jobId: number }) {
  return (
    <form action={cancelCronJobAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-3.5 py-2 text-[12.5px] font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
      >
        <Square className="h-3.5 w-3.5" />
        Cancel
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Chat-style run bubble                                              */
/* ─────────────────────────────────────────────────────────────────── */

function RunBubble({
  run,
  agentName,
  agentAvatarUrl,
}: {
  run: OkestriaCronJobRun;
  agentName: string;
  agentAvatarUrl: string | null;
}) {
  const status = runStatus(run.status);
  const reply = (run.resultText ?? "").trim();
  const error = (run.errorMessage ?? "").trim();
  const triggerLabel =
    run.triggerSource === "scheduler"
      ? "scheduled tick"
      : run.triggerSource === "manual"
        ? "manual run"
        : run.triggerSource;

  return (
    <div className="space-y-3">
      {/* Trigger row (system-side) */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px]"
          style={{
            background: "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.35)",
            color: "#f59e0b",
          }}
        >
          ⏰
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-semibold text-white/85">
              Run #{run.runNumber}
            </span>
            <StatusPill status={status.pill} label={status.label} />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/40">
              {triggerLabel}
            </span>
            {run.attemptNumber > 1 ? (
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-amber-300/70">
                attempt {run.attemptNumber}
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-[10.5px] text-white/45">
            {fmtDate(run.scheduledAtUtc)} · started{" "}
            {fmtAgo(run.startedAtUtc ?? run.scheduledAtUtc)}{" "}
            · duration {fmtDuration(run.startedAtUtc, run.finishedAtUtc)}
          </p>
        </div>
      </div>

      {/* Agent reply bubble (assistant-side) */}
      {reply || error ? (
        <div className="flex items-start gap-3 pl-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[14px]"
            style={{
              background: "rgba(167,139,250,0.15)",
              border: "1px solid rgba(167,139,250,0.35)",
              color: "#a78bfa",
            }}
          >
            {agentAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agentAvatarUrl}
                alt={agentName}
                className="h-full w-full object-cover"
              />
            ) : (
              <Bot className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-violet-300/70">
              {agentName}
            </p>
            {reply ? (
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border border-white/10 bg-black/30 p-4 text-[12.5px] leading-relaxed text-white/85">
                {reply}
              </pre>
            ) : null}
            {error ? (
              <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border border-rose-400/30 bg-rose-500/[0.06] p-4 font-mono text-[11.5px] leading-relaxed text-rose-100/85">
                {run.errorCategory ? `[${run.errorCategory}] ` : ""}
                {error}
              </pre>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Pending / running placeholder */}
      {!reply && !error && run.status.toLowerCase() === "running" ? (
        <div className="flex items-start gap-3 pl-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px]"
            style={{
              background: "rgba(34,211,238,0.12)",
              border: "1px solid rgba(34,211,238,0.30)",
              color: "#22d3ee",
            }}
          >
            <Bot className="h-4 w-4" />
          </div>
          <div className="rounded-2xl rounded-tl-sm border border-cyan-400/25 bg-cyan-500/[0.05] px-4 py-3 text-[12.5px] text-cyan-100/85">
            Running… agent reply will appear here when the gateway finalizes
            the dispatch.
          </div>
        </div>
      ) : null}

      <div
        className="ml-4 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}
