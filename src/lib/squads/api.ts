import {
  extractGatewayAgentId,
  fetchCompanyAgentDetails,
  fetchCompanyAgents,
  getBrowserAccessToken,
  getBrowserCompanyId,
} from "@/lib/agents/backend-api";
import { getOkestriaApiBaseUrl } from "@/lib/auth/api";

export type SquadExecutionMode = "manual" | "leader" | "all" | "workflow";

export type SquadCatalogAgent = {
  agentId: number;
  agentName: string;
  agentSlug: string;
  gatewayAgentId: string | null;
  role: string;
  status: boolean;
  isDefault: boolean;
};

export type SquadCatalogWorkspace = {
  workspaceId: number;
  workspaceName: string;
  status: boolean;
};

export type SquadCatalog = {
  companyId: number;
  agents: SquadCatalogAgent[];
  workspaces: SquadCatalogWorkspace[];
};

export type SquadMember = {
  backendAgentId: number | null;
  gatewayAgentId: string | null;
  name: string;
  isLeader: boolean;
};

export type SquadSummary = {
  id: string;
  companyId: number;
  name: string;
  description: string;
  iconEmoji: string | null;
  color: string | null;
  avatarUrl: string | null;
  executionMode: SquadExecutionMode;
  leaderGatewayAgentId: string | null;
  members: SquadMember[];
};

type BackendAgentLink = {
  backendAgentId: number;
  gatewayAgentId: string | null;
  name: string;
};

const normalizeErrorText = async (response: Response) => {
  const text = (await response.text()).trim();
  return text.replace(/^"|"$/g, "") || `Request failed with status ${response.status}`;
};

