// REST API client for the Okestria backend's CronJobs module (back v11+).
// Mirrors the structure of `lib/squads/api.ts` — no GatewayClient here, all
// calls go straight to the Okestria API which then talks to the OpenClaw
// gateway internally.

import { getBrowserAccessToken } from "@/lib/agents/backend-api";
import {
  fetchCompanyById,
  fetchCurrentUser,
  fetchUserEmailContext,
  getOkestriaApiBaseUrl,
} from "@/lib/auth/api";
import {
  ensureFreshAccessToken,
  SESSION_COOKIE,
} from "@/lib/auth/session-client";
import { parseStoredSessionCookie } from "@/lib/auth/session-shared";

export type CronJobKind = "one-shot" | "recurring";
export type CronJobSessionMode = "fresh" | "main" | "named";
export type CronJobWakeMode = "now" | "idle" | "next-turn";
export type CronJobDeliveryMode = "announce" | "webhook" | "none";
export type CronJobStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "completed"
  | "failed";

export type CronJobRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled";

/**
 * Base64-encoded file the user attaches to a cron job or squad task. The
 * backend unpacks these into the runtime session and feeds them to the agent
 * alongside any lead context / mission context snapshots.
 *
 * Contract (enforced on the server):
 *   - max 6 files per job
 *   - max 15MB per individual file
 *   - max 25MB total payload
 */
export type CronJobAttachment = {
  filename: string;
  mimeType: string;
  /** Base64 (no data-url prefix). Callers MUST strip `data:*;base64,` from FileReader output. */
  content: string;
  sizeBytes: number;
};

// ── Tools (v28) ──
//
// The "tools" bundle declares which capabilities the OpenClaw runner
// should expose to the agent when the cron fires. The first supported
// tool is `resend_email`: the backend splices in the live Resend API
// key + sender identity + footer banner before dispatching.
//
// ⚠️  We never store credentials (apiKey) on the cron row. The client
// only sends flags + per-job overrides; the backend fills in the key
// from server config at dispatch time.

export type CronEmailToolConfig = {
  enabled: boolean;
  /** Sender address (Resend `from`). Blank = fall back to company email. */
  fromEmail?: string | null;
  /** Display name rendered before the `from` address. Blank = fall back to the cron author. */
  fromName?: string | null;
  /** Reply-To header. Blank = reuse `from`. */
  replyTo?: string | null;
  /** Default subject line template (the agent may override per email). */
  subjectTemplate?: string | null;
  /** Full data URL (data:image/png;base64,…) for the footer banner. Blank = reuse the author's personal footer. */
  footerImageDataUrl?: string | null;
  /** Free-form guidance appended to the tool payload (e.g. "Always sign as Lucas"). */
  instructionsHint?: string | null;
};

export type CronJobToolsConfig = {
  email?: CronEmailToolConfig | null;
};

export type CronJobToolsSummary = {
  emailEnabled: boolean;
  emailFromEmail: string | null;
  emailFromName: string | null;
  hasFooterImage: boolean;
};

export type CronJob = {
  id: number;
  companyId: number;
  createdByUserId: number | null;
  agentId: number | null;
  squadId: string | null;
  name: string;
  description: string | null;
  kind: CronJobKind;
  cronExpression: string | null;
  timezone: string | null;
  runAtUtc: string | null;
  sessionMode: CronJobSessionMode;
  sessionKey: string | null;
  systemEvent: string | null;
  wakeMode: CronJobWakeMode;
  deliveryMode: CronJobDeliveryMode;
  webhookUrl: string | null;
  webhookToken: string | null;
  deleteAfterRun: boolean;
  status: CronJobStatus;
  openClawJobId: string | null;
  nextRunAtUtc: string | null;
  lastRunAtUtc: string | null;
  lastRunStatus: string | null;
  runCount: number;
  failureCount: number;
  lastErrorMessage: string | null;
  metadataJson: string | null;
  leadId: number | null;
  leadGenerationJobId: number | null;
  leadContextJson: string | null;
  attachmentsJson: string | null;
  /** v28: capabilities bundle. Credentials are never echoed back by the server. */
  tools: CronJobToolsConfig | null;
  /** Compact summary rendered as a badge in the list / detail drawer. */
  toolsSummary: CronJobToolsSummary | null;
  createdDate: string;
  updatedDate: string | null;
};

