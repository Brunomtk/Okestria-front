import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

import type { AgentIntent } from "@/features/retro-office/core/agentIntents";
import {
  type AgentRoutine,
  type RoutineAvailability,
  type RoutineContext,
  type RoutineCooldownMap,
  advanceRoutine,
  cooldownExpiryFor,
  currentStep,
  instantiateRoutine,
  isRoutineComplete,
  pickRoutineContext,
  pushRecentContext,
} from "@/features/retro-office/core/agentRoutines";
import {
  CANVAS_W,
  DESK_STICKY_MS,
  PING_PONG_SESSION_MS,
  WALK_SPEED,
  WORKING_WALK_SPEED_MULTIPLIER,
} from "@/features/retro-office/core/constants";
import {
  clampPointToZone,
  isRemoteOfficeAgentId,
  LOCAL_OFFICE_CANVAS_HEIGHT,
  REMOTE_OFFICE_ZONE,
  REMOTE_ROAM_POINTS,
} from "@/features/retro-office/core/district";
import {
  AGENT_SPAWN_POINTS,
  buildNavGrid,
  GYM_DEFAULT_TARGET,
  isInAgentPauseExclusionZone,
  MEETING_OVERFLOW_LOCATIONS,
  planOfficePath,
  projectPointToNavigable,
  QA_LAB_DEFAULT_TARGET,
  resolveGymRoute,
  resolvePhoneBoothRoute,
  resolveQaLabRoute,
  resolveSmsBoothRoute,
  resolveServerRoomRoute,
  ROAM_POINTS,
  ROAM_ROUTE_MODELS,
  SERVER_ROOM_TARGET,
  type NavGrid,
  type RoamRouteModel,
} from "@/features/retro-office/core/navigation";
import type {
  FurnitureItem,
  GymWorkoutLocation,
  QaLabStationLocation,
  RenderAgent,
  SceneActor,
} from "@/features/retro-office/core/types";
import type { StandupMeeting } from "@/lib/office/standup/types";

const AWAY_THRESHOLD_MS = 15 * 60 * 1000;
const ARRIVAL_EPSILON = 10;
const MIN_AUTONOMOUS_TRAVEL_DISTANCE = 52;
const TARGET_KEY_GRID = 18;
const SLOT_RESERVATION_RADIUS = 34;
const TARGET_RESERVATION_RADIUS = 42;
const STALL_EPSILON = 8;
const STALL_RESET_MS = 2200;
const REPEAT_TARGET_RESET_THRESHOLD = 3;
const DECISION_JITTER_MS = 500;
const MOTION_ZONE_PADDING = 28;

type AgentMode = "forced" | "autonomous" | "error";

// AgentIntent is shared with agentRoutines so routines can reference the
// same intent names without duplicating the enum.
export type { AgentIntent };

// Soft floor on time between routine step transitions so agents don't
// hop between sub-actions faster than the animation can sell.
const ROUTINE_STEP_MIN_SPACING_MS = 600;

type AgentBrain = {
  mode: AgentMode;
  currentActionKey: string;
  nextDecisionAt: number;
  lingerMs: number;
  lastTargetKey: string;
  sameTargetPlanCount: number;
  recentActions: string[];
  roamModel: RoamRouteModel;
  roamIndex: number;
  progressX: number;
  progressY: number;
  progressSince: number;
  // --- Routine system state ---
  // Active routine the agent is committed to (null = ready to pick a new one).
  routine: AgentRoutine | null;
  // Soft expiry timestamp for the current routine step (forces progression
  // past the step's minStageMs even if the arrived plan had a short linger).
  routineStepEndsAt: number;
  // Per-context cooldowns to avoid immediate repetition of the same routine.
  cooldownByContext: RoutineCooldownMap;
  // Last few routine contexts this agent engaged in (most recent first).
  recentRoutineContexts: RoutineContext[];
};

type RoutePlan = {
  actionKey: string;
  mode: AgentMode;
  lingerMs: number;
  targetX: number;
  targetY: number;
  facing: number;
  path: { x: number; y: number }[];
  state: RenderAgent["state"];
  interactionTarget?: RenderAgent["interactionTarget"];
  smsBoothStage?: RenderAgent["smsBoothStage"];
  phoneBoothStage?: RenderAgent["phoneBoothStage"];
  serverRoomStage?: RenderAgent["serverRoomStage"];
  gymStage?: RenderAgent["gymStage"];
  qaLabStage?: RenderAgent["qaLabStage"];
  qaLabStationType?: RenderAgent["qaLabStationType"];
  workoutStyle?: RenderAgent["workoutStyle"];
};

type LoungePoint = { x: number; y: number; facing: number };
type KitchenPoint = { x: number; y: number; facing: number };
type FunPoint = { x: number; y: number; facing: number };

type JanitorSceneActor = Extract<SceneActor, { role: "janitor" }>;
type JanitorRenderAgent = Extract<RenderAgent, { role: "janitor" }>;

const isJanitorSceneActor = (actor: SceneActor): actor is JanitorSceneActor =>
  "role" in actor && actor.role === "janitor";

const isJanitorRenderAgent = (actor: RenderAgent): actor is JanitorRenderAgent =>
  "role" in actor && actor.role === "janitor";

const ROAM_MODEL_ORDER: RoamRouteModel[] = [
  "loop",
  "focus_shift",
  "cross_current",
  "north_bypass",
  "south_sweep",
  "zigzag",
  "orbit",
  "perimeter_drift",
  "serpentine",
  "diagonal_weave",
];

const resolveAgentMotionZone = (agentId: string) =>
  isRemoteOfficeAgentId(agentId)
    ? {
        minX: MOTION_ZONE_PADDING,
        maxX: REMOTE_OFFICE_ZONE.maxX - MOTION_ZONE_PADDING,
        minY: REMOTE_OFFICE_ZONE.minY + MOTION_ZONE_PADDING,
        maxY: REMOTE_OFFICE_ZONE.maxY - MOTION_ZONE_PADDING,
      }
    : {
        minX: MOTION_ZONE_PADDING,
        maxX: CANVAS_W - MOTION_ZONE_PADDING,
        minY: MOTION_ZONE_PADDING,
        maxY: LOCAL_OFFICE_CANVAS_HEIGHT - MOTION_ZONE_PADDING,
      };

const clampAgentPointToMotionZone = (agentId: string, x: number, y: number) =>
  clampPointToZone(x, y, resolveAgentMotionZone(agentId));

const hashAgentId = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const angleFrom = (fromX: number, fromY: number, toX: number, toY: number) =>
  Math.atan2(toX - fromX, toY - fromY);

const buildPlanTargetKey = (x: number, y: number) =>
  `${Math.round(x / TARGET_KEY_GRID)}:${Math.round(y / TARGET_KEY_GRID)}`;

const chooseRandom = <T,>(items: T[], fallback: T): T =>
  items[Math.floor(Math.random() * items.length)] ?? fallback;

const shuffleArray = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
  }
  return next;
};

const DEFAULT_BRAIN = (x: number, y: number, now: number): AgentBrain => ({
  mode: "autonomous",
  currentActionKey: "spawn",
  nextDecisionAt: now,
  lingerMs: 0,
  lastTargetKey: "",
  sameTargetPlanCount: 0,
  recentActions: [],
  roamModel: chooseRandom(ROAM_MODEL_ORDER, "loop"),
  roamIndex: Math.floor(Math.random() * 3),
  progressX: x,
  progressY: y,
  progressSince: now,
  // Routines start empty — the first decision tick picks one based on
  // availability + weights.
  routine: null,
  routineStepEndsAt: 0,
  cooldownByContext: {},
  recentRoutineContexts: [],
});

