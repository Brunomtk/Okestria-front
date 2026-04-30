"use client";

/**
 * v140 — HeroAgent.
 *
 * Renders the EXACT same 3D figure used in the office scene as the
 * star of the landing-page hero. The agent runs an animation cycle
 * — idle / wave / point / walk — on a soft cosmic stage so visitors
 * see the actual product (not a generic illustration) within the
 * first second of landing.
 *
 * Why this implementation:
 *   • The figure rig (`OfficeFigure`) already publishes refs for
 *     left/right arm groups; we use those for the wave + point
 *     animations directly inside <Canvas> with `useFrame`.
 *   • Walking is faked at the group level (translate + bob) — the
 *     legs aren't independently rigged, so animating the whole
 *     figure on a sine-wave path reads as "strolling" without
 *     uncanny knee bends.
 *   • Profile is generated from a stable random seed once on mount,
 *     so each visitor gets a fresh agent (skin tone / hair / outfit)
 *     but the figure doesn't reroll mid-session.
 *   • Loaded with `next/dynamic` (`ssr: false`) at the parent so
 *     React Three Fiber + the avatar shaders stay out of the SSR
 *     bundle. Without that, hydration would fail on the
 *     <canvas>-only rendering paths.
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

type Phase = "idle" | "wave" | "walk" | "point";

/**
 * Cycle plan — feels intentional rather than random:
 *   idle (3s) → wave (2s) → idle (1.5s) → walk (4s) → point (2s) → idle (2.5s)
 * Total ~15s, then loops.
 */
const CYCLE: Array<{ phase: Phase; duration: number }> = [
  { phase: "idle",  duration: 3.0 },
  { phase: "wave",  duration: 2.0 },
  { phase: "idle",  duration: 1.5 },
  { phase: "walk",  duration: 4.0 },
  { phase: "point", duration: 2.0 },
  { phase: "idle",  duration: 2.5 },
];

// ─────────────────────────────────────────────────────────────────────
// Inner figure — drives the animation. Renders inside <Canvas>.
// ─────────────────────────────────────────────────────────────────────

