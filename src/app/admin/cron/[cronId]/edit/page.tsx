import { notFound } from "next/navigation";
import { fetchCronJobById } from "@/lib/auth/api";
import { saveCronJobAction } from "../../../_actions";
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

/**
 * v149 — Admin · Edit cron job.
 *
 * Lean form: name, description, cron expression, timezone, status,
 * system-event prompt. The other fields (agent, kind, delivery
 * mode, webhook, etc.) are still managed in the office's cron
 * modal — we'll bring them in here progressively if needed.
 */

export default async function AdminCronEditPage({
  params,
}: {
  params: Promise<{ cronId: string }>;
}) {
  const { cronId } = await params;
  const id = Number(cronId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const job = await fetchCronJobById(id, session.token!).catch(() => null);
  if (!job) notFound();

  return (
    <FormShell
      eyebrow={`#${job.id}`}
      title={`Edit ${job.name || "cron job"}`}
      subtitle="Tune the schedule, rename, swap the prompt or pause the job."
      backHref={`/admin/cron/${job.id}`}
      backLabel="Back to cron job"
    >
      <form action={saveCronJobAction} className="max-w-4xl space-y-6">
        <HiddenField name="jobId" value={job.id} />

        <FormSection title="Identity" accent="violet">
          <Field
            label="Name"
            name="name"
            required
            defaultValue={job.name}
            placeholder="Daily news brief"
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={job.status}
            options={[
              { value: "active", label: "Active (armed)" },
              { value: "paused", label: "Paused" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </FormSection>

        <FormSectionStacked title="Description" accent="cyan">
          <TextareaField
            label="Description"
            name="description"
            defaultValue={job.description ?? ""}
            placeholder="What this cron is responsible for, who reads the output."
          />
        </FormSectionStacked>

        <FormSection title="Schedule" accent="amber">
          <Field
            label="Cron expression"
            name="cronExpression"
            defaultValue={job.cronExpression ?? ""}
            placeholder="0 8 * * *"
            hint="Standard 5-field cron — leave blank for one-shot jobs."
          />
          <Field
            label="Timezone"
            name="timezone"
            defaultValue={job.timezone || "UTC"}
            placeholder="UTC"
          />
        </FormSection>

        <FormSectionStacked title="System event prompt" accent="violet">
          <TextareaField
            label="Prompt sent to the agent"
            name="systemEvent"
            defaultValue={job.systemEvent ?? ""}
            placeholder="What should the agent do when this cron fires?"
            rows={6}
          />
        </FormSectionStacked>

        <FormActions cancelHref={`/admin/cron/${job.id}`} />
      </form>
    </FormShell>
  );
}
