import { fetchCompaniesPaged } from "@/lib/auth/api";
import { saveUserAction } from "../../_actions";
import {
  Field,
  FormActions,
  FormSection,
  FormShell,
  SelectField,
} from "../../_lib/forms";
import { requireAdminSession } from "../../_lib/admin";

export default async function AdminUserNewPage() {
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
      eyebrow="Tenants"
      title="New user"
      subtitle="Provision a real account with an initial password. The user can change it on first sign-in."
      backHref="/admin/users"
      backLabel="Back to users"
    >
      <form action={saveUserAction} className="max-w-4xl space-y-6">
        <FormSection title="Access" accent="cyan">
          <Field label="Name" name="name" required placeholder="Jane Doe" />
          <Field
            label="Email"
            name="email"
            type="email"
            required
            placeholder="jane@acme.com"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
          />
          <SelectField
            label="Company"
            name="companyId"
            options={companies.map((c) => ({
              value: c.id,
              label: c.name ?? `Company #${c.id}`,
            }))}
          />
        </FormSection>

        <FormSection title="Configuration" accent="violet">
          <SelectField
            label="Type"
            name="type"
            defaultValue="2"
            options={[
              { value: 1, label: "Admin" },
              { value: 2, label: "Company" },
            ]}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue="1"
            options={[
              { value: 1, label: "Active" },
              { value: 0, label: "Inactive" },
            ]}
          />
          <Field
            label="Language"
            name="language"
            defaultValue="en-US"
            placeholder="en-US"
          />
          <Field
            label="Theme"
            name="theme"
            defaultValue="dark"
            placeholder="dark / light"
          />
        </FormSection>

        <FormActions cancelHref="/admin/users" submitLabel="Create user" />
      </form>
    </FormShell>
  );
}