const requestBackendJson = async <T>(
  path: string,
  init?: RequestInit,
  token?: string | null,
): Promise<T> => {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const resolvedToken = token ?? getBrowserAccessToken();
  if (resolvedToken) {
    headers.set("Authorization", `Bearer ${resolvedToken}`);
  }

  const response = await fetch(`${getOkestriaApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await normalizeErrorText(response));
  }

  return (await response.json()) as T;
};

const normalizeExecutionMode = (value: unknown): SquadExecutionMode => {
  if (value === "leader" || value === "all" || value === "workflow") return value;
  return "manual";
};

const normalizeCatalogAgent = (raw: unknown): SquadCatalogAgent => {
  const record = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
  return {
    agentId: typeof record.agentId === "number" ? record.agentId : 0,
    agentName: typeof record.agentName === "string" && record.agentName.trim() ? record.agentName.trim() : "Agent",
    agentSlug: typeof record.agentSlug === "string" ? record.agentSlug.trim() : "",
    gatewayAgentId: typeof record.gatewayAgentId === "string" && record.gatewayAgentId.trim() ? record.gatewayAgentId.trim() : null,
    role: typeof record.role === "string" ? record.role.trim() : "",
    status: record.status === true,
    isDefault: record.isDefault === true,
  };
};

const normalizeCatalogWorkspace = (raw: unknown): SquadCatalogWorkspace => {
  const record = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
  return {
    workspaceId: typeof record.workspaceId === "number" ? record.workspaceId : 0,
    workspaceName: typeof record.workspaceName === "string" && record.workspaceName.trim() ? record.workspaceName.trim() : "Workspace",
    status: record.status === true,
  };
};

const buildBackendAgentLinks = async (
  companyId: number,
  token?: string | null,
): Promise<BackendAgentLink[]> => {
  const companyAgents = await fetchCompanyAgents(companyId, token);
  const links = await Promise.all(
    companyAgents.map(async (agent): Promise<BackendAgentLink> => {
      try {
        const details = await fetchCompanyAgentDetails(agent.id, token);
        return {
          backendAgentId: agent.id,
          gatewayAgentId: extractGatewayAgentId(details),
          name: agent.name?.trim() || agent.slug?.trim() || `Agent ${agent.id}`,
        };
      } catch {
        return {
          backendAgentId: agent.id,
          gatewayAgentId: null,
          name: agent.name?.trim() || agent.slug?.trim() || `Agent ${agent.id}`,
        };
      }
    }),
  );
  return links;
};

const pickMemberName = (
  rawMember: Record<string, unknown>,
  backendLink: BackendAgentLink | null,
) => {
  const direct = typeof rawMember.name === "string" ? rawMember.name.trim() : "";
  if (direct) return direct;
  if (backendLink?.name?.trim()) return backendLink.name.trim();
  return "Agent";
};

const normalizeBackendSquad = (
  raw: Record<string, unknown>,
  companyId: number,
  backendLinks: BackendAgentLink[],
): SquadSummary => {
  const rawMembers = Array.isArray(raw.members) ? raw.members : [];
  const members = rawMembers.map((entry) => {
    const record = typeof entry === "object" && entry ? (entry as Record<string, unknown>) : {};
    const backendAgentId =
      typeof record.agentId === "number"
        ? record.agentId
        : typeof record.backendAgentId === "number"
          ? record.backendAgentId
          : null;
    const backendLink =
      backendAgentId === null
        ? null
        : backendLinks.find((candidate) => candidate.backendAgentId === backendAgentId) ?? null;
    const gatewayAgentId =
      typeof record.gatewayAgentId === "string"
        ? record.gatewayAgentId.trim() || null
        : backendLink?.gatewayAgentId ?? null;
    const isLeader =
      record.isLeader === true ||
      (typeof raw.leaderAgentId === "number" && backendAgentId === raw.leaderAgentId);
    return {
      backendAgentId,
      gatewayAgentId,
      name: pickMemberName(record, backendLink),
      isLeader,
    };
  });

  const leaderGatewayAgentId =
    members.find((member) => member.isLeader)?.gatewayAgentId ??
    (typeof raw.leaderGatewayAgentId === "string" ? raw.leaderGatewayAgentId.trim() || null : null);

  return {
    id: String(raw.id ?? raw.squadId ?? crypto.randomUUID()),
    companyId,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "New Squad",
    description:
      typeof raw.description === "string" ? raw.description.trim() : "",
    iconEmoji: typeof raw.iconEmoji === "string" && raw.iconEmoji.trim() ? raw.iconEmoji.trim() : null,
    color: typeof raw.color === "string" && raw.color.trim() ? raw.color.trim() : null,
    avatarUrl: typeof raw.avatarUrl === "string" && raw.avatarUrl.trim() ? raw.avatarUrl.trim() : null,
    executionMode: normalizeExecutionMode(raw.defaultExecutionMode ?? raw.executionMode),
    leaderGatewayAgentId,
    members,
  };
};

export const fetchSquadCatalog = async (params?: {
  companyId?: number | null;
  token?: string | null;
}): Promise<SquadCatalog> => {
  const companyId = params?.companyId ?? getBrowserCompanyId();
  if (!companyId) {
    return { companyId: 0, agents: [], workspaces: [] };
  }
  const payload = await requestBackendJson<Record<string, unknown>>(
    `/api/Squads/by-company/${companyId}/catalog`,
    undefined,
    params?.token,
  );
  return {
    companyId,
    agents: Array.isArray(payload.agents) ? payload.agents.map(normalizeCatalogAgent).filter((agent) => agent.agentId > 0) : [],
    workspaces: Array.isArray(payload.workspaces) ? payload.workspaces.map(normalizeCatalogWorkspace).filter((workspace) => workspace.workspaceId > 0) : [],
  };
};

export const fetchCompanySquads = async (params?: {
  companyId?: number | null;
  token?: string | null;
}): Promise<SquadSummary[]> => {
  const companyId = params?.companyId ?? getBrowserCompanyId();
  if (!companyId) return [];
  const token = params?.token;

  const backendLinks = await buildBackendAgentLinks(companyId, token);
  const payload = await requestBackendJson<unknown[]>(`/api/Squads/by-company/${companyId}`, undefined, token);
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload.map((entry) =>
    normalizeBackendSquad(
      typeof entry === "object" && entry ? (entry as Record<string, unknown>) : {},
      companyId,
      backendLinks,
    ),
  );
};

export const createCompanySquad = async (params: {
  name: string;
  description?: string;
  iconEmoji?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
  memberAgentIds: number[];
  leaderAgentId?: number | null;
  executionMode?: SquadExecutionMode;
  workspaceId?: number | null;
  token?: string | null;
  companyId?: number | null;
}): Promise<SquadSummary> => {
  const companyId = params.companyId ?? getBrowserCompanyId();
  if (!companyId) {
    throw new Error("CompanyId is missing in the current browser session.");
  }

  const catalog = await fetchSquadCatalog({ companyId, token: params.token });
  const dedupedMemberAgentIds = [...new Set(params.memberAgentIds.filter((value) => Number.isFinite(value) && value > 0))];
  const selectedCatalogAgents = catalog.agents.filter((agent) => dedupedMemberAgentIds.includes(agent.agentId));

  if (selectedCatalogAgents.length === 0) {
    throw new Error("Select at least one company agent for the squad.");
  }

  const leaderAgentId =
    params.leaderAgentId && dedupedMemberAgentIds.includes(params.leaderAgentId)
      ? params.leaderAgentId
      : selectedCatalogAgents[0]?.agentId ?? null;

  if (!leaderAgentId) {
    throw new Error("Choose a leader for the squad.");
  }

  const created = await requestBackendJson<Record<string, unknown>>(
    "/api/Squads/create",
    {
      method: "POST",
      body: JSON.stringify({
        companyId,
        workspaceId: params.workspaceId ?? null,
        name: params.name.trim(),
        description: params.description?.trim() || null,
        iconEmoji: params.iconEmoji?.trim() || null,
        color: params.color?.trim() || null,
        avatarUrl: params.avatarUrl?.trim() || null,
        leaderAgentId,
        defaultExecutionMode: normalizeExecutionMode(params.executionMode),
        isActive: true,
      }),
    },
    params.token,
  );

  const squadId = Number(created.id ?? created.squadId ?? 0);
  if (!Number.isFinite(squadId) || squadId <= 0) {
    throw new Error("The backend created the squad but did not return a valid squad id.");
  }

  await requestBackendJson<unknown>(
    `/api/Squads/${encodeURIComponent(String(squadId))}/members`,
    {
      method: "PUT",
      body: JSON.stringify(
        selectedCatalogAgents.map((agent, index) => ({
          agentId: agent.agentId,
          order: index,
          isLeader: agent.agentId === leaderAgentId,
          canReceiveTasks: agent.status === true,
          role: agent.role || null,
        })),
      ),
    },
    params.token,
  );

  const refreshed = await fetchCompanySquads({ companyId, token: params.token });
  const matched = refreshed.find((entry) => Number(entry.id) === squadId);
  if (!matched) {
    throw new Error("The squad was created, but the refreshed list did not return it.");
  }
  return matched;
};

export const updateCompanySquad = async (params: {
  squadId: number;
  name?: string;
  description?: string | null;
  iconEmoji?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
  leaderAgentId?: number | null;
  executionMode?: SquadExecutionMode | null;
  workspaceId?: number | null;
  memberAgentIds?: number[];
  token?: string | null;
  companyId?: number | null;
}): Promise<void> => {
  const token = params.token ?? getBrowserAccessToken();
  const body: Record<string, unknown> = {};
  if (params.name !== undefined) body.name = params.name.trim();
  if (params.description !== undefined) body.description = params.description?.trim() || null;
  if (params.iconEmoji !== undefined) body.iconEmoji = params.iconEmoji?.trim() || null;
  if (params.color !== undefined) body.color = params.color?.trim() || null;
  if (params.avatarUrl !== undefined) body.avatarUrl = params.avatarUrl?.trim() || null;
  if (params.leaderAgentId !== undefined) body.leaderAgentId = params.leaderAgentId;
  if (params.executionMode !== undefined) body.defaultExecutionMode = params.executionMode;
  if (params.workspaceId !== undefined) body.workspaceId = params.workspaceId;

  await requestBackendJson<unknown>(
    `/api/Squads/update/${params.squadId}`,
    { method: "PUT", body: JSON.stringify(body) },
    token,
  );

  if (params.memberAgentIds && params.memberAgentIds.length > 0) {
    await requestBackendJson<unknown>(
      `/api/Squads/${params.squadId}/members`,
      {
        method: "PUT",
        body: JSON.stringify(
          params.memberAgentIds.map((agentId, index) => ({
            agentId,
            order: index,
            isLeader: agentId === params.leaderAgentId,
            canReceiveTasks: true,
          })),
        ),
      },
      token,
    );
  }
};

export const deleteCompanySquad = async (params: {
  squadId: number;
  companyId?: number | null;
  token?: string | null;
}): Promise<void> => {
  const query = new URLSearchParams();
  if (typeof params.companyId === "number" && Number.isFinite(params.companyId)) {
    query.set("companyId", String(params.companyId));
  }

  await requestBackendJson<unknown>(
    `/api/Squads/delete/${params.squadId}${query.size ? `?${query.toString()}` : ""}`,
    { method: "DELETE" },
    params.token ?? getBrowserAccessToken(),
  );
};

export type SquadTaskRun = {
  id: number;
  squadTaskId: number;
  agentId: number;
  agentName: string;
  agentSlug: string;
  role: string;
  status: string;
  inputPrompt: string;
  outputText: string;
  externalRuntime: string;
  externalTaskId: string;
  externalRunId: string;
  externalSessionKey: string;
  dispatchError: string;
  metadataJson: string;
  lastSyncedAtUtc: string | null;
  startedAtUtc: string | null;
  finishedAtUtc: string | null;
  // v9 render-state
  lastRenderedMessageId: number | null;
  lastRenderedAtUtc: string | null;
  lastRenderedText: string | null;
  renderVersion: number;
  sessionKey: string | null;
};

export type SquadTaskSummary = {
  id: number;
  squadId: number;
  squadName: string;
  title: string;
  executionMode: string;
  preferredModel: string | null;
  status: string;
  runCount: number;
  startedAtUtc: string | null;
  finishedAtUtc: string | null;
  createdDate: string | null;
  updatedDate: string | null;
};

export type SquadTaskMessage = {
  id: number;
  sequence: number;
  role: string;
  authorType: string;
  authorId: number | null;
  authorName: string;
  content: string;
  createdDate: string | null;
};

export type SquadTaskEvent = {
  id: number;
  type: string;
  level: string;
  message: string;
  createdDate: string | null;
};

export type SquadTask = SquadTaskSummary & {
  companyId: number;
  requestedByUserId: number | null;
  requestedByUserName: string;
  targetAgentId: number | null;
  targetAgentName: string;
  prompt: string;
  preferredModel: string | null;
  summary: string;
  finalResponse: string;
  runs: SquadTaskRun[];
  messages: SquadTaskMessage[];
  events: SquadTaskEvent[];
  // v9 render-state (task-level)
  lastRenderedMessageId: number | null;
  lastRenderedAtUtc: string | null;
  lastUserText: string | null;
  lastAssistantText: string | null;
  executionSummary: string | null;
  renderVersion: number;
  sessionKey: string | null;
};

export type SquadTaskRenderAckPayload = {
  messageId: number;
  renderedText: string;
  fingerprint?: string | null;
  clientTurnId?: string | null;
};

export type SquadTaskRenderAckResult = {
  taskId: number;
  messageId: number;
  renderVersion: number;
  acceptedAtUtc: string;
};

export type SquadTaskContextSnapshot = {
  taskId: number;
  squadId: number;
  sessionKey: string | null;
  renderVersion: number;
  lastRenderedMessageId: number | null;
  lastRenderedAtUtc: string | null;
  lastUserText: string | null;
  lastAssistantText: string | null;
  executionSummary: string | null;
  contextJson: string | null;
  updatedAtUtc: string | null;
};


export type SquadTaskRunUpdatePayload = {
  status?: string | null;
  outputText?: string | null;
  externalRuntime?: string | null;
  externalTaskId?: string | null;
  externalRunId?: string | null;
  externalSessionKey?: string | null;
  dispatchError?: string | null;
  metadataJson?: string | null;
  lastSyncedAtUtc?: string | null;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
};

export type SquadTaskDispatchRequest = {
  runIds?: number[];
  onlyPendingRuns?: boolean;
  retryFailedRuns?: boolean;
  forceRedispatchCompletedRuns?: boolean;
  model?: string | null;
  thinking?: string | null;
  timeoutSeconds?: number | null;
  deliveryMode?: string | null;
  channel?: string | null;
  to?: string | null;
  wakeMode?: string | null;
  additionalInstructions?: string | null;
};

export type SquadTaskDispatchEstimate = {
  taskId: number;
  requestedRuns: number;
  selectedRuns: number;
  estimatedInputTokensPerRun: number;
  estimatedOutputTokensPerRun: number;
  estimatedTokensPerRun: number;
  estimatedTotalTokens: number;
  thinking: string;
  model: string | null;
  notes: string;
};

export type SquadTaskDispatchResult = {
  taskId: number;
  requestedRuns: number;
  dispatchedRuns: number;
  failedRuns: number;
  skippedRuns: number;
  hooksConfigured: boolean;
  runtime: string;
  runs: SquadTaskRun[];
};

type BackendSquadExecutionStep = Record<string, unknown>;
type BackendSquadExecution = Record<string, unknown>;

const readString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const readNullableString = (value: unknown) =>
  typeof value === "string" ? value : null;

const readNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readNullableNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeExecutionStatus = (value: unknown) => {
  const status = readString(value, "pending").toLowerCase();
  if (status === "queued") return "pending";
  return status || "pending";
};

const normalizeExecutionRun = (raw: BackendSquadExecutionStep): SquadTaskRun => ({
  id: readNumber(raw.id),
  squadTaskId: readNumber(raw.executionId),
  agentId: readNumber(raw.agentId),
  agentName: readString(raw.agentName, `Agent ${readNumber(raw.agentId, 0)}`),
  agentSlug: readString(raw.agentSlug),
  role: readString(raw.stepKind, "member"),
  status: normalizeExecutionStatus(raw.status),
  inputPrompt: readString(raw.inputPrompt),
  outputText: readString(raw.outputText),
  externalRuntime: readString(raw.externalRuntime),
  externalTaskId: readString(raw.externalTaskId),
  externalRunId: readString(raw.externalRunId),
  externalSessionKey: readString(raw.externalSessionKey),
  dispatchError: readString(raw.errorMessage),
  metadataJson: readString(raw.metadataJson),
  lastSyncedAtUtc: readNullableString(raw.lastSyncedAtUtc),
  startedAtUtc: readNullableString(raw.startedAtUtc),
  finishedAtUtc: readNullableString(raw.finishedAtUtc),
  // v9 render-state
  lastRenderedMessageId: readNullableNumber(raw.lastRenderedMessageId),
  lastRenderedAtUtc: readNullableString(raw.lastRenderedAtUtc),
  lastRenderedText: readNullableString(raw.lastRenderedText),
  renderVersion: readNumber(raw.renderVersion, 0),
  sessionKey: readNullableString(raw.sessionKey ?? raw.externalSessionKey),
});


const normalizeExecutionMessage = (raw: Record<string, unknown>): SquadTaskMessage => ({
  id: readNumber(raw.id),
  sequence: readNumber(raw.sequence),
  role: readString(raw.role, "system"),
  authorType: readString(raw.authorType, "system"),
  authorId: readNullableNumber(raw.authorId),
  authorName: readString(raw.authorName),
  content: readString(raw.content),
  createdDate: readNullableString(raw.createdDate),
});

const normalizeExecutionEvent = (raw: Record<string, unknown>): SquadTaskEvent => ({
  id: readNumber(raw.id),
  type: readString(raw.type),
  level: readString(raw.level),
  message: readString(raw.message),
  createdDate: readNullableString(raw.createdDate),
});

const normalizeExecutionSummary = (raw: BackendSquadExecution): SquadTaskSummary => {
  const runs = Array.isArray(raw.steps) ? raw.steps.map((entry) => normalizeExecutionRun((entry ?? {}) as BackendSquadExecutionStep)) : [];
  return {
    id: readNumber(raw.id),
    squadId: readNumber(raw.squadId),
    squadName: readString(raw.squadName),
    title: readString(raw.title, `Execution #${readNumber(raw.id, 0)}`),
    executionMode: readString(raw.mode, "sequential"),
    preferredModel: readNullableString(raw.preferredModel),
    status: normalizeExecutionStatus(raw.status),
    runCount: runs.length,
    startedAtUtc: readNullableString(raw.startedAtUtc),
    finishedAtUtc: readNullableString(raw.finishedAtUtc),
    createdDate: readNullableString(raw.createdDate),
    updatedDate: readNullableString(raw.updatedDate),
  };
};

