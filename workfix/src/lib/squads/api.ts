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
          body: JSON.stringify({
            squadId,
            companyId,
            leaderAgentId: leaderBackendAgentId,
            executionMode,
            members: memberBackendIds.map((agentId) => ({ agentId })),
            memberAgentIds: memberBackendIds,
          }),
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
