import { getOkestriaApiBaseUrl } from "@/lib/auth/api";
import { getBrowserAccessToken, getBrowserCompanyId } from "@/lib/agents/backend-api";

export type LeadGenerationJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type LeadGenerationJob = {
  id: number;
  companyId: number;
  requestedByUserId: number | null;
  agentId: number;
  agentName?: string | null;
  squadId?: number | null;
  title: string;
  query: string;
  region?: string | null;
  prompt?: string | null;
  mode: string;
  status: LeadGenerationJobStatus;
  currentStage: string;
  maxResults: number;
  progressPercent: number;
  totalFound: number;
  totalEnriched: number;
  totalInserted: number;
  totalDuplicates: number;
  totalFailed: number;
  errorMessage?: string | null;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  createdDate?: string | null;
  updatedDate?: string | null;
};

export type LeadGenerationJobPayload = {
  companyId: number;
  agentId: number;
  title: string;
  query: string;
  region?: string;
  prompt?: string;
  mode?: string;
  maxResults: number;
};

export type LeadEmailBatchJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type LeadEmailBatchJob = {
  id: number;
  companyId: number;
  requestedByUserId: number | null;
  sourceLeadJobId?: number | null;
  title: string;
  status: LeadEmailBatchJobStatus;
  currentStage: string;
  progressPercent: number;
  totalSelected: number;
  totalEligible: number;
  totalSent: number;
  totalFailed: number;
  senderName: string;
  senderEmail: string;
  replyTo?: string | null;
  subjectTemplate: string;
  introText?: string | null;
  errorMessage?: string | null;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  createdDate?: string | null;
  updatedDate?: string | null;
};

export type CreateLeadEmailBatchPayload = {
  companyId: number;
  sourceLeadJobId?: number | null;
  leadIds?: number[];
  title?: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string;
  subjectTemplate: string;
  introText?: string;
};


export type SendSingleLeadEmailPayload = {
  toEmail?: string;
  subject?: string;
  introText?: string;
  replyTo?: string;
  generateInsightsIfMissing?: boolean;
  forceRegenerateInsights?: boolean;
  preferredModel?: string | null;
};

export type SendSingleLeadEmailResult = {
  leadId: number;
  companyId: number;
  toEmail: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  providerMessageId?: string | null;
  insightsGeneratedWithAi?: boolean;
  insightsUsedFallback?: boolean;
  insightsGenerationStatus?: string | null;
};


export type LeadChatPrimePayload = {
  agentId?: number | null;
  message: string;
  model?: string | null;
  thinking?: string | null;
  timeoutSeconds?: number;
  usePersistentSession?: boolean;
  deliver?: boolean;
  channel?: string | null;
  to?: string | null;
};

export type LeadChatPrimeResult = {
  sourceType: string;
  sourceId: number;
  companyId: number;
  agentId: number;
  agentSlug: string;
  agentName: string;
  sessionKey?: string | null;
  persistentSessionRequested: boolean;
  persistentSessionApplied: boolean;
  totalLeadCount: number;
  includedLeadCount: number;
  contextTruncated: boolean;
  hookAccepted: boolean;
  hookStatusCode: number;
  runId?: string | null;
  taskId?: string | null;
  result?: string | null;
  promptPreview: string;
  warning?: string | null;
  rawResponse?: string | null;
};

export type LeadSummary = {
  id: number;
  companyId: number;
  businessName: string;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  ptxFit?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  suggestedProduct?: string | null;
  outreachInsight?: string | null;
  outreachScript?: string | null;
  outreachEmailHtml?: string | null;
  notes?: string | null;
  description?: string | null;
  insightsGeneratedWithAi?: boolean | null;
  insightsUsedFallback?: boolean | null;
  insightsGenerationStatus?: string | null;
  insightsWarningCode?: string | null;
  insightsWarningMessage?: string | null;
};

const STORAGE_KEY = "okestria.leadOps.jobs";

const safeJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text as unknown;
  }
};

const requestBackend = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = getBrowserAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getOkestriaApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await safeJson(response);
    const message =
      body && typeof body === "object" && "error" in body && typeof (body as { error?: unknown }).error === "string"
        ? String((body as { error?: unknown }).error)
        : typeof body === "string"
          ? body
          : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (await safeJson(response)) as T;
};

const parseNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const parseString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const pick = (entry: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    if (key in entry) return entry[key];
  }
  return undefined;
};

const normalizeJob = (value: unknown): LeadGenerationJob | null => {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const id = parseNumber(pick(entry, "id", "Id"), Number.NaN);
  if (!Number.isFinite(id)) return null;
  const companyId = parseNumber(pick(entry, "companyId", "CompanyId"), getBrowserCompanyId() ?? 0);
  return {
    id,
    companyId,
    requestedByUserId: parseNumber(pick(entry, "requestedByUserId", "RequestedByUserId"), NaN) || null,
    agentId: parseNumber(pick(entry, "agentId", "AgentId"), 0),
    agentName: parseString(pick(entry, "agentName", "AgentName")),
    squadId: parseNumber(pick(entry, "squadId", "SquadId"), NaN) || null,
    title: parseString(pick(entry, "title", "Title")) ?? "Lead generation run",
    query: parseString(pick(entry, "query", "Query")) ?? "",
    region: parseString(pick(entry, "region", "Region")),
    prompt: parseString(pick(entry, "prompt", "Prompt")),
    mode: parseString(pick(entry, "mode", "Mode")) ?? "agent-background",
    status: (parseString(pick(entry, "status", "Status"))?.toLowerCase() as LeadGenerationJobStatus) ?? "queued",
    currentStage: parseString(pick(entry, "currentStage", "CurrentStage")) ?? "Queued",
    maxResults: parseNumber(pick(entry, "maxResults", "MaxResults"), 0),
    progressPercent: parseNumber(pick(entry, "progressPercent", "ProgressPercent"), 0),
    totalFound: parseNumber(pick(entry, "totalFound", "TotalFound"), 0),
    totalEnriched: parseNumber(pick(entry, "totalEnriched", "TotalEnriched"), 0),
    totalInserted: parseNumber(pick(entry, "totalInserted", "TotalInserted"), 0),
    totalDuplicates: parseNumber(pick(entry, "totalDuplicates", "TotalDuplicates"), 0),
    totalFailed: parseNumber(pick(entry, "totalFailed", "TotalFailed"), 0),
    errorMessage: parseString(pick(entry, "errorMessage", "ErrorMessage")),
    startedAtUtc: parseString(pick(entry, "startedAtUtc", "StartedAtUtc")),
    finishedAtUtc: parseString(pick(entry, "finishedAtUtc", "FinishedAtUtc")),
    createdDate: parseString(pick(entry, "createdDate", "CreatedDate")),
    updatedDate: parseString(pick(entry, "updatedDate", "UpdatedDate")),
  };
};

