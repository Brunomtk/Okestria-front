"use client";

/**
 * v136 — Obsidian-style "brain" / graph view of the company's notes
 * vault. Fullscreen overlay. Click a node → close graph + open the
 * Notes modal with that note pre-selected.
 *
 * Tech:
 *  - `react-force-graph-2d` (canvas, ~30KB gzip, 60fps with 500+ nodes).
 *  - Loaded via `next/dynamic` with `ssr: false` because the lib is
 *    browser-only (uses canvas + window).
 *  - Nodes are coloured by folder (notes) or amber (tags). Size scales
 *    with degree so well-connected hubs stand out.
 *  - Hover highlights the node + its first-degree neighbours so the
 *    operator can "trace" connections without clicking.
 *
 * The graph payload comes from `GET /api/CompanyNotes/graph` (back v78).
 * Multi-tenant boundary lives on the back — the front never asks for
 * "this company's graph"; the JWT decides.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Network, RefreshCcw, X } from "lucide-react";
import {
  fetchNotesGraph,
  type CompanyNoteGraph,
  type CompanyNoteGraphLink,
  type CompanyNoteGraphNode,
} from "@/lib/notes/api";

// `react-force-graph-2d` references `window` at import time, so we
// dynamic-import with SSR off. The export is a default function-as-
// component, hence `(mod) => mod.default`.
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((mod) => mod.default),
  { ssr: false },
);

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called with a note path when the operator clicks a note node. The
   *  parent typically uses this to close the graph and open the
   *  CompanyNotesModal with the path pre-selected. */
  onOpenNote?: (path: string) => void;
};

// Stable per-folder colour palette. Same hashing trick the v131
// squad-color override uses so two adjacent folders look distinct.
const FOLDER_PALETTE = [
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fbbf24", // amber
  "#fb7185", // rose
  "#60a5fa", // blue
  "#f472b6", // pink
  "#a3e635", // lime
];
const TAG_COLOR = "#f59e0b";
const ROOT_COLOR = "#94a3b8"; // notes at vault root or no folder

const colourForFolder = (folder: string | null | undefined): string => {
  if (!folder) return ROOT_COLOR;
  let hash = 0;
  for (let i = 0; i < folder.length; i++) {
    hash = (hash * 31 + folder.charCodeAt(i)) | 0;
  }
  return FOLDER_PALETTE[Math.abs(hash) % FOLDER_PALETTE.length];
};

// react-force-graph mutates the node objects in place (adding `x`, `y`,
// `vx`, `vy`, etc.) so we keep a separate type with those mutable
// fields whitelisted. Keeps TS happy without `any`.
type GraphNode = CompanyNoteGraphNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
};

type GraphLink = CompanyNoteGraphLink & {
  source: string | GraphNode;
  target: string | GraphNode;
};

