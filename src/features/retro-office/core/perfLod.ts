// ============================================================
// Shared runtime LOD (level-of-detail) state.
//
// v45 performance pass: the AdaptiveDprController (inside the Canvas) writes
// the current camera zoom here once per frame. Everything else in the scene
// — AgentModel, future furniture idle-animations, etc. — reads these
// booleans synchronously to skip expensive math when the user is zoomed out.
//
// v63 performance pass: two extra axes of throttling were added so camera
// pans/zooms never stutter:
//
//   • cameraMoving — true while the user is actively dragging, panning, or
//     wheel-zooming. OrbitControls start/end events set this (plus a fallback
//     pointer/wheel listener). When true, expensive per-frame work (face
//     micro-animations, nameplate colour lerps, day/night colour parse, heat
//     maps, trails) is skipped or deferred.
//   • cameraFocusX / cameraFocusZ — the OrbitControls target, updated once
//     per frame. Agent models compute a cheap squared distance from focus
//     and skip the whole pose-math block past a threshold (out of the
//     visible frame and out of the near-zoom bubble).
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
  /**
   * True while the user is actively rotating / panning / zooming the camera.
   * When this is set, per-frame face-detail work, nameplate colour lerps and
   * day/night cycle updates are skipped entirely so drag stays buttery.
   */
  cameraMoving: boolean;
  /** World-space focus target (OrbitControls.target) — updated each frame. */
  cameraFocusX: number;
  cameraFocusZ: number;
  /**
   * Squared distance threshold for per-agent "full detail" work. Agents whose
   * squared distance from the focus exceeds this value skip face / brow /
   * mouth / eye updates entirely. The threshold scales with zoom — when the
   * user is zoomed in, the visible bubble is small so we can cull aggressively.
   */
  fullDetailRadiusSq: number;
} = {
  zoom: 80,
  zoomedOut: false,
  farZoomedOut: false,
  cameraMoving: false,
  cameraFocusX: 0,
  cameraFocusZ: 0,
  fullDetailRadiusSq: 64, // 8 world units radius at default zoom
};
