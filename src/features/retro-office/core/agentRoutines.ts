/**
 * Contextual routine system for idle agents.
 *
 * Replaces the single-shot "pick one action then wander off" behaviour with
 * committed, coherent routines (gym session, kitchen break, rest on couch,
 * observation walk, desk focus, etc.) each composed of several sub-actions
 * that stay inside the same context. Cooldowns prevent immediate repetition
 * of the same routine, and per-routine min/max durations make agents look
 * genuinely busy with an activity before moving on.
 *
 * Core concepts:
 *   - RoutineContext: high-level activity an agent is committed to.
 *   - AgentRoutine:   live state for the active routine (steps remaining,
 *                     whether currently in a between-steps pause, etc.).
 *   - pickRoutine:    selects a new context using weights + cooldowns.
 *   - advanceRoutine: produces the next step target intent for the motion
 *                     loop to build a RoutePlan from.
 *
 * Integration contract:
 *   - The caller owns `AgentBrain.routine` and `AgentBrain.cooldownByContext`.
 *   - The caller invokes `pickRoutine` when no routine exists (or the
 *     previous one just ended).
 *   - For every new step the caller asks `nextRoutineStep` for the intent +
 *     whether this is a "pause" step (should the motion loop just linger
 *     instead of requesting a new plan).
 *   - When a forced intent (user-triggered task, standup meeting, etc.)
 *     arrives, the caller clears the routine — routines never override
 *     forced work.
 */

import type { AgentIntent } from "@/features/retro-office/core/agentIntents";

// Contexts the agent can commit to.
// Each maps to one or more existing AgentIntents plus flavour (pause steps,
// observation steps, posture changes).
export type RoutineContext =
  | "gym"
  | "qa_lab"
  | "server_room"
  | "lounge_rest"
  | "kitchen"
  | "social"
  | "observe"
  | "desk_focus"
  | "sms_booth"
  | "phone_booth";

// A concrete step inside a routine. The motion layer reads `intent` to build
// a plan. `pauseMs` (when > 0) replaces the plan build with a simple in-place
// linger — useful for breather moments between workout sets, tiny posture
// shifts on a couch, or quick stand-and-observe beats.
export type RoutineStep = {
  intent: AgentIntent;
  label: string; // debug
  // Pause steps stay in place for this long. For active steps the motion
  // layer uses the intent plan's own lingerMs.
  pauseMs: number;
  // A soft minimum on how long the step should run even if the intent plan
  // returned a short lingerMs. Used to stretch work/QA/lounge stages into
  // meaningful sessions.
  minStageMs: number;
};

export type AgentRoutine = {
  context: RoutineContext;
  steps: RoutineStep[];
  index: number;         // index of the step currently being executed
  startedAt: number;
  plannedEndsAt: number; // soft cap: total expected duration
};

export type RoutineCooldownMap = Partial<Record<RoutineContext, number>>;

// Config that describes what a context looks like: probability weight, how
// long the cooldown lasts once the routine ends, the step recipe factory,
// and whether the resource for this context exists in the current scene.
type RoutineConfig = {
  // Base weight when not on cooldown. Multiplied by repeat-penalty in pick.
  weight: number;
  // How long to wait before the same context can be selected again (ms).
  cooldownMs: [number, number]; // [min, max]
  // Build the actual sequence of sub-actions for this routine instance.
  buildSteps: (now: number) => RoutineStep[];
};

// Small RNG helpers.
const randRange = (min: number, max: number) =>
  min + Math.random() * (max - min);
const pickRandom = <T,>(items: T[], fallback: T): T =>
  items[Math.floor(Math.random() * items.length)] ?? fallback;

// Rolls true with given probability.
const chance = (p: number) => Math.random() < p;

/* ------------------------------------------------------------------ */
/* Step recipes per context                                            */
/* ------------------------------------------------------------------ */

const buildGymSteps = (): RoutineStep[] => {
  // Gym session: 2-4 workout stations with short pauses between. Each gym
  // intent already handles its own approach -> workout multi-stage, we just
  // repeat it so the agent looks like they're moving between equipment.
  const stations = Math.floor(randRange(2, 4.999)); // 2..4
  const steps: RoutineStep[] = [];
  for (let i = 0; i < stations; i += 1) {
    steps.push({
      intent: "gym",
      label: `gym_station_${i + 1}`,
      pauseMs: 0,
      minStageMs: randRange(14000, 22000),
    });
    // Breather between stations (wipe brow / drink water / stretch in place).
    if (i < stations - 1 && chance(0.75)) {
      steps.push({
        intent: "gym",
        label: "gym_breather",
        pauseMs: randRange(2200, 4200),
        minStageMs: 0,
      });
    }
  }
  // Cool-down beat before leaving.
  if (chance(0.55)) {
    steps.push({
      intent: "gym",
      label: "gym_cooldown",
      pauseMs: randRange(1600, 3000),
      minStageMs: 0,
    });
  }
  return steps;
};

