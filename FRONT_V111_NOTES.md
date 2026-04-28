# FRONT v111 — Squad edit / delete modal

Pairs with **back v62**.

## Why
Clicking a squad card in the company-overview grid (the `Squad
Comercial` chip with "5 MEMBERS") only routed to the Squad Ops modal.
There was no way to rename the squad or delete it from the office UI.
The user wanted a polished modal that lets them edit the squad
metadata AND wipe it (preserving the agents) without leaving the floor.

## What changed

### `src/features/office/components/SquadEditDeleteModal.tsx`  *(new)*
- Single component, two modes: **edit** and **confirm-delete**.
- Edit form covers name, description, emoji, and color (an 8-swatch
  palette so the operator can recolor the squad in one click).
- Delete flow does an async preview fetch first (`GET
  /api/Squads/delete/{id}/preview`) so the modal can show:
  - Tasks deleted (and their run history).
  - Executions deleted (and their step history).
  - Cron jobs deleted (and their run history) with names.
  - Members released — **agents are preserved**, surfaced in green.
  - Lead missions detached — surfaced in **amber** (kept on the
    company, only the squad attribution is lost).
- z-index is 170, one higher than Squad Ops (160), so it always
  floats above when both are open.

### `src/lib/squads/api.ts`
- `deleteCompanySquad` now returns the back v62 `DeleteSquadSummary`
  payload (with a tolerant fallback for older deploys that still
  answer with a bare `true` boolean).
- New `previewCompanySquadDelete({ squadId })` helper hitting the
  preview endpoint. 404 is returned as `null` so the caller can
  close the modal cleanly when another tab already deleted the
  squad.
- New `DeleteSquadSummary` type mirroring the back DTO.

### `src/features/retro-office/RetroOffice3D.tsx`
- Each squad card in the **Squads** tab of the company-overview grid
  gets a new pencil button on the top-right corner that opens the
  edit/delete modal. The big card body still routes to Squad Ops
  exactly as before, so the operator's primary "open this squad"
  gesture is unchanged.
- New optional prop `onSquadEditRequest?: (squadId: string) => void`.
- Imports `PencilLine` from lucide-react.

### `src/features/office/screens/OfficeScreen.tsx`
- New state `squadEditorSquadId` + handlers
  (`handleOpenSquadEditor`, `handleCloseSquadEditor`,
  `handleSaveSquadFromEditor`, `handleDeleteSquadFromEditor`).
- The save handler calls `updateCompanySquad` with the four
  metadata fields and then refreshes the squad list.
- The delete handler calls `deleteCompanySquad` and, if the Squad
  Ops modal happens to be open on the same squad, closes it before
  refreshing the list (otherwise Squad Ops would try to refetch a
  now-deleted row and 404).
- Wires `onSquadEditRequest` into `<RetroOffice3D>` and renders
  `<SquadEditDeleteModal>` next to `<SquadOpsModal>`.

## Compatibility
- Works against **back v61** (delete still returns whatever shape the
  old endpoint did; preview returns null and the modal shows the
  empty-state copy "no tasks / executions / cron jobs are tied to
  this squad").
- Works against **back v62+** with full preview data.

## Files touched
```
src/features/office/components/SquadEditDeleteModal.tsx   (new)
src/lib/squads/api.ts
src/features/retro-office/RetroOffice3D.tsx
src/features/office/screens/OfficeScreen.tsx
```

## Quick QA
1. Open the office floor and pop the **Company overview** roster
   (top toggle) → switch to the **Squads** tab.
2. Hover any squad card. A pencil button appears on the top-right.
3. Click the pencil → the edit modal opens.
   - Change the name + the color swatch + the emoji → click Save.
   - The squad card in the grid should re-render with the new color
     and emoji.
4. Re-open the editor → click **Delete squad**.
   - The modal flips to confirm mode and fetches the preview.
   - If the squad has tasks / cron jobs, they're listed in red. The
     **N members released — agents are kept** line is green; lead
     missions detached are amber.
5. Click **Confirm delete** → the squad disappears from the grid, the
   agents stay in the company roster.
6. If you had Squad Ops open on the same squad before deleting, it
   should close cleanly (no 404 toast).
