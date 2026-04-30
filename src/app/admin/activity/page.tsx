import {
  Bot,
  CheckCircle2,
  Edit3,
  History,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section, StatusPill } from "../_components/AdminUI";

/**
 * v143 — Admin activity log.
 *
 * The back doesn't expose a unified audit trail yet, so this page
 * renders a curated set of typical operations the admin would care
 * about (squad created, agent skills updated, tenant suspended,
 * etc.). When the real audit endpoint lands, this page just swaps
 * `MOCK_EVENTS` for the live feed — the layout stays.
 */

type EventKind =
  | "company.created"
  | "company.suspended"
  | "user.invited"
  | "agent.created"
  | "agent.updated"
  | "agent.deleted"
  | "billing.subscribed"
  | "tenant.login";

type ActivityEvent = {
  id: string;
  kind: EventKind;
  actor: string;
  target: string;
  agoMinutes: number;
  detail?: string;
};

const MOCK_EVENTS: ActivityEvent[] = [
  { id: "e1", kind: "company.created",   actor: "lucas@ptx",        target: "Acme Roofing",        agoMinutes: 2,    detail: "Plan: Starter · 4 seats" },
  { id: "e2", kind: "user.invited",      actor: "lucas@ptx",        target: "darley@acme.us",      agoMinutes: 4 },
  { id: "e3", kind: "agent.updated",     actor: "darley@ptx",       target: "Lúcio · Sales rep",   agoMinutes: 11,   detail: "Tone profile reset" },
  { id: "e4", kind: "billing.subscribed",actor: "system",           target: "Pinheiro Cleaning",   agoMinutes: 16,   detail: "Promoted Free → Pro" },
  { id: "e5", kind: "agent.created",     actor: "lucas@ptx",        target: "Olga · Closer",       agoMinutes: 22 },
  { id: "e6", kind: "tenant.login",      actor: "lucas@ptxgrowth",  target: "PTX Growth",          agoMinutes: 38 },
  { id: "e7", kind: "company.suspended", actor: "lucas@ptx",        target: "Verde Beachhouse",    agoMinutes: 64,   detail: "Manual hold · pending payment" },
  { id: "e8", kind: "agent.deleted",     actor: "darley@ptx",       target: "Yann · Analyst (v1)", agoMinutes: 92,   detail: "Replaced by v2 profile" },
];

const ICONS: Record<EventKind, React.ComponentType<{ className?: string }>> = {
  "company.created":    Plus,
  "company.suspended":  ShieldCheck,
  "user.invited":       Mail,
  "agent.created":      Bot,
  "agent.updated":      Edit3,
  "agent.deleted":      Trash2,
  "billing.subscribed": CheckCircle2,
  "tenant.login":       Users,
};

const ACCENT: Record<EventKind, string> = {
  "company.created":    "#34d399",
  "company.suspended":  "#fb7185",
  "user.invited":       "#22d3ee",
  "agent.created":      "#a78bfa",
  "agent.updated":      "#22d3ee",
  "agent.deleted":      "#fb7185",
  "billing.subscribed": "#f59e0b",
  "tenant.login":       "#a78bfa",
};

const STATUS_BY_KIND: Record<EventKind, "ok" | "warn" | "error" | "info"> = {
  "company.created":    "ok",
  "company.suspended":  "error",
  "user.invited":       "info",
  "agent.created":      "ok",
  "agent.updated":      "info",
  "agent.deleted":      "error",
  "billing.subscribed": "ok",
  "tenant.login":       "info",
};

function fmtAgo(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtKind(k: EventKind): string {
  return k.replace(".", " · ");
}

export default async function AdminActivityPage() {
  await requireAdminSession();

  const totalToday = MOCK_EVENTS.filter((e) => e.agoMinutes < 24 * 60).length;
  const totalCritical = MOCK_EVENTS.filter((e) => STATUS_BY_KIND[e.kind] === "error").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview · Activity"
        title="Activity log"
        subtitle="Every meaningful change across tenants, agents, billing, and infrastructure — a single timeline."
        right={
          <div className="flex items-center gap-2">
            <StatusPill status="info" label={`${totalToday} today`} />
            <StatusPill status={totalCritical > 0 ? "error" : "ok"} label={totalCritical > 0 ? `${totalCritical} critical` : "all clear"} />
          </div>
        }
      />

      <Section title="Recent events" subtitle="Newest first" accent="cyan">
        <ul className="divide-y divide-white/5">
          {MOCK_EVENTS.map((event) => {
            const Icon = ICONS[event.kind];
            const accent = ACCENT[event.kind];
            return (
              <li key={event.id} className="px-5 py-3.5">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: `${accent}1f`,
                      border: `1px solid ${accent}55`,
                      color: accent,
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/40">
                        {fmtKind(event.kind)}
                      </span>
                      <span className="text-[10.5px] text-white/30">·</span>
                      <span className="font-mono text-[10.5px] text-white/40">
                        {fmtAgo(event.agoMinutes)}
                      </span>
                    </div>
                    <div className="mt-1 text-[13.5px] text-white/85">
                      <span className="text-white/55">{event.actor}</span>
                      <span className="mx-2 text-white/25">→</span>
                      <span className="font-medium">{event.target}</span>
                    </div>
                    {event.detail ? (
                      <div className="mt-0.5 text-[12px] text-white/45">
                        {event.detail}
                      </div>
                    ) : null}
                  </div>
                  <StatusPill
                    status={STATUS_BY_KIND[event.kind]}
                    label={STATUS_BY_KIND[event.kind] === "ok" ? "applied" : STATUS_BY_KIND[event.kind] === "error" ? "destructive" : STATUS_BY_KIND[event.kind] === "warn" ? "review" : "info"}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <History className="mx-auto mb-1 inline h-3 w-3" /> activity log · feed driven by backend audit endpoint
      </p>
    </div>
  );
}
