import { cookies } from 'next/headers';
import { fetchCompanyById, fetchCurrentUser, fetchWorkspacesByCompany } from './api';
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


export async function getBackendSession(): Promise<OkestriaSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('okestria_access_token')?.value;
  const storedSession = parseStoredSessionCookie(cookieStore.get('okestria_session')?.value);

  if (!token) {
    if (!storedSession) return null;

    return {
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
    if (!storedSession) return null;

    return {
      token,
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
}
