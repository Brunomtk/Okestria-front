# front v82 — Text recipient cap + cron create UX clarity

## Why

Two UI problems surfaced in production:

1. **`POST /api/office/text` → 400 "recipient exceeds 120 characters."**
   The agent output parser in `lib/office/deskDirectives.ts` captures the
   *tail* of phrases like "send a text to Bruno about the promotion we're
   running this week for Okestria customers" as the recipient. The natural
   fallback (no `saying` / `that` separator) hands a whole clause to the
   API, which caps at 120 chars and returns a 400 that ends up in the
   browser console noise.

2. **"The Schedule job button doesn't do anything."**
   In the cron jobs modal, the "Schedule job" button is `disabled` whenever
   `canCreate` is false — but we never told the operator *which* of the
   required fields was still blank. So the button looked frozen.

## Changes

### `src/lib/office/deskDirectives.ts` — parse-time recipient cap

- Added `MAX_OFFICE_TEXT_RECIPIENT_CHARS = 240`.
- `normalizeOfficeTextRecipient` now returns an empty string when the
  extracted value is longer than the cap. An empty recipient makes the
  caller treat the directive as "not a text intent" and skip dispatch,
  so we never fire a doomed API request.

### `src/app/api/office/text/route.ts` — API cap raised

- `MAX_RECIPIENT_CHARS` raised from `120` → `240` so legitimate long
  recipients like `"Bruno Silva (VP of Sales, Okestria) <bruno@ptxgrowth.us>"`
  don't trip the limit. Matches the parser cap above.

### `src/features/office/components/CronJobsModal.tsx` — missing-fields hint

- Replaced the single-expression `canCreate` boolean with a
  `missingFields` `useMemo` that lists every blank required input
  (Name, System event, Run at / Cron expression, Session key when
  named, Webhook URL when webhook delivery, workspace when no
  `companyId`). `canCreate = missingFields.length === 0`.
- Added an amber helper strip above the submit row listing what's
  still missing — `"Complete the following before scheduling: Name,
  System event."` The "Schedule job" button also gets a native
  `title={...}` tooltip with the same info for hover.
- The button stays visually disabled while things are missing, but
  the operator now knows exactly *what* to fill in. No more silent
  greyed-out state.

### Kept from v81
- `sanitizeErrorText` helper — already cleans up stored nginx HTML
  errors on render.
- `buildGatewayErrorHint` PT-BR tips — unchanged.

## Unchanged

- `lib/cron/api.ts` — backend POST shape is identical.
- `buildToolsPayload` / `EmailToolCard` — v80 behaviour intact (email
  tool is always-on when platform Resend is configured).
- `RuntimeGatewayService` / `CronJobService` — frontend-only release.

## Verification

- `npx tsc --noEmit -p tsconfig.check.json` → exit 0.
- `npx next build` → exit 0.
- Manual: tested `missingFields` covers every required input by stripping
  each in turn; toast copy reads naturally in the UI.

## Files touched

- `src/lib/office/deskDirectives.ts`
- `src/app/api/office/text/route.ts`
- `src/features/office/components/CronJobsModal.tsx`
