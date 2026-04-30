"use client";

/**
 * v138 — Tiny ref-forwarding wrapper around `react-force-graph-3d`.
 *
 * Why this file exists: `next/dynamic` doesn't preserve the ref of
 * the dynamically-loaded component out of the box. CortexModal needs
 * to call imperative methods on the ForceGraph3D instance (notably
 * `cameraPosition` for the auto-rotate animation), which means we
 * have to wrap the lib in a `forwardRef` component first and then
 * `dynamic`-import THAT wrapper — the wrapper is allowed to forward
 * the ref because it's a real React component declared with the
 * forwardRef helper.
 *
 * Keep this file minimal — it's loaded lazily by CortexModal and
 * shouldn't ship anything else.
 */

import { forwardRef } from "react";
import ForceGraph3D from "react-force-graph-3d";

/**
 * Why props are typed as `any`:
 *
 * The lib's `NodeObject` / `LinkObject` types are intentionally loose
 * (`{ id?: string | number; [k: string]: any }`). My GraphNodeRich /
 * GraphLinkRich types are stricter (id is `string`, plus required
 * `kind` / `label` / `degree`). TypeScript sees the strict callbacks
 * as incompatible with the lib's broad signatures and rejects them.
 *
 * Two ways out: (a) re-type all callbacks at every call site with
 * the lib's loose shape and cast inside, or (b) widen the wrapper's
 * prop type so the strict callbacks flow through unchecked. (b) is
 * a single line and keeps the call-site code readable. The runtime
 * data shape is guaranteed by `lib/notes/api` so we don't lose any
 * real safety here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CortexForceGraph3D = forwardRef<unknown, any>((props, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ForceGraph3D ref={ref as any} {...props} />;
});
CortexForceGraph3D.displayName = "CortexForceGraph3D";

export default CortexForceGraph3D;
