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
         * v150 framing — the figure's WORLD bounds are roughly
         * y∈[-0.78, +0.90] (~1.7m tall). With z=5.2 + fov=28 the
         * visible vertical at the figure plane is ~2.6m, so the body
         * always fits with margin. Pointing the camera at y=0.45
         * (above the figure's chest) pushes the body INTO the lower
         * half of the viewport — that's the "move it down" the
         * operator asked for. A small x=0.5 keeps the figure feeling
         * three-dimensional rather than flat.
         */
        camera={{ position: [0.5, 0.35, 5.2], fov: 28 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0.45, 0)}
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
        <OfficeFigure
          profile={profile}
          onReady={() => setReadyKey(profileKey)}
        />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