const normalizeExecutionTask = (raw: unknown): SquadTask => {
  const record = typeof raw === "object" && raw ? (raw as BackendSquadExecution) : {};
  const summary = normalizeExecutionSummary(record);
  const runs = Array.isArray(record.steps)
    ? record.steps.map((entry) => normalizeExecutionRun((entry ?? {}) as BackendSquadExecutionStep)).sort((a, b) => a.id - b.id)
    : [];
  const messages = Array.isArray(record.messages)
    ? record.messages.map((entry) => normalizeExecutionMessage((entry ?? {}) as Record<string, unknown>)).sort((a, b) => a.sequence - b.sequence)
    : [];
  const events = Array.isArray(record.events)
    ? record.events.map((entry) => normalizeExecutionEvent((entry ?? {}) as Record<string, unknown>)).sort((a, b) => a.id - b.id)
    : [];
  const currentRun = runs.find((run) => run.status === "running") ?? runs[runs.length - 1] ?? null;
  return {
    ...summary,
    companyId: readNumber(record.companyId),
    requestedByUserId: readNullableNumber(record.requestedByUserId),
    requestedByUserName: readString(record.requestedByUserName),
    targetAgentId: currentRun?.agentId ?? null,
    targetAgentName: currentRun?.agentName ?? "",
    prompt: readString(record.prompt),
    preferredModel: readNullableString(record.preferredModel),
    summary: readString(record.summary),
    finalResponse: readString(record.finalResponse || record.summary),
    runs,
    messages,
    events,
    // v9 render-state (task-level)
    lastRenderedMessageId: readNullableNumber(record.lastRenderedMessageId),
    lastRenderedAtUtc: readNullableString(record.lastRenderedAtUtc),
    lastUserText: readNullableString(record.lastUserText),
    lastAssistantText: readNullableString(record.lastAssistantText),
    executionSummary: readNullableString(record.executionSummary),
    renderVersion: readNumber(record.renderVersion, 0),
    sessionKey: readNullableString(record.sessionKey),
  };
};

