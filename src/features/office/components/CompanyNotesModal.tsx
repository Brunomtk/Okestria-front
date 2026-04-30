"use client";

/**
 * v135 — Company-scoped Obsidian-compatible notes vault, opened from a
 * new toolbar button next to Commercial / Squads / Cron / Chat.
 *
 * Layout: file tree on the LEFT, markdown editor + live preview on the
 * RIGHT (split view, editor and preview side-by-side). Clean, minimal.
 *
 * Responsibilities owned by this component:
 *  - Load the company's vault tree on open and on refresh.
 *  - Open / save / delete / create-new notes.
 *  - Render a side-by-side editor (textarea) + live preview using the
 *    same lightweight renderer the rest of the app uses for chat
 *    bubbles (markdown headings, lists, code, links). No fancy editor
 *    library — keeps the bundle small and the surface easy to debug.
 *
 * Multi-tenant boundary lives on the back: every endpoint reads
 * companyId from the JWT, never from the request, so this component
 * just talks plain HTTP.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Folder,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteNote,
  fetchNote,
  fetchNotesTree,
  upsertNote,
  type CompanyNote,
  type CompanyNoteTree,
} from "@/lib/notes/api";

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * v136 — When set on open, the modal pre-selects this note path
   * instead of auto-picking the most recent. Used by the graph view:
   * clicking a node in CompanyNotesGraphModal closes the graph and
   * opens this modal pointed at the chosen note.
   */
  initialPath?: string | null;
};

const MD_PLACEHOLDER = `# New note

Start writing your markdown. Use:
- \`#\` for headings
- \`**bold**\`, \`*italic*\`
- \`\`\`fenced\`\`\` code blocks
- [links](https://example.com)

This file is stored on S3 under the company's Obsidian-compatible vault.`;

const formatRelative = (iso: string): string => {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
};

/**
 * Lightweight markdown → HTML renderer. Covers the most common Obsidian
 * patterns (headings, bold, italic, code, lists, links, paragraphs)
 * without bringing in a 50KB markdown library. Handles line-by-line so
 * the operator gets a live preview without parser drama. Anything
 * weird falls through as plain text.
 */
const renderMarkdownPreview = (raw: string): string => {
  if (!raw.trim()) {
    return `<p class="text-white/30 italic">Live preview will appear here as you type.</p>`;
  }
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const lines = raw.split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeLang = "";
  let codeBuf: string[] = [];
  let inList = false;
  let listOrdered = false;
  let paragraphBuf: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuf.length === 0) return;
    let text = paragraphBuf.join(" ");
    text = escapeHtml(text)
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1 text-[12px] text-cyan-200">$1</code>')
      // Links
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noreferrer noopener" class="text-cyan-300 underline-offset-2 hover:underline">$1</a>',
      )
      // Wiki-link [[Note]] — render as a styled chip (not yet routable)
      .replace(
        /\[\[([^\]]+)\]\]/g,
        '<span class="rounded bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200">$1</span>',
      );
    out.push(`<p class="my-2 leading-6 text-white/85">${text}</p>`);
    paragraphBuf = [];
  };

  const flushList = () => {
    if (!inList) return;
    out.push(listOrdered ? "</ol>" : "</ul>");
    inList = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      flushParagraph();
      flushList();
      if (!inCode) {
        inCode = true;
        codeLang = line.trim().slice(3).trim();
        codeBuf = [];
      } else {
        out.push(
          `<pre class="my-2 overflow-x-auto rounded-lg border border-white/10 bg-black/45 p-3 text-[12.5px] leading-5 text-emerald-100/85"><code data-lang="${escapeHtml(codeLang)}">${escapeHtml(codeBuf.join("\n"))}</code></pre>`,
        );
        inCode = false;
        codeLang = "";
        codeBuf = [];
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // Headings
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const sizes = ["text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-sm"];
      const size = sizes[level - 1] ?? "text-base";
      out.push(
        `<h${level} class="mt-4 mb-1 ${size} font-semibold text-white">${escapeHtml(heading[2])}</h${level}>`,
      );
      continue;
    }

    // Lists
    const ulMatch = /^[-*]\s+(.+)$/.exec(line);
    const olMatch = /^(\d+)[.)]\s+(.+)$/.exec(line);
    if (ulMatch || olMatch) {
      flushParagraph();
      const ordered = !!olMatch;
      const item = (ulMatch ? ulMatch[1] : olMatch![2]) ?? "";
      if (!inList || listOrdered !== ordered) {
        flushList();
        inList = true;
        listOrdered = ordered;
        out.push(ordered ? '<ol class="my-2 list-decimal pl-6 text-white/85">' : '<ul class="my-2 list-disc pl-6 text-white/85">');
      }
      out.push(`<li class="my-0.5">${escapeHtml(item)}</li>`);
      continue;
    }

    // Blank → paragraph break
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    paragraphBuf.push(line);
  }

  if (inCode) {
    out.push(
      `<pre class="my-2 overflow-x-auto rounded-lg border border-white/10 bg-black/45 p-3 text-[12.5px] leading-5 text-emerald-100/85"><code>${codeBuf.join("\n")}</code></pre>`,
    );
  }
  flushParagraph();
  flushList();

  return out.join("");
};

