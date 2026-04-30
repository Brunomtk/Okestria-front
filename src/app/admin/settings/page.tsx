import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Database,
  Globe,
  Key,
  Link2,
  Palette,
  Server,
  Settings as SettingsIcon,
  Shield,
} from "lucide-react";
import {
  fetchGatewaySettings,
  fetchRuntimeConfigStatus,
  getOkestriaApiBaseUrl,
} from "@/lib/auth/api";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section, StatCard, StatusPill } from "../_components/AdminUI";

/**
 * v145 — Admin · Settings.
 *
 * Reads runtime config from the back, then renders a calm two-column
 * grid of "facts" instead of fake editable inputs (the back doesn't
 * yet expose a settings PUT endpoint, so the read-only treatment is
 * the honest one). Every word is in English, all visuals match the
 * dark cosmic admin look.
 */

function maskTokenPreview(token: string | undefined) {
  if (!token) return "Not available";
  if (token.length <= 10) return token;
  return `${token.slice(0, 6)}••••${token.slice(-4)}`;
}

export default async function AdminSettingsPage() {
  const session = await requireAdminSession();
  const [runtimeStatus, gatewaySettings] = await Promise.all([
    fetchRuntimeConfigStatus(session.token!).catch(() => null),
    fetchGatewaySettings(session.token!).catch(() => null),
  ]);

  const apiUrl = getOkestriaApiBaseUrl();
  const gatewayConfigured =
    gatewaySettings?.configured === true || runtimeStatus?.configured === true;
  const gatewayBaseUrl =
    gatewaySettings?.baseUrl ?? runtimeStatus?.baseUrl ?? "";
  const hasGatewayToken =
    gatewaySettings?.hasUpstreamToken === true ||
    runtimeStatus?.hasUpstreamToken === true;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        subtitle="Read-only snapshot of the live runtime configuration. A proper settings endpoint is on the back-end roadmap."
      />

      {/* Top status row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Gateway"
          value={gatewayConfigured ? "Configured" : "Pending"}
          icon={gatewayConfigured ? CheckCircle2 : AlertCircle}
          accent={gatewayConfigured ? "emerald" : "amber"}
          hint={gatewayConfigured ? "ready" : "needs setup"}
        />
        <StatCard
          label="API base"
          value={apiUrl.replace(/^https?:\/\//, "")}
          icon={Server}
          accent="cyan"
          hint="from env"
        />
        <StatCard
          label="Upstream token"
          value={hasGatewayToken ? "Present" : "Missing"}
          icon={Key}
          accent={hasGatewayToken ? "violet" : "rose"}
        />
      </div>

      {/* General + appearance */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="General"
          subtitle="Runtime references"
          accent="violet"
          right={<Globe className="h-4 w-4 text-violet-300/70" />}
        >
          <div className="space-y-4 p-5">
            <FactRow label="Platform name" value="Orkestria" />
            <FactRow label="Default language" value="en-US" />
            <FactRow
              label="Current session"
              value={`${session.fullName ?? "Administrator"}${
                session.email ? ` · ${session.email}` : ""
              }`}
            />
            <ToggleRow
              label="Admin mode"
              description="This panel is wired to live back-end data."
              checked
            />
          </div>
        </Section>

        <Section
          title="Appearance"
          subtitle="Visual preferences"
          accent="cyan"
          right={<Palette className="h-4 w-4 text-cyan-300/70" />}
        >
          <div className="space-y-4 p-5">
            <ToggleRow
              label="Fixed left sidebar"
              description="Module-grouped navigation across the whole admin."
              checked
            />
            <ToggleRow
              label="Dark theme"
              description="Cosmic palette to match the rest of the product."
              checked
            />
            <ToggleRow
              label="Reduced motion"
              description="Coming with the next round of accessibility work."
            />
          </div>
        </Section>
      </div>

      {/* API + connectivity */}
      <Section
        title="API & gateway"
        subtitle="Live configuration from the back-end"
        accent="amber"
        right={<Server className="h-4 w-4 text-amber-300/70" />}
      >
        <div className="grid gap-5 p-5 xl:grid-cols-2">
          <div className="space-y-4">
            <FactRow label="API base URL" value={apiUrl} mono />
            <FactRow
              label="Gateway base URL"
              value={gatewayBaseUrl || "Not configured"}
              mono
            />
            <FactRow
              label="Upstream token"
              value={maskTokenPreview(gatewaySettings?.upstreamToken)}
              mono
            />
          </div>
          <div className="space-y-4">
            <ToggleRow
              label="Runtime configured"
              description="From /api/Runtime/config-status"
              checked={gatewayConfigured}
            />
            <ToggleRow
              label="Token present"
              description="As reported by /api/Admin/Gateway/settings"
              checked={hasGatewayToken}
            />
            <div
              className={`flex items-center gap-3 rounded-xl border p-4 ${
                gatewayConfigured
                  ? "border-emerald-400/25 bg-emerald-500/[0.06]"
                  : "border-amber-400/30 bg-amber-500/[0.06]"
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  gatewayConfigured
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "bg-amber-500/15 text-amber-200"
                }`}
              >
                <Link2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-white/85">
                  {gatewayConfigured ? "Gateway configured" : "Gateway pending"}
                </p>
                <p className="truncate text-[11.5px] text-white/55">
                  {gatewayBaseUrl ||
                    "Set the URL and token on the back-end to finish the wiring."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Security + notifications */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Authentication"
          subtitle="Reference values for the current session"
          accent="violet"
          right={<Shield className="h-4 w-4 text-violet-300/70" />}
        >
          <div className="space-y-4 p-5">
            <ToggleRow
              label="Authenticated session"
              description="Validated by the admin guard."
              checked
            />
            <ToggleRow
              label="Back-end token"
              description="Required to query every admin module."
              checked
            />
            <FactRow
              label="Current role"
              value={
                session.role ?? (session.roleType === 1 ? "admin" : "user")
              }
            />
            <ToggleRow
              label="2FA for admins"
              description="Placeholder — the back-end doesn't yet expose this endpoint."
            />
          </div>
        </Section>

        <Section
          title="Notifications"
          subtitle="Visual placeholders waiting for endpoints"
          accent="cyan"
          right={<Bell className="h-4 w-4 text-cyan-300/70" />}
        >
          <div className="space-y-4 p-5">
            <ToggleRow
              label="Error alerts"
              description="Will fire on operator-touching failures."
              checked
            />
            <ToggleRow
              label="Billing events"
              description="Wires to /api/Billing webhooks once the channel is live."
            />
            <ToggleRow
              label="Weekly digest"
              description="Per-tenant Friday recap of operations."
            />
          </div>
        </Section>
      </div>

      {/* Footer hint */}
      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <SettingsIcon className="mr-1 inline h-3 w-3" />
        Editable settings will land with /api/Admin/Settings
      </p>
    </div>
  );
}

/* -- helpers ---------------------------------------------------------- */

function FactRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
        {label}
      </p>
      <p
        className={`break-all rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-[12.5px] text-white/90 ${
          mono ? "font-mono text-cyan-100/85" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked = false,
}: {
  label: string;
  description?: string;
  checked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white/85">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[11.5px] leading-snug text-white/45">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">
        <StatusPill
          status={checked ? "ok" : "idle"}
          label={checked ? "on" : "off"}
        />
      </div>
    </div>
  );
}
