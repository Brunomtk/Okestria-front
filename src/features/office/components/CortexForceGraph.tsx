"use client";

/**
 * v138 — Tiny ref-forwarding wrapper around `react-force-graph-3d`,
 * plus a couple of THREE helpers shared with CortexModal.
 *
 * Two reasons this file exists:
 *   1. `next/dynamic` doesn't preserve refs of dynamically-loaded
 *      components — wrapping in `forwardRef` first makes them flow
 *      through. We need the imperative methods (`cameraPosition`,
 *      `zoomToFit`, `d3Force`, `d3ReheatSimulation`, `controls`) to
 *      drive the zoom controls, fit-view, and force sliders in
 *      CortexModal.
 *   2. THREE.js is an awfully large dep — importing it from
 *      CortexModal would bloat the main bundle. Since this file is
 *      already loaded on demand (via next/dynamic), we expose THREE
 *      helpers here so the modal can grab them via a second
 *      `import("./CortexForceGraph")` at runtime, keeping THREE in
 *      the same lazy chunk as the lib that already drags it in.
 */

import { forwardRef } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CortexForceGraph = forwardRef<unknown, any>((props, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ForceGraph3D ref={ref as any} {...props} />;
});
CortexForceGraph.displayName = "CortexForceGraph";

export default CortexForceGraph;

// ── Halo sprite helpers ───────────────────────────────────────────────
//
// Cached canvas-derived gradient texture. Created once on first use,
// reused across all halo sprites — sprites just remix the colour via
// material tinting.

let cachedHaloTexture: THREE.Texture | null = null;
function getHaloTexture(): THREE.Texture {
  if (cachedHaloTexture) return cachedHaloTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.18, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.32)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  cachedHaloTexture = texture;
  return cachedHaloTexture;
}

/**
 * Returns a THREE.Sprite shaped like a soft radial glow of the given
 * colour. Sized in world units so it scales with the node radius.
 *
 * Used by CortexModal as the `nodeThreeObject` for the pinned node
 * with `nodeThreeObjectExtend=true` so it composites *over* the
 * default sphere instead of replacing it.
 */
export function createHaloSprite(colorHex: string, radius: number): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: getHaloTexture(),
    color: new THREE.Color(colorHex),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  // Halo is a chunky 4× the node radius — visible from afar but never
  // dominating the scene.
  const size = Math.max(8, radius * 4);
  sprite.scale.set(size, size, 1);
  return sprite;
}
