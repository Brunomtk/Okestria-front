import { redirect } from "next/navigation";

export default async function LegacyAgentSettingsPage({
  params,
}: {
  params: Promise<{ agentId?: string }> | { agentId?: string };
}) {
  await params;
  redirect("/company/demo-company/office");
}
