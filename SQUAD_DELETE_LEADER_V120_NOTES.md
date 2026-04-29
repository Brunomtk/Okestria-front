# Front v120 — SQUAD_DELETE_LEADER

Front-only delivery. **No code changes from v119.** Re-shipped so the
operator has a single zip aligned with back v75.

## Why no front changes

The two issues raised against v119:

1. **Delete still doesn't work** — root cause is in the back's
   `DeleteExecution` not actually committing the cascade in some edge
   cases. The front's `deleteSquadTask` (v119) is correct: it hits
   `/api/SquadExecutions/{id}` first, then refetches the list via
   `loadSquadOpsTasks(squadId, null)`. With back v75's bulletproof
   cascade + verify-after-save, the row genuinely disappears and the
   refetch returns the up-to-date list.

2. **Leader should always run last in workflow mode** — pure back
   behaviour change in `SquadExecutionService`. The front already
   renders steps by `StepOrder` regardless of execution sequence, and
   no leader-aware UI element changes here. The back v75 reorders
   when each step fires; the front shows the result automatically.

## Verification (after deploying back v75 too)

- Open a stuck squad execution → click delete → row vanishes →
  hard-refresh the modal → row stays gone.
- Run a sequential squad task with a leader at any `StepOrder`:
  members fire in their `StepOrder`, leader fires LAST and its output
  references the member outputs (synthesis prompt).

If delete still appears to fail, check `journalctl -u pepe -f` for
`DeleteExecution {Id}: row STILL EXISTS after SaveChanges` — that line
is the new tell that an FK / model issue is still blocking the cascade.

## Cumulative

v120 includes everything from v60–v119.
