# Front v100 — Modal widths alinhados

## O que mudou

Os três modais grandes agora usam a mesma régua de largura:
**1480 px max, 92 vw em telas menores**, igual ao chat de squads
implantado no v99.

| Surface             | antes              | depois                       |
| ------------------- | ------------------ | ---------------------------- |
| Squad chat (v99)    | 1180 px max        | **1480 px max / 92 vw**      |
| Cron jobs modal     | 1160 px max        | **1480 px max / 92 vw**      |
| Squad Ops modal     | `max-w-5xl` (1024) | **1480 px max / 92 vw**      |

Resultado: o markdown longo (heading + lista + tabela) respira igual nos
três lugares, sem quebra forçada de linha.

## Botões na mesma linha

- **CronJobsModal · run header** — substituí `flex flex-wrap` por
  `flex` puro com `flex-none` no grupo de ações (Run now / Pause /
  Resume / Cancel / Edit / Trash / Refresh). Com 1480 px, todos os
  botões cabem numa linha só.
- **SquadOpsModal · header principal** — já era single-line (`flex
  items-center gap-4`). Mantive como está.
- **SquadOpsModal · toolbar de dispatch** (Run again / Retry failed /
  Re-dispatch all dentro do card de sessão expandida) — fica `flex-wrap`
  de propósito, porque na tela de altura média o card pode ficar
  apertado e os botões precisam quebrar pra não escapar.

## Arquivos

- `src/features/office/components/CronJobsModal.tsx`
- `src/features/office/components/SquadOpsModal.tsx`

## Pareamento

Sem mudança de back. Roda com `ok_back_v55_cron_isolated.zip` ou
`ok_back_v56_session_route.zip`.

## Smoke test

1. Deploy + hard refresh.
2. Abre **Cron jobs**: o modal preenche bem mais da tela, todos os
   botões do header de cada cron ficam numa linha só.
3. Abre **Squad Ops**: mesmo gabarito de largura, alinhado com o
   chat de squads.
