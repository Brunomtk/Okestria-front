"use client";

/**
 * v142.7 — HeroAgentDashboard.
 *
 * After several rounds of fighting OfficeFigure's coordinate system
 * to make a single full-bleed 3D character look right inside a tall
 * hero canvas, we abandoned that approach. This is the new one:
 *
 *   ┌─────────────────────────────────────────┐
 *   │ [● LIVE AGENT]      ORKESTRIA · BY PTX │
 *   ├──────────────┬──────────────────────────┤
 *   │              │ Lúcio                    │
 *   │   ┌──────┐   │ ─────────────────        │
 *   │   │  3D  │   │ Currently working on:    │
 *   │   │Agent │   │ ▸ Outreach to Aurora Spa │
 *   │   │      │   │                          │
 *   │   └──────┘   │ ◐  142 words · running   │
 *   │              │ ✓  4 follow-ups today    │
 *   ├──────────────┴──────────────────────────┤
 *   │ ... live activity feed ...             │
 *   ├─────────────────────────────────────────┤
 *   │ STATUS · TASKS · SQUADS                │
 *   └─────────────────────────────────────────┘
 *
 * The 3D agent now lives in a SMALL fixed-size square (220×220) —
 * the framing zone where the rig is proven to look great in the
 * agent editor. Around it: real product UI (avatar tile, role,
 * current task, progress bar, tiny stat chips). The card now reads
 * as a screenshot of the workspace, not as a "character display"
 * with empty void around them.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CheckCircle2, Hash, Mail, Sparkles, Target } from "lucide-react";
import {
  type AgentAvatarProfile,
  createAgentAvatarProfileFromSeed,
} from "@/lib/avatars/profile";
import { OfficeFigure } from "@/features/agents/components/AgentOfficeFigure3D";

// ─────────────────────────────────────────────────────────────────────
// Featured agents — names + colors + "current task" copy
// ─────────────────────────────────────────────────────────────────────

type FeaturedAgent = {
  seed: string;
  name: string;
  role: string;
  accent: string; // hex color
  task: string;
  taskMeta: string;
  taskIcon: React.ReactNode;
  status: "running" | "idle";
  stats: Array<{ label: string; value: string; icon: React.ReactNode }>;
};

const FEATURED: FeaturedAgent[] = [
  {
    seed: "lucio-rep-v1",
    name: "Lúcio",
    role: "Sales rep",
    accent: "#a78bfa",
    task: "Drafting outreach to Aurora Spa",
    taskMeta: "142 words · 2 min",
    taskIcon: <Mail className="h-3.5 w-3.5" />,
    status: "running",
    stats: [
      { label: "Replies",    value: "9 today",   icon: <CheckCircle2 className="h-3 w-3" /> },
      { label: "Pipeline",   value: "$24.6k",    icon: <Sparkles className="h-3 w-3" /> },
      { label: "Threads",    value: "12 active", icon: <Hash className="h-3 w-3" /> },
    ],
  },
  {
    seed: "lucia-scout-v1",
    name: "Lúcia",
    role: "Lead scout",
    accent: "#22d3ee",
    task: "Enriching 23 leads with website + email",
    taskMeta: "Apollo · SaaS · Seattle",
    taskIcon: <Target className="h-3.5 w-3.5" />,
    status: "running",
    stats: [
      { label: "Leads",      value: "47 today",  icon: <Target className="h-3 w-3" /> },
      { label: "Enriched",   value: "23 / 47",   icon: <Sparkles className="h-3 w-3" /> },
      { label: "Verified",   value: "92%",       icon: <CheckCircle2 className="h-3 w-3" /> },
    ],
  },
  {
    seed: "olga-closer-v1",
    name: "Olga",
    role: "Closer",
    accent: "#f59e0b",
    task: "Following up with Pinheiro Cleaning",
    taskMeta: "Stage 4 · ready to close",
    taskIcon: <CheckCircle2 className="h-3.5 w-3.5" />,
    status: "idle",
    stats: [
      { label: "Closed",     value: "3 today",   icon: <CheckCircle2 className="h-3 w-3" /> },
      { label: "MRR added",  value: "$5.1k",     icon: <Sparkles className="h-3 w-3" /> },
      { label: "Win rate",   value: "61%",       icon: <Hash className="h-3 w-3" /> },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// Tiny 3D portrait (proven framing zone)
//
// 220×220 box with the OfficeFigure rendered inside. Camera + lookAt
// match the agent editor's preview, just slightly tighter so the
// figure fills the small card.
// ─────────────────────────────────────────────────────────────────────

function PortraitFigure({ profile, onReady }: { profile: AgentAvatarProfile; onReady?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  // Subtle idle sway — same numbers as OfficeFigure's own internal
  // animation but applied to OUR wrapper so the figure stays in its
  // home position regardless of the rig's defaults.
  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    group.rotation.y = Math.sin(t * 0.55) * 0.45 + 0.15;
    group.position.y = Math.sin(t * 0.9) * 0.005;
  });
  return (
    <group ref={groupRef}>
      {/* `externalAnimation` so my outer rotation is the only one in
          play. Without it, OfficeFigure also writes its own sway and
          the result jitters. */}
      <OfficeFigure profile={profile} externalAnimation onReady={onReady} />
    </group>
  );
}

