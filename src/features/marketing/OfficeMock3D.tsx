"use client";

/**
 * v142 — Real 3D office mock for the landing page.
 *
 * This replaces the v141 SVG fake with a proper R3F scene that uses
 * the EXACT same `OfficeFigure` rig the operator sees inside the
 * workspace. Five characters (deterministic seeds → recognisable
 * profiles) walk between desks, occasionally pause to "work", and
 * pop speech bubbles via HTML overlays. The room has:
 *
 *   • Floor + back/side walls with subtle violet ambient
 *   • 4 desks with computers + chairs
 *   • Plants in the corners
 *   • The Orkestria mark on the back wall
 *
 * Performance budget:
 *   • Same lighting as the real office (4 directional + ambient)
 *   • All meshes use `MeshLambertMaterial` (default for the lib)
 *   • cooldownTicks → 0 effective: agents are pure useFrame walks,
 *     no force simulation runs in this scene.
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

// ── Scene constants ──────────────────────────────────────────────────

const ROOM_WIDTH = 18;
const ROOM_DEPTH = 10;
const FLOOR_Y = 0;

// Desk positions (x, z) — back row + front row.
const DESKS = [
  { x: -5, z: -2.5, accent: "#22d3ee" },
  { x:  0, z: -2.5, accent: "#a78bfa" },
  { x:  5, z: -2.5, accent: "#34d399" },
  { x: -5, z:  2.0, accent: "#f59e0b" },
] as const;

// Plants in the corners.
const PLANTS = [
  { x: -8.2, z: -3.5 },
  { x:  8.2, z: -3.5 },
  { x: -8.2, z:  3.5 },
  { x:  8.2, z:  3.5 },
] as const;

// Five agents walking 3-point loops. Each path has an explicit pause
// node so the agent appears to "work" (stand still) at a desk.
type Path = Array<{ x: number; z: number; pause?: number }>;

const AGENTS: Array<{ seed: string; path: Path; speed: number; phase: number }> = [
  {
    seed: "lucia-scout",
    path: [
      { x: -5, z:  2.0, pause: 2.5 }, // desk 4
      { x: -2, z:  0   },
      { x:  4, z:  3   },
      { x:  7, z:  1   },
    ],
    speed: 1.6,
    phase: 0.0,
  },
  {
    seed: "lucio-rep",
    path: [
      { x:  0, z: -2.5, pause: 3.0 }, // desk 2
      { x:  3, z:  1   },
      { x:  5, z: -2.5, pause: 2.2 }, // desk 3
      { x:  1, z:  3   },
    ],
    speed: 1.4,
    phase: 0.25,
  },
  {
    seed: "olga-closer",
    path: [
      { x: -7, z:  3   },
      { x: -3, z:  3   },
      { x:  2, z:  2.5 },
      { x:  6, z:  2.5 },
    ],
    speed: 1.2,
    phase: 0.4,
  },
  {
    seed: "yann-analyst",
    path: [
      { x: -5, z: -2.5, pause: 3.2 }, // desk 1
      { x: -3, z: -1   },
      { x:  2, z:  0.5 },
      { x:  6, z: -1   },
    ],
    speed: 1.3,
    phase: 0.6,
  },
  {
    seed: "mira-scribe",
    path: [
      { x:  7, z:  3   },
      { x:  4, z:  1.5 },
      { x: -2, z:  1.5 },
      { x: -6, z:  3   },
    ],
    speed: 1.5,
    phase: 0.8,
  },
];

const SPEECH_LINES = [
  "running scrape…",
  "saved 12 leads",
  "drafting message",
  "sent ✓",
  "ping in cortex",
  "checking inbox",
  "9 to follow up",
  "queue cleared",
  "found 3 hot leads",
];

// ─────────────────────────────────────────────────────────────────────
// Walking figure — wraps OfficeFigure with a path animation
// ─────────────────────────────────────────────────────────────────────

type SpeechHook = (id: string, line: string) => void;

function WalkingAgent({
  seed,
  path,
  speed,
  phase,
  onSpeech,
  onPosUpdate,
  onReady,
}: {
  seed: string;
  path: Path;
  speed: number;
  phase: number;
  onSpeech: SpeechHook;
  onPosUpdate: (id: string, pos: { x: number; y: number; z: number }) => void;
  onReady?: () => void;
}) {
  const profile = useMemo<AgentAvatarProfile>(
    () => createAgentAvatarProfileFromSeed(seed),
    [seed],
  );
  const groupRef = useRef<THREE.Group>(null);
  const armLeftRef = useRef<THREE.Group | null>(null);
  const armRightRef = useRef<THREE.Group | null>(null);

  // Pre-compute segment lengths for constant-speed traversal.
  const segments = useMemo(() => {
    const segs: Array<{ from: number; to: number; length: number; pause: number }> = [];
    let cursor = phase;
    for (let i = 0; i < path.length; i++) {
      const a = path[i]!;
      const b = path[(i + 1) % path.length]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const pause = a.pause ?? 0;
      segs.push({ from: cursor, to: cursor + pause + length / speed, length, pause });
      cursor = cursor + pause + length / speed;
    }
    return { segs, total: cursor - phase };
  }, [path, speed, phase]);

  // Find arms once after mount via name lookup (added in v140).
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const scan = () => {
      group.traverse((child) => {
        if (child.name === "hero-arm-left" && child instanceof THREE.Group) {
          armLeftRef.current = child;
        }
        if (child.name === "hero-arm-right" && child instanceof THREE.Group) {
          armRightRef.current = child;
        }
      });
    };
    scan();
    const id = setTimeout(scan, 50);
    return () => clearTimeout(id);
  }, [profile]);

  // Speech bubble cadence — each agent randomly says something every
  // 8-15s. Independent timer per agent.
  useEffect(() => {
    const fire = () => {
      const line = SPEECH_LINES[Math.floor(Math.random() * SPEECH_LINES.length)]!;
      onSpeech(seed, line);
    };
    const initialDelay = 2000 + phase * 5000;
    const initial = setTimeout(() => {
      fire();
      const id = setInterval(fire, 8000 + Math.random() * 7000);
      return () => clearInterval(id);
    }, initialDelay);
    return () => clearTimeout(initial);
  }, [seed, phase, onSpeech]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;

    // Place into the loop space (each agent has its own offset).
    const u = (t - phase + 1000) % segments.total; // wrap positive
    let here = u;
    let segIdx = 0;
    let segStart = 0;
    for (let i = 0; i < segments.segs.length; i++) {
      const s = segments.segs[i]!;
      const segDur = s.to - s.from;
      if (here < segDur) {
        segIdx = i;
        break;
      }
      here -= segDur;
      segStart += segDur;
    }
    const seg = segments.segs[segIdx]!;
    const a = path[segIdx]!;
    const b = path[(segIdx + 1) % path.length]!;
    let progress: number;
    let isWalking: boolean;
    if (here < seg.pause) {
      // Pause phase — stand still at point A.
      progress = 0;
      isWalking = false;
    } else {
      progress = (here - seg.pause) / Math.max(0.001, (seg.to - seg.from - seg.pause));
      isWalking = true;
    }
    const posX = a.x + (b.x - a.x) * progress;
    const posZ = a.z + (b.z - a.z) * progress;

    // Walking bob — only while moving. The +0.78 offset compensates
    // for OfficeFigure's internal `position={[0, -0.78, 0]}` so the
    // figure's FEET land on FLOOR_Y instead of 0.78 units below it
    // (the bug in v142.0 where agents showed only torso+head because
    // their lower bodies were sunk into the floor mesh).
    const cadence = t * 6;
    const bob = isWalking ? Math.abs(Math.sin(cadence)) * 0.05 : Math.sin(t * 0.8) * 0.005;
    group.position.set(posX, FLOOR_Y + 0.78 + bob, posZ);

    // Heading — face direction of travel.
    if (isWalking) {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const heading = Math.atan2(dx, dz);
      group.rotation.y = heading;
    } else {
      // Idle gentle sway when paused at desk.
      group.rotation.y = Math.sin(t * 0.3) * 0.2;
    }

    // Arm swing — walk arms swing opposite legs; idle arms breathe.
    if (armLeftRef.current && armRightRef.current) {
      if (isWalking) {
        armLeftRef.current.rotation.x = Math.sin(cadence) * 0.45;
        armLeftRef.current.rotation.z = -0.18;
        armRightRef.current.rotation.x = -Math.sin(cadence) * 0.45;
        armRightRef.current.rotation.z = 0.18;
      } else {
        armLeftRef.current.rotation.x = -0.05 + Math.sin(t * 0.9) * 0.05;
        armLeftRef.current.rotation.z = -0.14;
        armRightRef.current.rotation.x = -0.05 + Math.sin(t * 0.9 + Math.PI) * 0.05;
        armRightRef.current.rotation.z = 0.14;
      }
    }

    onPosUpdate(seed, { x: posX, y: FLOOR_Y + 0.78 + bob + 1.6, z: posZ });
  });

  return (
    <group ref={groupRef}>
      <OfficeFigure profile={profile} externalAnimation onReady={onReady} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Static room geometry — floor, walls, desks, plants
// ─────────────────────────────────────────────────────────────────────

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
      <planeGeometry args={[ROOM_WIDTH * 1.4, ROOM_DEPTH * 1.4]} />
      <meshStandardMaterial color="#0e1322" roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

function Walls() {
  const wallMat = (
    <meshStandardMaterial
      color="#13182a"
      roughness={0.95}
      metalness={0}
      transparent
      opacity={0.92}
    />
  );
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 2, -ROOM_DEPTH / 2]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH * 1.4, 5]} />
        {wallMat}
      </mesh>
      {/* Window glow on back wall */}
      <mesh position={[-3.5, 2.5, -ROOM_DEPTH / 2 + 0.02]}>
        <planeGeometry args={[3.5, 1.8]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.12} />
      </mesh>
      {/* Window frame */}
      <mesh position={[-3.5, 2.5, -ROOM_DEPTH / 2 + 0.025]}>
        <planeGeometry args={[3.6, 0.05]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.55} />
      </mesh>
      <mesh position={[-3.5, 1.62, -ROOM_DEPTH / 2 + 0.025]}>
        <planeGeometry args={[3.6, 0.05]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.55} />
      </mesh>
      <mesh position={[-3.5, 3.4, -ROOM_DEPTH / 2 + 0.025]}>
        <planeGeometry args={[3.6, 0.05]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.55} />
      </mesh>
      <mesh position={[-3.5, 2.5, -ROOM_DEPTH / 2 + 0.025]}>
        <planeGeometry args={[0.05, 1.85]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function Desk3D({ x, z, accent }: { x: number; z: number; accent: string }) {
  return (
    <group position={[x, 0, z]}>
      {/* Desk surface */}
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.08, 1.0]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.15} />
      </mesh>
      {/* Desk legs */}
      <mesh position={[-1.1, 0.39, -0.45]}>
        <boxGeometry args={[0.06, 0.78, 0.06]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[ 1.1, 0.39, -0.45]}>
        <boxGeometry args={[0.06, 0.78, 0.06]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[-1.1, 0.39,  0.45]}>
        <boxGeometry args={[0.06, 0.78, 0.06]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[ 1.1, 0.39,  0.45]}>
        <boxGeometry args={[0.06, 0.78, 0.06]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* Monitor — back faces the agent */}
      <group position={[0, 0.82, -0.25]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[1.2, 0.85, 0.06]} />
          <meshStandardMaterial color="#0a0e18" />
        </mesh>
        {/* Screen face */}
        <mesh position={[0, 0.55, 0.035]}>
          <planeGeometry args={[1.1, 0.75]} />
          <meshBasicMaterial color={accent} transparent opacity={0.55} />
        </mesh>
        {/* Stand */}
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.18, 0.12, 0.18]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>
      {/* Keyboard */}
      <mesh position={[0, 0.84, 0.18]}>
        <boxGeometry args={[0.85, 0.03, 0.22]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* Coffee mug */}
      <mesh position={[0.85, 0.88, 0.15]}>
        <cylinderGeometry args={[0.07, 0.07, 0.16, 12]} />
        <meshStandardMaterial color="#7c3aed" />
      </mesh>
      {/* Chair */}
      <group position={[0, 0, 0.9]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.6, 0.06, 0.55]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        <mesh position={[0, 0.78, 0.25]}>
          <boxGeometry args={[0.6, 0.65, 0.06]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.45, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>
    </group>
  );
}

