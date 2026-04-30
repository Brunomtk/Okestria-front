"use client";

/**
 * v153 — Admin · Agent avatar viewer.
 *
 * Lifted directly from `HeroAgentDashboard.PortraitFigure` (the
 * dashboard's tiny 3D portrait). That setup is the proven
 * "fills-the-card" framing — same camera + lookAt as the agent
 * editor, just with an internal sway via useFrame so the figure
 * doesn't sit dead-still.
 *
 * Camera: position [0.45, 0.2, 4.2], fov 24, lookAt (0, 0, 0).
 * The card itself is sized aspect-square so the half-height of the
 * camera (≈0.89m) covers the figure (1.7m total) with a small
 * margin top/bottom.
 */

import { useMemo, useRef, useState } from "react";
import { Environment } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OfficeFigure } from "@/features/agents/components/AgentOfficeFigure3D";
import {
  normalizeAgentAvatarProfile,
  type AgentAvatarProfile,
} from "@/lib/avatars/profile";

function PortraitFigure({
  profile,
  onReady,
}: {
  profile: AgentAvatarProfile;
  onReady?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  // Same idle sway numbers as the dashboard's PortraitFigure.
  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    group.rotation.y = Math.sin(t * 0.55) * 0.45 + 0.15;
    group.position.y = Math.sin(t * 0.9) * 0.005;
  });
  return (
    <group ref={groupRef}>
      {/* `externalAnimation` so OUR sway is the only animation in
          play — without it OfficeFigure adds its own and they
          fight each other. */}
      <OfficeFigure profile={profile} externalAnimation onReady={onReady} />
    </group>
  );
}

export function AdminAgentAvatar({
  avatarProfileJson,
  fallbackSeed,
  className = "",
}: {
  avatarProfileJson: string | null;
  fallbackSeed: string;
  className?: string;
}) {
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

  const profileKey = useMemo(() => JSON.stringify(profile), [profile]);
  const [ready, setReady] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-violet-300" />
        </div>
      ) : null}
      <Canvas
        key={profileKey}
        // Same proven framing as HeroAgentDashboard's PortraitFigure.
        camera={{ position: [0.45, 0.2, 4.2], fov: 24 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0.0, 0)}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 4, 5]} intensity={2.0} />
        <directionalLight
          position={[-4, 2, 3]}
          intensity={1.0}
          color="#89a6ff"
        />
        <directionalLight
          position={[0, 4, -5]}
          intensity={1.25}
          color="#f0d9b5"
        />
        <Environment preset="city" />
        <PortraitFigure profile={profile} onReady={() => setReady(true)} />
      </Canvas>
    </div>
  );
}