const normalizeLead = (value: unknown): LeadSummary | null => {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const id = parseNumber(pick(entry, "id", "Id"), Number.NaN);
  if (!Number.isFinite(id)) return null;
  const owner = parseString(pick(entry, "owner", "Owner"));
  const ownerParts = owner ? owner.split(/\s+/).filter(Boolean) : [];
  return {
    id,
    companyId: parseNumber(pick(entry, "companyId", "CompanyId"), getBrowserCompanyId() ?? 0),
    businessName: parseString(pick(entry, "businessName", "BusinessName")) ?? parseString(pick(entry, "name", "Name")) ?? `Lead ${id}`,
    ownerFirstName: parseString(pick(entry, "ownerFirstName", "OwnerFirstName")) ?? ownerParts[0] ?? null,
    ownerLastName: parseString(pick(entry, "ownerLastName", "OwnerLastName")) ?? (ownerParts.length > 1 ? ownerParts.slice(1).join(" ") : null),
    category: parseString(pick(entry, "category", "Category")),
    city: parseString(pick(entry, "city", "City")),
    state: parseString(pick(entry, "state", "State")),
    address: parseString(pick(entry, "address", "Address")),
    website: parseString(pick(entry, "website", "Website")),
    email: parseString(pick(entry, "email", "Email")),
    phone: parseString(pick(entry, "phone", "Phone")),
    status: parseString(pick(entry, "status", "Status")),
    ptxFit: parseString(pick(entry, "ptxFit", "PtxFit")),
    rating: typeof pick(entry, "rating", "Rating") === "number" ? (pick(entry, "rating", "Rating") as number) : null,
    reviewCount: parseNumber(pick(entry, "reviewCount", "ReviewCount"), NaN) || null,
    suggestedProduct: parseString(pick(entry, "suggestedProduct", "SuggestedProduct")),
    outreachInsight: parseString(pick(entry, "outreachInsight", "OutreachInsight")),
    outreachScript: parseString(pick(entry, "outreachScript", "OutreachScript")),
    outreachEmailHtml: parseString(pick(entry, "outreachEmailHtml", "OutreachEmailHtml")),
    notes: parseString(pick(entry, "notes", "Notes")),
    description: parseString(pick(entry, "description", "Description")),
    insightsGeneratedWithAi: typeof pick(entry, "insightsGeneratedWithAi", "InsightsGeneratedWithAi") === "boolean" ? (pick(entry, "insightsGeneratedWithAi", "InsightsGeneratedWithAi") as boolean) : null,
    insightsUsedFallback: typeof pick(entry, "insightsUsedFallback", "InsightsUsedFallback") === "boolean" ? (pick(entry, "insightsUsedFallback", "InsightsUsedFallback") as boolean) : null,
    insightsGenerationStatus: parseString(pick(entry, "insightsGenerationStatus", "InsightsGenerationStatus")),
    insightsWarningCode: parseString(pick(entry, "insightsWarningCode", "InsightsWarningCode")),
    insightsWarningMessage: parseString(pick(entry, "insightsWarningMessage", "InsightsWarningMessage")),
  };
};


const normalizeEmailBatchJob = (value: unknown): LeadEmailBatchJob | null => {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const id = parseNumber(pick(entry, "id", "Id"), Number.NaN);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    companyId: parseNumber(pick(entry, "companyId", "CompanyId"), getBrowserCompanyId() ?? 0),
    requestedByUserId: parseNumber(pick(entry, "requestedByUserId", "RequestedByUserId"), NaN) || null,
    sourceLeadJobId: parseNumber(pick(entry, "sourceLeadJobId", "SourceLeadJobId"), NaN) || null,
    title: parseString(pick(entry, "title", "Title")) ?? "Lead email batch",
    status: (parseString(pick(entry, "status", "Status"))?.toLowerCase() as LeadEmailBatchJobStatus) ?? "queued",
    currentStage: parseString(pick(entry, "currentStage", "CurrentStage")) ?? "Queued",
    progressPercent: parseNumber(pick(entry, "progressPercent", "ProgressPercent"), 0),
    totalSelected: parseNumber(pick(entry, "totalSelected", "TotalSelected"), 0),
    totalEligible: parseNumber(pick(entry, "totalEligible", "TotalEligible"), 0),
    totalSent: parseNumber(pick(entry, "totalSent", "TotalSent"), 0),
    totalFailed: parseNumber(pick(entry, "totalFailed", "TotalFailed"), 0),
    senderName: parseString(pick(entry, "senderName", "SenderName")) ?? "",
    senderEmail: parseString(pick(entry, "senderEmail", "SenderEmail")) ?? "",
    replyTo: parseString(pick(entry, "replyTo", "ReplyTo")),
    subjectTemplate: parseString(pick(entry, "subjectTemplate", "SubjectTemplate")) ?? "",
    introText: parseString(pick(entry, "introText", "IntroText")),
    errorMessage: parseString(pick(entry, "errorMessage", "ErrorMessage")),
    startedAtUtc: parseString(pick(entry, "startedAtUtc", "StartedAtUtc")),
    finishedAtUtc: parseString(pick(entry, "finishedAtUtc", "FinishedAtUtc")),
    createdDate: parseString(pick(entry, "createdDate", "CreatedDate")),
    updatedDate: parseString(pick(entry, "updatedDate", "UpdatedDate")),
  };
};

const readLocalJobs = (): LeadGenerationJob[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeJob).filter((value): value is LeadGenerationJob => Boolean(value));
  } catch {
    return [];
  }
};

