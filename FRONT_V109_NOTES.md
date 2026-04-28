# Front v109 — Cada membro do squad numa cadeira diferente

## Dois fixes em cima do v108

### 1. Bug: todos sentavam na MESMA cadeira

`resolveMeetingTarget` em `agentMotion.ts` calculava o índice da
cadeira a partir do `standupMeeting?.participantOrder`. Como os
membros do squad NÃO estão no standup, todos resolviam pra
`index === -1` → fallback → todos sentavam na primeira cadeira (a
do screenshot que você mandou).

Fix: combinei os dois conjuntos de participantes numa única lista
ordenada antes de pegar o índice da cadeira:

```ts
const standupOrder = standupMeeting?.participantOrder ?? [];
const huddleOrder = Object.keys(meetingForcedAgentIds)
  .filter((id) => meetingForcedAgentIds[id] && !standupOrder.includes(id))
  .sort(); // estável entre renders (alfabética)
const combined = [...standupOrder, ...huddleOrder];
const index = combined.indexOf(agentId);
return index >= 0 ? (seats[index] ?? fallback) : fallback;
```

Agora cada membro ganha um índice distinto, então pega uma cadeira
distinta. Se o squad tem mais membros que cadeiras na sala, o overflow
cai automaticamente em `MEETING_OVERFLOW_LOCATIONS` (mesma fallback
que o standup já usava).

### 2. Removido o script violeta da v106

O `ambientScript.pushSquadHuddle({…})` que disparava aquelas figurinhas
violetas estilo janitor (`buildSquadHuddleActors` em
`core/ambientActors.ts`) saiu do `handleConfirmDispatchSquadTask`.

Os agentes reais caminhando até as suas próprias cadeiras é a animação
agora. Sem ruído visual extra.

> Nota: o builder `buildSquadHuddleActors` continua exportado em
> `core/ambientActors.ts` por hora, caso você queira reativá-lo no
> futuro. Os outros dois scripts (lead scout + mail runner) seguem
> ativos — só o squad-huddle saiu.

## Arquivos

- `src/features/retro-office/core/agentMotion.ts`
  - `resolveMeetingTarget` agora usa a lista combinada
    standup + squad-huddle.
  - Deps do useCallback ganharam `meetingForcedAgentIds`.

- `src/features/office/screens/OfficeScreen.tsx`
  - Tirei o `ambientScript.pushSquadHuddle({…})` de
    `handleConfirmDispatchSquadTask`.
  - Tirei `ambientScript` do array de deps do useCallback dele
    (não é mais usado lá dentro).

## Pareamento

Sem mudança no back. Roda com `ok_back_v60_agent_delete_cascade.zip`.

## Smoke test

1. Hard refresh.
2. Squad Ops → squad com 3-5 membros → dispara um task.
3. Cada membro larga sua mesa, vai pra sala de reuniões e senta numa
   **cadeira diferente**. Sem espelho violeta no chão.
4. Ficam ~75 s sentados, depois voltam pro roteiro normal.
