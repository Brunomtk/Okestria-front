"use client";

/**
 * v142.5 — HeroAgent rewritten from scratch.
 *
 * Earlier versions wrestled the OfficeFigure rig's idiosyncratic
 * coordinate system (internal `position={[0, -0.78, 0]}` with
 * `scale={[2.6, 2.6 * 1.1, 2.6]}`) by piling on camera offsets and
 * lookAt math, which kept producing crops, voids, or off-center
 * framing depending on the viewport. This version takes a different
 * tack:
 *
 *   1. Wrap OfficeFigure in our own `<group>` whose y position
 *      cancels the rig's natural mid-height offset, so the figure
 *      visually centers on world origin (head at +y, feet at -y).
 *   2. Camera sits on the world origin's horizontal plane (y=0,
 *      z=3.4) with a wide fov (38°) and `lookAt(0,0,0)`. No tilt,
 *      no offset — symmetric framing top-to-bottom.
 *   3. No floor disc, no glow rings, no opaque platform under the
 *      feet. The figure floats against the gradient background of
 *      the parent card, which gives the cleanest portrait read.
 *   4. Subtle `idle ↔ wave ↔ point` pose cycle on the figure's
 *      arms (we drive the arm groups by name lookup, the figure is
 *      in `externalAnimation` mode so there's no fight with the
 *      built-in sway).
 *
 * If the operator opens the modal AGAIN later and wants the camera
 * to slide a smidge closer, only one number (`CAMERA_Z`) needs to
 * change — the figure stays centered automatically.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  type AgentAvatarProfile,
  createAgentAvatarProfileFromSeed,
} from "@/lib/avatars/profile";
import { OfficeFigure } from "@/features/agents/components/AgentOfficeFigure3D";

// ── Geometry constants ──────────────────────────────────────────────
//
// I read every position in OfficeFigure's geometry (legs, torso,
// head, hat) and applied the inner group's `scale={[2.6, 2.86, 2.6]}`
// + `position={[0, -0.78, 0]}` on top. Empirically the figure renders
// roughly:
//   feet  ≈ y = -0.78
//   head  ≈ y = +0.80   (head sphere center around 0.55 in inner
//                         local × scale 2.86 ≈ 1.57, then +offset)
//   mid   ≈ y = +0.01
// Total visual height ≈ 1.58 world units.
//
// Strategy: skip wrapper offsets (they keep producing off-center
// renders when fov / aspect changes). Instead, plant the camera +
// lookAt directly at the figure's TRUE vertical mid. This is what
// AgentAvatarPreview3D does internally, just with our own zoom.
const RIG_MID_Y = 0.0;

// Camera placement. fov 38 + z=2.4 yields a vertical visible plane
// of 2 · 2.4 · tan(19°) ≈ 1.65 world units. The figure is ~1.58
// units tall, so it fills ~95% of the canvas vertically with a hair
// of margin top + bottom. Camera y = lookAt y = mid → symmetric
// composition with NO tilt.
const CAMERA_Z = 2.4;
const CAMERA_FOV = 38;

// ─────────────────────────────────────────────────────────────────────
// Pose cycle — idle / wave / point. No walking in the hero portrait;
// walking is what `OfficeMock3D` does for the section showcase.
// ─────────────────────────────────────────────────────────────────────

type Pose = "idle" | "wave" | "point";
const CYCLE: Array<{ pose: Pose; duration: number }> = [
  { pose: "idle",  duration: 4.0 },
  { pose: "wave",  duration: 2.2 },
  { pose: "idle",  duration: 2.2 },
  { pose: "point", duration: 2.4 },
  { pose: "idle",  duration: 3.2 },
];

// ─────────────────────────────────────────────────────────────────────
// Inner figure with pose driver
// ─────────────────────────────────────────────────────────────────────

function PortraitFigure({
  profile,
  onReady,
}: {
  profile: AgentAvatarProfile;
  onReady?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const armRefs = useRef<{ left: THREE.Group | null; right: THREE.Group | null }>({
    left: null,
    right: null,
  });
  const cycleIdxRef = useRef(0);
  const phaseStartRef = useRef(0);

  // Find arm groups by name once after mount (renamed in v140).
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const scan = () => {
      group.traverse((child) => {
        if (child.name === "hero-arm-left" && child instanceof THREE.Group) {
          armRefs.current.left = child;
        }
        if (child.name === "hero-arm-right" && child instanceof THREE.Group) {
          armRefs.current.right = child;
        }
      });
    };
    scan();
    const id = setTimeout(scan, 50);
    return () => clearTimeout(id);
  }, [profile]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (phaseStartRef.current === 0) phaseStartRef.current = t;

    // Advance through the pose cycle.
    let elapsed = t - phaseStartRef.current;
    let current = CYCLE[cycleIdxRef.current % CYCLE.length]!;
    while (elapsed >= current.duration) {
      elapsed -= current.duration;
      phaseStartRef.current += current.duration;
      cycleIdxRef.current = (cycleIdxRef.current + 1) % CYCLE.length;
      current = CYCLE[cycleIdxRef.current]!;
    }
    const pose = current.pose;
    const localT = elapsed;

    const group = groupRef.current;
    if (!group) return;

    // Outer transform — small horizontal sway + breath. Position y is
    // FIXED at RIG_MID_Y so the figure stays centered.
    const sway = Math.sin(t * 0.55) * 0.18 + 0.04;
    const breath = Math.sin(t * 0.9) * 0.005;
    group.rotation.y = sway;
    group.position.y = RIG_MID_Y + breath;

    // Default idle arm pose
    let leftArmX = -0.05 + Math.sin(t * 0.9) * 0.05;
    let leftArmZ = -0.14;
    let rightArmX = -0.05 + Math.sin(t * 0.9 + Math.PI) * 0.05;
    let rightArmZ = 0.14;

    if (pose === "wave") {
      const ramp =
        Math.min(1, localT / 0.4) *
        Math.min(1, Math.max(0, (current.duration - localT) / 0.4));
      rightArmX = -1.5 * ramp;
      rightArmZ = 0.5 + Math.sin(t * 7) * 0.45 * ramp;
    } else if (pose === "point") {
      const ramp =
        Math.min(1, localT / 0.4) *
        Math.min(1, Math.max(0, (current.duration - localT) / 0.4));
      group.rotation.y = -0.35 * ramp + sway * (1 - ramp);
      rightArmX = -0.6 * ramp;
      rightArmZ = 0.9 * ramp;
    }

    if (armRefs.current.left) {
      armRefs.current.left.rotation.x = leftArmX;
      armRefs.current.left.rotation.z = leftArmZ;
    }
    if (armRefs.current.right) {
      armRefs.current.right.rotation.x = rightArmX;
      armRefs.current.right.rotation.z = rightArmZ;
    }
  });

  return (
    // Initial position matches what useFrame writes on tick 1 so the
    // figure doesn't pop up by 0.22 units on the first paint.
    <group ref={groupRef} position={[0, RIG_MID_Y, 0]}>
      <OfficeFigure profile={profile} onReady={onReady} externalAnimation />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────

export function HeroAgent({
  className = "",
  // Kept for backward-compat with callers — v142.4 quietly hid this.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showPhaseLabel,
}: {
  className?: string;
  showPhaseLabel?: boolean;
}) {
  // Random seed picked once per page-mount.
  const seed = useMemo(() => {
    const stamp = Date.now();
    const r = Math.floor(Math.random() * 100000);
    return `hero-${stamp.toString(36)}-${r.toString(36)}`;
  }, []);
  const profile = useMemo(() => createAgentAvatarProfileFromSeed(seed), [seed]);
  const [ready, setReady] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Soft ambient halo behind the figure — pure CSS, never
          competes with the 3D character for visual weight. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, rgba(167,139,250,0.22) 0%, rgba(34,211,238,0.06) 40%, transparent 70%)",
        }}
      />

      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-violet-300" />
        </div>
      ) : null}

      <Canvas
        // Camera planted at the figure's vertical mid (RIG_MID_Y) and
        // looking at the same point — symmetric composition with no
        // tilt. fov × distance pre-tuned so the figure fills 95% of
        // the canvas vertically. Wrapper position is also at
        // RIG_MID_Y so the figure RENDERS centered on world origin.
        camera={{ position: [0, RIG_MID_Y, CAMERA_Z], fov: CAMERA_FOV }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, RIG_MID_Y, 0)}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Same lighting as the avatar editor + office scene so the
            figure's materials read consistently across surfaces. */}
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 4, 5]} intensity={2.0} />
        <directionalLight position={[-4, 2, 3]} intensity={1.0} color="#89a6ff" />
        <directionalLight position={[0, 4, -5]} intensity={1.25} color="#f0d9b5" />
        <Environment preset="city" />
        <PortraitFigure
          profile={profile}
          onReady={() => setReady(true)}
        />
      </Canvas>
    </div>
  );
}

export default HeroAgent;
