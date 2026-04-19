"use client";

// AgentAvatarPreview3D — large rectangular preview for the Agent Editor.
// Renders the EXACT same rounded figure used in the office scene, sidebar
// rows, and chat panel. Keeping a single source-of-truth prevents the
// preview from drifting away from what the user sees in the office.

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import {
  type AgentAvatarProfile,
  createDefaultAgentAvatarProfile,
} from "@/lib/avatars/profile";
import { OfficeFigure } from "./AgentOfficeFigure3D";

export const AgentAvatarPreview3D = ({
  profile,
  className = "",
}: {
  profile: AgentAvatarProfile | null | undefined;
  className?: string;
}) => {
  const resolvedProfile = useMemo(
    () => profile ?? createDefaultAgentAvatarProfile("preview"),
    [profile]
  );
  const profileKey = useMemo(() => JSON.stringify(resolvedProfile), [resolvedProfile]);
  const [readyProfileKey, setReadyProfileKey] = useState<string | null>(null);
  const isReady = readyProfileKey === profileKey;

  return (
    <div className={`relative ${className}`}>
      {!isReady ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#070b16] text-white/70">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
          <div className="font-mono text-[11px] tracking-[0.08em] text-white/55">
            Loading avatar...
          </div>
        </div>
      ) : null}
      <Canvas
        key={profileKey}
        /* Pulled back + aimed lower so the FULL body (head → feet)
           fits comfortably in the large editor preview. The figure
           lives centered around y=0.4 world, head at y≈0.65, feet at
           y≈0, so we frame on y=0.35 with plenty of headroom. */
        camera={{ position: [0.55, 0.55, 4.6], fov: 22 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ camera }) => camera.lookAt(0, 0.35, 0)}
      >
        <color attach="background" args={["#070b16"]} />
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 4, 5]} intensity={2.0} />
        <directionalLight position={[-4, 2, 3]} intensity={1.0} color="#89a6ff" />
        <directionalLight position={[0, 4, -5]} intensity={1.25} color="#f0d9b5" />
        <OfficeFigure
          profile={resolvedProfile}
          onReady={() => setReadyProfileKey(profileKey)}
        />
        <Environment preset="city" />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          target={[0, 0.35, 0]}
          maxPolarAngle={1.8}
          minPolarAngle={1.1}
        />
      </Canvas>
    </div>
  );
};
