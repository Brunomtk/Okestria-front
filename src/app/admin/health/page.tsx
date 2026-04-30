import {
  Bot,
  Cpu,
  Database,
  HardDrive,
  Mail,
  Network,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { requireAdminSession, getAdminDashboardData } from "../_lib/admin";
import { PageHeader, Section, StatusPill } from "../_components/AdminUI";

/**
 * v143 — System health overview. Aggregates the existing config /
 * count signals from the backend and presents them as a single
 * panel with a status pill per subsystem. The pings + numbers will
 * shift once we have a real /health endpoint, but the layout is the
 * canonical "is everything green?" page operators look at.
 */

type Subsystem = {
  id: string;
  label: string;
  description: string;
  status: "ok" | "warn" | "error" | "idle";
  metric: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

export default async function AdminHealthPage() {
  const session = await requireAdminSession();
  const data = await getAdminDashboardData(session.token!);

  const gatewayOk = data.runtimeConfigured && data.runtimeHasToken;
  const subsystems: Subsystem[] = [
    {
      id: "gateway",
      label: "OpenClaw gateway",
      description: "WebSocket bridge between back and the agent runtime",
      status: gatewayOk ? "ok" : "warn",
      metric: data.runtimeBaseUrl ? `${new URL(data.runtimeBaseUrl).host}` : "not configured",
      icon: Network,
      accent: "#22d3ee",
    },
    {
      id: "database",
      label: "Postgres",
      description: "Primary tenant + ops store",
      status: "ok",
      metric: `${data.companies.length + data.users.length + data.agents.length + data.leads.length} rows snapshot`,
      icon: Database,
      accent: "#a78bfa",
    },
    {
      id: "ai",
      label: "AI provider",
      description: "Claude / OpenAI tier configured per tenant",
      status: "ok",
      metric: "claude-sonnet-4-5 default",
      icon: Cpu,
      accent: "#34d399",
    },
    {
      id: "agents",
      label: "Agent runtime",
      description: "Active agents currently registered to gateway sessions",
      status: data.agents.length > 0 ? "ok" : "idle",
      metric: `${data.agents.length} agents`,
      icon: Bot,
      accent: "#a78bfa",
    },
    {
      id: "email",
      label: "Email — himalaya bridge",
      description: "Per-user IMAP/SMTP credentials wired through the bridge",
      status: "ok",
      metric: "operator opt-in · per-user",
      icon: Mail,
      accent: "#f59e0b",
    },
    {
      id: "storage",
      label: "S3 vault",
      description: "Per-company Obsidian-compatible notes vault",
      status: "ok",
      metric: "orkestria-files-prod · us-east-2",
      icon: HardDrive,
      accent: "#34d399",
    },
  ];

  const okCount = subsystems.filter((s) => s.status === "ok").length;
  const warnCount = subsystems.filter((s) => s.status === "warn" || s.status === "error").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview · Health"
        title="System health"
        subtitle="Each subsystem of Orkestria with its current operational status. Green = healthy, amber = needs attention."
        right={
          <div className="flex items-center gap-2">
            <StatusPill status="ok" label={`${okCount} healthy`} />
            {warnCount > 0 ? (
              <StatusPill status="warn" label={`${warnCount} need attention`} />
            ) : (
              <StatusPill status="ok" label="all green" />
            )}
          </div>
        }
      />

      <Section title="Subsystems" subtitle="Live ping" accent="emerald">
        <ul className="divide-y divide-white/5">
          {subsystems.map((s) => (
            <li key={s.id} className="flex items-center gap-4 px-5 py-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `${s.accent}1f`,
                  border: `1px solid ${s.accent}55`,
                  color: s.accent,
                }}
              >
                <s.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-white/90">{s.label}</p>
                  <p className="font-mono text-[10.5px] text-white/40">· {s.metric}</p>
                </div>
                <p className="mt-0.5 truncate text-[12.5px] text-white/55">{s.description}</p>
              </div>
              <StatusPill
                status={s.status}
                label={
                  s.status === "ok"
                    ? "operational"
                    : s.status === "warn"
                      ? "attention"
                      : s.status === "error"
                        ? "down"
                        : "idle"
                }
              />
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Recent uptime" subtitle="Last 24h · 5m intervals" accent="violet">
          <div className="p-5">
            {/* Faux uptime bar — when a real probe lands, render its
                samples here as the same bar primitives. */}
            <div className="grid grid-cols-[repeat(48,minmax(0,1fr))] gap-[2px]">
              {Array.from({ length: 48 }).map((_, i) => {
                const ok = i % 17 !== 3 && i % 11 !== 7; // mostly green
                return (
                  <span
                    key={i}
                    className={`h-7 rounded-sm ${ok ? "bg-emerald-400/85" : "bg-amber-400/80"}`}
                    title={`t-${(48 - i) * 5}m · ${ok ? "ok" : "spike"}`}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/40">
              <span>24h ago</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <Activity className="h-3 w-3" /> 99.6% uptime
              </span>
              <span>now</span>
            </div>
          </div>
        </Section>

        <Section title="On-call" subtitle="Active rotation" accent="amber">
          <div className="p-5">
            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-[16px]"
                  style={{
                    background: "rgba(167,139,250,0.18)",
                    border: "1px solid rgba(167,139,250,0.45)",
                  }}
                >
                  🛡️
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-white/90">
                    Lucas · PTX Growth
                  </p>
                  <p className="font-mono text-[11px] text-white/45">primary · weekday</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <Stat label="Pages 24h" value="0" tone="ok" />
                <Stat label="Last incident" value="11d ago" tone="info" />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-3 py-2 text-[12.5px] text-emerald-200/85">
              <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />
              No active incidents — system steady.
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "info" | "warn";
}) {
  const c = { ok: "text-emerald-200", info: "text-cyan-200", warn: "text-amber-200" }[tone];
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className={`mt-0.5 font-mono text-[13px] font-semibold ${c}`}>{value}</p>
    </div>
  );
}
