import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

import {
  AGENT_RADIUS,
  DESK_STICKY_MS,
  PING_PONG_SESSION_MS,
  WALK_SPEED,
  WORKING_WALK_SPEED_MULTIPLIER,
} from "@/features/retro-office/core/constants";
import {
  isRemoteOfficeAgentId,
  REMOTE_ROAM_POINTS,
} from "@/features/retro-office/core/district";
import {
  buildNavGrid,
  GYM_DEFAULT_TARGET,
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
  SERVER_ROOM_TARGET,
  type NavGrid,
} from "@/features/retro-office/core/navigation";
import type {
  FurnitureItem,
  QaLabStationLocation,
  RenderAgent,
  SceneActor,
} from "@/features/retro-office/core/types";
import type { StandupMeeting } from "@/lib/office/standup/types";

const AWAY_THRESHOLD_MS = 15 * 60 * 1000;
const ARRIVAL_EPSILON = 14;
const PATH_REPLAN_DISTANCE = 20;
const COLLISION_FREEZE_MS = 280;
const COLLISION_RECOVERY_MS = 700;
const STALL_SAMPLE_MS = 1400;
const STALL_MOVE_EPSILON = 8;
const MAX_STALL_REPLANS = 2;
const MIN_AUTONOMOUS_TRAVEL_DISTANCE = 48;
const MIN_FORCED_TRAVEL_DISTANCE = 28;

type AgentMode = "forced" | "autonomous" | "error";

type AgentBrain = {
  mode: AgentMode;
  currentActionKey: string;
  currentLingerMs: number;
  nextDecisionAt: number;
  stallX: number;
  stallY: number;
  stallSince: number;
  stallCount: number;
  recentActions: string[];
};

type RoutePlan = {
  actionKey: string;
  mode: AgentMode;
  lingerMs: number;
  targetX: number;
  targetY: number;
  path: { x: number; y: number }[];
  facing: number;
  arrivalState: RenderAgent["state"];
  interactionTarget?: RenderAgent["interactionTarget"];
  smsBoothStage?: RenderAgent["smsBoothStage"];
  phoneBoothStage?: RenderAgent["phoneBoothStage"];
  serverRoomStage?: RenderAgent["serverRoomStage"];
  gymStage?: RenderAgent["gymStage"];
  qaLabStage?: RenderAgent["qaLabStage"];
  qaLabStationType?: RenderAgent["qaLabStationType"];
  workoutStyle?: RenderAgent["workoutStyle"];
};

type WorkingIntent =
  | { kind: "meeting_room" }
  | { kind: "gym" }
  | { kind: "qa_lab" }
  | { kind: "server_room" }
  | { kind: "sms_booth" }
  | { kind: "phone_booth" }
  | { kind: "desk" };

type LoungePoint = {
  x: number;
  y: number;
  facing: number;
};

type KitchenPoint = {
  x: number;
  y: number;
  facing: number;
};

type FunPoint = {
  x: number;
  y: number;
  facing: number;
};

const DEFAULT_BRAIN = (x: number, y: number, now: number): AgentBrain => ({
  mode: "autonomous",
  currentActionKey: "spawn",
  currentLingerMs: 0,
  nextDecisionAt: now,
  stallX: x,
  stallY: y,
  stallSince: now,
  stallCount: 0,
  recentActions: [],
});

const nextRecentActions = (recent: string[], actionKey: string) =>
  [actionKey, ...recent.filter((entry) => entry !== actionKey)].slice(0, 6);

const setBrainPlan = (
  brain: AgentBrain,
  plan: RoutePlan,
  now: number,
  arrived = false,
) => {
  brain.mode = plan.mode;
  brain.currentActionKey = plan.actionKey;
  brain.currentLingerMs = plan.lingerMs;
  brain.nextDecisionAt = arrived ? now + plan.lingerMs : Number.POSITIVE_INFINITY;
  brain.stallCount = 0;
  brain.stallSince = now;
};

const resetBrainProgress = (brain: AgentBrain, x: number, y: number, now: number) => {
  brain.stallX = x;
  brain.stallY = y;
  brain.stallSince = now;
  brain.stallCount = 0;
};

const chooseRoamPoint = (agentId: string) => {
  const points = isRemoteOfficeAgentId(agentId) ? REMOTE_ROAM_POINTS : ROAM_POINTS;
  return points[Math.floor(Math.random() * points.length)] ?? { x: 320, y: 220 };
};

const chooseDistinctRoamPoint = (agentId: string, currentX: number, currentY: number) => {
  const points = isRemoteOfficeAgentId(agentId) ? REMOTE_ROAM_POINTS : ROAM_POINTS;
  const distinct = points.filter(
    (point) => Math.hypot(point.x - currentX, point.y - currentY) >= MIN_AUTONOMOUS_TRAVEL_DISTANCE,
  );
  const pool = distinct.length > 0 ? distinct : points;
  return pool[Math.floor(Math.random() * pool.length)] ?? { x: currentX + 80, y: currentY + 40 };
};

const hashAgentId = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const chooseSpawnPoint = (agentId: string) => {
  if (isRemoteOfficeAgentId(agentId)) {
    return chooseRoamPoint(agentId);
  }
  return {
    x: 120 + Math.random() * 760,
    y: 100 + Math.random() * 500,
  };
};

const angleFrom = (fromX: number, fromY: number, toX: number, toY: number) =>
  Math.atan2(toX - fromX, toY - fromY);

const toDeskAnchor = (
  deskLocations: { x: number; y: number }[],
  deskIndex: number | undefined,
  currentX: number,
  currentY: number,
) => {
  const desk =
    typeof deskIndex === "number" ? (deskLocations[deskIndex] ?? null) : null;
  if (desk) {
    return { x: desk.x, y: desk.y, facing: Math.PI / 2 };
  }
  const fallback = MEETING_OVERFLOW_LOCATIONS[0] ?? { x: currentX, y: currentY, facing: Math.PI / 2 };
  return { x: fallback.x, y: fallback.y, facing: fallback.facing };
};

const buildLoungePoints = (furnitureItems: FurnitureItem[]): LoungePoint[] =>
  furnitureItems
    .filter((item) => ["couch", "couch_v", "beanbag", "ottoman"].includes(item.type))
    .map((item) => {
      const width = item.w ?? 60;
      const height = item.h ?? 60;
      const centerX = item.x + width / 2;
      const centerY = item.y + height / 2;
      const x = item.type === "couch_v" ? item.x + width + 22 : centerX;
      const y = item.type === "couch_v" ? centerY : item.y + height + 18;
      return {
        x,
        y,
        facing: angleFrom(x, y, centerX, centerY),
      };
    });

const buildKitchenPoints = (furnitureItems: FurnitureItem[]): KitchenPoint[] =>
  furnitureItems.flatMap((item) => {
    if (!["coffee_machine", "water_cooler", "fridge", "vending", "sink", "cabinet"].includes(item.type)) {
      return [];
    }
    const width = item.w ?? 40;
    const height = item.h ?? 40;
    const centerX = item.x + width / 2;
    const centerY = item.y + height / 2;
    const frontPoint = {
      x: centerX,
      y: item.y + height + 18,
      facing: angleFrom(centerX, item.y + height + 18, centerX, centerY),
    };
    const sidePoint = width >= 42
      ? {
          x: item.x - 18,
          y: centerY,
          facing: angleFrom(item.x - 18, centerY, centerX, centerY),
        }
      : null;
    return sidePoint ? [frontPoint, sidePoint] : [frontPoint];
  });

