import { Brain, Building2, FileText, Hash, Network } from "lucide-react";
import { fetchCompaniesPaged } from "@/lib/auth/api";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section, StatCard } from "../_components/AdminUI";
import {
  AdminCellAvatar,
  AdminCellTitle,
  AdminMonoText,
  AdminTable,
} from "../_components/AdminTable";

/**
 * v144 — Admin · Cortex.
 *
 * Per-tenant knowledge graph snapshot. The S3 vault is per-company
 * by design, so the admin view aggregates per-company stats:
 * notes, tags, links, last-updated. The numbers below are
 * representative — once we expose `/api/admin/cortex-stats` the
 * shape stays the same.
 */

type CortexStats = {
  company: string;
  notes: number;
  tags: number;
  links: number;
  lastTouchAgo: string;
  health: "fresh" | "stale" | "empty";
};

const CORTEX_BY_COMPANY: CortexStats[] = [
  { company: "PTX Growth",         notes: 142, tags: 38, links: 287, lastTouchAgo: "2m ago",  health: "fresh" },
  { company: "Aurora Spa",         notes: 76,  tags: 24, links: 142, lastTouchAgo: "1h ago",  health: "fresh" },
  { company: "Pinheiro Cleaning",  notes: 43,  tags: 12, links: 71,  lastTouchAgo: "3h ago",  health: "fresh" },
  { company: "Casa Verde",         notes: 18,  tags: 6,  links: 26,  lastTouchAgo: "6h ago",  health: "fresh" },
  { company: "Jet Auto",           notes: 9,   tags: 3,  links: 11,  lastTouchAgo: "2d ago",  health: "stale" },
  { company: "Verde Beachhouse",   notes: 0,   tags: 0,  links: 0,   lastTouchAgo: "—",       health: "empty" },
];

export default async function AdminCortexPage() {
  const session = await requireAdminSession();
  const companiesResp = await fetchCompaniesPaged(session.token!, {
    pageNumber: 1,
    pageSize: 50,
  }).catch(() => null);
  const companies = companiesResp?.result ?? [];

  const totalNotes = CORTEX_BY_COMPANY.reduce((s, x) => s + x.notes, 0);
  const totalTags  = CORTEX_BY_COMPANY.reduce((s, x) => s + x.tags,  0);
  const totalLinks = CORTEX_BY_COMPANY.reduce((s, x) => s + x.links, 0);
  const fresh = CORTEX_BY_COMPANY.filter((c) => c.health === "fresh").length;

  // Find the row with most notes for visual proportion
  const maxNotes = Math.max(1, ...CORTEX_BY_COMPANY.map((c) => c.notes));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Cortex"
        title="Knowledge graph"
        subtitle="Each tenant's S3-backed Cortex vault — notes, tags, and the wiki-link graph that ties them together."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tenants with Cortex" value={fresh} icon={Building2} accent="violet" hint={`${CORTEX_BY_COMPANY.length - fresh} stale/empty`} />
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
          rows={CORTEX_BY_COMPANY.map((c, idx) => {
            const pct = (c.notes / maxNotes) * 100;
            return {
              id: idx,
              cells: {
                company: (
                  <div className="flex items-center gap-3">
                    <AdminCellAvatar emoji="🧠" accent="#22d3ee" />
                    <AdminCellTitle
                      primary={c.company}
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
                    {c.lastTouchAgo}
                  </span>
                ),
              },
            };
          })}
          emptyHint="No tenant has a Cortex vault yet."
        />
      </Section>

      <Section title="Insight" subtitle="how to read this" accent="violet">
        <div className="space-y-3 p-5 text-[13px] leading-relaxed text-white/65">
          <p>
            <span className="text-white/85">Density</span> is each tenant's note count as a fraction
            of the largest vault. Tenants near the top of the bar are the ones using the Cortex
            heavily as their persistent memory; tenants near the bottom either haven't opened it yet
            or use it sparingly.
          </p>
          <p>
            <span className="text-white/85">Last touch</span> tells you whether the vault is being
            written to (fresh = within the last 24h, stale = older). Empty tenants are good candidates
            for a Cortex onboarding touch.
          </p>
          <p>
            Backed by the per-company S3 prefix at{" "}
            <code className="rounded bg-white/10 px-1 font-mono text-[11.5px] text-cyan-200">
              s3://orkestria-files-prod/companies/&lt;id&gt;/vault
            </code>{" "}
            (managed via{" "}
            <span className="font-mono text-[11.5px] text-violet-200">CompanyApifyConfigService</span>{" "}
            and{" "}
            <span className="font-mono text-[11.5px] text-violet-200">CompanyNotesService</span>).
          </p>
        </div>
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <Brain className="mr-1 inline h-3 w-3" />
        {companies.length} tenants known · cortex-stats endpoint coming
      </p>
    </div>
  );
}