export const fetchSquadTasks = async (params?: {
  companyId?: number | null;
  squadId?: number | null;
  token?: string | null;
}): Promise<SquadTaskSummary[]> => {
  const companyId = params?.companyId ?? getBrowserCompanyId();
  if (!companyId) return [];
  const search = params?.squadId ? `?squadId=${encodeURIComponent(String(params.squadId))}` : "";
  const payload = await requestBackendJson<unknown[]>(
    `/api/SquadExecutions/by-company/${companyId}${search}`,
    undefined,
    params?.token,
  );
  return Array.isArray(payload) ? payload.map((entry) => normalizeExecutionSummary((entry ?? {}) as BackendSquadExecution)) : [];
};

export const fetchSquadTask = async (taskId: number, token?: string | null): Promise<SquadTask> => {
  const payload = await requestBackendJson<unknown>(`/api/SquadExecutions/${taskId}`, undefined, token);
  return normalizeExecutionTask(payload);
};

export const createSquadTask = async (params: {
  squadId: number;
  companyId?: number | null;
  title: string;
  prompt: string;
  executionMode?: string | null;
  preferredModel?: string | null;
  targetAgentId?: number | null;
  token?: string | null;
}): Promise<SquadTask> => {
  const companyId = params.companyId ?? getBrowserCompanyId();
  if (!companyId) {
    throw new Error("CompanyId is missing in the current browser session.");
  }
  const payload = await requestBackendJson<unknown>(
    `/api/SquadExecutions`,
    {
      method: "POST",
      body: JSON.stringify({
        squadId: params.squadId,
        title: params.title.trim(),
        prompt: params.prompt.trim(),
        mode: params.executionMode ?? "sequential",
        preferredModel: params.preferredModel ?? null,
        autoDispatch: false,
      }),
    },
    params.token,
  );
  return normalizeExecutionTask(payload);
};

