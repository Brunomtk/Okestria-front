import { createEmptyPersonalityDraft, type PersonalityBuilderDraft } from "@/lib/agents/personalityBuilder";

type DraftSectionKey = keyof PersonalityBuilderDraft;

type PartialDraft = {
  identity?: Partial<PersonalityBuilderDraft["identity"]>;
  user?: Partial<PersonalityBuilderDraft["user"]>;
  soul?: Partial<PersonalityBuilderDraft["soul"]>;
  agents?: string;
  tools?: string;
  memory?: string;
  heartbeat?: string;
};

const normalize = (value: string) => value.trim();

const sectionAliases: Record<string, DraftSectionKey> = {
  identity: "identity",
  "identity.md": "identity",
  avatar: "identity",
  soul: "soul",
  "soul.md": "soul",
  user: "user",
  "user.md": "user",
  agents: "agents",
  "agents.md": "agents",
  tools: "tools",
  "tools.md": "tools",
  memory: "memory",
  "memory.md": "memory",
  heartbeat: "heartbeat",
  "heartbeat.md": "heartbeat",
};

const identityLabelMap: Record<string, keyof PersonalityBuilderDraft["identity"]> = {
  name: "name",
  role: "creature",
  creature: "creature",
  vibe: "vibe",
  emoji: "emoji",
  avatar: "avatar",
};

const userLabelMap: Record<string, keyof PersonalityBuilderDraft["user"]> = {
  name: "name",
  "what to call them": "callThem",
  "call them": "callThem",
  "callthem": "callThem",
  pronouns: "pronouns",
  timezone: "timezone",
  notes: "notes",
  context: "context",
};

const soulLabelMap: Record<string, keyof PersonalityBuilderDraft["soul"]> = {
  "core truths": "coreTruths",
  boundaries: "boundaries",
  vibe: "vibe",
  continuity: "continuity",
};

const mergeDraft = (incoming: PartialDraft): PersonalityBuilderDraft => {
  const base = createEmptyPersonalityDraft();
  return {
    identity: { ...base.identity, ...(incoming.identity ?? {}) },
    user: { ...base.user, ...(incoming.user ?? {}) },
    soul: { ...base.soul, ...(incoming.soul ?? {}) },
    agents: typeof incoming.agents === "string" ? incoming.agents.trim() : "",
    tools: typeof incoming.tools === "string" ? incoming.tools.trim() : "",
    memory: typeof incoming.memory === "string" ? incoming.memory.trim() : "",
    heartbeat: typeof incoming.heartbeat === "string" ? incoming.heartbeat.trim() : "",
  };
};

const tryParseJson = (content: string): PersonalityBuilderDraft | null => {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const partial: PartialDraft = {};

    if (typeof parsed.name === "string" || typeof parsed.role === "string" || typeof parsed.vibe === "string" || typeof parsed.emoji === "string") {
      partial.identity = {
        name: typeof parsed.name === "string" ? parsed.name.trim() : "",
        creature: typeof parsed.role === "string" ? parsed.role.trim() : "",
        vibe: typeof parsed.vibe === "string" ? parsed.vibe.trim() : "",
        emoji: typeof parsed.emoji === "string" ? parsed.emoji.trim() : "",
      };
    }

    if (parsed.identity && typeof parsed.identity === "object") {
      const identity = parsed.identity as Record<string, unknown>;
      partial.identity = {
        ...(partial.identity ?? {}),
        name: typeof identity.name === "string" ? identity.name.trim() : partial.identity?.name,
        creature:
          typeof identity.creature === "string"
            ? identity.creature.trim()
            : typeof identity.role === "string"
              ? identity.role.trim()
              : partial.identity?.creature,
        vibe: typeof identity.vibe === "string" ? identity.vibe.trim() : partial.identity?.vibe,
        emoji: typeof identity.emoji === "string" ? identity.emoji.trim() : partial.identity?.emoji,
        avatar: typeof identity.avatar === "string" ? identity.avatar.trim() : partial.identity?.avatar,
      };
    }

    if (parsed.user && typeof parsed.user === "object") {
      const user = parsed.user as Record<string, unknown>;
      partial.user = {
        name: typeof user.name === "string" ? user.name.trim() : "",
        callThem:
          typeof user.callThem === "string"
            ? user.callThem.trim()
            : typeof user.call_them === "string"
              ? user.call_them.trim()
              : "",
        pronouns: typeof user.pronouns === "string" ? user.pronouns.trim() : "",
        timezone: typeof user.timezone === "string" ? user.timezone.trim() : "",
        notes: typeof user.notes === "string" ? user.notes.trim() : "",
        context: typeof user.context === "string" ? user.context.trim() : "",
      };
    }

    if (parsed.soul && typeof parsed.soul === "object") {
      const soul = parsed.soul as Record<string, unknown>;
      partial.soul = {
        coreTruths:
          typeof soul.coreTruths === "string"
            ? soul.coreTruths.trim()
            : typeof soul.core_truths === "string"
              ? soul.core_truths.trim()
              : "",
        boundaries: typeof soul.boundaries === "string" ? soul.boundaries.trim() : "",
        vibe: typeof soul.vibe === "string" ? soul.vibe.trim() : "",
        continuity: typeof soul.continuity === "string" ? soul.continuity.trim() : "",
      };
    }

    for (const key of ["agents", "tools", "memory", "heartbeat"] as const) {
      if (typeof parsed[key] === "string") {
        partial[key] = parsed[key] as string;
      }
    }

    return mergeDraft(partial);
  } catch {
    return null;
  }
};

