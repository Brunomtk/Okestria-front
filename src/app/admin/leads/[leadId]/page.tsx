import {
  AtSign,
  Bot,
  Building2,
  Clock,
  ExternalLink,
  FileCode2,
  Globe,
  Hash,
  Lightbulb,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Sparkles,
  Star,
  Tag,
  Target,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchCompaniesPaged, fetchLeadById } from "@/lib/auth/api";
import { generateLeadInsightsAction } from "../../_actions";
import { requireAdminSession } from "../../_lib/admin";
import { Section, StatCard, StatusPill } from "../../_components/AdminUI";
import {
  DetailActionLink,
  DetailFact,
  DetailHeader,
  DetailLinkRow,
  DetailTagPill,
} from "../../_components/AdminDetail";
import { safeAdminPage } from "../../_lib/safe-page";
import { AdminChatMessage } from "../../cron/[cronId]/_components/AdminChatMessage";

/**
 * v151 — Admin · Lead detail (rich edition).
 *
 * Renders every field LeadDTO actually carries — owner, location,
 * business profile, AI-generated insights (PTX fit, suggested
 * product, outreach insight, outreach script, outreach email HTML),
 * notes, social links, source metadata, scraping timestamp.
 * Markdown blocks are rendered with the same chat component the
 * cron page uses.
 */

type Pill = "ok" | "warn" | "info" | "error" | "idle";
type PillVariant = "outline" | "violet" | "cyan" | "amber" | "emerald" | "rose";

function statusPill(status?: string | null): { variant: PillVariant; label: string } {
  const v = (status ?? "").toLowerCase();
  if (v === "lost") return { variant: "rose", label: "lost" };
  if (v === "qualified") return { variant: "emerald", label: "qualified" };
  if (v === "contacted") return { variant: "cyan", label: "contacted" };
  if (v === "new") return { variant: "violet", label: "new" };
  return { variant: "outline", label: v || "no status" };
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US");
}

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

