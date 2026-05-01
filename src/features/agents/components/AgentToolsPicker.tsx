"use client";

/**
 * v168 — Tools picker shown above the TOOLS.md textarea in both the
 * agent create wizard and the agent editor (AgentBrainPanel).
 *
 * What it does:
 *   • Lists every auto-injected recipe the runtime composer (back v84)
 *     can append to TOOLS.md — Notes Vault (Obsidian-compatible) and
 *     the Instagram Apify scraper today, more later. Each recipe is
 *     a card with a short description and a "what runs" preview.
 *   • The recipes are NOT toggleable — they're auto-injected by the
 *     back when configured, and the operator can't disable them at
 *     the agent level (it's a per-company contract). The card shows
 *     "auto-injected" so the operator knows it's coming.
 *   • Offers a one-click "Insert template" button that drops a sane
 *     starter template into the operator-authored portion of TOOLS,
 *     so a freshly created agent isn't staring at an empty box.
 *   • Shows a live preview of the composed TOOLS.md (operator content
 *     + the v84 marker block + the auto-injected recipes), so the
 *     operator can verify exactly what the runtime will see.
 */

import { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Camera,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Wand2,
} from "lucide-react";
import { AGENT_TOOLS_TEMPLATE } from "@/lib/agents/agentFiles";

type ToolRecipe = {
  id: "notes-vault" | "instagram-apify";
  icon: typeof BookOpen;
  title: string;
  oneLiner: string;
  description: string;
  /**
   * Mirrors what AgentRecipeComposer.cs writes into TOOLS.md when the
   * recipe is enabled — kept terse so it fits in a card preview.
   */
  what: string;
};

const RECIPES: ToolRecipe[] = [
  {
    id: "notes-vault",
    icon: BookOpen,
    title: "Notes Vault (Obsidian-compatible)",
    oneLiner: "Persistent markdown notes on S3 — same vault the operator opens in Obsidian.",
    description:
      "Lets the agent write durable notes the operator (and other agents) can read. Path conventions: briefings/, leads/, playbooks/, journal/. Idempotent: same path overwrites.",
    what: "POST /api/CompanyNotes/agent/{companyId}/note  (X-Bridge-Token)",
  },
  {
    id: "instagram-apify",
    icon: Camera,
    title: "Instagram scraper (Apify)",
    oneLiner: "Third-party Instagram reads via Apify when Meta Graph can't reach.",
    description:
      "POST handles[] / hashtags[] / directUrls[]. Daily and per-call caps enforced; results persist to scrapes/instagram/ in the vault by default.",
    what: "POST /api/InstagramScrape/agent/{companyId}/run  (X-Bridge-Token)",
  },
];

const MARKER_START = "<!-- okestria:auto-tools:start -->";
const MARKER_END = "<!-- okestria:auto-tools:end -->";

/** Strip any v84 managed section from previously-loaded TOOLS content
 *  so the operator's textarea only ever shows their authored block. */
export function stripAutoToolsSection(content: string): string {
  if (!content) return "";
  const startIdx = content.indexOf(MARKER_START);
  if (startIdx < 0) return content;
  const endIdx = content.indexOf(MARKER_END, startIdx);
  if (endIdx < 0) {
    return content.slice(0, startIdx).trimEnd();
  }
  const before = content.slice(0, startIdx).trimEnd();
  const after = content.slice(endIdx + MARKER_END.length).trimStart();
  if (!after) return before;
  return `${before}\n\n${after}`;
}