const buildFunPoints = (furnitureItems: FurnitureItem[]): FunPoint[] =>
  furnitureItems
    .filter((item) => ["jukebox", "arcade", "foosball", "air_hockey"].includes(item.type))
    .map((item) => {
      const width = item.w ?? 60;
      const height = item.h ?? 60;
      const centerX = item.x + width / 2;
      const centerY = item.y + height / 2;
      const x = centerX;
      const y = item.y + height + 18;
      return {
        x,
        y,
        facing: angleFrom(x, y, centerX, centerY),
      };
    });

const scoreAutonomousCandidate = (
  actionKey: string,
  currentX: number,
  currentY: number,
  targetX: number,
  targetY: number,
  recentActions: string[],
  baseWeight: number,
) => {
  const distance = Math.hypot(targetX - currentX, targetY - currentY);
  const distanceFactor = Math.min(1.35, Math.max(0.72, distance / 260));
  const recentIndex = recentActions.indexOf(actionKey);
  const recentPenalty = recentIndex < 0 ? 1 : Math.max(0.34, 0.84 - recentIndex * 0.14);
  return baseWeight * distanceFactor * recentPenalty * (0.9 + Math.random() * 0.35);
};

const buildRecoveredPath = (
  startX: number,
  startY: number,
  rawTargetX: number,
  rawTargetY: number,
  grid: NavGrid,
) => {
  const candidates: Array<{ x: number; y: number }> = [
    projectPointToNavigable(rawTargetX, rawTargetY, grid),
  ];
  const offsets = [
    [24, 0],
    [-24, 0],
    [0, 24],
    [0, -24],
    [36, 20],
    [-36, 20],
    [36, -20],
    [-36, -20],
  ];
  for (const [offsetX, offsetY] of offsets) {
    candidates.push(projectPointToNavigable(rawTargetX + offsetX, rawTargetY + offsetY, grid));
  }

  for (const candidate of candidates) {
    const distance = Math.hypot(candidate.x - startX, candidate.y - startY);
    if (distance <= ARRIVAL_EPSILON) {
      return { targetX: candidate.x, targetY: candidate.y, path: [] as { x: number; y: number }[] };
    }
    const path = planOfficePath(startX, startY, candidate.x, candidate.y, grid);
    if (path.length > 0) {
      return { targetX: candidate.x, targetY: candidate.y, path };
    }
  }

  const safeFallback = projectPointToNavigable(rawTargetX, rawTargetY, grid);
  return { targetX: safeFallback.x, targetY: safeFallback.y, path: [] as { x: number; y: number }[] };
};

const inferArrivalState = (agent: RenderAgent): RenderAgent["state"] => {
  if (agent.pingPongUntil !== undefined) return "standing";
  switch (agent.interactionTarget) {
    case "desk":
      return "sitting";
    case "lounge":
      return "standing";
    case "gym":
      return agent.gymStage === "workout" ? "working_out" : "standing";
    case "meeting_room":
      return "sitting";
    case "sms_booth":
    case "phone_booth":
    case "server_room":
    case "qa_lab":
    case "kitchen":
    case "jukebox":
      return "standing";
    default:
      return agent.state === "away" ? "away" : "standing";
  }
};

const applyPlanToAgent = (agent: RenderAgent, plan: RoutePlan): RenderAgent => ({
  ...agent,
  targetX: plan.targetX,
  targetY: plan.targetY,
  path: plan.path,
  facing: plan.facing,
  interactionTarget: plan.interactionTarget,
  smsBoothStage: plan.smsBoothStage,
  phoneBoothStage: plan.phoneBoothStage,
  serverRoomStage: plan.serverRoomStage,
  gymStage: plan.gymStage,
  qaLabStage: plan.qaLabStage,
  qaLabStationType: plan.qaLabStationType,
  workoutStyle: plan.workoutStyle,
  state: plan.path.length > 0 ? "walking" : plan.arrivalState,
});

