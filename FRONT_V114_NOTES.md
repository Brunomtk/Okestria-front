# FRONT v114 — graceful task delete + workflow final answer

Pairs with **back v65**. Two fixes the operator hit head-on:

## 1. Task delete error showing the JSON body raw

The operator deleted a task that had already been deleted (stale tab,
or just a re-click). The back returned 404 with a JSON body
`{taskId, taskExists: false, ...}`, the front threw an Error whose
message WAS the JSON body, and the SquadOps error pane rendered the
whole envelope as a raw error.

Fix in `src/lib/squads/api.ts`:

- New `looksLikeDeleteAlreadyGoneBody(text)` helper — JSON.parses the
  error message and returns true when the parsed object has
  `taskExists === false`.
- New `buildAlreadyGoneResult(taskId, text)` helper — converts that
  envelope into a normal `SquadTaskDeleteResult` with
  `taskExists: false, deleted: false`.
- Both delete-fallback paths (primary + fallback A) check the helpers
  before treating the error as fatal. Anything else still propagates.

Fix in `src/features/office/screens/OfficeScreen.tsx`
(`handleDeleteSquadTask`):

- Three outcome branches now:
  1. `result.taskExists === false` → already gone on the server.
     Silent. Local state still cleans up so the operator's tab
     consolidates with reality.
  2. `runsRemoved > 0 || sessionsCleaned > 0` → real cleanup
     happened, show the 6s success toast (existing behavior).
  3. Else → silent (no misleading "0 sessions cleaned" toast).

This works against both back v63/v64 (which returns 404 with the
envelope) and back v65 (which returns 200 OK with the same envelope —
the front is now agnostic to the HTTP status).

## 2. Workflow mode showing the wrong final answer

Squad task modes have different "where's the final answer" semantics:

| Mode     | Steps strip   | Final answer card |
|----------|---------------|-------------------|
| manual   | single agent  | (none — single bubble in chat) |
| leader   | members only  | leader's synthesis |
| all      | members only  | leader's synthesis |
| workflow | all in order  | leader's step (last in chain) |

Before this release, the `isLeaderSynthesisMode` flag was hard-coded
to `leader || all` and excluded `workflow`. The "Squad final answer"
section never rendered for workflow tasks — even though back v65 now
correctly pins `task.finalResponse` to the leader's run in workflow
too.

### `src/features/office/components/SquadOpsModal.tsx`
- Split the old flag into three:
  - `isParallelSynthesisMode` (= old `isLeaderSynthesisMode`) — for
    leader / all modes. Steps strip shows MEMBERS only, leader is
    pulled out into the final-answer card.
  - `isWorkflowMode` — for workflow / sequential. Steps strip shows
    EVERY step in order so the operator sees the cascade. The leader
    is also pinned at the bottom as the final answer.
  - `hasFinalAnswerHighlight = isParallelSynthesisMode || isWorkflowMode`
    — used by the final-answer card.
- `leaderRun` now resolves for workflow too: prefer `role === "leader"`,
  fall back to the last run in the chain.
- `memberRuns` for workflow returns ALL runs (no leader filtering),
  so the steps strip stays chronological. For leader/all modes the
  filter is unchanged.
- "Squad final answer" card now reads:
  - `Workflow · 4 steps` (in workflow mode)
  - `3 members synthesised` (in leader/all mode)

The "Leader · X — Final synthesis delivered" pill above the steps
strip still only fires for parallel modes (in workflow it would be
redundant since the leader is right there in the strip as the last
step).

## Compatibility
- Pairs with **back v65** but works against v63/v64 too (the JSON-body
  detection fixes the visible bug regardless of HTTP status).
- The mode-rendering changes are purely presentation; existing tasks
  re-render correctly.

## Files touched
```
src/lib/squads/api.ts
src/features/office/screens/OfficeScreen.tsx
src/features/office/components/SquadOpsModal.tsx
```

## Quick QA
1. Delete a squad task in two tabs simultaneously. The second tab
   should NOT show the JSON body as an error — task just disappears
   from the list.
2. Create a task in **workflow** mode with 3 members + 1 leader.
   Dispatch. Expect to see:
   - Numbered steps `1. AgentA  2. AgentB  3. AgentC  4. Leader`
     in the strip.
   - At the bottom, a "Squad final answer · Leader" card with the
     leader's reply text.
3. Create a task in **leader** mode. Expect:
   - Steps strip lists ONLY the members.
   - Bottom card: "Squad final answer · Leader" with the synthesis.
4. Create a task in **manual** mode. Expect:
   - Steps strip shows the single agent.
   - No "Squad final answer" card (not needed — single bubble).