const buildQaLabSteps = (): RoutineStep[] => {
  // QA session: test 2-3 benches, occasionally stop to observe the area.
  const tests = Math.floor(randRange(2, 3.999)); // 2..3
  const steps: RoutineStep[] = [];
  for (let i = 0; i < tests; i += 1) {
    steps.push({
      intent: "qa_lab",
      label: `qa_station_${i + 1}`,
      pauseMs: 0,
      minStageMs: randRange(12000, 20000),
    });
    if (i < tests - 1 && chance(0.55)) {
      steps.push({
        intent: "qa_lab",
        label: "qa_observe",
        pauseMs: randRange(2400, 4200),
        minStageMs: 0,
      });
    }
  }
  return steps;
};

const buildServerRoomSteps = (): RoutineStep[] => {
  // Server session: work at a terminal, occasionally move to another rack.
  const stints = Math.floor(randRange(2, 3.499)); // 2..3
  const steps: RoutineStep[] = [];
  for (let i = 0; i < stints; i += 1) {
    steps.push({
      intent: "server_room",
      label: `server_terminal_${i + 1}`,
      pauseMs: 0,
      minStageMs: randRange(14000, 22000),
    });
    if (i < stints - 1 && chance(0.5)) {
      steps.push({
        intent: "server_room",
        label: "server_observe",
        pauseMs: randRange(2000, 3600),
        minStageMs: 0,
      });
    }
  }
  return steps;
};

const buildLoungeSteps = (): RoutineStep[] => {
  // Rest routine: settle on a couch for several beats with tiny posture
  // shifts (mapped to repeated lounge intent calls that pick nearby seats).
  const beats = Math.floor(randRange(3, 5.999)); // 3..5
  const steps: RoutineStep[] = [];
  for (let i = 0; i < beats; i += 1) {
    steps.push({
      intent: "lounge",
      label: `lounge_beat_${i + 1}`,
      pauseMs: 0,
      minStageMs: randRange(6000, 11000),
    });
    // Occasional posture change between beats (stays seated, no travel).
    if (i < beats - 1 && chance(0.4)) {
      steps.push({
        intent: "lounge",
        label: "lounge_shift",
        pauseMs: randRange(1800, 3200),
        minStageMs: 0,
      });
    }
  }
  return steps;
};

const buildKitchenSteps = (): RoutineStep[] => {
  // Kitchen break: approach coffee / water / vending, sip, maybe move to
  // another pantry spot, chat-observe.
  const visits = Math.floor(randRange(2, 3.999)); // 2..3
  const steps: RoutineStep[] = [];
  for (let i = 0; i < visits; i += 1) {
    steps.push({
      intent: "kitchen",
      label: `kitchen_visit_${i + 1}`,
      pauseMs: 0,
      minStageMs: randRange(4000, 8000),
    });
    if (i < visits - 1 && chance(0.6)) {
      steps.push({
        intent: "kitchen",
        label: "kitchen_chat",
        pauseMs: randRange(1800, 3600),
        minStageMs: 0,
      });
    }
  }
  return steps;
};

const buildSocialSteps = (): RoutineStep[] => {
  // Social routine: hang near the jukebox / fun area. Jukebox intent already
  // handles the "dancing" state when danceUntil is set upstream.
  const beats = Math.floor(randRange(2, 3.999)); // 2..3
  const steps: RoutineStep[] = [];
  for (let i = 0; i < beats; i += 1) {
    steps.push({
      intent: "jukebox",
      label: `social_beat_${i + 1}`,
      pauseMs: 0,
      minStageMs: randRange(5000, 9000),
    });
    if (i < beats - 1 && chance(0.5)) {
      steps.push({
        intent: "jukebox",
        label: "social_pause",
        pauseMs: randRange(1600, 3000),
        minStageMs: 0,
      });
    }
  }
  return steps;
};

