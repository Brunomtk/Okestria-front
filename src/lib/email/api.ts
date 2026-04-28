/**
 * v115 — Per-user email (himalaya) configuration client.
 *
 * Pairs with back v68 + bridge v2. The back stores metadata in the
 * `UserEmailConfigs` table; the bridge writes the actual
 * himalaya.toml + .mail-password files to the gateway VPS at
 * `/root/.openclaw/email-configs/users/{userId}/`. Squad task
 * dispatch reads the user's config and injects the EMAIL ACCESS
 * block into the agent's prompt.
 *
 * The password is one-way: caller sends it on PUT /me; the back
 * pushes it through the bridge and never persists or echoes it back.
 * To rotate, the user re-types it in the form.
 */
import { getOkestriaApiBaseUrl } from "@/lib/auth/api";
import { ensureFreshAccessToken } from "@/lib/auth/session-client";
import { getBrowserAccessToken } from "@/lib/agents/backend-api";

export type UserEmailConfig = {
  id: number;
  userId: number;
  companyId: number;
  userName: string | null;
  email: string;
  displayName: string | null;
  imapHost: string;
  imapPort: number;
  imapEncryption: "tls" | "start-tls" | "none" | string;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: "tls" | "start-tls" | "none" | string;
  lastTestedAtUtc: string | null;
  lastTestSucceeded: boolean | null;
  lastTestError: string | null;
  createdDate: string | null;
  updatedDate: string | null;
};

export type UpsertUserEmailConfigPayload = {
  email: string;
  displayName?: string;
  imapHost: string;
  imapPort: number;
  imapEncryption: "tls" | "start-tls" | "none" | string;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: "tls" | "start-tls" | "none" | string;
  /** Plaintext password / app password — used once, never persisted in the DB. */
  password: string;
};

export type UserEmailConfigTestResult = {
  ok: boolean;
  stdout: string | null;
  stderr: string | null;
  error: string | null;
  exitCode: number | null;
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
  return fetch(`${getOkestriaApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
};

const readJsonOrText = async (response: Response): Promise<unknown> => {
  const text = (await response.text()).trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const requestBackend = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let bearer: string | null = null;
  try {
    bearer = (await ensureFreshAccessToken()) ?? getBrowserAccessToken();
  } catch {
    bearer = getBrowserAccessToken();
  }
  let response = await performRequest(path, init, bearer);
  if (response.status === 401) {
    try {
      const refreshed = await ensureFreshAccessToken(Number.POSITIVE_INFINITY);
      if (refreshed && refreshed !== bearer) {
        response = await performRequest(path, init, refreshed);
      }
    } catch { /* fall through */ }
  }
  if (!response.ok) {
    const body = await readJsonOrText(response);
    const msg = body && typeof body === "object" && "error" in body
      ? String((body as { error?: unknown }).error)
      : typeof body === "string"
        ? body
        : `Request failed with status ${response.status}`;
    throw new Error(msg);
  }
  return (await readJsonOrText(response)) as T;
};

/** GET /api/UserEmailConfigs/me — returns null when the user has no config. */
export const getMyEmailConfig = async (): Promise<UserEmailConfig | null> => {
  const raw = await requestBackend<UserEmailConfig | null>(`/api/UserEmailConfigs/me`);
  return raw ?? null;
};

/** PUT /api/UserEmailConfigs/me — upsert. */
export const upsertMyEmailConfig = async (
  payload: UpsertUserEmailConfigPayload,
): Promise<UserEmailConfig> => {
  return requestBackend<UserEmailConfig>(`/api/UserEmailConfigs/me`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

/** DELETE /api/UserEmailConfigs/me — wipes DB row + on-disk files via bridge. */
export const deleteMyEmailConfig = async (): Promise<{ deleted: boolean }> => {
  return requestBackend<{ deleted: boolean }>(`/api/UserEmailConfigs/me`, {
    method: "DELETE",
  });
};

/** POST /api/UserEmailConfigs/me/test — runs `himalaya accounts` via bridge. */
export const testMyEmailConfig = async (): Promise<UserEmailConfigTestResult> => {
  return requestBackend<UserEmailConfigTestResult>(`/api/UserEmailConfigs/me/test`, {
    method: "POST",
  });
};

/** GET /api/UserEmailConfigs/by-company/{companyId} — admin/list view. */
export const listCompanyEmailConfigs = async (
  companyId: number,
): Promise<UserEmailConfig[]> => {
  return requestBackend<UserEmailConfig[]>(`/api/UserEmailConfigs/by-company/${companyId}`);
};

/** Common provider presets to populate the form quickly. */
export const EMAIL_PRESETS = {
  "Hostinger": {
    imapHost: "imap.hostinger.com", imapPort: 993, imapEncryption: "tls",
    smtpHost: "smtp.hostinger.com", smtpPort: 587, smtpEncryption: "start-tls",
  },
  "Gmail": {
    imapHost: "imap.gmail.com", imapPort: 993, imapEncryption: "tls",
    smtpHost: "smtp.gmail.com", smtpPort: 587, smtpEncryption: "start-tls",
  },
  "Outlook / Office 365": {
    imapHost: "outlook.office365.com", imapPort: 993, imapEncryption: "tls",
    smtpHost: "smtp.office365.com", smtpPort: 587, smtpEncryption: "start-tls",
  },
  "Zoho": {
    imapHost: "imap.zoho.com", imapPort: 993, imapEncryption: "tls",
    smtpHost: "smtp.zoho.com", smtpPort: 587, smtpEncryption: "start-tls",
  },
} as const;
