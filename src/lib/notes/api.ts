/**
 * v135 — Client for the company-scoped Obsidian-compatible notes vault.
 *
 * Mirrors the shape of `lib/squads/api.ts` and `lib/cron/api.ts`:
 * - All requests are JWT-authed via the existing token-refresh helper.
 * - The back derives the operator's `companyId` from the JWT claims, so
 *   we never put it in the URL — single-tenant boundary owned server-side.
 * - Errors throw with the back's normalized message.
 */

import { getBrowserAccessToken } from "@/lib/agents/backend-api";
import { getOkestriaApiBaseUrl } from "@/lib/auth/api";
import { ensureFreshAccessToken } from "@/lib/auth/session-client";

export type CompanyNote = {
  path: string;
  title: string;
  folder: string;
  sizeBytes: number;
  lastModifiedUtc: string;
  eTag?: string | null;
};

export type CompanyNoteContent = CompanyNote & {
  body: string;
};

export type CompanyNoteTree = {
  companyId: number;
  vaultName: string;
  notes: CompanyNote[];
  folders: string[];
  totalCount: number;
};

const normalizeErrorText = async (response: Response): Promise<string> => {
  const text = (await response.text()).trim();
  return text.replace(/^"|"$/g, "") || `Request failed with status ${response.status}`;
};

const performRequest = async (
  path: string,
  init: RequestInit | undefined,
  token: string | null,
): Promise<Response> => {
  const headers = new Headers(init?.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${getOkestriaApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
};

const requestJson = async <T>(
  path: string,
  init?: RequestInit,
  token?: string | null,
): Promise<T> => {
  let resolved: string | null | undefined = token;
  if (!resolved) {
    resolved = (await ensureFreshAccessToken()) ?? getBrowserAccessToken();
  }
  let response = await performRequest(path, init, resolved ?? null);
  if (response.status === 401 && !token) {
    const refreshed = await ensureFreshAccessToken(Number.POSITIVE_INFINITY);
    if (refreshed && refreshed !== resolved) {
      response = await performRequest(path, init, refreshed);
    }
  }
  if (!response.ok) throw new Error(await normalizeErrorText(response));
  return (await response.json()) as T;
};

const requestVoid = async (
  path: string,
  init?: RequestInit,
  token?: string | null,
): Promise<void> => {
  let resolved: string | null | undefined = token;
  if (!resolved) {
    resolved = (await ensureFreshAccessToken()) ?? getBrowserAccessToken();
  }
  let response = await performRequest(path, init, resolved ?? null);
  if (response.status === 401 && !token) {
    const refreshed = await ensureFreshAccessToken(Number.POSITIVE_INFINITY);
    if (refreshed && refreshed !== resolved) {
      response = await performRequest(path, init, refreshed);
    }
  }
  if (!response.ok) throw new Error(await normalizeErrorText(response));
};

export const fetchNotesTree = async (token?: string | null): Promise<CompanyNoteTree> =>
  requestJson<CompanyNoteTree>("/api/CompanyNotes/tree", undefined, token);

export const fetchNote = async (
  path: string,
  token?: string | null,
): Promise<CompanyNoteContent | null> => {
  try {
    return await requestJson<CompanyNoteContent>(
      `/api/CompanyNotes/note?path=${encodeURIComponent(path)}`,
      undefined,
      token,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/404|not\s*found/i.test(message)) return null;
    throw err;
  }
};

export const upsertNote = async (
  payload: { path: string; body: string },
  token?: string | null,
): Promise<CompanyNote> =>
  requestJson<CompanyNote>(
    "/api/CompanyNotes/note",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );

export const deleteNote = async (path: string, token?: string | null): Promise<void> =>
  requestVoid(
    `/api/CompanyNotes/note?path=${encodeURIComponent(path)}`,
    { method: "DELETE" },
    token,
  );

// ── v136 — Graph view (Obsidian-style brain) ────────────────────────

export type CompanyNoteGraphNode = {
  id: string;
  kind: "note" | "tag";
  label: string;
  folder?: string | null;
  degree: number;
};

export type CompanyNoteGraphLink = {
  source: string;
  target: string;
  kind: "wiki" | "tag";
};

export type CompanyNoteGraph = {
  companyId: number;
  vaultName: string;
  nodes: CompanyNoteGraphNode[];
  links: CompanyNoteGraphLink[];
  tags: string[];
  folders: string[];
};

export const fetchNotesGraph = async (token?: string | null): Promise<CompanyNoteGraph> =>
  requestJson<CompanyNoteGraph>("/api/CompanyNotes/graph", undefined, token);