export function CompanyNotesGraphModal({ open, onClose, onOpenNote }: Props) {
  const [graph, setGraph] = useState<CompanyNoteGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load graph when modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchNotesGraph()
      .then((next) => {
        if (cancelled) return;
        setGraph(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Track container size so the graph fills it cleanly across resizes.
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.max(320, rect.width), h: Math.max(320, rect.height) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchNotesGraph();
      setGraph(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Build the in-memory graph structure react-force-graph expects.
  // We pass plain copies so the lib can attach its own simulation
  // fields without mutating our state.
  const data = useMemo(() => {
    if (!graph) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };
    return {
      nodes: graph.nodes.map((n) => ({ ...n })) as GraphNode[],
      links: graph.links.map((l) => ({ ...l })) as GraphLink[],
    };
  }, [graph]);

  // Adjacency for hover highlighting.
  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!graph) return map;
    for (const l of graph.links) {
      const src = typeof l.source === "string" ? l.source : (l.source as { id: string }).id;
      const tgt = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
      if (!map.has(src)) map.set(src, new Set());
      if (!map.has(tgt)) map.set(tgt, new Set());
      map.get(src)!.add(tgt);
      map.get(tgt)!.add(src);
    }
    return map;
  }, [graph]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.kind === "note" && onOpenNote) onOpenNote(node.id);
    },
    [onOpenNote],
  );

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredId(node?.id ?? null);
  }, []);

  const stats = useMemo(() => {
    if (!graph) return null;
    const noteCount = graph.nodes.filter((n) => n.kind === "note").length;
    const tagCount = graph.nodes.filter((n) => n.kind === "tag").length;
    return { noteCount, tagCount, linkCount: graph.links.length };
  }, [graph]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/85 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        className="relative z-[126] flex max-h-[100vh] w-full max-w-[1480px] flex-col overflow-hidden rounded-none border border-sky-400/25 bg-[#070b12] shadow-[0_30px_120px_rgba(0,0,0,0.7)] sm:max-h-[92vh] sm:rounded-2xl"
        style={{ width: "min(1480px, 100vw)", height: "min(840px, calc(100vh - 32px))" }}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30 sm:h-12 sm:w-12">
            <Network className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">
              Notes vault · brain
            </div>
            <h2 className="mt-0.5 text-base font-semibold text-white">
              Graph view
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-white/55">
              {stats
                ? `${stats.noteCount} note${stats.noteCount === 1 ? "" : "s"} · ${stats.tagCount} tag${stats.tagCount === 1 ? "" : "s"} · ${stats.linkCount} link${stats.linkCount === 1 ? "" : "s"}`
                : "Loading…"}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            title="Rebuild graph from S3"
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

        {/* ── Body: graph canvas + side panel ─────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div ref={containerRef} className="relative min-h-[320px] flex-1 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.06),transparent_60%)]">
            {loading && !graph ? (
              <div className="absolute inset-0 flex items-center justify-center text-[13px] text-white/45">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building graph…
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] text-rose-300">
                {error}
              </div>
            ) : graph && graph.nodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] text-white/45">
                No notes yet — go write one in the Notes modal first, then come back here.
              </div>
            ) : (
              <ForceGraph2D
                graphData={data}
                width={size.w}
                height={size.h}
                backgroundColor="rgba(0,0,0,0)"
                nodeRelSize={4}
                cooldownTicks={120}
                d3AlphaDecay={0.025}
                d3VelocityDecay={0.3}
                linkColor={(link) => {
                  const l = link as GraphLink;
                  return l.kind === "tag" ? "rgba(245,158,11,0.35)" : "rgba(125,211,252,0.4)";
                }}
                linkWidth={1}
                linkDirectionalParticles={(link) => {
                  const src = typeof (link as GraphLink).source === "string" ? (link as GraphLink).source as string : ((link as GraphLink).source as GraphNode).id;
                  const tgt = typeof (link as GraphLink).target === "string" ? (link as GraphLink).target as string : ((link as GraphLink).target as GraphNode).id;
                  return hoveredId && (src === hoveredId || tgt === hoveredId) ? 2 : 0;
                }}
                linkDirectionalParticleWidth={2}
                onNodeHover={(node) => handleNodeHover(node as GraphNode | null)}
                onNodeClick={(node) => handleNodeClick(node as GraphNode)}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const n = node as GraphNode;
                  const isHover = hoveredId === n.id;
                  const isNeighbour =
                    !!hoveredId && hoveredId !== n.id && (neighbours.get(hoveredId)?.has(n.id) ?? false);
                  const dim = !!hoveredId && !isHover && !isNeighbour;
                  // Size scales with degree, capped so even huge hubs
                  // stay readable.
                  const baseR = 4 + Math.min(8, n.degree * 0.7);
                  const r = isHover ? baseR + 2 : baseR;
                  const colour = n.kind === "tag" ? TAG_COLOR : colourForFolder(n.folder);
                  ctx.globalAlpha = dim ? 0.18 : 1;
                  // Outer glow on hover.
                  if (isHover) {
                    ctx.beginPath();
                    ctx.arc(n.x ?? 0, n.y ?? 0, r + 4, 0, Math.PI * 2, false);
                    ctx.fillStyle = `${colour}33`;
                    ctx.fill();
                  }
                  // Body.
                  ctx.beginPath();
                  ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, Math.PI * 2, false);
                  ctx.fillStyle = colour;
                  ctx.fill();
                  // Border.
                  ctx.lineWidth = 1.4 / globalScale;
                  ctx.strokeStyle = "#0b0e14";
                  ctx.stroke();
                  // Label — only when hovered or zoomed in enough to read.
                  const showLabel = isHover || isNeighbour || globalScale >= 1.6;
                  if (showLabel) {
                    const fontSize = Math.max(10, 12 / globalScale);
                    ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "top";
                    ctx.fillStyle = "rgba(255,255,255,0.92)";
                    ctx.fillText(n.label, n.x ?? 0, (n.y ?? 0) + r + 2);
                  }
                  ctx.globalAlpha = 1;
                }}
                nodePointerAreaPaint={(node, colour, ctx) => {
                  const n = node as GraphNode;
                  const baseR = 4 + Math.min(8, n.degree * 0.7);
                  ctx.fillStyle = colour;
                  ctx.beginPath();
                  ctx.arc(n.x ?? 0, n.y ?? 0, baseR + 4, 0, Math.PI * 2, false);
                  ctx.fill();
                }}
              />
            )}
          </div>

          {/* Side panel: legend + tag list. */}
          <aside className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-black/30 px-4 py-4 lg:w-72 lg:border-l lg:border-t-0">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                Legend
              </div>
              <div className="mt-2 space-y-1.5 text-[12px] text-white/70">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ROOT_COLOR }} />
                  Note (root / no folder)
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FOLDER_PALETTE[0] }} />
                  Note (coloured by folder)
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TAG_COLOR }} />
                  #tag
                </div>
              </div>
            </div>

            {graph && graph.folders.length > 0 ? (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Folders ({graph.folders.length})
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {graph.folders.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/75"
                    >
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colourForFolder(f) }} />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {graph && graph.tags.length > 0 ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Top tags ({graph.tags.length})
                </div>
                <div className="mt-2 flex max-h-[20vh] flex-wrap gap-1.5 overflow-y-auto lg:max-h-none">
                  {graph.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-200"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="text-[11px] text-white/35">
              Click a note to open it. Hover a node to highlight its neighbours.
              Use [[Note Name]] in your markdown to create new edges.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