const markPlanOnBrain = (
  brain: AgentBrain,
  plan: RoutePlan,
  now: number,
  arrived: boolean,
) => {
  const targetKey = buildPlanTargetKey(plan.targetX, plan.targetY);
  if (brain.lastTargetKey === targetKey) {
    brain.sameTargetPlanCount += 1;
  } else {
    brain.lastTargetKey = targetKey;
    brain.sameTargetPlanCount = 1;
  }
  brain.mode = plan.mode;
  brain.currentActionKey = plan.actionKey;
  brain.lingerMs = plan.lingerMs;
  brain.nextDecisionAt = arrived ? now + plan.lingerMs : Number.POSITIVE_INFINITY;
  brain.recentActions = [
    plan.actionKey,
    ...brain.recentActions.filter((entry) => entry !== plan.actionKey),
  ].slice(0, 6);
  brain.progressSince = now;
};

const resetBrainProgress = (brain: AgentBrain, x: number, y: number, now: number) => {
  brain.progressX = x;
  brain.progressY = y;
  brain.progressSince = now;
};

const isPointBusy = (
  agentId: string,
  x: number,
  y: number,
  agents: RenderAgent[],
  radius = TARGET_RESERVATION_RADIUS,
) =>
  agents.some((other) => {
    if (other.id === agentId) return false;
    if (Math.hypot(other.x - x, other.y - y) < radius) return true;
    if (Math.hypot(other.targetX - x, other.targetY - y) < radius) return true;
    const tail = other.path[other.path.length - 1];
    return tail ? Math.hypot(tail.x - x, tail.y - y) < radius : false;
  });

const pickAvailablePoint = <T extends { x: number; y: number }>(
  agentId: string,
  points: T[],
  others: RenderAgent[],
  currentX: number,
  currentY: number,
  minDistance = MIN_AUTONOMOUS_TRAVEL_DISTANCE,
): T | null => {
  const ordered = shuffleArray(points);
  const distant = ordered.filter(
    (point) =>
      Math.hypot(point.x - currentX, point.y - currentY) >= minDistance &&
      !isInAgentPauseExclusionZone(point.x, point.y) &&
      !isPointBusy(agentId, point.x, point.y, others),
  );
  if (distant.length > 0) return distant[0] ?? null;
  const relaxed = ordered.filter(
    (point) => !isInAgentPauseExclusionZone(point.x, point.y) && !isPointBusy(agentId, point.x, point.y, others),
  );
  return relaxed[0] ?? null;
};

const chooseSpawnPoint = (agentId: string) => {
  if (isRemoteOfficeAgentId(agentId)) {
    const remote = chooseRandom(REMOTE_ROAM_POINTS, REMOTE_ROAM_POINTS[0] ?? { x: 200, y: REMOTE_OFFICE_ZONE.minY + 100 });
    return { x: remote.x, y: remote.y, facing: Math.PI / 2 };
  }
  const seed = hashAgentId(agentId);
  const anchor = AGENT_SPAWN_POINTS[seed % AGENT_SPAWN_POINTS.length] ?? { x: 520, y: 520, facing: Math.PI / 2 };
  const offsetX = ((seed % 7) - 3) * 18;
  const offsetY = (((seed >> 3) % 5) - 2) * 16;
  return { x: anchor.x + offsetX, y: anchor.y + offsetY, facing: anchor.facing };
};

const buildLoungePoints = (items: FurnitureItem[]): LoungePoint[] =>
  items
    .filter((item) => ["couch", "couch_v", "beanbag", "ottoman"].includes(item.type))
    .flatMap((item) => {
      const width = item.w ?? 60;
      const height = item.h ?? 60;
      const centerX = item.x + width / 2;
      const centerY = item.y + height / 2;
      const points = item.type === "couch_v"
        ? [
            { x: item.x + width + 24, y: centerY, facing: angleFrom(item.x + width + 24, centerY, centerX, centerY) },
            { x: item.x + width + 24, y: centerY - 20, facing: angleFrom(item.x + width + 24, centerY - 20, centerX, centerY) },
          ]
        : [
            { x: centerX, y: item.y + height + 18, facing: angleFrom(centerX, item.y + height + 18, centerX, centerY) },
            { x: centerX - 26, y: item.y + height + 20, facing: angleFrom(centerX - 26, item.y + height + 20, centerX, centerY) },
            { x: centerX + 26, y: item.y + height + 20, facing: angleFrom(centerX + 26, item.y + height + 20, centerX, centerY) },
          ];
      return points.filter((point) => !isInAgentPauseExclusionZone(point.x, point.y));
    });

const isPantryDoorConflictPoint = (x: number, y: number) => x <= 290 && y >= 390;

const finalizeKitchenPoint = (point: KitchenPoint): KitchenPoint | null => {
  if (isInAgentPauseExclusionZone(point.x, point.y) || isPantryDoorConflictPoint(point.x, point.y)) {
    return null;
  }
  const clamped = clampAgentPointToMotionZone("pantry-anchor", point.x, point.y);
  return { ...point, x: clamped.x, y: clamped.y };
};

const buildKitchenPoints = (items: FurnitureItem[]): KitchenPoint[] =>
  items.flatMap((item) => {
    if (!["coffee_machine", "water_cooler", "fridge", "vending", "sink", "cabinet"].includes(item.type)) {
      return [];
    }
    const width = item.w ?? 40;
    const height = item.h ?? 40;
    const centerX = item.x + width / 2;
    const centerY = item.y + height / 2;
    const points = [
      { x: item.x + width + 18, y: centerY - 10, facing: angleFrom(item.x + width + 18, centerY - 10, centerX, centerY) },
      { x: item.x + width + 18, y: centerY + 10, facing: angleFrom(item.x + width + 18, centerY + 10, centerX, centerY) },
      { x: item.x + width + 34, y: centerY, facing: angleFrom(item.x + width + 34, centerY, centerX, centerY) },
      { x: centerX + Math.max(12, width * 0.14), y: item.y + height + 18, facing: angleFrom(centerX + Math.max(12, width * 0.14), item.y + height + 18, centerX, centerY) },
      { x: centerX + Math.max(26, width * 0.36), y: item.y + height + 26, facing: angleFrom(centerX + Math.max(26, width * 0.36), item.y + height + 26, centerX, centerY) },
      { x: centerX + Math.max(38, width * 0.52), y: item.y + height + 34, facing: angleFrom(centerX + Math.max(38, width * 0.52), item.y + height + 34, centerX, centerY) },
    ];
    return points
      .map((point) => finalizeKitchenPoint(point))
      .filter((point): point is KitchenPoint => Boolean(point));
  });