const isInteractiveRoomTarget = (target: RenderAgent["interactionTarget"]) =>
  target === "gym" ||
  target === "qa_lab" ||
  target === "server_room" ||
  target === "sms_booth" ||
  target === "phone_booth";

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
  const stickyUntilRef = useRef<Map<string, number>>(new Map());
  const brainByAgentRef = useRef<Map<string, AgentBrain>>(new Map());
  const gymByAgentRef = useRef<Map<string, number>>(new Map());
  const qaByAgentRef = useRef<Map<string, number>>(new Map());
  const nextGymRef = useRef(0);
  const nextQaRef = useRef(0);
  const navGridRef = useRef<NavGrid | null>(null);
  const gridSourceRef = useRef<FurnitureItem[]>([]);
  const gymCycleRef = useRef<Map<string, number[]>>(new Map());
  const qaCycleRef = useRef<Map<string, number[]>>(new Map());

  const buildShuffledIndexCycle = useCallback((length: number, preferredIndex?: number | null) => {
    const indices = Array.from({ length }, (_, index) => index);
    for (let index = indices.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [indices[index], indices[swapIndex]] = [indices[swapIndex]!, indices[index]!];
    }
    if (
      typeof preferredIndex === "number" &&
      preferredIndex >= 0 &&
      preferredIndex < length &&
      indices[0] === preferredIndex &&
      indices.length > 1
    ) {
      [indices[0], indices[1]] = [indices[1]!, indices[0]!];
    }
    return indices;
  }, []);

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
      return index < 0 ? fallback : (seats[index] ?? fallback);
    },
    [meetingSeatLocations, standupMeeting?.participantOrder],
  );

  const chooseNextGymIndexForAgent = useCallback(
    (agent: RenderAgent) => {
      if (gymWorkoutLocations.length <= 1) {
        return 0;
      }

      if (agent.interactionTarget === "gym" && agent.workoutStyle) {
        const currentIndex = gymWorkoutLocations.findIndex(
          (location) => location.workoutStyle === agent.workoutStyle,
        );
        if (currentIndex >= 0) {
          return currentIndex;
        }
      }

      const previousIndex = gymByAgentRef.current.get(agent.id) ?? null;
      let cycle = gymCycleRef.current.get(agent.id) ?? [];
      if (cycle.length === 0) {
        cycle = buildShuffledIndexCycle(gymWorkoutLocations.length, previousIndex);
      }
      const nextIndex = cycle.shift();
      gymCycleRef.current.set(agent.id, cycle);
      const resolvedIndex =
        typeof nextIndex === "number"
          ? nextIndex
          : ((previousIndex ?? -1) + 1) % gymWorkoutLocations.length;
      gymByAgentRef.current.set(agent.id, resolvedIndex);
      return resolvedIndex;
    },
    [buildShuffledIndexCycle, gymWorkoutLocations],
  );

  const chooseNextQaIndexForAgent = useCallback(
    (agent: RenderAgent) => {
      if (qaLabStations.length <= 1) {
        return 0;
      }

      if (agent.interactionTarget === "qa_lab" && agent.qaLabStationType) {
        const currentIndex = qaLabStations.findIndex(
          (station) => station.stationType === agent.qaLabStationType,
        );
        if (currentIndex >= 0) {
          return currentIndex;
        }
      }

      const previousIndex = qaByAgentRef.current.get(agent.id) ?? null;
      let cycle = qaCycleRef.current.get(agent.id) ?? [];
      if (cycle.length === 0) {
        cycle = buildShuffledIndexCycle(qaLabStations.length, previousIndex);
      }
      const nextIndex = cycle.shift();
      qaCycleRef.current.set(agent.id, cycle);
      const resolvedIndex =
        typeof nextIndex === "number"
          ? nextIndex
          : ((previousIndex ?? -1) + 1) % qaLabStations.length;
      qaByAgentRef.current.set(agent.id, resolvedIndex);
      return resolvedIndex;
    },
    [buildShuffledIndexCycle, qaLabStations],
  );

  const buildRoutePlan = useCallback(
    (
      agent: RenderAgent,
      mode: AgentMode,
      descriptor:
        | { kind: "desk"; lingerMs?: number }
        | { kind: "meeting_room"; lingerMs?: number }
        | { kind: "gym"; lingerMs?: number }
        | { kind: "qa_lab"; lingerMs?: number }
        | { kind: "server_room"; lingerMs?: number }
        | { kind: "sms_booth"; lingerMs?: number }
        | { kind: "phone_booth"; lingerMs?: number }
        | { kind: "lounge"; point: LoungePoint; lingerMs?: number }
        | { kind: "kitchen"; point: KitchenPoint; lingerMs?: number }
        | { kind: "jukebox"; point: FunPoint; lingerMs?: number }
        | { kind: "roam"; point: { x: number; y: number }; lingerMs?: number },
    ): RoutePlan => {
      const grid = getNavGrid();
      const makeDirectPlan = (
        actionKey: string,
        interactionTarget: RoutePlan["interactionTarget"],
        rawTargetX: number,
        rawTargetY: number,
        facing: number,
        arrivalState: RoutePlan["arrivalState"],
        lingerMs: number,
      ): RoutePlan => {
        const route = buildRecoveredPath(agent.x, agent.y, rawTargetX, rawTargetY, grid);
        return {
          actionKey,
          mode,
          lingerMs,
          targetX: route.targetX,
          targetY: route.targetY,
          path: route.path,
          facing,
          arrivalState,
          interactionTarget,
        };
      };

      if (descriptor.kind === "desk") {
        const anchor = toDeskAnchor(
          deskLocations,
          deskByAgentRef.current.get(agent.id),
          agent.x,
          agent.y,
        );
        return makeDirectPlan(
          "desk_focus",
          "desk",
          anchor.x,
          anchor.y,
          anchor.facing,
          "standing",
          descriptor.lingerMs ?? 10_000,
        );
      }

      if (descriptor.kind === "meeting_room") {
        const seat = resolveMeetingTarget(agent.id);
        return makeDirectPlan(
          "standup",
          "meeting_room",
          seat.x,
          seat.y,
          seat.facing,
          "sitting",
          descriptor.lingerMs ?? 12_000,
        );
      }

      if (descriptor.kind === "gym") {
        const gymIndex = chooseNextGymIndexForAgent(agent);
        const workout = gymWorkoutLocations[gymIndex] ?? GYM_DEFAULT_TARGET;
        const stage = resolveGymRoute(agent.x, agent.y, workout);
        const route = buildRecoveredPath(agent.x, agent.y, stage.targetX, stage.targetY, grid);
        return {
          actionKey: `gym_${workout.workoutStyle}`,
          mode,
          lingerMs: descriptor.lingerMs ?? 8_500,
          targetX: route.targetX,
          targetY: route.targetY,
          path: route.path,
          facing: stage.facing,
          arrivalState: stage.stage === "workout" ? "working_out" : "standing",
          interactionTarget: "gym",
          gymStage: stage.stage,
          workoutStyle: workout.workoutStyle,
        };
      }

      if (descriptor.kind === "qa_lab") {
        const qaIndex = chooseNextQaIndexForAgent(agent);
        const station = qaLabStations[qaIndex] ?? {
          ...QA_LAB_DEFAULT_TARGET,
          stationType: "console" as const,
        };
        const stage = resolveQaLabRoute(agent.x, agent.y, station);
        const route = buildRecoveredPath(agent.x, agent.y, stage.targetX, stage.targetY, grid);
        return {
          actionKey: `qa_${station.stationType}`,
          mode,
          lingerMs: descriptor.lingerMs ?? 7_200,
          targetX: route.targetX,
          targetY: route.targetY,
          path: route.path,
          facing: stage.facing,
          arrivalState: "standing",
          interactionTarget: "qa_lab",
          qaLabStage: stage.stage,
          qaLabStationType: station.stationType,
        };
      }

      if (descriptor.kind === "server_room") {
        const stage = resolveServerRoomRoute(agent.x, agent.y);
        const route = buildRecoveredPath(agent.x, agent.y, stage.targetX, stage.targetY, grid);
        return {
          actionKey: "server_check",
          mode,
          lingerMs: descriptor.lingerMs ?? 6_000,
          targetX: route.targetX,
          targetY: route.targetY,
          path: route.path,
          facing: stage.facing,
          arrivalState: "standing",
          interactionTarget: "server_room",
          serverRoomStage: stage.stage,
        };
      }

      if (descriptor.kind === "sms_booth") {
        const stage = resolveSmsBoothRoute(
          (furnitureRef.current ?? []).find((item) => item.type === "sms_booth") ?? null,
          agent.x,
          agent.y,
        );
        const route = buildRecoveredPath(agent.x, agent.y, stage.targetX, stage.targetY, grid);
        return {
          actionKey: "sms_booth",
          mode,
          lingerMs: descriptor.lingerMs ?? 5_500,
          targetX: route.targetX,
          targetY: route.targetY,
          path: route.path,
          facing: stage.facing,
          arrivalState: "standing",
          interactionTarget: "sms_booth",
          smsBoothStage: stage.stage,
        };
      }

      if (descriptor.kind === "phone_booth") {
        const stage = resolvePhoneBoothRoute(
          (furnitureRef.current ?? []).find((item) => item.type === "phone_booth") ?? null,
          agent.x,
          agent.y,
        );
        const route = buildRecoveredPath(agent.x, agent.y, stage.targetX, stage.targetY, grid);
        return {
          actionKey: "phone_booth",
          mode,
          lingerMs: descriptor.lingerMs ?? 5_500,
          targetX: route.targetX,
          targetY: route.targetY,
          path: route.path,
          facing: stage.facing,
          arrivalState: "standing",
          interactionTarget: "phone_booth",
          phoneBoothStage: stage.stage,
        };
      }

      if (descriptor.kind === "lounge") {
        return makeDirectPlan(
          "lounge_break",
          "lounge",
          descriptor.point.x,
          descriptor.point.y,
          descriptor.point.facing,
          "sitting",
          descriptor.lingerMs ?? 5_500,
        );
      }

      if (descriptor.kind === "kitchen") {
        return makeDirectPlan(
          "kitchen_break",
          "kitchen",
          descriptor.point.x,
          descriptor.point.y,
          descriptor.point.facing,
          "standing",
          descriptor.lingerMs ?? 4_200,
        );
      }

      if (descriptor.kind === "jukebox") {
        return makeDirectPlan(
          "jukebox_stop",
          "jukebox",
          descriptor.point.x,
          descriptor.point.y,
          descriptor.point.facing,
          "standing",
          descriptor.lingerMs ?? 3_400,
        );
      }

      return makeDirectPlan(
        "roam",
        undefined,
        descriptor.point.x,
        descriptor.point.y,
        angleFrom(agent.x, agent.y, descriptor.point.x, descriptor.point.y),
        "standing",
        descriptor.lingerMs ?? 2_400,
      );
    },
    [chooseNextGymIndexForAgent, chooseNextQaIndexForAgent, deskLocations, furnitureRef, getNavGrid, gymWorkoutLocations, qaLabStations, resolveMeetingTarget],
  );

  const buildAutonomousPlan = useCallback(
    (agent: RenderAgent): RoutePlan => {
      const brain = brainByAgentRef.current.get(agent.id) ?? DEFAULT_BRAIN(agent.x, agent.y, Date.now());
      const furnitureItems = furnitureRef.current ?? [];
      const kitchenPoints = buildKitchenPoints(furnitureItems);
      const funPoints = buildFunPoints(furnitureItems);
      const candidates: Array<{ score: number; build: () => RoutePlan }> = [];

      const addCandidate = (
        actionKey: string,
        baseWeight: number,
        targetX: number,
        targetY: number,
        builder: () => RoutePlan,
      ) => {
        const distance = Math.hypot(targetX - agent.x, targetY - agent.y);
        if (distance < MIN_AUTONOMOUS_TRAVEL_DISTANCE) {
          return;
        }
        candidates.push({
          score: scoreAutonomousCandidate(
            actionKey,
            agent.x,
            agent.y,
            targetX,
            targetY,
            brain.recentActions,
            baseWeight,
          ),
          build: builder,
        });
      };

      if (deskLocations.length > 0) {
        const resolvedDeskIndex =
          deskByAgentRef.current.get(agent.id) ??
          (deskLocations.length > 0 ? hashAgentId(agent.id) % deskLocations.length : undefined);
        const anchor = toDeskAnchor(
          deskLocations,
          resolvedDeskIndex,
          agent.x,
          agent.y,
        );
        addCandidate("desk_focus", 1.25, anchor.x, anchor.y, () =>
          buildRoutePlan(agent, "autonomous", { kind: "desk", lingerMs: 8_000 + Math.random() * 5_000 }),
        );
      }

      for (const point of kitchenPoints) {
        addCandidate("kitchen_break", 1.18, point.x, point.y, () =>
          buildRoutePlan(agent, "autonomous", { kind: "kitchen", point, lingerMs: 3_800 + Math.random() * 3_600 }),
        );
      }

      for (const point of funPoints) {
        addCandidate("jukebox_stop", 0.92, point.x, point.y, () =>
          buildRoutePlan(agent, "autonomous", { kind: "jukebox", point, lingerMs: 2_400 + Math.random() * 2_000 }),
        );
      }

      if (meetingSeatLocations.length > 0) {
        const seat = meetingSeatLocations[Math.floor(Math.random() * meetingSeatLocations.length)]!;
        addCandidate("meeting_drop_in", 0.96, seat.x, seat.y, () =>
          buildRoutePlan(agent, "autonomous", { kind: "meeting_room", lingerMs: 4_600 + Math.random() * 2_800 }),
        );
      }

      if (gymWorkoutLocations.length > 0) {
        const gymIndexes = [...new Set([
          chooseNextGymIndexForAgent(agent),
          chooseNextGymIndexForAgent(agent),
          Math.floor(Math.random() * gymWorkoutLocations.length),
          Math.floor(Math.random() * gymWorkoutLocations.length),
        ])];
        for (const gymIndex of gymIndexes) {
          const workout = gymWorkoutLocations[gymIndex] ?? GYM_DEFAULT_TARGET;
          addCandidate(`gym_${workout.workoutStyle}`, 0.95 + Math.random() * 0.08, workout.x, workout.y, () =>
            buildRoutePlan(agent, "autonomous", { kind: "gym", lingerMs: 5_800 + Math.random() * 6_800 }),
          );
        }
      }

      if (qaLabStations.length > 0) {
        const qaIndexes = [...new Set([
          chooseNextQaIndexForAgent(agent),
          chooseNextQaIndexForAgent(agent),
          Math.floor(Math.random() * qaLabStations.length),
          Math.floor(Math.random() * qaLabStations.length),
        ])];
        for (const qaIndex of qaIndexes) {
          const station = qaLabStations[qaIndex] ?? {
            ...QA_LAB_DEFAULT_TARGET,
            stationType: "console" as const,
          };
          addCandidate(`qa_${station.stationType}`, 0.9 + Math.random() * 0.1, station.x, station.y, () =>
            buildRoutePlan(agent, "autonomous", { kind: "qa_lab", lingerMs: 4_600 + Math.random() * 5_600 }),
          );
        }
      }

      const hasServerRoom = (furnitureItems ?? []).some((item) =>
        ["server_rack", "server_terminal", "qa_terminal", "device_rack", "test_bench"].includes(item.type),
      );
      if (hasServerRoom) {
        addCandidate("server_check", 0.88, SERVER_ROOM_TARGET.x, SERVER_ROOM_TARGET.y, () =>
          buildRoutePlan(agent, "autonomous", { kind: "server_room", lingerMs: 4_800 + Math.random() * 2_600 }),
        );
      }

      const hasSmsBooth = (furnitureItems ?? []).some((item) => item.type === "sms_booth");
      if (hasSmsBooth) {
        addCandidate("sms_booth", 0.84, agent.x + 1, agent.y + 1, () =>
          buildRoutePlan(agent, "autonomous", { kind: "sms_booth", lingerMs: 4_000 + Math.random() * 2_000 }),
        );
      }

      const hasPhoneBooth = (furnitureItems ?? []).some((item) => item.type === "phone_booth");
      if (hasPhoneBooth) {
        addCandidate("phone_booth", 0.8, agent.x + 2, agent.y + 2, () =>
          buildRoutePlan(agent, "autonomous", { kind: "phone_booth", lingerMs: 4_000 + Math.random() * 2_000 }),
        );
      }

      const roamPoints = [...new Set([0, 1, 2, 3, 4].map(() => Math.floor(Math.random() * 16)))]
        .map(() => chooseDistinctRoamPoint(agent.id, agent.x, agent.y));
      for (const roamPoint of roamPoints) {
        addCandidate("roam", 0.76, roamPoint.x, roamPoint.y, () =>
          buildRoutePlan(agent, "autonomous", { kind: "roam", point: roamPoint, lingerMs: 1_200 + Math.random() * 2_400 }),
        );
      }
      const roamPoint = roamPoints[0] ?? chooseDistinctRoamPoint(agent.id, agent.x, agent.y);

      const ranked = candidates
        .filter(({ score }) => Number.isFinite(score) && score > 0)
        .sort((left, right) => right.score - left.score);
      const selected = ranked[0];
      return selected ? selected.build() : buildRoutePlan(agent, "autonomous", { kind: "roam", point: roamPoint });
    },
    [buildRoutePlan, chooseNextGymIndexForAgent, chooseNextQaIndexForAgent, deskLocations, furnitureRef, gymWorkoutLocations, meetingSeatLocations, qaLabStations],
  );

  const buildForcedIntent = useCallback(
    (
      agentId: string,
      effectiveStatus: RenderAgent["status"],
      explicitMeetingHold: boolean,
      explicitGymHold: boolean,
      explicitSmsBoothHold: boolean,
      explicitPhoneBoothHold: boolean,
      explicitQaHold: boolean,
      explicitGithubHold: boolean,
      explicitDeskHold: boolean,
      hasDesk: boolean,
    ): WorkingIntent | null => {
      if (explicitMeetingHold) return { kind: "meeting_room" };
      if (explicitGymHold) return { kind: "gym" };
      if (explicitSmsBoothHold) return { kind: "sms_booth" };
      if (explicitPhoneBoothHold) return { kind: "phone_booth" };
      if (explicitQaHold) return { kind: "qa_lab" };
      if (explicitGithubHold) return { kind: "server_room" };
      if (explicitDeskHold) {
        if (hasDesk || deskLocations.length > 0) return { kind: "desk" };
        return null;
      }
      return null;
    },
    [deskLocations.length],
  );

  const buildPlanForIntent = useCallback(
    (agent: RenderAgent, intent: WorkingIntent, mode: AgentMode) => {
      switch (intent.kind) {
        case "meeting_room":
          return buildRoutePlan(agent, mode, { kind: "meeting_room", lingerMs: 12_000 });
        case "gym":
          return buildRoutePlan(agent, mode, { kind: "gym", lingerMs: 10_000 });
        case "qa_lab":
          return buildRoutePlan(agent, mode, { kind: "qa_lab", lingerMs: 9_000 });
        case "server_room":
          return buildRoutePlan(agent, mode, { kind: "server_room", lingerMs: 8_000 });
        case "sms_booth":
          return buildRoutePlan(agent, mode, { kind: "sms_booth", lingerMs: 8_000 });
        case "phone_booth":
          return buildRoutePlan(agent, mode, { kind: "phone_booth", lingerMs: 8_000 });
        case "desk":
        default:
          return buildRoutePlan(agent, mode, { kind: "desk", lingerMs: 15_000 });
      }
    },
    [buildRoutePlan],
  );

  const maybeContinueStagedInteraction = useCallback(
    (agent: RenderAgent, mode: AgentMode): RoutePlan | null => {
      switch (agent.interactionTarget) {
        case "gym":
          return agent.gymStage === "workout" ? null : buildRoutePlan(agent, mode, { kind: "gym", lingerMs: 8_500 });
        case "qa_lab":
          return agent.qaLabStage === "station" ? null : buildRoutePlan(agent, mode, { kind: "qa_lab", lingerMs: 7_000 });
        case "server_room":
          return agent.serverRoomStage === "terminal" ? null : buildRoutePlan(agent, mode, { kind: "server_room", lingerMs: 6_000 });
        case "sms_booth":
          return agent.smsBoothStage === "typing" ? null : buildRoutePlan(agent, mode, { kind: "sms_booth", lingerMs: 5_200 });
        case "phone_booth":
          return agent.phoneBoothStage === "receiver" ? null : buildRoutePlan(agent, mode, { kind: "phone_booth", lingerMs: 5_200 });
        default:
          return null;
      }
    },
    [buildRoutePlan],
  );

  const ensurePlanMovesAgent = useCallback(
    (agent: RenderAgent, plan: RoutePlan, mode: AgentMode): RoutePlan => {
      const minimumDistance = mode === "autonomous" ? MIN_AUTONOMOUS_TRAVEL_DISTANCE : MIN_FORCED_TRAVEL_DISTANCE;
      const distance = Math.hypot(plan.targetX - agent.x, plan.targetY - agent.y);
      if (distance >= minimumDistance) {
        return plan;
      }
      if (mode === "autonomous") {
        return buildRoutePlan(agent, "autonomous", {
          kind: "roam",
          point: chooseDistinctRoamPoint(agent.id, agent.x, agent.y),
          lingerMs: 1_400 + Math.random() * 1_000,
        });
      }
      if (plan.interactionTarget === "desk" && deskLocations.length > 1) {
        const alternativeDeskIndex =
          ((deskByAgentRef.current.get(agent.id) ?? hashAgentId(agent.id) % deskLocations.length) + 1) %
          deskLocations.length;
        const anchor = toDeskAnchor(deskLocations, alternativeDeskIndex, agent.x, agent.y);
        const fallbackRoute = buildRecoveredPath(agent.x, agent.y, anchor.x, anchor.y, getNavGrid());
        return {
          ...plan,
          targetX: fallbackRoute.targetX,
          targetY: fallbackRoute.targetY,
          path: fallbackRoute.path,
          facing: anchor.facing,
        };
      }
      return plan;
    },
    [buildRoutePlan, deskLocations, getNavGrid],
  );

  useEffect(() => {
    const now = Date.now();
    const activeIds = new Set(agents.map((agent) => agent.id));
    for (const [id] of brainByAgentRef.current) {
      if (!activeIds.has(id)) brainByAgentRef.current.delete(id);
    }
    for (const [id] of stickyUntilRef.current) {
      if (!activeIds.has(id)) stickyUntilRef.current.delete(id);
    }
    for (const [id] of deskByAgentRef.current) {
      if (!activeIds.has(id)) deskByAgentRef.current.delete(id);
    }
    for (const [id] of gymByAgentRef.current) {
      if (!activeIds.has(id)) gymByAgentRef.current.delete(id);
    }
    for (const [id] of qaByAgentRef.current) {
      if (!activeIds.has(id)) qaByAgentRef.current.delete(id);
    }
    for (const [id] of gymCycleRef.current) {
      if (!activeIds.has(id)) gymCycleRef.current.delete(id);
    }
    for (const [id] of qaCycleRef.current) {
      if (!activeIds.has(id)) qaCycleRef.current.delete(id);
    }

    const currentMap = new Map(renderAgentsRef.current.map((agent) => [agent.id, agent]));
    const nextAgents: RenderAgent[] = [];

    for (const sceneAgent of agents) {
      const isJanitor = "role" in sceneAgent && sceneAgent.role === "janitor";
      const existing = currentMap.get(sceneAgent.id);

      if (isJanitor) {
        const route = sceneAgent.janitorRoute;
        const spawn = route[0] ?? { x: 400, y: 400, facing: Math.PI / 2 };
        const nextStop = route[1] ?? spawn;
        nextAgents.push(
          existing
            ? ({ ...existing, ...sceneAgent } as RenderAgent)
            : ({
                ...sceneAgent,
                x: spawn.x,
                y: spawn.y,
                targetX: nextStop.x,
                targetY: nextStop.y,
                path: planOfficePath(spawn.x, spawn.y, nextStop.x, nextStop.y, getNavGrid()),
                facing: spawn.facing,
                frame: 0,
                walkSpeed: WALK_SPEED * 0.8,
                phaseOffset: Math.random() * Math.PI * 2,
                state: route.length > 1 ? "walking" : "standing",
                janitorRouteIndex: route.length > 1 ? 1 : 0,
              } as RenderAgent),
        );
        continue;
      }

      const assignedDeskIndex = assignedDeskIndexByAgentId[sceneAgent.id];
      if (typeof assignedDeskIndex === "number") deskByAgentRef.current.set(sceneAgent.id, assignedDeskIndex);
      else deskByAgentRef.current.delete(sceneAgent.id);

      if (!gymByAgentRef.current.has(sceneAgent.id)) {
        gymByAgentRef.current.set(sceneAgent.id, nextGymRef.current % Math.max(gymWorkoutLocations.length, 1));
        nextGymRef.current += 1;
      }
      if (!qaByAgentRef.current.has(sceneAgent.id)) {
        qaByAgentRef.current.set(sceneAgent.id, nextQaRef.current % Math.max(qaLabStations.length, 1));
        nextQaRef.current += 1;
      }

      const explicitMeetingHold =
        (standupMeeting?.phase === "gathering" || standupMeeting?.phase === "in_progress") &&
        (standupMeeting?.participantOrder ?? []).includes(sceneAgent.id);
      const explicitGymHold = Boolean(gymHoldByAgentId[sceneAgent.id]);
      const explicitSmsBoothHold = Boolean(smsBoothHoldByAgentId[sceneAgent.id]);
      const explicitPhoneBoothHold = Boolean(phoneBoothHoldByAgentId[sceneAgent.id]);
      const explicitQaHold = Boolean(qaHoldByAgentId[sceneAgent.id]);
      const explicitGithubHold = Boolean(githubReviewByAgentId[sceneAgent.id]);
      const explicitDeskHold = Boolean(deskHoldByAgentId[sceneAgent.id]);

      if (sceneAgent.status === "working" || explicitDeskHold) {
        stickyUntilRef.current.set(sceneAgent.id, now + DESK_STICKY_MS);
      }
      const stickyUntil = stickyUntilRef.current.get(sceneAgent.id) ?? 0;
      const effectiveStatus: RenderAgent["status"] =
        sceneAgent.status === "error"
          ? "error"
          : sceneAgent.status === "working" ||
              explicitDeskHold ||
              explicitMeetingHold ||
              explicitGymHold ||
              explicitSmsBoothHold ||
              explicitPhoneBoothHold ||
              explicitQaHold ||
              explicitGithubHold ||
              stickyUntil > now
            ? "working"
            : "idle";

      const workingIntent = buildForcedIntent(
        sceneAgent.id,
        effectiveStatus,
        explicitMeetingHold,
        explicitGymHold,
        explicitSmsBoothHold,
        explicitPhoneBoothHold,
        explicitQaHold,
        explicitGithubHold,
        explicitDeskHold,
        deskByAgentRef.current.has(sceneAgent.id),
      );

      const spawnPoint = chooseSpawnPoint(sceneAgent.id);
      if (typeof assignedDeskIndex !== "number" && deskLocations.length > 0) {
        deskByAgentRef.current.set(
          sceneAgent.id,
          hashAgentId(sceneAgent.id) % deskLocations.length,
        );
      }

      const baseAgent: RenderAgent = existing
        ? ({ ...existing, ...sceneAgent, status: effectiveStatus } as RenderAgent)
        : ({
            ...sceneAgent,
            x: spawnPoint.x,
            y: spawnPoint.y,
            targetX: 0,
            targetY: 0,
            path: [],
            facing: Math.PI / 2,
            frame: 0,
            walkSpeed: WALK_SPEED * (0.88 + Math.random() * 0.4),
            phaseOffset: Math.random() * Math.PI * 2,
            state: "standing",
            status: effectiveStatus,
          } as RenderAgent);

      let brain = brainByAgentRef.current.get(sceneAgent.id);
      if (!brain) {
        brain = DEFAULT_BRAIN(baseAgent.x, baseAgent.y, now);
        brainByAgentRef.current.set(sceneAgent.id, brain);
      }

      if (effectiveStatus === "error") {
        brain.mode = "error";
        brain.nextDecisionAt = Number.POSITIVE_INFINITY;
        nextAgents.push({
          ...baseAgent,
          targetX: baseAgent.x,
          targetY: baseAgent.y,
          path: [],
          state: "standing",
          interactionTarget: undefined,
          smsBoothStage: undefined,
          phoneBoothStage: undefined,
          serverRoomStage: undefined,
          gymStage: undefined,
          qaLabStage: undefined,
          qaLabStationType: undefined,
          workoutStyle: undefined,
        });
        continue;
      }

      if (baseAgent.pingPongUntil !== undefined && baseAgent.pingPongUntil > now && !explicitMeetingHold) {
        nextAgents.push(baseAgent);
        continue;
      }

      const desiredMode: AgentMode = workingIntent ? "forced" : "autonomous";
      let nextAgent = baseAgent;
      if (!existing || brain.mode !== desiredMode) {
        const rawPlan = workingIntent
          ? buildPlanForIntent(baseAgent, workingIntent, desiredMode)
          : buildAutonomousPlan(baseAgent);
        const plan = ensurePlanMovesAgent(baseAgent, rawPlan, desiredMode);
        setBrainPlan(brain, plan, now, plan.path.length === 0);
        if (desiredMode === "autonomous") {
          brain.recentActions = nextRecentActions(brain.recentActions, plan.actionKey);
        }
        resetBrainProgress(brain, baseAgent.x, baseAgent.y, now);
        nextAgent = applyPlanToAgent(baseAgent, plan);
      } else if (desiredMode === "forced" && workingIntent) {
        const rawPlan = buildPlanForIntent(baseAgent, workingIntent, desiredMode);
        const plan = ensurePlanMovesAgent(baseAgent, rawPlan, desiredMode);
        const changedTarget =
          Math.hypot(plan.targetX - baseAgent.targetX, plan.targetY - baseAgent.targetY) > 18 ||
          plan.interactionTarget !== baseAgent.interactionTarget ||
          plan.gymStage !== baseAgent.gymStage ||
          plan.qaLabStage !== baseAgent.qaLabStage ||
          plan.serverRoomStage !== baseAgent.serverRoomStage ||
          plan.smsBoothStage !== baseAgent.smsBoothStage ||
          plan.phoneBoothStage !== baseAgent.phoneBoothStage;
        if (changedTarget) {
          setBrainPlan(brain, plan, now, plan.path.length === 0);
          resetBrainProgress(brain, baseAgent.x, baseAgent.y, now);
          nextAgent = applyPlanToAgent(baseAgent, plan);
        }
      }
      nextAgents.push(nextAgent);
    }

    renderAgentsRef.current = nextAgents;
    const lookup = renderAgentLookupRef.current;
    lookup.clear();
    for (const agent of nextAgents) lookup.set(agent.id, agent);
  }, [
    agents,
    assignedDeskIndexByAgentId,
    buildAutonomousPlan,
    buildForcedIntent,
    buildPlanForIntent,
    ensurePlanMovesAgent,
    deskHoldByAgentId,
    getNavGrid,
    githubReviewByAgentId,
    gymHoldByAgentId,
    gymWorkoutLocations.length,
    phoneBoothHoldByAgentId,
    qaHoldByAgentId,
    qaLabStations.length,
    smsBoothHoldByAgentId,
    standupMeeting,
  ]);

  const tick = (delta = 1 / 60) => {
    const grid = getNavGrid();
    const now = Date.now();
    const frameAdvance = Math.min(2.2, Math.max(0.75, delta * 60));

    const moved = renderAgentsRef.current.map((agent) => {
      const isJanitor = "role" in agent && agent.role === "janitor";
      if (isJanitor) {
        if (agent.janitorPauseUntil && now < agent.janitorPauseUntil) {
          return { ...agent, frame: agent.frame + frameAdvance, state: "standing" as const };
        }
        if (agent.janitorPauseUntil && now >= agent.janitorPauseUntil) {
          const nextIndex = (agent.janitorRouteIndex ?? 0) + 1;
          const nextStop = agent.janitorRoute[nextIndex];
          if (!nextStop) {
            return { ...agent, frame: agent.frame + frameAdvance, janitorPauseUntil: undefined, state: "standing" as const };
          }
          return {
            ...agent,
            frame: agent.frame + frameAdvance,
            janitorPauseUntil: undefined,
            janitorRouteIndex: nextIndex,
            targetX: nextStop.x,
            targetY: nextStop.y,
            path: planOfficePath(agent.x, agent.y, nextStop.x, nextStop.y, grid),
            facing: nextStop.facing,
            state: "walking" as const,
          };
        }
      }

      if (agent.pingPongUntil !== undefined) {
        if (now >= agent.pingPongUntil) {
          return {
            ...agent,
            frame: agent.frame + frameAdvance,
            pingPongUntil: undefined,
            pingPongTargetX: undefined,
            pingPongTargetY: undefined,
            pingPongFacing: undefined,
            pingPongPartnerId: undefined,
            pingPongTableUid: undefined,
            pingPongSide: undefined,
            pingPongPreviousWalkSpeed: undefined,
            targetX: agent.x,
            targetY: agent.y,
            path: [],
            state: "standing" as const,
          };
        }
      }

      if (agent.bumpedUntil !== undefined && now < agent.bumpedUntil) {
        return { ...agent, frame: agent.frame + frameAdvance, state: "standing" as const };
      }

      if (agent.bumpedUntil !== undefined && now >= agent.bumpedUntil) {
        agent = {
          ...agent,
          bumpedUntil: undefined,
          bumpTalkUntil: undefined,
          collisionCooldownUntil: now + COLLISION_RECOVERY_MS,
          path: planOfficePath(agent.x, agent.y, agent.targetX, agent.targetY, grid),
          state: (agent.path?.length ?? 0) > 0 ? "walking" : agent.state,
        };
      }

      const brain = brainByAgentRef.current.get(agent.id) ?? DEFAULT_BRAIN(agent.x, agent.y, now);
      brainByAgentRef.current.set(agent.id, brain);

      if (agent.status === "error") {
        return {
          ...agent,
          frame: agent.frame + frameAdvance,
          state: "standing" as const,
          path: [],
          targetX: agent.x,
          targetY: agent.y,
        };
      }

      if ((danceUntilByAgentId[agent.id] ?? 0) > now && agent.state !== "away") {
        resetBrainProgress(brain, agent.x, agent.y, now);
        return {
          ...agent,
          frame: agent.frame + frameAdvance,
          state: "dancing" as const,
          path: [],
          targetX: agent.x,
          targetY: agent.y,
        };
      }

      const lastSeen = lastSeenByAgentId[agent.id] ?? 0;
      const shouldGoAway = agent.status === "idle" && lastSeen > 0 && now - lastSeen > AWAY_THRESHOLD_MS;
      if (shouldGoAway && agent.path.length === 0 && agent.interactionTarget !== "kitchen") {
        const furnitureItems = furnitureRef.current ?? [];
        const kitchenPoint = buildKitchenPoints(furnitureItems)[0];
        if (kitchenPoint) {
          const awayPlan = ensurePlanMovesAgent(
            agent,
            buildRoutePlan(agent, "autonomous", {
              kind: "kitchen",
              point: kitchenPoint,
              lingerMs: 45_000,
            }),
            "autonomous",
          );
          setBrainPlan(brain, awayPlan, now, awayPlan.path.length === 0);
          brain.recentActions = nextRecentActions(brain.recentActions, awayPlan.actionKey);
          return {
            ...applyPlanToAgent(agent, awayPlan),
            frame: agent.frame + frameAdvance,
            state: awayPlan.path.length > 0 ? "walking" : "away",
          };
        }
      }

      let working = agent;
      let path = working.path ?? [];
      const targetDistance = Math.hypot(working.targetX - working.x, working.targetY - working.y);
      if (path.length === 0 && targetDistance > PATH_REPLAN_DISTANCE) {
        const replanned = buildRecoveredPath(working.x, working.y, working.targetX, working.targetY, grid);
        path = replanned.path;
        working = {
          ...working,
          targetX: replanned.targetX,
          targetY: replanned.targetY,
          path,
          state: path.length > 0 ? "walking" : working.state,
        };
      }

      if (path.length > 0) {
        const movedDistance = Math.hypot(working.x - brain.stallX, working.y - brain.stallY);
        if (movedDistance > STALL_MOVE_EPSILON) {
          resetBrainProgress(brain, working.x, working.y, now);
        } else if (now - brain.stallSince >= STALL_SAMPLE_MS) {
          brain.stallCount += 1;
          brain.stallSince = now;
          const rawRecoveryPlan =
            brain.mode === "forced"
              ? working.interactionTarget === "meeting_room"
                ? buildPlanForIntent(working, { kind: "meeting_room" }, "forced")
                : working.interactionTarget === "gym"
                  ? buildPlanForIntent(working, { kind: "gym" }, "forced")
                  : working.interactionTarget === "qa_lab"
                    ? buildPlanForIntent(working, { kind: "qa_lab" }, "forced")
                    : working.interactionTarget === "server_room"
                      ? buildPlanForIntent(working, { kind: "server_room" }, "forced")
                      : working.interactionTarget === "sms_booth"
                        ? buildPlanForIntent(working, { kind: "sms_booth" }, "forced")
                        : working.interactionTarget === "phone_booth"
                          ? buildPlanForIntent(working, { kind: "phone_booth" }, "forced")
                          : buildPlanForIntent(working, { kind: "desk" }, "forced")
              : buildAutonomousPlan(working);
          const recoveredPlan =
            brain.stallCount > MAX_STALL_REPLANS && brain.mode === "autonomous"
              ? buildRoutePlan(working, "autonomous", {
                  kind: "roam",
                  point: chooseDistinctRoamPoint(working.id, working.x, working.y),
                  lingerMs: 1_800,
                })
              : ensurePlanMovesAgent(working, rawRecoveryPlan, brain.mode);
          setBrainPlan(brain, recoveredPlan, now, recoveredPlan.path.length === 0);
          if (brain.mode === "autonomous") {
            brain.recentActions = nextRecentActions(brain.recentActions, recoveredPlan.actionKey);
          }
          resetBrainProgress(brain, working.x, working.y, now);
          return { ...applyPlanToAgent(working, recoveredPlan), frame: working.frame + frameAdvance };
        }
      } else {
        resetBrainProgress(brain, working.x, working.y, now);
      }

      const baseSpeed =
        (working.walkSpeed ?? WALK_SPEED) *
        (working.status === "working" && working.state !== "sitting" ? WORKING_WALK_SPEED_MULTIPLIER : 1);
      const speed = baseSpeed * frameAdvance;
      const waypoint = path[0] ?? { x: working.targetX, y: working.targetY };
      const dx = waypoint.x - working.x;
      const dy = waypoint.y - working.y;
      const distance = Math.hypot(dx, dy);

      let nextX = working.x;
      let nextY = working.y;
      let nextFacing = working.facing;
      let nextPath = path;
      let nextState = working.state;

      if (distance > speed && distance > 0.001) {
        nextX = working.x + (dx / distance) * speed;
        nextY = working.y + (dy / distance) * speed;
        const safeStep = projectPointToNavigable(nextX, nextY, grid);
        nextX = safeStep.x;
        nextY = safeStep.y;
        nextFacing = Math.atan2(dx, dy);
        nextState = "walking";
      } else {
        nextX = waypoint.x;
        nextY = waypoint.y;
        if (path.length > 1) {
          nextPath = path.slice(1);
          nextState = "walking";
        } else {
          nextPath = [];
          if (isJanitor) {
            const stop = agent.janitorRoute[agent.janitorRouteIndex ?? 0] ?? agent.janitorRoute.at(-1);
            return {
              ...working,
              x: nextX,
              y: nextY,
              frame: working.frame + frameAdvance,
              path: [],
              state: "standing" as const,
              facing: stop?.facing ?? nextFacing,
              janitorPauseUntil:
                (agent.janitorRouteIndex ?? 0) < agent.janitorRoute.length - 1
                  ? now + agent.janitorPauseMs
                  : undefined,
            };
          }

          if (working.pingPongUntil !== undefined) {
            nextX = working.pingPongTargetX ?? nextX;
            nextY = working.pingPongTargetY ?? nextY;
            nextFacing = working.pingPongFacing ?? nextFacing;
            nextState = "standing";
          } else {
            const arrivedAgent = {
              ...working,
              x: nextX,
              y: nextY,
              path: [],
            } as RenderAgent;
            const continuedPlan = isInteractiveRoomTarget(working.interactionTarget)
              ? maybeContinueStagedInteraction(arrivedAgent, brain.mode)
              : null;
            if (continuedPlan) {
              const ensuredPlan = ensurePlanMovesAgent(arrivedAgent, continuedPlan, brain.mode);
              setBrainPlan(brain, ensuredPlan, now, ensuredPlan.path.length === 0);
              if (brain.mode === "autonomous") {
                brain.recentActions = nextRecentActions(brain.recentActions, ensuredPlan.actionKey);
              }
              resetBrainProgress(brain, nextX, nextY, now);
              return { ...applyPlanToAgent(arrivedAgent, ensuredPlan), frame: working.frame + frameAdvance };
            }

            nextFacing = working.facing;
            nextState = inferArrivalState(working);
            if (brain.mode === "autonomous") {
              if (brain.nextDecisionAt === Number.POSITIVE_INFINITY) {
                brain.nextDecisionAt = now + brain.currentLingerMs;
              }
              if (now >= brain.nextDecisionAt) {
                const nextPlan = ensurePlanMovesAgent(
                  arrivedAgent,
                  buildAutonomousPlan(arrivedAgent),
                  "autonomous",
                );
                setBrainPlan(brain, nextPlan, now, nextPlan.path.length === 0);
                brain.recentActions = nextRecentActions(brain.recentActions, nextPlan.actionKey);
                resetBrainProgress(brain, nextX, nextY, now);
                return { ...applyPlanToAgent(arrivedAgent, nextPlan), frame: working.frame + frameAdvance };
              }
            }
          }
        }
      }

      return {
        ...working,
        x: nextX,
        y: nextY,
        facing: nextFacing,
        path: nextPath,
        state: nextState,
        frame: working.frame + frameAdvance,
      };
    });

    const collisionBuckets = new Map<string, number[]>();
    const bucketSize = AGENT_RADIUS * 4;
    for (let index = 0; index < moved.length; index += 1) {
      const agent = moved[index];
      if ("role" in agent && agent.role === "janitor") continue;
      const key = `${Math.floor(agent.x / bucketSize)}:${Math.floor(agent.y / bucketSize)}`;
      const bucket = collisionBuckets.get(key);
      if (bucket) bucket.push(index);
      else collisionBuckets.set(key, [index]);
    }

    for (let i = 0; i < moved.length; i += 1) {
      const left = moved[i];
      if ("role" in left && left.role === "janitor") continue;
      if (left.state === "sitting" || left.state === "working_out" || left.state === "dancing") continue;
      const bucketX = Math.floor(left.x / bucketSize);
      const bucketY = Math.floor(left.y / bucketSize);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const bucket = collisionBuckets.get(`${bucketX + offsetX}:${bucketY + offsetY}`);
          if (!bucket) continue;
          for (const j of bucket) {
            if (j <= i) continue;
            const right = moved[j];
            if ("role" in right && right.role === "janitor") continue;
            if (right.state === "sitting" || right.state === "working_out" || right.state === "dancing") continue;

            let dx = left.x - right.x;
            let dy = left.y - right.y;
            let distance = Math.hypot(dx, dy);
            const minDistance = AGENT_RADIUS * 2;
            if (distance >= minDistance) continue;
            if (distance < 0.0001) {
              dx = Math.random() - 0.5;
              dy = Math.random() - 0.5;
              distance = Math.hypot(dx, dy) || 1;
            }
            const overlap = minDistance - distance;
            const pushX = (dx / distance) * (overlap / 2);
            const pushY = (dy / distance) * (overlap / 2);

            const leftSafe = projectPointToNavigable(left.x + pushX, left.y + pushY, grid);
            const rightSafe = projectPointToNavigable(right.x - pushX, right.y - pushY, grid);

            moved[i] = {
              ...left,
              x: leftSafe.x,
              y: leftSafe.y,
              facing: Math.atan2(-dx, -dy),
              bumpedUntil:
                (left.collisionCooldownUntil ?? 0) <= now ? now + COLLISION_FREEZE_MS : left.bumpedUntil,
              bumpTalkUntil:
                (left.collisionCooldownUntil ?? 0) <= now ? now + COLLISION_FREEZE_MS : left.bumpTalkUntil,
              collisionCooldownUntil: now + COLLISION_RECOVERY_MS,
              path: planOfficePath(leftSafe.x, leftSafe.y, left.targetX, left.targetY, grid),
            };
            moved[j] = {
              ...right,
              x: rightSafe.x,
              y: rightSafe.y,
              facing: Math.atan2(dx, dy),
              bumpedUntil:
                (right.collisionCooldownUntil ?? 0) <= now ? now + COLLISION_FREEZE_MS : right.bumpedUntil,
              bumpTalkUntil:
                (right.collisionCooldownUntil ?? 0) <= now ? now + COLLISION_FREEZE_MS : right.bumpTalkUntil,
              collisionCooldownUntil: now + COLLISION_RECOVERY_MS,
              path: planOfficePath(rightSafe.x, rightSafe.y, right.targetX, right.targetY, grid),
            };
          }
        }
      }
    }

    renderAgentsRef.current = moved;
    const lookup = renderAgentLookupRef.current;
    lookup.clear();
    for (const agent of moved) lookup.set(agent.id, agent);
  };

  return {
    renderAgentsRef,
    renderAgentLookupRef,
    tick,
    deskByAgentRef,
    planPath,
  };
}
