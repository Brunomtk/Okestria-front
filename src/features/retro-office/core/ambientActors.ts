// v106 — builders that turn `OfficeAmbientCue`s into JanitorActor[]
// instances. We piggyback on the JanitorActor render pipeline because
// it already routes a non-agent character along an entry → stops →
// exit path. Each ambient kind picks its own colour palette, tool
// model, count, and duration so they read distinctly on the floor.

import {
  JANITOR_ENTRY_POINTS,
  JANITOR_EXIT_POINTS,
  ROAM_POINTS,
} from "@/features/retro-office/core/navigation";
import type { FacingPoint, JanitorActor } from "@/features/retro-office/core/types";
import {
  isLeadScoutCue,
  isMailRunnerCue,
  isSquadHuddleCue,
  type OfficeAmbientCue,
} from "@/lib/office/ambientCues";

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const fallbackStops = (
  stops: FacingPoint[],
  desired: number,
): FacingPoint[] => {
  const pool =
    stops.length > 0
      ? stops
      : ROAM_POINTS.map((point, index) => ({
          ...point,
          facing: index % 2 === 0 ? Math.PI / 2 : -Math.PI / 2,
        }));
  const safeCount = Math.max(2, Math.min(pool.length, desired));
  return Array.from({ length: safeCount }, (_, i) => pool[i % pool.length]!);
};

// ── lead scout ───────────────────────────────────────────────────────────
//
// Two characters wearing scout colours (cyan / amber) walk a generous
// loop around the floor for ~45 seconds. The "tool" stays as broom
// for now — the colour is what differentiates them visually — but the
// id pattern (`scout:…`) lets the renderer override later.
const SCOUT_COLOR_PRIMARY = "#22d3ee";
const SCOUT_COLOR_SECONDARY = "#f59e0b";
const SCOUT_DURATION_MS = 45_000;
const SCOUT_COUNT = 2;

// ── mail runner ──────────────────────────────────────────────────────────
//
// One fast walker with a green palette, short duration. Reads as
// "courier dashing through the office".
const MAIL_RUNNER_COLOR = "#22c55e";
const MAIL_RUNNER_DURATION_MS = 25_000;
const MAIL_RUNNER_PAUSE_MS = 1_500;

// ── squad huddle ─────────────────────────────────────────────────────────
//
// Up to four characters in violet that gather at adjacent stops then
// exit. Reads as "the squad is huddling".
const SQUAD_HUDDLE_COLOR = "#a78bfa";
const SQUAD_HUDDLE_DURATION_MS = 60_000;
const SQUAD_HUDDLE_COUNT = 4;

const buildLeadScoutActors = (
  cue: Extract<OfficeAmbientCue, { kind: "lead-scout" }>,
  stops: FacingPoint[],
): JanitorActor[] => {
  const seed = hashString(cue.id);
  const desiredStops = fallbackStops(stops, 5);
  return Array.from({ length: SCOUT_COUNT }, (_, index) => {
    const entry = JANITOR_ENTRY_POINTS[index % JANITOR_ENTRY_POINTS.length];
    const exit = JANITOR_EXIT_POINTS[index % JANITOR_EXIT_POINTS.length];
    const offset = (seed + index * 3) % desiredStops.length;
    const route = Array.from({ length: 5 }, (_, i) => desiredStops[(offset + i) % desiredStops.length]!);
    return {
      id: `scout:${cue.id}:${index}`,
      name: cue.label ?? "Scout",
      role: "janitor",
      status: "working",
      color: index % 2 === 0 ? SCOUT_COLOR_PRIMARY : SCOUT_COLOR_SECONDARY,
      item: "cleaning",
      janitorTool: "broom",
      janitorRoute: [entry, ...route, exit],
      janitorPauseMs: 2_500 + index * 600,
      janitorDespawnAt: cue.ts + SCOUT_DURATION_MS,
    };
  });
};

const buildMailRunnerActors = (
  cue: Extract<OfficeAmbientCue, { kind: "mail-runner" }>,
  stops: FacingPoint[],
): JanitorActor[] => {
  const seed = hashString(cue.id);
  const desiredStops = fallbackStops(stops, 3);
  const offset = seed % desiredStops.length;
  const route = Array.from({ length: 3 }, (_, i) => desiredStops[(offset + i) % desiredStops.length]!);
  const entry = JANITOR_ENTRY_POINTS[seed % JANITOR_ENTRY_POINTS.length];
  const exit = JANITOR_EXIT_POINTS[(seed + 1) % JANITOR_EXIT_POINTS.length];
  return [
    {
      id: `mail-runner:${cue.id}:0`,
      name: cue.label ?? "Mail runner",
      role: "janitor",
      status: "working",
      color: MAIL_RUNNER_COLOR,
      item: "cleaning",
      janitorTool: "vacuum", // visually different from the broom-style scout
      janitorRoute: [entry, ...route, exit],
      janitorPauseMs: MAIL_RUNNER_PAUSE_MS,
      janitorDespawnAt: cue.ts + MAIL_RUNNER_DURATION_MS,
    },
  ];
};

const buildSquadHuddleActors = (
  cue: Extract<OfficeAmbientCue, { kind: "squad-huddle" }>,
  stops: FacingPoint[],
): JanitorActor[] => {
  const seed = hashString(cue.id);
  const memberCount = Math.max(
    2,
    Math.min(SQUAD_HUDDLE_COUNT, cue.agentSlugs?.length ?? SQUAD_HUDDLE_COUNT),
  );
  const desiredStops = fallbackStops(stops, memberCount + 1);
  // Pick a single "huddle anchor" (where everyone congregates) and
  // surround it with neighboring stops so the actors visually clump.
  const anchorIndex = seed % desiredStops.length;
  const huddleStops = Array.from({ length: memberCount }, (_, i) => {
    const stop = desiredStops[(anchorIndex + i) % desiredStops.length]!;
    return { ...stop };
  });
  return Array.from({ length: memberCount }, (_, index) => {
    const entry = JANITOR_ENTRY_POINTS[index % JANITOR_ENTRY_POINTS.length];
    const exit = JANITOR_EXIT_POINTS[index % JANITOR_EXIT_POINTS.length];
    return {
      id: `squad-huddle:${cue.id}:${index}`,
      name: cue.label ?? cue.squadName,
      role: "janitor",
      status: "working",
      color: SQUAD_HUDDLE_COLOR,
      item: "cleaning",
      janitorTool: "floor_scrubber",
      janitorRoute: [entry, huddleStops[index % huddleStops.length]!, exit],
      janitorPauseMs: 6_000 + index * 400, // longer pause = "in conversation"
      janitorDespawnAt: cue.ts + SQUAD_HUDDLE_DURATION_MS,
    };
  });
};

/** Single entrypoint — fans the cue out to the right builder. */
export const buildAmbientActorsForCue = (
  cue: OfficeAmbientCue,
  stops: FacingPoint[],
): JanitorActor[] => {
  if (isLeadScoutCue(cue)) return buildLeadScoutActors(cue, stops);
  if (isMailRunnerCue(cue)) return buildMailRunnerActors(cue, stops);
  if (isSquadHuddleCue(cue)) return buildSquadHuddleActors(cue, stops);
  return [];
};
