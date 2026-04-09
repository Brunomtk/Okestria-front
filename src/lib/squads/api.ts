import {
  extractGatewayAgentId,
  fetchCompanyAgentDetails,
  fetchCompanyAgents,
  getBrowserAccessToken,
  getBrowserCompanyId,
} from "@/lib/agents/backend-api";
import { getOkestriaApiBaseUrl } from "@/lib/auth/api";

export type SquadExecutionMode = "manual" | "leader" | "all" | "workflow";

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

const getLocalStorageKey = (companyId: number) => `okestria.company-squads.${companyId}`;

const readLocalSquads = (companyId: number): SquadSummary[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as SquadSummary[];
  } catch {
    return [];
  }
};

const writeLocalSquads = (companyId: number, squads: SquadSummary[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getLocalStorageKey(companyId), JSON.stringify(squads, null, 2));
};

const normalizeExecutionMode = (value: unknown): SquadExecutionMode => {
  if (value === "leader" || value === "all" || value === "workflow") return value;
  return "manual";
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
    executionMode: normalizeExecutionMode(raw.defaultExecutionMode ?? raw.executionMode),
    leaderGatewayAgentId,
    members,
  };
};

export const fetchCompanySquads = async (params?: {
  companyId?: number | null;
  token?: string | null;
}): Promise<SquadSummary[]> => {
  const companyId = params?.companyId ?? getBrowserCompanyId();
  if (!companyId) return [];
  const token = params?.token;

  try {
    const backendLinks = await buildBackendAgentLinks(companyId, token);
    const payload = await requestBackendJson<unknown[]>(`/api/Squads/by-company/${companyId}`, undefined, token);
    if (!Array.isArray(payload)) {
      return readLocalSquads(companyId);
    }
    const normalized = payload.map((entry) =>
      normalizeBackendSquad(
        typeof entry === "object" && entry ? (entry as Record<string, unknown>) : {},
        companyId,
        backendLinks,
      ),
    );
    writeLocalSquads(companyId, normalized);
    return normalized;
  } catch {
    return readLocalSquads(companyId);
  }
};

export const createCompanySquad = async (params: {
  name: string;
  description?: string;
  memberGatewayAgentIds: string[];
  leaderGatewayAgentId?: string | null;
  executionMode?: SquadExecutionMode;
  companyId?: number | null;
  token?: string | null;
}): Promise<SquadSummary> => {
  const companyId = params.companyId ?? getBrowserCompanyId();
  if (!companyId) {
    throw new Error("CompanyId is missing in the current browser session.");
  }

  const backendLinks = await buildBackendAgentLinks(companyId, params.token);
  const normalizedMembers = params.memberGatewayAgentIds
    .map((gatewayAgentId) => {
      const trimmedGatewayAgentId = gatewayAgentId.trim();
      const backendLink =
        backendLinks.find((candidate) => candidate.gatewayAgentId === trimmedGatewayAgentId) ?? null;
      return {
        backendAgentId: backendLink?.backendAgentId ?? null,
        gatewayAgentId: trimmedGatewayAgentId,
        name: backendLink?.name ?? trimmedGatewayAgentId,
        isLeader: trimmedGatewayAgentId === (params.leaderGatewayAgentId ?? ""),
      };
    })
    .filter((member) => member.gatewayAgentId.length > 0);

  const executionMode = normalizeExecutionMode(params.executionMode);
  const leaderGatewayAgentId = params.leaderGatewayAgentId?.trim() || normalizedMembers[0]?.gatewayAgentId || null;

  try {
    const leaderBackendAgentId =
      normalizedMembers.find((member) => member.gatewayAgentId === leaderGatewayAgentId)?.backendAgentId ?? null;
    const created = await requestBackendJson<Record<string, unknown>>(
      "/api/Squads/create",
      {
        method: "POST",
        body: JSON.stringify({
          companyId,
          name: params.name.trim(),
          description: params.description?.trim() || null,
          leaderAgentId: leaderBackendAgentId,
          defaultExecutionMode: executionMode,
          isActive: true,
        }),
      },
      params.token,
    );
    const squadId = String(created.id ?? created.squadId ?? "").trim();
    if (squadId) {
      const memberBackendIds = normalizedMembers
        .map((member) => member.backendAgentId)
        .filter((value): value is number => typeof value === "number");
      await requestBackendJson<unknown>(
        `/api/Squads/${encodeURIComponent(squadId)}/members`,
        {
          method: "PUT",
          body: JSON.stringify(
            normalizedMembers
              .filter((member): member is typeof member & { backendAgentId: number } => typeof member.backendAgentId === "number")
              .map((member, index) => ({
                agentId: member.backendAgentId,
                order: index,
                isLeader: member.gatewayAgentId === leaderGatewayAgentId,
                canReceiveTasks: true,
              })),
          ),
        },
        params.token,
      ).catch(() => null);
    }
    const refreshed = await fetchCompanySquads({ companyId, token: params.token });
    const matched = refreshed.find((entry) => entry.id === squadId);
    if (matched) return matched;
  } catch {
    // Fall back to local cache when the backend route is unavailable.
  }

  const fallback: SquadSummary = {
    id: crypto.randomUUID(),
    companyId,
    name: params.name.trim(),
    description: params.description?.trim() || "",
    executionMode,
    leaderGatewayAgentId,
    members: normalizedMembers.map((member) => ({
      ...member,
      isLeader: member.gatewayAgentId === leaderGatewayAgentId,
    })),
  };
  const nextLocalSquads = [...readLocalSquads(companyId), fallback];
  writeLocalSquads(companyId, nextLocalSquads);
  return fallback;
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
};

