import type { OkestriaTokenResponse } from './api';

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
