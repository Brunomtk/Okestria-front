"use client";

import { useEffect } from "react";
import {
  ensureFreshAccessToken,
  hasPersistedAuthSession,
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
 */
export default function AuthKeepAlive() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasPersistedAuthSession()) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        await ensureFreshAccessToken(180);
      } catch {
        /* swallow — next tick will retry */
      }
    };

    void tick();
    const intervalId = window.setInterval(tick, 4 * 60_000);

    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    const onFocus = () => void tick();
    const onOnline = () => void tick();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onFocus);
    };
  }, []);

  return null;
}
