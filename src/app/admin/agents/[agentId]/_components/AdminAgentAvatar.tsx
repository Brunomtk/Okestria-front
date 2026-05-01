"use client";

/**
 * v179 — Admin · Agent avatar viewer (rewritten from scratch).
 *
 * Previous v153/v178 versions inherited a custom `PortraitFigure`
 * wrapper that wrote to `group.rotation` / `group.position` from a
 * `useFrame` AND mounted `<OfficeFigure externalAnimation />`. The
 * combination of:
 *   • a wrong camera framing copied from the 16:9 hero dashboard,
 *   • a manual sway that competed with the figure's own animation,
 *   • and an extra `useFrame` allocation,
 * left the figure tiny and floating in the upper third of the
 * 1:1 admin card, with a console full of `THREE.Clock deprecated`
 * spam from the second clock instance.
 *
 * This version is a thin shell around the SAME setup the agent
 * editor (`AgentAvatarPreview3D`) already uses successfully:
 *   • Identical camera position [0.45, 0.2, 5.2] + lookAt y=0
 *     (waist), fov 24 — the figure goes feet-to-hair from y=-0.78
 *     to y≈+0.9 and fits with breathing room.
 *   • OfficeFigure runs its own internal animation; no extra
 *     useFrame here, no extra THREE.Clock.
 *   • A static OrbitControls block lets the operator nudge the
 *     view; constrained to the same polar range the editor uses.
 *   • Optional `interactive` prop (defaults to true) toggles those
 *     controls so the same component can be embedded read-only
 *     elsewhere if needed.
 */

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { OfficeFigure } from "@/features/agents/components/AgentOfficeFigure3D";
import {
  normalizeAgentAvatarProfile,
  type AgentAvatarProfile,
} from "@/lib/avatars/profile";

type AdminAgentAvatarProps = {
  /** JSON string saved on the agent record (`avatarProfileJson`).
   *  Falls back to a deterministic profile derived from
   *  `fallbackSeed` when null/parse-fails. */
  avatarProfileJson: string | null;
  fallbackSeed: string;
  className?: string;
  /** Whether the operator can drag-rotate / tilt. Defaults to true. */
  interactive?: boolean;
};

export function AdminAgentAvatar({
  avatarProfileJson,
  fallbackSeed,
  className = "",
  interactive = true,
}: AdminAgentAvatarProps) {
  const profile: AgentAvatarProfile = useMemo(() => {
    let raw: unknown = null;
    if (avatarProfileJson && typeof avatarProfileJson === "string") {
      try {
        raw = JSON.parse(avatarProfileJson);
      } catch {
        raw = null;
      }
    }
    return normalizeAgentAvatarProfile(raw, fallbackSeed);
  }, [avatarProfileJson, fallbackSeed]);

  // The Canvas remounts whenever the profile actually changes — we
  // pin the key on a stable serialization so cosmetic re-renders
  // don't tear down the GPU context.
  const profileKey = useMemo(() => JSON.stringify(profile), [profile]);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const isReady = readyKey === profileKey;

  return (
    <div className={`relative ${className}`}>
      {/* Loading veil — fades when OfficeFigure fires onReady. The
          flat dark fill matches the card's background gradient so
          the swap is invisible to the operator. */}
      {!isReady ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white/65">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-violet-300" />
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
            loading avatar
          </div>
        </div>
      ) : null}
      <Canvas
        key={profileKey}
        /*  v181 — anchored framing on a 3:4 portrait card.
         *
         *  After two failed attempts to push the figure down inside
         *  a 1:1 canvas, the page now uses aspect-[3/4]. This Canvas
         *  frames the figure as if it were standing on the bottom
         *  edge of the card (close to the "name" label strip).
         *
         *  How it works:
         *    • OfficeFigure hard-anchors its inner group at world
         *      y=-0.78 (its "ground"). The hair tip sits ≈ y=+0.94.
         *    • LookAt drops all the way to the GROUND (y=-0.78), so
         *      the figure feet sit at the visual center of the
         *      portrait frame and the body extends UPWARD from
         *      there in screen space — i.e. the body fills the
         *      upper half of the card, feet anchored mid-card.
         *    • Camera position lifted to y=-0.10 (above the ground
         *      target) so it gently looks down — natural eye-level
         *      portrait, not a worm's-eye shot.
         *    • z=2.6 + fov=38 → tight zoom; the figure now fills
         *      most of the portrait card top-to-bottom and SITS at
         *      the bottom strip exactly where the name label is.
         *      No group offset needed — anchoring is purely from
         *      the camera math, so the figure stays straight-on. */
        camera={{ position: [0.45, -0.1, 2.6], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, -0.78, 0)}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Three lights matching the office figure highlights so the
         *  admin preview reads identical to what the operator sees in
         *  the office scene. */}
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 4, 5]} intensity={2.0} />
        <directionalLight position={[-4, 2, 3]} intensity={1.0} color="#89a6ff" />
        <directionalLight position={[0, 4, -5]} intensity={1.25} color="#f0d9b5" />
        <Environment preset="city" />
        <OfficeFigure
          profile={profile}
          onReady={() => setReadyKey(profileKey)}
        />
        {interactive ? (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            target={[0, -0.78, 0]}
            maxPolarAngle={1.8}
            minPolarAngle={1.1}
          />
        ) : null}
      </Canvas>
    </div>
  );
}
