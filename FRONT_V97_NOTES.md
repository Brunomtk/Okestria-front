# Front v97 — Squad Ops modal alinhado com cron + chat

## O que tava feio

Abrindo o **Squad Ops** modal, a resposta do agente vinha com `## headlines`,
`**bold**`, links sem href e a "bolinha de iniciais" no avatar — tudo fora do
padrão do chat dos agentes / cron / squad chat.

## Mudanças (em `SquadOpsModal.tsx`)

1. **Markdown** — todas as bolhas de assistente passam por
   `<ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>`
   com a classe `agent-markdown`. Heading, bold, lista, blockquote, tabela,
   código e link clicável (abre em nova aba) renderizam igual nas outras
   superfícies. A bolha do usuário continua plain text — assim um `#` digitado
   pelo operador não vira heading sem querer.

2. **Avatar do agente** — `AgentBubble` e `ThinkingBubble` agora usam
   `<AgentAvatar />`. O multiavatar SVG já não fica mais como circle de
   iniciais; quando o agente tem `avatarUrl`, mostra a foto. O seed é o
   `gatewayAgentId` do membro (mesmo critério usado no SquadChatPanel),
   resolvido via novo `memberAvatarLookup` keyed por `backendAgentId`.

3. **Mensagens persistidas** — quando o bubble vem de
   `selectedTask.messages`, o `authorId` é resolvido contra o lookup de
   membros para também enriquecer com avatar. Pra mensagens órfãs (sem
   `authorId` no banco), o fallback é o `authorName` como seed → multiavatar
   determinístico continua bonito.

4. **Render do leader sintetizado** — o bloco "Squad final answer" também
   passa pelo markdown agora.

## Arquivos

- `src/features/office/components/SquadOpsModal.tsx`
  - Imports: `ReactMarkdown`, `remarkGfm`, `MARKDOWN_COMPONENTS`,
    `AgentAvatar`.
  - Novo `memberAvatarLookup` (Map<backendAgentId, { gatewayAgentId, name }>).
  - `ChatBubble` ganhou `avatarSeed?` + `avatarUrl?` opcionais nos kinds
    `assistant` e `thinking`.
  - `AgentBubble` e `ThinkingBubble` recebem os novos props e renderizam
    via `<AgentAvatar size={28} />`.
  - Helper `initialsOf` removido (estava só servindo o avatar antigo).

## Pareamento

Continua compatível com os mesmos `ok_back_v55_cron_isolated.zip` /
`ok_back_v56_session_route.zip` — esta é puramente uma mudança visual
no front.
