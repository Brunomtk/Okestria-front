export type ClientStoredSession = {
  userId?: number | null;
  companyId?: number | null;
  name?: string | null;
  email?: string | null;
  type?: number | null;
};

export function mapRole(type?: number | null) {
  if (type === 1) return 'admin';
  if (type === 2) return 'company';
  return 'user';
}

export function parseStoredSessionCookie(raw?: string | null): ClientStoredSession | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ClientStoredSession;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
