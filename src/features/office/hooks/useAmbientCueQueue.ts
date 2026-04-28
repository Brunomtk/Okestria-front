import { useCallback, useMemo, useState } from "react";

import {
  AMBIENT_CUE_QUEUE_LIMIT,
  type OfficeAmbientCue,
  type OfficeLeadScoutCue,
  type OfficeMailRunnerCue,
  type OfficeSquadHuddleCue,
} from "@/lib/office/ambientCues";

/**
 * v106 — Tiny FIFO queue of `OfficeAmbientCue`s that the office floor
 * consumes. Push helpers per-kind keep the call sites tidy:
 *
 *   const ambient = useAmbientCueQueue();
 *   await runLeadGenerationJob({ … });
 *   ambient.pushLeadScout({ jobId, targetLeadCount: 50 });
 *
 *   await sendEmailBatch({ … });
 *   ambient.pushMailRunner({ batchId, emailsToSend: 32 });
 *
 *   await dispatchSquadTask(taskId, …);
 *   ambient.pushSquadHuddle({ squadId, squadName, agentSlugs });
 *
 * The hook returns the cue array (read-only) plus the push helpers.
 * The actor builders in `core/ambientActors.ts` turn each cue into the
 * floor characters; the JanitorActor render path picks them up.
 *
 * Cue ids are auto-generated when not supplied. Old cues are pruned
 * after 90 s so the queue stays small.
 */
export type UseAmbientCueQueue = {
  cues: OfficeAmbientCue[];
  pushLeadScout: (
    params: Omit<OfficeLeadScoutCue, "id" | "ts" | "kind"> & { id?: string; ts?: number },
  ) => OfficeLeadScoutCue;
  pushMailRunner: (
    params: Omit<OfficeMailRunnerCue, "id" | "ts" | "kind"> & { id?: string; ts?: number },
  ) => OfficeMailRunnerCue;
  pushSquadHuddle: (
    params: Omit<OfficeSquadHuddleCue, "id" | "ts" | "kind"> & { id?: string; ts?: number },
  ) => OfficeSquadHuddleCue;
  clear: () => void;
};

const PRUNE_AFTER_MS = 90_000;

const nextCueId = (kind: OfficeAmbientCue["kind"]) =>
  `${kind}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

const truncateAndPrune = (
  next: OfficeAmbientCue[],
  now: number,
): OfficeAmbientCue[] => {
  const fresh = next.filter((c) => now - c.ts < PRUNE_AFTER_MS);
  if (fresh.length <= AMBIENT_CUE_QUEUE_LIMIT) return fresh;
  return fresh.slice(fresh.length - AMBIENT_CUE_QUEUE_LIMIT);
};

export function useAmbientCueQueue(): UseAmbientCueQueue {
  const [cues, setCues] = useState<OfficeAmbientCue[]>([]);

  const pushCue = useCallback(<T extends OfficeAmbientCue>(cue: T): T => {
    setCues((prev) => truncateAndPrune([...prev, cue], Date.now()));
    return cue;
  }, []);

  const pushLeadScout = useCallback<UseAmbientCueQueue["pushLeadScout"]>(
    (params) => {
      const cue: OfficeLeadScoutCue = {
        kind: "lead-scout",
        id: params.id ?? nextCueId("lead-scout"),
        ts: params.ts ?? Date.now(),
        label: params.label ?? null,
        jobId: params.jobId ?? null,
        targetLeadCount: params.targetLeadCount ?? null,
      };
      return pushCue(cue);
    },
    [pushCue],
  );

  const pushMailRunner = useCallback<UseAmbientCueQueue["pushMailRunner"]>(
    (params) => {
      const cue: OfficeMailRunnerCue = {
        kind: "mail-runner",
        id: params.id ?? nextCueId("mail-runner"),
        ts: params.ts ?? Date.now(),
        label: params.label ?? null,
        batchId: params.batchId ?? null,
        emailsToSend: params.emailsToSend ?? null,
      };
      return pushCue(cue);
    },
    [pushCue],
  );

  const pushSquadHuddle = useCallback<UseAmbientCueQueue["pushSquadHuddle"]>(
    (params) => {
      const cue: OfficeSquadHuddleCue = {
        kind: "squad-huddle",
        id: params.id ?? nextCueId("squad-huddle"),
        ts: params.ts ?? Date.now(),
        label: params.label ?? null,
        squadId: params.squadId,
        squadName: params.squadName,
        agentSlugs: params.agentSlugs ?? [],
      };
      return pushCue(cue);
    },
    [pushCue],
  );

  const clear = useCallback(() => setCues([]), []);

  return useMemo(
    () => ({ cues, pushLeadScout, pushMailRunner, pushSquadHuddle, clear }),
    [cues, pushLeadScout, pushMailRunner, pushSquadHuddle, clear],
  );
}
