export type OfficeLayerId =
  | "floor"
  | "walls"
  | "furniture"
  | "decor"
  | "lighting"
  | "agents";

export type OfficeZoneType =
  | "desk_zone"
  | "meeting_room"
  | "lounge"
  | "game_room"
  | "hallway"
  | "coffee_area";

export type OfficeAgentState = "idle" | "working" | "meeting" | "error";

export type OfficeLightPreset =
  | "ceiling_lamp"
  | "desk_monitor"
  | "tv_glow"
  | "meeting_spotlight"
  | "emergency_error";

export type OfficeLightAnimationPreset =
  | "steady"
  | "soft_flicker"
  | "breathing_pulse"
  | "error_strobe_subtle";

export type OfficeAmbiencePreset =
  | "coffee_steam"
  | "window_dust"
  | "game_sparkle"
  | "plant_pollen";

export type OfficeInteractionKind =
  | "couch_sit"
  | "arcade_stand"
  | "tv_watch"
  | "desk_seat"
  | "window_stand";

export type OfficeVector = {
  x: number;
  y: number;
};

export type OfficePolygon = {
  points: OfficeVector[];
};

export type OfficeLayer = {
  id: OfficeLayerId;
  visible: boolean;
  locked: boolean;
  opacity: number;
  parallax: number;
};

export type OfficeMapObject = {
  id: string;
  assetId: string;
  layerId: OfficeLayerId;
  x: number;
  y: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  zIndex: number;
  tags: string[];
};

export type OfficeLightBinding = {
  agentId?: string;
  zoneId?: string;
  deskObjectId?: string;
  state?: OfficeAgentState;
};

export type OfficeFlickerProfile = {
  speed: number;
  amplitude: number;
};

export type OfficeLightObject = {
  id: string;
  preset: OfficeLightPreset;
  animationPreset: OfficeLightAnimationPreset;
  x: number;
  y: number;
  radius: number;
  baseIntensity: number;
  spriteAssetId?: string;
  flicker?: OfficeFlickerProfile;
  binding?: OfficeLightBinding;
  roomId?: string;
  enabled: boolean;
};

export type OfficeAmbienceEmitter = {
  id: string;
  preset: OfficeAmbiencePreset;
  zoneId: string;
  maxParticles: number;
  spawnRate: number;
  enabled: boolean;
};

export type OfficeInteractionPoint = {
  id: string;
  kind: OfficeInteractionKind;
  x: number;
  y: number;
  zoneId?: string;
  facingDegrees?: number;
  tags: string[];
};

export type OfficeZone = {
  id: string;
  type: OfficeZoneType;
  name: string;
  shape: OfficePolygon;
  capacity?: number;
  interactionPointIds?: string[];
  ambienceTags?: string[];
};

export type OfficeCollision = {
  id: string;
  shape: OfficePolygon;
  blocked: boolean;
};

export type OfficeSpawnPoint = {
  id: string;
  x: number;
  y: number;
};

export type OfficeDeskAssignment = {
  deskObjectId: string;
  seatAnchor: OfficeVector;
  facingDegrees: number;
};

export type OfficeTheme = {
  mood: "neutral" | "focus" | "cozy" | "night";
  enableThoughtBubbles: boolean;
};

export type OfficeLightingOverlay = {
  enabled: boolean;
  baseDarkness: number;
  roomDarkness: Record<string, number>;
};

export type OfficeCanvas = {
  width: number;
  height: number;
  tileSize: number;
  backgroundColor: string;
};

