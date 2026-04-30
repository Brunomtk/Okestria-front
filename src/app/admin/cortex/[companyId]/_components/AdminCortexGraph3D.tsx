"use client";

/**
 * v152.1 — Admin · Cortex 3D graph viewer.
 *
 * Now configured exactly like the office's CortexModal:
 *   • Same default forces (charge = -180, link distance = 60,
 *     link strength = 0.55, center = 0.18). 186 nodes were stuck
 *     in a clump because we'd been running with a much weaker
 *     charge (-90) — the repulsion couldn't push them apart.
 *   • d3 forces re-applied + simulation reheated whenever node /
 *     link counts change (mirrors CortexModal's effect).
 *   • zoomToFit triggered by the lib's `onEngineStop` callback,
 *     not a fragile setTimeout — that's the only reliable signal
 *     that "the simulation has settled, we know where everything
 *     is, frame it now".
 */

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { AdminCortexGraph } from "@/lib/auth/api";

const ForceGraph = dynamic(
  () => import("@/features/office/components/CortexForceGraph"),
  { ssr: false },
);

const NOTE_COLOR = "#a78bfa";
const TAG_COLOR = "#22d3ee";

const LINK_COLOR_BY_KIND: Record<string, string> = {
  wiki: "rgba(167,139,250,0.55)",
  tag: "rgba(34,211,238,0.55)",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(s: string, n = 40): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function AdminCortexGraph3D({ graph }: { graph: AdminCortexGraph }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 600, h: 460 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        w: Math.max(320, Math.floor(rect.width)),
        h: Math.max(320, Math.floor(rect.height)),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clone every render so react-force-graph doesn't reuse the same
  // node objects across re-renders (it mutates them in place to
  // store x/y/z and would otherwise pin them to old positions).
  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((n) => ({ ...n })),
      links: graph.links.map((l) => ({ ...l })),
    }),
    [graph],
  );

  const isEmpty = data.nodes.length === 0;

  // Apply the SAME forces CortexModal uses, then reheat. Re-fires
  // when node/link counts change so a different vault snap-fits.
  useEffect(() => {
    if (isEmpty) return;
    const id = window.setTimeout(() => {
      const fg = fgRef.current;
      if (!fg?.d3Force) return;
      try {
        fg.d3Force("charge")?.strength(-180);
        fg.d3Force("link")?.distance(60).strength(0.55);
        fg.d3Force("center")?.strength(0.18);
        fg.d3ReheatSimulation?.();
      } catch {
        /* swallow */
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [isEmpty, data.nodes.length, data.links.length]);

  // CortexForceGraph wrapper accepts `any` props, so we hand it the
  // exact bag of options the modal feeds its own ForceGraph.
  const graphProps = {
    ref: fgRef,
    width: size.w,
    height: size.h,
    backgroundColor: "rgba(0,0,0,0)",
    showNavInfo: false,
    graphData: data,
    nodeId: "id",
    nodeRelSize: 4.5,
    nodeResolution: 12,
    nodeOpacity: 0.92,
    nodeVal: (n: { degree?: number }) => 0.6 + (n.degree ?? 0) * 0.6,
    nodeColor: (n: { kind?: string }) =>
      n.kind === "tag" ? TAG_COLOR : NOTE_COLOR,
    nodeLabel: (n: {
      kind?: string;
      label?: string;
      folder?: string | null;
      degree?: number;
    }) => {
      const tagAccent = n.kind === "tag" ? TAG_COLOR : NOTE_COLOR;
      const folder = n.folder
        ? `<div style="opacity:0.5;font-size:10px;margin-top:2px">${escapeHtml(
            n.folder,
          )}</div>`
        : "";
      return `<div style="font-family:ui-monospace,Menlo,monospace;font-size:11px;background:rgba(2,6,23,0.94);border:1px solid rgba(167,139,250,0.4);border-radius:8px;padding:6px 8px;color:white;box-shadow:0 8px 24px rgba(0,0,0,0.4);max-width:320px"><div style="font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${tagAccent}">${escapeHtml(
        n.kind ?? "",
      )}</div><div style="font-weight:500;margin-top:2px">${escapeHtml(
        truncate(n.label ?? "", 40),
      )}</div>${folder}<div style="opacity:0.45;font-size:10px;margin-top:2px">degree ${
        n.degree ?? 0
      }</div></div>`;
    },
    linkColor: (l: { kind?: string }) =>
      LINK_COLOR_BY_KIND[l.kind ?? ""] ?? "rgba(255,255,255,0.30)",
    linkOpacity: 1,
    linkWidth: 0.9,
    linkDirectionalParticles: (l: { kind?: string }) =>
      l.kind === "wiki" ? 1 : 0,
    linkDirectionalParticleSpeed: 0.005,
    linkDirectionalParticleWidth: 2,
    linkDirectionalParticleColor: (l: { kind?: string }) =>
      l.kind === "wiki" ? NOTE_COLOR : TAG_COLOR,
    enableNodeDrag: true,
    enableNavigationControls: true,
    cooldownTicks: 80,
    cooldownTime: 6000,
    warmupTicks: 30,
    d3AlphaDecay: 0.04,
    d3VelocityDecay: 0.35,
    onEngineStop: () => {
      try {
        fgRef.current?.zoomToFit?.(600, 80);
      } catch {
        /* swallow */
      }
    },
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_20%,_rgba(34,211,238,0.10)_0%,_rgba(8,11,20,0.85)_55%,_#04060d_100%)]"
    >
      {isEmpty ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-[13px] text-white/55">
            This vault has no notes yet.
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
            once notes land, the graph fills in here
          </p>
        </div>
      ) : (
        <ForceGraph {...graphProps} />
      )}

      {!isEmpty ? (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 rounded-full border border-white/12 bg-black/45 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/65">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: NOTE_COLOR }}
              />
              note
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: TAG_COLOR }}
              />
              tag
            </span>
          </div>
          <span className="rounded-full border border-white/12 bg-black/45 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
            {data.nodes.length} node{data.nodes.length === 1 ? "" : "s"} ·{" "}
            {data.links.length} link{data.links.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
