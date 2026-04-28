import { getOkestriaApiBaseUrl } from "@/lib/auth/api";
import { ensureFreshAccessToken } from "@/lib/auth/session-client";
import type { PersonalityBuilderDraft } from "@/lib/agents/personalityBuilder";
import { serializePersonalityFiles } from "@/lib/agents/personalityBuilder";
import type { AgentAvatarProfile } from "@/lib/avatars/profile";

export type BackendAgentSummary = {
  id: number;
  companyId: number;
  name?: string | null;
  slug?: string | null;
  role?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  avatarProfileJson?: string | null;
  emoji?: string | null;
  status?: boolean | null;
  isDefault?: boolean | null;
};

export type BackendAgentProfile = {
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

export type BackendAgentFile = {
  fileType?: string | null;
  content?: string | null;
};

export type BackendAgentDetails = BackendAgentSummary & {
  profile?: BackendAgentProfile | null;
  files?: BackendAgentFile[] | null;
};

export type CompanyAgentScope = {
  gatewayAgentIds: string[];
  agentSlugs: string[];
};

export type CompanyRuntimeRosterAgent = {
  id: number;
  companyId: number;
  name?: string | null;
  slug?: string | null;
  role?: string | null;
  status?: boolean | null;
  isDefault?: boolean | null;
  gatewayAgentId?: string | null;
};

export type CompanyRuntimeRosterResponse = {
  companyId: number;
  agents?: CompanyRuntimeRosterAgent[] | null;
};

const parseCookieValue = (name: string) => {
  if (typeof document === "undefined") return null;
  const needle = `${encodeURIComponent(name)}=`;
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(needle));
  if (!entry) return null;
  return decodeURIComponent(entry.slice(needle.length));
};

export const getBrowserAccessToken = () => parseCookieValue("okestria_access_token");

export const getBrowserCompanyId = () => {
  const raw = parseCookieValue("okestria_session");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { companyId?: number | null };
    return typeof parsed.companyId === "number" && Number.isFinite(parsed.companyId)
      ? parsed.companyId
      : null;
  } catch {
    return null;
  }
};

const normalizeErrorText = async (response: Response) => {
  const text = (await response.text()).trim();
  return text.replace(/^"|"$/g, "") || `Request failed with status ${response.status}`;
};

const performRequest = async (
  path: string,
  init: RequestInit | undefined,
  bearer: string | null,
) => {
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
  token?: string | null,
): Promise<T> => {
  // Proactively refresh expiring access tokens before firing the request so
  // users don't lose their session while the office is idle in the background.
  let resolvedToken: string | null | undefined = token;
  if (!resolvedToken) {
    resolvedToken = (await ensureFreshAccessToken()) ?? getBrowserAccessToken();
  }

  let response = await performRequest(path, init, resolvedToken ?? null);

  // If we got a 401 using a cached token, attempt one forced refresh + retry.
  if (response.status === 401 && !token) {
    const refreshed = await ensureFreshAccessToken(Number.POSITIVE_INFINITY);
    if (refreshed && refreshed !== resolvedToken) {
      response = await performRequest(path, init, refreshed);
    }
  }

  if (!response.ok) {
    throw new Error(await normalizeErrorText(response));
  }

  return (await response.json()) as T;
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim() || "agent";

const buildIdentityMarkdown = (draft: PersonalityBuilderDraft) => {
  const lines = [
    `Name: ${draft.identity.name.trim() || "New Agent"}`,
    `Role: ${draft.identity.creature.trim() || "Assistant"}`,
    `Vibe: ${draft.identity.vibe.trim() || "Helpful"}`,
    `Emoji: ${draft.identity.emoji.trim() || "✨"}`,
  ];

  const avatar = draft.identity.avatar.trim();
  if (avatar) lines.push(`Avatar: ${avatar}`);
  return lines.join("\n");
};

const buildProfilePayload = (
  draft: PersonalityBuilderDraft,
  profile: AgentAvatarProfile,
  gatewayAgentId: string,
  isDefault: boolean,
) => ({
  identityNotes: buildIdentityMarkdown(draft),
  avatarNotes: JSON.stringify(profile, null, 2),
  soul: draft.soul.coreTruths.trim(),
  boundaries: draft.soul.boundaries.trim(),
  vibe: draft.soul.vibe.trim(),
  continuity: draft.soul.continuity.trim(),
  agentsInstructions: draft.agents.trim(),
  userNotes: [draft.user.notes.trim(), draft.user.context.trim()].filter(Boolean).join("\n\n"),
  toolsNotes: draft.tools.trim(),
  memoryNotes: draft.memory.trim(),
  heartbeatNotes: draft.heartbeat.trim(),
  model: "gpt-5.4",
  thinkingLevel: "medium",
  profileJson: JSON.stringify({ gatewayAgentId, avatarProfile: profile, draft, isDefault }, null, 2),
});

const buildFilesPayload = (draft: PersonalityBuilderDraft, profile: AgentAvatarProfile): BackendAgentFile[] => {
  const serialized = serializePersonalityFiles(draft);
  return [
    { fileType: "IDENTITY", content: serialized["IDENTITY.md"] },
    { fileType: "AVATAR", content: JSON.stringify(profile, null, 2) },
    { fileType: "SOUL", content: serialized["SOUL.md"] },
    { fileType: "AGENTS", content: serialized["AGENTS.md"] },
    { fileType: "USER", content: serialized["USER.md"] },
    { fileType: "TOOLS", content: serialized["TOOLS.md"] },
    { fileType: "MEMORY", content: serialized["MEMORY.md"] },
    { fileType: "HEARTBEAT", content: serialized["HEARTBEAT.md"] },
  ];
};

export const extractGatewayAgentId = (agent: BackendAgentDetails) => {
  const raw = agent.profile?.profileJson;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { gatewayAgentId?: string };
    return typeof parsed.gatewayAgentId === "string" ? parsed.gatewayAgentId.trim() : null;
  } catch {
    return null;
  }
};

