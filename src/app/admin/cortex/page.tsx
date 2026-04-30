import { Brain, Building2, FileText, Hash, Network } from "lucide-react";
import { fetchAdminCortexStats, type AdminCortexStats } from "@/lib/auth/api";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section, StatCard } from "../_components/AdminUI";
import {
  AdminCellAvatar,
  AdminCellTitle,
  AdminMonoText,
  AdminTable,
} from "../_components/AdminTable";
import { safeAdminPage } from "../_lib/safe-page";

/**
 * v146 — Admin · Cortex.
 *
 * Per-tenant knowledge graph snapshot, now wired to the real
 * /api/AdminOverview/cortex/stats endpoint. The endpoint walks
 * every company's S3-backed vault and returns notes/tags/links/
 * lastTouch in one shot so the front renders without N+1 fan-out.
 */

function fmtAgo(iso?: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diffMs = Date.now() - t;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default async function AdminCortexPage() {
  return safeAdminPage("admin/cortex", renderCortexPage);
}

async function renderCortexPage() {
  const session = await requireAdminSession();
  const stats: AdminCortexStats[] = await fetchAdminCortexStats(
    session.token!,
  ).catch(() => []);

  const totalNotes = stats.reduce((s, x) => s + x.notes, 0);
  const totalTags = stats.reduce((s, x) => s + x.tags, 0);
  const totalLinks = stats.reduce((s, x) => s + x.links, 0);
  const fresh = stats.filter((c) => c.health === "fresh").length;

  // Largest vault — used to scale the density bar.
  const maxNotes = Math.max(1, ...stats.map((c) => c.notes));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Cortex"
        title="Knowledge graph"
        subtitle="Each tenant's S3-backed Cortex vault — notes, tags, and the wiki-link graph that ties them together. Live data."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tenants with Cortex"
          value={fresh}
          icon={Building2}
          accent="violet"
          hint={`${stats.length - fresh} stale/empty`}
        />
        <StatCard label="Total notes" value={totalNotes} icon={FileText} accent="cyan" />
        <StatCard label="Total tags" value={totalTags} icon={Hash} accent="amber" />
        <StatCard label="Total links" value={totalLinks} icon={Network} accent="emerald" />
      </div>

      <Section title="Cortex per tenant" subtitle="density · last touch" accent="cyan">
        <AdminTable
          columns={[
            { key: "company", header: "Tenant" },
            { key: "notes", header: "Notes", className: "w-24" },
            { key: "tags", header: "Tags", className: "w-20" },
            { key: "links", header: "Links", className: "w-20" },
            { key: "density", header: "Density", className: "w-48" },
            { key: "ago", header: "Last touch", className: "w-28" },
          ]}
          rows={stats.map((c) => {
            const pct = (c.notes / maxNotes) * 100;
            return {
              id: c.companyId,
              cells: {
                company: (
                  <div className="flex items-center gap-3">
                    <AdminCellAvatar emoji="🧠" accent="#22d3ee" />
                    <AdminCellTitle
                      primary={c.companyName}
                      secondary={
                        c.health === "fresh"
                          ? "active vault"
                          : c.health === "stale"
                            ? "needs refresh"
                            : "empty"
                      }
                    />
                  </div>
                ),
                notes: (
                  <span className="font-mono text-[13px] font-semibold text-white/90">
                    {c.notes}
                  </span>
                ),
                tags: <AdminMonoText>{c.tags}</AdminMonoText>,
                links: <AdminMonoText>{c.links}</AdminMonoText>,
                density: (
                  <div>
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${Math.max(2, pct)}%`,
                          background:
                            "linear-gradient(90deg, #22d3ee 0%, #a78bfa 60%, #f59e0b 100%)",
                          boxShadow: "0 0 8px rgba(167,139,250,0.5)",
                        }}
                      />
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-white/40">
                      {Math.round(pct)}% of largest
                    </div>
                  </div>
                ),
                ago: (
                  <span
                    className={`font-mono text-[11px] ${
                      c.health === "fresh"
                        ? "text-emerald-300"
                        : c.health === "stale"
                          ? "text-amber-300"
                          : "text-white/30"
                    }`}
                  >
                    {fmtAgo(c.lastTouchUtc)}
                  </span>
                ),
              },
            };
          })}
          emptyHint="No tenant has a Cortex vault yet."
        />
      </Section>

      <Section title="How to read this" subtitle="density + last touch" accent="violet">
        <div className="space-y-3 p-5 text-[13px] leading-relaxed text-white/65">
          <p>
            <span className="text-white/85">Density</span> is each tenant&apos;s
            note count as a fraction of the largest vault. Tenants near the top
            of the bar are the ones using the Cortex heavily as their persistent
            memory; tenants near the bottom either haven&apos;t opened it yet
            or use it sparingly.
          </p>
          <p>
            <span className="text-white/85">Last touch</span> tells you whether
            the vault is being written to (fresh = within the last 24h, stale =
            older). Empty tenants are good candidates for a Cortex onboarding
            touch.
          </p>
          <p>
            Backed by the per-company S3 prefix at{" "}
            <code className="rounded bg-white/10 px-1 font-mono text-[11.5px] text-cyan-200">
              s3://orkestria-files-prod/companies/&lt;id&gt;/vaults/default
            </code>{" "}
            (managed via{" "}
            <span className="font-mono text-[11.5px] text-violet-200">
              CompanyNotesService
            </span>
            ).
          </p>
        </div>
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <Brain className="mr-1 inline h-3 w-3" />
        live · {stats.length} tenant{stats.length === 1 ? "" : "s"} scanned
      </p>
    </div>
  );
}
