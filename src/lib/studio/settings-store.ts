import fs from "node:fs";
import path from "node:path";

import { resolveStateDir } from "@/lib/clawdbot/paths";
import {
  defaultStudioSettings,
  mergeStudioSettings,
  normalizeStudioSettings,
  type StudioSettings,
  type StudioSettingsPatch,
} from "@/lib/studio/settings";

// Studio settings are intentionally stored as a local JSON file for a single-user workflow.
// That includes gateway connection details, so treat the state directory as plaintext secret
// storage and document any changes to this threat model in README.md and SECURITY.md.
const SETTINGS_DIRNAME = "claw3d";
const SETTINGS_FILENAME = "settings.json";
const OPENCLAW_CONFIG_FILENAME = "openclaw.json";

export const resolveStudioSettingsPath = () =>
  path.join(resolveStateDir(), SETTINGS_DIRNAME, SETTINGS_FILENAME);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");

const readOpenclawGatewayDefaults = (): { url: string; token: string } | null => {
  try {
    const configPath = path.join(resolveStateDir(), OPENCLAW_CONFIG_FILENAME);
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    const gateway = isRecord(parsed.gateway) ? parsed.gateway : null;
    if (!gateway) return null;
    const auth = isRecord(gateway.auth) ? gateway.auth : null;
    const token = typeof auth?.token === "string" ? auth.token.trim() : "";
    const port = typeof gateway.port === "number" && Number.isFinite(gateway.port) ? gateway.port : null;
    if (!token) return null;
    const url = port ? `ws://localhost:${port}` : "";
    if (!url) return null;
    return { url, token };
  } catch {
    return null;
  }
};

export const loadLocalGatewayDefaults = () => {
  return readOpenclawGatewayDefaults();
};

export const loadStudioSettings = (): StudioSettings => {
  const settingsPath = resolveStudioSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    const defaults = defaultStudioSettings();
    const gateway = loadLocalGatewayDefaults();
    return gateway ? { ...defaults, gateway } : defaults;
  }
  const raw = fs.readFileSync(settingsPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const settings = normalizeStudioSettings(parsed);
  if (!settings.gateway?.token) {
    const gateway = loadLocalGatewayDefaults();
    if (gateway) {
      return {
        ...settings,
        gateway: settings.gateway?.url?.trim()
          ? { url: settings.gateway.url.trim(), token: gateway.token }
          : gateway,
      };
    }
  }
  return settings;
};

export const saveStudioSettings = (next: StudioSettings) => {
  const settingsPath = resolveStudioSettingsPath();
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // ── Defensive guard: never overwrite non-empty office/avatars/deskAssignments
  //    with empty data.  If the file on disk currently has entries but `next`
  //    would erase them, merge the existing entries back in so we never silently
  //    lose the user's office configuration.
  if (fs.existsSync(settingsPath)) {
    try {
      const diskRaw = fs.readFileSync(settingsPath, "utf8");
      const diskParsed = JSON.parse(diskRaw) as Record<string, unknown> | null;
      if (diskParsed && typeof diskParsed === "object") {
        const diskOffice = diskParsed.office;
        if (
          diskOffice &&
          typeof diskOffice === "object" &&
          Object.keys(diskOffice).length > 0 &&
          Object.keys(next.office).length === 0
        ) {
          // Restore office entries that would otherwise be lost
          next = {
            ...next,
            office: normalizeStudioSettings(diskParsed).office,
          };
        }
        const diskAvatars = diskParsed.avatars;
        if (
          diskAvatars &&
          typeof diskAvatars === "object" &&
          Object.keys(diskAvatars).length > 0 &&
          Object.keys(next.avatars).length === 0
        ) {
          next = {
            ...next,
            avatars: normalizeStudioSettings(diskParsed).avatars,
          };
        }
        const diskDeskAssignments = diskParsed.deskAssignments;
        if (
          diskDeskAssignments &&
          typeof diskDeskAssignments === "object" &&
          Object.keys(diskDeskAssignments).length > 0 &&
          Object.keys(next.deskAssignments).length === 0
        ) {
          next = {
            ...next,
            deskAssignments: normalizeStudioSettings(diskParsed).deskAssignments,
          };
        }
        // Also protect the gateway from being accidentally nullified
        if (!next.gateway && diskParsed.gateway && typeof diskParsed.gateway === "object") {
          const diskSettings = normalizeStudioSettings(diskParsed);
          if (diskSettings.gateway?.url) {
            next = { ...next, gateway: diskSettings.gateway };
          }
        }
      }
    } catch {
      // If we can't read the existing file, just proceed with the save
    }
  }

  fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2), "utf8");
};

export const applyStudioSettingsPatch = (patch: StudioSettingsPatch): StudioSettings => {
  const current = loadStudioSettings();
  let next = mergeStudioSettings(current, patch);

  // ── Defensive: if the patch didn't explicitly delete office entries
  //    but the merge lost them, carry them forward from `current`.
  const currentOfficeKeys = Object.keys(current.office);
  const nextOfficeKeys = Object.keys(next.office);
  if (currentOfficeKeys.length > 0 && nextOfficeKeys.length === 0) {
    // Only allow explicit deletion (patch.office[key] === null)
    const hasExplicitDelete =
      patch.office &&
      Object.values(patch.office).some((v) => v === null);
    if (!hasExplicitDelete) {
      next = { ...next, office: { ...current.office } };
    }
  }

  // Same guard for gateway
  if (current.gateway?.url && !next.gateway && patch.gateway !== null) {
    next = { ...next, gateway: current.gateway };
  }

  saveStudioSettings(next);
  return next;
};
