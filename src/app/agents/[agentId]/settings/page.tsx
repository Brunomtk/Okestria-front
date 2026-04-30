import { redirect } from "next/navigation";

/**
 * Legacy `/agents/[id]/settings` URL — agent settings now live
 * inside the office canvas. Forward to the canonical company office.
 */
export default async function LegacyAgentSettingsPage({
  params,
}: {
  params: Promise<{ agentId?: string }> | { agentId?: string };
}) {
  await params;
  redirect("/company/office");
}
