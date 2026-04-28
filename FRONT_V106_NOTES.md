# Front v106 — Three new ambient scripts on the office floor

## What's new

The retro office floor already plays a **janitor sweep** when an agent
session resets. v106 adds three more "scripts" that fire when long-
running operations kick off — same actor pipeline (entry → stops → exit)
the janitor uses, but with distinct colours, props, counts, and
durations so each one reads as its own thing.

| Script         | Trigger                          | Look on the floor                              | Duration |
| -------------- | -------------------------------- | ---------------------------------------------- | -------- |
| **Lead scout** | Start a lead-generation mission  | 2 actors, cyan + amber, "broom" tool           | 45 s     |
| **Mail runner**| Send an outreach email batch     | 1 fast actor, green, "vacuum" tool             | 25 s     |
| **Squad huddle**| Dispatch a squad task           | Up to 4 actors, violet, gather around an anchor| 60 s     |

## Pipeline

```
[trigger in OfficeScreen / LeadOpsPanel]
        ↓ pushLeadScout / pushMailRunner / pushSquadHuddle
[useAmbientCueQueue]   ← FIFO, 90 s prune, 16-cue cap
        ↓ ambientCues prop
[RetroOffice3D]
        ↓ buildAmbientActorsForCue
[JanitorActor[] spawned] ← reuses the existing janitor render path
```

## Files

### New
- `src/lib/office/ambientCues.ts` — type `OfficeAmbientCue` (tagged
  union: `lead-scout` / `mail-runner` / `squad-huddle`) + type guards
  + `AMBIENT_CUE_QUEUE_LIMIT`.
- `src/features/retro-office/core/ambientActors.ts` — three builder
  functions that turn a cue into JanitorActor[]s with kind-specific
  colours, tools, counts, and durations. Single fan-out entrypoint
  `buildAmbientActorsForCue(cue, stops)`.
- `src/features/office/hooks/useAmbientCueQueue.ts` — tiny FIFO queue
  hook with three push helpers (`pushLeadScout`, `pushMailRunner`,
  `pushSquadHuddle`) + auto-pruning.

### Modified
- `src/features/retro-office/RetroOffice3D.tsx`
  - New optional `ambientCues?: OfficeAmbientCue[]` prop.
  - New `seenAmbientCueIdsRef` for de-dup.
  - New spawn `useEffect` mirroring the cleaning one — fans cues out
    via `buildAmbientActorsForCue` and merges into `janitorActors`.
- `src/features/office/components/panels/LeadOpsPanel.tsx`
  - New optional callbacks `onLeadGenerationStarted` /
    `onEmailBatchStarted`.
  - `handleSubmit` (lead generation) and `handleCreateEmailBatch`
    fire those callbacks right after the create RPC succeeds.
- `src/features/office/components/LeadOpsModal.tsx`
  - Forwards the two new callbacks down to `LeadOpsPanel`.
- `src/features/office/screens/OfficeScreen.tsx`
  - Imports `useAmbientCueQueue`.
  - `const ambientScript = useAmbientCueQueue();` once at the top.
  - Passes `ambientCues={ambientScript.cues}` to `<RetroOffice3D>`.
  - Passes `onLeadGenerationStarted` + `onEmailBatchStarted` to
    `<LeadOpsModal>`.
  - `handleConfirmDispatchSquadTask` calls
    `ambientScript.pushSquadHuddle(...)` after the dispatch RPC
    succeeds.

## Pareamento

Sem mudança de back. Roda contra `ok_back_v60_agent_delete_cascade.zip`
(ou qualquer back >= v54).

## Smoke test

1. Hard refresh.
2. Open the office.
3. **Lead scout** — open Lead Ops → New mission → confirm. Two actors
   walk in (cyan + amber). They roam the floor for 45 s and leave.
4. **Mail runner** — pick a lead job → Email batch → confirm. One
   green actor zips through the floor for 25 s.
5. **Squad huddle** — open a squad in Squad Ops → dispatch a task.
   Up to 4 violet actors enter, gather near a single stop, then exit
   over 60 s.
6. Janitor sweep on agent reset still works (we didn't change that
   path).
