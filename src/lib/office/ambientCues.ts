// v106 — Ambient cues that play in the retro office floor when long-
// running operations kick off. Each cue spawns a short-lived "extra"
// (lead scouts, mail runners, squad huddle) that walks a route and
// despawns. Same shape pattern as `OfficeCleaningCue`, just with a
// `kind` discriminator so a single render path can fan them out.

export type OfficeAmbientCueKind = "lead-scout" | "mail-runner" | "squad-huddle";

type BaseAmbientCue = {
  id: string;
  ts: number;
  /** Optional human label so the actor can pop a tooltip. */
  label?: string | null;
};

/** Played when a lead-generation job kicks off — two scouts walk the
 *  floor with magnifying-glass-style props. */
export type OfficeLeadScoutCue = BaseAmbientCue & {
  kind: "lead-scout";
  /** Optional id of the lead generation job — surfaced in the cue label. */
  jobId?: number | null;
  /** Optional target count, e.g. "scouting 50 leads". */
  targetLeadCount?: number | null;
};

/** Played when a batch of outbound emails fires — a mail runner walks
 *  fast through the office and exits. */
export type OfficeMailRunnerCue = BaseAmbientCue & {
  kind: "mail-runner";
  /** Optional batch id surfaced in the cue label. */
  batchId?: number | null;
  /** Optional total emails being sent. */
  emailsToSend?: number | null;
};

/** Played when a squad task is dispatched — every squad member walks
 *  to a meeting circle, huddles, then returns. */
export type OfficeSquadHuddleCue = BaseAmbientCue & {
  kind: "squad-huddle";
  /** Squad id (string from gateway). */
  squadId: string;
  /** Squad display name (for the popup label). */
  squadName: string;
  /** Optional list of agent slugs that will participate; empty = all. */
  agentSlugs?: string[];
};

export type OfficeAmbientCue =
  | OfficeLeadScoutCue
  | OfficeMailRunnerCue
  | OfficeSquadHuddleCue;

export const isLeadScoutCue = (cue: OfficeAmbientCue): cue is OfficeLeadScoutCue =>
  cue.kind === "lead-scout";
export const isMailRunnerCue = (cue: OfficeAmbientCue): cue is OfficeMailRunnerCue =>
  cue.kind === "mail-runner";
export const isSquadHuddleCue = (cue: OfficeAmbientCue): cue is OfficeSquadHuddleCue =>
  cue.kind === "squad-huddle";

/** Cap so a misfire doesn't flood the floor with dozens of pending
 *  cues. The spawn loop dedupes by `id` and the FIFO truncation here
 *  keeps the queue length sane. */
export const AMBIENT_CUE_QUEUE_LIMIT = 16;
