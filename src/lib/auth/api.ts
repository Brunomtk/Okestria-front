export type OkestriaTokenResponse = {
  token: string;
  refreshToken?: string | null;
  userId: number;
  companyId?: number | null;
  name?: string | null;
  email?: string | null;
  type: number;
  status: number;
  language?: string | null;
  theme?: string | null;
  expiresAtUtc?: string;
  refreshTokenExpiresAtUtc?: string | null;
};

export type OkestriaCurrentUser = {
  userId: number;
  companyId?: number | null;
  type: number;
  status: number;
  name?: string | null;
  email?: string | null;
  language?: string | null;
  theme?: string | null;
  isAdmin?: boolean;
  isCompany?: boolean;
};

export type OkestriaCompany = {
  id: number;
  name?: string | null;
  email?: string | null;
  status?: boolean;
  cnpj?: string | null;
  emailContextDescription?: string | null;
  emailContextProducts?: string | null;
  emailContextTone?: string | null;
  emailContextWebsite?: string | null;
  emailContextPhone?: string | null;
  emailContextExtraNotes?: string | null;
  /** Full data URL of the footer banner image (e.g. "data:image/png;base64,...") */
  emailContextFooterImageBase64?: string | null;
};

export type OkestriaCompanyEmailContext = {
  description?: string | null;
  products?: string | null;
  tone?: string | null;
  website?: string | null;
  phone?: string | null;
  extraNotes?: string | null;
  /**
   * Full data URL of the footer banner image.
   * - Leave undefined/null to keep the saved value unchanged.
   * - Send an empty string "" to clear the saved image.
   */
  footerImageBase64?: string | null;
};

export type OkestriaCompanyPagedResponse = {
  pageCount?: number;
  result?: OkestriaCompany[];
};

export type OkestriaPagedResponse<T> = {
  pageCount?: number;
  result?: T[];
};

export type OkestriaLead = {
  id: number;
  companyId?: number | null;
  /** Synthesized from owner first+last on the back's LeadDTO. */
  contactName?: string | null;
  /** Compatibility shim — some callers still read `leadGenerationJobId`. */
  leadGenerationJobId?: number | null;
  createdByUserId?: number | null;
  lastJobId?: number | null;
  businessName?: string | null;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  email?: string | null;
  emails?: string[];
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  category?: string | null;
  website?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  description?: string | null;
  hoursOfOperation?: string | null;
  status?: string | null;
  ptxFit?: string | null;
  suggestedProduct?: string | null;
  outreachInsight?: string | null;
  outreachScript?: string | null;
  outreachEmailHtml?: string | null;
  notes?: string | null;
  socialLinks?: string[];
  source?: string | null;
  sourceMetadata?: Record<string, string>;
  insightsGeneratedWithAi?: boolean | null;
  insightsUsedFallback?: boolean | null;
  insightsGenerationStatus?: string | null;
  insightsWarningCode?: string | null;
  insightsWarningMessage?: string | null;
  scrapedAtUtc?: string | null;
  createdDate?: string | null;
  updatedDate?: string | null;
};

export type OkestriaWorkspace = {
  id: number;
  companyId: number;
  name?: string | null;
  description?: string | null;
  status?: boolean;
};

export type OkestriaOfficeLayout = {
  id?: number | null;
  companyId?: number | null;
  workspaceId?: number | null;
  name?: string | null;
  layoutJson?: string | null;
  version?: number | null;
  isActive?: boolean | null;
  createdDate?: string | null;
  updatedDate?: string | null;
  createdByUserId?: number | null;
  updatedByUserId?: number | null;
};

export type OkestriaAgent = {
  id: number;
  companyId: number;
  name?: string | null;
  slug?: string | null;
  role?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  /** v148 — JSON string blob of the structured AgentAvatarProfile. */
  avatarProfileJson?: string | null;
  emoji?: string | null;
  status?: boolean | null;
  isDefault?: boolean | null;
};

export type OkestriaAgentProfile = {
  identityNotes?: string | null;
  avatarNotes?: string | null;
  soul?: string | null;
  boundaries?: string | null;
  vibe?: string | null;
  continuity?: string | null;
  agentsInstructions?: string | null;
  userNotes?: string | null;
  toolsNotes?: string | null;
  memoryNotes?: string | null;
  heartbeatNotes?: string | null;
  model?: string | null;
  thinkingLevel?: string | null;
  temperature?: number | null;
  profileJson?: string | null;
};