export const estimateSquadTaskDispatch = async (
  taskId: number,
  payload: SquadTaskDispatchRequest,
  token?: string | null,
): Promise<SquadTaskDispatchEstimate> => {
  const task = await fetchSquadTask(taskId, token);
  const selectedRuns = payload.retryFailedRuns
    ? task.runs.filter((run) => run.status === "failed").length || task.runs.filter((run) => run.status !== "completed").length
    : task.runs.filter((run) => run.status !== "completed").length || task.runs.length;
  const estimatedInputTokensPerRun = 1200;
  const estimatedOutputTokensPerRun = 1600;
  const estimatedTokensPerRun = estimatedInputTokensPerRun + estimatedOutputTokensPerRun;
  return {
    taskId,
    requestedRuns: selectedRuns,
    selectedRuns,
    estimatedInputTokensPerRun,
    estimatedOutputTokensPerRun,
    estimatedTokensPerRun,
    estimatedTotalTokens: selectedRuns * estimatedTokensPerRun,
    thinking: payload.thinking ?? "medium",
    model: payload.model ?? task.preferredModel ?? null,
    notes: "Estimate generated on the frontend for the new SquadExecution flow.",
  };
};

export const dispatchSquadTask = async (
  taskId: number,
  payload: SquadTaskDispatchRequest,
  token?: string | null,
): Promise<SquadTaskDispatchResult> => {
  const response = await requestBackendJson<unknown>(
    `/api/SquadExecutions/${taskId}/dispatch`,
    {
      method: "POST",
      body: JSON.stringify({
        model: payload.model ?? null,
        thinking: payload.thinking ?? "medium",
        timeoutSeconds: payload.timeoutSeconds ?? 0,
        wakeMode: payload.wakeMode ?? "now",
        retryFailedStep: payload.retryFailedRuns === true || payload.forceRedispatchCompletedRuns === true,
      }),
    },
    token,
  );
  const task = normalizeExecutionTask(response);
  const failedRuns = task.runs.filter((run) => run.status === "failed").length;
  const runningRuns = task.runs.filter((run) => run.status === "running").length;
  const completedRuns = task.runs.filter((run) => run.status === "completed").length;
  return {
    taskId: task.id,
    requestedRuns: task.runs.length,
    dispatchedRuns: runningRuns > 0 ? runningRuns : task.status === "running" ? 1 : completedRuns,
    failedRuns,
    skippedRuns: 0,
    hooksConfigured: true,
    runtime: "openclaw-hook-agent",
    runs: task.runs,
  };
};

