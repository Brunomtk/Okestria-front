# front v86 — Squad session-polling progress UI

Pairs with backend `ok_back_v46_squad_session_polling`.

## Squad flow the operator asked for

1. **Members fan out, each in their own OpenClaw chat session.**
   The squad ops modal shows every member as a coloured pill that flips
   pending → running → completed/failed live.
2. **Back polls each session and stamps the reply onto the run.**
   The frontend doesn't see the polling — it just sees the run's
   `status` and `outputText` update on its own polling cycle.
3. **Chief receives every member's reply and synthesises.**
   While that's happening, the modal shows the leader row as
   "Synthesising every member's reply…" so the operator knows what's
   going on.
4. **Final answer.**
   When the chief finishes, its synthesis is highlighted as a dedicated
   "Squad final answer" card under the chat.

## What's in this build

- **`src/features/office/components/SquadOpsModal.tsx`** — adds the
  per-member progress strip (X/Y done), the leader status row, and the
  "Squad final answer" card. Falls back gracefully when `role` isn't
  populated by treating the first run as the leader.
- **`src/features/office/screens/OfficeScreen.tsx`** — squad ops modal
  now polls every 2.5s while a task is live (was 12s) so the per-member
  progression appears in near-real-time as the back receives each agent's
  reply from its session. Idle tasks keep the slower 12s cadence to be
  polite to the API.

## Pairing matrix

| Backend                                  | Frontend                              |
| ---------------------------------------- | ------------------------------------- |
| `ok_back_v46_squad_session_polling.zip`  | `front_v86_squad_session_polling.zip` |

## Behaviour notes

- The chat continues to render messages via the existing render-event
  store (`SquadRunRenderStore`). Replies the back captures from session
  history go through the same path, so chat-bubble rendering is
  unchanged.
- "Send" / "Run again" / "Retry failed" all hit the same endpoints; the
  back decides whether to use session-polling (default ON) or the
  legacy hook-callback path (when
  `Okestria__SquadSelfContained=false`).
- `RuntimeController.config-status` returns `selfContainedSquads=true`
  by default, so the dispatch UI is never gated by gateway
  reachability.
