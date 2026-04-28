# Front v107 — Fix da ordem de declaração do `ambientScript`

## Erro

```
./src/features/office/screens/OfficeScreen.tsx:2528:7
Type error: Block-scoped variable 'ambientScript' used before its declaration.
```

`handleConfirmDispatchSquadTask` listou `ambientScript` no array de
deps do `useCallback` (linha ~2528), mas a declaração
`const ambientScript = useAmbientCueQueue();` vivia ~290 linhas
depois (linha ~2792). TypeScript não deixa.

## Fix

Movi a declaração pra antes do `handleConfirmDispatchSquadTask`,
exatamente depois do `handleCancelSquadTaskDispatchApproval`. Deixei
um comentário no lugar antigo apontando pra nova posição pra quem
for caçar depois.

Único arquivo mexido:
- `src/features/office/screens/OfficeScreen.tsx`

Sem mudança de comportamento — só ordem de declaração.

## Pareamento

Igual o v106. Roda com `ok_back_v60_agent_delete_cascade.zip`.
