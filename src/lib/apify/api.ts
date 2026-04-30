/**
 * v137 — Per-company Apify config + Instagram-scrape client.
 *
 * Pairs with back v79. The back stores the Apify token + caps in the
 * CompanyApifyConfigs table (one row per company). The front never
 * receives the raw token — only a masked preview ("ak_••••XXXX").
 * To rotate, the operator re-types the token in the form.
 *
 * Two surfaces are exposed:
 *  • Config CRUD — `/api/CompanyApifyConfigs/me` (JWT-authed)
 *  • Operator-driven scrape — `/api/InstagramScrape/run` (JWT-authed)
 *
 * Agents call the bridge-token-authed
 * `/api/InstagramScrape/agent/{companyId}/run` directly from inside
 * the OpenClaw runtime — that surface has no front client.
 */
import { getOkestriaApiBaseUrl } from "@/lib/auth/api";
import { ensureFreshAccessToken } from "@/lib/auth/session-client";
import { getBrowserAccessToken } from "@/lib/agents/backend-api";

export type CompanyApifyConfig = {
  id: number;
  companyId: number;
  maskedToken: string;
  tokenConfigured: boolean;
  label: string | null;
  dailyResultsCap: number;
  perCallResultsCap: number;
  resultsConsumedToday: number;
  resultsConsumedTotal: number;
  lastScrapeAtUtc: string | null;
  lastScrapeTarget: string | null;
  lastScrapeResultCount: number | null;
  lastTestSucceeded: boolean | null;
  lastTestedAtUtc: string | null;
  lastTestError: string | null;
  createdDate: string | null;
  updatedDate: string | null;
};

export type UpsertCompanyApifyConfigPayload = {
  /**
   * Apify token. Empty / undefined keeps the previously stored token
   * (so caps can be rotated without re-typing the secret).
   */
  apifyToken?: string;
  label?: string;
  dailyResultsCap: number;
  perCallResultsCap: number;
};

export type CompanyApifyConfigTestResult = {
  ok: boolean;
  error: string | null;
  username: string | null;
  plan: string | null;
  testedAtUtc: string;
};

export type InstagramScrapeRequest = {
  handles?: string[];
  hashtags?: string[];
  directUrls?: string[];
  resultsType?: "posts" | "details" | "comments" | "mentions" | "stories";
  limit?: number;
  persistToVault?: boolean;
};

export type InstagramScrapeItem = {
  id?: string | null;
  type?: string | null;
  ownerUsername?: string | null;
  ownerFullName?: string | null;
  caption?: string | null;
  url?: string | null;
  displayUrl?: string | null;
  videoUrl?: string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  hashtags?: string[] | null;
  mentions?: string[] | null;
  timestamp?: string | null;
  location?: string | null;
  raw?: Record<string, unknown>;
  // Allow any extra fields without a type cast.
  [k: string]: unknown;
};

export type InstagramScrapeResponse = {
  ok: boolean;
  error: string | null;
  runId: string | null;
  datasetId: string | null;
  status: string | null;
  limitApplied: number;
  resultsReturned: number;
  dailyBudgetRemaining: number;
  vaultNotePath: string | null;
  items: InstagramScrapeItem[] | null;
};

const performRequest = async (
  path: string,
  init: RequestInit | undefined,
  bearer: string | null,
): Promise<Response> => {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
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
    const msg =
      body && typeof body === "object" && "error" in body && (body as { error?: unknown }).error
        ? String((body as { error?: unknown }).error)
        : typeof body === "string"
          ? body
          : `Request failed with status ${response.status}`;
    throw new Error(msg);
  }
  return (await readJsonOrText(response)) as T;
};

/** GET /api/CompanyApifyConfigs/me — null when the company has no token. */
export const getMyApifyConfig = async (): Promise<CompanyApifyConfig | null> => {
  const raw = await requestBackend<CompanyApifyConfig | null>(`/api/CompanyApifyConfigs/me`);
  return raw ?? null;
};

/** PUT /api/CompanyApifyConfigs/me — upsert. */
export const upsertMyApifyConfig = async (
  payload: UpsertCompanyApifyConfigPayload,
): Promise<CompanyApifyConfig> =>
  requestBackend<CompanyApifyConfig>(`/api/CompanyApifyConfigs/me`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

/** DELETE /api/CompanyApifyConfigs/me — wipes the row. */
export const deleteMyApifyConfig = async (): Promise<{ deleted: boolean }> =>
  requestBackend<{ deleted: boolean }>(`/api/CompanyApifyConfigs/me`, { method: "DELETE" });

/** POST /api/CompanyApifyConfigs/me/test — calls Apify /v2/users/me. */
export const testMyApifyConfig = async (): Promise<CompanyApifyConfigTestResult> =>
  requestBackend<CompanyApifyConfigTestResult>(`/api/CompanyApifyConfigs/me/test`, { method: "POST" });

/** POST /api/InstagramScrape/run — operator-driven scrape. */
export const runInstagramScrape = async (
  payload: InstagramScrapeRequest,
): Promise<InstagramScrapeResponse> =>
  requestBackend<InstagramScrapeResponse>(`/api/InstagramScrape/run`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
