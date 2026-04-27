# Front v93 — Polish pass on top of v92

## What you asked for

> "Comente os botão de hide HQ e o botão do console por favor.
> No cron job e no chat de squad que tem o avatar coloque a foto de
> preview por favor igual o chat dos agents por favor.
> Tire esse http 200 do cron job por favor."

So three small but visible polishes — done.

## Changes

### 1. HQ + OpenClaw Console buttons commented out
`src/features/office/screens/OfficeScreen.tsx`

- The amber **OPEN HQ / CLOSE HQ** button in the HUD is wrapped in a JSX
  comment so it disappears from the screen. State / handler are
  preserved so re-enabling is just deleting the comment markers.
- The cyan **OpenClaw console** square button (bottom-left) is hidden
  with a `false &&` short-circuit on its render condition. The console
  modal itself is preserved so flipping `showOpenClawConsole` back to
  true (e.g. via the DEBUG env flag) still works for development.

### 2. Real avatars in cron + squad bubbles
- `src/features/office/components/CronJobsModal.tsx` now renders
  every avatar through the shared `<AgentAvatar />` component (the
  same one used in the agent chat panel). When the cron's agent has
  an `avatarUrl`, the actual photo is shown; otherwise the multiavatar
  SVG keyed off the agent slug renders — no more flat "CM"-style
  initials circle.
  - List rail rows.
  - Chat panel header.
  - Per-run bubbles.
- `src/features/office/components/SquadChatPanel.tsx` was updated the
  same way. Each run bubble uses `<AgentAvatar />`, with a new
  optional `agentAvatars` prop letting the parent pass a
  `Record<gatewayAgentId, avatarUrl>` lookup so member photos render
  when known. The crown badge for the squad leader and the cyan
  "thinking" pulse dot are kept on top of the new avatar.
- `src/features/office/screens/OfficeScreen.tsx` builds and passes
  `squadAgentAvatarLookup` from `state.agents` so every member's real
  photo flows into the squad chat panel.

### 3. HTTP status pill removed from cron runs
`src/features/office/components/CronJobsModal.tsx` — the `HTTP 200`
chip on the run bubble header is gone. The run's status pill +
timestamp already tell the operator what they need.

## File-level summary

- `src/features/office/components/CronJobsModal.tsx`
- `src/features/office/components/SquadChatPanel.tsx`
- `src/features/office/screens/OfficeScreen.tsx`

No backend change required — pairs with the same
`ok_back_v54_cron_gateway_clean.zip`.

## Quick smoke check

1. Open the office. The amber **OPEN HQ** button and the cyan
   bottom-left console square should both be gone.
2. Open the cron modal. Each cron's agent shows its avatar (or the
   multiavatar SVG if no upload). Run bubbles look identical to a
   one-on-one agent chat.
3. Open the squad chat. Each member's bubble carries their real
   avatar (or multiavatar fallback). The leader still gets the crown,
   the thinking state still pulses cyan.
