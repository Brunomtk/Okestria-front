# Front v98 — Squad Ops mais largo + markdown garantido

## O que mudou

A captura que você mandou ainda mostrava `## Passo 1`, `**Dor 1**`, etc.
em texto cru — porque a build implantada ainda era pré-v97 (modal
estreito + avatar de iniciais "SC"). v97 já tinha aplicado markdown nas
bolhas do Squad Ops, mas no aperto do `max-w-2xl` a leitura ficava ruim
mesmo quando o markdown renderizava.

Esta v98 fecha o problema:

1. **Largura do modal** — `max-w-2xl` (672px) → **`max-w-5xl` (1024px)**.
   Listas, blockquote, tabela e parágrafos longos respiram em vez de
   quebrar no meio da frase.

2. **Largura interna das bolhas** — `max-w-[82%]` → **`max-w-[88%]`**
   nas três bolhas (`UserBubble`, `ThinkingBubble`, `AgentBubble`),
   pra cada bolha aproveitar a largura nova sem virar uma coluna fina
   no centro.

3. **Markdown auditado** — todos os pontos de render do `outputText`
   estão envolvidos por
   `<ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS} />`
   com a classe `agent-markdown`:
   - `AgentBubble` (assistente nas mensagens persistidas + nos runs).
   - `ThinkingBubble` (placeholder enquanto o agente está pensando).
   - Bloco "Squad final answer" do leader.
   - Bolha de `failed` (quando vem erro em vez de texto).
   - Apenas `UserBubble` segue plain text de propósito (`#` digitado pelo
     operador não pode virar heading sem querer).

## Como testar

1. Faz deploy do v98 e dá hard-refresh (Ctrl/Cmd + Shift + R).
2. Abre o **Squad Comercial → Sessions → teste de taks**.
3. Cada bolha vai mostrar:
   - Avatar real do agente (foto se houver, senão multiavatar SVG).
   - `## Passo 1` como heading H2 estilizado, `**Dor 1**` como negrito,
     `>` como blockquote, listas com bullet/numeração reais, e links
     clicáveis abrindo em nova aba.

## Pareamento

Sem mudança de back. Roda com `ok_back_v55_cron_isolated.zip` ou
`ok_back_v56_session_route.zip`.
