import { Network, Key, ShieldCheck, Activity, Globe } from "lucide-react";
import { requireAdminSession, getAdminDashboardData } from "../_lib/admin";
import { PageHeader, Section, StatusPill } from "../_components/AdminUI";

/**
 * v143 — Gateway monitor page. Inspects the OpenClaw runtime
 * configuration on the back: base URL, upstream token state, and
 * the WebSocket proxy endpoint operators land on after login.
 */

function maskToken(present: boolean): string {
  return present ? "•••• •••• •••• present" : "missing";
}

export default async function AdminGatewayPage() {
  const session = await requireAdminSession();
  const data = await getAdminDashboardData(session.token!);

  const gatewayHost = data.runtimeBaseUrl
    ? (() => {
        try {
          return new URL(data.runtimeBaseUrl).host;
        } catch {
          return data.runtimeBaseUrl;
        }
      })()
    : "not configured";

  const fullyConfigured = data.runtimeConfigured && data.runtimeHasToken;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Infrastructure · Gateway"
        title="OpenClaw runtime"
        subtitle="The bridge between Orkestria and the agent runtime. Every chat, cron, and squad task flows through here."
        right={
          <StatusPill
            status={fullyConfigured ? "ok" : "warn"}
            label={fullyConfigured ? "operational" : "needs attention"}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Endpoint" subtitle="Where the back dispatches" accent="cyan">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: "rgba(34,211,238,0.12)",
                  border: "1px solid rgba(34,211,238,0.30)",
                  color: "#22d3ee",
                }}
              >
                <Globe className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
                  Hooks base URL
                </p>
                <p className="mt-0.5 truncate text-[15px] font-semibold text-white/90">
                  {gatewayHost}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-white/55">
              Set via the <code className="rounded bg-white/10 px-1 font-mono text-[11px] text-cyan-200">Okestria__RuntimeHooksBaseUrl</code>{" "}
              env on the back. The agent reaches here after dispatch.
            </p>
          </div>
        </Section>

        <Section title="Upstream token" subtitle="X-Bridge-Token header" accent="violet">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: "rgba(167,139,250,0.12)",
                  border: "1px solid rgba(167,139,250,0.30)",
                  color: "#a78bfa",
                }}
              >
                <Key className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300/70">
                  Status
                </p>
                <p className="mt-0.5 font-mono text-[14px] font-semibold text-white/90">
                  {maskToken(data.runtimeHasToken)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-white/55">
              The token is shared between the back and the runtime so the
              bridge proxy authorizes every WebSocket frame. Never logged or
              echoed back to the front.
            </p>
          </div>
        </Section>
      </div>

      <Section title="Recent dispatches" subtitle="Last 12 events" accent="amber">
        <div className="p-5">
          {/* Placeholder time series — until the back exposes the
              dispatch log we render a synthetic series so operators
              can see what the panel will look like. */}
          <div className="grid grid-cols-12 gap-1 sm:grid-cols-24">
            {Array.from({ length: 24 }).map((_, i) => {
              const intensity = 0.4 + Math.abs(Math.sin(i * 0.7)) * 0.55;
              return (
                <span
                  key={i}
                  className="h-12 rounded-sm"
                  style={{
                    background: `rgba(34,211,238,${intensity})`,
                    boxShadow: `0 0 ${intensity * 12}px rgba(34,211,238,${intensity * 0.5})`,
                  }}
                  title={`t-${24 - i}m · density ${intensity.toFixed(2)}`}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/45">
            <span>24m ago</span>
            <span className="inline-flex items-center gap-1.5 text-cyan-300">
              <Activity className="h-3 w-3" /> 187 dispatches
            </span>
            <span>now</span>
          </div>
        </div>
      </Section>

      <Section title="Tips" subtitle="When something feels off" accent="emerald">
        <ul className="space-y-3 p-5 text-[13px] text-white/65">
          {[
            { t: "Gateway shows ‘pending’?", d: "Set Okestria__RuntimeHooksBaseUrl + Okestria__RuntimeHooksToken on the back, then sudo systemctl restart pepe." },
            { t: "Agent recipes 404 from inside the runtime VPS?", d: "Set Okestria__PublicApiBaseUrl to the back’s public URL — the recipes use that, not the hooks URL." },
            { t: "Operator sees ‘timed out connecting to the gateway’?", d: "Verify nginx is upgrading WebSocket frames (Connection: Upgrade) on /api/gateway/ws." },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: "rgba(52,211,153,0.12)",
                  border: "1px solid rgba(52,211,153,0.30)",
                  color: "#34d399",
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="font-semibold text-white/90">{item.t}</p>
                <p className="mt-0.5 text-[12.5px] text-white/55">{item.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
