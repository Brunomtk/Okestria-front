import {
  Brain,
  Cpu,
  HardDrive,
  Instagram,
  Mail,
  MessageSquare,
  Network,
  Search,
  Sparkles,
} from "lucide-react";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section, StatusPill } from "../_components/AdminUI";

/**
 * v143 — Admin · Integrations.
 *
 * Single canonical view of every external system Orkestria reaches
 * out to. Each row says what the integration does, who in the
 * company can wire it, and whether it's globally configured (env)
 * vs per-tenant or per-user (operator-managed via the Tools modal).
 */

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  scope: "global" | "company" | "user";
  status: "ok" | "warn" | "idle";
  hint: string;
  accent: string;
};

const INTEGRATIONS: Integration[] = [
  {
    id: "claude",
    name: "Anthropic · Claude",
    description: "Default LLM provider for all agent runs.",
    icon: Sparkles,
    scope: "global",
    status: "ok",
    hint: "claude-sonnet-4-5 · API_VERSION 2023-06-01",
    accent: "#a78bfa",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Optional fallback for tasks pinned to a GPT model.",
    icon: Cpu,
    scope: "global",
    status: "idle",
    hint: "off · enable per-agent in profile",
    accent: "#34d399",
  },
  {
    id: "openclaw",
    name: "OpenClaw runtime",
    description: "Bridge that hosts the agent processes themselves.",
    icon: Network,
    scope: "global",
    status: "ok",
    hint: "wss://… · X-Bridge-Token rotated",
    accent: "#22d3ee",
  },
  {
    id: "s3-vault",
    name: "AWS S3 — notes vault",
    description: "Per-company markdown vault for the Cortex view.",
    icon: HardDrive,
    scope: "company",
    status: "ok",
    hint: "orkestria-files-prod · us-east-2",
    accent: "#a78bfa",
  },
  {
    id: "apify",
    name: "Apify · Instagram scraper",
    description: "Per-company token for third-party IG reads.",
    icon: Search,
    scope: "company",
    status: "ok",
    hint: "actor: apify/instagram-scraper · STARTER plan",
    accent: "#f59e0b",
  },
  {
    id: "meta",
    name: "Meta · Graph API",
    description: "Operator's Instagram + Facebook + WhatsApp.",
    icon: Instagram,
    scope: "user",
    status: "ok",
    hint: "long-lived token · 60d expiry",
    accent: "#fb7185",
  },
  {
    id: "email-himalaya",
    name: "Himalaya · per-user email",
    description: "IMAP / SMTP credentials wired through the bridge.",
    icon: Mail,
    scope: "user",
    status: "ok",
    hint: "credential file mode 600 · gateway VPS",
    accent: "#22d3ee",
  },
  {
    id: "resend",
    name: "Resend · transactional",
    description: "Outbound transactional notifications.",
    icon: MessageSquare,
    scope: "global",
    status: "idle",
    hint: "off · enable in pepe.service",
    accent: "#34d399",
  },
  {
    id: "cortex",
    name: "Cortex · knowledge graph",
    description: "Internal — wraps S3 vault + parses wiki-links / tags.",
    icon: Brain,
    scope: "global",
    status: "ok",
    hint: "v78 · graph endpoint live",
    accent: "#a78bfa",
  },
];

const SCOPE_LABEL: Record<Integration["scope"], string> = {
  global: "Global",
  company: "Per company",
  user: "Per user",
};

const STATUS_LABEL: Record<Integration["status"], string> = {
  ok: "connected",
  warn: "attention",
  idle: "off",
};

export default async function AdminIntegrationsPage() {
  await requireAdminSession();
  const okCount = INTEGRATIONS.filter((i) => i.status === "ok").length;
  const idleCount = INTEGRATIONS.filter((i) => i.status === "idle").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Infrastructure · Integrations"
        title="External services"
        subtitle="Every third-party system Orkestria connects to, classified by scope (global / company / user) and current state."
        right={
          <div className="flex items-center gap-2">
            <StatusPill status="ok" label={`${okCount} connected`} />
            <StatusPill status="idle" label={`${idleCount} off`} />
          </div>
        }
      />

      <Section title="Connections" subtitle={`${INTEGRATIONS.length} services`} accent="amber">
        <ul className="divide-y divide-white/5">
          {INTEGRATIONS.map((it) => (
            <li key={it.id} className="flex items-center gap-4 px-5 py-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `${it.accent}1f`,
                  border: `1px solid ${it.accent}55`,
                  color: it.accent,
                }}
              >
                <it.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className="text-[14px] font-semibold text-white/90">{it.name}</p>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/55">
                    {SCOPE_LABEL[it.scope]}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[12.5px] text-white/55">
                  {it.description}
                </p>
                <p className="mt-1 truncate font-mono text-[10.5px] text-white/35">
                  {it.hint}
                </p>
              </div>
              <StatusPill status={it.status} label={STATUS_LABEL[it.status]} />
            </li>
          ))}
        </ul>
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        Per-tenant configuration lives under company / user · operators wire their own keys via the in-product Tools modal.
      </p>
    </div>
  );
}