function buildAddress(lead: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const parts = [
    lead.address,
    [lead.city, lead.state].filter(Boolean).join(", "),
    lead.zip,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  return parts.join(" · ") || "—";
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  return safeAdminPage("admin/leads/[id]", () => render(params));
}

async function render(params: Promise<{ leadId: string }>) {
  const { leadId } = await params;
  const id = Number(leadId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [lead, companiesResp] = await Promise.all([
    fetchLeadById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!lead) notFound();

  const companyName = lead.companyId
    ? (companiesResp?.result ?? []).find((c) => c.id === lead.companyId)?.name ??
      `Company #${lead.companyId}`
    : "—";
  const ownerName = [lead.ownerFirstName, lead.ownerLastName]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const displayContact =
    (lead.contactName && lead.contactName.trim()) || ownerName || "—";
  const status = statusPill(lead.status);
  const allEmails = [
    lead.email,
    ...(Array.isArray(lead.emails) ? lead.emails : []),
  ]
    .map((s) => (s ?? "").trim())
    .filter((s): s is string => Boolean(s));
  const distinctEmails = Array.from(new Set(allEmails));
  const social = (lead.socialLinks ?? []).filter(
    (s) => (s ?? "").trim() !== "",
  );
  const address = buildAddress(lead);

  const insightStatusPill: { pill: Pill; label: string } = (() => {
    const s = (lead.insightsGenerationStatus ?? "").toLowerCase();
    if (s === "succeeded" || s === "ok") return { pill: "ok", label: "ok" };
    if (s === "fallback" || lead.insightsUsedFallback)
      return { pill: "warn", label: "fallback" };
    if (s === "failed" || s === "error") return { pill: "error", label: "failed" };
    if (lead.insightsGeneratedWithAi) return { pill: "info", label: "ai" };
    return { pill: "idle", label: s || "—" };
  })();

  return (
    <div className="space-y-8">
      <DetailHeader
        backHref="/admin/leads"
        backLabel="Back to leads"
        eyebrow={`Lead · #${lead.id}`}
        title={lead.businessName ?? displayContact ?? `Lead #${lead.id}`}
        subtitle={
          [lead.category, address !== "—" ? address : null]
            .filter(Boolean)
            .join(" · ") || "Lead record"
        }
        pills={
          <>
            <DetailTagPill variant={status.variant}>{status.label}</DetailTagPill>
            <DetailTagPill>ID #{lead.id}</DetailTagPill>
            {lead.lastJobId ? (
              <DetailTagPill variant="violet">job #{lead.lastJobId}</DetailTagPill>
            ) : null}
            {lead.ptxFit ? (
              <DetailTagPill variant="emerald">{lead.ptxFit}</DetailTagPill>
            ) : null}
            {lead.suggestedProduct ? (
              <DetailTagPill variant="cyan">{lead.suggestedProduct}</DetailTagPill>
            ) : null}
            {lead.source ? (
              <DetailTagPill>{lead.source}</DetailTagPill>
            ) : null}
          </>
        }
        actions={
          <>
            <DetailActionLink
              href={`/admin/leads/${lead.id}/edit`}
              accent="violet"
            >
              Edit
            </DetailActionLink>
            <form action={generateLeadInsightsAction}>
              <input type="hidden" name="leadId" value={lead.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={`/admin/leads/${lead.id}`}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3.5 py-2 text-[12.5px] font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Regenerate insights
              </button>
            </form>
          </>
        }
      />

      {/* ── Quick stats ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Rating"
          value={lead.rating != null ? lead.rating.toFixed(1) : "—"}
          icon={Star}
          accent="amber"
          hint={
            lead.reviewCount != null
              ? `${lead.reviewCount} review${lead.reviewCount === 1 ? "" : "s"}`
              : "no reviews"
          }
        />
        <StatCard
          label="Contacts"
          value={distinctEmails.length}
          icon={Mail}
          accent="cyan"
          hint={lead.phone ? "+ phone" : "no phone"}
        />
        <StatCard
          label="Social links"
          value={social.length}
          icon={Hash}
          accent="violet"
        />
        <StatCard
          label="Insights"
          value={insightStatusPill.label}
          icon={Sparkles}
          accent={
            insightStatusPill.pill === "ok"
              ? "emerald"
              : insightStatusPill.pill === "error"
                ? "rose"
                : "amber"
          }
          hint={lead.insightsWarningCode ?? undefined}
        />
      </div>

      {/* ── Identity + business profile ───────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Lead identity"
          subtitle="primary record"
          accent="amber"
          right={<Target className="h-4 w-4 text-amber-300/70" />}
        >
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <DetailFact
              label="Business"
              value={lead.businessName ?? "—"}
              icon={Building2}
              span={2}
            />
            <DetailFact
              label="Contact"
              value={displayContact}
              icon={UserRound}
            />
            <DetailFact label="Tenant" value={companyName} icon={Building2} />
            <DetailFact
              label="Email"
              value={lead.email ?? "—"}
              icon={Mail}
              mono
            />
            <DetailFact
              label="Phone"
              value={lead.phone ?? "—"}
              icon={Phone}
              mono
            />
            <DetailFact
              label="Address"
              value={address}
              icon={MapPin}
              span={2}
            />
            <DetailFact
              label="Category"
              value={lead.category ?? "—"}
              icon={Tag}
            />
            <DetailFact
              label="Website"
              value={lead.website ?? "—"}
              icon={Globe}
              mono
            />
          </div>
        </Section>

        <Section
          title="Business profile"
          subtitle="how the world sees them"
          accent="violet"
          right={<Star className="h-4 w-4 text-violet-300/70" />}
        >
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <DetailFact
              label="Rating"
              value={
                lead.rating != null
                  ? `★ ${lead.rating.toFixed(1)}`
                  : "—"
              }
            />
            <DetailFact
              label="Review count"
              value={lead.reviewCount != null ? String(lead.reviewCount) : "—"}
              mono
            />
            <DetailFact
              label="Hours of operation"
              value={lead.hoursOfOperation ?? "—"}
              span={2}
            />
            <DetailFact
              label="Description"
              value={lead.description ?? "No description on file."}
              span={2}
            />
          </div>
        </Section>
      </div>

      {/* ── Extra emails + social links ───────────────────────── */}
      {distinctEmails.length > 1 || social.length > 0 ? (
        <Section
          title="Extra contact"
          subtitle="all emails + social profiles"
          accent="cyan"
          right={<AtSign className="h-4 w-4 text-cyan-300/70" />}
        >
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
                All emails ({distinctEmails.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {distinctEmails.map((em) => (
                  <li key={em}>
                    <a
                      href={`mailto:${em}`}
                      className="inline-flex items-center gap-1.5 break-all rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[11.5px] text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-500/[0.08]"
                    >
                      <Mail className="h-3 w-3" />
                      {em}
                    </a>
                  </li>
                ))}
                {distinctEmails.length === 0 ? (
                  <li className="text-[12px] text-white/40">No emails on file.</li>
                ) : null}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
                Social links ({social.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {social.map((url, idx) => (
                  <li key={`${url}-${idx}`}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 break-all rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[11.5px] text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-500/[0.08]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {url}
                    </a>
                  </li>
                ))}
                {social.length === 0 ? (
                  <li className="text-[12px] text-white/40">No social links.</li>
                ) : null}
              </ul>
            </div>
          </div>
        </Section>
      ) : null}

      {/* ── PTX insights ──────────────────────────────────────── */}
      <Section
        title="PTX insights"
        subtitle="why this lead matters · how to talk to them"
        accent="emerald"
        right={
          <div className="flex items-center gap-2">
            <StatusPill
              status={insightStatusPill.pill}
              label={insightStatusPill.label}
            />
            {lead.insightsGeneratedWithAi ? (
              <DetailTagPill variant="cyan">ai-generated</DetailTagPill>
            ) : null}
          </div>
        }
      >
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <InsightCard
            label="PTX fit"
            value={lead.ptxFit}
            icon={Lightbulb}
            accent="#34d399"
          />
          <InsightCard
            label="Suggested product"
            value={lead.suggestedProduct}
            icon={Package}
            accent="#a78bfa"
          />
        </div>

        <div className="space-y-3 px-5 pb-5">
          <MarkdownBlock
            label="Outreach insight"
            value={lead.outreachInsight}
            icon={Sparkles}
          />
          <MarkdownBlock
            label="Outreach script"
            value={lead.outreachScript}
            icon={MessageCircle}
          />
        </div>

        {lead.insightsWarningMessage ? (
          <div className="mx-5 mb-5 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-3">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-amber-200/80">
              insight warning · {lead.insightsWarningCode ?? "warn"}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-white/65">
              {lead.insightsWarningMessage}
            </p>
          </div>
        ) : null}
      </Section>

      {/* ── Outreach email preview ─────────────────────────────── */}
      {lead.outreachEmailHtml?.trim() ? (
        <Section
          title="Outreach email"
          subtitle="rendered preview of the HTML body"
          accent="amber"
          right={<FileCode2 className="h-4 w-4 text-amber-300/70" />}
        >
          <div className="space-y-3 p-5">
            <div
              className="overflow-hidden rounded-2xl border border-white/10 bg-white"
              style={{ colorScheme: "light" }}
            >
              <iframe
                srcDoc={lead.outreachEmailHtml}
                title={`Outreach email for ${lead.businessName ?? "lead"}`}
                sandbox=""
                className="block h-[520px] w-full border-0"
              />
            </div>
            <details className="rounded-xl border border-white/10 bg-black/25 p-3">
              <summary className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
                View raw HTML ({lead.outreachEmailHtml.length} chars)
              </summary>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/8 bg-black/40 p-3 font-mono text-[10.5px] leading-relaxed text-white/65">
                {lead.outreachEmailHtml}
              </pre>
            </details>
          </div>
        </Section>
      ) : null}

      {/* ── Notes ─────────────────────────────────────────────── */}
      {lead.notes?.trim() ? (
        <Section
          title="Notes"
          subtitle="operator scratchpad"
          accent="cyan"
          right={<MessageCircle className="h-4 w-4 text-cyan-300/70" />}
        >
          <div className="space-y-2 p-5">
            <AdminChatMessage content={lead.notes} />
          </div>
        </Section>
      ) : null}

      {/* ── Source / scrape metadata ───────────────────────────── */}
      <Section
        title="Source"
        subtitle="where this lead came from"
        accent="violet"
        right={<Bot className="h-4 w-4 text-violet-300/70" />}
      >
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <DetailFact label="Source" value={lead.source ?? "—"} icon={Bot} />
          <DetailFact
            label="Scraped at"
            value={fmtDate(lead.scrapedAtUtc)}
            icon={Clock}
            mono
          />
          <DetailFact
            label="Created"
            value={fmtAgo(lead.createdDate)}
            icon={Clock}
            mono
          />
          <DetailFact
            label="Updated"
            value={fmtAgo(lead.updatedDate)}
            icon={Clock}
            mono
          />
        </div>

        {lead.sourceMetadata && Object.keys(lead.sourceMetadata).length > 0 ? (
          <div className="mx-5 mb-5 rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
              Source metadata
            </p>
            <dl className="mt-2 grid gap-2 text-[12px] sm:grid-cols-2">
              {Object.entries(lead.sourceMetadata).map(([k, v]) => (
                <div
                  key={k}
                  className="flex flex-col rounded-lg border border-white/8 bg-black/30 p-2.5"
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                    {k}
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-[11.5px] text-white/85">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </Section>

      {/* ── Quick links ────────────────────────────────────────── */}
      <Section title="Quick links" accent="violet">
        <div className="space-y-2 p-5">
          {lead.companyId ? (
            <DetailLinkRow
              href={`/admin/companies/${lead.companyId}`}
              icon={Building2}
            >
              Open linked tenant — {companyName}
            </DetailLinkRow>
          ) : null}
          <DetailLinkRow
            href={`/admin/leads?q=${encodeURIComponent(
              lead.businessName ?? displayContact ?? "",
            )}`}
            icon={Target}
          >
            Find similar leads
          </DetailLinkRow>
          {lead.lastJobId ? (
            <DetailLinkRow
              href={`/admin/missions?q=${lead.lastJobId}`}
              icon={Sparkles}
            >
              View related mission · job #{lead.lastJobId}
            </DetailLinkRow>
          ) : null}
          {lead.website ? (
            <Link
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span className="flex items-center gap-2 text-[12.5px] text-white/75">
                <Globe className="h-3.5 w-3.5 text-white/40 transition group-hover:text-white/70" />
                Visit website ({lead.website})
              </span>
              <ExternalLink className="h-3 w-3 text-white/35 transition group-hover:text-white/65" />
            </Link>
          ) : null}
        </div>
      </Section>
    </div>
  );
}

function InsightCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value?: string | null;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  const text = (value ?? "").trim();
  const empty = text.length === 0;
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: `${accent}1a`,
            border: `1px solid ${accent}40`,
            color: accent,
          }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/60">
          {label}
        </p>
      </div>
      <p
        className={`mt-2 text-[14px] font-semibold leading-snug ${
          empty ? "text-white/35" : "text-white/90"
        }`}
      >
        {empty ? "Not yet generated." : text}
      </p>
    </div>
  );
}

function MarkdownBlock({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const text = (value ?? "").trim();
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-emerald-300/70" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/60">
            {label}
          </p>
        </div>
        {text ? (
          <span className="font-mono text-[10px] text-white/35">
            {text.length} chars
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/30">
            empty
          </span>
        )}
      </div>
      <div className="mt-3">
        {text ? (
          <AdminChatMessage content={text} />
        ) : (
          <p className="text-[12.5px] italic text-white/35">
            Run &ldquo;Regenerate insights&rdquo; to fill this in.
          </p>
        )}
      </div>
    </div>
  );
}
