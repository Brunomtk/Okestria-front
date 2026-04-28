# Front v99 — Chat layout limpo + modal mais largo

## O que mudou

### 1. Header duplicado removido (`SquadChatPanel.tsx`)
Antes o painel mostrava:
- Emblema do squad + "SQUAD · SQUAD COMERCIAL · 5 members"
- Título grande "teste de taks"
- Pill WORKFLOW + data de criação
- Em outra linha, o seletor de task + Refresh + Ops + status pill

A coluna lateral do chat modal **já carrega o emblema, o nome e a contagem
de membros** ali no topo, então repetir tudo dentro do painel só comia
espaço. Cortei o bloco emblema/título/data e mantive apenas o que é
acionável: **seletor de task → mode pill → status pill → Ops + Refresh**,
tudo numa única linha compacta.

### 2. Botões reorganizados (`SquadChatPanel.tsx`)
- **Seletor de task**: ocupa o espaço flexível à esquerda, capado em 28rem.
- **Mode pill** (Workflow/Leader/All) e **status pill** (completed, pending, …)
  ficam logo depois do seletor — informações de contexto, não ações.
- **Ops** + **Refresh**: ações, alinhadas à direita. Refresh agora é
  ícone-só, num quadrado de 32px, não mais um botão com padding.

### 3. Modal de chat mais largo (`OfficeScreen.tsx`)
- `max-w-[1180px]` → **`max-w-[1480px]`** (e `width: min(1480px, 92vw)`
  para escalar bem em telas menores).
- Altura: `min(760px, …)` → **`min(840px, calc(100vh - 48px))`**.
- A coluna **Agents & Squads** encolheu de `w-64` (256 px) → **`w-56`
  (224 px)**, devolvendo mais espaço pro chat.

Resultado: o chat fica com ~1240 px disponíveis (1480 − 224 − bordas), o
suficiente pra ler markdown longo sem quebra forçada.

## Arquivos

- `src/features/office/components/SquadChatPanel.tsx`
- `src/features/office/screens/OfficeScreen.tsx`

## Pareamento

Sem mudança de back. Roda com `ok_back_v55_cron_isolated.zip` ou
`ok_back_v56_session_route.zip`.

## Smoke test

1. Deploy + hard refresh (Ctrl/Cmd + Shift + R).
2. Abre **Squad Comercial → teste de taks**.
3. Topo do painel agora mostra só **dropdown de task · WORKFLOW · COMPLETED · OPS · ↻**
   numa linha. Sem o título grande nem a data — esses já vivem no header
   externo do modal.
4. O modal ocupa quase a janela inteira; o chat respira.
