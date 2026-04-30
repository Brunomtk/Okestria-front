import { notFound } from "next/navigation";
import { fetchCompaniesPaged, fetchWorkspaceById } from "@/lib/auth/api";
import { saveWorkspaceAction } from "../../../_actions";
import {
  Field,
  FormActions,
  FormSection,
  FormSectionStacked,
  FormShell,
  HiddenField,
  SelectField,
  TextareaField,
} from "../../../_lib/forms";
import { requireAdminSession } from "../../../_lib/admin";

export default async function AdminWorkspaceEditPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const id = Number(workspaceId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [workspace, companies] = await Promise.all([
    fetchWorkspaceById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!workspace) notFound();

  return (
    <FormShell
      eyebrow={`#${workspace.id}`}
      title={`Edit ${workspace.name ?? "workspace"}`}
      subtitle="Update the workspace details. Status changes affect every agent inside it."
      backHref={`/admin/workspaces/${workspace.id}`}
      backLabel="Back to workspace"
    >
      <form action={saveWorkspaceAction} className="max-w-4xl space-y-6">
        <HiddenField name="workspaceId" value={workspace.id} />

        <FormSection title="Primary details" accent="emerald">
          <SelectField
            label="Company"
            name="companyId"
            defaultValue={workspace.companyId}
            options={(companies?.result ?? []).map((c) => ({
              value: c.id,
              label: c.name ?? `Company #${c.id}`,
            }))}
          />
          <Field
            label="Name"
            name="name"
            required
            defaultValue={workspace.name ?? ""}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={workspace.status ? "true" : "false"}
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
            defaultValue={workspace.description ?? ""}
          />
        </FormSectionStacked>

        <FormActions cancelHref={`/admin/workspaces/${workspace.id}`} />
      </form>
    </FormShell>
  );
}
