import type { ComponentProps } from "react";
import type { Components } from "react-markdown";

/**
 * Shared <ReactMarkdown> component overrides for chat bubbles in the
 * cron + squad surfaces. Mirrors the agent chat treatment:
 *   - Real anchors for every link (markdown link, autolink, raw URL).
 *   - Always opens external URLs in a new tab with safe rel attributes.
 *   - Subtle amber accent that matches the cron HUD palette.
 */
function MarkdownLink({ href, children, ...rest }: ComponentProps<"a">) {
  const url = (href ?? "").trim();
  const isExternal = /^https?:\/\//i.test(url);
  return (
    <a
      {...rest}
      href={url || "#"}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="text-amber-200 underline decoration-amber-400/40 underline-offset-2 transition hover:decoration-amber-300/80"
    >
      {children}
    </a>
  );
}

export const MARKDOWN_COMPONENTS: Components = {
  a: MarkdownLink,
  // Tighten heading sizes a notch so they don't dwarf the body text in a
  // chat bubble (CSS already gives them weight + spacing).
  h1: (props) => <h2 className="text-base text-white" {...props} />,
  h2: (props) => <h3 className="text-[15px] text-white" {...props} />,
  h3: (props) => <h4 className="text-sm font-semibold text-white" {...props} />,
};
