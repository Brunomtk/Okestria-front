import { fetchCompaniesPaged } from "@/lib/auth/api";
import { saveLeadAction } from "../../_actions";
import {
  Field,
  FormActions,
  FormSection,
  FormShell,
  SelectField,
} from "../../_lib/forms";
import { requireAdminSession } from "../../_lib/admin";

export default async function AdminLeadNewPage() {
  const session = await requireAdminSession();
  const companies =
    (
      await fetchCompaniesPaged(session.token!, {
        pageNumber: 1,
        pageSize: 200,
      }).catch(() => null)
    )?.result ?? [];

  return (
    <FormShell
      eyebrow="Pipeline"
      title="New lead"
      subtitle="Capture a prospect by hand. The lead will sit in the inbox for a squad to qualify."
      backHref="/admin/leads"
      backLabel="Back to leads"
    >
      <form action={saveLeadAction} className="max-w-4xl space-y-6">
        <FormSection title="Lead details" accent="amber">
          <SelectField
            label="Company"
            name="companyId"
            options={companies.map((c) => ({
              value: c.id,
              label: c.name ?? `Company #${c.id}`,
            }))}
          />
          <Field
            label="Business name"
            name="businessName"
            required
            placeholder="Acme Corp."
          />
          <Field label="Contact name" name="contactName" placeholder="Jane Doe" />
          <Field
            label="Email"
            name="email"
            type="email"
            placeholder="contact@example.com"
          />
          <Field label="Phone" name="phone" placeholder="+1 555 0100" />
          <Field label="City" name="city" placeholder="Seattle" />
          <Field label="State" name="state" placeholder="WA" />
          <SelectField
            label="Status"
            name="status"
            defaultValue="new"
            options={[
              { value: "new", label: "New" },
              { value: "contacted", label: "Contacted" },
              { value: "qualified", label: "Qualified" },
              { value: "lost", label: "Lost" },
            ]}
          />
        </FormSection>

        <FormActions cancelHref="/admin/leads" submitLabel="Create lead" />
      </form>
    </FormShell>
  );
}
