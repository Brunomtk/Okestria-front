import { notFound } from "next/navigation";
import { fetchCompanyById } from "@/lib/auth/api";
import { saveCompanyAction } from "../../../_actions";
import {
  Field,
  FormActions,
  FormSection,
  FormShell,
  HiddenField,
  SelectField,
} from "../../../_lib/forms";
import { requireAdminSession } from "../../../_lib/admin";

export default async function AdminCompanyEditPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const id = Number(companyId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const company = await fetchCompanyById(id, session.token!).catch(() => null);
  if (!company) notFound();

  return (
    <FormShell
      eyebrow={`#${company.id}`}
      title={`Edit ${company.name ?? "company"}`}
      subtitle="Update the tenant's identity. Status changes take effect immediately."
      backHref={`/admin/companies/${company.id}`}
      backLabel="Back to company"
    >
      <form action={saveCompanyAction} className="max-w-3xl space-y-6">
        <HiddenField name="companyId" value={company.id} />

        <FormSection title="Primary details" accent="violet">
          <Field
            label="Name"
            name="name"
            required
            defaultValue={company.name ?? ""}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            required
            defaultValue={company.email ?? ""}
          />
          <Field
            label="Tax ID"
            name="cnpj"
            defaultValue={company.cnpj ?? ""}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={company.status ? "true" : "false"}
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </FormSection>

        <FormActions cancelHref={`/admin/companies/${company.id}`} />
      </form>
    </FormShell>
  );
}
