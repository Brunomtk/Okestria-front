# FRONT v116 — email available everywhere

Pairs with **back v69** + **bridge v3**. v115 already had the modal
that wires the user's mailbox; v116 just updates the copy + adds three
"Available in" pills so the operator knows BEFORE saving that the
mailbox lights up across all three dispatch surfaces, not just squad
tasks.

## What changed

### `src/features/office/components/UserEmailConfigModal.tsx`
- Three emerald pills under the modal subtitle: **Squad tasks · Cron
  jobs · Chat**. Each marked with a check icon. Same styling as the
  status pills used elsewhere in the office UI.
- Success message after save now reads:
  *"Email account saved. Every agent in your company can now use this
  mailbox in squad tasks, cron jobs and chat."*

### `src/features/office/components/CompanyProfileModal.tsx`
- The "Configure email" cyan card on the Profile tab now mentions all
  three surfaces in bold: *"… in **squad tasks**, **cron jobs** and
  **chat**."*

## Why
v115 only said "agents can use this in squad tasks" because at that
release only squad dispatch had the EMAIL ACCESS injection. Back v69
extends it to cron + chat, so the front needs to surface that or
operators won't know they can rely on it from any dispatch path.

## Compatibility
- Pure copy / one new pill row. Zero new API calls.
- Works against back v68 too (back doesn't actually do anything
  different on the wire — the workspace patcher is fire-and-forget on
  the back side).

## Files touched
```
src/features/office/components/UserEmailConfigModal.tsx
src/features/office/components/CompanyProfileModal.tsx
```

## QA
1. Open Profile → "Configure email" card now reads the three-surface
   sentence.
2. Click → modal opens. Below the subtitle, three green check pills:
   *Available in: ✓ Squad tasks ✓ Cron jobs ✓ Chat*.
3. Save with valid creds → success toast mentions all three contexts.
