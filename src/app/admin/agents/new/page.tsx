import { fetchCompaniesPaged } from "@/lib/auth/api";
import { saveAgentAction } from "../../_actions";
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

export default async function AdminAgentNewPage() {
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
      eyebrow="Operations"
      title="New agent"
      subtitle="Define a single role-bound agent. You'll wire prompts and tools after creation."
      backHref="/admin/agents"
      backLabel="Back to agents"
    >
      <form action={saveAgentAction} className="max-w-4xl space-y-6">
        <FormSection title="Identity" accent="violet">
          <SelectField
            label="Company"
            name="companyId"
            options={companies.map((c) => ({
              value: c.id,
              label: c.name ?? `Company #${c.id}`,
            }))}
          />
          <Field label="Name" name="name" required placeholder="Lúcio" />
          <Field label="Slug" name="slug" placeholder="lucio" />
          <Field label="Role" name="role" placeholder="Sales operator" />
          <Field label="Emoji" name="emoji" placeholder="🤖" />
          <Field label="Avatar URL" name="avatarUrl" placeholder="https://…" />
        </FormSection>

        <FormSectionStacked title="Description" accent="cyan">
          <TextareaField
            label="Description"
            name="description"
            placeholder="What this agent is responsible for, its tone, and any constraints."
          />
        </FormSectionStacked>

        <FormSection title="Behavior" accent="amber">
          <SelectField
            label="Status"
            name="status"
            defaultValue="true"
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
          <SelectField
            label="Default agent"
            name="isDefault"
            defaultValue="false"
            options={[
              { value: "false", label: "No" },
              { value: "true", label: "Yes" },
            ]}
            hint="Default agents auto-attach to new workspaces."
          />
        </FormSection>

        <FormActions cancelHref="/admin/agents" submitLabel="Create agent" />
      </form>
    </FormShell>
  );
}
