/**
 * v187 — Single source of truth for "is this agent currently working".
 *
 * Before this module the answer was scattered across the codebase:
 *
 *   • OfficeScreen.mapAgentToOffice          → status==='running' || Boolean(runId)
 *   • OfficeScreen line 1501 (loadAgents)    → status==='running' || Boolean(runId)
 *   • OfficeScreen line 3632 (drift watcher) → patch.status==='running' || Boolean(patch.runId)
 *   • chatRosterEntries                       → agent.status === 'running'
 *   • InboxPanel                              → agent.status === 'running'
 *   • plus the optimistic "running" flag set on Send before OpenClaw confirms anything
 *
 * The OR-with-runId fallback was the source of the "agent stays green
 * forever" reports — runId can outlive the run while the back-side
 * workflow finishes clearing status, so any UI that ORed with runId
 * showed false positives.
 *
 * This module replaces the ad-hoc checks with `isAgentActuallyWorking`
 * and a small watchdog helper. Strict rule:
 *
 *   An agent is "working" iff
 *     status === "running"
 *   AND
 *     (
 *       has a live thinking trace
 *       OR has a live streamed assistant text
 *       OR has fresh activity within WORKING_HEARTBEAT_MS
 *     )
 *
 * If a Send was issued less than HEARTBEAT_MS ago we still trust the
 * optimistic flag (Send just happened, OpenClaw is about to start).
 * After the heartbeat window with no thinking / streaming / activity
 * proof, the agent is treated as NOT working — it'll either receive a
 * thinking event soon (and be promoted again) or it'll be demoted by
 * the watchdog.
 *
 * The watchdog (live in OfficeScreen) sweeps the agent list every
 * SWEEP_MS, finds agents whose status is "running" but
 * isAgentActuallyWorking is false AND lastActivity is older than
 * STALE_RUN_AFTER_MS, and dispatches a clean idle patch. The numbers
 * are conservative — better to undershoot demotes than to flap.
 */

import type { AgentState } from "@/features/agents/state/store";

/**
 * Window in which the optimistic "running" flag is trusted even
 * without a thinking trace. After the window the agent must show
 * proof of life from OpenClaw or the watchdog demotes it.
 */
export const WORKING_HEARTBEAT_MS = 60_000;

/** How long before a stale "running" agent is auto-demoted. */
export const STALE_RUN_AFTER_MS = 4 * 60_000;

/** How often the watchdog sweeps. */
export const WATCHDOG_SWEEP_MS = 15_000;

const hasLiveThinkingTrace = (agent: Pick<AgentState, "thinkingTrace">): boolean =>
  Boolean(agent.thinkingTrace && agent.thinkingTrace.trim().length > 0);

const hasLiveAssistantStream = (agent: Pick<AgentState, "streamText">): boolean =>
  Boolean(agent.streamText && agent.streamText.trim().length > 0);

const lastActivityMs = (
  agent: Pick<
    AgentState,
    "lastActivityAt" | "runStartedAt" | "lastAssistantMessageAt"
  >,
): number => {
  return Math.max(
    agent.lastActivityAt ?? 0,
    agent.runStartedAt ?? 0,
    agent.lastAssistantMessageAt ?? 0,
  );
};

/**
 * SSOT — call this anywhere the UI needs "is this agent working
 * RIGHT NOW". Pass `now = Date.now()` so callers can memoize on a
 * tick they own.
 */
export function isAgentActuallyWorking(
  agent: Pick<
    AgentState,
    | "status"
    | "thinkingTrace"
    | "streamText"
    | "lastActivityAt"
    | "runStartedAt"
    | "lastAssistantMessageAt"
  >,
  now: number = Date.now(),
): boolean {
  if (agent.status !== "running") return false;
  if (hasLiveThinkingTrace(agent)) return true;
  if (hasLiveAssistantStream(agent)) return true;
  const last = lastActivityMs(agent);
  if (last <= 0) return false;
  return now - last < WORKING_HEARTBEAT_MS;
}

/**
 * Return the agents whose status is "running" but actually look
 * stuck — no live trace, no live stream, last activity older than
 * STALE_RUN_AFTER_MS. The OfficeScreen watchdog dispatches an idle
 * patch for each one. Public so tests can reach it.
 */
export function getStaleRunningAgents(
  agents: ReadonlyArray<AgentState>,
  now: number = Date.now(),
): AgentState[] {
  const stale: AgentState[] = [];
  for (const agent of agents) {
    if (agent.status !== "running") continue;
    if (hasLiveThinkingTrace(agent)) continue;
    if (hasLiveAssistantStream(agent)) continue;
    const last = lastActivityMs(agent);
    const age = last > 0 ? now - last : Infinity;
    if (age >= STALE_RUN_AFTER_MS) stale.push(agent);
  }
  return stale;
}

/**
 * Idle patch shape. The watchdog and the WS-reconnect handler both
 * dispatch this on stale agents.
 */
export const idlePatch = (): Partial<AgentState> => ({
  status: "idle",
  runId: null,
  runStartedAt: null,
  streamText: null,
  thinkingTrace: null,
});