export type OkestriaAgentFile = {
  fileType?: string | null;
  content?: string | null;
};

export type OkestriaAgentDetails = OkestriaAgent & {
  profile?: OkestriaAgentProfile | null;
  files?: OkestriaAgentFile[] | null;
};

export type OkestriaAgentDeleteSummary = {
  agentId: number;
  agentName?: string | null;
  agentSlug?: string | null;
  agentExists: boolean;
  deleted: boolean;
  cronJobsAffected: number;
  cronJobRunsAffected: number;
  squadMembershipsAffected: number;
  filesAffected: number;
  hasProfile: boolean;
  leadJobsDetached: number;
  cronJobNames: string[];
  squadNames: string[];
  warning?: string | null;
};

export type OkestriaSquadMember = {
  id?: number;
  squadId?: number;
  agentId?: number | null;
  agentName?: string | null;
  agentSlug?: string | null;
  agentStatus?: boolean | null;
  role?: string | null;
  isLeader?: boolean | null;
  canReceiveTasks?: boolean | null;
  order?: number | null;
};

export type OkestriaSquad = {
  id: number;
  companyId: number;
  workspaceId?: number | null;
  companyName?: string | null;
  workspaceName?: string | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  iconEmoji?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
  status?: boolean | null;
  isActive?: boolean | null;
  leaderAgentId?: number | null;
  leaderAgentName?: string | null;
  defaultExecutionMode?: string | null;
  memberCount?: number | null;
  activeMemberCount?: number | null;
  createdDate?: string | null;
  updatedDate?: string | null;
  members?: OkestriaSquadMember[];
};

export type OkestriaSquadDetails = OkestriaSquad & {
  taskCount?: number | null;
  recentTasks?: Array<{
    id?: number;
    title?: string | null;
    status?: string | null;
    createdDate?: string | null;
    updatedDate?: string | null;
  }>;
};

export type OkestriaSquadCatalog = {
  companyId: number;
  agents: Array<{
    agentId: number;
    agentName?: string | null;
    agentSlug?: string | null;
    role?: string | null;
    status: boolean;
  }>;
  workspaces: Array<{
    workspaceId: number;
    workspaceName?: string | null;
    status: boolean;
  }>;
};

export type OkestriaUser = {
  id: number;
  name?: string | null;
  email?: string | null;
  type?: number;
  status?: number;
  companyId?: number | null;
};

export type OkestriaPlan = {
  id?: number;
  name?: string | null;
  code?: string | null;
  price?: number | null;
  amount?: number | null;
  monthlyPrice?: number | null;
  yearlyPrice?: number | null;
  currency?: string | null;
  leadLimit?: number | null;
  userLimit?: number | null;
  agentLimit?: number | null;
};

export type OkestriaSubscription = {
  id?: number;
  companyId?: number;
  planId?: number | null;
  planName?: string | null;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
  currentPeriodStartUtc?: string | null;
  currentPeriodEndUtc?: string | null;
  createdDate?: string | null;
  updatedDate?: string | null;
};

export type OkestriaUsage = {
  companyId?: number;
  usersUsed?: number | null;
  usersLimit?: number | null;
  agentsUsed?: number | null;
  agentsLimit?: number | null;
  leadsUsed?: number | null;
  leadsLimit?: number | null;
  storageUsedMb?: number | null;
  storageLimitMb?: number | null;
};

export type LoginPayload = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export function getOkestriaApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_OKESTRIA_API_URL ||
    process.env.OKESTRIA_API_URL ||
    'http://localhost:5227'
  ).replace(/\/$/, '');
}

function normalizeErrorText(text: string, status: number) {
  const cleanText = text.trim().replace(/^"|"$/g, '');
  // 413 bodies are almost always an nginx HTML page ("<html>... 413 Request
  // Entity Too Large ...</html>") or an empty body — neither of which is
  // useful to show the user, so we prefer our own message whenever the
  // status is 413, regardless of what the body contains.
  if (status === 413) {
    return 'O arquivo enviado é grande demais. Escolha uma imagem menor (até ~1 MB) e tente novamente.';
  }
  if (cleanText) return cleanText;
  if (status === 401) return 'E-mail ou senha inválidos.';
  if (status === 403) return 'Você não tem permissão para acessar este recurso.';
  return `Request failed with status ${status}`;
}