export const fetchCompanyAgents = async (companyId: number, token?: string | null) => {
  const agents = await requestBackendJson<BackendAgentSummary[]>(`/api/Agents/by-company/${companyId}`, undefined, token);
  return [...agents].sort((left, right) => {
    const leftDefault = left.isDefault === true ? 1 : 0;
    const rightDefault = right.isDefault === true ? 1 : 0;
    if (leftDefault !== rightDefault) return rightDefault - leftDefault;
    const leftName = (left.name ?? left.slug ?? "").trim().toLowerCase();
    const rightName = (right.name ?? right.slug ?? "").trim().toLowerCase();
    return leftName.localeCompare(rightName);
  });
};

// Short TTL cache so clustered callers (avatar seed, scope resolver, etc.)
// in the same tick don't each fan out an /api/Agents/{id} request.
type AgentDetailsCacheEntry = { at: number; promise: Promise<BackendAgentDetails> };
const agentDetailsCache = new Map<number, AgentDetailsCacheEntry>();
const AGENT_DETAILS_TTL_MS = 30_000;

export const invalidateAgentDetailsCache = (agentId?: number) => {
  if (typeof agentId === "number" && Number.isFinite(agentId)) {
    agentDetailsCache.delete(agentId);
  } else {
    agentDetailsCache.clear();
  }
};

export const fetchCompanyAgentDetails = async (
  agentId: number,
  token?: string | null,
  options?: { force?: boolean },
) => {
  const now = Date.now();
  if (!options?.force) {
    const cached = agentDetailsCache.get(agentId);
    if (cached && now - cached.at < AGENT_DETAILS_TTL_MS) {
      return cached.promise;
    }
  }
  const entry: AgentDetailsCacheEntry = { at: now, promise: Promise.resolve() as unknown as Promise<BackendAgentDetails> };
  const promise = requestBackendJson<BackendAgentDetails>(
    `/api/Agents/${agentId}`,
    undefined,
    token,
  ).catch((error) => {
    // Invalidate on failure so retries don't keep returning the broken promise.
    if (agentDetailsCache.get(agentId) === entry) {
      agentDetailsCache.delete(agentId);
    }
    throw error;
  });
  entry.promise = promise;
  agentDetailsCache.set(agentId, entry);
  return promise;
};


// ---------------------------------------------------------------------------
// Scope cache: once an Agent's gatewayAgentId has been resolved we keep it in
// memory so subsequent scope polls don't fan out one /api/Agents/{id} call per
// agent. gatewayAgentId is a stable identifier and the details endpoint was
// previously being hit N times every 20s (visible as burst traffic in devtools).
// ---------------------------------------------------------------------------
const gatewayAgentIdByBackendId = new Map<number, string | null>();
const inFlightScopeByCompanyId = new Map<number, Promise<CompanyAgentScope>>();

