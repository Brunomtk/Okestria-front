/**
 * v117 — Per-user Meta credentials (Instagram + Facebook + WhatsApp Business).
 *
 * Pairs with back v70 + bridge v4. Same security model as the email
 * client (see lib/email/api.ts):
 *   • Access token is one-shot — sent only on PUT, never returned.
 *   • DB stores public IDs (igUserId, pageId, phoneNumberId) only.
 *   • The token lives on the gateway VPS at
 *     /root/.openclaw/social-accounts/users/{userId}/meta.json (mode 600).
 */
import { getOkestriaApiBaseUrl } from "@/lib/auth/api";
import { ensureFreshAccessToken } from "@/lib/auth/session-client";
import { getBrowserAccessToken } from "@/lib/agents/backend-api";

export type UserSocialAccount = {
  id: number;
  userId: number;
  companyId: number;
  userName: string | null;
  provider: "meta" | string;
  displayHandle: string | null;
  igUserId: string | null;
  facebookPageId: string | null;
  whatsappPhoneNumberId: string | null;
  businessAccountId: string | null;
  tokenExpiresAtUtc: string | null;
  lastTestedAtUtc: string | null;
  lastTestSucceeded: boolean | null;
  lastTestResultsJson: string | null;
  createdDate: string | null;
  updatedDate: string | null;
};

export type UpsertUserSocialAccountPayload = {
  provider: "meta";
  /** Plaintext Meta access token (long-lived recommended). */
  accessToken: string;
  displayHandle?: string;
  igUserId?: string;
  facebookPageId?: string;
  whatsappPhoneNumberId?: string;
  businessAccountId?: string;
  tokenExpiresAtUtc?: string | null;
};

export type UserSocialAccountTestResult = {
  ok: boolean;
  /** JSON string with per-platform check outcomes (token / instagram / facebook / whatsapp). */
  checkResultsJson: string | null;
  error: string | null;
  testedAtUtc: string;
};

const performRequest = async (
  path: string,
  init: RequestInit | undefined,
  bearer: string | null,
): Promise<Response> => {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  return fetch(`${getOkestriaApiBaseUrl()}${path}`, { ...init, headers, cache: "no-store" });
};

const readJsonOrText = async (response: Response): Promise<unknown> => {
  const text = (await response.text()).trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
};

const requestBackend = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let bearer: string | null = null;
  try { bearer = (await ensureFreshAccessToken()) ?? getBrowserAccessToken(); }
  catch { bearer = getBrowserAccessToken(); }
  let response = await performRequest(path, init, bearer);
  if (response.status === 401) {
    try {
      const refreshed = await ensureFreshAccessToken(Number.POSITIVE_INFINITY);
      if (refreshed && refreshed !== bearer) response = await performRequest(path, init, refreshed);
    } catch { /* fall through */ }
  }
  if (!response.ok) {
    const body = await readJsonOrText(response);
    const msg = body && typeof body === "object" && "error" in body
      ? String((body as { error?: unknown }).error)
      : typeof body === "string" ? body
      : `Request failed with status ${response.status}`;
    throw new Error(msg);
  }
  return (await readJsonOrText(response)) as T;
};

export const getMyMetaAccount = async (): Promise<UserSocialAccount | null> => {
  const raw = await requestBackend<UserSocialAccount | null>(`/api/UserSocialAccounts/me/meta`);
  return raw ?? null;
};

export const upsertMyMetaAccount = async (
  payload: UpsertUserSocialAccountPayload,
): Promise<UserSocialAccount> => {
  return requestBackend<UserSocialAccount>(`/api/UserSocialAccounts/me/meta`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const deleteMyMetaAccount = async (): Promise<{ deleted: boolean }> => {
  return requestBackend<{ deleted: boolean }>(`/api/UserSocialAccounts/me/meta`, { method: "DELETE" });
};

export const testMyMetaAccount = async (): Promise<UserSocialAccountTestResult> => {
  return requestBackend<UserSocialAccountTestResult>(`/api/UserSocialAccounts/me/meta/test`, { method: "POST" });
};

export const listCompanyMetaAccounts = async (companyId: number): Promise<UserSocialAccount[]> => {
  return requestBackend<UserSocialAccount[]>(`/api/UserSocialAccounts/by-company/${companyId}`);
};
