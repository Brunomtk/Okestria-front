export const AGENT_FILE_NAMES = [
  "AGENTS.md",
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "TOOLS.md",
  "HEARTBEAT.md",
  "MEMORY.md",
] as const;

export type AgentFileName = (typeof AGENT_FILE_NAMES)[number];

export const PERSONALITY_FILE_NAMES = [
  "SOUL.md",
  "AGENTS.md",
  "USER.md",
  "IDENTITY.md",
] as const satisfies readonly AgentFileName[];

export type PersonalityFileName = (typeof PERSONALITY_FILE_NAMES)[number];

export const PERSONALITY_FILE_LABELS: Record<PersonalityFileName, string> = {
  "SOUL.md": "Persona",
  "AGENTS.md": "Directives",
  "USER.md": "Context",
  "IDENTITY.md": "Identity",
};

export const isAgentFileName = (value: string): value is AgentFileName =>
  AGENT_FILE_NAMES.includes(value as AgentFileName);

export const AGENT_FILE_META: Record<AgentFileName, { title: string; hint: string }> = {
  "AGENTS.md": {
    title: "AGENTS.md",
    hint: "Operating instructions, priorities, and rules.",
  },
  "SOUL.md": {
    title: "SOUL.md",
    hint: "Persona, tone, and boundaries.",
  },
  "IDENTITY.md": {
    title: "IDENTITY.md",
    hint: "Name, vibe, and emoji.",
  },
  "USER.md": {
    title: "USER.md",
    hint: "User profile and preferences.",
  },
  "TOOLS.md": {
    title: "TOOLS.md",
    hint: "Local tool notes and conventions.",
  },
  "HEARTBEAT.md": {
    title: "HEARTBEAT.md",
    hint: "Small checklist for heartbeat runs.",
  },
  "MEMORY.md": {
    title: "MEMORY.md",
    hint: "Durable memory for this agent.",
  },
};

export const AGENT_FILE_PLACEHOLDERS: Record<AgentFileName, string> = {
  "AGENTS.md": "How should this agent work? Priorities, rules, and habits.",
  "SOUL.md": "Tone, personality, boundaries, and how it should sound.",
  "IDENTITY.md": "Name, vibe, emoji, and a one-line identity.",
  "USER.md": "How should it address you? Preferences and context.",
  "TOOLS.md": "Local tool notes, conventions, and shortcuts.",
  "HEARTBEAT.md": "A tiny checklist for periodic runs.",
  "MEMORY.md": "Durable facts, decisions, and preferences to remember.",
};

/**
 * v168 — Pre-made TOOLS.md operator template.
 *
 * Dropped into a fresh agent's TOOLS textarea (or available as a
 * one-click "insert template" in the editor). Documents the *how*
 * the operator wants this agent to use its tools — separate from
 * the auto-injected recipes (Notes Vault / Instagram Apify) which
 * the v84 composer appends below the operator section automatically.
 */
export const AGENT_TOOLS_TEMPLATE = `# TOOLS — operator notes

How I use my available tools, and the conventions I follow.

## Default behaviors

- Always confirm destructive actions with the operator before running them.
- Prefer reading existing notes (Notes Vault) before scraping fresh data.
- When a third-party scrape costs API budget, summarize first, then ask
  before pulling more.

## Notes Vault — when I write

- Daily briefings: \`briefings/YYYY-MM-DD-<topic>.md\`
- Lead summaries: \`leads/<handle>.md\`
- Playbooks: \`playbooks/<topic>.md\`
- Journal: \`journal/YYYY-MM-DD.md\`

## Instagram scraping — what I capture

- Default \`resultsType: "posts"\`, \`limit: 12\` unless the operator says otherwise.
- Always set \`persistToVault: true\` so the run is replayable later.
- If the daily Apify budget is exhausted, STOP and tell the operator in the reply.

## Custom shortcuts

(Add team-specific tool shortcuts here — slash-commands, sheet templates, etc.)
`;

export const createAgentFilesState = () =>
  Object.fromEntries(
    AGENT_FILE_NAMES.map((name) => [name, { content: "", exists: false }])
  ) as Record<AgentFileName, { content: string; exists: boolean }>;