export const invalidateCompanyAgentScopeCache = (backendAgentId?: number) => {
  if (typeof backendAgentId === "number" && Number.isFinite(backendAgentId)) {
    gatewayAgentIdByBackendId.delete(backendAgentId);
  } else {
    gatewayAgentIdByBackendId.clear();
  }
};

export const fetchCompanyAgentScope = async (params?: {
  companyId?: number | null;
  token?: string | null;
  /** Force-refetch details even if we have a cached gatewayAgentId. */
  force?: boolean;
}): Promise<CompanyAgentScope> => {
  const companyId = params?.companyId ?? getBrowserCompanyId();
  if (!companyId) return { gatewayAgentIds: [], agentSlugs: [] };
  const token = params?.token;

  // Dedupe concurrent callers on the same company. Without this, multiple
  // mount-time effects in OfficeScreen can all fire scope loads in parallel.
  if (!params?.force) {
    const inFlight = inFlightScopeByCompanyId.get(companyId);
    if (inFlight) return inFlight;
  }

  const task = (async () => {
    const companyAgents = await fetchCompanyAgents(companyId, token);

    const details = await Promise.all(
      companyAgents.map(async (agent) => {
        // Happy path: we already know this agent's gatewayAgentId.
        if (!params?.force && gatewayAgentIdByBackendId.has(agent.id)) {
          const cached = gatewayAgentIdByBackendId.get(agent.id) ?? null;
          return cached;
        }
        try {
          const detail = await fetchCompanyAgentDetails(agent.id, token);
          const gatewayAgentId = extractGatewayAgentId(detail);
          gatewayAgentIdByBackendId.set(agent.id, gatewayAgentId);
          return gatewayAgentId;
        } catch {
          return null;
        }
      })
    );

    const gatewayAgentIds = details
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    const agentSlugs = companyAgents
      .map((agent) => (typeof agent.slug === "string" ? agent.slug.trim().toLowerCase() : ""))
      .filter((value) => value.length > 0);
    return { gatewayAgentIds, agentSlugs };
  })();

  inFlightScopeByCompanyId.set(companyId, task);
  try {
    return await task;
  } finally {
    // Only clear if the entry is still the same promise we inserted.
    if (inFlightScopeByCompanyId.get(companyId) === task) {
      inFlightScopeByCompanyId.delete(companyId);
    }
  }
};

export const fetchCompanyAgentRuntimeRoster = async (params?: {
  companyId?: number | null;
  token?: string | null;
}): Promise<CompanyRuntimeRosterAgent[]> => {
  const companyId = params?.companyId ?? getBrowserCompanyId();
  if (!companyId) return [];
  const token = params?.token;

  const response = await requestBackendJson<CompanyRuntimeRosterResponse>(
    `/api/Runtime/companies/${companyId}/agent-roster`,
    undefined,
    token,
  );

  const agents = Array.isArray(response.agents) ? response.agents : [];
  return agents
    .filter(
      (entry): entry is CompanyRuntimeRosterAgent =>
        typeof entry?.gatewayAgentId === "string" &&
        entry.gatewayAgentId.trim().length > 0,
    )
    .sort((left, right) => {
      const leftDefault = left.isDefault === true ? 1 : 0;
      const rightDefault = right.isDefault === true ? 1 : 0;
      if (leftDefault !== rightDefault) return rightDefault - leftDefault;

      const leftName = (left.name ?? left.slug ?? "").trim().toLowerCase();
      const rightName = (right.name ?? right.slug ?? "").trim().toLowerCase();
      return leftName.localeCompare(rightName);
    });
};

export const fetchCompanyGatewayAgentIds = async (params?: {
  companyId?: number | null;
  token?: string | null;
}) => {
  const scope = await fetchCompanyAgentScope(params);
  return scope.gatewayAgentIds;
};

