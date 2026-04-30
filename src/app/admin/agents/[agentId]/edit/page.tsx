import { notFound } from "next/navigation";
import { fetchAgentById, fetchCompaniesPaged } from "@/lib/auth/api";
import { saveAgentAction } from "../../../_actions";
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

export default async function AdminAgentEditPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const id = Number(agentId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [agent, companies] = await Promise.all([
    fetchAgentById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!agent) notFound();

  return (
    <FormShell
      eyebrow={`#${agent.id}`}
      title={`Edit ${agent.name ?? "agent"}`}
      subtitle="Tune the agent's identity, description and runtime behavior."
      backHref={`/admin/agents/${agent.id}`}
      backLabel="Back to agent"
    >
      <form action={saveAgentAction} className="max-w-4xl space-y-6">
        <HiddenField name="agentId" value={agent.id} />

        <FormSection title="Identity" accent="violet">
          <SelectField
            label="Company"
            name="companyId"
            defaultValue={agent.companyId}
            options={(companies?.result ?? []).map((c) => ({
              value: c.id,
              label: c.name ?? `Company #${c.id}`,
            }))}
          />
          <Field
            label="Name"
            name="name"
            required
            defaultValue={agent.name ?? ""}
          />
          <Field label="Slug" name="slug" defaultValue={agent.slug ?? ""} />
          <Field label="Role" name="role" defaultValue={agent.role ?? ""} />
          <Field label="Emoji" name="emoji" defaultValue={agent.emoji ?? ""} />
          <Field
            label="Avatar URL"
            name="avatarUrl"
            defaultValue={agent.avatarUrl ?? ""}
          />
        </FormSection>

        <FormSectionStacked title="Description" accent="cyan">
          <TextareaField
            label="Description"
            name="description"
            defaultValue={agent.description ?? ""}
            placeholder="What this agent is responsible for, its tone, and any constraints."
          />
        </FormSectionStacked>

        <FormSection title="Behavior" accent="amber">
          <SelectField
            label="Status"
            name="status"
            defaultValue={agent.status ? "true" : "false"}
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
          <SelectField
            label="Default agent"
            name="isDefault"
            defaultValue={agent.isDefault ? "true" : "false"}
            options={[
              { value: "false", label: "No" },
              { value: "true", label: "Yes" },
            ]}
          />
        </FormSection>

        <FormActions cancelHref={`/admin/agents/${agent.id}`} />
      </form>
    </FormShell>
  );
}
