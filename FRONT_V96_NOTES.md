# Front v96 — Bridge by sessionKey + always-poll

## Why this exists

Before v96 the gateway WebSocket bridge only forwarded a `chat` event
to the back when the run row was already loaded inside the modal. If
the scheduler fired a recurring cron while the operator was on a
different cron (or the modal was closed), the bridge had no run in
its index, ignored the event, and the run sat in `running` forever —
or worse, the gateway echoed the assistant's reply into the agent's
main chat.

## What changed

### 1. Always-poll heartbeat (`CronJobsModal.tsx`)
Two new intervals fire while the modal is open:
- Detail of the selected cron refreshes every **5 s** (no longer
  gated on "is a run in flight").
- Cron list rail refreshes every **15 s** so jobs created elsewhere
  appear without manual refresh.

### 2. SessionKey-based fallback in the bridge
- New `applyCronRunMessageBySession({ state, text, error, sessionKey })`
  helper in `src/lib/cron/api.ts` POSTs to the v55 back's new route
  `POST /api/CronJobs/runs/by-session/apply-message`.
- The bridge now always strips the gateway's `agent:<slug>:` prefix,
  filters down to cron-shaped sessionKeys (`hook:cron-…` /
  `hook:okestria-cron-…`), then:
  - Fast path: if a local run row matches the sessionKey, POST by
    runId (the v54 path).
  - Fallback path: no local match → POST by sessionKey, the back
    resolves the run row server-side. Idempotent — a `Set<string>`
    of forwarded sessionKeys prevents duplicate deliveries.

### 3. Squad bubbles unaffected
Bridge still ignores non-cron sessionKeys (squad keys start with
`hook:sqexec-…`), so the squad chat continues to use its own
`apply-message` route exactly as before.

## Files

- `src/lib/cron/api.ts` — added `applyCronRunMessageBySession`.
- `src/features/office/components/CronJobsModal.tsx`
  - Removed the in-flight gate on the detail polling effect.
  - New 15 s list-rail polling effect.
  - Bridge: prefix filter for cron sessionKeys, sessionKey-keyed
    idempotency set, fast path + fallback path.

## Pairing

Use with `ok_back_v55_cron_isolated.zip`. The new `/by-session`
endpoint is required for the fallback path; running v96 against the
v54 back will simply skip the fallback (the legacy fast path keeps
working).
