# FRONT v110 — leads independent of agent

Pairs with **back v61**. The back made `LeadGenerationJob.AgentId`
nullable + switched the FK to `ON DELETE SET NULL`. This release teaches
the front to:

1. Launch lead missions **without** an agent.
2. Render company-scoped / detached missions cleanly (instead of showing
   a stale `Agent: 0` chip or hiding them entirely).
3. Surface the new `LeadJobsDetached` count in the agent-delete
   confirmation modal so the operator knows lead missions stay alive.

## What changed

### `src/lib/leads/lead-generation-api.ts`
- `LeadGenerationJob.agentId` → `number | null` (was `number`). Same
  semantics as back: `null` means company-scoped or detached.
- `LeadGenerationJobPayload.agentId` → `number | null | undefined`
  (was `number`, required). Pass `null`/`0`/`undefined` for
  company-scoped missions.
- `normalizeJob` preserves `null`. We previously coerced missing /
  null `agentId` to `0`, which made the mission card render
  `Agent #0` for every detached job and broke the new pill rendering.
- `createLeadGenerationJob` sends `agentId: 0` to the back when none
  is selected (back v61's `CreateJob` reads `> 0` as "bind to agent").
- `buildFallbackJob` mirrors the same nullability so the optimistic
  insert and the eventual server-confirmed row render the same chip.

### `src/lib/agents/backend-api.ts`
- `DeleteAgentSummary` adds `leadJobsDetached: number`.
- `normalizeDeleteSummary` reads the new field with a `0` default so
  the modal still works against older back versions that don't emit
  it yet.

### `src/features/agents/components/AgentDeleteConfirmModal.tsx`
- The "what will be wiped" list now also fires when only lead missions
  are affected (previously the empty-state copy hid the cascade entirely
  in that case).
- Added an **amber** line item (not red — the rows are kept):
  `N lead-generation missions will be detached, not deleted — missions
  stay on the company; only the "launched by" attribution is lost.`
- The empty-state copy now also names lead missions so the operator
  knows we checked.

### `src/features/office/components/panels/LeadOpsPanel.tsx`
- `handleCreateJob` no longer requires an agent. The validator only
  enforces `companyId` + a non-empty query.
- Mission cards (the grid in the right pane) get a small chip below
  the title:
  - **Cyan / UserRound icon** when the mission is bound to an agent —
    shows the agent name (or `Agent #<id>` if the name is missing).
  - **Neutral / Target icon** with `Company-scoped` when there is no
    agent on the row.
- The mission detail meta line ("Agent: …") shows `Company-scoped`
  instead of `Agent: 0` for detached / agent-less missions.
- The "New Mission" modal's Agent dropdown:
  - Defaults to **No agent (company-scoped)** as the first option,
    available even when the company has zero agents.
  - Label changes from `Agent` to `Agent · optional`.
  - New helper text under the picker explains the rule:
    *"Pick an agent to stamp this mission with attribution. If left
    unset, the mission still runs and stays attached to the company
    even if every agent is later deleted."*

## Compatibility
- Works against **back v60** (lead-jobs-detached just renders as 0;
  agent-bound missions behave as before).
- Works against **back v61+** (full company-scoped flow active).

## Files touched
```
src/lib/leads/lead-generation-api.ts
src/lib/agents/backend-api.ts
src/features/agents/components/AgentDeleteConfirmModal.tsx
src/features/office/components/panels/LeadOpsPanel.tsx
```

## Quick QA
1. Open Lead Ops → New Mission.
2. With the Agent select on **No agent (company-scoped)**, fill a
   query and click Create. The mission should appear with the neutral
   "Company-scoped" chip and the Apify run should still kick off on
   the back.
3. Pick an existing agent and create a second mission — that one
   should show the cyan chip with the agent name.
4. Delete the agent that launched mission #2 from the office floor.
5. The delete confirmation modal should now include an amber line:
   "1 lead-generation mission will be detached, not deleted…".
6. After the delete completes, both missions should still appear in
   the Lead Ops mission list. Mission #2's chip should flip to
   "Company-scoped".
