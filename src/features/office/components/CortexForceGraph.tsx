"use client";

/**
 * v138 — Tiny ref-forwarding wrapper around `react-force-graph-2d`.
 *
 * Two reasons this file exists:
 *   1. `next/dynamic` doesn't preserve refs of dynamically-loaded
 *      components — wrapping in `forwardRef` first makes them flow
 *      through. We need the imperative methods (`zoom`, `centerAt`,
 *      `zoomToFit`, `d3Force`) to drive the zoom controls + force
 *      sliders in CortexModal.
 *   2. The lib's NodeObject / LinkObject types are intentionally
 *      loose. Typing the wrapper props as `any` lets the strict
 *      callbacks in CortexModal flow through unchecked. The runtime
 *      data shape is guaranteed by `lib/notes/api`, so we don't lose
 *      real safety.
 */

import { forwardRef } from "react";
import ForceGraph2D from "react-force-graph-2d";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CortexForceGraph = forwardRef<unknown, any>((props, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ForceGraph2D ref={ref as any} {...props} />;
});
CortexForceGraph.displayName = "CortexForceGraph";

export default CortexForceGraph;