function Plant3D({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Pot */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.28, 0.36, 12]} />
        <meshStandardMaterial color="#7c3aed" roughness={0.55} />
      </mesh>
      {/* Foliage — three overlapping spheres for a "bush" feel */}
      <mesh position={[-0.12, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.32, 12, 10]} />
        <meshStandardMaterial color="#34d399" />
      </mesh>
      <mesh position={[0.18, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.34, 12, 10]} />
        <meshStandardMaterial color="#10b981" />
      </mesh>
      <mesh position={[0, 0.85, -0.05]} castShadow>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial color="#34d399" />
      </mesh>
    </group>
  );
}

function WallArt() {
  // Orkestria hexagon mark on the back wall — mostly decorative.
  const z = -ROOM_DEPTH / 2 + 0.05;
  return (
    <group position={[5, 3.0, z]} scale={0.5}>
      {/* Center node */}
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.3} />
      </mesh>
      {/* 6 satellites at hexagon corners */}
      {[
        [0,  0.7],
        [0.6, 0.35],
        [0.6, -0.35],
        [0,  -0.7],
        [-0.6, -0.35],
        [-0.6,  0.35],
      ].map(([dx, dy], i) => {
        const colors = ["#f59e0b", "#22d3ee", "#a78bfa", "#22d3ee", "#a78bfa", "#22d3ee"];
        return (
          <mesh key={i} position={[dx, dy, 0]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color={colors[i]!} emissive={colors[i]!} emissiveIntensity={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Speech bubble overlay (HTML on top of canvas, positioned via state)
// ─────────────────────────────────────────────────────────────────────

type SpeechState = {
  seed: string;
  line: string;
  startedAt: number;
};

// ─────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────

export function OfficeMock3D({ className = "" }: { className?: string }) {
  const [readyCount, setReadyCount] = useState(0);
  const [speeches, setSpeeches] = useState<SpeechState[]>([]);
  // Project agent positions to screen so we can place HTML bubbles.
  const positionsRef = useRef<Record<string, { x: number; y: number; z: number }>>({});
  const [projected, setProjected] = useState<Record<string, { x: number; y: number }>>({});
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleSpeech = (seed: string, line: string) => {
    setSpeeches((prev) => {
      const filtered = prev.filter((s) => s.seed !== seed);
      return [...filtered, { seed, line, startedAt: Date.now() }];
    });
    setTimeout(() => {
      setSpeeches((prev) => prev.filter((s) => s.seed !== seed || Date.now() - s.startedAt < 2400));
    }, 2600);
  };

  const handlePosUpdate = (seed: string, pos: { x: number; y: number; z: number }) => {
    positionsRef.current[seed] = pos;
  };

  // Project the world positions onto screen each frame for HTML bubbles
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const cam = cameraRef.current;
      const container = containerRef.current;
      if (cam && container) {
        const rect = container.getBoundingClientRect();
        const next: Record<string, { x: number; y: number }> = {};
        for (const seed of Object.keys(positionsRef.current)) {
          const pos = positionsRef.current[seed]!;
          const v = new THREE.Vector3(pos.x, pos.y, pos.z);
          v.project(cam);
          next[seed] = {
            x: ((v.x + 1) / 2) * rect.width,
            y: ((-v.y + 1) / 2) * rect.height,
          };
        }
        setProjected(next);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ minHeight: 460 }}>
      {readyCount < 1 ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-[12px] text-white/55">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-violet-300" />
        </div>
      ) : null}

      <Canvas
        shadows
        // v142 hotfix — pulled the camera in + lowered the angle so
        // the agents fill more of the canvas and the back wall stays
        // properly proportioned. Was [0, 5.5, 11] @ fov 38 which made
        // the floor look enormous and squished everything else.
        camera={{ position: [0, 4.2, 9.5], fov: 34 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 1.1, 0);
          cameraRef.current = camera as THREE.PerspectiveCamera;
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[5, 8, 7]} intensity={2.0} castShadow />
        <directionalLight position={[-6, 4, 5]} intensity={1.1} color="#89a6ff" />
        <directionalLight position={[0, 6, -5]} intensity={1.2} color="#f0d9b5" />
        <Environment preset="city" />

        <Floor />
        <Walls />
        <WallArt />

        {DESKS.map((d, i) => (
          <Desk3D key={i} x={d.x} z={d.z} accent={d.accent} />
        ))}
        {PLANTS.map((p, i) => (
          <Plant3D key={i} x={p.x} z={p.z} />
        ))}

        {AGENTS.map((a) => (
          <WalkingAgent
            key={a.seed}
            seed={a.seed}
            path={a.path}
            speed={a.speed}
            phase={a.phase}
            onSpeech={handleSpeech}
            onPosUpdate={handlePosUpdate}
            onReady={() => setReadyCount((c) => c + 1)}
          />
        ))}
      </Canvas>

      {/* HTML speech bubbles, projected onto screen-space */}
      {speeches.map((s) => {
        const p = projected[s.seed];
        if (!p) return null;
        return (
          <div
            key={s.seed}
            className="ork-bubble pointer-events-none absolute"
            style={{
              left: p.x,
              top: p.y - 32,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="rounded-md border border-white/15 bg-[rgba(2,6,23,0.92)] px-2 py-1 font-mono text-[10px] text-white/85 backdrop-blur shadow-lg shadow-black/40">
              {s.line}
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes ork-bubble-in {
          0%   { opacity: 0; transform: translate(-50%, -90%) scale(0.92); }
          100% { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        }
        .ork-bubble > div {
          animation: ork-bubble-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
