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
  leadGenerationJobId?: number | null;
  businessName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  status?: string | null;
  createdDate?: string | null;
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
  emoji?: string | null;
  status?: boolean | null;
  isDefault?: boolean | null;
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
  if (cleanText) return cleanText;
  if (status === 401) return 'E-mail ou senha inválidos.';
  if (status === 403) return 'Você não tem permissão para acessar este recurso.';
  return `Request failed with status ${status}`;
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
    throw new Error('Não foi possível conectar ao backend do Okestria. Verifique a URL da API e confirme se o servidor está rodando.');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(normalizeErrorText(text, response.status));
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

export async function fetchWorkspaceById(workspaceId: number, token: string) {
  return requestJson<OkestriaWorkspace>(`/api/Workspaces/${workspaceId}`, undefined, token);
}

export async function fetchSquadById(squadId: number, token: string) {
  return requestJson<OkestriaSquadDetails>(`/api/Squads/${squadId}`, undefined, token);
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

export async function updateSquad(squadId: number, payload: { companyId: number; name: string; slug?: string | null; description?: string | null; leaderAgentId?: number | null; workspaceId?: number | null; defaultExecutionMode?: string | null; status?: boolean; members?: Array<{ agentId: number; isLeader?: boolean; canReceiveTasks?: boolean; order?: number }> }, token: string) {
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
