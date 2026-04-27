# Front v92 — Cron modal rebuilt as a chat panel

## What you asked for

> "Agora me mande o front refeito ajustado e alinhado com tudo alinhado
> certinho modal novo caprichado com oq pedi bonito no padrao por favor
> vamos la capriche."

So: same chat-panel polish the squad surface got, applied to cron jobs.
Single-pane layout. Avatar bubbles for every run. Auto-scroll with a
"Jump to latest" button. File-upload composer. No "Test gateway" button.
A clean create/edit dialog instead of a tab.

## Visual changes

**Single pane modal**, 1160px wide:
- **Left rail (288px)** — list of cron jobs. Each row shows the agent's
  avatar (or initials in a deterministic colour), the job name, the
  schedule, the next-run countdown, and a status dot. Selected row is
  highlighted with a subtle ring.
- **Right pane** — chat-style timeline of runs.
  - Sticky header with the agent's avatar + job name + status pill +
    KIND pill (one-shot / recurring), schedule summary, agent name,
    delivery mode, and action buttons (Run now / Pause / Resume /
    Cancel / Edit / Delete / Refresh).
  - System event preview strip under the header so you always see what
    the agent is being asked to do.
  - Run timeline: one bubble per run, ordered oldest → newest. Each
    bubble has the agent's avatar (with a pulsing dot for in-flight
    runs), header line with run number + trigger source + timestamp,
    and the assistant's answer. Failed runs render red with the
    error message; queued/running show a typing-dots animation.
  - Bottom anchor + "Jump to latest" pill that only appears when the
    user has scrolled away from the bottom (mirrors squad chat).
- **Composer at the bottom** — system event override textarea with
  Enter-to-send, attachment chips with size validation (6 files, 15 MB
  each, 25 MB total), and a Run button. Empty composer + Run-now header
  button just fires the saved system event. The composer's small
  caption explains that attachments belong on the Edit form for now.
- **Auto-refresh** — while a run is `queued` or `running`, the detail
  call polls every 4 s so the bubbles flip status without manual reload.

## Interaction flow

1. Open the cron modal — left rail loads `/by-company/{companyId}` and
   selects the most-recently-updated job.
2. The right pane fetches `/api/CronJobs/{jobId}` (which now returns
   `runs` inline thanks to v54), and renders the chat timeline.
3. Hit **Run now** (header) or type an override + Enter (composer):
   POST `/api/CronJobs/{jobId}/run` with `systemEventOverride`. The new
   run appears with status `queued` and a typing indicator.
4. The back POSTs to `/hooks/agent`, the gateway opens an agent session,
   the agent thinks. The frontend's gateway WebSocket bridge (passed in
   as `gatewayClient`) hears the `chat` event with `state: final` (or
   `aborted` / `error`), strips the gateway's `agent:<slug>:` prefix,
   matches the bare `hook:cron-{jobId}-run-{n}` against an open run, and
   POSTs the assistant text to `/api/CronJobs/runs/{runId}/apply-message`.
5. The bridge then re-loads the detail; the bubble flips from
   "thinking…" to the agent's reply.

## Files touched

- `src/lib/cron/api.ts`
  - Added `agentSlug`, `agentAvatarUrl` to `CronJob` and
    `CronJobListItem`. Added `runs?: CronJobRun[] | null` to `CronJob`.
  - Removed `fetchCronGatewayConfig`, `testCronGateway`, the
    `CronGatewayConfig` / `CronGatewayTestResult` / `CronGatewayHealth`
    types — those endpoints don't exist on the v54 back.
  - Removed `fetchEmailToolDefaults`, `fetchResendPlatformStatus`,
    `resolveEmailToolDefaults`, `CronEmailToolDefaults`,
    `ResendPlatformStatus`, plus the supporting cookie/identity
    helpers — same reason.
  - Updated `applyCronRunMessage` to send the new v54 body shape:
    `{ state, text, error, sessionKey }`. Returns `CronJobRun | null`.
  - Stripped unused imports (`fetchCompanyById`, `fetchCurrentUser`,
    `fetchUserEmailContext`, `SESSION_COOKIE`, `parseStoredSessionCookie`).
- `src/features/office/components/CronJobsModal.tsx`
  - **Full rewrite** (~1300 lines, down from ~2300). New chat-panel
    layout with `CronListRow`, `CronChatPanel`, `RunBubble`, and
    `CronJobFormDialog`. Pulled in the squad chat's avatar / hue
    helpers and the same `isNearBottom` scroll-pin pattern.
  - Single create/edit dialog (replaces the old "tabs" UX).
  - Email-tool card and gateway-diagnostic strip are gone.
- `src/features/office/screens/OfficeScreen.tsx`
  - `cronAgentOptions` now also surfaces `slug` + `avatarUrl` so the
    modal can render the agent's real avatar in every bubble.

## Backend pairing

This v92 frontend pairs with the v54 backend
(`ok_back_v54_cron_gateway_clean`). The bridge POST shape
(`{ state, text, error, sessionKey }`) matches the v54
`ApplyCronRunMessageRequestDTO`. Older backends won't understand
`state` and will fall over. Run them together.

## Quick smoke test

1. In the office, open the cron modal.
2. Hit **New cron** → fill name, agent, kind = one-shot, run-time = 1
   minute from now, system event = `Reply with one short sentence: "PING-OK from <name>".`
3. Wait. The new run's bubble shows the typing-dots animation while
   the agent thinks; once the gateway pushes the final, the bubble
   flips to the agent's reply with their avatar.
4. Open another cron with **Run now** + an override prompt — the
   override fires immediately and the bubble lands the same way.