const buildObserveSteps = (): RoutineStep[] => {
  // Short "wander and look around" filler. Only roam steps.
  const hops = Math.floor(randRange(2, 3.999)); // 2..3
  const steps: RoutineStep[] = [];
  for (let i = 0; i < hops; i += 1) {
    steps.push({
      intent: "roam",
      label: `observe_hop_${i + 1}`,
      pauseMs: 0,
      minStageMs: randRange(2400, 4500),
    });
    if (i < hops - 1 && chance(0.4)) {
      steps.push({
        intent: "roam",
        label: "observe_pause",
        pauseMs: randRange(1200, 2400),
        minStageMs: 0,
      });
    }
  }
  return steps;
};

const buildDeskSteps = (): RoutineStep[] => {
  // Desk focus: a long committed session at the assigned desk. We repeat
  // the desk intent so the agent naturally re-seats if bumped, but the desk
  // reservation logic keeps them on the same seat.
  const blocks = Math.floor(randRange(2, 4.499)); // 2..4
  const steps: RoutineStep[] = [];
  for (let i = 0; i < blocks; i += 1) {
    steps.push({
      intent: "desk",
      label: `desk_block_${i + 1}`,
      pauseMs: 0,
      minStageMs: randRange(18000, 28000),
    });
  }
  return steps;
};

const buildSmsBoothSteps = (): RoutineStep[] => {
  // Autonomous SMS booth: shorter than forced version. Step in, type, step
  // out. Used rarely.
  return [
    {
      intent: "sms_booth",
      label: "sms_session",
      pauseMs: 0,
      minStageMs: randRange(10000, 16000),
    },
  ];
};

const buildPhoneBoothSteps = (): RoutineStep[] => {
  return [
    {
      intent: "phone_booth",
      label: "phone_session",
      pauseMs: 0,
      minStageMs: randRange(10000, 16000),
    },
  ];
};

/* ------------------------------------------------------------------ */
/* Routine configs                                                     */
/* ------------------------------------------------------------------ */

const ROUTINE_CONFIGS: Record<RoutineContext, RoutineConfig> = {
  gym: {
    weight: 0.55,
    cooldownMs: [150_000, 210_000],
    buildSteps: () => buildGymSteps(),
  },
  qa_lab: {
    weight: 0.45,
    cooldownMs: [130_000, 180_000],
    buildSteps: () => buildQaLabSteps(),
  },
  server_room: {
    weight: 0.35,
    cooldownMs: [170_000, 230_000],
    buildSteps: () => buildServerRoomSteps(),
  },
  lounge_rest: {
    weight: 1.1,
    cooldownMs: [90_000, 140_000],
    buildSteps: () => buildLoungeSteps(),
  },
  kitchen: {
    weight: 1.0,
    cooldownMs: [80_000, 130_000],
    buildSteps: () => buildKitchenSteps(),
  },
  social: {
    weight: 0.7,
    cooldownMs: [110_000, 160_000],
    buildSteps: () => buildSocialSteps(),
  },
  observe: {
    weight: 1.2,
    cooldownMs: [25_000, 55_000],
    buildSteps: () => buildObserveSteps(),
  },
  desk_focus: {
    weight: 0.9,
    cooldownMs: [60_000, 100_000],
    buildSteps: () => buildDeskSteps(),
  },
  sms_booth: {
    weight: 0.18,
    cooldownMs: [200_000, 280_000],
    buildSteps: () => buildSmsBoothSteps(),
  },
  phone_booth: {
    weight: 0.18,
    cooldownMs: [200_000, 280_000],
    buildSteps: () => buildPhoneBoothSteps(),
  },
};

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

// Which contexts require scene-side resources to be present in order to
// even be considered during selection.
export type RoutineAvailability = {
  hasGym: boolean;
  hasQaLab: boolean;
  hasServerRoom: boolean;
  hasLounge: boolean;
  hasKitchen: boolean;
  hasJukebox: boolean;
  hasDesks: boolean;
  hasSmsBooth: boolean;
  hasPhoneBooth: boolean;
  // Remote agents live in a separate zone and should only observe.
  isRemote: boolean;
};

const isContextAvailable = (
  context: RoutineContext,
  availability: RoutineAvailability,
): boolean => {
  if (availability.isRemote) return context === "observe";
  switch (context) {
    case "gym":
      return availability.hasGym;
    case "qa_lab":
      return availability.hasQaLab;
    case "server_room":
      return availability.hasServerRoom;
    case "lounge_rest":
      return availability.hasLounge;
    case "kitchen":
      return availability.hasKitchen;
    case "social":
      return availability.hasJukebox;
    case "observe":
      return true;
    case "desk_focus":
      return availability.hasDesks;
    case "sms_booth":
      return availability.hasSmsBooth;
    case "phone_booth":
      return availability.hasPhoneBooth;
    default:
      return false;
  }
};

