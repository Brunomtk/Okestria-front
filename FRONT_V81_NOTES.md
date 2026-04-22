# front v81 — Sanitize stored gateway HTML errors on render

## Why

Backend v32 strips nginx's default HTML error page before writing
`run.ErrorMessage` / `job.LastErrorMessage` — but runs that failed
**before** v32 landed still have the raw HTML in the database.

The operator still sees the ugly blob in the UI:

> *Gateway responded 502: `<html> <head><title>502 Bad Gateway</title></head>
> <body> <center><h1>502 Bad Gateway</h1></center>
> <hr><center>nginx/1.18.0 (Ubuntu)</center> </body> </html>`*

v81 adds a render-time sanitizer so historic rows render cleanly as:

> *Gateway responded 502: 502 Bad Gateway nginx/1.18.0 (Ubuntu)*

No backend change needed — this is purely a UI fix for old stored
messages. New runs are already clean thanks to v32.

## Changes

### `src/features/office/components/CronJobsModal.tsx`

- **New helper `sanitizeErrorText(raw)`.** Mirrors the backend v32
  `SummarizeGatewayBody`:
  - Returns empty string for null / blank input.
  - Detects HTML-ish content via a heuristic (string starts with `<`,
    or contains `<html`, `<head`, `<body`, or common tags).
  - When the error starts with a framing prefix (`Gateway responded
    502: <html…`) the prefix is preserved so the lead-in stays
    intact.
  - Strips `<script>` / `<style>` blocks whole, then removes remaining
    tags (`<[^>]+>`), decodes common entities (`&nbsp;`, `&amp;`,
    `&lt;`, `&gt;`, `&quot;`), and collapses whitespace.
  - If stripping yields an empty string (pathological input) the
    helper falls back to returning the original trimmed text so we
    never render an empty red box.
  - Plain error messages without HTML tags pass through untouched.

- **`Last error` panel (job detail).** Line ~898:
  `{selectedJob.lastErrorMessage}` →
  `{sanitizeErrorText(selectedJob.lastErrorMessage)}`. Also added
  `break-words` to the `whitespace-pre-wrap leading-5` class so a
  single long sanitized line wraps inside the red card.

- **`RunRow` (recent runs list).** Line ~1991:
  - `const cleanedError = sanitizeErrorText(run.errorMessage);`
  - `buildGatewayErrorHint` now receives the cleaned text, so the
    PT-BR tip detection (`.toLowerCase().includes("404")`, etc.)
    matches reliably even when the raw DB value was wrapped in HTML.
  - Render site uses `{cleanedError || run.errorMessage}` as the
    defensive fallback.

## Unchanged

- `buildGatewayErrorHint` logic is untouched — it just gets cleaner
  input now.
- Lead email batch flow (`LeadOpsPanel.tsx`) doesn't surface gateway
  HTML errors; no change.
- Backend v32 `SummarizeGatewayBody` — the UI sanitizer is
  intentionally a superset so the display is bulletproof even if a
  legacy message type slips through.

## Verification

- `npx tsc --noEmit -p tsconfig.check.json` → exit 0.
- `npx next build` → exit 0.
- Manual check: the helper's regex is `/<[^>]+>/g` (no backreferences,
  no catastrophic patterns), safe on arbitrary-length input.

## Files touched

- `src/features/office/components/CronJobsModal.tsx`