/**
 * Thrown by {@link requestJson} when the backend returns a non-2xx response.
 * Carries the HTTP status so callers can distinguish "server said 401" from
 * "the network dropped" (which is still thrown as a plain Error).
 *
 * In particular, {@link refreshUserToken} throws this with `status === 401`
 * when the refresh token has expired or been revoked, so the auth layer can
 * stop the silent-retry loop and surface a "session expired" UI instead of
 * leaving the user stuck on the loading screen forever.
 */
export class OkestriaHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'OkestriaHttpError';
    this.status = status;
  }
}

export function isOkestriaUnauthorizedError(error: unknown): boolean {
  return error instanceof OkestriaHttpError && error.status === 401;
}

/**
 * True when the backend (or a reverse-proxy like nginx in front of it)
 * rejected the request because the body was larger than the allowed limit.
 * Callers should use this to surface a "the file is too big" message
 * instead of dumping the raw HTML error page from the proxy.
 */
export function isOkestriaPayloadTooLargeError(error: unknown): boolean {
  return error instanceof OkestriaHttpError && error.status === 413;
}

async function requestJson<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${getOkestriaApiBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });
  } catch {
    // Network-level failure (DNS, offline, CORS, etc.). Thrown as a plain
    // Error so callers can treat it as transient and keep retrying.
    throw new Error('Não foi possível conectar ao backend do Okestria. Verifique a URL da API e confirme se o servidor está rodando.');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new OkestriaHttpError(response.status, normalizeErrorText(text, response.status));
  }

  return (await response.json()) as T;
}

