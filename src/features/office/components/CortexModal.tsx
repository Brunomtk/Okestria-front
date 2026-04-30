"use client";

/**
 * v138 — CORTEX. Single unified modal for the company-scoped notes
 * vault: 3D force-directed knowledge graph + markdown editor in one
 * surface. Replaces the v135/v136 pair (CompanyNotesModal +
 * CompanyNotesGraphModal).
 *
 * Naming
 * ------
 *   "Cortex" — short, technical, evocative of brain + connections.
 *   The graph is the cortex's wiring; the editor is the cortex's
 *   memory. Same vault on the back, same S3 bucket — just one
 *   front surface so the operator never has to juggle two windows.
 *
 * Modes
 * -----
 *   • `graph`   — fullscreen 3D Three.js canvas. Drag-to-rotate,
 *                  scroll-to-zoom, click-and-hold a node to drag it.
 *                  Hover lights up the node + its neighbours and dims
 *                  the rest. Tag nodes pulse with a slight glow.
 *                  Edges get particle flows so the brain "thinks".
 *                  Click any note node → switches to `editor` mode
 *                  with that note loaded.
 *   • `editor`  — file tree (folders) on the left, markdown editor
 *                  + live preview on the right. "Back to graph"
 *                  button brings the operator back without dropping
 *                  the camera position.
 *
 * Multi-tenant boundary lives on the back (companyId comes from JWT).
 * This component just talks plain HTTP via lib/notes/api.ts.
 */

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  FileText,
  Focus,
  Folder,
  Hash,
  Loader2,
  Maximize2,
  Network,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  Trash2,
  X as XIcon,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  deleteNote,
  fetchNote,
  fetchNotesGraph,
  fetchNotesTree,
  upsertNote,
  type CompanyNote,
  type CompanyNoteGraph,
  type CompanyNoteGraphLink,
  type CompanyNoteGraphNode,
  type CompanyNoteTree,
} from "@/lib/notes/api";

// ─────────────────────────────────────────────────────────────────────
// react-force-graph-2d uses `window` at import time, so we dynamic-
// import a tiny ref-forwarding wrapper instead of the lib directly.
// The wrapper preserves the imperative methods we need (`zoom`,
// `centerAt`, `zoomToFit`, `d3Force`) across the next/dynamic
// boundary.
// ─────────────────────────────────────────────────────────────────────
const ForceGraph = dynamic(
  () => import("./CortexForceGraph"),
  { ssr: false },
);

// ─────────────────────────────────────────────────────────────────────
// Visual palette
// ─────────────────────────────────────────────────────────────────────

/** Folder palette — distinct, high-contrast against the deep navy bg. */
const FOLDER_PALETTE = [
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fbbf24", // amber
  "#fb7185", // rose
  "#60a5fa", // blue
  "#f472b6", // pink
  "#a3e635", // lime
  "#fda4af", // light rose
  "#7dd3fc", // sky
];
const TAG_COLOR = "#f59e0b"; // amber-500
const ROOT_COLOR = "#94a3b8"; // slate-400

const folderColorFor = (folders: string[]) => {
  const map = new Map<string, string>();
  folders.forEach((f, i) => map.set(f, FOLDER_PALETTE[i % FOLDER_PALETTE.length]!));
  return (folder: string | null | undefined) => {
    if (!folder) return ROOT_COLOR;
    return map.get(folder) ?? ROOT_COLOR;
  };
};

// ─────────────────────────────────────────────────────────────────────
// Lightweight markdown → HTML preview (port of v135 renderer)
// ─────────────────────────────────────────────────────────────────────

const MD_PLACEHOLDER = `# New note

Start writing your markdown. Use:
- \`#\` for headings
- \`**bold**\`, \`*italic*\`
- \`\`\`fenced\`\`\` code blocks
- [[wiki-links]] to other notes
- \`#tags\` to cluster ideas

This file is stored on S3 under the company's vault. The graph view picks up wiki-links + tags automatically.`;

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

