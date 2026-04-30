"use client";

/**
 * v149 — Admin · Agent avatar viewer (full-figure framing).
 *
 * The shared `AgentAvatarPreview3D` is tuned for the editor (square-ish
 * viewport, gentle pull-back). When that component is dropped into the
 * admin's wide rectangular card the figure ends up as a small dot at
 * the top with empty floor below. So the admin gets its own thin
 * client island that mounts the SAME `OfficeFigure` but with a camera
 * tuned for the wide context: closer in, framed at chest height, no
 * orbit drift (the admin viewer is for inspection — the editor still
 * keeps free-look).
 */

import { useMemo, useState } from "react";
import { Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { OfficeFigure } from "@/features/agents/components/AgentOfficeFigure3D";
import {
  normalizeAgentAvatarProfile,
  type AgentAvatarProfile,
} from "@/lib/avatars/profile";

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
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const isReady = readyKey === profileKey;

  return (
    <div className={`relative ${className}`}>
      {!isReady ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-transparent text-white/55">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
          <div className="font-mono text-[10.5px] uppercase tracking-[0.18em]">
            Loading avatar…
          </div>
        </div>
      ) : null}

      <Canvas
        key={profileKey}
        /*
         * v152 framing.
         *
         * Use the editor's known-good camera (z=5.2, fov=24, lookAt
         * at world origin) so the figure renders at full resolution
         * and the engine's internal layout is happy. To "push the
         * figure down" inside our portrait card we don't move the
         * camera — we wrap OfficeFigure in a group offset of y=-0.55.
         * That shifts the body a little over half a meter down in
         * WORLD space, which lands its chest in the lower-third of
         * the viewport instead of the top.
         */
        camera={{ position: [0.45, 0.2, 5.2], fov: 24 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0.0, 0)}
        style={{ background: "transparent" }}
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
          intensity={1.2}
          color="#f0d9b5"
        />
        <group position={[0, -0.55, 0]}>
          <OfficeFigure
            profile={profile}
            onReady={() => setReadyKey(profileKey)}
          />
        </group>
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
