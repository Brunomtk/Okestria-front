# Front v83 — Cron v34 alignment

Frontend counterpart to the backend `CRON_TOOLS_V34_NOTES.md` rebuild.
The v34 backend dropped three dead columns off `CronJobs`
(`OpenClawJobId`, `LastRunStatus`, `MetadataJson`) and replaced the
OpenClaw taskId/runId correlation pair on `CronJobRuns` with a single
Okestria-minted `ExternalRunKey`. This release adjusts the frontend
types, the REST client, and the cron modal to match — without touching
the product surface the operator sees.

## Principles

- **Stay shape-true.** The frontend types are the mirror of the backend
  DTOs. If the backend DTO loses a field, the TS type loses it too, so
  nothing downstream clings to a column that no longer exists.
- **Parse structured errors first.** The v34 controller returns
  `{ "error": "..." }` on every failure path. `normalizeErrorText` tries
  the structured envelope first (`error`, `message`, `title`, in that
  order), and only falls back to the legacy quoted-string heuristic
  when the body isn't JSON.
- **Derive, don't store.** The modal's "Last result" row is now
  computed from `selectedJobRuns[0]` rather than from a cached
  `lastRunStatus` column. One source of truth, always fresh.
- **Nothing the UI showed gets lost.** The only field the old UI
  actually surfaced from the dropped set was `lastRunStatus`, and the
  derived equivalent is strictly richer (real status + relative
  timestamp). The "Gateway sync" row that displayed `openClawJobId`
  had no operator use case once Okestria owns correlation — it was
  useful as a debug tell during v31/v32 and is gone in v34.

## Files touched

| File                                                        | Change   |
|-------------------------------------------------------------|----------|
| `src/lib/cron/api.ts`                                       | rewritten types + error normalizer |
| `src/features/office/components/CronJobsModal.tsx`          | "Last result" derivation, "Gateway sync" row removed |

## Type changes — `src/lib/cron/api.ts`

### `CronJob`

Removed:

- `openClawJobId` — gateway never needed the back-reference.
- `lastRunStatus` — duplicated `CronJobRun.status`.
- `metadataJson` — replaced by typed `leadContextJson` / `attachmentsJson` / `toolsJson`.

### `CronJobListItem`

Removed:

- `lastRunStatus` — list cell now reads `lastRunAtUtc` only; history
  panel is where callers who need the verb go.

### `CronJobRun`

Removed:

- `openClawTaskId`
- `openClawRunId`

Added:

- `externalRunKey: string | null` — the Okestria-minted GUID that
  correlates the run with the gateway's finalization webhook. UI
  treats it as an opaque identifier; it's present for debug/display
  but nothing renders on it yet.

### `CreateCronJobInput` / `UpdateCronJobInput`

Removed:

- `metadataJson` — the create/update surface only accepts the typed
  envelopes the backend actually reads.

## Error envelope — `normalizeErrorText`

v34 controller returns structured JSON on every failure path:

```json
{ "error": "Session key must start with one of: agent:, hook:, studio:, web:." }
```

`normalizeErrorText` now:

1. Tries `JSON.parse` and pulls `error` / `message` / `title` in that order.
2. Falls back to the legacy quoted-string heuristic (strip wrapping
   quotes, unescape `\"`) if the body is plain text.
3. Returns the original trimmed body as a last resort.

Toasts and inline error banners render exactly what the backend sent
— no leading "Problem details:" noise, no raw nginx HTML, no
surrounding quotes.

## `CronJobsModal.tsx`

### "Last result" row

Before (v33):

```tsx
<DetailRow
  label="Last result"
  value={selectedJob.lastRunStatus ?? "never run"}
/>
```

After (v34):

```tsx
value={(() => {
  const latestRun = selectedJobRuns[0] ?? null;
  if (latestRun) {
    const when =
      latestRun.finishedAtUtc ??
      latestRun.startedAtUtc ??
      latestRun.scheduledAtUtc;
    const suffix = when ? ` · ${formatRelativeTime(when)}` : "";
    return `${latestRun.status}${suffix}`;
  }
  if (selectedJob.lastRunAtUtc) {
    return `completed · ${formatRelativeTime(selectedJob.lastRunAtUtc)}`;
  }
  return "never run";
})()}
```

Reads from the run history the modal already fetches. If no runs are
loaded yet but `lastRunAtUtc` is present on the job, the row still
shows `completed · 5m ago` so the operator never sees a spinner-y
"never run" after a known-successful execution.

### "Gateway sync" row

Removed. The row displayed `selectedJob.openClawJobId`, which is not
a field anymore. v34 gives up the back-reference in favor of
per-run `externalRunKey` correlation — no persistent job-level mirror
to show.

## Backwards compatibility

The frontend doesn't break on legacy payloads. `sanitizeErrorText` is
still the render-time fallback inside the modal for error strings
that slipped past the normalizer (e.g. older deployments that still
return raw HTML). The type change is purely a trim — fields the
backend no longer sends simply aren't there; consumers that were
reading them got errors at compile time and were fixed in this pass.

## Verification

- `grep` for `openClawJobId|lastRunStatus|openClawTaskId|openClawRunId|metadataJson`
  inside `src/lib/cron/` returns only comments on dropped fields.
- Unrelated `metadataJson` hits in `src/lib/squads/api.ts` belong to
  SquadExecution / SquadTaskRun entities (not cron).
- `src/features/office/components/CronJobsModal.tsx` compiles against
  the trimmed `CronJob` / `CronJobListItem` / `CronJobRun` shapes.

## Deployment order

Ship after the backend v34 is up. The trimmed DTOs are a strict
subset of the v33 shape, so this bundle tolerates a brief window
where the backend still has the v33 columns — extra fields on the
wire are ignored. The reverse (v34 backend + v82 frontend) would
surface `undefined` on the dropped columns, which the v82 modal
rendered gracefully ("never run"), so there's no hard cutover.