export function CompanyNotesModal({ open, onClose, initialPath }: Props) {
  const [tree, setTree] = useState<CompanyNoteTree | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  // v136 — When the modal is opened from the graph view, jump straight
  // to the requested path. Tracks the last initialPath we honoured so a
  // re-render with the same prop doesn't fight the operator's
  // subsequent clicks.
  const lastHonouredInitialRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      lastHonouredInitialRef.current = null;
      return;
    }
    const next = (initialPath ?? "").trim();
    if (!next) return;
    if (lastHonouredInitialRef.current === next) return;
    lastHonouredInitialRef.current = next;
    setSelectedPath(next);
  }, [open, initialPath]);
  const [body, setBody] = useState("");
  const [originalBody, setOriginalBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastLoadedPathRef = useRef<string | null>(null);

  const isDirty = body !== originalBody;

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchNotesTree();
      setTree(next);
      // Auto-select the most-recently-modified note when nothing was
      // selected before — saves the operator a click on first open.
      if (!selectedPath && next.notes.length > 0) {
        const mostRecent = [...next.notes].sort(
          (a, b) =>
            new Date(b.lastModifiedUtc).getTime() - new Date(a.lastModifiedUtc).getTime(),
        )[0];
        if (mostRecent) setSelectedPath(mostRecent.path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedPath]);

  useEffect(() => {
    if (!open) return;
    void loadTree();
  }, [open, loadTree]);

  // Load the body whenever the selected path changes.
  useEffect(() => {
    if (!open || !selectedPath) return;
    if (lastLoadedPathRef.current === selectedPath) return;
    lastLoadedPathRef.current = selectedPath;
    setError(null);
    setLoading(true);
    void fetchNote(selectedPath)
      .then((note) => {
        const fresh = note?.body ?? "";
        setBody(fresh);
        setOriginalBody(fresh);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [open, selectedPath]);

  const groupedTree = useMemo(() => {
    const map = new Map<string, CompanyNote[]>();
    for (const note of tree?.notes ?? []) {
      const key = note.folder || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(note);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tree]);

  const handleSave = async () => {
    if (!selectedPath) return;
    setSaving(true);
    setError(null);
    try {
      await upsertNote({ path: selectedPath, body });
      setOriginalBody(body);
      // Refresh tree metadata so size/last-modified are fresh.
      void loadTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPath) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete "${selectedPath}"? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteNote(selectedPath);
      setSelectedPath(null);
      setBody("");
      setOriginalBody("");
      lastLoadedPathRef.current = null;
      void loadTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateNew = () => {
    const today = new Date().toISOString().slice(0, 10);
    const proposed = `journal/${today}.md`;
    const path =
      typeof window !== "undefined"
        ? window.prompt("Path for the new note (must end with .md):", proposed)
        : proposed;
    if (!path) return;
    const trimmed = path.trim().replace(/^\/+/, "");
    if (!trimmed) return;
    setSelectedPath(trimmed);
    lastLoadedPathRef.current = trimmed;
    setBody(MD_PLACEHOLDER);
    setOriginalBody("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={() => {
          if (saving || deleting) return;
          if (isDirty && !window.confirm("You have unsaved changes. Close anyway?")) return;
          onClose();
        }}
      />
      <section className="relative z-[121] flex max-h-[100vh] w-full max-w-[1480px] flex-col overflow-hidden rounded-none border border-cyan-400/25 bg-[#0b0e14] shadow-[0_30px_120px_rgba(0,0,0,0.7)] sm:max-h-[92vh] sm:rounded-2xl"
        style={{ width: "min(1480px, 100vw)" }}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30 sm:h-12 sm:w-12">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
              Notes vault
            </div>
            <h2 className="mt-0.5 text-base font-semibold text-white">
              Company notebook
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-white/55">
              Obsidian-compatible markdown · synced to S3 · operator + agents share the same vault
            </p>
          </div>
          <button
            type="button"
            onClick={loadTree}
            disabled={loading}
            title="Refresh from S3"
            aria-label="Refresh"
            className="shrink-0 rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white disabled:opacity-40 sm:p-2"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* ── Left: file tree ─────────────────────────────────────── */}
          <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-black/20 sm:w-72 sm:border-b-0 sm:border-r">
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                  {tree?.totalCount ?? 0} note{tree?.totalCount === 1 ? "" : "s"}
                </div>
                <div className="text-[11px] text-white/35">vault · default</div>
              </div>
              <button
                type="button"
                onClick={handleCreateNew}
                title="New note"
                aria-label="New note"
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-100 transition hover:border-cyan-400/55 hover:bg-cyan-500/20"
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {loading && !tree ? (
                <div className="flex items-center gap-2 px-3 py-3 text-[12px] text-white/45">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : tree && tree.totalCount === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center text-[12px] text-white/40">
                  No notes yet. Hit <span className="text-white/70">New</span> to create the first one.
                </div>
              ) : (
                groupedTree.map(([folder, notes]) => (
                  <div key={folder || "__root"} className="mb-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                      <Folder className="h-3 w-3" />
                      {folder || "(root)"}
                      <span className="ml-auto text-white/25">{notes.length}</span>
                    </div>
                    {notes.map((note) => (
                      <button
                        key={note.path}
                        type="button"
                        onClick={() => setSelectedPath(note.path)}
                        className={`block w-full truncate rounded-lg px-3 py-1.5 text-left text-[12.5px] transition ${
                          selectedPath === note.path
                            ? "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-500/30"
                            : "text-white/65 hover:bg-white/5 hover:text-white"
                        }`}
                        title={`${note.path} · ${formatRelative(note.lastModifiedUtc)}`}
                      >
                        <div className="truncate">{note.title}</div>
                        <div className="mt-0.5 truncate font-mono text-[10px] text-white/35">
                          {formatRelative(note.lastModifiedUtc)} · {note.sizeBytes}b
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* ── Right: editor + preview ────────────────────────────── */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {selectedPath ? (
              <>
                <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.015] px-4 py-2">
                  <FileText className="h-3.5 w-3.5 text-cyan-300/80" />
                  <span className="truncate font-mono text-[12px] text-white/80">{selectedPath}</span>
                  {isDirty ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-200">
                      unsaved
                    </span>
                  ) : null}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving || deleting}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/35 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-40"
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !isDirty}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/45 bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold text-cyan-50 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save
                    </button>
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={MD_PLACEHOLDER}
                    spellCheck={false}
                    className="min-h-[40vh] flex-1 resize-none border-b border-white/10 bg-transparent px-5 py-4 font-mono text-[13px] leading-6 text-white outline-none placeholder:text-white/25 lg:min-h-0 lg:w-1/2 lg:border-b-0 lg:border-r"
                  />
                  <div
                    className="prose prose-invert min-h-[30vh] flex-1 overflow-y-auto px-5 py-4 text-[13px] leading-6 text-white/85 lg:w-1/2"
                    dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(body) }}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-[13px] text-white/30">
                {tree && tree.totalCount > 0
                  ? "Pick a note from the left, or hit New to start fresh."
                  : "No notes yet. Hit New (top-left of this panel) to create the first one."}
              </div>
            )}

            {error ? (
              <div className="border-t border-rose-400/30 bg-rose-500/10 px-5 py-2 text-[12px] text-rose-200">
                {error}
              </div>
            ) : null}
          </main>
        </div>
      </section>
    </div>
  );
}
