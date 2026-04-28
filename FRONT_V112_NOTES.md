# FRONT v112 — surface task-delete OpenClaw sweep

Pairs with **back v63**. Two small but important fixes:

## What changed

### `src/lib/squads/api.ts` — `deleteSquadTask` rewrite

Now hits the new back-v63 endpoint as the primary path:

```
DELETE /api/Squads/tasks/delete/{taskId}
```

The back returns a `SquadTaskDeleteResultDTO` with `runsRemoved`,
`sessionsAttempted`, `sessionsCleaned`, and the swept session keys.
The function returns this shape so the UI can render an honest toast.

Two layered fallbacks for older deployments:

- **A** (back ≤ v62): `DELETE /api/SquadExecutions/{id}` — local-only,
  no gateway sweep.
- **B** (oldest): `POST /api/SquadExecutions/{id}/cancel` — task
  flips to "cancelled" so it stops draining hooks/tokens.

Each fallback returns the same shape with zeros for the gateway
counters so the caller doesn't have to special-case anything.

### `src/features/office/screens/OfficeScreen.tsx` — toast on delete

`handleDeleteSquadTask` now reads the `runsRemoved` +
`sessionsCleaned` counts and surfaces them as a transient success
line:

```
Task deleted · 2 runs wiped · 4 OpenClaw sessions cleaned
```

The message lands in `squadOpsError` (the existing error/info slot in
the modal) so we didn't have to ship a new toast component. It
auto-clears after 6 seconds, only if the operator hasn't moved on or
hit another error in the meantime. When the back returns zeros
(older deploy), we suppress the toast entirely instead of saying "0
sessions cleaned" which would be misleading.

## Why
- The user reported sessions sticking around on the OpenClaw VPS
  forever after deleting a task. Back v63 fixes that by sweeping
  every `agent:{slug}:squad-task-{taskId}-run-{runId}` session it
  ever opened. The front now confirms it happened, so the operator
  doesn't have to SSH into the VPS to verify.

## Compatibility
- Works against back **v63+** (full toast).
- Works against back **v60-v62** (silent local delete via fallback A).
- Works against very old back (silent cancel via fallback B).

## Files touched
```
src/lib/squads/api.ts
src/features/office/screens/OfficeScreen.tsx
```

## Quick QA
1. Open a squad task that ran at least once (`runs[].length > 0`).
2. Click delete.
3. The task disappears from the list AND the success line at the top
   of the modal reads "Task deleted · N runs wiped · N OpenClaw
   sessions cleaned" for ~6s.
4. SSH the OpenClaw VPS → `journalctl -u openclaw` should show the
   `DELETE /sessions/agent:{slug}:squad-task-{taskId}-run-{runId}`
   200/204 entries that match the count in the toast.