const buildPantryAnchorPoints = (items: FurnitureItem[]): KitchenPoint[] => {
  const pantryItems = items.filter((item) =>
    ["coffee_machine", "water_cooler", "fridge", "vending", "sink", "cabinet"].includes(item.type),
  );
  if (pantryItems.length === 0) return [];

  const minX = Math.min(...pantryItems.map((item) => item.x));
  const maxX = Math.max(...pantryItems.map((item) => item.x + (item.w ?? 40)));
  const minY = Math.min(...pantryItems.map((item) => item.y));
  const maxY = Math.max(...pantryItems.map((item) => item.y + (item.h ?? 40)));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const rightLaneX = maxX + 26;
  const farRightLaneX = maxX + 48;
  const lowerLaneY = maxY + 18;
  const farLowerY = maxY + 34;
  const upperLaneY = Math.max(minY - 22, 24);

  const candidatePoints: KitchenPoint[] = [
    { x: rightLaneX, y: centerY - 34, facing: angleFrom(rightLaneX, centerY - 34, centerX, centerY) },
    { x: rightLaneX, y: centerY + 34, facing: angleFrom(rightLaneX, centerY + 34, centerX, centerY) },
    { x: farRightLaneX, y: centerY - 18, facing: angleFrom(farRightLaneX, centerY - 18, centerX, centerY) },
    { x: farRightLaneX, y: centerY + 18, facing: angleFrom(farRightLaneX, centerY + 18, centerX, centerY) },
    { x: farRightLaneX + 20, y: centerY - 48, facing: angleFrom(farRightLaneX + 20, centerY - 48, centerX, centerY) },
    { x: farRightLaneX + 20, y: centerY + 48, facing: angleFrom(farRightLaneX + 20, centerY + 48, centerX, centerY) },
    { x: centerX + 8, y: lowerLaneY + 8, facing: angleFrom(centerX + 8, lowerLaneY + 8, centerX, centerY) },
    { x: centerX + 46, y: lowerLaneY + 14, facing: angleFrom(centerX + 46, lowerLaneY + 14, centerX, centerY) },
    { x: centerX + 86, y: farLowerY + 8, facing: angleFrom(centerX + 86, farLowerY + 8, centerX, centerY) },
    { x: centerX + 18, y: upperLaneY, facing: angleFrom(centerX + 18, upperLaneY, centerX, centerY) },
    { x: centerX + 60, y: upperLaneY - 10, facing: angleFrom(centerX + 60, upperLaneY - 10, centerX, centerY) },
    { x: centerX + 104, y: upperLaneY + 16, facing: angleFrom(centerX + 104, upperLaneY + 16, centerX, centerY) },
  ];

  const seen = new Set<string>();
  return candidatePoints
    .map((point) => finalizeKitchenPoint(point))
    .filter((point): point is KitchenPoint => Boolean(point))
    .filter((point) => {
      const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const buildFunPoints = (items: FurnitureItem[]): FunPoint[] =>
  items
    .filter((item) => ["jukebox", "arcade", "foosball", "air_hockey"].includes(item.type))
    .flatMap((item) => {
      const width = item.w ?? 60;
      const height = item.h ?? 60;
      const centerX = item.x + width / 2;
      const centerY = item.y + height / 2;
      return [
        { x: centerX, y: item.y + height + 18, facing: angleFrom(centerX, item.y + height + 18, centerX, centerY) },
        { x: centerX - 22, y: item.y + height + 22, facing: angleFrom(centerX - 22, item.y + height + 22, centerX, centerY) },
        { x: centerX + 22, y: item.y + height + 22, facing: angleFrom(centerX + 22, item.y + height + 22, centerX, centerY) },
      ].filter((point) => !isInAgentPauseExclusionZone(point.x, point.y));
    });

const shouldContinueStage = (agent: RenderAgent) => {
  if (agent.interactionTarget === "gym") return agent.gymStage !== "workout";
  if (agent.interactionTarget === "qa_lab") return agent.qaLabStage !== "station";
  if (agent.interactionTarget === "server_room") return agent.serverRoomStage !== "terminal";
  if (agent.interactionTarget === "sms_booth") return agent.smsBoothStage !== "typing";
  if (agent.interactionTarget === "phone_booth") return agent.phoneBoothStage !== "receiver";
  return false;
};

const inferArrivalState = (plan: RoutePlan) => plan.state;

export function useRebuiltAgentTick(
  agents: SceneActor[],
  deskLocations: { x: number; y: number }[],
  assignedDeskIndexByAgentId: Record<string, number> = {},
  gymWorkoutLocations: {
    x: number;
    y: number;
    facing: number;
    workoutStyle: "run" | "lift" | "bike" | "box" | "row" | "stretch";
  }[],
  qaLabStations: QaLabStationLocation[],
  meetingSeatLocations: { x: number; y: number; facing: number }[],
  furnitureRef: RefObject<FurnitureItem[]>,
  lastSeenByAgentId: Record<string, number> = {},
  deskHoldByAgentId: Record<string, boolean> = {},
  danceUntilByAgentId: Record<string, number> = {},
  gymHoldByAgentId: Record<string, boolean> = {},
  smsBoothHoldByAgentId: Record<string, boolean> = {},
  phoneBoothHoldByAgentId: Record<string, boolean> = {},
  qaHoldByAgentId: Record<string, boolean> = {},
  githubReviewByAgentId: Record<string, boolean> = {},
  standupMeeting: StandupMeeting | null = null,
) {
  const renderAgentsRef = useRef<RenderAgent[]>([]);
  const renderAgentLookupRef = useRef<Map<string, RenderAgent>>(new Map());
  const deskByAgentRef = useRef<Map<string, number>>(new Map());
  const brainByAgentRef = useRef<Map<string, AgentBrain>>(new Map());
  const navGridRef = useRef<NavGrid | null>(null);
  const gridSourceRef = useRef<FurnitureItem[]>([]);
  const gymCycleByAgentRef = useRef<Map<string, number>>(new Map());
  const qaCycleByAgentRef = useRef<Map<string, number>>(new Map());

  const getNavGrid = useCallback((): NavGrid => {
    const furniture = furnitureRef.current ?? [];
    if (navGridRef.current === null || gridSourceRef.current !== furniture) {
      navGridRef.current = buildNavGrid(furniture);
      gridSourceRef.current = furniture;
    }
    return navGridRef.current;
  }, [furnitureRef]);

  const planPath = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number) =>
      planOfficePath(fromX, fromY, toX, toY, getNavGrid()),
    [getNavGrid],
  );

  const resolveMeetingTarget = useCallback(
    (agentId: string) => {
      const seats = [...meetingSeatLocations, ...MEETING_OVERFLOW_LOCATIONS];
      const fallback = seats[0] ?? { x: 145, y: 118, facing: Math.PI };
      const participantOrder = standupMeeting?.participantOrder ?? [];
      const index = participantOrder.indexOf(agentId);
      return index >= 0 ? (seats[index] ?? fallback) : fallback;
    },
    [meetingSeatLocations, standupMeeting?.participantOrder],
  );

  const buildPathToTarget = useCallback(
    (agentId: string, fromX: number, fromY: number, rawTargetX: number, rawTargetY: number) => {
      const grid = getNavGrid();
      const safeTarget = clampAgentPointToMotionZone(agentId, rawTargetX, rawTargetY);
      const projected = projectPointToNavigable(safeTarget.x, safeTarget.y, grid);
      const clamped = clampAgentPointToMotionZone(agentId, projected.x, projected.y);
      const path = planOfficePath(fromX, fromY, clamped.x, clamped.y, grid);
      if (path.length > 0) {
        return { targetX: clamped.x, targetY: clamped.y, path };
      }
      if (Math.hypot(clamped.x - fromX, clamped.y - fromY) <= ARRIVAL_EPSILON) {
        return { targetX: clamped.x, targetY: clamped.y, path: [] as { x: number; y: number }[] };
      }
      return { targetX: clamped.x, targetY: clamped.y, path: [clamped] };
    },
    [getNavGrid],
  );

  const reserveDeskIndex = useCallback(
    (agent: RenderAgent, others: RenderAgent[]): number | null => {
      if (deskLocations.length === 0) return null;
      const explicit = assignedDeskIndexByAgentId[agent.id];
      if (typeof explicit === "number" && explicit >= 0 && explicit < deskLocations.length) {
        deskByAgentRef.current.set(agent.id, explicit);
        return explicit;
      }

      const busy = new Set<number>();
      others.forEach((other) => {
        if (other.id === agent.id) return;
        const claimed = deskByAgentRef.current.get(other.id);
        if (typeof claimed === "number") busy.add(claimed);
      });

      const existing = deskByAgentRef.current.get(agent.id);
      if (typeof existing === "number" && !busy.has(existing)) {
        return existing;
      }

      const preferred = hashAgentId(agent.id) % deskLocations.length;
      for (let offset = 0; offset < deskLocations.length; offset += 1) {
        const index = (preferred + offset) % deskLocations.length;
        const desk = deskLocations[index];
        if (!desk) continue;
        if (busy.has(index)) continue;
        if (isPointBusy(agent.id, desk.x, desk.y, others, SLOT_RESERVATION_RADIUS)) continue;
        deskByAgentRef.current.set(agent.id, index);
        return index;
      }

      return typeof existing === "number" ? existing : preferred;
    },
    [assignedDeskIndexByAgentId, deskLocations],
  );

  const chooseGymTarget = useCallback(
    (agent: RenderAgent, others: RenderAgent[]): GymWorkoutLocation => {
      if (gymWorkoutLocations.length === 0) return GYM_DEFAULT_TARGET;
      const start = gymCycleByAgentRef.current.get(agent.id) ?? (hashAgentId(agent.id) % gymWorkoutLocations.length);
      for (let offset = 0; offset < gymWorkoutLocations.length; offset += 1) {
        const index = (start + offset) % gymWorkoutLocations.length;
        const location = gymWorkoutLocations[index];
        if (!location) continue;
        if (isPointBusy(agent.id, location.x, location.y, others, SLOT_RESERVATION_RADIUS)) continue;
        gymCycleByAgentRef.current.set(agent.id, (index + 1) % gymWorkoutLocations.length);
        return location;
      }
      return gymWorkoutLocations[start] ?? GYM_DEFAULT_TARGET;
    },
    [gymWorkoutLocations],
  );

  const chooseQaTarget = useCallback(
    (agent: RenderAgent, others: RenderAgent[]): QaLabStationLocation => {
      if (qaLabStations.length === 0) return QA_LAB_DEFAULT_TARGET;
      const start = qaCycleByAgentRef.current.get(agent.id) ?? (hashAgentId(agent.id) % qaLabStations.length);
      for (let offset = 0; offset < qaLabStations.length; offset += 1) {
        const index = (start + offset) % qaLabStations.length;
        const station = qaLabStations[index];
        if (!station) continue;
        if (isPointBusy(agent.id, station.x, station.y, others, SLOT_RESERVATION_RADIUS)) continue;
        qaCycleByAgentRef.current.set(agent.id, (index + 1) % qaLabStations.length);
        return station;
      }
      return qaLabStations[start] ?? QA_LAB_DEFAULT_TARGET;
    },
    [qaLabStations],
  );

  const applyPlanToAgent = useCallback((agent: RenderAgent, plan: RoutePlan): RenderAgent => {
    const firstStep = plan.path[0];
    const facing = firstStep ? angleFrom(agent.x, agent.y, firstStep.x, firstStep.y) : plan.facing;
    return {
      ...agent,
      targetX: plan.targetX,
      targetY: plan.targetY,
      path: plan.path,
      facing,
      state: plan.path.length > 0 ? "walking" : plan.state,
      walkSpeed: plan.mode === "forced" ? WALK_SPEED * WORKING_WALK_SPEED_MULTIPLIER : WALK_SPEED,
      interactionTarget: plan.interactionTarget,
      smsBoothStage: plan.smsBoothStage,
      phoneBoothStage: plan.phoneBoothStage,
      serverRoomStage: plan.serverRoomStage,
      gymStage: plan.gymStage,
      qaLabStage: plan.qaLabStage,
      qaLabStationType: plan.qaLabStationType,
      workoutStyle: plan.workoutStyle,
    };
  }, []);

  const buildIntentPlan = useCallback(
    (
      agent: RenderAgent,
      intent: AgentIntent,
      mode: AgentMode,
      others: RenderAgent[],
      preferredPoint?: { x: number; y: number; facing?: number },
    ): RoutePlan => {
      if (isRemoteOfficeAgentId(agent.id)) {
        const remotePoint = preferredPoint ?? pickAvailablePoint(
          agent.id,
          REMOTE_ROAM_POINTS,
          others,
          agent.x,
          agent.y,
          90,
        ) ?? chooseRandom(REMOTE_ROAM_POINTS, REMOTE_ROAM_POINTS[0] ?? { x: agent.x, y: agent.y });
        const target = buildPathToTarget(agent.id, agent.x, agent.y, remotePoint.x, remotePoint.y);
        return {
          actionKey: "roam_remote",
          mode,
          lingerMs: 1200 + Math.random() * 1600,
          targetX: target.targetX,
          targetY: target.targetY,
          facing: preferredPoint?.facing ?? agent.facing,
          path: target.path,
          state: "standing",
        };
      }

      if (intent === "meeting_room") {
        const targetSeat = resolveMeetingTarget(agent.id);
        const target = buildPathToTarget(agent.id, agent.x, agent.y, targetSeat.x, targetSeat.y);
        return {
          actionKey: "meeting_room",
          mode,
          lingerMs: 1800,
          targetX: target.targetX,
          targetY: target.targetY,
          facing: targetSeat.facing,
          path: target.path,
          state: "standing",
          interactionTarget: "meeting_room",
        };
      }

      if (intent === "desk") {
        const deskIndex = reserveDeskIndex(agent, others);
        const desk = typeof deskIndex === "number" ? deskLocations[deskIndex] : null;
        const fallback = preferredPoint ?? { x: agent.x, y: agent.y, facing: agent.facing };
        const targetPoint = desk ? { x: desk.x, y: desk.y, facing: Math.PI / 2 } : fallback;
        const target = buildPathToTarget(agent.id, agent.x, agent.y, targetPoint.x, targetPoint.y);
        return {
          actionKey: "desk",
          mode,
          lingerMs: DESK_STICKY_MS,
          targetX: target.targetX,
          targetY: target.targetY,
          facing: targetPoint.facing ?? Math.PI / 2,
          path: target.path,
          state: "sitting",
          interactionTarget: "desk",
        };
      }

      if (intent === "gym") {
        const workoutTarget = chooseGymTarget(agent, others);
        const route = resolveGymRoute(agent.x, agent.y, workoutTarget);
        const target = buildPathToTarget(agent.id, agent.x, agent.y, route.targetX, route.targetY);
        return {
          actionKey: `gym_${route.stage}`,
          mode,
          lingerMs: route.stage === "workout" ? 2200 + Math.random() * 1800 : 120,
          targetX: target.targetX,
          targetY: target.targetY,
          facing: route.facing,
          path: target.path,
          state: route.stage === "workout" ? "working_out" : "standing",
          interactionTarget: "gym",
          gymStage: route.stage,
          workoutStyle: workoutTarget.workoutStyle,
        };
      }

      if (intent === "qa_lab") {
        const station = chooseQaTarget(agent, others);
        const route = resolveQaLabRoute(agent.x, agent.y, station);
        const target = buildPathToTarget(agent.id, agent.x, agent.y, route.targetX, route.targetY);
        return {
          actionKey: `qa_${route.stage}`,
          mode,
          lingerMs: route.stage === "station" ? 2000 + Math.random() * 1400 : 120,
          targetX: target.targetX,
          targetY: target.targetY,
          facing: route.facing,
          path: target.path,
          state: "standing",
          interactionTarget: "qa_lab",
          qaLabStage: route.stage,
          qaLabStationType: station.stationType,
        };
      }

      if (intent === "server_room") {
        const route = resolveServerRoomRoute(agent.x, agent.y);
        const target = buildPathToTarget(agent.id, agent.x, agent.y, route.targetX, route.targetY);
        return {
          actionKey: `server_room_${route.stage}`,
          mode,
          lingerMs: route.stage === "terminal" ? 1800 + Math.random() * 1000 : 100,
          targetX: target.targetX,
          targetY: target.targetY,
          facing: route.facing,
          path: target.path,
          state: "standing",
          interactionTarget: "server_room",
          serverRoomStage: route.stage,
        };
      }

      if (intent === "sms_booth") {
        const booth = (furnitureRef.current ?? []).find((item) => item.type === "sms_booth");
        const route = resolveSmsBoothRoute(booth, agent.x, agent.y);
        const target = buildPathToTarget(agent.id, agent.x, agent.y, route.targetX, route.targetY);
        return {
          actionKey: `sms_booth_${route.stage}`,
          mode,
          lingerMs: route.stage === "typing" ? 1800 + Math.random() * 1200 : 100,
          targetX: target.targetX,
          targetY: target.targetY,
          facing: route.facing,
          path: target.path,
          state: "standing",
          interactionTarget: "sms_booth",
          smsBoothStage: route.stage,
        };
      }

      if (intent === "phone_booth") {
        const booth = (furnitureRef.current ?? []).find((item) => item.type === "phone_booth");
        const route = resolvePhoneBoothRoute(booth, agent.x, agent.y);
        const target = buildPathToTarget(agent.id, agent.x, agent.y, route.targetX, route.targetY);
        return {
          actionKey: `phone_booth_${route.stage}`,
          mode,
          lingerMs: route.stage === "receiver" ? 1900 + Math.random() * 1200 : 100,
          targetX: target.targetX,
          targetY: target.targetY,
          facing: route.facing,
          path: target.path,
          state: "standing",
          interactionTarget: "phone_booth",
          phoneBoothStage: route.stage,
        };
      }

      if (intent === "lounge") {
        const point = preferredPoint ?? { x: agent.x, y: agent.y, facing: agent.facing };
        const target = buildPathToTarget(agent.id, agent.x, agent.y, point.x, point.y);
        return {
          actionKey: "lounge",
          mode,
          lingerMs: 1800 + Math.random() * 1600,
          targetX: target.targetX,
          targetY: target.targetY,
          facing: point.facing ?? agent.facing,
          path: target.path,
          state: "sitting",
          interactionTarget: "lounge",
        };
      }

      if (intent === "kitchen") {
        const point = preferredPoint ?? { x: agent.x, y: agent.y, facing: agent.facing };
        const target = buildPathToTarget(agent.id, agent.x, agent.y, point.x, point.y);
        return {
          actionKey: "kitchen",
          mode,
          lingerMs: 1200 + Math.random() * 1600,
          targetX: target.targetX,
          targetY: target.targetY,
          facing: point.facing ?? agent.facing,
          path: target.path,
          state: "standing",
          interactionTarget: "kitchen",
        };
      }

      if (intent === "jukebox") {
        const point = preferredPoint ?? { x: agent.x, y: agent.y, facing: agent.facing };
        const target = buildPathToTarget(agent.id, agent.x, agent.y, point.x, point.y);
        return {
          actionKey: "jukebox",
          mode,
          lingerMs: 1500 + Math.random() * 1600,
          targetX: target.targetX,
          targetY: target.targetY,
          facing: point.facing ?? agent.facing,
          path: target.path,
          state: danceUntilByAgentId[agent.id] && danceUntilByAgentId[agent.id] > Date.now() ? "dancing" : "standing",
          interactionTarget: "jukebox",
        };
      }

      const point = preferredPoint ?? { x: agent.x, y: agent.y, facing: agent.facing };
      const target = buildPathToTarget(agent.id, agent.x, agent.y, point.x, point.y);
      return {
        actionKey: intent,
        mode,
        lingerMs: 900 + Math.random() * 1500,
        targetX: target.targetX,
        targetY: target.targetY,
        facing: point.facing ?? angleFrom(agent.x, agent.y, point.x, point.y),
        path: target.path,
        state: "standing",
      };
    },
    [
      buildPathToTarget,
      chooseGymTarget,
      chooseQaTarget,
      danceUntilByAgentId,
      deskLocations,
      furnitureRef,
      reserveDeskIndex,
      resolveMeetingTarget,
    ],
  );

  // Build a "stay put" plan used by routine pause steps (breather between
  // gym sets, short posture shift on the couch, quiet observation moment).
  // Keeps the agent's current visual state so a working_out breather still
  // looks like the agent is in the middle of a workout session, not
  // suddenly idle-standing in the gym.
  const buildPauseRoutinePlan = useCallback(
    (agent: RenderAgent, actionKey: string, pauseMs: number): RoutePlan => {
      const restState: RenderAgent["state"] =
        agent.state === "walking" ? "standing" : agent.state;
      return {
        actionKey,
        mode: "autonomous",
        lingerMs: Math.max(pauseMs, ROUTINE_STEP_MIN_SPACING_MS),
        targetX: agent.x,
        targetY: agent.y,
        facing: agent.facing,
        path: [],
        state: restState,
        interactionTarget: agent.interactionTarget,
        smsBoothStage: agent.smsBoothStage,
        phoneBoothStage: agent.phoneBoothStage,
        serverRoomStage: agent.serverRoomStage,
        gymStage: agent.gymStage,
        qaLabStage: agent.qaLabStage,
        qaLabStationType: agent.qaLabStationType,
        workoutStyle: agent.workoutStyle,
      };
    },
    [],
  );

  const buildRoamFallbackPlan = useCallback(
    (agent: RenderAgent, others: RenderAgent[]): RoutePlan => {
      if (isRemoteOfficeAgentId(agent.id)) {
        const remotePoint = pickAvailablePoint(
          agent.id,
          REMOTE_ROAM_POINTS,
          others,
          agent.x,
          agent.y,
          100,
        ) ?? chooseRandom(REMOTE_ROAM_POINTS, REMOTE_ROAM_POINTS[0] ?? { x: agent.x, y: agent.y });
        return buildIntentPlan(agent, "roam_remote", "autonomous", others, {
          x: remotePoint.x,
          y: remotePoint.y,
          facing: angleFrom(agent.x, agent.y, remotePoint.x, remotePoint.y),
        });
      }
      const roamPool = ROAM_POINTS.map((point) => ({
        x: point.x,
        y: point.y,
        facing: angleFrom(agent.x, agent.y, point.x, point.y),
      }));
      const fallback = pickAvailablePoint(agent.id, roamPool, others, agent.x, agent.y, 80)
        ?? {
          x: agent.x + 60,
          y: agent.y + 20,
          facing: angleFrom(agent.x, agent.y, agent.x + 60, agent.y + 20),
        };
      return buildIntentPlan(agent, "roam", "autonomous", others, fallback);
    },
    [buildIntentPlan],
  );

  // Snapshot of what activities are actually available in the current scene.
  // This is recomputed per call since furniture is mutable, but it's cheap.
  const getRoutineAvailability = useCallback(
    (agent: RenderAgent): RoutineAvailability => {
      const furniture = furnitureRef.current ?? [];
      const hasLounge = furniture.some((item) =>
        ["couch", "couch_v", "beanbag", "ottoman"].includes(item.type),
      );
      const hasKitchen = furniture.some((item) =>
        ["coffee_machine", "water_cooler", "fridge", "vending", "sink", "cabinet"].includes(
          item.type,
        ),
      );
      const hasJukebox = furniture.some((item) =>
        ["jukebox", "arcade", "foosball", "air_hockey"].includes(item.type),
      );
      const hasSmsBooth = furniture.some((item) => item.type === "sms_booth");
      const hasPhoneBooth = furniture.some((item) => item.type === "phone_booth");
      return {
        hasGym: gymWorkoutLocations.length > 0,
        hasQaLab: qaLabStations.length > 0,
        hasServerRoom: true,
        hasLounge,
        hasKitchen,
        hasJukebox,
        hasDesks: deskLocations.length > 0,
        hasSmsBooth,
        hasPhoneBooth,
        isRemote: isRemoteOfficeAgentId(agent.id),
      };
    },
    [deskLocations.length, furnitureRef, gymWorkoutLocations.length, qaLabStations.length],
  );

  // Finalize a routine that just finished: record cooldown + push to recent
  // context list. Keeps the repeat-prevention data fresh.
  const finalizeRoutine = useCallback((brain: AgentBrain, now: number) => {
    if (!brain.routine) return;
    const context = brain.routine.context;
    brain.cooldownByContext = {
      ...brain.cooldownByContext,
      [context]: cooldownExpiryFor(context, now),
    };
    brain.recentRoutineContexts = pushRecentContext(brain.recentRoutineContexts, context);
    brain.routine = null;
  }, []);

  // Resolve a furniture-aware preferred point for routine steps whose intent
  // defaults to "stay at current position" when no preferred point is given.
  // Without this, the first "lounge" step of a rest routine would make the
  // agent sit wherever they currently stand instead of walking to a couch.
  //
  // For gym / qa_lab / server_room / booths / desk we return null because
  // their dedicated intent handlers already pick targets from room-specific
  // pools (chooseGymTarget, chooseQaTarget, resolveServerRoomRoute, etc.).
  const resolveRoutinePreferredPoint = useCallback(
    (
      agent: RenderAgent,
      intent: AgentIntent,
      others: RenderAgent[],
    ): { x: number; y: number; facing: number } | null => {
      const furniture = furnitureRef.current ?? [];
      if (intent === "lounge") {
        const points = buildLoungePoints(furniture);
        if (points.length === 0) return null;
        // Minimum distance 0 so subsequent lounge beats can pick the nearby
        // couch point the agent is already at (natural stay-on-couch
        // behaviour) instead of forcing a jump to a far couch.
        return pickAvailablePoint(agent.id, points, others, agent.x, agent.y, 0);
      }
      if (intent === "kitchen") {
        const points = [
          ...buildKitchenPoints(furniture),
          ...buildPantryAnchorPoints(furniture),
        ];
        if (points.length === 0) return null;
        return pickAvailablePoint(agent.id, points, others, agent.x, agent.y, 0);
      }
      if (intent === "jukebox") {
        const points = buildFunPoints(furniture);
        if (points.length === 0) return null;
        return pickAvailablePoint(agent.id, points, others, agent.x, agent.y, 0);
      }
      if (intent === "roam") {
        // Observe routines use the existing roam pool so the agent visits
        // diverse parts of the office rather than hovering in place.
        const pool = ROAM_POINTS.map((point) => ({
          x: point.x,
          y: point.y,
          facing: angleFrom(agent.x, agent.y, point.x, point.y),
        }));
        return (
          pickAvailablePoint(agent.id, pool, others, agent.x, agent.y, 80) ?? null
        );
      }
      if (intent === "roam_remote") {
        const pool = REMOTE_ROAM_POINTS.map((point) => ({
          x: point.x,
          y: point.y,
          facing: angleFrom(agent.x, agent.y, point.x, point.y),
        }));
        return (
          pickAvailablePoint(agent.id, pool, others, agent.x, agent.y, 80) ?? null
        );
      }
      return null;
    },
    [furnitureRef],
  );

  /**
   * Produce the next idle plan for an agent, driven by contextual routines.
   *
   * Flow:
   *   1. If the agent has no routine (or the previous one finished), a new
   *      context is picked via `pickRoutineContext` using weights +
   *      cooldowns + recency penalties.
   *   2. The current step of the routine is dispatched:
   *        - `pauseMs > 0` steps become in-place linger plans (breather,
   *          posture shift, observation beat).
   *        - Active steps delegate to `buildIntentPlan` which handles the
   *          existing multi-stage approach logic (gym door_outer ->
   *          door_inner -> workout, etc.).
   *   3. The routine index is advanced after dispatch so the next call
   *      naturally picks up the next step.
   */
  const buildAutonomousPlan = useCallback(
    (
      agent: RenderAgent,
      others: RenderAgent[],
      brain: AgentBrain,
      now: number,
    ): RoutePlan => {
      // Remote agents live in a separate zone and should just drift between
      // remote roam points. No routine machinery needed.
      if (isRemoteOfficeAgentId(agent.id)) {
        brain.routine = null;
        return buildRoamFallbackPlan(agent, others);
      }

      // If we were running a routine and it's now done, finalize it so the
      // cooldown map + recent context list reflect the completed routine.
      if (brain.routine && isRoutineComplete(brain.routine)) {
        finalizeRoutine(brain, now);
      }

      // Pick a fresh routine if we don't currently have one.
      if (!brain.routine) {
        const availability = getRoutineAvailability(agent);
        const context = pickRoutineContext({
          now,
          cooldowns: brain.cooldownByContext,
          recentContexts: brain.recentRoutineContexts,
          availability,
        });
        if (context) {
          brain.routine = instantiateRoutine(context, now);
        }
      }

      // Nothing to run — gracefully degrade to a roam hop.
      if (!brain.routine) {
        return buildRoamFallbackPlan(agent, others);
      }

      const step = currentStep(brain.routine);
      if (!step) {
        // Empty routine (shouldn't normally happen). Clear and fall back.
        finalizeRoutine(brain, now);
        return buildRoamFallbackPlan(agent, others);
      }

      // Build the plan for this step. Pause steps keep the agent in place;
      // active steps go through the existing intent planner.
      let plan: RoutePlan;
      if (step.pauseMs > 0) {
        plan = buildPauseRoutinePlan(agent, step.label, step.pauseMs);
      } else {
        // Some intents (lounge, kitchen, jukebox, roam) fall back to the
        // agent's CURRENT position if no preferredPoint is supplied. That
        // would make the agent "sit" or "drink coffee" in the middle of
        // the office. We resolve a furniture-aware preferred point here so
        // the agent actually walks to the right station.
        const preferred = resolveRoutinePreferredPoint(agent, step.intent, others);
        const basePlan = buildIntentPlan(
          agent,
          step.intent,
          "autonomous",
          others,
          preferred ?? undefined,
        );
        // Floor the linger by the step's minStageMs so short-linger intents
        // (e.g. roam hops at ~1s) still produce meaningful observation beats.
        const lingerMs =
          step.minStageMs > basePlan.lingerMs ? step.minStageMs : basePlan.lingerMs;
        plan = lingerMs === basePlan.lingerMs ? basePlan : { ...basePlan, lingerMs };
      }

      // Mark this step as dispatched by advancing the routine index.
      brain.routine = advanceRoutine(brain.routine);
      brain.routineStepEndsAt = now + plan.lingerMs;

      // Also nudge the legacy roam cursor so if we ever fall back to pure
      // roam the motion layer has fresh variety.
      brain.roamIndex += 1;
      if (brain.roamIndex % 4 === 0) {
        const currentIndex = ROAM_MODEL_ORDER.indexOf(brain.roamModel);
        brain.roamModel =
          ROAM_MODEL_ORDER[(currentIndex + 1) % ROAM_MODEL_ORDER.length] ?? brain.roamModel;
      }

      return plan;
    },
    [
      buildIntentPlan,
      buildPauseRoutinePlan,
      buildRoamFallbackPlan,
      finalizeRoutine,
      getRoutineAvailability,
      resolveRoutinePreferredPoint,
    ],
  );

  const determineForcedIntent = useCallback(
    (agent: RenderAgent): AgentIntent | null => {
      if (isRemoteOfficeAgentId(agent.id)) return null;
      if ((standupMeeting?.participantOrder ?? []).includes(agent.id)) return "meeting_room";
      if (gymHoldByAgentId[agent.id]) return "gym";
      if (smsBoothHoldByAgentId[agent.id]) return "sms_booth";
      if (phoneBoothHoldByAgentId[agent.id]) return "phone_booth";
      if (qaHoldByAgentId[agent.id]) return "qa_lab";
      if (githubReviewByAgentId[agent.id]) return "server_room";
      if (deskHoldByAgentId[agent.id] || typeof assignedDeskIndexByAgentId[agent.id] === "number") return "desk";
      return null;
    },
    [
      assignedDeskIndexByAgentId,
      deskHoldByAgentId,
      githubReviewByAgentId,
      gymHoldByAgentId,
      phoneBoothHoldByAgentId,
      qaHoldByAgentId,
      smsBoothHoldByAgentId,
      standupMeeting?.participantOrder,
    ],
  );

  const buildRecoveryPlan = useCallback(
    (agent: RenderAgent, others: RenderAgent[], brain: AgentBrain) => {
      const pool = isRemoteOfficeAgentId(agent.id)
        ? REMOTE_ROAM_POINTS.map((point) => ({ x: point.x, y: point.y, facing: angleFrom(agent.x, agent.y, point.x, point.y) }))
        : [
            ...ROAM_POINTS.map((point) => ({ x: point.x, y: point.y, facing: angleFrom(agent.x, agent.y, point.x, point.y) })),
            ...MEETING_OVERFLOW_LOCATIONS,
          ];
      const point = pickAvailablePoint(agent.id, pool, others, agent.x, agent.y, 120)
        ?? chooseRandom(pool, { x: agent.x + 80, y: agent.y + 20, facing: angleFrom(agent.x, agent.y, agent.x + 80, agent.y + 20) });
      brain.sameTargetPlanCount = 0;
      return buildIntentPlan(agent, isRemoteOfficeAgentId(agent.id) ? "roam_remote" : "roam", "autonomous", others, point);
    },
    [buildIntentPlan],
  );

  useEffect(() => {
    const now = Date.now();
    const previousLookup = new Map(renderAgentsRef.current.map((agent) => [agent.id, agent]));
    const nextAgents: RenderAgent[] = [];
    const activeIds = new Set(agents.map((agent) => agent.id));

    for (const [id] of brainByAgentRef.current) {
      if (!activeIds.has(id)) brainByAgentRef.current.delete(id);
    }
    for (const [id] of deskByAgentRef.current) {
      if (!activeIds.has(id)) deskByAgentRef.current.delete(id);
    }

    for (const sceneAgent of agents) {
      const existing = previousLookup.get(sceneAgent.id);
      if (existing) {
        nextAgents.push({ ...existing, ...sceneAgent });
        continue;
      }

      const spawn = isJanitorSceneActor(sceneAgent)
        ? sceneAgent.janitorRoute[0] ?? chooseSpawnPoint(sceneAgent.id)
        : chooseSpawnPoint(sceneAgent.id);
      const projected = projectPointToNavigable(spawn.x, spawn.y, getNavGrid());
      const clamped = clampAgentPointToMotionZone(sceneAgent.id, projected.x, projected.y);
      const facing = spawn.facing ?? Math.PI / 2;
      brainByAgentRef.current.set(sceneAgent.id, DEFAULT_BRAIN(clamped.x, clamped.y, now));
      nextAgents.push({
        ...sceneAgent,
        x: clamped.x,
        y: clamped.y,
        targetX: clamped.x,
        targetY: clamped.y,
        path: [],
        facing,
        frame: Math.random() * 10,
        walkSpeed: WALK_SPEED,
        phaseOffset: Math.random() * Math.PI * 2,
        state: "standing",
        janitorRouteIndex: isJanitorSceneActor(sceneAgent) ? 0 : undefined,
        janitorPauseUntil: undefined,
      } as RenderAgent);
    }

    renderAgentsRef.current = nextAgents;
    const lookup = renderAgentLookupRef.current;
    lookup.clear();
    nextAgents.forEach((agent) => lookup.set(agent.id, agent));
  }, [agents, getNavGrid]);

  const tick = useCallback((delta = 1) => {
    const now = Date.now();
    const previousAgents = renderAgentsRef.current;
    if (previousAgents.length === 0) return;

    const nextAgents: RenderAgent[] = [];

    for (const agent of previousAgents) {
      const brain = brainByAgentRef.current.get(agent.id) ?? DEFAULT_BRAIN(agent.x, agent.y, now);
      brainByAgentRef.current.set(agent.id, brain);

      if (isJanitorRenderAgent(agent)) {
        if (agent.janitorDespawnAt <= now) continue;
        const route = agent.janitorRoute;
        const currentIndex = Math.min(agent.janitorRouteIndex ?? 0, Math.max(0, route.length - 1));
        const stop = route[currentIndex] ?? { x: agent.x, y: agent.y, facing: agent.facing };

        if ((agent.janitorPauseUntil ?? 0) > now) {
          nextAgents.push({ ...agent, state: "standing", path: [] });
          continue;
        }

        if (agent.path.length === 0) {
          const target = buildPathToTarget(agent.id, agent.x, agent.y, stop.x, stop.y);
          const walking = applyPlanToAgent(agent, {
            actionKey: "janitor",
            mode: "forced",
            lingerMs: 0,
            targetX: target.targetX,
            targetY: target.targetY,
            facing: stop.facing,
            path: target.path,
            state: "standing",
          });
          nextAgents.push({ ...walking, janitorRouteIndex: currentIndex });
          continue;
        }

        const waypoint = agent.path[0] ?? { x: agent.targetX, y: agent.targetY };
        const distance = Math.hypot(waypoint.x - agent.x, waypoint.y - agent.y);
        const stepSize = Math.max(0.45, agent.walkSpeed) * 60 * delta;
        if (distance <= stepSize) {
          const remaining = agent.path.slice(1);
          if (remaining.length === 0) {
            const nextIndex = currentIndex < route.length - 1 ? currentIndex + 1 : currentIndex;
            nextAgents.push({
              ...agent,
              x: waypoint.x,
              y: waypoint.y,
              targetX: waypoint.x,
              targetY: waypoint.y,
              path: [],
              facing: stop.facing,
              state: "standing",
              janitorRouteIndex: nextIndex,
              janitorPauseUntil: now + agent.janitorPauseMs,
            });
          } else {
            nextAgents.push({
              ...agent,
              x: waypoint.x,
              y: waypoint.y,
              path: remaining,
              facing: angleFrom(agent.x, agent.y, waypoint.x, waypoint.y),
              state: "walking",
            });
          }
        } else {
          const nx = agent.x + ((waypoint.x - agent.x) / distance) * stepSize;
          const ny = agent.y + ((waypoint.y - agent.y) / distance) * stepSize;
          nextAgents.push({
            ...agent,
            x: nx,
            y: ny,
            facing: angleFrom(agent.x, agent.y, waypoint.x, waypoint.y),
            state: "walking",
          });
        }
        continue;
      }

      const seenAt = lastSeenByAgentId[agent.id] ?? now;
      const shouldMarkAway = Number.isFinite(seenAt) && seenAt > 0 && now - seenAt > AWAY_THRESHOLD_MS;

      if (agent.state === "away") {
        brain.nextDecisionAt = Math.min(brain.nextDecisionAt, now);
      }

      if (shouldMarkAway) {
        brain.nextDecisionAt = Math.min(brain.nextDecisionAt, now + 250);
      }

      if (agent.pingPongUntil !== undefined) {
        if (now >= agent.pingPongUntil) {
          nextAgents.push({
            ...agent,
            pingPongUntil: undefined,
            pingPongTargetX: undefined,
            pingPongTargetY: undefined,
            pingPongFacing: undefined,
            pingPongPartnerId: undefined,
            pingPongTableUid: undefined,
            pingPongSide: undefined,
            pingPongPreviousWalkSpeed: undefined,
            walkSpeed: agent.pingPongPreviousWalkSpeed ?? WALK_SPEED,
            state: "standing",
            path: [],
          });
          continue;
        }
        const tx = agent.pingPongTargetX ?? agent.x;
        const ty = agent.pingPongTargetY ?? agent.y;
        const targetDistance = Math.hypot(tx - agent.x, ty - agent.y);
        if (targetDistance <= ARRIVAL_EPSILON) {
          nextAgents.push({
            ...agent,
            x: tx,
            y: ty,
            targetX: tx,
            targetY: ty,
            path: [],
            facing: agent.pingPongFacing ?? agent.facing,
            state: "standing",
          });
          continue;
        }
        const stepSize = Math.max(WALK_SPEED * 1.6, agent.walkSpeed) * 60 * delta;
        const nx = agent.x + ((tx - agent.x) / targetDistance) * Math.min(stepSize, targetDistance);
        const ny = agent.y + ((ty - agent.y) / targetDistance) * Math.min(stepSize, targetDistance);
        nextAgents.push({
          ...agent,
          x: nx,
          y: ny,
          targetX: tx,
          targetY: ty,
          facing: angleFrom(agent.x, agent.y, tx, ty),
          state: "walking",
          path: [],
        });
        continue;
      }

      let working: RenderAgent = agent.state === "away"
        ? { ...agent, state: "standing", awayUntil: undefined }
        : agent;
      const explicitIntent = determineForcedIntent(agent);
      const peers = [...nextAgents, ...previousAgents.filter((other) => other.id !== agent.id && !nextAgents.some((entry) => entry.id === other.id))];

      const movedSinceProgress = Math.hypot(agent.x - brain.progressX, agent.y - brain.progressY);
      if (movedSinceProgress > STALL_EPSILON) {
        resetBrainProgress(brain, agent.x, agent.y, now);
      }

      const needsRecovery =
        brain.sameTargetPlanCount > REPEAT_TARGET_RESET_THRESHOLD ||
        (agent.path.length > 0 && now - brain.progressSince > STALL_RESET_MS);

      if (explicitIntent && (agent.interactionTarget !== explicitIntent || agent.path.length === 0)) {
        // Forced intents (standup meetings, desk holds, gym/QA/booth holds,
        // github reviews, etc.) take absolute priority over idle routines.
        // Clear any in-flight routine so when the hold releases we pick a
        // fresh contextual routine from a clean slate.
        if (brain.routine) brain.routine = null;
        const forcedPlan = buildIntentPlan(agent, explicitIntent, "forced", peers);
        markPlanOnBrain(brain, forcedPlan, now, forcedPlan.path.length === 0);
        working = applyPlanToAgent(agent, forcedPlan);
      } else if (shouldContinueStage(agent) && agent.path.length === 0) {
        const continuedPlan = buildIntentPlan(agent, agent.interactionTarget as AgentIntent, brain.mode, peers);
        markPlanOnBrain(brain, continuedPlan, now, continuedPlan.path.length === 0);
        working = applyPlanToAgent(agent, continuedPlan);
      } else if (needsRecovery) {
        // Stalled / looping on the same target — abandon whatever routine
        // we were in so the next decision cycle picks a fresh context
        // rather than re-triggering the broken path.
        if (brain.routine) brain.routine = null;
        const recoveryPlan = buildRecoveryPlan(agent, peers, brain);
        markPlanOnBrain(brain, recoveryPlan, now, recoveryPlan.path.length === 0);
        working = applyPlanToAgent(agent, recoveryPlan);
        resetBrainProgress(brain, working.x, working.y, now);
      } else if (working.path.length === 0 && now >= brain.nextDecisionAt) {
        const autonomousPlan = explicitIntent
          ? buildIntentPlan(agent, explicitIntent, "forced", peers)
          : buildAutonomousPlan(agent, peers, brain, now);
        markPlanOnBrain(brain, autonomousPlan, now, autonomousPlan.path.length === 0);
        working = applyPlanToAgent(agent, autonomousPlan);
      }

      if (working.path.length === 0) {
        const dancing = danceUntilByAgentId[working.id] && danceUntilByAgentId[working.id] > now;
        const stationaryState: RenderAgent["state"] =
          dancing && working.interactionTarget === "jukebox" ? "dancing" : working.state;
        nextAgents.push({
          ...working,
          state: stationaryState,
          frame: working.frame + delta,
          walkSpeed: explicitIntent ? WALK_SPEED * WORKING_WALK_SPEED_MULTIPLIER : WALK_SPEED,
        });
        continue;
      }

      const waypoint = working.path[0] ?? { x: working.targetX, y: working.targetY };
      const distance = Math.hypot(waypoint.x - working.x, waypoint.y - working.y);
      const stepSize = Math.max(0.45, working.walkSpeed) * 60 * delta;
      if (distance <= stepSize) {
        const nextPath = working.path.slice(1);
        const arrivedX = waypoint.x;
        const arrivedY = waypoint.y;
        if (nextPath.length === 0) {
          const arrived = {
            ...working,
            x: arrivedX,
            y: arrivedY,
            path: [],
            targetX: arrivedX,
            targetY: arrivedY,
            state: inferArrivalState({
              actionKey: brain.currentActionKey,
              mode: brain.mode,
              lingerMs: brain.lingerMs,
              targetX: arrivedX,
              targetY: arrivedY,
              facing: working.facing,
              path: [],
              state: working.state,
            }),
            facing: working.facing,
            frame: working.frame + delta,
          } as RenderAgent;
          brain.nextDecisionAt = now + brain.lingerMs + Math.floor(Math.random() * DECISION_JITTER_MS);
          resetBrainProgress(brain, arrivedX, arrivedY, now);
          nextAgents.push(arrived);
        } else {
          resetBrainProgress(brain, arrivedX, arrivedY, now);
          nextAgents.push({
            ...working,
            x: arrivedX,
            y: arrivedY,
            path: nextPath,
            facing: angleFrom(working.x, working.y, waypoint.x, waypoint.y),
            state: "walking",
            frame: working.frame + delta,
          });
        }
      } else {
        const nx = working.x + ((waypoint.x - working.x) / distance) * stepSize;
        const ny = working.y + ((waypoint.y - working.y) / distance) * stepSize;
        const clamped = clampAgentPointToMotionZone(working.id, nx, ny);
        nextAgents.push({
          ...working,
          x: clamped.x,
          y: clamped.y,
          facing: angleFrom(working.x, working.y, waypoint.x, waypoint.y),
          state: "walking",
          frame: working.frame + delta,
        });
      }
    }

    renderAgentsRef.current = nextAgents;
    const lookup = renderAgentLookupRef.current;
    lookup.clear();
    nextAgents.forEach((entry) => lookup.set(entry.id, entry));
  }, [
    applyPlanToAgent,
    buildAutonomousPlan,
    buildIntentPlan,
    buildPathToTarget,
    buildRecoveryPlan,
    danceUntilByAgentId,
    determineForcedIntent,
    lastSeenByAgentId,
  ]);

  return {
    renderAgentsRef,
    renderAgentLookupRef,
    tick,
    deskByAgentRef,
    planPath,
  };
}
