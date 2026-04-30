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
         * v152.1 framing — fill-the-card edition.
         *
         * The figure spans y∈[-0.78, +0.9] (~1.7m). With z=3.7 +
         * fov=28 the visible vertical at the figure plane is about
         * 1.84m — so the body ends up filling ~94% of the viewport
         * height with a small breathing margin top + bottom.
         * lookAt y=0.10 keeps the chest near viewport center while
         * leaving slightly more room ABOVE the head than below the
         * feet (so the small "LIVE PREVIEW" label down at the
         * bottom doesn't fight the boots).
         *
         * x=0.40 + camera y=0.10 give a gentle three-quarter view
         * so the figure doesn't read as a flat cardboard cut-out.
         */
        camera={{ position: [0.4, 0.1, 3.7], fov: 28 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0.1, 0)}
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