function AgentPortrait3D({ seed, accent }: { seed: string; accent: string }) {
  const profile = useMemo(() => createAgentAvatarProfileFromSeed(seed), [seed]);
  const [ready, setReady] = useState(false);

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl"
      style={{
        background: `radial-gradient(ellipse at 50% 35%, ${accent}1f 0%, rgba(15,23,42,0.85) 55%, rgba(6,8,15,0.95) 100%)`,
      }}
    >
      {/* Top hairline accent in the agent's color */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent}99 50%, transparent 100%)`,
        }}
      />
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-violet-300" />
        </div>
      ) : null}
      <Canvas
        // Same proven framing the agent editor preview uses, with z
        // pulled in slightly for our smaller card.
        camera={{ position: [0.45, 0.2, 4.2], fov: 24 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0.0, 0)}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 4, 5]} intensity={2.0} />
        <directionalLight position={[-4, 2, 3]} intensity={1.0} color="#89a6ff" />
        <directionalLight position={[0, 4, -5]} intensity={1.25} color="#f0d9b5" />
        <Environment preset="city" />
        <PortraitFigure profile={profile} onReady={() => setReady(true)} />
      </Canvas>

      {/* Status pill bottom-left of the portrait */}
      <div className="pointer-events-none absolute bottom-2 left-2">
        <div
          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] backdrop-blur"
          style={{
            borderColor: `${accent}55`,
            background: `${accent}1a`,
            color: accent,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
          />
          on duty
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Animated "currently typing" progress bar — fills 0→100→loops
// ─────────────────────────────────────────────────────────────────────

function ProgressBar({ accent }: { accent: string }) {
  return (
    <div className="relative h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="absolute inset-y-0 hero-progress-fill rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)`,
          width: "40%",
        }}
      />
      <style jsx>{`
        @keyframes hero-progress-sweep {
          0%   { left: -45%; }
          100% { left: 105%; }
        }
        .hero-progress-fill {
          animation: hero-progress-sweep 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────

export function HeroAgentDashboard({ className = "" }: { className?: string }) {
  // Cycle through featured agents every 8s.
  const [agentIdx, setAgentIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setAgentIdx((i) => (i + 1) % FEATURED.length);
    }, 8000);
    return () => clearInterval(id);
  }, []);
  const agent = FEATURED[agentIdx]!;

  return (
    <div className={`relative ${className}`} style={{ minHeight: 280 }}>
      <div className="grid h-[280px] gap-3 p-3 md:grid-cols-[240px_1fr]">
        {/* LEFT — 3D portrait. 240px square gives the figure a generous
            framing zone without going full canvas. */}
        <div className="h-full w-full">
          <AgentPortrait3D seed={agent.seed} accent={agent.accent} />
        </div>

        {/* RIGHT — info panel */}
        <div
          key={agent.seed}
          className="hero-info-panel relative flex flex-col rounded-2xl border border-white/8 bg-white/[0.025] p-4 backdrop-blur"
        >
          {/* Top row — name + role */}
          <div className="flex items-baseline gap-2">
            <h3 className="text-[20px] font-semibold tracking-tight text-white">
              {agent.name}
            </h3>
            <span
              className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{
                borderColor: `${agent.accent}55`,
                background: `${agent.accent}14`,
                color: agent.accent,
              }}
            >
              {agent.role}
            </span>
          </div>

          {/* Eyebrow + task */}
          <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            Currently working on
          </div>
          <div
            className="mt-2 flex items-start gap-2 rounded-xl border px-3 py-2.5"
            style={{
              borderColor: `${agent.accent}33`,
              background: `${agent.accent}0d`,
            }}
          >
            <span
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
              style={{
                background: `${agent.accent}22`,
                color: agent.accent,
              }}
            >
              {agent.taskIcon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-white/90">
                {agent.task}
              </div>
              <div className="mt-0.5 font-mono text-[10.5px] text-white/45">
                {agent.taskMeta}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2.5">
            <div className="mb-1 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/45">
              <span>{agent.status === "running" ? "in progress" : "queued"}</span>
              <span>auto · {agent.status === "running" ? "writing" : "waiting"}</span>
            </div>
            <ProgressBar accent={agent.accent} />
          </div>

          {/* Stat chips — 3 in a row */}
          <div className="mt-auto grid grid-cols-3 gap-2 pt-3">
            {agent.stats.map((s, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/8 bg-white/[0.025] px-2 py-1.5"
              >
                <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">
                  <span style={{ color: agent.accent }}>{s.icon}</span>
                  {s.label}
                </div>
                <div className="mt-0.5 truncate text-[12px] font-semibold text-white/90">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes hero-info-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-info-panel {
          animation: hero-info-fade 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </div>
  );
}

export default HeroAgentDashboard;