export const updateSquadTaskRun = async (
  runId: number,
  payload: SquadTaskRunUpdatePayload,
  _token?: string | null,
): Promise<SquadTaskRun> => {
  return {
    id: runId,
    squadTaskId: 0,
    agentId: 0,
    agentName: "Agent",
    agentSlug: "",
    role: "member",
    status: payload.status ?? "completed",
    inputPrompt: "",
    outputText: payload.outputText ?? "",
    externalRuntime: payload.externalRuntime ?? "openclaw-hook-agent",
    externalTaskId: payload.externalTaskId ?? "",
    externalRunId: payload.externalRunId ?? "",
    externalSessionKey: payload.externalSessionKey ?? "",
    dispatchError: payload.dispatchError ?? "",
    metadataJson: payload.metadataJson ?? "",
    lastSyncedAtUtc: payload.lastSyncedAtUtc ?? null,
    startedAtUtc: payload.startedAtUtc ?? null,
    finishedAtUtc: payload.finishedAtUtc ?? null,
    messages: [],
    events: [],
  } as unknown as SquadTaskRun;
};

// ---------------------------------------------------------------------------
// v9: render-ack + context endpoints
// ---------------------------------------------------------------------------

/**
 * Compute a stable SHA-256 fingerprint of the rendered message text.
 * Used to dedup render acks across page reloads & concurrent tabs.
 */
