"use client";

/**
 * v150 — Admin · Cortex 3D graph viewer.
 *
 * Thin client wrapper around the same `react-force-graph-3d` setup
 * the office uses (CortexForceGraph). Source-of-truth on rendering
 * stays in features/office; this just feeds it the admin-scoped
 * graph payload (`/api/AdminOverview/cortex/{companyId}/graph`).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { AdminCortexGraph } from "@/lib/auth/api";

// react-force-graph-3d touches `window` on import, so it MUST stay client-only.
const ForceGraph3D = dynamic(
  () => import("react-force-graph-3d").then((m) => m.default),
  { ssr: false },
);

type Node = AdminCortexGraph["nodes"][number] & {
  x?: number;
  y?: number;
  z?: number;
};
type Link = AdminCortexGraph["links"][number];

const NODE_COLOR_FOR_KIND: Record<string, string> = {
  note: "#a78bfa",
  tag: "#22d3ee",
};

const LINK_COLOR_FOR_KIND: Record<string, string> = {
  wiki: "rgba(167,139,250,0.45)",
  tag: "rgba(34,211,238,0.45)",
};

export function AdminCortexGraph3D({ graph }: { graph: AdminCortexGraph }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((n) => ({ ...n })),
      links: graph.links.map((l) => ({ ...l })),
    }),
    [graph],
  );

  const isEmpty = data.nodes.length === 0;

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
        <ForceGraph3D
          width={size.w}
          height={size.h}
          graphData={data}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={5}
          nodeVal={(n: Node) => 0.6 + (n.degree ?? 0) * 0.6}
          nodeColor={(n: Node) => NODE_COLOR_FOR_KIND[n.kind] ?? "#94a3b8"}
          nodeLabel={(n: Node) =>
            n.kind === "tag" ? `#${n.label}` : `${n.label}`
          }
          linkColor={(l: Link) =>
            LINK_COLOR_FOR_KIND[l.kind] ?? "rgba(255,255,255,0.25)"
          }
          linkOpacity={0.65}
          linkWidth={0.75}
          linkDirectionalParticles={(l: Link) => (l.kind === "wiki" ? 1 : 0)}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleWidth={1.2}
          enableNodeDrag
          showNavInfo={false}
        />
      )}

      {!isEmpty ? (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 rounded-full border border-white/12 bg-black/45 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/65">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "#a78bfa" }}
              />
              note
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "#22d3ee" }}
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
