import { refreshUserToken, type OkestriaTokenResponse } from './api';

export const ACCESS_COOKIE = 'okestria_access_token';
export const REFRESH_COOKIE = 'okestria_refresh_token';
export const SESSION_COOKIE = 'okestria_session';

// One full year — we decouple the *cookie* TTL from the *JWT* TTL so that an
// idle browser tab (standby) doesn't silently drop the user's identity cookie
// just because the access-token JWT expired. The JWT itself still expires on
// its own schedule (enforced server-side); we just make sure the browser keeps
// the refresh token + cached session identity long enough to rehydrate a fresh
// access token when the user comes back.
const LONG_LIVED_MAX_AGE = 60 * 60 * 24 * 365; // 365 days

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

export function persistAuthSession(session: OkestriaTokenResponse) {
  // Access cookie stays tied to the JWT lifetime (server rejects it after exp
  // anyway) but we never let it dip below 5 min so a clock-skew edge case
  // doesn't turn it into an immediate-expiry cookie.
  const accessMaxAge = session.expiresAtUtc
    ? Math.max(60 * 5, Math.floor((new Date(session.expiresAtUtc).getTime() - Date.now()) / 1000))
    : 60 * 60 * 8;

  setCookie(ACCESS_COOKIE, session.token, accessMaxAge);

  if (session.refreshToken) {
    // Refresh cookie lives as long as the server says it should — or for a
    // year otherwise. This is what lets us silently re-issue an access token
    // after a long standby.
    const refreshMaxAge = session.refreshTokenExpiresAtUtc
      ? Math.max(
          60 * 60,
          Math.floor((new Date(session.refreshTokenExpiresAtUtc).getTime() - Date.now()) / 1000),
        )
      : LONG_LIVED_MAX_AGE;
    setCookie(REFRESH_COOKIE, session.refreshToken, refreshMaxAge);
  }

  // Session cookie = the small "who's logged in" identity blob. It survives
  // the access token JWT so layouts/screens can still tell the user is
  // authenticated while the refresh flow quietly mints a new JWT.
  setCookie(
    SESSION_COOKIE,
    JSON.stringify({
      userId: session.userId,
      companyId: session.companyId ?? null,
      name: session.name ?? null,
      email: session.email ?? null,
      type: session.type,
    }),
    LONG_LIVED_MAX_AGE,
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
// where they may leave the tab open for long stretches). Also used after a
// tab wakes from standby, when the access cookie may have already expired
// client-side even though the refresh cookie is still valid.
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

async function performRefresh(refreshTokenValue: string): Promise<OkestriaTokenResponse | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = (async () => {
      try {
        const session = await refreshUserToken(refreshTokenValue);
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
  return inFlightRefresh;
}

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
  const refresh = getOkestriaRefreshToken();

  // Standby case: the access cookie has expired client-side but the refresh
  // cookie is still valid — mint a new access token instead of giving up.
  if (!access) {
    if (!refresh) return null;
    const refreshed = await performRefresh(refresh);
    return refreshed?.token ?? getOkestriaAuthToken();
  }

  const exp = decodeJwtExpirySeconds(access);
  const nowSec = Math.floor(Date.now() / 1000);
  if (exp !== null && exp - nowSec > earlyRefreshSeconds) {
    // Still fresh — no refresh needed.
    return access;
  }
  if (!refresh) return access;

  const refreshed = await performRefresh(refresh);
  return refreshed?.token ?? getOkestriaAuthToken();
}

/**
 * Returns true if the client has *some* evidence the user was recently
 * authenticated — either a valid access cookie or a refresh cookie we can use
 * to mint one. Intended for screens that want to avoid flashing a logged-out
 * state while a background refresh is in flight.
 */
export function hasPersistedAuthSession(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(getOkestriaAuthToken() || getOkestriaRefreshToken() || getCookie(SESSION_COOKIE));
}
