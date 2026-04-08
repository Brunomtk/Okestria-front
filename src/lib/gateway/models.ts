export type GatewayModelChoice = {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  reasoning?: boolean;
};

type GatewayModelAliasEntry = {
  alias?: string;
};

type GatewayModelDefaults = {
  model?: string | { primary?: string; fallbacks?: string[] };
  models?: Record<string, GatewayModelAliasEntry>;
};

export type GatewayModelPolicySnapshot = {
  config?: {
    agents?: {
      defaults?: GatewayModelDefaults;
      list?: Array<{
        id?: string;
        model?: string | { primary?: string; fallbacks?: string[] };
      }>;
    };
  };
};

export const resolveConfiguredModelKey = (
  raw: string,
  models?: Record<string, GatewayModelAliasEntry>
) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("/")) return trimmed;
  if (models) {
    const target = Object.entries(models).find(
      ([, entry]) => entry?.alias?.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (target?.[0]) return target[0];
  }
  return `anthropic/${trimmed}`;
};

export const buildAllowedModelKeys = (snapshot: GatewayModelPolicySnapshot | null) => {
  const allowedList: string[] = [];
  const allowedSet = new Set<string>();
  const defaults = snapshot?.config?.agents?.defaults;
  const modelDefaults = defaults?.model;
  const modelAliases = defaults?.models;
  const configuredAgents = Array.isArray(snapshot?.config?.agents?.list)
    ? snapshot.config?.agents?.list ?? []
    : [];

  const pushModelRef = (value?: string | { primary?: string; fallbacks?: string[] } | null) => {
    if (!value) return;
    if (typeof value === "string") {
      const resolved = resolveConfiguredModelKey(value, modelAliases);
      if (!resolved || allowedSet.has(resolved)) return;
      allowedSet.add(resolved);
      allowedList.push(resolved);
      return;
    }

    const primary = typeof value.primary === "string" ? value.primary : null;
    if (primary) pushModelRef(primary);
    for (const fallback of Array.isArray(value.fallbacks) ? value.fallbacks : []) {
      pushModelRef(fallback);
    }
  };

  pushModelRef(modelDefaults);

  for (const entry of configuredAgents) {
    pushModelRef(entry?.model ?? null);
  }

  return allowedList;
};

export const buildGatewayModelChoices = (
  catalog: GatewayModelChoice[],
  snapshot: GatewayModelPolicySnapshot | null
) => {
  const allowedKeys = buildAllowedModelKeys(snapshot);
  if (allowedKeys.length === 0) return catalog;

  // Only show models that are both allowed by config and currently returned
  // by the live gateway catalog. This keeps the chat picker limited to models
  // that are actually available right now instead of surfacing stale aliases
  // or configured fallbacks with missing auth/provider support.
  const allowedSet = new Set(allowedKeys);
  return catalog.filter((entry) => allowedSet.has(`${entry.provider}/${entry.id}`));
};