const computeRenderFingerprint = async (text: string): Promise<string> => {
  try {
    const enc = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", enc);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Fallback: non-cryptographic but deterministic.
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) | 0;
    }
    return `fallback-${(hash >>> 0).toString(16)}`;
  }
};

/**
 * POST /api/Squads/tasks/{taskId}/render-ack
 *
 * Tells the backend that `messageId` has been rendered to the user and the
 * corresponding `renderedText` was visible in the DOM. The server uses this
 * to advance the render-version and avoid re-sending the same turn on reload.
 */
export const ackSquadTaskRender = async (
  taskId: number,
  payload: SquadTaskRenderAckPayload,
  token?: string | null,
): Promise<SquadTaskRenderAckResult> => {
  const fingerprint =
    payload.fingerprint ?? (await computeRenderFingerprint(payload.renderedText));
  const response = await requestBackendJson<Record<string, unknown>>(
    `/api/Squads/tasks/${encodeURIComponent(String(taskId))}/render-ack`,
    {
      method: "POST",
      body: JSON.stringify({
        messageId: payload.messageId,
        renderedText: payload.renderedText,
        fingerprint,
        clientTurnId: payload.clientTurnId ?? null,
      }),
    },
    token,
  );
  return {
    taskId: readNumber(response.taskId, taskId),
    messageId: readNumber(response.messageId, payload.messageId),
    renderVersion: readNumber(response.renderVersion, 0),
    acceptedAtUtc: readString(response.acceptedAtUtc),
  };
};

/**
 * GET /api/Squads/tasks/{taskId}/context
 *
 * Returns the frozen render context for a task — what's been rendered, the
 * last user/assistant turn, running summary, and any cached JSON context the
 * backend hydrates from SquadTaskContextState.
 */
export const fetchSquadTaskContext = async (
  taskId: number,
  token?: string | null,
): Promise<SquadTaskContextSnapshot> => {
  const response = await requestBackendJson<Record<string, unknown>>(
    `/api/Squads/tasks/${encodeURIComponent(String(taskId))}/context`,
    undefined,
    token,
  );
  return {
    taskId: readNumber(response.taskId, taskId),
    squadId: readNumber(response.squadId),
    sessionKey: readNullableString(response.sessionKey),
    renderVersion: readNumber(response.renderVersion, 0),
    lastRenderedMessageId: readNullableNumber(response.lastRenderedMessageId),
    lastRenderedAtUtc: readNullableString(response.lastRenderedAtUtc),
    lastUserText: readNullableString(response.lastUserText),
    lastAssistantText: readNullableString(response.lastAssistantText),
    executionSummary: readNullableString(response.executionSummary),
    contextJson: readNullableString(response.contextJson),
    updatedAtUtc: readNullableString(response.updatedAtUtc),
  };
};