const ensureBackendAgentRecord = async (params: {
  companyId: number;
  gatewayAgentId: string;
  draft: PersonalityBuilderDraft;
  profile: AgentAvatarProfile;
  token?: string | null;
}) => {
  const companyAgents = await fetchCompanyAgents(params.companyId, params.token);
  const desiredSlug = slugify(params.draft.identity.name);
  const matchedBySlug = companyAgents.find((agent) => (agent.slug ?? "").trim() === desiredSlug) ?? null;
  const matchedByGatewayId = await (async () => {
    for (const agent of companyAgents) {
      try {
        const details = await fetchCompanyAgentDetails(agent.id, params.token);
        if (extractGatewayAgentId(details) === params.gatewayAgentId.trim()) {
          return details;
        }
      } catch {
        // ignore one broken record and continue
      }
    }
    return null;
  })();

  if (matchedByGatewayId) return matchedByGatewayId;

  if (matchedBySlug) {
    return requestBackendJson<BackendAgentDetails>(
      `/api/Agents/update/${matchedBySlug.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          companyId: params.companyId,
          name: params.draft.identity.name.trim(),
          slug: desiredSlug,
          role: params.draft.identity.creature.trim() || "Assistant",
          description: params.draft.soul.coreTruths.trim() || params.draft.identity.vibe.trim() || null,
          avatarUrl: params.draft.identity.avatar.trim() || null,
          avatarProfileJson: JSON.stringify(params.profile),
          emoji: params.draft.identity.emoji.trim() || null,
          status: true,
          isDefault: matchedBySlug.isDefault === true,
        }),
      },
      params.token,
    );
  }

  const shouldCreateAsDefault = companyAgents.every((agent) => agent.isDefault !== true);

  return requestBackendJson<BackendAgentDetails>(
    "/api/Agents/create",
    {
      method: "POST",
      body: JSON.stringify({
        companyId: params.companyId,
        name: params.draft.identity.name.trim(),
        slug: desiredSlug,
        role: params.draft.identity.creature.trim() || "Assistant",
        description: params.draft.soul.coreTruths.trim() || params.draft.identity.vibe.trim() || null,
        avatarUrl: params.draft.identity.avatar.trim() || null,
        avatarProfileJson: JSON.stringify(params.profile),
        emoji: params.draft.identity.emoji.trim() || null,
        status: true,
        isDefault: shouldCreateAsDefault,
      }),
    },
    params.token,
  );
};

export const persistCompanyAgentFromWizard = async (params: {
  gatewayAgentId: string;
  draft: PersonalityBuilderDraft;
  profile: AgentAvatarProfile;
  token?: string | null;
  companyId?: number | null;
}) => {
  const companyId = params.companyId ?? getBrowserCompanyId();
  if (!companyId) {
    throw new Error("CompanyId is missing in the current browser session.");
  }

  const agent = await ensureBackendAgentRecord({
    companyId,
    gatewayAgentId: params.gatewayAgentId,
    draft: params.draft,
    profile: params.profile,
    token: params.token,
  });

  await requestBackendJson<BackendAgentProfile>(
    `/api/Agents/${agent.id}/profile`,
    {
      method: "PUT",
      body: JSON.stringify(
        buildProfilePayload(params.draft, params.profile, params.gatewayAgentId, agent.isDefault === true),
      ),
    },
    params.token,
  );

  await requestBackendJson<BackendAgentFile[]>(
    `/api/Agents/${agent.id}/files`,
    {
      method: "PUT",
      body: JSON.stringify(buildFilesPayload(params.draft, params.profile)),
    },
    params.token,
  );

  return agent;
};

export const updateAgentAvatarProfileJson = async (params: {
  backendAgentId: number;
  avatarProfileJson: string;
  token?: string | null;
}) => {
  const result = await requestBackendJson<BackendAgentDetails>(
    `/api/Agents/update/${params.backendAgentId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        avatarProfileJson: params.avatarProfileJson,
      }),
    },
    params.token,
  );
  // Stale cached details for this agent — scope cache entries stay valid since
  // gatewayAgentId doesn't change with avatar tweaks.
  invalidateAgentDetailsCache(params.backendAgentId);
  return result;
};

export const resolveBackendAgentIdByGatewayId = async (params: {
  gatewayAgentId: string;
  companyId: number;
  token?: string | null;
}): Promise<number | null> => {
  const companyAgents = await fetchCompanyAgents(params.companyId, params.token);
  for (const agent of companyAgents) {
    try {
      const details = await fetchCompanyAgentDetails(agent.id, params.token);
      if (extractGatewayAgentId(details) === params.gatewayAgentId.trim()) {
        return details.id;
      }
    } catch {
      // ignore broken records
    }
  }
  return null;
};

