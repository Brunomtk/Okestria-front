# front v87 — Workflow polish + correct queued vs thinking states

Pairs with backend `ok_back_v47_chat_completions`.

## What was wrong on v86

The squad ops modal treated every non-terminal status (`pending`,
`queued`, `running`, `dispatching`, …) as "thinking", so on workflow
mode the operator saw all 5 agents pulsing "thinking…" even though only
the first one was actually dispatched. The leader status row also showed
"Synthesising every member's reply…" in workflow mode, where there is
no synthesis pass at all.

## What changed

- **`SquadOpsModal.tsx`** — `runIsThinking` now only returns true when
  the run is in an actually-running state (`running` /
  `dispatching` / `processing` / `in_progress`). New `runIsQueued`
  helper for the rest. The progress strip uses these two to render
  three distinct visuals:
  - **queued** — flat pill, no pulse, label `queued`
  - **thinking** — coloured pill with pulsing dot, label `thinking`
  - **done / failed** — coloured / red pill with `✓` / `✕`

  In workflow / sequential mode the strip prefixes each pill with its
  `1.`, `2.`, `3.` step number so the operator can read the cascade
  order at a glance.

- **Leader synthesis indicator + "Squad final answer" card** are now
  gated on `taskExecutionMode` being `leader` / `all` /
  `all_at_once`. They never render in workflow / manual / sequential
  modes.

- **Step count label** flips between "Members" (when there's a
  synthesis pass) and "Steps" (workflow mode), since in workflow the
  leader is also a regular step.

## Files

- `src/features/office/components/SquadOpsModal.tsx`

Polling cadence (`OfficeScreen.tsx`) is unchanged: 2.5s while any run
is live, 12s otherwise.

## Pairing matrix

| Backend                                  | Frontend                       |
| ---------------------------------------- | ------------------------------ |
| `ok_back_v47_chat_completions.zip`       | `front_v87_workflow_polish.zip` |
