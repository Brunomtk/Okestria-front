// REST API client for the Okestria backend's CronJobs module (back v11+).
// Mirrors the structure of `lib/squads/api.ts` — no GatewayClient here, all
// calls go straight to the Okestria API which then talks to the OpenClaw
// gateway internally.

import { getBrowserAccessToken } from "@/lib/agents/backend-api";
import { getOkestriaApiBaseUrl } from "@/lib/auth/api";
import { ensureFreshAccessToken } from "@/lib/auth/session-client";

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
};

export type RunCronJobInput = {
  onlyIfDue?: boolean;
  systemEventOverride?: string;
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