const cleanHeading = (value: string) =>
  value
    .replace(/^#+\s*/, "")
    .replace(/[:：]\s*$/, "")
    .trim()
    .toLowerCase();

const commitSectionBody = (
  sectionKey: DraftSectionKey | null,
  bodyLines: string[],
  partial: PartialDraft,
) => {
  if (!sectionKey) return;
  const body = bodyLines.join("\n").trim();
  if (!body) return;
  if (sectionKey === "agents" || sectionKey === "tools" || sectionKey === "memory" || sectionKey === "heartbeat") {
    partial[sectionKey] = body;
    return;
  }
  if (sectionKey === "soul") {
    if (!partial.soul?.coreTruths) {
      partial.soul = { ...(partial.soul ?? {}), coreTruths: body };
    }
    return;
  }
  if (sectionKey === "user") {
    if (!partial.user?.context) {
      partial.user = { ...(partial.user ?? {}), context: body };
    }
  }
};

const tryParseStructuredText = (content: string): PersonalityBuilderDraft => {
  const partial: PartialDraft = {};
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let currentSection: DraftSectionKey | null = null;
  let currentBody: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      commitSectionBody(currentSection, currentBody, partial);
      currentBody = [];
      currentSection = sectionAliases[cleanHeading(headingMatch[1])] ?? null;
      continue;
    }

    const normalizedLine = line.replace(/^[-*]\s*/, "");
    const colonIndex = normalizedLine.indexOf(":");
    if (colonIndex > -1) {
      const label = normalizedLine.slice(0, colonIndex).trim().toLowerCase();
      const value = normalize(normalizedLine.slice(colonIndex + 1));

      if (identityLabelMap[label]) {
        partial.identity = {
          ...(partial.identity ?? {}),
          [identityLabelMap[label]]: value,
        };
        continue;
      }
      if (userLabelMap[label]) {
        partial.user = {
          ...(partial.user ?? {}),
          [userLabelMap[label]]: value,
        };
        continue;
      }
      if (soulLabelMap[label]) {
        partial.soul = {
          ...(partial.soul ?? {}),
          [soulLabelMap[label]]: value,
        };
        continue;
      }
    }

    if (currentSection) {
      currentBody.push(rawLine);
    }
  }

  commitSectionBody(currentSection, currentBody, partial);

  if (!partial.identity?.name) {
    const nameMatch = content.match(/(?:agent name|name)\s*:\s*(.+)/i);
    if (nameMatch?.[1]) {
      partial.identity = { ...(partial.identity ?? {}), name: nameMatch[1].trim() };
    }
  }
  if (!partial.identity?.creature) {
    const roleMatch = content.match(/(?:role|title)\s*:\s*(.+)/i);
    if (roleMatch?.[1]) {
      partial.identity = { ...(partial.identity ?? {}), creature: roleMatch[1].trim() };
    }
  }
  if (!partial.identity?.vibe) {
    const vibeMatch = content.match(/vibe\s*:\s*(.+)/i);
    if (vibeMatch?.[1]) {
      partial.identity = { ...(partial.identity ?? {}), vibe: vibeMatch[1].trim() };
    }
  }
  if (!partial.identity?.emoji) {
    const emojiMatch = content.match(/emoji\s*:\s*(.+)/i);
    if (emojiMatch?.[1]) {
      partial.identity = { ...(partial.identity ?? {}), emoji: emojiMatch[1].trim() };
    }
  }

  return mergeDraft(partial);
};

export const parseAgentTemplateImport = (content: string, fileName = "template.txt") => {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("The selected file is empty.");
  }

  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".json") || trimmed.startsWith("{")) {
    const parsedJson = tryParseJson(trimmed);
    if (parsedJson) {
      return parsedJson;
    }
  }

  return tryParseStructuredText(trimmed);
};
