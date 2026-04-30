import { notFound } from "next/navigation";
import { fetchCompaniesPaged, fetchUserById } from "@/lib/auth/api";
import { saveUserAction } from "../../../_actions";
import {
  Field,
  FormActions,
  FormSection,
  FormShell,
  HiddenField,
  SelectField,
} from "../../../_lib/forms";
import { requireAdminSession } from "../../../_lib/admin";

export default async function AdminUserEditPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [user, companies] = await Promise.all([
    fetchUserById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!user) notFound();

  return (
    <FormShell
      eyebrow={`#${user.id}`}
      title={`Edit ${user.name ?? "user"}`}
      subtitle="Update access and configuration. Leave password blank to keep it unchanged."
      backHref={`/admin/users/${user.id}`}
      backLabel="Back to user"
    >
      <form action={saveUserAction} className="max-w-4xl space-y-6">
        <HiddenField name="userId" value={user.id} />

        <FormSection title="Access" accent="cyan">
          <Field
            label="Name"
            name="name"
            required
            defaultValue={user.name ?? ""}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            required
            defaultValue={user.email ?? ""}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            placeholder="Leave blank to keep current"
            hint="Only fill if you need to reset the password."
          />
          <SelectField
            label="Company"
            name="companyId"
            defaultValue={user.companyId ?? ""}
            options={(companies?.result ?? []).map((c) => ({
              value: c.id,
              label: c.name ?? `Company #${c.id}`,
            }))}
          />
        </FormSection>

        <FormSection title="Configuration" accent="violet">
          <SelectField
            label="Type"
            name="type"
            defaultValue={user.type ?? 2}
            options={[
              { value: 1, label: "Admin" },
              { value: 2, label: "Company" },
            ]}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={user.status ?? 1}
            options={[
              { value: 1, label: "Active" },
              { value: 0, label: "Inactive" },
            ]}
          />
          <Field label="Language" name="language" defaultValue="en-US" />
          <Field label="Theme" name="theme" defaultValue="dark" />
        </FormSection>

        <FormActions cancelHref={`/admin/users/${user.id}`} />
      </form>
    </FormShell>
  );
}
