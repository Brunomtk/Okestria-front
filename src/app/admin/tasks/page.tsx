import {
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  ListTodo,
  PauseCircle,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { fetchAdminTasks, type AdminTaskRow } from "@/lib/auth/api";
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
 * v147 — Admin · Tasks.
 *
 * One row per squad-execution step across all tenants. Wired to
 * /api/AdminOverview/tasks/all — joins step → execution → company
 * + agent for the display columns.
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

type Pill = "ok" | "warn" | "info" | "error" | "idle";
function statusToPill(status: string): { pill: Pill; label: string } {
  const v = status.toLowerCase();
  if (v === "running") return { pill: "info", label: "running" };
  if (v === "completed" || v === "succeeded" || v === "done")
    return { pill: "ok", label: "done" };
  if (v === "failed" || v === "error") return { pill: "error", label: "failed" };
  if (v === "paused" || v === "blocked") return { pill: "warn", label: v };
  if (v === "pending" || v === "queued") return { pill: "idle", label: v };
  return { pill: "idle", label: v || "—" };
}

export default async function AdminTasksPage() {
  return safeAdminPage("admin/tasks", renderTasksPage);
}

async function renderTasksPage() {
  const session = await requireAdminSession();
  const tasks: AdminTaskRow[] = await fetchAdminTasks(session.token!, 100).catch(
    () => [],
  );

  const running = tasks.filter((t) => t.status.toLowerCase() === "running").length;
  const done = tasks.filter((t) =>
    ["completed", "done", "succeeded"].includes(t.status.toLowerCase()),
  ).length;
  const failed = tasks.filter((t) =>
    ["failed", "error"].includes(t.status.toLowerCase()),
  ).length;
  const pending = tasks.filter((t) =>
    ["pending", "queued", "blocked", "paused"].includes(t.status.toLowerCase()),
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Tasks"
        title="Tasks"
        subtitle="Every squad execution step across the platform — one row per agent call. Live data."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total tasks" value={tasks.length} icon={ListTodo} accent="cyan" hint="recent 100" />
        <StatCard label="Running" value={running} icon={PlayCircle} accent="emerald" />
        <StatCard label="Done" value={done} icon={CheckCircle2} accent="violet" />
        <StatCard label={failed > 0 ? "Failed" : "Pending"} value={failed > 0 ? failed : pending} icon={failed > 0 ? XCircle : PauseCircle} accent={failed > 0 ? "rose" : "amber"} hint={failed > 0 ? `${pending} pending` : "queue"} />
      </div>

      <Section title={`Recent tasks · ${tasks.length}`} subtitle="latest update first" accent="cyan">
        <AdminTable
          columns={[
            { key: "id", header: "#", className: "w-20" },
            { key: "task", header: "Task" },
            { key: "agent", header: "Agent" },
            { key: "company", header: "Tenant" },
            { key: "duration", header: "Duration", className: "w-24" },
            { key: "ago", header: "Updated", className: "w-28" },
            { key: "status", header: "Status", className: "w-32" },
          ]}
          rows={tasks.map((t) => {
            const s = statusToPill(t.status);
            return {
              id: `${t.executionId}-${t.id}`,
              cells: {
                id: <AdminMonoText>#{t.id}</AdminMonoText>,
                task: (
                  <div className="flex items-center gap-3">
                    <AdminCellAvatar emoji="📌" accent="#22d3ee" />
                    <AdminCellTitle
                      primary={t.title || `Step ${t.stepOrder}`}
                      secondary={`${t.executionTitle} · step #${t.stepOrder}`}
                    />
                  </div>
                ),
                agent: (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/75">
                    <Bot className="h-3.5 w-3.5 text-white/40" />
                    {t.agentName ?? `Agent #${t.agentId}`}
                  </div>
                ),
                company: (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                    {t.companyName}
                  </div>
                ),
                duration: (
                  <span className="font-mono text-[11px] text-white/55">
                    {fmtDuration(t.startedAtUtc, t.finishedAtUtc)}
                  </span>
                ),
                ago: <AdminMonoText>{fmtAgo(t.updatedDate)}</AdminMonoText>,
                status: <StatusPill status={s.pill} label={s.label} />,
              },
            };
          })}
          emptyHint="No squad-execution steps yet. Once a squad runs, every agent call shows up here."
        />
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <Clock className="mr-1 inline h-3 w-3" />
        live · {tasks.length} task{tasks.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