function AnimatedHeroFigure({
  profile,
  onReady,
  onPhaseChange,
}: {
  profile: AgentAvatarProfile;
  onReady?: () => void;
  onPhaseChange?: (phase: Phase) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  // Refs into OfficeFigure's arm groups — set after first render via the
  // imperative DOM-ish escape hatch below.
  const armRefs = useRef<{ left: THREE.Group | null; right: THREE.Group | null }>({
    left: null,
    right: null,
  });
  const phaseRef = useRef<Phase>("idle");
  const phaseStartRef = useRef(0);
  const cycleIndexRef = useRef(0);
  const lastPublishedPhaseRef = useRef<Phase | null>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (phaseStartRef.current === 0) phaseStartRef.current = t;

    // Advance through the cycle when the current phase's duration is up.
    const elapsed = t - phaseStartRef.current;
    const current = CYCLE[cycleIndexRef.current % CYCLE.length]!;
    if (elapsed >= current.duration) {
      cycleIndexRef.current = (cycleIndexRef.current + 1) % CYCLE.length;
      phaseStartRef.current = t;
      const nextPhase = CYCLE[cycleIndexRef.current]!.phase;
      phaseRef.current = nextPhase;
    } else {
      phaseRef.current = current.phase;
    }

    if (lastPublishedPhaseRef.current !== phaseRef.current) {
      lastPublishedPhaseRef.current = phaseRef.current;
      onPhaseChange?.(phaseRef.current);
    }

    const phase = phaseRef.current;
    const localT = elapsed; // seconds inside the current phase
    const group = groupRef.current;
    if (!group) return;

    // Default rest pose. NOTE: the inner OfficeFigure group already has
    // its `position={[0, -0.78, 0]}` from its JSX, so my OUTER group's
    // y is an OFFSET on top of that. Base 0 here = same height as the
    // figure's normal "standing on the floor" pose.
    let bodyRotY = Math.sin(t * 0.55) * 0.18 + 0.05;
    let bodyX = 0;
    let bodyY = Math.sin(t * 0.9) * 0.006; // breath
    let leftArmX = -0.05 + Math.sin(t * 0.9) * 0.05;
    let leftArmZ = -0.14;
    let rightArmX = -0.05 + Math.sin(t * 0.9 + Math.PI) * 0.05;
    let rightArmZ = 0.14;

    if (phase === "idle") {
      // Already covered by defaults — gentle sway + breath.
    } else if (phase === "wave") {
      // Right arm raises and waves side-to-side. Body subtly leans
      // toward camera so the wave reads as "hi, you".
      bodyRotY = Math.sin(t * 0.4) * 0.08 + 0.05;
      const wavePhase = Math.min(1, localT / 0.4); // ramp up
      const waveFall = Math.min(1, Math.max(0, (current.duration - localT) / 0.4)); // ramp down
      const ramp = wavePhase * waveFall;
      rightArmX = -1.5 * ramp; // arm up high
      rightArmZ = 0.5 + Math.sin(t * 7) * 0.45 * ramp;
      // Tiny torso lean so the wave feels emphatic
      bodyX = 0.02 * ramp;
    } else if (phase === "walk") {
      // Walk along a horizontal arc — left, then right, then settle.
      // Path: [0 → -0.7 → +0.7 → 0] over the phase's duration.
      const u = Math.min(1, localT / current.duration);
      // 4 keyframes: 0→-0.7 (turn), -0.7→+0.7 (cross), +0.7→0 (return)
      let x: number;
      if (u < 0.25) {
        x = -2.8 * u; // 0 → -0.7
      } else if (u < 0.75) {
        x = -0.7 + 2.8 * (u - 0.25); // -0.7 → +0.7
      } else {
        x = 0.7 - 2.8 * (u - 0.75); // +0.7 → 0
      }
      bodyX = x;
      // Walking bob (faster cadence + bigger amplitude than idle breath)
      const cadence = t * 6.0;
      bodyY = Math.abs(Math.sin(cadence)) * 0.04; // offset on top of inner group's -0.78
      // Face direction: rotate body to face the next x position.
      const dirSign =
        u < 0.25 ? -1 :
        u < 0.5  ? +1 :
        u < 0.75 ? +1 :
                   -1;
      bodyRotY = dirSign * 0.5;
      // Arms swing opposite to legs.
      leftArmX = Math.sin(cadence) * 0.45;
      rightArmX = -Math.sin(cadence) * 0.45;
      leftArmZ = -0.18;
      rightArmZ = 0.18;
    } else if (phase === "point") {
      // Right arm points outward, body rotates slightly to look in
      // that direction — like the agent is "inviting you to scroll".
      const ramp = Math.min(1, localT / 0.4) * Math.min(1, (current.duration - localT) / 0.4);
      bodyRotY = -0.35 * ramp + 0.05;
      rightArmX = -0.6 * ramp;
      rightArmZ = 0.9 * ramp;
      // Hold idle for the left
      leftArmX = -0.05;
      leftArmZ = -0.14;
    }

    group.rotation.y = bodyRotY;
    group.position.x = bodyX;
    group.position.y = bodyY;

    // Apply arm overrides — we have to dive into the inner OfficeFigure
    // arm refs which were captured via a one-shot scan after mount.
    if (armRefs.current.left) {
      armRefs.current.left.rotation.x = leftArmX;
      armRefs.current.left.rotation.z = leftArmZ;
    }
    if (armRefs.current.right) {
      armRefs.current.right.rotation.x = rightArmX;
      armRefs.current.right.rotation.z = rightArmZ;
    }
  });

  // After OfficeFigure mounts, scan the children to find arm groups
  // (named via `name` we set below). This lets us drive the arms
  // without forking the OfficeFigure source.
  useEffect(() => {
    const scan = () => {
      const group = groupRef.current;
      if (!group) return;
      group.traverse((child) => {
        if (child.name === "hero-arm-left" && child instanceof THREE.Group) {
          armRefs.current.left = child;
        }
        if (child.name === "hero-arm-right" && child instanceof THREE.Group) {
          armRefs.current.right = child;
        }
      });
    };
    // Try once immediately + once after a tick (OfficeFigure mounts async).
    scan();
    const id = setTimeout(scan, 50);
    return () => clearTimeout(id);
  }, [profile]);

  return (
    <group ref={groupRef}>
      {/* externalAnimation tells OfficeFigure to skip its own idle
          sway/breathing so our HeroAgent useFrame is the sole driver
          of the rig (rotation + position via groupRef, arm rotations
          via the named groups inside the figure). */}
      <OfficeFigure profile={profile} onReady={onReady} externalAnimation />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Stage — soft podium + glow rings under the figure
// ─────────────────────────────────────────────────────────────────────

function HeroStage() {
  return (
    <group position={[0, -0.8, 0]}>
      {/* Floor disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.6, 64]} />
        <meshStandardMaterial
          color="#0b0e1a"
          roughness={0.85}
          metalness={0.15}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Inner glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[0.95, 1.05, 64]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.35} />
      </mesh>
      {/* Outer thinner glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[1.45, 1.5, 64]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────

export function HeroAgent({
  className = "",
  showPhaseLabel = true,
}: {
  className?: string;
  showPhaseLabel?: boolean;
}) {
  // Random seed picked once per page-mount. We salt with a date-bucket
  // so refreshes within the same session usually keep the same look,
  // but a new visitor gets something fresh.
  const seed = useMemo(() => {
    const stamp = Date.now();
    const r = Math.floor(Math.random() * 100000);
    return `hero-${stamp.toString(36)}-${r.toString(36)}`;
  }, []);
  const profile = useMemo(() => createAgentAvatarProfileFromSeed(seed), [seed]);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");

  return (
    <div className={`relative ${className}`}>
      {/* Loading veil while the avatar shaders compile */}
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-violet-300" />
        </div>
      ) : null}

      <Canvas
        camera={{ position: [0, 0.4, 4.6], fov: 28 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0.05, 0)}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Lighting matches the office scene defaults so the agent
            feels like they walked straight out of the workspace. */}
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 4, 5]} intensity={2.0} />
        <directionalLight position={[-4, 2, 3]} intensity={1.0} color="#89a6ff" />
        <directionalLight position={[0, 4, -5]} intensity={1.25} color="#f0d9b5" />
        <Environment preset="city" />
        <HeroStage />
        <AnimatedHeroFigure
          profile={profile}
          onReady={() => setReady(true)}
          onPhaseChange={setPhase}
        />
      </Canvas>

      {/* Phase indicator — small floating pill that changes label as
          the agent transitions through idle/wave/walk/point. */}
      {showPhaseLabel && ready ? (
        <div
          key={phase}
          className="ork-phase-badge absolute left-1/2 top-3 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/65 backdrop-blur"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background:
                phase === "wave"
                  ? "#f59e0b"
                  : phase === "walk"
                    ? "#22d3ee"
                    : phase === "point"
                      ? "#a78bfa"
                      : "#34d399",
              boxShadow:
                phase === "wave"
                  ? "0 0 8px #f59e0b80"
                  : phase === "walk"
                    ? "0 0 8px #22d3ee80"
                    : phase === "point"
                      ? "0 0 8px #a78bfa80"
                      : "0 0 8px #34d39980",
            }}
          />
          {phaseLabel(phase)}
        </div>
      ) : null}

      <style jsx>{`
        @keyframes ork-phase-fade-in {
          from { opacity: 0; transform: translate(-50%, -2px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .ork-phase-badge {
          animation: ork-phase-fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

function phaseLabel(p: Phase): string {
  switch (p) {
    case "wave":
      return "Saying hi";
    case "walk":
      return "Walking the floor";
    case "point":
      return "Showing you around";
    case "idle":
    default:
      return "Idle";
  }
}

export default HeroAgent;
