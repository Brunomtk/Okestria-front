import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Database,
  Mail,
  Network,
  ShieldCheck,
  Target,
  Timer,
} from "lucide-react";
import { fetchAdminHealth, type AdminHealthSubsystem } from "@/lib/auth/api";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section, StatCard, StatusPill } from "../_components/AdminUI";
import { safeAdminPage } from "../_lib/safe-page";

/**
 * v147 — Admin · System health.
 *
 * Wired to /api/AdminOverview/health/subsystems. Each subsystem is
 * probed live (db round-trip, gateway snapshot, cron/squad/lead
 * counts) — no mock numbers. Latency comes from the back's
 * Stopwatch around each probe.
 */

type Pill = "ok" | "warn" | "error" | "idle";

function statusToPill(status: string): { pill: Pill; label: string } {
  switch (status.toLowerCase()) {
    case "healthy":
      return { pill: "ok", label: "healthy" };
    case "degraded":
      return { pill: "warn", label: "degraded" };
    case "unhealthy":
      return { pill: "error", label: "unhealthy" };
    default:
      return { pill: "idle", label: status || "unknown" };
  }
}

function iconForSubsystem(id: string): React.ComponentType<{ className?: string }> {
  switch (id) {
    case "db":               return Database;
    case "gateway":          return Network;
    case "squad-executions": return Bot;
    case "cron":             return Timer;
    case "lead-gen":         return Target;
    case "lead-email":       return Mail;
    default:                 return ShieldCheck;
  }
}

function fmtAgo(iso?: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 1_000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3600_000)}h ago`;
}

export default async function AdminHealthPage() {
  return safeAdminPage("admin/health", renderHealthPage);
}

async function renderHealthPage() {
  const session = await requireAdminSession();
  const subsystems: AdminHealthSubsystem[] = await fetchAdminHealth(
    session.token!,
  ).catch(() => []);

  const healthy = subsystems.filter((s) => s.status === "healthy").length;
  const degraded = subsystems.filter((s) => s.status === "degraded").length;
  const unhealthy = subsystems.filter((s) => s.status === "unhealthy").length;

  const dbLatency = subsystems.find((s) => s.id === "db")?.latencyMs ?? null;
  const overall: Pill =
    unhealthy > 0 ? "error" : degraded > 0 ? "warn" : healthy > 0 ? "ok" : "idle";
  const overallLabel =
    unhealthy > 0
      ? "issues detected"
      : degraded > 0
        ? "running degraded"
        : healthy > 0
          ? "all systems normal"
          : "no probes available";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview · System"
        title="System health"
        subtitle="Every backend subsystem probed live — Postgres round-trip, OpenClaw gateway, queues. No mocks."
        right={<StatusPill status={overall} label={overallLabel} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Subsystems" value={subsystems.length} icon={ShieldCheck} accent="violet" />
        <StatCard label="Healthy" value={healthy} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Degraded" value={degraded} icon={AlertCircle} accent="amber" />
        <StatCard
          label="DB latency"
          value={dbLatency != null ? `${dbLatency}ms` : "—"}
          icon={Database}
          accent={dbLatency != null && dbLatency < 250 ? "cyan" : dbLatency != null ? "amber" : "rose"}
          hint="SELECT 1"
        />
      </div>

      <Section title="Live subsystem probes" subtitle="this request" accent="violet">
        <div className="space-y-3 p-5">
          {subsystems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-[13px] text-white/45">
              No probe data — the health endpoint returned nothing.
            </div>
          ) : (
            subsystems.map((s) => {
              const pill = statusToPill(s.status);
              const Icon = iconForSubsystem(s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/25 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(167,139,250,0.10)",
                        border: "1px solid rgba(167,139,250,0.25)",
                        color: "#a78bfa",
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white/90">
                        {s.name}
                      </p>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-white/55">
                        {s.detail ?? "—"}
                      </p>
                      <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/35">
                        last checked · {fmtAgo(s.lastCheckedUtc)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusPill status={pill.pill} label={pill.label} />
                    {s.latencyMs != null ? (
                      <span className="font-mono text-[11px] text-white/55">
                        {s.latencyMs}ms
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Section>

      <Section title="How to read this" subtitle="probe semantics" accent="cyan">
        <div className="space-y-3 p-5 text-[13px] leading-relaxed text-white/65">
          <p>
            <span className="text-white/85">Healthy</span> means the subsystem
            answered the probe in time and returned what we expected. The
            <span className="text-white/85"> latency</span> column shows the
            probe's wall-clock duration in milliseconds.
          </p>
          <p>
            <span className="text-white/85">Degraded</span> means the subsystem
            answered, but slowly or with a warning (e.g. gateway returned a
            5xx). Dispatches still proceed, just with tighter retry spacing.
          </p>
          <p>
            <span className="text-white/85">Unhealthy</span> means the probe
            could not reach the subsystem at all. The dispatcher
            short-circuits and parks affected runs.
          </p>
        </div>
      </Section>
    </div>
  );
}
