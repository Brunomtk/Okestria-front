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
import type { ComponentProps } from "react";
import ForceGraph3D from "react-force-graph-3d";

type ForceGraph3DProps = ComponentProps<typeof ForceGraph3D>;

const CortexForceGraph3D = forwardRef<unknown, ForceGraph3DProps>((props, ref) => {
  // The lib types refs as a discriminated union we don't need to
  // expose here — the modal only calls `cameraPosition`, so an
  // `unknown` ref is enough.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ForceGraph3D ref={ref as any} {...props} />;
});
CortexForceGraph3D.displayName = "CortexForceGraph3D";

export default CortexForceGraph3D;