/* ------------------------------------------------------------------ */
/* Picking a routine                                                   */
/* ------------------------------------------------------------------ */

export type PickRoutineInput = {
  now: number;
  cooldowns: RoutineCooldownMap;
  recentContexts: RoutineContext[]; // last few contexts, most recent first
  availability: RoutineAvailability;
};

/**
 * Select a new routine context using weighted random with cooldown + recency
 * penalties. Returns `null` only if nothing is available (caller should then
 * fall back to a safe roam/observe path).
 */
export const pickRoutineContext = (
  input: PickRoutineInput,
): RoutineContext | null => {
  const entries: { context: RoutineContext; score: number }[] = [];
  for (const ctx of Object.keys(ROUTINE_CONFIGS) as RoutineContext[]) {
    if (!isContextAvailable(ctx, input.availability)) continue;
    const config = ROUTINE_CONFIGS[ctx];
    const until = input.cooldowns[ctx] ?? 0;
    if (until > input.now) continue; // still cooling down
    let score = config.weight;
    // Recency penalty: if this was one of the last routines, drop weight.
    const recentPosition = input.recentContexts.indexOf(ctx);
    if (recentPosition === 0) score *= 0.25;
    else if (recentPosition === 1) score *= 0.55;
    else if (recentPosition === 2) score *= 0.8;
    // Small jitter so equally-weighted contexts don't lock in.
    score *= 0.9 + Math.random() * 0.2;
    if (score > 0) entries.push({ context: ctx, score });
  }

  if (entries.length === 0) {
    // Fallback: ignore cooldowns, use raw weights (unless remote).
    if (input.availability.isRemote) return "observe";
    const relaxed: { context: RoutineContext; score: number }[] = [];
    for (const ctx of Object.keys(ROUTINE_CONFIGS) as RoutineContext[]) {
      if (!isContextAvailable(ctx, input.availability)) continue;
      relaxed.push({ context: ctx, score: ROUTINE_CONFIGS[ctx].weight });
    }
    if (relaxed.length === 0) return null;
    return weightedPick(relaxed)?.context ?? null;
  }
  return weightedPick(entries)?.context ?? null;
};

const weightedPick = <T extends { score: number }>(entries: T[]): T | null => {
  const total = entries.reduce((sum, e) => sum + Math.max(0, e.score), 0);
  if (total <= 0) return null;
  let cursor = Math.random() * total;
  for (const entry of entries) {
    cursor -= Math.max(0, entry.score);
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1] ?? null;
};

/**
 * Build a concrete AgentRoutine instance for the given context.
 */
export const instantiateRoutine = (
  context: RoutineContext,
  now: number,
): AgentRoutine => {
  const config = ROUTINE_CONFIGS[context];
  const steps = config.buildSteps(now);
  // Rough total duration estimate (min stages + pauses). Treats unknown as 4s.
  const estimated = steps.reduce((sum, step) => {
    if (step.pauseMs > 0) return sum + step.pauseMs;
    return sum + Math.max(step.minStageMs, 4000);
  }, 0);
  return {
    context,
    steps,
    index: 0,
    startedAt: now,
    plannedEndsAt: now + estimated,
  };
};

/**
 * Compute the cooldown-until timestamp to apply once a routine finishes.
 */
export const cooldownExpiryFor = (
  context: RoutineContext,
  now: number,
): number => {
  const [min, max] = ROUTINE_CONFIGS[context].cooldownMs;
  return now + randRange(min, max);
};

/**
 * Push a context onto the recent-contexts list (most recent first, capped).
 */
export const pushRecentContext = (
  list: RoutineContext[],
  context: RoutineContext,
  cap = 4,
): RoutineContext[] => {
  const next = [context, ...list.filter((c) => c !== context)];
  return next.slice(0, cap);
};

/**
 * Return the routine step currently being executed.
 */
export const currentStep = (routine: AgentRoutine): RoutineStep | null =>
  routine.steps[routine.index] ?? null;

/**
 * Advance the routine index; caller should compare against steps.length to
 * detect completion.
 */
export const advanceRoutine = (routine: AgentRoutine): AgentRoutine => ({
  ...routine,
  index: routine.index + 1,
});

/**
 * Whether the routine has run through all its steps.
 */
export const isRoutineComplete = (routine: AgentRoutine): boolean =>
  routine.index >= routine.steps.length;
