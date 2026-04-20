import { refreshUserToken, type OkestriaTokenResponse } from './api';

export const ACCESS_COOKIE = 'okestria_access_token';
export const REFRESH_COOKIE = 'okestria_refresh_token';
export const SESSION_COOKIE = 'okestria_session';

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

export function persistAuthSession(session: OkestriaTokenResponse) {
  const accessMaxAge = session.expiresAtUtc
    ? Math.max(60, Math.floor((new Date(session.expiresAtUtc).getTime() - Date.now()) / 1000))
    : 60 * 60 * 8;

  setCookie(ACCESS_COOKIE, session.token, accessMaxAge);

  if (session.refreshToken) {
    const refreshMaxAge = session.refreshTokenExpiresAtUtc
      ? Math.max(60, Math.floor((new Date(session.refreshTokenExpiresAtUtc).getTime() - Date.now()) / 1000))
      : 60 * 60 * 24 * 30;
    setCookie(REFRESH_COOKIE, session.refreshToken, refreshMaxAge);
  }

  setCookie(
    SESSION_COOKIE,
    JSON.stringify({
      userId: session.userId,
      companyId: session.companyId ?? null,
      name: session.name ?? null,
      email: session.email ?? null,
      type: session.type,
    }),
    accessMaxAge,
  );
}

export function clearAuthSession() {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, SESSION_COOKIE]) {
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export function getOkestriaAuthToken(): string | null {
  return getCookie(ACCESS_COOKIE);
}

export function getOkestriaRefreshToken(): string | null {
  return getCookie(REFRESH_COOKIE);
}

// ------------------------------------------------------------------------
// Proactive refresh flow. Decodes the JWT exp claim and refreshes early so
// the user doesn't get booted mid-session (especially on the Office screen
// where they may leave the tab open for long stretches).
// ------------------------------------------------------------------------

function decodeJwtExpirySeconds(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (padded.length % 4)) % 4);
    const json = atob(padded + padding);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : null;
  } catch {
    return null;
  }
}

let inFlightRefresh: Promise<OkestriaTokenResponse | null> | null = null;

/**
 * Refresh the access token if it's expired or about to expire.
 *
 * @param earlyRefreshSeconds  Refresh when the token has less than this many
 *                             seconds remaining. Default 120s.
 * @returns the new token string if a refresh happened (or cached one if no
 *          refresh was needed), or null if no refresh token is available or
 *          the refresh failed.
 */
export async function ensureFreshAccessToken(
  earlyRefreshSeconds = 120,
): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  const access = getOkestriaAuthToken();
  if (!access) return null;
  const exp = decodeJwtExpirySeconds(access);
  const nowSec = Math.floor(Date.now() / 1000);
  if (exp !== null && exp - nowSec > earlyRefreshSeconds) {
    // Still fresh — no refresh needed.
    return access;
  }
  const refresh = getOkestriaRefreshToken();
  if (!refresh) return access;

  if (!inFlightRefresh) {
    inFlightRefresh = (async () => {
      try {
        const session = await refreshUserToken(refresh);
        persistAuthSession(session);
        return session;
      } catch (error) {
        console.warn('[auth] Failed to refresh access token.', error);
        return null;
      } finally {
        // Clear a tick later so clustered callers share the same promise
        setTimeout(() => {
          inFlightRefresh = null;
        }, 0);
      }
    })();
  }

  const refreshed = await inFlightRefresh;
  return refreshed?.token ?? getOkestriaAuthToken();
}
