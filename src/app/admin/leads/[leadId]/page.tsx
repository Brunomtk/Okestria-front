import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Target,
} from "lucide-react";
import { notFound } from "next/navigation";
import { fetchCompaniesPaged, fetchLeadById } from "@/lib/auth/api";
import { generateLeadInsightsAction } from "../../_actions";
import { requireAdminSession } from "../../_lib/admin";
import { Section } from "../../_components/AdminUI";
import {
  DetailActionLink,
  DetailFact,
  DetailHeader,
  DetailLinkRow,
  DetailTagPill,
} from "../../_components/AdminDetail";

function statusVariant(status?: string | null) {
  const v = (status ?? "").toLowerCase();
  if (v === "lost") return "rose" as const;
  if (v === "qualified") return "emerald" as const;
  if (v === "contacted") return "cyan" as const;
  if (v === "new") return "violet" as const;
  return "outline" as const;
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const id = Number(leadId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [lead, companies] = await Promise.all([
    fetchLeadById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!lead) notFound();
  const companyName = lead.companyId
    ? (companies?.result ?? []).find((item) => item.id === lead.companyId)
        ?.name ?? `Company #${lead.companyId}`
    : "—";

  return (
    <div className="space-y-8">
      <DetailHeader
        backHref="/admin/leads"
        backLabel="Back to leads"
        eyebrow={`Lead · #${lead.id}`}
        title={lead.businessName ?? lead.contactName ?? `Lead #${lead.id}`}
        subtitle="Live administrative view of the lead. Re-generate insights to refresh the PTX summary on demand."
        pills={
          <>
            <DetailTagPill>ID #{lead.id}</DetailTagPill>
            <DetailTagPill variant={statusVariant(lead.status)}>
              {(lead.status ?? "no status").toLowerCase()}
            </DetailTagPill>
            {lead.leadGenerationJobId ? (
              <DetailTagPill>job #{lead.leadGenerationJobId}</DetailTagPill>
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
                Generate insights
              </button>
            </form>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Lead details" subtitle="primary record" accent="amber">
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <DetailFact
              label="Business"
              value={lead.businessName ?? "—"}
              icon={Target}
            />
            <DetailFact label="Contact" value={lead.contactName ?? "—"} />
            <DetailFact label="Email" value={lead.email ?? "—"} icon={Mail} />
            <DetailFact label="Phone" value={lead.phone ?? "—"} icon={Phone} />
            <DetailFact
              label="Location"
              value={`${lead.city ?? "—"}${lead.state ? `, ${lead.state}` : ""}`}
              icon={MapPin}
            />
            <DetailFact
              label="Tenant"
              value={companyName}
              icon={Building2}
            />
          </div>
        </Section>

        <Section title="Operations" subtitle="next steps" accent="cyan">
          <div className="space-y-2 p-5">
            <DetailLinkRow
              href={`/admin/companies/${lead.companyId ?? ""}`}
              icon={Building2}
            >
              Open linked tenant
            </DetailLinkRow>
            <DetailLinkRow
              href={`/admin/leads?q=${encodeURIComponent(
                lead.businessName ?? lead.contactName ?? "",
              )}`}
              icon={Target}
            >
              Find similar leads
            </DetailLinkRow>
            <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-[12px] leading-relaxed text-white/55">
              Clicking <strong className="text-white/85">Generate insights</strong>{" "}
              calls the live endpoint{" "}
              <code className="rounded bg-white/10 px-1 font-mono text-[11px] text-cyan-200">
                /api/Leads/{lead.id}/generate-ptx-insights
              </code>{" "}
              and refreshes the admin view.
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
