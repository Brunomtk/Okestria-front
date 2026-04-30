import { redirect } from "next/navigation";

/**
 * Catch-all for any URL that doesn't match a real route. We send the
 * visitor back to the root page so the auth-aware landing logic can
 * route them to /admin, /company/office or /login as appropriate.
 *
 * IMPORTANT: do NOT redirect to /office or /company/<anything>/office
 * here — those legacy URLs already redirect somewhere else, so a
 * loop forms (browser stops with ERR_TOO_MANY_REDIRECTS).
 */
export default function InvalidRoutePage() {
  redirect("/");
}