export const deletePersistedCompanyAgentByGatewayId = async (params: {
  gatewayAgentId: string;
  token?: string | null;
  companyId?: number | null;
}) => {
  const companyId = params.companyId ?? getBrowserCompanyId();
  if (!companyId) return false;

  const companyAgents = await fetchCompanyAgents(companyId, params.token);
  for (const agent of companyAgents) {
    try {
      const details = await fetchCompanyAgentDetails(agent.id, params.token);
      if (extractGatewayAgentId(details) !== params.gatewayAgentId.trim()) {
        continue;
      }
      await requestBackendJson<boolean>(`/api/Agents/delete/${agent.id}`, { method: "DELETE" }, params.token);
      invalidateAgentDetailsCache(agent.id);
      invalidateCompanyAgentScopeCache(agent.id);
      return true;
    } catch {
      // ignore and continue to the next candidate
    }
  }

  return false;
};

// ─────────────────────────────────────────────────────────────────────────
// v104 — Delete-agent preview (paired with back v60)
//
// The back's `GET /api/Agents/delete/{id}/preview` answers a
// `DeleteAgentSummaryDTO` describing what the cascade-delete will wipe
// (cron jobs + their runs, squad memberships, files). We call this
// before the destructive `DELETE` so the operator can read a precise
// "this also deletes 2 cron jobs (12 runs) and removes the agent from
// 1 squad" prompt.
// ─────────────────────────────────────────────────────────────────────────

export type DeleteAgentSummary = {
  agentId: number;
  agentName: string | null;
  agentSlug: string | null;
  agentExists: boolean;
  deleted: boolean;
  cronJobsAffected: number;
  cronJobRunsAffected: number;
  squadMembershipsAffected: number;
  filesAffected: number;
  hasProfile: boolean;
  cronJobNames: string[];
  squadNames: string[];
  warning: string | null;
};

const normalizeDeleteSummary = (raw: unknown): DeleteAgentSummary | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    agentId: typeof r.agentId === "number" ? r.agentId : 0,
    agentName: typeof r.agentName === "string" ? r.agentName : null,
    agentSlug: typeof r.agentSlug === "string" ? r.agentSlug : null,
    agentExists: Boolean(r.agentExists),
    deleted: Boolean(r.deleted),
    cronJobsAffected: typeof r.cronJobsAffected === "number" ? r.cronJobsAffected : 0,
    cronJobRunsAffected: typeof r.cronJobRunsAffected === "number" ? r.cronJobRunsAffected : 0,
    squadMembershipsAffected:
      typeof r.squadMembershipsAffected === "number" ? r.squadMembershipsAffected : 0,
    filesAffected: typeof r.filesAffected === "number" ? r.filesAffected : 0,
    hasProfile: Boolean(r.hasProfile),
    cronJobNames: Array.isArray(r.cronJobNames)
      ? (r.cronJobNames.filter((n) => typeof n === "string") as string[])
      : [],
    squadNames: Array.isArray(r.squadNames)
      ? (r.squadNames.filter((n) => typeof n === "string") as string[])
      : [],
    warning: typeof r.warning === "string" ? r.warning : null,
  };
};

/**
 * v104. Looks up the backend agent record that matches `gatewayAgentId`
 * and asks the back what the cascade-delete would wipe. Returns null if
 * the agent isn't persisted on the back yet (gateway-only agent).
 */
export const previewPersistedCompanyAgentDelete = async (params: {
  gatewayAgentId: string;
  token?: string | null;
  companyId?: number | null;
}): Promise<DeleteAgentSummary | null> => {
  const companyId = params.companyId ?? getBrowserCompanyId();
  if (!companyId) return null;

  const companyAgents = await fetchCompanyAgents(companyId, params.token);
  for (const agent of companyAgents) {
    try {
      const details = await fetchCompanyAgentDetails(agent.id, params.token);
      if (extractGatewayAgentId(details) !== params.gatewayAgentId.trim()) continue;
      const raw = await requestBackendJson<unknown>(
        `/api/Agents/delete/${agent.id}/preview`,
        { method: "GET" },
        params.token,
      );
      return normalizeDeleteSummary(raw);
    } catch {
      // try the next candidate
    }
  }

  return null;
};
