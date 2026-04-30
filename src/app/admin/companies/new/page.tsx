import { saveCompanyAction } from "../../_actions";
import {
  Field,
  FormActions,
  FormSection,
  FormShell,
  SelectField,
} from "../../_lib/forms";

export default function AdminCompanyNewPage() {
  return (
    <FormShell
      eyebrow="Tenants"
      title="New company"
      subtitle="Create a tenant — primary email, identifier and an initial status. You can fill in billing and integrations later."
      backHref="/admin/companies"
      backLabel="Back to companies"
    >
      <form action={saveCompanyAction} className="max-w-3xl space-y-6">
        <FormSection
          title="Primary details"
          description="Required to provision the tenant in the gateway."
          accent="violet"
        >
          <Field label="Name" name="name" required placeholder="Acme Inc." />
          <Field
            label="Email"
            name="email"
            type="email"
            required
            placeholder="contact@acme.com"
          />
          <Field label="Tax ID" name="cnpj" placeholder="00.000.000/0000-00" />
          <SelectField
            label="Status"
            name="status"
            defaultValue="true"
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </FormSection>

        <FormActions
          cancelHref="/admin/companies"
          submitLabel="Create company"
        />
      </form>
    </FormShell>
  );
}