export type SquadTaskSummary = {
  id: number;
  squadId: number;
  squadName: string;
  title: string;
  executionMode: string;
  status: string;
  runCount: number;
  startedAtUtc: string | null;
  finishedAtUtc: string | null;
  createdDate: string | null;
  updatedDate: string | null;
};

export type SquadTask = SquadTaskSummary & {
  companyId: number;
  requestedByUserId: number | null;
  requestedByUserName: string;
  targetAgentId: number | null;
  targetAgentName: string;
  prompt: string;
  summary: string;
  finalResponse: string;
  runs: SquadTaskRun[];
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

const readString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const readNullableString = (value: unknown) =>
  typeof value === "string" ? value : null;

const readNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readNullableNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeRun = (raw: unknown): SquadTaskRun => {
  const record = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
  return {
    id: readNumber(record.id),
    squadTaskId: readNumber(record.squadTaskId),
    agentId: readNumber(record.agentId),
    agentName: readString(record.agentName, `Agent ${readNumber(record.agentId, 0)}`),
    agentSlug: readString(record.agentSlug),
    role: readString(record.role),
    status: readString(record.status, "pending"),
    inputPrompt: readString(record.inputPrompt),
    outputText: readString(record.outputText),
    externalRuntime: readString(record.externalRuntime),
    externalTaskId: readString(record.externalTaskId),
    externalRunId: readString(record.externalRunId),
    externalSessionKey: readString(record.externalSessionKey),
    dispatchError: readString(record.dispatchError),
    metadataJson: readString(record.metadataJson),
    lastSyncedAtUtc: readNullableString(record.lastSyncedAtUtc),
    startedAtUtc: readNullableString(record.startedAtUtc),
    finishedAtUtc: readNullableString(record.finishedAtUtc),
  };
};

const normalizeTaskSummary = (raw: unknown): SquadTaskSummary => {
  const record = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
  return {
    id: readNumber(record.id),
    squadId: readNumber(record.squadId),
    squadName: readString(record.squadName),
    title: readString(record.title, `Task #${readNumber(record.id, 0)}`),
    executionMode: readString(record.executionMode, "leader"),
    status: readString(record.status, "draft"),
    runCount: readNumber(record.runCount, Array.isArray(record.runs) ? record.runs.length : 0),
    startedAtUtc: readNullableString(record.startedAtUtc),
    finishedAtUtc: readNullableString(record.finishedAtUtc),
    createdDate: readNullableString(record.createdDate),
    updatedDate: readNullableString(record.updatedDate),
  };
};

const normalizeTask = (raw: unknown): SquadTask => {
  const record = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
  const summary = normalizeTaskSummary(record);
  const runs = Array.isArray(record.runs) ? record.runs.map(normalizeRun) : [];
  return {
    ...summary,
    companyId: readNumber(record.companyId),
    requestedByUserId: readNullableNumber(record.requestedByUserId),
    requestedByUserName: readString(record.requestedByUserName),
    targetAgentId: readNullableNumber(record.targetAgentId),
    targetAgentName: readString(record.targetAgentName),
    prompt: readString(record.prompt),
    summary: readString(record.summary),
    finalResponse: readString(record.finalResponse),
    startedAtUtc: readNullableString(record.startedAtUtc),
    finishedAtUtc: readNullableString(record.finishedAtUtc),
    createdDate: readNullableString(record.createdDate),
    updatedDate: readNullableString(record.updatedDate),
    runs,
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
    `/api/Squads/tasks/by-company/${companyId}${search}`,
    undefined,
    params?.token,
  );
  return Array.isArray(payload) ? payload.map(normalizeTaskSummary) : [];
};

export const fetchSquadTask = async (taskId: number, token?: string | null): Promise<SquadTask> => {
  const payload = await requestBackendJson<unknown>(`/api/Squads/tasks/${taskId}`, undefined, token);
  return normalizeTask(payload);
};

export const createSquadTask = async (params: {
  squadId: number;
  companyId?: number | null;
  title: string;
  prompt: string;
  executionMode?: string | null;
  targetAgentId?: number | null;
  token?: string | null;
}): Promise<SquadTask> => {
  const companyId = params.companyId ?? getBrowserCompanyId();
  if (!companyId) {
    throw new Error("CompanyId is missing in the current browser session.");
  }
  const payload = await requestBackendJson<unknown>(
    `/api/Squads/tasks/create`,
    {
      method: "POST",
      body: JSON.stringify({
        companyId,
        squadId: params.squadId,
        title: params.title.trim(),
        prompt: params.prompt.trim(),
        executionMode: params.executionMode ?? "leader",
        targetAgentId: params.targetAgentId ?? null,
      }),
    },
    params.token,
  );
  return normalizeTask(payload);
};

export const estimateSquadTaskDispatch = async (
  taskId: number,
  payload: SquadTaskDispatchRequest,
  token?: string | null,
): Promise<SquadTaskDispatchEstimate> => {
  return await requestBackendJson<SquadTaskDispatchEstimate>(
    `/api/Squads/tasks/${taskId}/dispatch-estimate`,
    {
      method: "POST",
      body: JSON.stringify({
        onlyPendingRuns: payload.onlyPendingRuns ?? true,
        retryFailedRuns: payload.retryFailedRuns ?? true,
        forceRedispatchCompletedRuns: payload.forceRedispatchCompletedRuns ?? false,
        model: payload.model ?? null,
        thinking: payload.thinking ?? "medium",
        timeoutSeconds: payload.timeoutSeconds ?? 0,
        deliveryMode: payload.deliveryMode ?? "none",
        channel: payload.channel ?? null,
        to: payload.to ?? null,
        wakeMode: payload.wakeMode ?? "now",
        additionalInstructions: payload.additionalInstructions ?? null,
        runIds: payload.runIds ?? null,
      }),
    },
    token,
  );
};

export const dispatchSquadTask = async (
  taskId: number,
  payload: SquadTaskDispatchRequest,
  token?: string | null,
): Promise<SquadTaskDispatchResult> => {
  const response = await requestBackendJson<unknown>(
    `/api/Squads/tasks/${taskId}/dispatch-subagents`,
    {
      method: "POST",
      body: JSON.stringify({
        onlyPendingRuns: payload.onlyPendingRuns ?? true,
        retryFailedRuns: payload.retryFailedRuns ?? true,
        forceRedispatchCompletedRuns: payload.forceRedispatchCompletedRuns ?? false,
        model: payload.model ?? null,
        thinking: payload.thinking ?? "medium",
        timeoutSeconds: payload.timeoutSeconds ?? 0,
        deliveryMode: payload.deliveryMode ?? "none",
        channel: payload.channel ?? null,
        to: payload.to ?? null,
        wakeMode: payload.wakeMode ?? "now",
        additionalInstructions: payload.additionalInstructions ?? null,
        runIds: payload.runIds ?? null,
      }),
    },
    token,
  );
  const record = typeof response === "object" && response ? (response as Record<string, unknown>) : {};
  return {
    taskId: readNumber(record.taskId),
    requestedRuns: readNumber(record.requestedRuns),
    dispatchedRuns: readNumber(record.dispatchedRuns),
    failedRuns: readNumber(record.failedRuns),
    skippedRuns: readNumber(record.skippedRuns),
    hooksConfigured: record.hooksConfigured === true,
    runtime: readString(record.runtime, "openclaw-hook-agent"),
    runs: Array.isArray(record.runs) ? record.runs.map(normalizeRun) : [],
  };
};
