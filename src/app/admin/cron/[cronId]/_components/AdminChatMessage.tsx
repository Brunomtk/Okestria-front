"use client";

/**
 * v150 — Admin · markdown-rendered chat message bubble.
 *
 * Used inside the cron job detail's run history. Renders the
 * agent's reply as proper markdown (so `**bold**`, lists,
 * headings, links, code blocks, quotes all show up the way the
 * operator expects) instead of the raw `**`-littered string the
 * pre tag was showing.
 */

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ComponentProps } from "react";
import type { Components } from "react-markdown";
import { ChevronDown, ChevronUp } from "lucide-react";

const MAX_COLLAPSED_CHARS = 1400;

function MarkdownLink({ href, children, ...rest }: ComponentProps<"a">) {
  const url = (href ?? "").trim();
  const isExternal = /^https?:\/\//i.test(url);
  return (
    <a
      {...rest}
      href={url || "#"}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="text-cyan-200 underline decoration-cyan-400/40 underline-offset-2 transition hover:decoration-cyan-300/80"
    >
      {children}
    </a>
  );
}

const COMPONENTS: Components = {
  a: MarkdownLink,
  h1: (props) => (
    <h2
      className="mt-3 mb-1.5 text-[14px] font-semibold tracking-tight text-white"
      {...props}
    />
  ),
  h2: (props) => (
    <h3
      className="mt-3 mb-1.5 text-[13.5px] font-semibold tracking-tight text-white"
      {...props}
    />
  ),
  h3: (props) => (
    <h4
      className="mt-3 mb-1 text-[12.5px] font-semibold uppercase tracking-[0.18em] text-white/70"
      {...props}
    />
  ),
  p: (props) => (
    <p
      className="mb-2 whitespace-pre-wrap text-[13px] leading-relaxed text-white/85 last:mb-0"
      {...props}
    />
  ),
  strong: (props) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  em: (props) => <em className="italic text-white/85" {...props} />,
  ul: (props) => (
    <ul
      className="my-1.5 ml-4 list-disc space-y-1 marker:text-cyan-400/50 [&_li]:text-[13px] [&_li]:leading-relaxed [&_li]:text-white/85"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="my-1.5 ml-5 list-decimal space-y-1 marker:font-mono marker:text-cyan-400/60 [&_li]:text-[13px] [&_li]:leading-relaxed [&_li]:text-white/85"
      {...props}
    />
  ),
  li: (props) => <li {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-2 border-l-2 border-cyan-400/40 bg-white/[0.02] px-3 py-1.5 text-[12.5px] italic text-white/75"
      {...props}
    />
  ),
  hr: () => (
    <hr className="my-3 border-0 border-t border-white/8" />
  ),
  code: (props) => {
    const { className, children, ...rest } = props as ComponentProps<"code">;
    const isInline = !/language-/.test(className ?? "");
    if (isInline) {
      return (
        <code
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11.5px] text-cyan-100"
          {...rest}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="block overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11.5px] leading-relaxed text-cyan-100/90"
        {...rest}
      >
        {children}
      </code>
    );
  },
  pre: (props) => <pre className="my-2 overflow-x-auto" {...props} />,
  table: (props) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-white/10">
      <table
        className="w-full border-collapse text-[12px] [&_td]:border-t [&_td]:border-white/8 [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-white/85 [&_th]:border-b [&_th]:border-white/10 [&_th]:bg-white/[0.04] [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-mono [&_th]:text-[10.5px] [&_th]:uppercase [&_th]:tracking-[0.18em] [&_th]:text-white/55"
        {...props}
      />
    </div>
  ),
};

export function AdminChatMessage({ content }: { content: string }) {
  const text = (content ?? "").trim();
  const overflows = text.length > MAX_COLLAPSED_CHARS;
  const [expanded, setExpanded] = useState(false);

  const visible = useMemo(() => {
    if (!overflows || expanded) return text;
    // Cut on a paragraph boundary if possible to avoid mid-sentence break.
    const cutAt = MAX_COLLAPSED_CHARS;
    const candidate = text.slice(0, cutAt);
    const lastBreak = candidate.lastIndexOf("\n\n");
    return lastBreak > MAX_COLLAPSED_CHARS / 2
      ? candidate.slice(0, lastBreak)
      : candidate;
  }, [text, overflows, expanded]);

  if (!text) {
    return (
      <p className="text-[12.5px] italic text-white/40">(empty reply)</p>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`overflow-hidden rounded-2xl rounded-tl-sm border border-white/10 bg-black/30 px-4 py-3 transition-all ${
          overflows && !expanded ? "max-h-[28rem]" : ""
        }`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
          {visible}
        </ReactMarkdown>
      </div>
      {overflows ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              View full reply ({text.length.toLocaleString()} chars)
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
