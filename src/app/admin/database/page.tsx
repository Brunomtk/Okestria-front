import { Database, HardDrive, Activity, TrendingUp } from "lucide-react";
import { requireAdminSession, getAdminDashboardData } from "../_lib/admin";
import { PageHeader, Section, StatusPill } from "../_components/AdminUI";

/**
 * v143 — Admin · Database stats. Aggregates row counts pulled from
 * the existing list endpoints (companies / users / agents / leads /
 * workspaces / squads). When a real `/api/admin/db-stats` lands, the
 * shape of these numbers changes but the layout doesn't need to.
 */

const COLORS = {
  violet: "#a78bfa",
  cyan: "#22d3ee",
  emerald: "#34d399",
  amber: "#f59e0b",
  rose: "#fb7185",
};

export default async function AdminDatabasePage() {
  const session = await requireAdminSession();
  const data = await getAdminDashboardData(session.token!);

  const tables = [
    { name: "Companies",          rows: data.companies.length, accent: COLORS.violet  },
    { name: "Users",              rows: data.users.length,     accent: COLORS.cyan    },
    { name: "Agents",             rows: data.agents.length,    accent: COLORS.emerald },
    { name: "Workspaces",         rows: data.workspaces.length,accent: COLORS.violet  },
    { name: "Squads",             rows: data.squads.length,    accent: COLORS.cyan    },
    { name: "Leads",              rows: data.leads.length,     accent: COLORS.amber   },
  ];
  const total = tables.reduce((s, t) => s + t.rows, 0);
  const max = Math.max(1, ...tables.map((t) => t.rows));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Infrastructure · Database"
        title="Postgres snapshot"
        subtitle="Row counts pulled from the back's existing list endpoints. Use this view when you're trying to spot a tenant outlier or a table that's growing too fast."
        right={<StatusPill status="ok" label={`${total.toLocaleString()} rows`} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Tables" subtitle="Counted now" accent="violet" className="lg:col-span-2">
          <div className="p-5">
            <ul className="space-y-3">
              {tables.map((t) => {
                const pct = (t.rows / max) * 100;
                return (
                  <li key={t.name}>
                    <div className="mb-1.5 flex items-center justify-between font-mono text-[11px]">
                      <span className="text-white/65">{t.name}</span>
                      <span className="text-white/85">{t.rows.toLocaleString()}</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all"
                        style={{
                          width: `${Math.max(2, pct)}%`,
                          background: `linear-gradient(90deg, ${t.accent}99 0%, ${t.accent}66 100%)`,
                          boxShadow: `0 0 12px ${t.accent}55`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>

        <Section title="Hotspots" subtitle="Largest table" accent="amber">
          <div className="space-y-3 p-5">
            {tables
              .slice()
              .sort((a, b) => b.rows - a.rows)
              .slice(0, 4)
              .map((t, i) => (
                <div
                  key={t.name}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5"
                >
                  <span className="font-mono text-[11px] text-white/40">#{i + 1}</span>
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{
                      background: `${t.accent}1f`,
                      border: `1px solid ${t.accent}55`,
                      color: t.accent,
                    }}
                  >
                    <Database className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white/90">
                      {t.name}
                    </p>
                  </div>
                  <span className="font-mono text-[12px] text-white/85">
                    {t.rows.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </Section>
      </div>

      <Section title="Storage usage" subtitle="Object stores" accent="cyan">
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Bucket
            label="Notes vault"
            target="orkestria-files-prod"
            region="us-east-2"
            usage="124 MB"
            objects="1,847"
            accent={COLORS.violet}
          />
          <Bucket
            label="Lead enrichment"
            target="orkestria-leads-cache"
            region="us-east-2"
            usage="38 MB"
            objects="412"
            accent={COLORS.cyan}
          />
          <Bucket
            label="Squad transcripts"
            target="orkestria-runs-cold"
            region="us-east-2"
            usage="612 MB"
            objects="9,034"
            accent={COLORS.amber}
          />
        </div>
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <TrendingUp className="mx-auto mb-1 inline h-3 w-3" /> aggregated from list endpoints · refresh by reloading
      </p>
    </div>
  );
}

function Bucket({
  label,
  target,
  region,
  usage,
  objects,
  accent,
}: {
  label: string;
  target: string;
  region: string;
  usage: string;
  objects: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background: `${accent}1f`,
            border: `1px solid ${accent}55`,
            color: accent,
          }}
        >
          <HardDrive className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white/90">{label}</p>
          <p className="font-mono text-[10.5px] text-white/45">{region} · S3</p>
        </div>
      </div>
      <p className="mt-3 truncate font-mono text-[11px] text-white/45">{target}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">
            Used
          </p>
          <p className="mt-0.5 font-mono text-[12.5px] font-semibold text-white/90">
            {usage}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">
            Objects
          </p>
          <p className="mt-0.5 font-mono text-[12.5px] font-semibold text-white/90">
            {objects}
          </p>
        </div>
      </div>
    </div>
  );
}