export type CronJobListItem = {
  id: number;
  companyId: number;
  name: string;
  description: string | null;
  kind: CronJobKind;
  status: CronJobStatus;
  cronExpression: string | null;
  timezone: string | null;
  runAtUtc: string | null;
  nextRunAtUtc: string | null;
  lastRunAtUtc: string | null;
  lastRunStatus: string | null;
  runCount: number;
  failureCount: number;
  agentId: number | null;
  squadId: string | null;
  deliveryMode: CronJobDeliveryMode;
  leadId: number | null;
  leadGenerationJobId: number | null;
  hasAttachments: boolean;
  /** v28: present when the job has at least one tool configured. */
  toolsSummary: CronJobToolsSummary | null;
  createdDate: string;
  updatedDate: string | null;
};

export type CronJobRun = {
  id: number;
  cronJobId: number;
  runNumber: number;
  status: CronJobRunStatus;
  triggerSource: string;
  scheduledAtUtc: string | null;
  startedAtUtc: string | null;
  finishedAtUtc: string | null;
  openClawTaskId: string | null;
  openClawRunId: string | null;
  sessionKey: string | null;
  deliveryMode: CronJobDeliveryMode | null;
  httpStatus: number | null;
  resultText: string | null;
  resultPayloadJson: string | null;
  errorMessage: string | null;
  createdDate: string;
};

export type CreateCronJobInput = {
  companyId: number;
  agentId?: number | null;
  squadId?: string | null;
  name: string;
  description?: string | null;
  kind: CronJobKind;
  cronExpression?: string | null;
  timezone?: string | null;
  runAtUtc?: string | null;
  sessionMode: CronJobSessionMode;
  sessionKey?: string | null;
  systemEvent: string;
  wakeMode: CronJobWakeMode;
  deliveryMode: CronJobDeliveryMode;
  webhookUrl?: string | null;
  webhookToken?: string | null;
  deleteAfterRun: boolean;
  metadataJson?: string | null;
  /** Optional lead context anchor — the backend resolves the lead + attaches a
   *  [OKESTRIA_LEAD_CHAT_CONTEXT] block to every run. */
  leadId?: number | null;
  /** Optional mission (LeadGenerationJob) context anchor — same mechanism,
   *  scoped to the full generation instead of a single lead. */
  leadGenerationJobId?: number | null;
  /** Raw JSON string for custom context (escape hatch — rarely used from UI). */
  leadContextJson?: string | null;
  /** Max 6 files / 15MB each / 25MB total. */
  attachments?: CronJobAttachment[] | null;
  /** v28: tools bundle. Null/undefined = no tools requested. */
  tools?: CronJobToolsConfig | null;
};

export type UpdateCronJobInput = {
  name?: string;
  description?: string | null;
  cronExpression?: string | null;
  timezone?: string | null;
  runAtUtc?: string | null;
  sessionMode?: CronJobSessionMode;
  sessionKey?: string | null;
  systemEvent?: string;
  wakeMode?: CronJobWakeMode;
  deliveryMode?: CronJobDeliveryMode;
  webhookUrl?: string | null;
  webhookToken?: string | null;
  deleteAfterRun?: boolean;
  metadataJson?: string | null;
  agentId?: number | null;
  squadId?: string | null;
  clearAgent?: boolean;
  clearSquad?: boolean;
  clearWebhookToken?: boolean;
  /** v28: tools patch. Null/undefined leaves the current config untouched; clearTools wipes it. */
  tools?: CronJobToolsConfig | null;
  clearTools?: boolean;
};

export type RunCronJobInput = {
  onlyIfDue?: boolean;
  systemEventOverride?: string;
};

/**
 * Resolved email-tool defaults for the current user, returned by
 * `GET /api/CronJobs/tools/email-defaults?companyId=…`. The UI calls this
 * once when the operator first opens the "new cron" form so it can prefill
 * the Email tool card with the teammate's real email / name / footer banner.
 *
 * Credentials (Resend apiKey) are never surfaced — only the `resendConfigured`
 * flag so the UI can warn when the admin hasn't wired Resend yet.
 */