const writeLocalJobs = (jobs: LeadGenerationJob[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
};

const buildFallbackJob = (payload: LeadGenerationJobPayload): LeadGenerationJob => {
  const now = new Date().toISOString();
  return {
    id: Date.now(),
    companyId: payload.companyId,
    requestedByUserId: null,
    agentId: payload.agentId,
    title: payload.title,
    query: payload.query,
    region: payload.region ?? null,
    prompt: payload.prompt ?? null,
    mode: payload.mode ?? "background",
    status: "queued",
    currentStage: "Queued locally",
    maxResults: payload.maxResults,
    progressPercent: 0,
    totalFound: 0,
    totalEnriched: 0,
    totalInserted: 0,
    totalDuplicates: 0,
    totalFailed: 0,
    createdDate: now,
    updatedDate: now,
    startedAtUtc: null,
    finishedAtUtc: null,
  };
};

export const listLeadGenerationJobs = async (companyId?: number | null) => {
  const resolvedCompanyId = companyId ?? getBrowserCompanyId();
  const paths = [
    resolvedCompanyId
      ? `/api/LeadGenerationJobs/paged?companyId=${resolvedCompanyId}&pageNumber=1&pageSize=50`
      : null,
    "/api/LeadGenerationJobs/paged?pageNumber=1&pageSize=50",
  ].filter((value): value is string => Boolean(value));

  for (const path of paths) {
    try {
      const response = await requestBackend<unknown>(path);
      const list = Array.isArray(response)
        ? response
        : response && typeof response === "object" && Array.isArray((response as { result?: unknown[] }).result)
          ? (response as { result: unknown[] }).result
          : [];
      const jobs = list.map(normalizeJob).filter((value): value is LeadGenerationJob => Boolean(value));
      if (jobs.length > 0 || path === paths[paths.length - 1]) {
        writeLocalJobs(jobs);
        return jobs;
      }
    } catch {
      // fall through to next candidate / local cache
    }
  }

  return readLocalJobs();
};

export const createLeadGenerationJob = async (payload: LeadGenerationJobPayload) => {
  const body = {
    companyId: payload.companyId,
    title: payload.title,
    query: payload.query,
    region: payload.region,
    prompt: payload.prompt,
    mode: payload.mode ?? "agent-background",
    maxResults: payload.maxResults,
    agentId: payload.agentId,
  };

  try {
    const response = await requestBackend<unknown>("/api/LeadGenerationJobs/create", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const normalized = normalizeJob(response);
    if (normalized) {
      const current = readLocalJobs();
      writeLocalJobs([normalized, ...current.filter((entry) => entry.id !== normalized.id)]);
      return normalized;
    }
  } catch {
    // local fallback below
  }

  const fallback = buildFallbackJob(payload);
  writeLocalJobs([fallback, ...readLocalJobs()]);
  return fallback;
};

export const getLeadGenerationJob = async (jobId: number) => {
  const paths = [`/api/LeadGenerationJobs/${jobId}`, `/api/LeadGenerationJobs/by-id/${jobId}`];
  for (const path of paths) {
    try {
      const response = await requestBackend<unknown>(path);
      const normalized = normalizeJob(response);
      if (normalized) {
        const current = readLocalJobs();
        writeLocalJobs([normalized, ...current.filter((entry) => entry.id !== normalized.id)]);
        return normalized;
      }
    } catch {
      // try next path
    }
  }

  return readLocalJobs().find((entry) => entry.id === jobId) ?? null;
};

export const cancelLeadGenerationJob = async (jobId: number) => {
  try {
    await requestBackend(`/api/LeadGenerationJobs/${jobId}/cancel`, {
      method: "POST",
    });
  } catch {
    // keep local fallback in sync below
  }
  const current = readLocalJobs();
  const updated = current.map((entry) =>
    entry.id === jobId
      ? {
          ...entry,
          status: "cancelled" as const,
          currentStage: "Cancelled",
          finishedAtUtc: new Date().toISOString(),
          updatedDate: new Date().toISOString(),
        }
      : entry,
  );
  writeLocalJobs(updated);
};

export const listLeadsByJob = async (jobId: number): Promise<LeadSummary[]> => {
  const paths = [`/api/Leads/by-job/${jobId}`, `/api/LeadGenerationJobs/${jobId}/leads`];
  for (const path of paths) {
    try {
      const response = await requestBackend<unknown>(path);
      const list = Array.isArray(response)
        ? response
        : response && typeof response === "object" && Array.isArray((response as { result?: unknown[] }).result)
          ? (response as { result: unknown[] }).result
          : [];
      const leads = list.map(normalizeLead).filter((value): value is LeadSummary => Boolean(value));
      if (leads.length > 0) return leads;
    } catch {
      // continue
    }
  }
  return [];
};

export const listLeadsByCompany = async (companyId?: number | null): Promise<LeadSummary[]> => {
  const resolvedCompanyId = companyId ?? getBrowserCompanyId();
  if (!resolvedCompanyId) return [];

  const paths = [
    `/api/Leads/paged?companyId=${resolvedCompanyId}&pageNumber=1&pageSize=500`,
    `/api/Leads/by-company/${resolvedCompanyId}`,
  ];

  for (const path of paths) {
    try {
      const response = await requestBackend<unknown>(path);
      const list = Array.isArray(response)
        ? response
        : response && typeof response === "object" && Array.isArray((response as { result?: unknown[] }).result)
          ? (response as { result: unknown[] }).result
          : [];
      const leads = list
        .map(normalizeLead)
        .filter((value): value is LeadSummary => Boolean(value))
        .filter((lead) => lead.companyId === resolvedCompanyId);
      if (leads.length > 0 || path === paths[paths.length - 1]) {
        return leads.sort((a, b) => b.id - a.id);
      }
    } catch {
      // continue
    }
  }

  return [];
};


export const getLeadById = async (leadId: number): Promise<LeadSummary | null> => {
  const paths = [`/api/Leads/by-id/${leadId}`, `/api/Leads/${leadId}`];
  for (const path of paths) {
    try {
      const response = await requestBackend<unknown>(path);
      const normalized = normalizeLead(response);
      if (normalized) return normalized;
    } catch {
      // continue
    }
  }
  return null;
};

export const generateLeadInsights = async (
  leadId: number,
  agentId?: number | null,
  options?: { forceRegenerate?: boolean; preferredModel?: string | null },
) => {
  const body = {
    persist: true,
    forceRegenerate: options?.forceRegenerate ?? true,
    preferredModel: options?.preferredModel ?? null,
    ...(agentId ? { agentId } : {}),
  };

  const paths = [`/api/Leads/${leadId}/generate-ptx-insights`, `/api/Leads/${leadId}/generate-insights`];
  for (const path of paths) {
    try {
      const response = await requestBackend<unknown>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return normalizeLead(response) ?? (await getLeadById(leadId));
    } catch {
      // continue
    }
  }

  throw new Error("Failed to generate insights for this lead.");
};


export type BulkGenerateInsightsResult = {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  items: {
    leadId: number;
    businessName: string | null;
    success: boolean;
    usedAi: boolean;
    usedFallback: boolean;
    status: string | null;
    error: string | null;
  }[];
};

export const bulkGenerateInsights = async (
  companyId: number,
  jobId?: number | null,
  options?: { forceRegenerate?: boolean; preferredModel?: string | null },
): Promise<BulkGenerateInsightsResult> => {
  const body = {
    companyId,
    ...(jobId ? { jobId } : {}),
    forceRegenerate: options?.forceRegenerate ?? false,
    preferredModel: options?.preferredModel ?? null,
  };

  const response = await requestBackend<BulkGenerateInsightsResult>("/api/Leads/bulk-generate-insights", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return response;
};

export const listLeadEmailBatchJobs = async (companyId?: number | null, sourceLeadJobId?: number | null): Promise<LeadEmailBatchJob[]> => {
  const resolvedCompanyId = companyId ?? getBrowserCompanyId();
  const params = new URLSearchParams();
  if (resolvedCompanyId) params.set("companyId", String(resolvedCompanyId));
  if (sourceLeadJobId) params.set("sourceLeadJobId", String(sourceLeadJobId));
  params.set("pageNumber", "1");
  params.set("pageSize", "20");
  const response = await requestBackend<unknown>(`/api/LeadEmailBatchJobs/paged?${params.toString()}`);
  const list = Array.isArray(response)
    ? response
    : response && typeof response === "object" && Array.isArray((response as { result?: unknown[] }).result)
      ? (response as { result: unknown[] }).result
      : [];
  return list.map(normalizeEmailBatchJob).filter((value): value is LeadEmailBatchJob => Boolean(value));
};

export const createLeadEmailBatchJob = async (payload: CreateLeadEmailBatchPayload): Promise<LeadEmailBatchJob> => {
  const response = await requestBackend<unknown>("/api/LeadEmailBatchJobs/create", {
    method: "POST",
    body: JSON.stringify({
      companyId: payload.companyId,
      sourceLeadJobId: payload.sourceLeadJobId,
      leadIds: payload.leadIds,
      title: payload.title,
      senderName: payload.senderName,
      senderEmail: payload.senderEmail,
      replyTo: payload.replyTo,
      subjectTemplate: payload.subjectTemplate,
      introText: payload.introText,
      generateMissingInsights: true,
    }),
  });
  const normalized = normalizeEmailBatchJob(response);
  if (!normalized) throw new Error("Failed to queue lead email batch.");
  return normalized;
};

export const cancelLeadEmailBatchJob = async (jobId: number) => {
  await requestBackend(`/api/LeadEmailBatchJobs/${jobId}/cancel`, { method: "POST" });
};


const normalizeSingleLeadEmailResult = (value: unknown): SendSingleLeadEmailResult | null => {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const leadId = parseNumber(pick(entry, "leadId", "LeadId"), Number.NaN);
  if (!Number.isFinite(leadId)) return null;
  return {
    leadId,
    companyId: parseNumber(pick(entry, "companyId", "CompanyId"), getBrowserCompanyId() ?? 0),
    toEmail: parseString(pick(entry, "toEmail", "ToEmail")) ?? "",
    senderName: parseString(pick(entry, "senderName", "SenderName")) ?? "",
    senderEmail: parseString(pick(entry, "senderEmail", "SenderEmail")) ?? "",
    replyTo: parseString(pick(entry, "replyTo", "ReplyTo")),
    subject: parseString(pick(entry, "subject", "Subject")) ?? "",
    html: parseString(pick(entry, "html", "Html")) ?? "",
    providerMessageId: parseString(pick(entry, "providerMessageId", "ProviderMessageId")),
    insightsGeneratedWithAi: typeof pick(entry, "insightsGeneratedWithAi", "InsightsGeneratedWithAi") === "boolean" ? (pick(entry, "insightsGeneratedWithAi", "InsightsGeneratedWithAi") as boolean) : false,
    insightsUsedFallback: typeof pick(entry, "insightsUsedFallback", "InsightsUsedFallback") === "boolean" ? (pick(entry, "insightsUsedFallback", "InsightsUsedFallback") as boolean) : false,
    insightsGenerationStatus: parseString(pick(entry, "insightsGenerationStatus", "InsightsGenerationStatus")),
  };
};

export const sendSingleLeadEmail = async (leadId: number, payload: SendSingleLeadEmailPayload): Promise<SendSingleLeadEmailResult> => {
  const response = await requestBackend<unknown>(`/api/Leads/${leadId}/send-email`, {
    method: "POST",
    body: JSON.stringify({
      toEmail: payload.toEmail,
      subject: payload.subject,
      introText: payload.introText,
      replyTo: payload.replyTo,
      generateInsightsIfMissing: payload.generateInsightsIfMissing ?? true,
      forceRegenerateInsights: payload.forceRegenerateInsights ?? false,
      preferredModel: payload.preferredModel ?? null,
    }),
  });
  const normalized = normalizeSingleLeadEmailResult(response);
  if (!normalized) throw new Error("Failed to send email for this lead.");
  return normalized;
};


export const primeLeadChat = async (leadId: number, payload: LeadChatPrimePayload) =>
  requestBackend<LeadChatPrimeResult>(`/LeadChat/lead/${leadId}/prime`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const primeLeadGenerationJobChat = async (jobId: number, payload: LeadChatPrimePayload) =>
  requestBackend<LeadChatPrimeResult>(`/LeadChat/job/${jobId}/prime`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
