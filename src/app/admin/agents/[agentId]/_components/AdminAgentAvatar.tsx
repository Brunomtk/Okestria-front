"use client";

/**
 * v182 — Admin · Agent avatar viewer (now reuses the landing HeroAgent
 * framing 1:1).
 *
 * v179/v180/v181 each tried a different camera setup (heavier zoom,
 * group offsets, taller card aspect) and each one still produced a
 * cropped or off-center figure on someone's screen. The landing page's
 * HeroAgent already has a thoroughly-tuned framing — wrapper group at
 * world origin, camera planted at the figure's true vertical mid,
 * fov × distance pre-computed to fill ~95% of the canvas — and it
 * renders perfectly across viewports. So the right move is to STOP
 * inventing new camera math and copy the proven setup.
 *
 * What's the same as HeroAgent (`features/marketing/HeroAgent.tsx`):
 *   • RIG_MID_Y = 0   — wrapper group at world origin
 *   • CAMERA_Z  = 2.4 — camera distance
 *   • CAMERA_FOV = 38 — vertical fov
 *   • lookAt(0, 0, 0) — symmetric composition, no tilt
 *   • Same 3-light + Environment "city" rig
 *   • OfficeFigure with `externalAnimation` (so its built-in sway is
 *     OFF and our outer wrapper owns motion)
 *   • Subtle idle sway in `useFrame` matching HeroAgent's PortraitFigure
 *
 * What's different:
 *   • Profile comes from the AGENT'S avatarProfileJson, not a random
 *     seed. Seed fallback only when JSON is missing/invalid.
 *   • No pose cycle (idle ↔ wave ↔ point); admin viewer is a
 *     stationary preview, not a hero pitch — keeps the GPU work tiny.
 *   • Optional OrbitControls so the operator can drag-rotate on the
 *     admin detail page (set `interactive={false}` to disable).
 *
 * Wrapped by AdminAgentAvatarBoundary in the parent — if THREE / a
 * shader still throws, the whole detail page survives.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OfficeFigure } from "@/features/agents/components/AgentOfficeFigure3D";
import {
  normalizeAgentAvatarProfile,
  type AgentAvatarProfile,
} from "@/lib/avatars/profile";

// ── Geometry constants — copied verbatim from HeroAgent ────────────
// fov 38° at z=2.4 yields a vertical visible plane of
// 2 · 2.4 · tan(19°) ≈ 1.65 world units. The OfficeFigure rig (with
// its inner position={[0,-0.78,0]} + scale [2.6,2.86,2.6]) renders
// roughly 1.58 units tall, so it fills ~95% of the canvas with a hair
// of margin top + bottom. Camera y = lookAt y = mid → symmetric
// composition with NO tilt.
const RIG_MID_Y = 0.0;
const CAMERA_Z = 2.4;
const CAMERA_FOV = 38;

function PortraitFigure({
  profile,
  onReady,
}: {
  profile: AgentAvatarProfile;
  onReady?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  // Same subtle idle sway HeroAgent uses — slightly turn the head and
  // breathe in/out so the figure doesn't look frozen on a static
  // page. externalAnimation on OfficeFigure stops the rig from
  // adding its own competing motion.
  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    group.rotation.y = Math.sin(t * 0.55) * 0.45 + 0.15;
    group.position.y = RIG_MID_Y + Math.sin(t * 0.9) * 0.005;
  });
  return (
    <group ref={groupRef} position={[0, RIG_MID_Y, 0]}>
      <OfficeFigure profile={profile} onReady={onReady} externalAnimation />
    </group>
  );
}

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

  // The Canvas remounts whenever the profile actually changes — pin
  // the key on a stable serialization so cosmetic re-renders don't
  // tear down the GPU context.
  const profileKey = useMemo(() => JSON.stringify(profile), [profile]);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const isReady = readyKey === profileKey;

  return (
    <div className={`relative ${className}`}>
      {/* Soft ambient halo behind the figure — pure CSS, never
         competes with the 3D character. Same one HeroAgent paints,
         so the admin preview reads like a tiny version of the
         landing portrait. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, rgba(167,139,250,0.22) 0%, rgba(34,211,238,0.06) 40%, transparent 70%)",
        }}
      />

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
        // Same proven framing as HeroAgent (`features/marketing/HeroAgent.tsx`).
        // Camera at the figure's vertical mid + lookAt at same point
        // ⇒ symmetric composition, no tilt, figure fills ~95% of
        // the canvas. fov × distance pre-tuned; only one number
        // to tweak (CAMERA_Z) if a future card wants a different
        // zoom level.
        camera={{ position: [0, RIG_MID_Y, CAMERA_Z], fov: CAMERA_FOV }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, RIG_MID_Y, 0)}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Same lighting rig HeroAgent uses → consistent material
           reads across landing + admin + office. */}
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 4, 5]} intensity={2.0} />
        <directionalLight position={[-4, 2, 3]} intensity={1.0} color="#89a6ff" />
        <directionalLight position={[0, 4, -5]} intensity={1.25} color="#f0d9b5" />
        <Environment preset="city" />
        <PortraitFigure
          profile={profile}
          onReady={() => setReadyKey(profileKey)}
        />
        {interactive ? (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            target={[0, RIG_MID_Y, 0]}
            maxPolarAngle={1.8}
            minPolarAngle={1.1}
          />
        ) : null}
      </Canvas>
    </div>
  );
}