export async function authenticateUser(payload: LoginPayload) {
  return requestJson<OkestriaTokenResponse>('/api/Users/authenticate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function refreshUserToken(refreshToken: string) {
  return requestJson<OkestriaTokenResponse>('/api/Users/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function revokeRefreshToken(refreshToken: string, token?: string) {
  return requestJson<boolean>('/api/Users/revoke-refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }, token);
}

export async function fetchCurrentUser(token: string) {
  return requestJson<OkestriaCurrentUser>('/api/Users/me', undefined, token);
}

export async function fetchCompanyById(companyId: number, token: string) {
  return requestJson<OkestriaCompany>(`/api/Companies/by-company/${companyId}`, undefined, token);
}

export async function fetchCompaniesPaged(token: string, params?: { pageNumber?: number; pageSize?: number; name?: string }) {
  const search = new URLSearchParams();
  search.set('pageNumber', String(params?.pageNumber ?? 1));
  search.set('pageSize', String(params?.pageSize ?? 24));
  if (params?.name?.trim()) search.set('Name', params.name.trim());
  return requestJson<OkestriaCompanyPagedResponse>(`/api/Companies/paged?${search.toString()}`, undefined, token);
}

export async function fetchWorkspacesByCompany(companyId: number, token: string) {
  return requestJson<OkestriaWorkspace[]>(`/api/Workspaces/by-company/${companyId}`, undefined, token);
}

export async function fetchUsersByCompany(companyId: number, token: string) {
  return requestJson<OkestriaUser[]>(`/api/Users/by-company/${companyId}`, undefined, token);
}

export async function fetchAgentsByCompany(companyId: number, token: string) {
  const agents = await requestJson<OkestriaAgent[]>(`/api/Agents/by-company/${companyId}`, undefined, token);
  return [...agents].sort((left, right) => {
    const leftDefault = left.isDefault === true ? 1 : 0;
    const rightDefault = right.isDefault === true ? 1 : 0;
    if (leftDefault !== rightDefault) return rightDefault - leftDefault;
    const leftName = (left.name ?? left.slug ?? '').trim().toLowerCase();
    const rightName = (right.name ?? right.slug ?? '').trim().toLowerCase();
    return leftName.localeCompare(rightName);
  });
}

export async function fetchSquadsByCompany(companyId: number, token: string) {
  return requestJson<OkestriaSquad[]>(`/api/Squads/by-company/${companyId}`, undefined, token);
}

export async function fetchSquadCatalogByCompany(companyId: number, token: string) {
  return requestJson<OkestriaSquadCatalog>(`/api/Squads/by-company/${companyId}/catalog`, undefined, token);
}

export type RuntimeConfigStatusResponse = {
  configured?: boolean;
  baseUrl?: string | null;
  hasUpstreamToken?: boolean;
  hooksConfigured?: boolean;
  hooksBaseUrl?: string | null;
  hasHookToken?: boolean;
};

export async function fetchRuntimeConfigStatus(token: string) {
  return requestJson<RuntimeConfigStatusResponse>(`/api/Runtime/config-status`, undefined, token);
}

// ── v146 — Admin overview endpoints (cross-tenant) ──────────────────

export type AdminCortexStats = {
  companyId: number;
  companyName: string;
  notes: number;
  tags: number;
  links: number;
  health: 'fresh' | 'stale' | 'empty' | string;
  lastTouchUtc?: string | null;
};

export type AdminCronJobRow = {
  companyId: number;
  companyName: string;
  id: number;
  name: string;
  kind: string;
  status: string;
  cronExpression?: string | null;
  timezone: string;
  nextRunAtUtc?: string | null;
  lastRunAtUtc?: string | null;
  lastRunStatus?: string | null;
  runCount: number;
  failureCount: number;
  agentId?: number | null;
  agentName?: string | null;
};

export type AdminMissionRow = {
  companyId: number;
  companyName: string;
  id: number;
  executionKey: string;
  squadId: number;
  squadName?: string | null;
  title: string;
  status: string;
  mode: string;
  currentStepOrder: number;
  requestedByUserId?: number | null;
  requestedByUserName?: string | null;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  createdDate: string;
  updatedDate: string;
};

export async function fetchAdminCortexStats(token: string) {
  return requestJson<AdminCortexStats[]>('/api/AdminOverview/cortex/stats', undefined, token);
}

// v150 — admin-scoped per-tenant Cortex (proxies the CompanyNotes
// service with an explicit companyId). Mirrors the shapes already
// used by the office's Cortex modal.

export type AdminCortexNote = {
  path: string;
  title: string;
  folder: string;
  sizeBytes: number;
  lastModifiedUtc: string;
  eTag?: string | null;
};

export type AdminCortexTree = {
  companyId: number;
  vaultName: string;
  notes: AdminCortexNote[];
  folders: string[];
  totalCount: number;
};

export type AdminCortexGraphNode = {
  id: string;
  kind: 'note' | 'tag';
  label: string;
  folder?: string | null;
  degree: number;
};

export type AdminCortexGraphLink = {
  source: string;
  target: string;
  kind: 'wiki' | 'tag';
};

export type AdminCortexGraph = {
  companyId: number;
  vaultName: string;
  nodes: AdminCortexGraphNode[];
  links: AdminCortexGraphLink[];
  tags: string[];
  folders: string[];
};

export async function fetchAdminCortexTree(companyId: number, token: string) {
  return requestJson<AdminCortexTree>(
    `/api/AdminOverview/cortex/${companyId}/tree`,
    undefined,
    token,
  );
}

export async function fetchAdminCortexGraph(companyId: number, token: string) {
  return requestJson<AdminCortexGraph>(
    `/api/AdminOverview/cortex/${companyId}/graph`,
    undefined,
    token,
  );
}

export async function fetchAdminCronJobs(token: string) {
  return requestJson<AdminCronJobRow[]>('/api/AdminOverview/cron/all', undefined, token);
}

export async function fetchAdminMissions(token: string) {
  return requestJson<AdminMissionRow[]>('/api/AdminOverview/missions/all', undefined, token);
}

// ── v147 — Admin overview · Activity / Tasks / Chats / Health ───────

export type AdminActivityEvent = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string | null;
  companyId?: number | null;
  companyName?: string | null;
  atUtc: string;
};

export type AdminTaskRow = {
  companyId: number;
  companyName: string;
  id: number;
  executionId: number;
  executionTitle: string;
  squadId?: number | null;
  squadName?: string | null;
  stepOrder: number;
  stepKind: string;
  title: string;
  status: string;
  agentId: number;
  agentName?: string | null;
  agentSlug?: string | null;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  createdDate: string;
  updatedDate: string;
};

export type AdminChatRow = {
  companyId: number;
  companyName: string;
  id: number;
  executionId: number;
  executionTitle: string;
  squadId?: number | null;
  squadName?: string | null;
  stepId?: number | null;
  role: string;
  authorType: string;
  authorId?: number | null;
  authorName?: string | null;
  preview: string;
  createdDate: string;
};

export type AdminHealthSubsystem = {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | string;
  latencyMs?: number | null;
  detail?: string | null;
  lastCheckedUtc?: string | null;
};

export async function fetchAdminActivity(token: string, take = 50) {
  return requestJson<AdminActivityEvent[]>(
    `/api/AdminOverview/activity/recent?take=${take}`,
    undefined,
    token,
  );
}

export async function fetchAdminTasks(token: string, take = 100) {
  return requestJson<AdminTaskRow[]>(
    `/api/AdminOverview/tasks/all?take=${take}`,
    undefined,
    token,
  );
}

export async function fetchAdminChats(token: string, take = 80) {
  return requestJson<AdminChatRow[]>(
    `/api/AdminOverview/chats/recent?take=${take}`,
    undefined,
    token,
  );
}

export async function fetchAdminHealth(token: string) {
  return requestJson<AdminHealthSubsystem[]>(
    '/api/AdminOverview/health/subsystems',
    undefined,
    token,
  );
}

export type GatewaySettingsResponse = {
  configured: boolean;
  baseUrl: string;
  hasUpstreamToken: boolean;
  upstreamToken: string;
};

export async function fetchGatewaySettings(token: string) {
  return requestJson<GatewaySettingsResponse>(`/api/Runtime/gateway-settings`, undefined, token);
}

export async function fetchOfficeLayoutByCompany(companyId: number, token: string) {
  return requestJson<OkestriaOfficeLayout>(`/api/OfficeLayouts/company/${companyId}`, undefined, token);
}

export async function upsertOfficeLayoutByCompany(
  companyId: number,
  payload: Pick<OkestriaOfficeLayout, 'layoutJson' | 'name' | 'version' | 'workspaceId'>,
  token: string,
) {
  return requestJson<OkestriaOfficeLayout>(`/api/OfficeLayouts/company/${companyId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function resetOfficeLayoutByCompany(companyId: number, token: string) {
  return requestJson<string>(`/api/OfficeLayouts/company/${companyId}/reset`, {
    method: 'POST',
  }, token);
}

export async function fetchUsersPaged(token: string, params?: { pageNumber?: number; pageSize?: number }) {
  const search = new URLSearchParams();
  search.set('pageNumber', String(params?.pageNumber ?? 1));
  search.set('pageSize', String(params?.pageSize ?? 50));
  return requestJson<OkestriaPagedResponse<OkestriaUser>>(`/api/Users/paged?${search.toString()}`, undefined, token);
}

export async function fetchLeadsPaged(token: string, params?: { pageNumber?: number; pageSize?: number }) {
  const search = new URLSearchParams();
  search.set('pageNumber', String(params?.pageNumber ?? 1));
  search.set('pageSize', String(params?.pageSize ?? 50));
  return requestJson<OkestriaPagedResponse<OkestriaLead>>(`/api/Leads/paged?${search.toString()}`, undefined, token);
}

export async function fetchBillingPlans(token: string) {
  return requestJson<OkestriaPlan[]>(`/api/Billing/plans`, undefined, token);
}

export async function fetchBillingSubscription(companyId: number, token: string) {
  return requestJson<OkestriaSubscription>(`/api/Billing/subscription/${companyId}`, undefined, token);
}


export async function fetchUserById(userId: number, token: string) {
  return requestJson<OkestriaUser>(`/api/Users/by-user/${userId}`, undefined, token);
}

export async function fetchLeadById(leadId: number, token: string) {
  return requestJson<OkestriaLead>(`/api/Leads/by-id/${leadId}`, undefined, token);
}

export async function fetchAgentById(agentId: number, token: string) {
  return requestJson<OkestriaAgent>(`/api/Agents/${agentId}`, undefined, token);
}

/**
 * v148 — same endpoint as fetchAgentById, but typed to expose the
 * full AgentDetailsDTO (profile + files). The back already returns
 * this shape for `/api/Agents/{id}` — only the type narrowing was
 * missing on the front.
 */
export async function fetchAgentDetails(agentId: number, token: string) {
  return requestJson<OkestriaAgentDetails>(`/api/Agents/${agentId}`, undefined, token);
}

export async function fetchAgentDeletePreview(agentId: number, token: string) {
  return requestJson<OkestriaAgentDeleteSummary>(
    `/api/Agents/delete/${agentId}/preview`,
    undefined,
    token,
  );
}

export async function fetchWorkspaceById(workspaceId: number, token: string) {
  return requestJson<OkestriaWorkspace>(`/api/Workspaces/${workspaceId}`, undefined, token);
}

export async function fetchSquadById(squadId: number, token: string) {
  return requestJson<OkestriaSquadDetails>(`/api/Squads/${squadId}`, undefined, token);
}

// ── v151 — Squad executions (admin · mission detail) ───────────────

export type OkestriaSquadExecutionStep = {
  id: number;
  executionId: number;
  agentId: number;
  agentName?: string | null;
  agentSlug?: string | null;
  stepOrder: number;
  stepKind: string;
  title: string;
  status: string;
  inputPrompt?: string | null;
  outputText?: string | null;
  externalRuntime?: string | null;
  externalTaskId?: string | null;
  externalRunId?: string | null;
  externalSessionKey?: string | null;
  errorMessage?: string | null;
  metadataJson?: string | null;
  lastSyncedAtUtc?: string | null;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
};

export type OkestriaSquadExecutionMessage = {
  id: number;
  executionId: number;
  stepId?: number | null;
  sequence: number;
  role: string;
  authorType: string;
  authorId?: number | null;
  authorName?: string | null;
  content: string;
  metadataJson?: string | null;
  createdDate: string;
};

export type OkestriaSquadExecutionEvent = {
  id: number;
  executionId: number;
  stepId?: number | null;
  type: string;
  level: string;
  message: string;
  dataJson?: string | null;
  createdDate: string;
};

export type OkestriaSquadExecution = {
  id: number;
  executionKey: string;
  companyId: number;
  squadId: number;
  squadName?: string | null;
  requestedByUserId?: number | null;
  requestedByUserName?: string | null;
  title: string;
  prompt: string;
  mode: string;
  status: string;
  preferredModel?: string | null;
  currentStepOrder: number;
  summary?: string | null;
  finalResponse?: string | null;
  errorMessage?: string | null;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  leadId?: number | null;
  leadGenerationJobId?: number | null;
  leadContextJson?: string | null;
  attachmentCount: number;
  createdDate: string;
  updatedDate: string;
  steps: OkestriaSquadExecutionStep[];
  messages: OkestriaSquadExecutionMessage[];
  events: OkestriaSquadExecutionEvent[];
};

export async function fetchSquadExecutionById(
  executionId: number,
  token: string,
) {
  return requestJson<OkestriaSquadExecution>(
    `/api/SquadExecutions/${executionId}`,
    undefined,
    token,
  );
}

// ── v149 — Cron jobs (admin detail + run controls) ──────────────────

export type OkestriaCronJobRun = {
  id: number;
  cronJobId: number;
  runNumber: number;
  status: string;
  triggerSource: string;
  scheduledAtUtc: string;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  openClawTaskId?: string | null;
  openClawRunId?: string | null;
  sessionKey?: string | null;
  deliveryMode: string;
  httpStatus?: number | null;
  resultText?: string | null;
  resultPayloadJson?: string | null;
  errorMessage?: string | null;
  createdDate: string;
  attemptNumber: number;
  errorCategory?: string | null;
  nextAttemptAtUtc?: string | null;
};

export type OkestriaCronJob = {
  id: number;
  companyId: number;
  createdByUserId?: number | null;
  createdByUserName?: string | null;
  agentId?: number | null;
  agentName?: string | null;
  agentSlug?: string | null;
  agentAvatarUrl?: string | null;
  squadId?: number | null;
  squadName?: string | null;
  name: string;
  description?: string | null;
  kind: string;
  cronExpression?: string | null;
  timezone: string;
  runAtUtc?: string | null;
  sessionMode: string;
  sessionKey?: string | null;
  systemEvent: string;
  wakeMode: string;
  deliveryMode: string;
  webhookUrl?: string | null;
  hasWebhookToken: boolean;
  deleteAfterRun: boolean;
  status: string;
  openClawJobId?: string | null;
  nextRunAtUtc?: string | null;
  lastRunAtUtc?: string | null;
  lastRunStatus?: string | null;
  runCount: number;
  failureCount: number;
  lastErrorMessage?: string | null;
  metadataJson?: string | null;
  attachmentCount: number;
  runs: OkestriaCronJobRun[];
  createdDate: string;
  updatedDate: string;
};

export async function fetchCronJobById(jobId: number, token: string) {
  return requestJson<OkestriaCronJob>(`/api/CronJobs/${jobId}`, undefined, token);
}

export async function runCronJob(
  jobId: number,
  payload: { onlyIfDue?: boolean; systemEventOverride?: string | null },
  token: string,
) {
  return requestJson<OkestriaCronJobRun>(
    `/api/CronJobs/${jobId}/run`,
    { method: 'POST', body: JSON.stringify(payload ?? {}) },
    token,
  );
}

export async function pauseCronJob(jobId: number, token: string) {
  return requestJson<OkestriaCronJob>(
    `/api/CronJobs/${jobId}/pause`,
    { method: 'POST' },
    token,
  );
}

export async function resumeCronJob(jobId: number, token: string) {
  return requestJson<OkestriaCronJob>(
    `/api/CronJobs/${jobId}/resume`,
    { method: 'POST' },
    token,
  );
}

export async function cancelCronJob(jobId: number, token: string) {
  return requestJson<OkestriaCronJob>(
    `/api/CronJobs/${jobId}/cancel`,
    { method: 'POST' },
    token,
  );
}

export async function deleteCronJob(jobId: number, token: string) {
  return requestJson<unknown>(
    `/api/CronJobs/${jobId}`,
    { method: 'DELETE' },
    token,
  );
}

export async function updateCronJob(
  jobId: number,
  payload: {
    name?: string;
    description?: string | null;
    cronExpression?: string | null;
    systemEvent?: string;
    timezone?: string;
    status?: string;
  },
  token: string,
) {
  return requestJson<OkestriaCronJob>(
    `/api/CronJobs/${jobId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
}

export async function toggleCompanyStatus(companyId: number, token: string) {
  return requestJson<unknown>(`/api/Companies/toggle-status/${companyId}`, {
    method: 'POST',
    body: JSON.stringify({ id: companyId }),
  }, token);
}

export async function deleteCompany(companyId: number, token: string) {
  return requestJson<unknown>(`/api/Companies/delete/${companyId}`, { method: 'DELETE' }, token);
}

export async function deleteUser(userId: number, token: string) {
  return requestJson<unknown>(`/api/Users/${userId}`, { method: 'DELETE' }, token);
}

export async function deleteAgent(agentId: number, token: string) {
  return requestJson<unknown>(`/api/Agents/delete/${agentId}`, { method: 'DELETE' }, token);
}

export async function deleteSquad(squadId: number, token: string) {
  return requestJson<unknown>(`/api/Squads/delete/${squadId}`, { method: 'DELETE' }, token);
}

export async function generateLeadInsights(leadId: number, token: string) {
  return requestJson<unknown>(`/api/Leads/${leadId}/generate-ptx-insights`, {
    method: 'POST',
    body: JSON.stringify({ persist: true, forceRegenerate: true, preferredModel: 'gpt-5.4-nano' }),
  }, token);
}

export async function fetchBillingUsage(companyId: number, token: string) {
  return requestJson<OkestriaUsage>(`/api/Billing/usage/${companyId}`, undefined, token);
}


export async function createCompany(payload: { name: string; email: string; cnpj?: string | null; status?: boolean }, token: string) {
  return requestJson<unknown>(`/api/Companies/create`, {
    method: 'POST',
    body: JSON.stringify({ name: payload.name, email: payload.email, cnpj: payload.cnpj ?? null, status: payload.status ?? true }),
  }, token);
}

export async function updateCompany(companyId: number, payload: { name: string; email: string; cnpj?: string | null; status?: boolean }, token: string) {
  return requestJson<unknown>(`/api/Companies/update/${companyId}`, {
    method: 'PUT',
    body: JSON.stringify({ id: companyId, name: payload.name, email: payload.email, cnpj: payload.cnpj ?? null, status: payload.status ?? true }),
  }, token);
}

export async function createUser(payload: { name: string; email: string; password: string; type: number; status: number; companyId?: number | null; language?: string | null; theme?: string | null }, token: string) {
  return requestJson<unknown>(`/api/Users/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updateUser(userId: number, payload: { name: string; email: string; password: string; type: number; status: number; companyId?: number | null; language?: string | null; theme?: string | null }, token: string) {
  return requestJson<unknown>(`/api/Users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function createWorkspace(payload: { companyId: number; name: string; description?: string | null; status?: boolean }, token: string) {
  return requestJson<unknown>(`/api/Workspaces/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updateWorkspace(workspaceId: number, payload: { companyId: number; name: string; description?: string | null; status?: boolean }, token: string) {
  return requestJson<unknown>(`/api/Workspaces/update/${workspaceId}`, {
    method: 'PUT',
    body: JSON.stringify({ id: workspaceId, ...payload }),
  }, token);
}

export async function createAgent(payload: { companyId: number; name: string; slug?: string | null; role?: string | null; description?: string | null; avatarUrl?: string | null; emoji?: string | null; status?: boolean; isDefault?: boolean }, token: string) {
  return requestJson<unknown>(`/api/Agents/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updateAgent(agentId: number, payload: { companyId: number; name: string; slug?: string | null; role?: string | null; description?: string | null; avatarUrl?: string | null; emoji?: string | null; status?: boolean; isDefault?: boolean }, token: string) {
  return requestJson<unknown>(`/api/Agents/update/${agentId}`, {
    method: 'PUT',
    body: JSON.stringify({ id: agentId, ...payload }),
  }, token);
}

export async function createSquad(payload: { companyId: number; name: string; slug?: string | null; description?: string | null; leaderAgentId?: number | null; workspaceId?: number | null; defaultExecutionMode?: string | null; status?: boolean; members?: Array<{ agentId: number; isLeader?: boolean; canReceiveTasks?: boolean; order?: number }> }, token: string) {
  return requestJson<unknown>(`/api/Squads/create`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, members: payload.members ?? [] }),
  }, token);
}

export async function updateSquad(squadId: number, payload: { companyId: number; name: string; slug?: string | null; description?: string | null; iconEmoji?: string | null; color?: string | null; avatarUrl?: string | null; leaderAgentId?: number | null; workspaceId?: number | null; defaultExecutionMode?: string | null; status?: boolean; members?: Array<{ agentId: number; isLeader?: boolean; canReceiveTasks?: boolean; order?: number }> }, token: string) {
  return requestJson<unknown>(`/api/Squads/update/${squadId}`, {
    method: 'PUT',
    body: JSON.stringify({ id: squadId, ...payload, members: payload.members ?? [] }),
  }, token);
}

export async function createLead(payload: { companyId: number; businessName: string; contactName?: string | null; email?: string | null; phone?: string | null; city?: string | null; state?: string | null; status?: string | null }, token: string) {
  return requestJson<unknown>(`/api/Leads/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updateLead(leadId: number, payload: { companyId: number; businessName: string; contactName?: string | null; email?: string | null; phone?: string | null; city?: string | null; state?: string | null; status?: string | null }, token: string) {
  return requestJson<unknown>(`/api/Leads/${leadId}`, {
    method: 'PUT',
    body: JSON.stringify({ id: leadId, ...payload }),
  }, token);
}

// ── Company Email Context ──────────────────────────────────────────

export async function fetchCompanyEmailContext(companyId: number, token: string) {
  return requestJson<OkestriaCompanyEmailContext>(`/api/Companies/${companyId}/email-context`, undefined, token);
}

export async function updateCompanyEmailContext(companyId: number, payload: OkestriaCompanyEmailContext, token: string) {
  return requestJson<unknown>(`/api/Companies/${companyId}/email-context`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

// ── User Email Context (per-user signature footer) ─────────────────
//
// In v21 the email-signature footer image moved from Company to User so
// every teammate can upload their own banner. The text fields (tone,
// description, products, website, phone, extra notes) are still per-company
// and keep flowing through the Companies endpoints above. The footer image,
// on the other hand, lives on the User row and must go through these
// endpoints — otherwise the send path (which reads it off the authenticated
// user) sees a null value and silently omits the footer.

export type OkestriaUserEmailContext = {
  /**
   * Full data URL of the footer banner image (e.g. "data:image/png;base64,...").
   * - Leave undefined/null to keep the saved value unchanged.
   * - Send an empty string "" to clear the saved image.
   */
  footerImageBase64?: string | null;
};

export async function fetchUserEmailContext(userId: number, token: string) {
  return requestJson<OkestriaUserEmailContext>(`/api/Users/${userId}/email-context`, undefined, token);
}

export async function updateUserEmailContext(userId: number, payload: OkestriaUserEmailContext, token: string) {
  return requestJson<unknown>(`/api/Users/${userId}/email-context`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}
