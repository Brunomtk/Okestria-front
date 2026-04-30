import { notFound } from "next/navigation";
import { fetchCompaniesPaged, fetchLeadById } from "@/lib/auth/api";
import { saveLeadAction } from "../../../_actions";
import {
  Field,
  FormActions,
  FormSection,
  FormShell,
  HiddenField,
  SelectField,
} from "../../../_lib/forms";
import { requireAdminSession } from "../../../_lib/admin";

export default async function AdminLeadEditPage({
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

  return (
    <FormShell
      eyebrow={`#${lead.id}`}
      title={`Edit ${lead.businessName ?? "lead"}`}
      subtitle="Update contact details or move the lead along the pipeline."
      backHref={`/admin/leads/${lead.id}`}
      backLabel="Back to lead"
    >
      <form action={saveLeadAction} className="max-w-4xl space-y-6">
        <HiddenField name="leadId" value={lead.id} />

        <FormSection title="Lead details" accent="amber">
          <SelectField
            label="Company"
            name="companyId"
            defaultValue={lead.companyId ?? ""}
            options={(companies?.result ?? []).map((c) => ({
              value: c.id,
              label: c.name ?? `Company #${c.id}`,
            }))}
          />
          <Field
            label="Business name"
            name="businessName"
            required
            defaultValue={lead.businessName ?? ""}
          />
          <Field
            label="Contact name"
            name="contactName"
            defaultValue={lead.contactName ?? ""}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={lead.email ?? ""}
          />
          <Field label="Phone" name="phone" defaultValue={lead.phone ?? ""} />
          <Field label="City" name="city" defaultValue={lead.city ?? ""} />
          <Field label="State" name="state" defaultValue={lead.state ?? ""} />
          <SelectField
            label="Status"
            name="status"
            defaultValue={lead.status ?? "new"}
            options={[
              { value: "new", label: "New" },
              { value: "contacted", label: "Contacted" },
              { value: "qualified", label: "Qualified" },
              { value: "lost", label: "Lost" },
            ]}
          />
        </FormSection>

        <FormActions cancelHref={`/admin/leads/${lead.id}`} />
      </form>
    </FormShell>
  );
}
