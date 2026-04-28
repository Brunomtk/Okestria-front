# Front v105 — Delete agent: en-US, z-index, gateway sweep

## Three fixes on top of v104

### 1. Modal in English
Translated every string in `AgentDeleteConfirmModal.tsx` to en-US to
match the rest of the office UI:

- `Apagar agente` → `Delete agent`
- `Ação irreversível` → `This cannot be undone`
- `Calculando o que será apagado…` → `Calculating what will be removed…`
- `Não consegui carregar a prévia` → `Could not load the preview`
- `Isto também vai apagar` → `This will also remove`
- `cron jobs / runs no histórico` → `cron jobs / runs in history`
- `Remove o agente de N squad` → `Removes the agent from N squad`
- `Cancelar` / `Apagar agente` → `Cancel` / `Delete agent`
- Loading spinner state: `Apagando…` → `Deleting…`

### 2. z-index bumped above the agent editor stack
The modal was rendering BEHIND the `AgentEditorModal` (z-[145]) and
the `AgentCreateWizardModal` (z-[140]). Bumped to `z-[170]` (overlay)
+ `z-[171]` (card) so the confirm modal always sits on top of every
other agent surface.

| Surface                            | z-index  |
| ---------------------------------- | -------- |
| AgentSettingsPanel modal           | 100      |
| AgentSkillsSetupModal              | 100      |
| AgentCreateModal                   | 120      |
| AgentCreateWizardModal             | 140      |
| AgentAvatarCreatorModal            | 140      |
| AgentEditorModal                   | 145      |
| HeaderBar                          | 180      |
| **AgentDeleteConfirmModal (v105)** | **170**  |

### 3. Gateway VPS now actually wiped
The previous copy said "Workspace files are not affected" — wrong
expectation. Updated:

**Modal copy** — adds an explicit row to the cascade list:
> Every session attached to this agent on the gateway VPS, plus the
> agent's workspace itself.

…and a closing line:
> Nothing on the gateway VPS is preserved — workspace, sessions,
> and the agent record are all wiped.

**Implementation** — new helper `clearAllAgentSessions(client, agentId)`
in `src/lib/gateway/agentConfig.ts`:
- Pages through `sessions.list` (limit 100 per call, up to 10 hops or
  500 sessions total — defensive cap).
- Calls `sessions.delete` on each session key.
- Counts inspected / deleted / failed and returns the totals.
- "Not found" errors on individual deletes count as success (already
  gone).

`deleteAgentRecordViaStudio` now:
1. Backs up + removes legacy gateway cron jobs (existing).
2. **NEW** — sweeps every session on the gateway with
   `clearAllAgentSessions`. Logs partial failures but doesn't abort.
3. Deletes the gateway agent (`agents.delete` — wipes workspace).
4. Deletes the persisted Okestria backend record (cascades cron
   jobs, squad memberships, files, profile via back v60).

So the operator gets a clean wipe across all three surfaces in one
click. No orphan sessions left in the gateway dropdown.

## Files

- ✏️ `src/features/agents/components/AgentDeleteConfirmModal.tsx` —
  full rewrite to English + bumped z-index (170/171). Copy refresh
  to mention the gateway-side wipe.
- ✏️ `src/lib/gateway/agentConfig.ts` — added
  `clearAllAgentSessions({ client, agentId, maxToDelete? })`.
- ✏️ `src/features/agents/operations/deleteAgentOperation.ts` —
  imports the new helper; calls it inside the transaction
  (after `removeCronJobsForAgentWithBackup`, before
  `deleteGatewayAgent`).

## Pareamento

Use with `ok_back_v60_agent_delete_cascade.zip`. No back change in
this release.

## Smoke test

1. Hard refresh.
2. Open an agent's sidebar / settings, click delete.
3. Modal opens IN FRONT of the editor, in English, with the cascade
   counts and the new "every session on the gateway VPS" line.
4. Confirm → backend cascade runs, gateway sessions are swept, agent
   record removed. Open the gateway's session selector — no
   orphan `agent:news-pulse:*` or `hook:cron-…:agent:news-pulse:*`
   entries remain.
5. `agents list` no longer mentions news-pulse.
