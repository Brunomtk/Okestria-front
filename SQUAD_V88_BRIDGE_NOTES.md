# front v88 — Squad gateway → back bridge

Pairs with backend `ok_back_v49_front_bridge`.

## What changed

The gateway WebSocket the frontend already connects to receives every
assistant message in real time (that's how the OpenClaw Control UI
shows the conversation, and how the Okestria agent chat works). When
the squad ops modal is open, the front now listens for those events,
matches them to known squad task steps, and POSTs the text to the
back's new `/api/SquadExecutions/steps/{stepId}/apply-message`
endpoint. The back then finalises the step and cascades the workflow.

## Files

- `src/lib/squads/api.ts` — new helper
  `applySquadSessionMessage(stepId, payload)`.
- `src/features/office/screens/OfficeScreen.tsx` — new useEffect right
  after the squad-ops polling effect. Subscribes to gateway `chat`
  events, filters for `state: "final" | "aborted" | "error"`, matches
  `payload.sessionKey` against the selected task's runs, extracts the
  assistant text, and POSTs to the back. Idempotent per modal session.

## Pairing

| Backend                        | Frontend                       |
| ------------------------------ | ------------------------------ |
| `ok_back_v49_front_bridge.zip` | `front_v88_squad_bridge.zip`   |
