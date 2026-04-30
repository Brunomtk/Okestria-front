import { fetchCompaniesPaged } from "@/lib/auth/api";
import { saveWorkspaceAction } from "../../_actions";
import {
  Field,
  FormActions,
  FormSection,
  FormSectionStacked,
  FormShell,
  SelectField,
  TextareaField,
} from "../../_lib/forms";
import { requireAdminSession } from "../../_lib/admin";

export default async function AdminWorkspaceNewPage() {
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
      title="New workspace"
      subtitle="Workspaces hold the office layout, agents, and squad templates for a tenant."
      backHref="/admin/workspaces"
      backLabel="Back to workspaces"
    >
      <form action={saveWorkspaceAction} className="max-w-4xl space-y-6">
        <FormSection title="Primary details" accent="emerald">
          <SelectField
            label="Company"
            name="companyId"
            options={companies.map((c) => ({
              value: c.id,
              label: c.name ?? `Company #${c.id}`,
            }))}
          />
          <Field label="Name" name="name" required placeholder="Sales floor" />
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

        <FormSectionStacked title="Description" accent="cyan">
          <TextareaField
            label="Description"
            name="description"
            placeholder="Why this workspace exists and what it covers."
          />
        </FormSectionStacked>

        <FormActions
          cancelHref="/admin/workspaces"
          submitLabel="Create workspace"
        />
      </form>
    </FormShell>
  );
}