const renderMarkdownPreview = (raw: string): string => {
  if (!raw.trim()) {
    return `<p class="text-white/30 italic">Live preview will appear here as you type.</p>`;
  }
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

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
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1 text-[12px] text-cyan-200">$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener" class="text-cyan-300 underline-offset-2 hover:underline">$1</a>')
      .replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, '<span class="rounded bg-violet-500/15 px-1.5 py-0.5 font-mono text-[11px] text-violet-200">$1</span>')
      .replace(/(?<![\w])#([A-Za-z][\w-]*)/g, '<span class="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px] text-amber-200">#$1</span>');
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
    if (line.trimStart().startsWith("```")) {
      flushParagraph();
      flushList();
      if (!inCode) {
        inCode = true;
        codeLang = line.trim().slice(3).trim();
        codeBuf = [];
      } else {
        out.push(`<pre class="my-2 overflow-x-auto rounded-lg border border-white/10 bg-black/45 p-3 text-[12.5px] leading-5 text-emerald-100/85"><code data-lang="${escapeHtml(codeLang)}">${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
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
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const sizes = ["text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-sm"];
      const size = sizes[level - 1] ?? "text-base";
      out.push(`<h${level} class="mt-4 mb-1 ${size} font-semibold text-white">${escapeHtml(heading[2])}</h${level}>`);
      continue;
    }
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
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }
    paragraphBuf.push(line);
  }
  if (inCode) {
    out.push(`<pre class="my-2 overflow-x-auto rounded-lg border border-white/10 bg-black/45 p-3 text-[12.5px] leading-5 text-emerald-100/85"><code>${codeBuf.join("\n")}</code></pre>`);
  }
  flushParagraph();
  flushList();
  return out.join("");
};

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

type ViewMode = "graph" | "editor";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Open straight into a specific note (jump from elsewhere in the app). */
  initialPath?: string | null;
  /** Default mode when the modal opens. Defaults to "graph". */
  initialView?: ViewMode;
};

type GraphNodeRich = CompanyNoteGraphNode & {
  // extra runtime fields injected by the force simulation
  x?: number; y?: number; z?: number;
  vx?: number; vy?: number; vz?: number;
  __color?: string;
};
type GraphLinkRich = CompanyNoteGraphLink & {
  // force-graph mutates source/target into objects after sim starts;
  // we keep the original ids around for our own bookkeeping.
  __srcId?: string; __tgtId?: string;
};

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export function CortexModal({ open, onClose, initialPath, initialView = "graph" }: Props) {
  // ── Outer mode + shared state ──────────────────────────────────────
  const [mode, setMode] = useState<ViewMode>(initialView);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Honour the initialPath / initialView when the modal is (re-)opened.
  const lastHonouredOpenRef = useRef<{ path: string | null; view: ViewMode } | null>(null);
  useEffect(() => {
    if (!open) {
      lastHonouredOpenRef.current = null;
      return;
    }
    const next = { path: (initialPath ?? null), view: initialView };
    if (
      lastHonouredOpenRef.current &&
      lastHonouredOpenRef.current.path === next.path &&
      lastHonouredOpenRef.current.view === next.view
    ) {
      return;
    }
    lastHonouredOpenRef.current = next;
    if (next.path) setSelectedPath(next.path);
    setMode(next.view);
  }, [open, initialPath, initialView]);

  // ── Graph data ─────────────────────────────────────────────────────
  const [graph, setGraph] = useState<CompanyNoteGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  const loadGraph = useCallback(async () => {
    setGraphLoading(true);
    setError(null);
    try {
      const next = await fetchNotesGraph();
      setGraph(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGraphLoading(false);
    }
  }, []);

  // ── Editor data ────────────────────────────────────────────────────
  const [tree, setTree] = useState<CompanyNoteTree | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [body, setBody] = useState("");
  const [originalBody, setOriginalBody] = useState("");
  const [editorBusy, setEditorBusy] = useState(false);
  const lastLoadedPathRef = useRef<string | null>(null);
  const isDirty = body !== originalBody;

  const loadTree = useCallback(async () => {
    setTreeLoading(true);
    setError(null);
    try {
      const next = await fetchNotesTree();
      setTree(next);
      // Auto-select the most-recently-modified note when nothing is
      // selected — saves a click on first open in editor mode.
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
      setTreeLoading(false);
    }
  }, [selectedPath]);

  // Open: load graph (always — both modes need it for stats/legend) and
  // tree (cheap; lets us pre-warm the editor side).
  useEffect(() => {
    if (!open) return;
    void loadGraph();
    void loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load body whenever selectedPath changes.
  useEffect(() => {
    if (!open || !selectedPath) return;
    if (lastLoadedPathRef.current === selectedPath) return;
    lastLoadedPathRef.current = selectedPath;
    setError(null);
    setEditorBusy(true);
    void fetchNote(selectedPath)
      .then((note) => {
        const fresh = note?.body ?? "";
        setBody(fresh);
        setOriginalBody(fresh);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setEditorBusy(false));
  }, [open, selectedPath]);

  const handleSave = async () => {
    if (!selectedPath) return;
    setEditorBusy(true);
    setError(null);
    try {
      await upsertNote({ path: selectedPath, body });
      setOriginalBody(body);
      void loadTree();
      // Refresh the graph too — wiki-links / tags may have changed.
      void loadGraph();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditorBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPath) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete "${selectedPath}"? This can't be undone.`)) return;
    setEditorBusy(true);
    setError(null);
    try {
      await deleteNote(selectedPath);
      setSelectedPath(null);
      setBody("");
      setOriginalBody("");
      lastLoadedPathRef.current = null;
      void loadTree();
      void loadGraph();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditorBusy(false);
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
    setMode("editor");
  };

  // Click a node in the 3D graph → jump to editor at that path.
  const handleNodeClick = useCallback(
    (node: GraphNodeRich) => {
      if (node.kind !== "note") return; // tag nodes don't open an editor
      setSelectedPath(node.id);
      lastLoadedPathRef.current = null; // force reload the body
      setMode("editor");
    },
    [],
  );

  // Close guard for unsaved edits.
  const safeClose = () => {
    if (editorBusy) return;
    if (
      isDirty &&
      typeof window !== "undefined" &&
      !window.confirm("You have unsaved changes. Close anyway?")
    ) {
      return;
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 px-3 py-3 backdrop-blur-md sm:px-4 sm:py-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cortex-modal-title"
    >
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={safeClose}
      />

      <section
        className="relative z-[151] flex h-[96vh] w-full max-w-[1640px] flex-col overflow-hidden rounded-2xl border border-violet-400/25 shadow-[0_40px_140px_rgba(0,0,0,0.85)]"
        style={{
          width: "min(1640px, 100vw)",
          background:
            "radial-gradient(ellipse at top, rgba(76,29,149,0.30) 0%, rgba(15,23,42,0.95) 45%, rgba(2,6,23,0.99) 100%)",
        }}
      >
        {/* Top hairline */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/55 to-transparent" />

        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/15 px-5 py-3 backdrop-blur sm:px-6 sm:py-4">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-violet-400/35"
            style={{
              background:
                "radial-gradient(circle at 30% 25%, rgba(167,139,250,0.55), rgba(76,29,149,0.4) 60%, rgba(30,27,75,0.85) 100%)",
              boxShadow:
                "0 8px 24px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            <Brain className="h-5 w-5 text-violet-100" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-300/85">
              Cortex
            </div>
            <h2 id="cortex-modal-title" className="mt-0.5 text-[17px] font-semibold tracking-tight text-white">
              Knowledge graph + notes
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-white/55">
              {graph
                ? `${graph.nodes.filter((n) => n.kind === "note").length} notes · ${graph.tags.length} tags · ${graph.links.length} links`
                : "Loading the company's vault…"}
            </p>
          </div>

          {/* Mode tabs */}
          <nav
            role="tablist"
            aria-label="Cortex mode"
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1"
          >
            <ModeTab
              active={mode === "graph"}
              onClick={() => setMode("graph")}
              icon={<Network className="h-3.5 w-3.5" />}
              label="Graph"
            />
            <ModeTab
              active={mode === "editor"}
              onClick={() => setMode("editor")}
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Editor"
            />
          </nav>

          <button
            type="button"
            onClick={() => {
              if (mode === "graph") void loadGraph();
              else void loadTree();
            }}
            disabled={graphLoading || treeLoading}
            title="Refresh"
            aria-label="Refresh"
            className="ml-1 shrink-0 rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <RefreshCcw className={`h-4 w-4 ${graphLoading || treeLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={safeClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {mode === "graph" ? (
            <GraphView
              graph={graph}
              loading={graphLoading}
              onNodeClick={handleNodeClick}
              onOpenSelected={(path) => {
                setSelectedPath(path);
                lastLoadedPathRef.current = null;
                setMode("editor");
              }}
            />
          ) : (
            <EditorView
              tree={tree}
              loading={treeLoading || editorBusy}
              selectedPath={selectedPath}
              onSelect={(p) => setSelectedPath(p)}
              onCreateNew={handleCreateNew}
              body={body}
              onBodyChange={setBody}
              isDirty={isDirty}
              onSave={handleSave}
              onDelete={handleDelete}
              onBackToGraph={() => setMode("graph")}
            />
          )}

          {error ? (
            <div className="absolute inset-x-0 bottom-0 border-t border-rose-400/30 bg-rose-500/15 px-5 py-2 text-[12px] text-rose-100 backdrop-blur">
              {error}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Mode tab pill
// ─────────────────────────────────────────────────────────────────────

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition ${
        active
          ? "bg-violet-500/20 text-violet-50 ring-1 ring-violet-400/45"
          : "text-white/55 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// GRAPH VIEW — 2D Obsidian-style knowledge graph
//
// Why 2D and not 3D: Obsidian's graph is the platonic ideal for a
// "knowledge brain" — 2D plane, smooth wheel-zoom, drag-to-pan, drag-
// nodes-to-rearrange, halos with additive blend, labels that fade in
// at higher zooms. 3D looked cool for ~5 seconds and then made every
// task harder ("which way am I rotating? where's my note?"). 2D wins
// on usability and animation feel.
// ─────────────────────────────────────────────────────────────────────

// ── Canvas helpers ─────────────────────────────────────────────────

const HEX_RE = /^#([0-9a-f]{6})$/i;

function withAlpha(hex: string, alpha: number): string {
  const m = HEX_RE.exec(hex);
  if (!m) return hex;
  const v = m[1]!;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function truncateLabel(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}


function GraphView({
  graph,
  loading,
  onNodeClick,
  onOpenSelected,
}: {
  graph: CompanyNoteGraph | null;
  loading: boolean;
  onNodeClick: (node: GraphNodeRich) => void;
  onOpenSelected: (path: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // The lib instance — typed as `any` because the imperative API isn't
  // exported as a clean TypeScript surface and we only call a handful
  // of methods (zoom, centerAt, zoomToFit, d3Force, d3ReheatSimulation).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  // ── Selection state ─────────────────────────────────────────────
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Filters (Obsidian sections) ────────────────────────────────
  const [showTags, setShowTags] = useState(true);
  const [showOrphans, setShowOrphans] = useState(true);

  // ── Display sliders ────────────────────────────────────────────
  const [nodeSizeMul, setNodeSizeMul] = useState(1.0);
  const [linkThicknessMul, setLinkThicknessMul] = useState(1.0);
  const [textFadeStart, setTextFadeStart] = useState(1.4);
  const [animateEdges, setAnimateEdges] = useState(true);

  // ── Force sliders (rewires d3 in real time) ────────────────────
  const [centerForce, setCenterForce] = useState(0.18);
  const [repelForce, setRepelForce] = useState(180);
  const [linkDistance, setLinkDistance] = useState(60);
  const [linkStrength, setLinkStrength] = useState(0.55);

  // ── Settings panel section open/close ──────────────────────────
  const [section, setSection] = useState({
    filters: true,
    groups: true,
    display: false,
    forces: false,
  });
  const toggleSection = (k: keyof typeof section) =>
    setSection((s) => ({ ...s, [k]: !s[k] }));

  const folderColor = useMemo(
    () => folderColorFor(graph?.folders ?? []),
    [graph],
  );

  // ── Graph data: filter by tags/orphans, build neighbour map ────
  const { nodes, links, neighbours, topTags, folderCounts } = useMemo(() => {
    if (!graph) {
      return {
        nodes: [] as GraphNodeRich[],
        links: [] as GraphLinkRich[],
        neighbours: new Map<string, Set<string>>(),
        topTags: [] as Array<[string, number]>,
        folderCounts: new Map<string, number>(),
      };
    }
    let n: GraphNodeRich[] = graph.nodes.map((node) => ({ ...node }));
    if (!showTags) n = n.filter((node) => node.kind !== "tag");

    // Adjacency on the FULL link list so orphan detection is correct
    // even when tags are hidden.
    const adj = new Map<string, number>();
    for (const l of graph.links) {
      adj.set(l.source, (adj.get(l.source) ?? 0) + 1);
      adj.set(l.target, (adj.get(l.target) ?? 0) + 1);
    }
    if (!showOrphans) {
      n = n.filter((node) => (adj.get(node.id) ?? 0) > 0);
    }

    const validIds = new Set(n.map((node) => node.id));
    const l: GraphLinkRich[] = graph.links
      .filter((link) => validIds.has(link.source) && validIds.has(link.target))
      .map((link) => ({ ...link }));

    const nb = new Map<string, Set<string>>();
    for (const link of l) {
      if (!nb.has(link.source)) nb.set(link.source, new Set());
      if (!nb.has(link.target)) nb.set(link.target, new Set());
      nb.get(link.source)!.add(link.target);
      nb.get(link.target)!.add(link.source);
    }

    const tagCount = new Map<string, number>();
    for (const node of n) {
      if (node.kind === "tag") tagCount.set(node.label, node.degree);
    }
    const top = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    const fc = new Map<string, number>();
    for (const node of n) {
      if (node.kind === "note") {
        const k = node.folder || "(root)";
        fc.set(k, (fc.get(k) ?? 0) + 1);
      }
    }

    return { nodes: n, links: l, neighbours: nb, topTags: top, folderCounts: fc };
  }, [graph, showTags, showOrphans]);

  // ── Search highlight ───────────────────────────────────────────
  const matchedIds = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return null;
    const m = new Set<string>();
    for (const node of nodes) {
      const hay = `${node.label} ${node.id} ${node.folder ?? ""}`.toLowerCase();
      if (hay.includes(term)) m.add(node.id);
    }
    return m;
  }, [searchTerm, nodes]);

  // ── Resize observer keeps the canvas crisp on window changes ───
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({
        w: Math.max(320, Math.floor(r.width)),
        h: Math.max(320, Math.floor(r.height)),
      });
    });
    ro.observe(el);
    const r0 = el.getBoundingClientRect();
    setSize({
      w: Math.max(320, Math.floor(r0.width)),
      h: Math.max(320, Math.floor(r0.height)),
    });
    return () => ro.disconnect();
  }, []);

  // ── Plumb force sliders into d3-force in real time ─────────────
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg?.d3Force) return;
    fg.d3Force("charge")?.strength(-repelForce);
    fg.d3Force("link")?.distance(linkDistance);
    fg.d3Force("link")?.strength(linkStrength);
    fg.d3Force("center")?.strength(centerForce);
    fg.d3ReheatSimulation?.();
  }, [repelForce, linkDistance, linkStrength, centerForce, nodes.length, links.length]);

  // ── Active node = pinned > hovered ─────────────────────────────
  const activeId = pinnedNodeId ?? hoverNodeId;
  const activeNeighbours = activeId ? neighbours.get(activeId) ?? new Set<string>() : null;
  const isMatched = useCallback(
    (id: string) => matchedIds == null || matchedIds.has(id),
    [matchedIds],
  );
  const isInHighlight = useCallback(
    (id: string) => {
      if (!activeId) return true;
      return id === activeId || (activeNeighbours?.has(id) ?? false);
    },
    [activeId, activeNeighbours],
  );

  // ── Per-node radius (Obsidian: ~3 base, 1.5 boost per degree) ──
  const nodeRadius = useCallback(
    (node: GraphNodeRich) => {
      const base = node.kind === "tag" ? 4.5 : 3;
      const degBoost = Math.min(8, (node.degree ?? 0) * 0.7);
      return (base + degBoost) * nodeSizeMul;
    },
    [nodeSizeMul],
  );

  // ── Custom canvas painter — halo + solid + label ───────────────
  const nodeCanvasObject = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      // First-tick guard: d3-force populates x/y AFTER the first tick;
      // without this the canvas APIs throw "non-finite" errors when
      // nodes are still un-laid-out (especially right after the modal
      // opens or after a force-slider change reheats the simulation).
      const x = Number(node.x);
      const y = Number(node.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const id = String(node.id);
      const isActive = id === activeId;
      const inHighlight = isInHighlight(id) && isMatched(id);
      const baseAlpha = activeId
        ? inHighlight
          ? 1
          : 0.18
        : isMatched(id)
          ? 1
          : 0.12;
      const isTag = node.kind === "tag";
      const baseColor =
        (isTag ? TAG_COLOR : folderColor(node.folder ?? null)) || ROOT_COLOR;
      const rRaw = nodeRadius(node as GraphNodeRich);
      const r = Number.isFinite(rRaw) && rRaw > 0 ? rRaw : 3;

      // Outer halo (additive feel via radial gradient)
      if (baseAlpha > 0.4) {
        const haloR = r * (isActive ? 5.2 : 3.2);
        if (Number.isFinite(haloR) && haloR > 0) {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, haloR);
          grad.addColorStop(0, withAlpha(baseColor, baseAlpha * (isActive ? 0.6 : 0.32)));
          grad.addColorStop(0.5, withAlpha(baseColor, baseAlpha * 0.1));
          grad.addColorStop(1, withAlpha(baseColor, 0));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, haloR, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Solid disc
      ctx.fillStyle = withAlpha(baseColor, baseAlpha);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();

      // Active outline
      if (isActive) {
        ctx.strokeStyle = withAlpha("#ffffff", 0.9);
        ctx.lineWidth = 1.6 / Math.max(0.0001, globalScale);
        ctx.stroke();
      }

      // Label — fades in past the textFadeStart threshold; always
      // visible for the active node and its neighbours.
      const showLabel = isActive
        ? 1
        : activeId
          ? inHighlight
            ? 1
            : 0
          : Math.min(1, Math.max(0, (globalScale - textFadeStart) * 1.6));
      const labelAlpha = showLabel * baseAlpha;
      if (labelAlpha > 0.05) {
        const fontSize = Math.max(2.8, 11 / Math.max(0.0001, globalScale));
        ctx.font = `${fontSize}px ui-sans-serif, -apple-system, "Segoe UI", sans-serif`;
        ctx.fillStyle = withAlpha("#ffffff", labelAlpha * 0.92);
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const labelText = isTag ? `#${node.label}` : truncateLabel(node.label, 32);
        ctx.fillText(labelText, x, y + r + 1.6 / Math.max(0.0001, globalScale));
      }
    },
    [activeId, isInHighlight, isMatched, folderColor, nodeRadius, textFadeStart],
  );

  // Larger pointer area than the visual disc — so hover/click feels
  // forgiving even on tiny nodes.
  const nodePointerAreaPaint = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      const x = Number(node.x);
      const y = Number(node.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const rRaw = nodeRadius(node as GraphNodeRich) * 1.6;
      const r = Number.isFinite(rRaw) && rRaw > 0 ? rRaw : 4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
    },
    [nodeRadius],
  );

  // ── Link styling ──────────────────────────────────────────────
  const linkColor = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any) => {
      const sId =
        typeof link.source === "string" ? link.source : (link.source?.id ?? "");
      const tId =
        typeof link.target === "string" ? link.target : (link.target?.id ?? "");
      const sActive = !activeId || sId === activeId || tId === activeId;
      const sMatched = !matchedIds || (matchedIds.has(sId) && matchedIds.has(tId));
      const dim = !sActive || !sMatched;
      if (link.kind === "tag")
        return dim ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.55)";
      return dim ? "rgba(148,163,184,0.04)" : "rgba(148,163,184,0.32)";
    },
    [activeId, matchedIds],
  );

  const linkWidth = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any) => {
      const sId =
        typeof link.source === "string" ? link.source : (link.source?.id ?? "");
      const tId =
        typeof link.target === "string" ? link.target : (link.target?.id ?? "");
      const isActive = activeId && (sId === activeId || tId === activeId);
      const base = link.kind === "tag" ? 1.4 : 1.0;
      return (isActive ? base * 2.1 : base) * linkThicknessMul;
    },
    [activeId, linkThicknessMul],
  );

  // Particle flow on edges — clean by default, "thinking" on focus.
  const linkDirectionalParticles = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any) => {
      if (!animateEdges) return 0;
      const sId =
        typeof link.source === "string" ? link.source : (link.source?.id ?? "");
      const tId =
        typeof link.target === "string" ? link.target : (link.target?.id ?? "");
      const isActive = activeId && (sId === activeId || tId === activeId);
      if (isActive) return link.kind === "tag" ? 3 : 2;
      return link.kind === "tag" ? 1 : 0;
    },
    [animateEdges, activeId],
  );
  const linkDirectionalParticleColor = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any) =>
      link.kind === "tag" ? "rgba(252,211,77,0.85)" : "rgba(186,230,253,0.7)",
    [],
  );

  // ── Pointer / click handlers ───────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeHover = useCallback((node: any | null) => {
    setHoverNodeId(node ? String(node.id) : null);
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeClick = useCallback((node: any) => {
    setPinnedNodeId(String(node.id));
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeRightClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      if (node?.kind === "note") onNodeClick(node as GraphNodeRich);
    },
    [onNodeClick],
  );
  const handleBackgroundClick = useCallback(() => {
    setPinnedNodeId(null);
  }, []);

  const pinnedNode = useMemo(
    () => nodes.find((n) => n.id === (pinnedNodeId ?? hoverNodeId)) ?? null,
    [nodes, pinnedNodeId, hoverNodeId],
  );

  // ── Zoom controls ─────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    const fg = fgRef.current;
    if (!fg?.zoom) return;
    fg.zoom(fg.zoom() * 1.4, 250);
  }, []);
  const handleZoomOut = useCallback(() => {
    const fg = fgRef.current;
    if (!fg?.zoom) return;
    fg.zoom(fg.zoom() * 0.7, 250);
  }, []);
  const handleZoomFit = useCallback(() => {
    fgRef.current?.zoomToFit?.(400, 80);
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#070912]">
      {/* Subtle ambient gradient overlay (NOT a noisy starfield —
          Obsidian keeps the bg flat and lets the nodes breathe). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(124,58,237,0.06) 0%, transparent 55%)," +
            "radial-gradient(ellipse at 80% 80%, rgba(34,211,238,0.04) 0%, transparent 50%)",
        }}
      />

      {graphLoadingOverlay(loading, !graph || nodes.length === 0)}

      {graph && nodes.length > 0 ? (
        <ForceGraph
          ref={fgRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          graphData={{ nodes, links }}
          nodeId="id"
          nodeRelSize={4}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeLabel={(n: any) => `${n.label}${n.folder ? ` · ${n.folder}` : ""}`}
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={nodePointerAreaPaint}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkDirectionalParticles={linkDirectionalParticles}
          linkDirectionalParticleWidth={1.6}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleColor={linkDirectionalParticleColor}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
          onBackgroundClick={handleBackgroundClick}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          minZoom={0.15}
          maxZoom={8}
          cooldownTicks={140}
          warmupTicks={50}
          d3AlphaDecay={0.025}
          d3VelocityDecay={0.32}
        />
      ) : null}

      {/* ── Floating zoom controls (bottom-left) ─────────────── */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 rounded-2xl border border-white/10 bg-[rgba(8,11,20,0.8)] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.55)] backdrop-blur">
        <ZoomBtn icon={<ZoomIn className="h-3.5 w-3.5" />} title="Zoom in" onClick={handleZoomIn} />
        <ZoomBtn icon={<Focus className="h-3.5 w-3.5" />} title="Fit graph" onClick={handleZoomFit} />
        <ZoomBtn icon={<ZoomOut className="h-3.5 w-3.5" />} title="Zoom out" onClick={handleZoomOut} />
      </div>

      {/* ── Hint pill (bottom-center) ───────────────────────── */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[rgba(8,11,20,0.7)] px-3 py-1 font-mono text-[10.5px] text-white/45 backdrop-blur">
        scroll to zoom · drag canvas to pan · click node to focus · right-click to open
      </div>

      {/* ── Settings panel (right) ──────────────────────────── */}
      <aside
        className="pointer-events-auto absolute right-4 top-4 flex w-[280px] flex-col rounded-2xl border border-white/10 bg-[rgba(8,11,20,0.78)] shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        style={{ maxHeight: "calc(100% - 32px)" }}
      >
        {/* Search */}
        <div className="border-b border-white/8 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter nodes…"
              className="w-full rounded-lg border border-white/10 bg-black/40 pl-8 pr-2 py-1.5 text-[12px] text-white placeholder-white/30 outline-none focus:border-violet-400/45"
            />
          </div>
        </div>

        {/* Pinned node card */}
        <div className="px-3 pt-3">
          {pinnedNode ? (
            <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.07] p-3">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200/85">
                {pinnedNode.kind === "tag" ? (
                  <Hash className="h-3 w-3" />
                ) : (
                  <FileText className="h-3 w-3" />
                )}
                {pinnedNode.kind}
              </div>
              <div className="mt-1 truncate text-[13px] font-semibold text-white">
                {pinnedNode.label}
              </div>
              {pinnedNode.folder ? (
                <div className="mt-0.5 truncate font-mono text-[10.5px] text-white/45">
                  {pinnedNode.folder}
                </div>
              ) : null}
              <div className="mt-1 font-mono text-[10.5px] text-white/40">
                degree {pinnedNode.degree}
              </div>
              {pinnedNode.kind === "note" ? (
                <button
                  type="button"
                  onClick={() => onOpenSelected(pinnedNode.id)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-400/45 bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-50 transition hover:bg-violet-500/25"
                >
                  <FileText className="h-3 w-3" />
                  Open in editor
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-[11.5px] text-white/55">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                Tip
              </div>
              <p className="mt-1 leading-snug">
                Click any node to focus it. Right-click a note to open it in the editor.
              </p>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2 [scrollbar-color:rgba(255,255,255,0.18)_transparent]">
          {/* FILTERS */}
          <Section
            title="Filters"
            icon={<Settings2 className="h-3 w-3" />}
            open={section.filters}
            onToggle={() => toggleSection("filters")}
          >
            <ToggleRow label="Show tags" value={showTags} onChange={setShowTags} />
            <ToggleRow label="Show orphans" value={showOrphans} onChange={setShowOrphans} />
          </Section>

          {/* GROUPS */}
          <Section
            title="Groups"
            icon={<Folder className="h-3 w-3" />}
            open={section.groups}
            onToggle={() => toggleSection("groups")}
          >
            {folderCounts.size === 0 ? (
              <div className="px-1 text-[11px] text-white/35">No folders yet.</div>
            ) : (
              <ul className="space-y-1">
                {[...folderCounts.entries()]
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([folder, count]) => (
                    <li
                      key={folder}
                      className="flex items-center gap-2 text-[11.5px] text-white/65"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          background:
                            folder === "(root)" ? ROOT_COLOR : folderColor(folder),
                          boxShadow: `0 0 8px ${
                            folder === "(root)" ? ROOT_COLOR : folderColor(folder)
                          }55`,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setSearchTerm(folder === "(root)" ? "" : folder)}
                        className="flex-1 truncate text-left transition hover:text-white"
                      >
                        {folder}
                      </button>
                      <span className="text-white/35">{count}</span>
                    </li>
                  ))}
              </ul>
            )}
            {topTags.length > 0 ? (
              <>
                <div className="mt-3 mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                  <Hash className="h-3 w-3" /> Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {topTags.map(([tag, deg]) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSearchTerm(tag)}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/[0.08] px-2 py-0.5 font-mono text-[10.5px] text-amber-100 transition hover:bg-amber-500/20"
                    >
                      #{tag}
                      <span className="text-amber-200/60">{deg}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </Section>

          {/* DISPLAY */}
          <Section
            title="Display"
            icon={<Maximize2 className="h-3 w-3" />}
            open={section.display}
            onToggle={() => toggleSection("display")}
          >
            <SliderRow
              label="Node size"
              min={0.4}
              max={2.5}
              step={0.05}
              value={nodeSizeMul}
              onChange={setNodeSizeMul}
            />
            <SliderRow
              label="Link thickness"
              min={0.4}
              max={3}
              step={0.05}
              value={linkThicknessMul}
              onChange={setLinkThicknessMul}
            />
            <SliderRow
              label="Text fade"
              min={0.6}
              max={4}
              step={0.05}
              value={textFadeStart}
              onChange={setTextFadeStart}
              hint="Labels appear when zoom passes this value"
            />
            <ToggleRow
              label="Animate edges"
              value={animateEdges}
              onChange={setAnimateEdges}
            />
          </Section>

          {/* FORCES */}
          <Section
            title="Forces"
            icon={<Network className="h-3 w-3" />}
            open={section.forces}
            onToggle={() => toggleSection("forces")}
          >
            <SliderRow
              label="Center"
              min={0}
              max={1}
              step={0.01}
              value={centerForce}
              onChange={setCenterForce}
            />
            <SliderRow
              label="Repel"
              min={20}
              max={500}
              step={5}
              value={repelForce}
              onChange={setRepelForce}
            />
            <SliderRow
              label="Link distance"
              min={10}
              max={300}
              step={2}
              value={linkDistance}
              onChange={setLinkDistance}
            />
            <SliderRow
              label="Link strength"
              min={0}
              max={1}
              step={0.01}
              value={linkStrength}
              onChange={setLinkStrength}
            />
          </Section>
        </div>
      </aside>
    </div>
  );
}

// ── Small UI primitives used inside GraphView ─────────────────────────

function ZoomBtn({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-8 w-8 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"
    >
      {icon}
    </button>
  );
}

function Section({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 overflow-hidden rounded-lg border border-white/8 bg-white/[0.015]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:bg-white/[0.04] hover:text-white"
      >
        <span className="text-violet-300/80">{icon}</span>
        <span className="flex-1">{title}</span>
        {open ? (
          <ChevronUp className="h-3 w-3 text-white/45" />
        ) : (
          <ChevronDown className="h-3 w-3 text-white/45" />
        )}
      </button>
      {open ? <div className="space-y-2 px-2.5 py-2 pt-0">{children}</div> : null}
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[11.5px] text-white/70">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={`relative h-4 w-7 rounded-full transition ${
          value ? "bg-violet-500/65" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition ${
            value ? "left-3.5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  hint,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
  hint?: string;
}) {
  return (
    <div className="py-0.5">
      <div className="flex items-center justify-between text-[11.5px]">
        <span className="text-white/70">{label}</span>
        <span className="font-mono text-[10.5px] text-white/45">
          {value.toFixed(value < 10 ? 2 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-violet-400"
      />
      {hint ? (
        <div className="mt-0.5 text-[10.5px] text-white/35">{hint}</div>
      ) : null}
    </div>
  );
}

function graphLoadingOverlay(loading: boolean, empty: boolean) {
  if (loading) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-white/45">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Wiring up the cortex…
      </div>
    );
  }
  if (empty) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] text-white/45">
        <div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-200">
            <Brain className="h-5 w-5" />
          </div>
          <div className="font-semibold text-white/75">No connections yet</div>
          <p className="mt-1 max-w-md text-white/50">
            Switch to <span className="text-white/80">Editor</span> to drop the first note. Once you start linking notes with <code className="rounded bg-white/10 px-1 font-mono text-[11.5px]">[[wiki-links]]</code> and tagging with <code className="rounded bg-white/10 px-1 font-mono text-[11.5px]">#tags</code>, the brain wires itself.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// EDITOR VIEW — file tree + textarea + live preview
// ─────────────────────────────────────────────────────────────────────

function EditorView({
  tree,
  loading,
  selectedPath,
  onSelect,
  onCreateNew,
  body,
  onBodyChange,
  isDirty,
  onSave,
  onDelete,
  onBackToGraph,
}: {
  tree: CompanyNoteTree | null;
  loading: boolean;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onCreateNew: () => void;
  body: string;
  onBodyChange: (next: string) => void;
  isDirty: boolean;
  onSave: () => void;
  onDelete: () => void;
  onBackToGraph: () => void;
}) {
  const groupedTree = useMemo(() => {
    const map = new Map<string, CompanyNote[]>();
    for (const note of tree?.notes ?? []) {
      const key = note.folder || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(note);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tree]);

  return (
    <div className="flex h-full min-h-0 flex-col sm:flex-row">
      {/* ── Tree ───────────────────────────────────────────────────── */}
      <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-black/25 sm:w-72 sm:border-b-0 sm:border-r">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onBackToGraph}
              className="mb-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300/80 transition hover:bg-white/5 hover:text-violet-100"
            >
              <ChevronLeft className="h-3 w-3" />
              Graph
            </button>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              {tree?.totalCount ?? 0} note{tree?.totalCount === 1 ? "" : "s"}
            </div>
            <div className="text-[11px] text-white/35">vault · default</div>
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            title="New note"
            aria-label="New note"
            className="inline-flex items-center gap-1 rounded-lg border border-violet-500/35 bg-violet-500/10 px-2 py-1 text-[11px] font-semibold text-violet-100 transition hover:border-violet-400/55 hover:bg-violet-500/20"
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
                    onClick={() => onSelect(note.path)}
                    className={`block w-full truncate rounded-lg px-3 py-1.5 text-left text-[12.5px] transition ${
                      selectedPath === note.path
                        ? "bg-violet-500/15 text-violet-100 ring-1 ring-violet-500/30"
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

      {/* ── Editor + preview ──────────────────────────────────────── */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selectedPath ? (
          <>
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.015] px-4 py-2">
              <FileText className="h-3.5 w-3.5 text-violet-300/80" />
              <span className="truncate font-mono text-[12px] text-white/85">{selectedPath}</span>
              {isDirty ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-200">
                  unsaved
                </span>
              ) : null}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/35 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={loading || !isDirty}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/45 bg-violet-500/15 px-3 py-1 text-[11px] font-semibold text-violet-50 transition hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <textarea
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
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
          <div className="flex flex-1 flex-col items-center justify-center text-center text-[13px] text-white/40">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-200">
              <FileText className="h-5 w-5" />
            </div>
            <div className="font-semibold text-white/75">Pick a note</div>
            <p className="mt-1 max-w-md text-white/45">
              Choose a file from the tree, or hit <span className="text-white/80">New</span> to start fresh.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
