import { getOkestriaApiBaseUrl } from "@/lib/auth/api";
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

export const fetchCompanyAgentDetails = async (agentId: number, token?: string | null) => {
  return requestBackendJson<BackendAgentDetails>(`/api/Agents/${agentId}`, undefined, token);
};


export const fetchCompanyAgentScope = async (params?: {
  companyId?: number | null;
  token?: string | null;
}): Promise<CompanyAgentScope> => {
  const companyId = params?.companyId ?? getBrowserCompanyId();
  if (!companyId) return { gatewayAgentIds: [], agentSlugs: [] };
  const token = params?.token;
  const companyAgents = await fetchCompanyAgents(companyId, token);
  const details = await Promise.all(
    companyAgents.map(async (agent) => {
      try {
        return await fetchCompanyAgentDetails(agent.id, token);
      } catch {
        return null;
      }
    })
  );
  const gatewayAgentIds = details
    .map((entry) => (entry ? extractGatewayAgentId(entry) : null))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  const agentSlugs = companyAgents
    .map((agent) => (typeof agent.slug === "string" ? agent.slug.trim().toLowerCase() : ""))
    .filter((value) => value.length > 0);
  return { gatewayAgentIds, agentSlugs };
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
      return true;
    } catch {
      // ignore and continue to the next candidate
    }
  }

  return false;
};
