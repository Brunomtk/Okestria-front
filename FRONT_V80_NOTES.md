# front v80 — Align UI with backend v31 (email tool always on)

## Why

Backend v31 loosened the dispatch gate: the `resend_email` tool now
ships with every cron run as long as the platform's Resend key is
configured — it no longer depends on the per-job
`tools.Email.Enabled` toggle. The frontend needed to reflect that so
operators stop assuming "I have to flick a switch for my agent to send
email".

## UX changes

- **`EmailToolCard` header pill.** When the operator hasn't touched
  the overrides, we now show a green `Always on` pill (as long as the
  platform has Resend configured). When overrides are set, the pill
  flips to `Custom`. The old behaviour was: pill only when toggle is
  on, nothing when off.
- **`EmailToolCard` helper copy.** Reworded to say the capability is
  shipped automatically by the platform and the toggle is for
  overriding defaults, not enabling the tool. Explicit: "Leave it off
  to send with your profile defaults".
- **`EmailToolCard` inactive state.** Replaced the "Ready to enable
  as …" chip with a "Defaults active — sending as …" chip so the
  operator sees their profile defaults are already live.
- **Resend-not-configured warning.** A new amber chip appears on the
  card when `resendConfigured === false`, making it obvious why the
  agent can't send email yet (needs admin action).
- **`ToolsBadge` in the jobs list.** Previously only rendered when
  `emailEnabled === true`; now it renders on every cron row as
  `EMAIL` (platform defaults) and `EMAIL · CUSTOM` when the operator
  has per-job overrides.
- **Detail panel heading** (`Tools · Email (Resend)`) now reads
  `Tools · Email (Resend) · Custom overrides` to match.

## Files touched

- `src/features/office/components/CronJobsModal.tsx`
  - `EmailToolCard`: helper copy, pill (`Always on` / `Custom`),
    `resendConfigured === false` warning, "Defaults active" chip.
  - `ToolsBadge`: render unconditionally when `summary` is set, vary
    styling by `isCustom`.
  - Detail panel heading suffixed with `· Custom overrides`.

## Unchanged

- `lib/cron/api.ts` — v79 exports (`fetchResendPlatformStatus`,
  `resolveEmailToolDefaults`) are already aligned; the `defaults`
  shape still carries `resendConfigured` which the UI keys off.
- `LeadOpsPanel.tsx` — lead email batch flow is a separate dispatch
  path and doesn't go through the cron tool envelope; no changes
  needed.
- Submission payload (`buildToolsPayload`) — unchanged. When the
  operator leaves the toggle off we still send `tools: null`, which
  v31 interprets as "use platform defaults". When they toggle on and
  fill in overrides, we still send the `email` block and v31 honours
  the overrides exactly.

## Verification

- `npx tsc --noEmit -p tsconfig.check.json` → exit 0 (26s).
- `npx next build` → exit 0 (56s).
- No runtime-only regressions expected; the changes are presentational
  + a single copy rewrite in the tool card.
