# Front v108 — Squad members really sit in meeting chairs

## Mudança

A v106 introduziu o "squad huddle" como um spawn de **actores violetas
genéricos** (estilo janitor) que se agrupavam num ponto qualquer da sala.
Visualmente bonitinho, mas não eram os agentes reais. v108 substitui
isso pelo comportamento que você pediu:

> Quando despachar um squad task, **todos os membros do squad** vão
> pra sala de reuniões e **sentam exatamente na cadeira**. Ficam lá
> durante a execução do task.

A boa notícia é que a infraestrutura já existia — o office já sabe
fazer isso pra **standup meetings** (comando `agentMotion → forced
intent "meeting_room"` resolve uma cadeira livre, anda até ela e
senta). v108 só pluga o squad huddle no mesmo trilho.

## Como funciona

```
[OfficeScreen]   handleConfirmDispatchSquadTask
    ↓ setMeetingForcedAgentIds({ news-pulse: true, sales-closer: true, ... })
    ↓ window.setTimeout(clear, 75 s)
[RetroOffice3D]  meetingForcedAgentIds prop
    ↓
[useRebuiltAgentTick]  determineForcedIntent
    ↓ se agente está no map → "meeting_room"
[agentMotion]    resolveMeetingTarget → cadeira livre
    ↓ walk path → sit on cushion (state="sitting")
```

A duração padrão é **75 s** — propositalmente um pouco mais longa que
o cue ambient (60 s) pra garantir que os membros ainda estejam sentados
quando as primeiras respostas começarem a aparecer no chat. Cada cadeira
da sala de reuniões só aceita um agente por vez (mesma proteção que o
standup já tinha), então se houver mais membros que cadeiras, os extras
usam os `MEETING_OVERFLOW_LOCATIONS` (mesma fallback do standup).

## Arquivos

- `src/features/retro-office/core/agentMotion.ts`
  - `useRebuiltAgentTick` ganhou o parâmetro
    `meetingForcedAgentIds: Record<string, boolean>` (default `{}`).
  - `determineForcedIntent` checa o map e devolve `"meeting_room"`
    quando match, antes dos outros holds. Mesma resolução de cadeira
    do standup.

- `src/features/retro-office/RetroOffice3D.tsx`
  - Wrapper local `useAgentTick` ganhou o mesmo parâmetro.
  - Novo prop opcional `meetingForcedAgentIds?: Record<string, boolean>`
    no `RetroOffice3D`, default `EMPTY_BOOLEAN_RECORD`.
  - Prop fluindo até o `useAgentTick`.

- `src/features/office/screens/OfficeScreen.tsx`
  - Novo state `meetingForcedAgentIds` + constante `SQUAD_MEETING_HOLD_MS = 75_000`.
  - `handleConfirmDispatchSquadTask` agora também:
    - Coleta os `gatewayAgentId` de cada membro.
    - Adiciona todos no `meetingForcedAgentIds` map.
    - Agenda o auto-clear via `setTimeout` em 75 s.
  - Passa o map pro `<RetroOffice3D meetingForcedAgentIds={…}/>`.

O ambient cue violeta da v106 continua rodando em paralelo (extra de
ambientação), mas agora a estrela do show é o squad real andando pra
mesa.

## Pareamento

Sem mudança de back. Roda contra `ok_back_v60_agent_delete_cascade.zip`.

## Smoke test

1. Hard refresh.
2. Abre Squad Ops, escolhe um squad com 3-5 membros, dispara um task.
3. **Observa o chão**: cada membro larga sua mesa atual e caminha até
   a sala de reuniões. Cada um vai pra UMA cadeira específica e
   **senta** (sprite na pose sentada, encostado na cadeira certa).
4. Eles ficam lá ~75 s. Depois disso o `setTimeout` limpa o map e
   eles voltam ao roteiro normal (desk hold, roam, etc.).
5. As bolhas violetas-genéricas (v106) ainda passam por trás de fundo
   se você quiser deixar mais "movimentado", mas a ação principal
   agora são os agentes reais sentados na mesa.