export type CronEmailToolDefaults = {
  resendConfigured: boolean;
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
  footerImageDataUrl: string | null;
  footerImageFileName: string | null;
  note: string | null;
};

const normalizeErrorText = async (response: Response) => {
  const text = (await response.text()).trim();
  return text.replace(/^"|"$/g, "") || `Request failed with status ${response.status}`;
};

const performCronFetch = async (
  path: string,
  init: RequestInit | undefined,
  bearer: string | null,
): Promise<Response> => {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (bearer) {
    headers.set("Authorization", `Bearer ${bearer}`);
  }
  return fetch(`${getOkestriaApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
};

const requestBackendJson = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  // Proactively refresh the access token if it's close to expiry so long-lived
  // cron editing sessions don't get booted mid-action.
  let bearer: string | null = null;
  try {
    bearer = (await ensureFreshAccessToken()) ?? getBrowserAccessToken();
  } catch {
    bearer = getBrowserAccessToken();
  }

  let response = await performCronFetch(path, init, bearer);

  // If the server still rejects us with 401, force a refresh and retry once.
  if (response.status === 401) {
    try {
      const refreshed = await ensureFreshAccessToken(Number.POSITIVE_INFINITY);
      if (refreshed && refreshed !== bearer) {
        response = await performCronFetch(path, init, refreshed);
      }
    } catch {
      // swallow — fall through to the error path below
    }
  }

  if (!response.ok) {
    throw new Error(await normalizeErrorText(response));
  }

  // Some endpoints (pause/resume/cancel) return 204 No Content.
  if (response.status === 204) return undefined as unknown as T;
  const text = await response.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
};

const escapeQuery = (value: string) => encodeURIComponent(value);

// ── Gateway diagnostics (v43) ─────────────────────────────────────
// Two endpoints the cron modal uses to help operators unstick
// misconfigured cross-VPS setups without shelling into the server:
//   • /gateway-config tells you what URLs/tokens the backend has loaded
//     and what callback URL OpenClaw needs to POST back to.
//   • /test-gateway fires a real synthetic POST to /hooks/agent and
//     echoes the status + body so you can see exactly why a dispatch
//     isn't reaching the gateway.

export type CronGatewayHealth = {
  status: string;
  lastCheckedUtc?: string | null;
  lastLatencyMs?: number | null;
  lastHttpStatus?: number | null;
  lastError?: string | null;
  dispatchPermitted?: boolean;
};

export type CronGatewayConfig = {
  hooksConfigured: boolean;
  hooksBaseUrl?: string | null;
  hasHookToken: boolean;
  gatewayBaseUrl?: string | null;
  hasUpstreamToken: boolean;
  expectedCallbackUrl?: string | null;
  health?: CronGatewayHealth | null;
};

export type CronGatewayTestResult = {
  ok: boolean;
  httpStatus: number;
  dispatchUrl: string;
  resolvedAgentId?: string | null;
  agentResolutionError?: string | null;
  responseBodyPreview?: string | null;
  error?: string | null;
  latencyMs: number;
  checkedAtUtc: string;
};

export const fetchCronGatewayConfig = async (): Promise<CronGatewayConfig> => {
  return requestBackendJson<CronGatewayConfig>(`/api/CronJobs/gateway-config`, {
    method: "GET",
  });
};

export const testCronGateway = async (
  agentId?: number | null,
): Promise<CronGatewayTestResult> => {
  const qs = agentId && agentId > 0 ? `?agentId=${agentId}` : "";
  return requestBackendJson<CronGatewayTestResult>(
    `/api/CronJobs/test-gateway${qs}`,
    { method: "POST" },
  );
};

export const fetchCronJobs = async (
  companyId: number,
  filters?: { kind?: CronJobKind; status?: CronJobStatus },
): Promise<CronJobListItem[]> => {
  const params = new URLSearchParams();
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  const path = `/api/CronJobs/by-company/${companyId}${qs ? `?${qs}` : ""}`;
  return requestBackendJson<CronJobListItem[]>(path, { method: "GET" });
};

export const fetchCronJob = async (jobId: number): Promise<CronJob> => {
  return requestBackendJson<CronJob>(`/api/CronJobs/${jobId}`, { method: "GET" });
};

export const createCronJob = async (input: CreateCronJobInput): Promise<CronJob> => {
  return requestBackendJson<CronJob>(`/api/CronJobs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const updateCronJob = async (
  jobId: number,
  input: UpdateCronJobInput,
): Promise<CronJob> => {
  return requestBackendJson<CronJob>(`/api/CronJobs/${jobId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
};

export const pauseCronJob = async (jobId: number): Promise<CronJob> => {
  return requestBackendJson<CronJob>(`/api/CronJobs/${jobId}/pause`, {
    method: "POST",
  });
};

export const resumeCronJob = async (jobId: number): Promise<CronJob> => {
  return requestBackendJson<CronJob>(`/api/CronJobs/${jobId}/resume`, {
    method: "POST",
  });
};

export const cancelCronJob = async (jobId: number): Promise<CronJob> => {
  return requestBackendJson<CronJob>(`/api/CronJobs/${jobId}/cancel`, {
    method: "POST",
  });
};

export const deleteCronJob = async (jobId: number): Promise<void> => {
  await requestBackendJson<void>(`/api/CronJobs/${jobId}`, { method: "DELETE" });
};

export const triggerCronJobRun = async (
  jobId: number,
  input?: RunCronJobInput,
): Promise<CronJobRun | null> => {
  return requestBackendJson<CronJobRun | null>(`/api/CronJobs/${jobId}/run`, {
    method: "POST",
    body: JSON.stringify(input ?? {}),
  });
};

export const fetchCronJobRuns = async (
  jobId: number,
  take: number = 25,
): Promise<CronJobRun[]> => {
  const safeTake = Math.max(1, Math.min(200, Math.floor(take)));
  return requestBackendJson<CronJobRun[]>(
    `/api/CronJobs/${jobId}/runs?take=${escapeQuery(String(safeTake))}`,
    { method: "GET" },
  );
};

/**
 * Fetches the resolved email-tool defaults for the current user scoped to
 * `companyId`. Call this lazily — only when the operator flips the email
 * tool on — so we don't burn a round-trip for every cron modal open.
 */
export const fetchEmailToolDefaults = async (
  companyId: number,
): Promise<CronEmailToolDefaults> => {
  return requestBackendJson<CronEmailToolDefaults>(
    `/api/CronJobs/tools/email-defaults?companyId=${escapeQuery(String(companyId))}`,
    { method: "GET" },
  );
};

/**
 * UI-safe view of the platform-level Resend configuration. The backend
 * endpoint (`GET /api/CronJobs/tools/resend-config`) also returns the raw
 * `apiKey` so the OpenClaw gateway can call Resend directly, but the key
 * MUST NOT surface in a browser component — we strip it at the network
 * boundary and only hand the UI the `enabled` / `baseUrl` pair.
 */
export type ResendPlatformStatus = {
  enabled: boolean;
  baseUrl: string;
};

/**
 * Fetches the platform's live Resend status (enabled + baseUrl) from
 * `GET /api/CronJobs/tools/resend-config`. The raw API key that the
 * backend ALSO returns on this endpoint is intentionally dropped before
 * the value is handed to the UI — only OpenClaw (server-to-server) should
 * ever see it, and this helper exists solely so the modal can render a
 * trustworthy "Resend configured" badge without guessing.
 */
export const fetchResendPlatformStatus = async (): Promise<ResendPlatformStatus> => {
  const raw = await requestBackendJson<{
    enabled?: boolean;
    baseUrl?: string;
    // The backend also returns `apiKey` here — we ignore it on purpose.
  }>(`/api/CronJobs/tools/resend-config`, { method: "GET" });
  return {
    enabled: Boolean(raw?.enabled),
    baseUrl:
      typeof raw?.baseUrl === "string" && raw.baseUrl.trim().length > 0
        ? raw.baseUrl.trim()
        : "https://api.resend.com",
  };
};

// ── Client-side resolver (resilient fallback) ──────────────────────────
//
// The old flow assumed the v29 backend endpoint `/tools/email-defaults` was
// always reachable. In practice environments rotate independently and the
// operator would see a blank form whenever that endpoint wasn't yet deployed
// or returned an error. To make the email-tool card trustworthy we resolve
// the defaults from multiple sources and merge them in order of quality:
//
//   1. The new backend endpoint (authoritative — carries resendConfigured
//      and the operator's actual email context as resolved server-side).
//   2. /api/Users/me + /api/Companies/by-company/{id} + /api/Users/{id}/email-context
//      (already used elsewhere in the app — works even without v29).
//   3. The `okestria_session` browser cookie (offline/instant fallback that
//      always has at least the user's name + email).
//
// Any source failing is non-fatal; we fall through to the next one. The
// returned `note` surfaces configuration problems (Resend unconfigured,
// company without an email, etc.) so the UI can show a warning instead of
// pretending everything is fine.

const readSessionCookieIdentity = (): {
  userId: number | null;
  companyId: number | null;
  name: string | null;
  email: string | null;
} => {
  if (typeof document === "undefined") {
    return { userId: null, companyId: null, name: null, email: null };
  }
  const needle = `${SESSION_COOKIE}=`;
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(needle));
  if (!entry) {
    return { userId: null, companyId: null, name: null, email: null };
  }
  const raw = decodeURIComponent(entry.slice(needle.length));
  const parsed = parseStoredSessionCookie(raw);
  return {
    userId: parsed?.userId ?? null,
    companyId: parsed?.companyId ?? null,
    name: parsed?.name ?? null,
    email: parsed?.email ?? null,
  };
};

const firstNonBlank = (
  ...candidates: Array<string | null | undefined>
): string | null => {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c;
  }
  return null;
};

/**
 * Best-effort resolver that guarantees a populated defaults object even if
 * the backend endpoint is unavailable. The UI can therefore *always* show
 * the operator their own email / name prefilled — no more "empty form"
 * regressions when a single service is down.
 */
export const resolveEmailToolDefaults = async (
  companyId: number,
): Promise<CronEmailToolDefaults> => {
  const session = readSessionCookieIdentity();

  // Kick off every source in parallel — whoever answers first wins for its
  // own field, and the rest fill in the gaps.
  const bearer =
    (await ensureFreshAccessToken().catch(() => null)) ??
    getBrowserAccessToken();

  const endpointPromise = fetchEmailToolDefaults(companyId).catch(
    () => null as CronEmailToolDefaults | null,
  );

  // Authoritative "is Resend wired on the server?" signal. The
  // email-defaults endpoint also exposes a `resendConfigured` flag, but
  // the dedicated status endpoint is the source of truth — it reads the
  // platform settings directly on every call instead of deriving the
  // answer from a user/company row. We silently fall back to the
  // defaults-endpoint flag when this call fails.
  const resendStatusPromise = fetchResendPlatformStatus().catch(
    () => null as ResendPlatformStatus | null,
  );

  const userPromise = bearer
    ? fetchCurrentUser(bearer).catch(() => null)
    : Promise.resolve(null);

  const companyPromise = bearer
    ? fetchCompanyById(companyId, bearer).catch(() => null)
    : Promise.resolve(null);

  const userId = session.userId;
  const userEmailCtxPromise =
    bearer && userId
      ? fetchUserEmailContext(userId, bearer).catch(() => null)
      : Promise.resolve(null);

  const [endpoint, resendStatus, currentUser, company, userEmailCtx] =
    await Promise.all([
      endpointPromise,
      resendStatusPromise,
      userPromise,
      companyPromise,
      userEmailCtxPromise,
    ]);

  const resolvedUserId = userId ?? currentUser?.userId ?? null;

  // Footer: prefer the new endpoint → the user's per-user footer → the
  // company-level legacy footer. Never a hardcoded asset.
  const resolvedFooterDataUrl =
    firstNonBlank(
      endpoint?.footerImageDataUrl,
      userEmailCtx?.footerImageBase64,
      company?.emailContextFooterImageBase64,
    ) ?? null;

  const resolvedFooterName =
    endpoint?.footerImageFileName ??
    (resolvedFooterDataUrl
      ? currentUser?.name
        ? `${currentUser.name} — footer`
        : session.name
          ? `${session.name} — footer`
          : "Your profile footer"
      : null);

  // From email: endpoint → signed-in user email (JWT/session identity).
  //
  // We DELIBERATELY skip `company.email` here. The company record frequently
  // holds the admin's personal address (e.g. brunomendestk@gmail.com) and
  // surfacing that as the "From" default would leak the wrong identity on
  // the outgoing message. If neither the endpoint nor the logged-in user
  // provides an email we return null so OpenClaw can pick a verified sender
  // at dispatch time.
  const resolvedFromEmail =
    firstNonBlank(
      endpoint?.fromEmail,
      currentUser?.email,
      session.email,
    ) ?? null;

  // From name: endpoint → signed-in user name → company name → "Okestria".
  const resolvedFromName =
    firstNonBlank(
      endpoint?.fromName,
      currentUser?.name,
      session.name,
      company?.name,
    ) ?? "Okestria";

  // Reply-To is no longer an operator-editable field. OpenClaw resolves
  // it at dispatch from the verified Resend sender, so we pass `null`
  // through the defaults payload — the UI does not read it, and any
  // downstream consumer that still inspects the field will correctly
  // treat "null" as "use whatever the backend decides".
  const resolvedReplyTo: string | null = null;

  // Authoritative Resend status: prefer the dedicated status endpoint;
  // fall back to the email-defaults flag; otherwise stay optimistic so
  // we don't block the form on a transient network hiccup.
  const resolvedResendConfigured =
    resendStatus?.enabled ?? endpoint?.resendConfigured ?? true;

  // Surface configuration problems to the UI. The endpoint's note wins
  // (it has server-side visibility); otherwise we synthesize a hint when
  // key pieces are missing.
  const note =
    endpoint?.note ??
    (!resolvedFooterDataUrl && resolvedUserId
      ? "Tip: upload a footer image in your profile to personalize the email signature."
      : null);

  return {
    resendConfigured: resolvedResendConfigured,
    fromEmail: resolvedFromEmail,
    fromName: resolvedFromName,
    replyTo: resolvedReplyTo,
    footerImageDataUrl: resolvedFooterDataUrl,
    footerImageFileName: resolvedFooterName,
    note,
  };
};

// ── UI helpers ──

export const KIND_LABEL: Record<CronJobKind, string> = {
  "one-shot": "Run once",
  recurring: "Recurring",
};

export const STATUS_LABEL: Record<CronJobStatus, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  completed: "Completed",
  failed: "Failed",
};

export const STATUS_COLOR: Record<CronJobStatus, string> = {
  active: "#22d3ee",
  paused: "#facc15",
  cancelled: "#94a3b8",
  completed: "#22c55e",
  failed: "#ef4444",
};

export const SESSION_LABEL: Record<CronJobSessionMode, string> = {
  fresh: "Fresh session per run",
  main: "Main session",
  named: "Named session",
};

export const WAKE_LABEL: Record<CronJobWakeMode, string> = {
  now: "Wake immediately",
  idle: "Only when idle",
  "next-turn": "Wait for next turn",
};

export const DELIVERY_LABEL: Record<CronJobDeliveryMode, string> = {
  announce: "Announce in chat",
  webhook: "Webhook callback",
  none: "Silent (no delivery)",
};

export const formatCronDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
};

export const formatRelativeTime = (value: string | null | undefined): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const absMs = Math.abs(diffMs);
  const seconds = Math.round(absMs / 1000);
  if (seconds < 45) return diffMs >= 0 ? "moments ago" : "in a moment";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return diffMs >= 0 ? `${minutes}m ago` : `in ${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return diffMs >= 0 ? `${hours}h ago` : `in ${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return diffMs >= 0 ? `${days}d ago` : `in ${days}d`;
  return formatCronDate(value);
};
