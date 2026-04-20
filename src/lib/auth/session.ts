import { cookies } from 'next/headers';
import {
  fetchCompanyById,
  fetchCurrentUser,
  fetchWorkspacesByCompany,
  refreshUserToken,
} from './api';
import { mapRole, parseStoredSessionCookie } from './session-shared';

export type OkestriaSession = {
  token?: string;
  userId?: number;
  fullName?: string;
  email?: string;
  role?: string;
  roleType?: number;
  companyId?: number;
  companyName?: string;
  workspaceId?: number;
  workspaceName?: string;
};


function buildCachedSession(
  storedSession: ReturnType<typeof parseStoredSessionCookie>,
  token?: string,
): OkestriaSession | null {
  if (!storedSession) {
    return token ? { token } : null;
  }

  return {
    ...(token ? { token } : {}),
    userId: storedSession.userId ?? undefined,
    fullName: storedSession.name ?? undefined,
    email: storedSession.email ?? undefined,
    role: mapRole(storedSession.type),
    roleType: storedSession.type ?? undefined,
    companyId: storedSession.companyId ?? undefined,
    companyName: storedSession.companyId ? 'Sua company' : undefined,
    workspaceName: storedSession.companyId ? 'Workspace operacional' : undefined,
  };
}

async function serverSideRefresh(refreshToken: string): Promise<string | null> {
  try {
    const refreshed = await refreshUserToken(refreshToken);
    if (refreshed?.token) {
      try {
        const cookieStore = await cookies();
        const accessMaxAge = refreshed.expiresAtUtc
          ? Math.max(60 * 5, Math.floor((new Date(refreshed.expiresAtUtc).getTime() - Date.now()) / 1000))
          : 60 * 60 * 8;
        cookieStore.set('okestria_access_token', refreshed.token, {
          path: '/',
          maxAge: accessMaxAge,
          sameSite: 'lax',
        });
        if (refreshed.refreshToken) {
          const refreshMaxAge = refreshed.refreshTokenExpiresAtUtc
            ? Math.max(
                60 * 60,
                Math.floor((new Date(refreshed.refreshTokenExpiresAtUtc).getTime() - Date.now()) / 1000),
              )
            : 60 * 60 * 24 * 365;
          cookieStore.set('okestria_refresh_token', refreshed.refreshToken, {
            path: '/',
            maxAge: refreshMaxAge,
            sameSite: 'lax',
          });
        }
        cookieStore.set(
          'okestria_session',
          JSON.stringify({
            userId: refreshed.userId,
            companyId: refreshed.companyId ?? null,
            name: refreshed.name ?? null,
            email: refreshed.email ?? null,
            type: refreshed.type,
          }),
          {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax',
          },
        );
      } catch {
        // cookies() may be read-only in some rendering contexts; the client
        // will re-persist via persistAuthSession on its next tick regardless.
      }
      return refreshed.token;
    }
  } catch {
    /* swallow — caller falls back to cached identity */
  }
  return null;
}


export async function getBackendSession(): Promise<OkestriaSession | null> {
  const cookieStore = await cookies();
  let token = cookieStore.get('okestria_access_token')?.value;
  const refreshToken = cookieStore.get('okestria_refresh_token')?.value;
  const storedSession = parseStoredSessionCookie(cookieStore.get('okestria_session')?.value);

  // Standby case: access cookie has expired but refresh cookie + stored
  // identity are still present. Try to mint a new token server-side so the
  // current request doesn't flash a logged-out state.
  if (!token && refreshToken) {
    const refreshed = await serverSideRefresh(refreshToken);
    if (refreshed) token = refreshed;
  }

  if (!token) {
    return buildCachedSession(storedSession);
  }

  try {
    const currentUser = await fetchCurrentUser(token);
    const roleType = currentUser.type;
    const session: OkestriaSession = {
      token,
      userId: currentUser.userId,
      fullName: currentUser.name ?? undefined,
      email: currentUser.email ?? undefined,
      role: mapRole(roleType),
      roleType,
      companyId: currentUser.companyId ?? undefined,
    };

    if (currentUser.companyId) {
      try {
        const company = await fetchCompanyById(currentUser.companyId, token);
        session.companyName = company.name ?? 'Sua company';
      } catch {
        session.companyName = 'Sua company';
      }

      try {
        const workspaces = await fetchWorkspacesByCompany(currentUser.companyId, token);
        const primaryWorkspace = workspaces.find((item) => item.status !== false) ?? workspaces[0];
        session.workspaceId = primaryWorkspace?.id;
        session.workspaceName = primaryWorkspace?.name ?? 'Workspace operacional';
      } catch {
        session.workspaceName = 'Workspace operacional';
      }
    }

    return session;
  } catch {
    // Access token present but /Users/me failed — try a one-shot refresh
    // before falling back to cached identity so a transient 401 doesn't
    // silently downgrade the session to "no token".
    if (refreshToken) {
      const retried = await serverSideRefresh(refreshToken);
      if (retried) {
        try {
          const currentUser = await fetchCurrentUser(retried);
          const roleType = currentUser.type;
          return {
            token: retried,
            userId: currentUser.userId,
            fullName: currentUser.name ?? undefined,
            email: currentUser.email ?? undefined,
            role: mapRole(roleType),
            roleType,
            companyId: currentUser.companyId ?? undefined,
          };
        } catch {
          /* fallthrough */
        }
      }
    }
    return buildCachedSession(storedSession, token);
  }
}
