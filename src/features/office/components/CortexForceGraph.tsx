"use client";

/**
 * v138 — Tiny ref-forwarding wrapper around `react-force-graph-3d`.
 *
 * Two reasons this file exists:
 *   1. `next/dynamic` doesn't preserve refs of dynamically-loaded
 *      components — wrapping in `forwardRef` first makes them flow
 *      through. We need the imperative methods (`cameraPosition`,
 *      `zoomToFit`, `d3Force`, `d3ReheatSimulation`) to drive the
 *      zoom controls, fit-view, and force sliders in CortexModal.
 *   2. The lib's NodeObject / LinkObject types are intentionally
 *      loose. Typing the wrapper props as `any` lets the strict
 *      callbacks in CortexModal flow through unchecked. The runtime
 *      data shape is guaranteed by `lib/notes/api`, so we don't lose
 *      real safety.
 */

import { forwardRef } from "react";
import ForceGraph3D from "react-force-graph-3d";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CortexForceGraph = forwardRef<unknown, any>((props, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ForceGraph3D ref={ref as any} {...props} />;
});
CortexForceGraph.displayName = "CortexForceGraph";

export default CortexForceGraph;
