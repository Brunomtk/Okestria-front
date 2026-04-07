import { redirect } from "next/navigation";

export default function LegacySpotifyCallbackPage() {
  redirect("/company/demo-company/spotify/callback");
}
