import { redirect } from "next/navigation";

/**
 * Legacy `/office` URL — kept around for backwards-compat with old
 * bookmarks / share links. Forwards to the canonical company office.
 */
export default function LegacyOfficePage() {
  redirect("/company/office");
}
