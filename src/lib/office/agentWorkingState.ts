/**
 * v126 — UNIFIED AGENT WORKING STATE
 *
 * Single source of truth for the question:
 *   "Is this agent currently doing work, RIGHT NOW?"
 *
 * Used by the office 3D scene to drive the green status dot + green
 * pulse ring + green pose at the desk. Before v126 the answer was
 * computed in three places (chat-driven runId in OfficeScreen,
 * `workingUntilByAgentId` latch in eventTriggers, an ad-hoc
 * `agent.status === "working"` check in agents.tsx) with subtly
 * different semantics — which is why the green wouldn't fire reliably
 * for cron / squad task work.
 *
 * v126 collapses all three into a single pure function that takes
 * every relevant signal and returns a `Set<agentId>`. The renderer
 * just asks the set "are you working?" and never has to think about
 * WHICH surface the work is coming from.
 *
 * Three signals fold in:
 *
 *   1. CHAT — the local agent state. If `agent.status === "running"`
 *      OR `agent.runId` is set, the agent has an in-flight chat turn.
 *
 *   2. WS LATCH — the `workingUntilByAgentId` map maintained by the
 *      gateway-WS event reducer. Any chat / agent / approval event
 *      that names a session key for this agent extends the latch by
 *      90 s (v123 value). This catches:
 *      - cron-fired runs (`agent:<slug>:cron-N`)
 *      - squad-execution steps (`hook:sqexec-...:agent:N:step:M`)
 *      - any other in-flight session that emits gateway events.
 *
 *   3. SQUAD STEPS — explicitly-cached SquadExecution rows whose
 *      steps are currently "running" or "queued". This covers the
 *      gap between dispatch and the first WS event landing (during
 *      which the latch hasn't fired yet but the step IS active).
 *      Also covers cases where the WS resolver couldn't match the
 *      session key to a local agent.
 *
 * The output Set is small (typically 0-4 agentIds), so the
 * renderer can call `set.has(agentId)` per-frame without any
 * perf concern.
 */

import type { AgentState } from "@/lib/agent-state/local";

export type SquadRunningStep = {
  agentId: string | number;
  status: string;
};

export type WorkingStateSources = {
  /** Local chat agents from agent registry. */
  chatAgents: ReadonlyArray<AgentState>;
  /** workingUntilByAgentId map from officeAnimationState. */
  workingLatchByAgentId: Readonly<Record<string, number>>;
  /**
   * Currently-running steps from any cached squad execution. Use the
   * agent's GATEWAY id (slug) when available so it matches what the
   * 3D scene keys agents by.
   */
  runningSquadSteps?: ReadonlyArray<SquadRunningStep>;
  /** Optional: extra agentIds the caller wants force-included as working
   *  (e.g. dispatched a chat 200 ms ago, before any state propagation). */
  forcedAgentIds?: ReadonlyArray<string>;
};

const TERMINAL_SQUAD_STEP_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
  "skipped",
  "pending",
]);

/**
 * Compute the unified working set.
 *
 * Pure function — no side effects, no React, no DOM. Safe to call
 * from a useMemo with the same dependency tuple the caller already
 * tracks for officeAgents.
 */
export const computeWorkingAgentIds = (
  sources: WorkingStateSources,
  nowMs: number,
): Set<string> => {
  const result = new Set<string>();

  // 1. Chat-driven activity: any agent currently flagged as running
  //    in the local registry.
  for (const agent of sources.chatAgents) {
    if (!agent || !agent.agentId) continue;
    if (agent.status === "running" || Boolean(agent.runId)) {
      result.add(agent.agentId);
    }
  }

  // 2. WS-driven latch: any agentId whose latch hasn't expired yet.
  //    The latch covers cron + squad surfaces because their gateway
  //    events also flow through the same eventTriggers reducer.
  for (const [agentId, until] of Object.entries(sources.workingLatchByAgentId)) {
    if (!agentId) continue;
    if (typeof until === "number" && until > nowMs) {
      result.add(agentId);
    }
  }

  // 3. Squad-step explicit override: any squad step that's running OR
  //    queued (queued covers the small dispatch window before the
  //    back transitions it to running). Skips terminal statuses.
  if (sources.runningSquadSteps) {
    for (const step of sources.runningSquadSteps) {
      if (!step) continue;
      const status = (step.status ?? "").toLowerCase().trim();
      if (TERMINAL_SQUAD_STEP_STATUSES.has(status)) continue;
      const agentId = String(step.agentId ?? "").trim();
      if (agentId) result.add(agentId);
    }
  }

  // 4. Caller-forced ids (e.g., chat just sent, optimistic green).
  if (sources.forcedAgentIds) {
    for (const id of sources.forcedAgentIds) {
      if (id) result.add(String(id));
    }
  }

  return result;
};

/**
 * Convenience: the pure helper above takes data structures, this one
 * is a thin wrapper that just answers `isWorking(agentId)` against an
 * already-computed set.
 */
export const makeIsWorking = (set: Set<string>) => (agentId: string | number | null | undefined): boolean => {
  if (agentId == null) return false;
  return set.has(String(agentId));
};
