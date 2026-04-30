import { redirect } from "next/navigation";

/**
 * Legacy `/agents` URL — superseded by the office canvas. Forward
 * to the canonical company office.
 */
export default function LegacyAgentsPage() {
  redirect("/company/office");
}