export type OfficeMap = {
  mapVersion: number;
  workspaceId: string;
  officeVersionId: string;
  canvas: OfficeCanvas;
  layers: OfficeLayer[];
  objects: OfficeMapObject[];
  zones: OfficeZone[];
  collisions: OfficeCollision[];
  spawnPoints: OfficeSpawnPoint[];
  deskAssignments: Record<string, OfficeDeskAssignment>;
  lightingOverlay?: OfficeLightingOverlay;
  lights?: OfficeLightObject[];
  ambienceEmitters?: OfficeAmbienceEmitter[];
  interactionPoints?: OfficeInteractionPoint[];
  theme?: OfficeTheme;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const normalizeLayerId = (value: unknown): OfficeLayerId => {
  const normalized = asString(value);
  if (
    normalized === "floor" ||
    normalized === "walls" ||
    normalized === "furniture" ||
    normalized === "decor" ||
    normalized === "lighting" ||
    normalized === "agents"
  ) {
    return normalized;
  }
  return "decor";
};

const normalizeZoneType = (value: unknown): OfficeZoneType => {
  const normalized = asString(value);
  if (
    normalized === "desk_zone" ||
    normalized === "meeting_room" ||
    normalized === "lounge" ||
    normalized === "game_room" ||
    normalized === "hallway" ||
    normalized === "coffee_area"
  ) {
    return normalized;
  }
  return "hallway";
};

const normalizeLightPreset = (value: unknown): OfficeLightPreset => {
  const normalized = asString(value);
  if (
    normalized === "ceiling_lamp" ||
    normalized === "desk_monitor" ||
    normalized === "tv_glow" ||
    normalized === "meeting_spotlight" ||
    normalized === "emergency_error"
  ) {
    return normalized;
  }
  return "ceiling_lamp";
};

const normalizeLightAnimationPreset = (
  value: unknown,
): OfficeLightAnimationPreset => {
  const normalized = asString(value);
  if (
    normalized === "steady" ||
    normalized === "soft_flicker" ||
    normalized === "breathing_pulse" ||
    normalized === "error_strobe_subtle"
  ) {
    return normalized;
  }
  return "steady";
};

const normalizeAmbiencePreset = (value: unknown): OfficeAmbiencePreset => {
  const normalized = asString(value);
  if (
    normalized === "coffee_steam" ||
    normalized === "window_dust" ||
    normalized === "game_sparkle" ||
    normalized === "plant_pollen"
  ) {
    return normalized;
  }
  return "window_dust";
};

const normalizeInteractionKind = (value: unknown): OfficeInteractionKind => {
  const normalized = asString(value);
  if (
    normalized === "couch_sit" ||
    normalized === "arcade_stand" ||
    normalized === "tv_watch" ||
    normalized === "desk_seat" ||
    normalized === "window_stand"
  ) {
    return normalized;
  }
  return "window_stand";
};

const normalizeVector = (value: unknown): OfficeVector => {
  if (!isRecord(value)) {
    return { x: 0, y: 0 };
  }
  return {
    x: asNumber(value.x, 0),
    y: asNumber(value.y, 0),
  };
};

const normalizePolygon = (value: unknown): OfficePolygon => {
  if (!isRecord(value)) {
    return { points: [] };
  }
  const points = Array.isArray(value.points)
    ? value.points.map(normalizeVector)
    : [];
  return { points };
};

const defaultLayers = (): OfficeLayer[] => [
  { id: "floor", visible: true, locked: false, opacity: 1, parallax: 1 },
  { id: "walls", visible: true, locked: false, opacity: 1, parallax: 1 },
  { id: "furniture", visible: true, locked: false, opacity: 1, parallax: 1 },
  { id: "decor", visible: true, locked: false, opacity: 1, parallax: 1 },
  { id: "lighting", visible: true, locked: false, opacity: 1, parallax: 1 },
  { id: "agents", visible: true, locked: true, opacity: 1, parallax: 1 },
];

export const createEmptyOfficeMap = (params: {
  workspaceId: string;
  officeVersionId: string;
  width: number;
  height: number;
}): OfficeMap => ({
  mapVersion: 2,
  workspaceId: params.workspaceId,
  officeVersionId: params.officeVersionId,
  canvas: {
    width: params.width,
    height: params.height,
    tileSize: 32,
    backgroundColor: "#101820",
  },
  layers: defaultLayers(),
  objects: [],
  zones: [],
  collisions: [],
  spawnPoints: [{ id: "spawn-main", x: 120, y: 120 }],
  deskAssignments: {},
  lightingOverlay: {
    enabled: true,
    baseDarkness: 0.2,
    roomDarkness: {},
  },
  lights: [],
  ambienceEmitters: [],
  interactionPoints: [],
  theme: {
    mood: "neutral",
    enableThoughtBubbles: true,
  },
});

export const createStarterOfficeMap = (params: {
  workspaceId: string;
  officeVersionId: string;
  width: number;
  height: number;
}): OfficeMap => {
  const base = createEmptyOfficeMap(params);

  // ── Zone definitions (aligned with the retro-office 3D layout) ──

  const meetingZone: OfficeZone = {
    id: "zone_meeting",
    type: "meeting_room",
    name: "Meeting Room",
    shape: {
      points: [
        { x: 40, y: 20 },
        { x: 320, y: 20 },
        { x: 320, y: 220 },
        { x: 40, y: 220 },
      ],
    },
    capacity: 5,
  };

  const hallwayZone: OfficeZone = {
    id: "zone_hallway",
    type: "hallway",
    name: "Hallway",
    shape: {
      points: [
        { x: 320, y: 20 },
        { x: 760, y: 20 },
        { x: 760, y: 240 },
        { x: 320, y: 240 },
      ],
    },
  };

  const coffeeZone: OfficeZone = {
    id: "zone_coffee",
    type: "coffee_area",
    name: "Kitchen & Break",
    shape: {
      points: [
        { x: 760, y: 20 },
        { x: 1070, y: 20 },
        { x: 1070, y: 280 },
        { x: 760, y: 280 },
      ],
    },
  };

  const deskZone: OfficeZone = {
    id: "zone_desks",
    type: "desk_zone",
    name: "Workspace",
    shape: {
      points: [
        { x: 60, y: 260 },
        { x: 1060, y: 260 },
        { x: 1060, y: 560 },
        { x: 60, y: 560 },
      ],
    },
    capacity: 8,
  };

  const loungeZone: OfficeZone = {
    id: "zone_lounge",
    type: "lounge",
    name: "Recreation",
    shape: {
      points: [
        { x: 400, y: 570 },
        { x: 1060, y: 570 },
        { x: 1060, y: 720 },
        { x: 400, y: 720 },
      ],
    },
  };

  const gameZone: OfficeZone = {
    id: "zone_game",
    type: "game_room",
    name: "Game Room",
    shape: {
      points: [
        { x: 1080, y: 20 },
        { x: 1500, y: 20 },
        { x: 1500, y: 350 },
        { x: 1080, y: 350 },
      ],
    },
  };

  // ── Objects (Phaser 2D layer – kept lean; 3D retro-office is primary) ──

  const obj = (
    id: string,
    assetId: string,
    layerId: OfficeLayerId,
    x: number,
    y: number,
    zIndex: number,
    tags: string[] = [],
  ): OfficeMapObject => ({
    id,
    assetId,
    layerId,
    x,
    y,
    rotation: 0,
    flipX: false,
    flipY: false,
    zIndex,
    tags,
  });

  return {
    ...base,
    objects: [
      // Floor
      obj("floor_a", "floor_tile", "floor", 540, 400, 10),
      // Desks – row 1 (4 desks, 200 px spacing)
      obj("desk_a", "desk_modern", "furniture", 140, 340, 200, ["desk"]),
      obj("desk_b", "desk_modern", "furniture", 340, 340, 201, ["desk"]),
      obj("desk_c", "desk_modern", "furniture", 540, 340, 202, ["desk"]),
      obj("desk_d", "desk_modern", "furniture", 740, 340, 203, ["desk"]),
      // Desks – row 2
      obj("desk_e", "desk_modern", "furniture", 140, 520, 204, ["desk"]),
      obj("desk_f", "desk_modern", "furniture", 340, 520, 205, ["desk"]),
      obj("desk_g", "desk_modern", "furniture", 540, 520, 206, ["desk"]),
      obj("desk_h", "desk_modern", "furniture", 740, 520, 207, ["desk"]),
      // Meeting table
      obj("meeting_table", "meeting_table", "furniture", 180, 120, 240, ["meeting"]),
      // Kitchen / break
      obj("coffee_bar", "coffee_station", "decor", 880, 50, 260, ["coffee"]),
      // Recreation
      obj("arcade_a", "arcade_machine", "decor", 1300, 180, 261, ["arcade"]),
      obj("tv_lounge", "tv_wall", "decor", 660, 620, 262, ["tv"]),
    ],
    zones: [
      meetingZone,
      hallwayZone,
      coffeeZone,
      deskZone,
      loungeZone,
      gameZone,
    ],
    lights: [
      // Workspace ceiling – large radius covers both desk rows
      {
        id: "light_ceiling_desks",
        preset: "ceiling_lamp",
        animationPreset: "soft_flicker",
        x: 440,
        y: 420,
        radius: 320,
        baseIntensity: 0.45,
        enabled: true,
        flicker: { speed: 1.0, amplitude: 0.06 },
      },
      // Meeting room spotlight
      {
        id: "light_meeting",
        preset: "meeting_spotlight",
        animationPreset: "breathing_pulse",
        x: 180,
        y: 120,
        radius: 160,
        baseIntensity: 0.38,
        enabled: true,
        roomId: "zone_meeting",
      },
      // Kitchen warm glow
      {
        id: "light_kitchen",
        preset: "ceiling_lamp",
        animationPreset: "steady",
        x: 900,
        y: 140,
        radius: 180,
        baseIntensity: 0.32,
        enabled: true,
        roomId: "zone_coffee",
      },
      // Recreation / TV glow
      {
        id: "light_tv",
        preset: "tv_glow",
        animationPreset: "steady",
        x: 660,
        y: 630,
        radius: 140,
        baseIntensity: 0.28,
        enabled: true,
        binding: { zoneId: "zone_lounge", state: "idle" },
      },
      // Error indicator (bound to agent error state)
      {
        id: "light_error_demo",
        preset: "emergency_error",
        animationPreset: "error_strobe_subtle",
        x: 140,
        y: 340,
        radius: 80,
        baseIntensity: 0.2,
        enabled: true,
        binding: { state: "error" },
      },
    ],
    ambienceEmitters: [
      {
        id: "emit_coffee",
        preset: "coffee_steam",
        zoneId: "zone_coffee",
        maxParticles: 16,
        spawnRate: 0.14,
        enabled: true,
      },
      {
        id: "emit_window",
        preset: "window_dust",
        zoneId: "zone_hallway",
        maxParticles: 12,
        spawnRate: 0.06,
        enabled: true,
      },
      {
        id: "emit_game",
        preset: "game_sparkle",
        zoneId: "zone_game",
        maxParticles: 10,
        spawnRate: 0.1,
        enabled: true,
      },
      {
        id: "emit_plants",
        preset: "plant_pollen",
        zoneId: "zone_lounge",
        maxParticles: 8,
        spawnRate: 0.05,
        enabled: true,
      },
    ],
    interactionPoints: [
      {
        id: "point_tv_watch",
        kind: "tv_watch",
        x: 600,
        y: 650,
        zoneId: "zone_lounge",
        facingDegrees: 0,
        tags: [],
      },
      {
        id: "point_arcade_stand",
        kind: "arcade_stand",
        x: 1250,
        y: 200,
        zoneId: "zone_game",
        facingDegrees: 90,
        tags: [],
      },
      {
        id: "point_coffee",
        kind: "window_stand",
        x: 880,
        y: 100,
        zoneId: "zone_coffee",
        facingDegrees: 0,
        tags: [],
      },
      {
        id: "point_meeting_sit",
        kind: "couch_sit",
        x: 180,
        y: 140,
        zoneId: "zone_meeting",
        facingDegrees: 180,
        tags: [],
      },
    ],
    deskAssignments: {
      main: {
        deskObjectId: "desk_a",
        seatAnchor: { x: 140, y: 365 },
        facingDegrees: 180,
      },
    },
  };
};

const normalizeDeskAssignments = (
  value: unknown,
): Record<string, OfficeDeskAssignment> => {
  if (!isRecord(value)) return {};
  const next: Record<string, OfficeDeskAssignment> = {};
  for (const [agentId, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue;
    const deskObjectId = asString(raw.deskObjectId).trim();
    if (!deskObjectId) continue;
    next[agentId] = {
      deskObjectId,
      seatAnchor: normalizeVector(raw.seatAnchor),
      facingDegrees: asNumber(raw.facingDegrees, 180),
    };
  }
  return next;
};

export const normalizeOfficeMap = (
  value: unknown,
  fallback: OfficeMap,
): OfficeMap => {
  if (!isRecord(value)) return fallback;

  const mapVersion = asNumber(value.mapVersion, fallback.mapVersion);
  const workspaceId =
    asString(value.workspaceId, fallback.workspaceId).trim() ||
    fallback.workspaceId;
  const officeVersionId =
    asString(value.officeVersionId, fallback.officeVersionId).trim() ||
    fallback.officeVersionId;
  const canvasRecord = isRecord(value.canvas) ? value.canvas : {};
  const canvas: OfficeCanvas = {
    width: asNumber(canvasRecord.width, fallback.canvas.width),
    height: asNumber(canvasRecord.height, fallback.canvas.height),
    tileSize: asNumber(canvasRecord.tileSize, fallback.canvas.tileSize),
    backgroundColor: asString(
      canvasRecord.backgroundColor,
      fallback.canvas.backgroundColor,
    ),
  };

  const layersRaw = Array.isArray(value.layers) ? value.layers : [];
  const layers: OfficeLayer[] =
    layersRaw.length === 0
      ? fallback.layers
      : layersRaw.map((entry) => {
          const raw = isRecord(entry) ? entry : {};
          return {
            id: normalizeLayerId(raw.id),
            visible: asBoolean(raw.visible, true),
            locked: asBoolean(raw.locked, false),
            opacity: asNumber(raw.opacity, 1),
            parallax: asNumber(raw.parallax, 1),
          };
        });

  const objectsRaw = Array.isArray(value.objects) ? value.objects : [];
  const objects: OfficeMapObject[] = objectsRaw
    .map((entry): OfficeMapObject | null => {
      if (!isRecord(entry)) return null;
      const id = asString(entry.id).trim();
      const assetId = asString(entry.assetId).trim();
      if (!id || !assetId) return null;
      return {
        id,
        assetId,
        layerId: normalizeLayerId(entry.layerId),
        x: asNumber(entry.x, 0),
        y: asNumber(entry.y, 0),
        rotation: asNumber(entry.rotation, 0),
        flipX: asBoolean(entry.flipX, false),
        flipY: asBoolean(entry.flipY, false),
        zIndex: asNumber(entry.zIndex, 0),
        tags: Array.isArray(entry.tags)
          ? entry.tags.filter(
              (item): item is string => typeof item === "string",
            )
          : [],
      };
    })
    .filter((entry): entry is OfficeMapObject => Boolean(entry));

  const zonesRaw = Array.isArray(value.zones) ? value.zones : [];
  const zones: OfficeZone[] = zonesRaw
    .map((entry): OfficeZone | null => {
      if (!isRecord(entry)) return null;
      const id = asString(entry.id).trim();
      const name = asString(entry.name).trim();
      if (!id || !name) return null;
      return {
        id,
        name,
        type: normalizeZoneType(entry.type),
        shape: normalizePolygon(entry.shape),
        capacity:
          typeof entry.capacity === "number" ? entry.capacity : undefined,
        interactionPointIds: Array.isArray(entry.interactionPointIds)
          ? entry.interactionPointIds.filter(
              (item): item is string => typeof item === "string",
            )
          : undefined,
        ambienceTags: Array.isArray(entry.ambienceTags)
          ? entry.ambienceTags.filter(
              (item): item is string => typeof item === "string",
            )
          : undefined,
      };
    })
    .filter((entry): entry is OfficeZone => Boolean(entry));

  const collisionsRaw = Array.isArray(value.collisions) ? value.collisions : [];
  const collisions: OfficeCollision[] = collisionsRaw
    .map((entry): OfficeCollision | null => {
      if (!isRecord(entry)) return null;
      const id = asString(entry.id).trim();
      if (!id) return null;
      return {
        id,
        shape: normalizePolygon(entry.shape),
        blocked: asBoolean(entry.blocked, true),
      };
    })
    .filter((entry): entry is OfficeCollision => Boolean(entry));

  const spawnRaw = Array.isArray(value.spawnPoints) ? value.spawnPoints : [];
  const spawnPoints: OfficeSpawnPoint[] = spawnRaw
    .map((entry): OfficeSpawnPoint | null => {
      if (!isRecord(entry)) return null;
      const id = asString(entry.id).trim();
      if (!id) return null;
      return {
        id,
        x: asNumber(entry.x, 0),
        y: asNumber(entry.y, 0),
      };
    })
    .filter((entry): entry is OfficeSpawnPoint => Boolean(entry));

  const overlayRaw = isRecord(value.lightingOverlay)
    ? value.lightingOverlay
    : {};
  const roomDarknessRaw = isRecord(overlayRaw.roomDarkness)
    ? overlayRaw.roomDarkness
    : {};
  const roomDarkness: Record<string, number> = {};
  for (const [key, raw] of Object.entries(roomDarknessRaw)) {
    roomDarkness[key] = asNumber(raw, 0.2);
  }
  const lightingOverlay: OfficeLightingOverlay = {
    enabled: asBoolean(
      overlayRaw.enabled,
      fallback.lightingOverlay?.enabled ?? true,
    ),
    baseDarkness: asNumber(
      overlayRaw.baseDarkness,
      fallback.lightingOverlay?.baseDarkness ?? 0.2,
    ),
    roomDarkness,
  };

  const lightsRaw = Array.isArray(value.lights) ? value.lights : [];
  const lights: OfficeLightObject[] = lightsRaw
    .map((entry): OfficeLightObject | null => {
      if (!isRecord(entry)) return null;
      const id = asString(entry.id).trim();
      if (!id) return null;
      const flickerRaw = isRecord(entry.flicker) ? entry.flicker : null;
      const bindingRaw = isRecord(entry.binding) ? entry.binding : null;
      return {
        id,
        preset: normalizeLightPreset(entry.preset),
        animationPreset: normalizeLightAnimationPreset(entry.animationPreset),
        x: asNumber(entry.x, 0),
        y: asNumber(entry.y, 0),
        radius: asNumber(entry.radius, 120),
        baseIntensity: asNumber(entry.baseIntensity, 0.5),
        spriteAssetId: asString(entry.spriteAssetId).trim() || undefined,
        flicker: flickerRaw
          ? {
              speed: asNumber(flickerRaw.speed, 0.8),
              amplitude: asNumber(flickerRaw.amplitude, 0.12),
            }
          : undefined,
        binding: bindingRaw
          ? {
              agentId: asString(bindingRaw.agentId).trim() || undefined,
              zoneId: asString(bindingRaw.zoneId).trim() || undefined,
              deskObjectId:
                asString(bindingRaw.deskObjectId).trim() || undefined,
              state: (() => {
                const state = asString(bindingRaw.state).trim();
                if (
                  state === "idle" ||
                  state === "working" ||
                  state === "meeting" ||
                  state === "error"
                ) {
                  return state;
                }
                return undefined;
              })(),
            }
          : undefined,
        roomId: asString(entry.roomId).trim() || undefined,
        enabled: asBoolean(entry.enabled, true),
      };
    })
    .filter((entry): entry is OfficeLightObject => Boolean(entry));

  const ambienceRaw = Array.isArray(value.ambienceEmitters)
    ? value.ambienceEmitters
    : [];
  const ambienceEmitters: OfficeAmbienceEmitter[] = ambienceRaw
    .map((entry): OfficeAmbienceEmitter | null => {
      if (!isRecord(entry)) return null;
      const id = asString(entry.id).trim();
      const zoneId = asString(entry.zoneId).trim();
      if (!id || !zoneId) return null;
      return {
        id,
        preset: normalizeAmbiencePreset(entry.preset),
        zoneId,
        maxParticles: asNumber(entry.maxParticles, 18),
        spawnRate: asNumber(entry.spawnRate, 0.2),
        enabled: asBoolean(entry.enabled, true),
      };
    })
    .filter((entry): entry is OfficeAmbienceEmitter => Boolean(entry));

  const interactionRaw = Array.isArray(value.interactionPoints)
    ? value.interactionPoints
    : [];
  const interactionPoints: OfficeInteractionPoint[] = interactionRaw
    .map((entry): OfficeInteractionPoint | null => {
      if (!isRecord(entry)) return null;
      const id = asString(entry.id).trim();
      if (!id) return null;
      return {
        id,
        kind: normalizeInteractionKind(entry.kind),
        x: asNumber(entry.x, 0),
        y: asNumber(entry.y, 0),
        zoneId: asString(entry.zoneId).trim() || undefined,
        facingDegrees:
          typeof entry.facingDegrees === "number"
            ? asNumber(entry.facingDegrees, 0)
            : undefined,
        tags: Array.isArray(entry.tags)
          ? entry.tags.filter(
              (item): item is string => typeof item === "string",
            )
          : [],
      };
    })
    .filter((entry): entry is OfficeInteractionPoint => Boolean(entry));

  const themeRaw = isRecord(value.theme) ? value.theme : {};
  const mood = asString(themeRaw.mood, fallback.theme?.mood ?? "neutral");
  const theme: OfficeTheme = {
    mood:
      mood === "focus" || mood === "cozy" || mood === "night"
        ? mood
        : "neutral",
    enableThoughtBubbles: asBoolean(
      themeRaw.enableThoughtBubbles,
      fallback.theme?.enableThoughtBubbles ?? true,
    ),
  };

  return {
    mapVersion,
    workspaceId,
    officeVersionId,
    canvas,
    layers,
    objects,
    zones,
    collisions,
    spawnPoints,
    deskAssignments: normalizeDeskAssignments(value.deskAssignments),
    lightingOverlay,
    lights,
    ambienceEmitters,
    interactionPoints,
    theme,
  };
};
