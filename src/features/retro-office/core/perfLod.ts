// ============================================================
// Shared runtime LOD (level-of-detail) state.
//
// v45 performance pass: the AdaptiveDprController (inside the Canvas) writes
// the current camera zoom here once per frame. Everything else in the scene
// — AgentModel, future furniture idle-animations, etc. — reads these
// booleans synchronously to skip expensive math when the user is zoomed out.
//
// This is intentionally a mutable module-scope object (not React state) so
// that reads are a single property load per useFrame rather than forcing
// re-renders or context prop drilling through dozens of components.
//
// For the orthographic camera used in this scene, `camera.zoom` scales the
// projected size of every object. LOWER zoom = wider viewport = MORE objects
// visible = MORE work per frame. Thresholds are calibrated against the
// OrbitControls range `minZoom=25 / maxZoom=120`.
// ============================================================

export const PerfLod: {
  /** Current camera.zoom value; updated every frame. */
  zoom: number;
  /** zoom < 55 — drop per-agent idle micro-motion to half-rate. */
  zoomedOut: boolean;
  /** zoom < 38 — extreme overview; skip most face / eye / brow updates. */
  farZoomedOut: boolean;
} = {
  zoom: 80,
  zoomedOut: false,
  farZoomedOut: false,
};
