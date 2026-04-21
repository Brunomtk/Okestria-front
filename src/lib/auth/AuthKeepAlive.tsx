"use client";

import { useEffect } from "react";
import {
  ensureFreshAccessToken,
  hasPersistedAuthSession,
  isAuthExpired,
  onAuthExpired,
} from "./session-client";

/**
 * App-wide auth keep-alive. Mounted inside the root layout so that *every*
 * screen (not just Office) benefits from proactive token refresh. The goal is
 * to keep the access-token cookie fresh even when the tab has been in standby
 * for a long time and to avoid the "standby → kicked to login" bug.
 *
 * Strategy:
 *   - Kick one refresh on mount so every page load starts with a fresh JWT.
 *   - Refresh every 4 minutes while the tab is visible (cheap, dedup'd).
 *   - Refresh on every visibilitychange → visible + on window focus + on
 *     network online.
 *   - Uses `ensureFreshAccessToken` which itself dedupes concurrent refreshes.
 *
 * v68 change — instead of silently retrying forever when the backend returns
 * 401 on /api/Users/refresh-token, we now stop the interval and all focus
 * triggers as soon as the session is permanently dead. The UI layer (Office
 * screen / GatewayConnectScreen) renders its own "session expired, sign in
 * again" call-to-action in response to the `okestria:auth-expired` event.
 * We deliberately do NOT force-redirect the user to /login here because the
 * user asked us not to kick them out of whatever screen they were on — the
 * screen owner decides how to recover.
 */
export default function AuthKeepAlive() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasPersistedAuthSession()) return;

    let cancelled = false;
    let intervalId: number | null = null;

    const stopTicking = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const tick = async () => {
      if (cancelled) return;
      if (isAuthExpired()) {
        // Backend has told us the refresh token is dead — stop the loop.
        stopTicking();
        return;
      }
      try {
        await ensureFreshAccessToken(180);
      } catch {
        /* swallow — next tick will retry */
      }
    };

    void tick();
    intervalId = window.setInterval(tick, 4 * 60_000);

    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    const onFocus = () => void tick();
    const onOnline = () => void tick();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onFocus);

    // Kill the loop the moment we learn the session is permanently dead.
    const unsubscribeExpired = onAuthExpired(() => {
      stopTicking();
    });

    return () => {
      cancelled = true;
      stopTicking();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onFocus);
      unsubscribeExpired();
    };
  }, []);

  return null;
}