export function AgentToolsPicker({
  value,
  onChange,
  enabledRecipes,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Optional override — defaults to all recipes shown. The runtime
   *  decides what actually gets injected based on company config; this
   *  prop just lets us hide cards that we know are off (e.g. company
   *  has no Apify wired). */
  enabledRecipes?: Array<ToolRecipe["id"]>;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const visibleRecipes = enabledRecipes
    ? RECIPES.filter((r) => enabledRecipes.includes(r.id))
    : RECIPES;

  const handleInsertTemplate = () => {
    if (!value.trim()) {
      onChange(AGENT_TOOLS_TEMPLATE);
      return;
    }
    // Confirm before clobbering existing operator content.
    const ok =
      typeof window !== "undefined"
        ? window.confirm(
            "Replace the current TOOLS notes with the starter template? Your existing content will be lost.",
          )
        : true;
    if (ok) onChange(AGENT_TOOLS_TEMPLATE);
  };

  const composedPreview = buildComposedPreview(value, visibleRecipes);

  return (
    <div className="space-y-4">
      {/* Heading + insert-template button */}
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/[0.08] to-violet-500/[0.05] px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cyan-200/80">
            Tools available to this agent
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-white/75">
            The runtime composer auto-injects the recipes below into{" "}
            <span className="font-mono text-cyan-200/85">TOOLS.md</span> at session start.
            Anything you type in the textarea further down is preserved as the operator
            block above the auto-injected section.
          </p>
        </div>
        <button
          type="button"
          onClick={handleInsertTemplate}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/45 bg-cyan-500/15 px-3 py-1.5 text-[11.5px] font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {value.trim() ? "Replace with template" : "Insert template"}
        </button>
      </div>

      {/* Recipe cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {visibleRecipes.map((recipe) => {
          const Icon = recipe.icon;
          return (
            <div
              key={recipe.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-white">
                      {recipe.title}
                    </span>
                    <span className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-200">
                      auto
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/65">
                    {recipe.oneLiner}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-white/55">
                {recipe.description}
              </p>
              <p className="mt-2 break-words font-mono text-[10px] text-cyan-200/65">
                {recipe.what}
              </p>
            </div>
          );
        })}
      </div>

      {/* If no recipes visible, gentle warning */}
      {visibleRecipes.length === 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] px-3 py-2 text-[12px] text-amber-100/85">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No auto-inject recipes are wired for this company. The agent will only see
            the operator-authored TOOLS notes below.
          </span>
        </div>
      ) : null}

      {/* Composed preview */}
      <details
        open={previewOpen}
        onToggle={(e) => setPreviewOpen((e.target as HTMLDetailsElement).open)}
        className="rounded-xl border border-white/10 bg-black/30"
      >
        <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 transition hover:bg-white/[0.03]">
          <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300/70" />
            Composed TOOLS.md preview ({composedPreview.length} chars)
          </span>
          {previewOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-white/55" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-white/55" />
          )}
        </summary>
        <pre className="m-3 mt-0 max-h-72 overflow-auto rounded-lg border border-white/8 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-cyan-100/85">
          {composedPreview}
        </pre>
      </details>
    </div>
  );
}

/**
 * v168 — Browser-side composed preview that mirrors what the back's
 * AgentRecipeComposer.ComposeToolsFile produces. Strict text parity
 * isn't required (the actual recipe text is generated server-side
 * with the company's hookBaseUrl + token), so we render a compact
 * placeholder for each recipe block instead.
 */
function buildComposedPreview(operatorContent: string, recipes: ToolRecipe[]): string {
  const op = stripAutoToolsSection(operatorContent ?? "").trim();
  if (recipes.length === 0) return op;

  const lines: string[] = [];
  if (op) {
    lines.push(op);
    lines.push("");
    lines.push("");
  }
  lines.push(MARKER_START);
  lines.push("<!--");
  lines.push("  Auto-injected by Okestria so the chat agent has the same recipes");
  lines.push("  cron + squad get at dispatch time. Edit your operator-authored");
  lines.push("  TOOLS notes ABOVE this marker — anything between the markers is");
  lines.push("  rewritten on every profile sync.");
  lines.push("-->");
  for (const recipe of recipes) {
    lines.push("");
    lines.push(`## ${recipe.title.toUpperCase()}`);
    lines.push("");
    lines.push(recipe.oneLiner);
    lines.push("");
    lines.push("Endpoint (filled in at runtime with your hookBaseUrl + token):");
    lines.push("```");
    lines.push(recipe.what);
    lines.push("```");
    lines.push("");
  }
  lines.push("");
  lines.push(MARKER_END);
  return lines.join("\n");
}
