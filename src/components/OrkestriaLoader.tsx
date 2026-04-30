"use client";

/**
 * v139 — Orkestria full-screen loader.
 *
 * Built around the new Cortex Cluster mark: the satellite ring
 * rotates slowly, the core breathes, and a soft particle drift in
 * the background gives the page a sense of "the system is thinking".
 * The wordmark sits below the mark with a gradient that matches the
 * rest of the brand surfaces.
 *
 * The progress bar is opt-out (`showProgress={false}`) for cases
 * where the parent already drives the perceived work (e.g. waiting
 * on a single API call we know is fast).
 */

import { useEffect, useState } from "react";
import { OrkestriaMark } from "@/components/OrkestriaMark";

const DEFAULT_MESSAGES = [
  "Initializing workspace…",
  "Wiring up agents…",
  "Loading your squads…",
  "Syncing the cortex…",
  "Almost there…",
];

interface OrkestriaLoaderProps {
  message?: string;
  messages?: string[];
  showProgress?: boolean;
}

export function OrkestriaLoader({
  message,
  messages,
  showProgress = true,
}: OrkestriaLoaderProps) {
  const cycleMessages = messages ?? DEFAULT_MESSAGES;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  // Cycle through messages every 2.5s.
  useEffect(() => {
    if (message) return; // explicit message wins
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % cycleMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [cycleMessages.length, message]);

  // Animated progress that crawls toward 90% (never claims to finish).
  useEffect(() => {
    if (!showProgress) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return Math.min(90, prev + Math.random() * 10);
      });
    }, 500);
    return () => clearInterval(interval);
  }, [showProgress]);

  const visibleMessage = message ?? cycleMessages[currentIdx];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#06080f]">
      {/* Cosmic background gradient — same family as Cortex modal. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(124,58,237,0.18) 0%, rgba(15,23,42,0.95) 45%, #06080f 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 80% 75%, rgba(34,211,238,0.07), transparent 50%)," +
            "radial-gradient(circle at 18% 78%, rgba(245,158,11,0.05), transparent 45%)",
        }}
      />

      {/* Subtle drifting particles — pure CSS, ~24 elements, GPU-cheap. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => {
          const left = (i * 41) % 100;
          const top = (i * 73) % 100;
          const dur = 6 + (i % 5);
          const delay = (i % 7) * 0.5;
          return (
            <div
              key={i}
              className="ork-particle"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 flex flex-col items-center px-6">
        {/* The mark, animated (rotating ring + breathing core). */}
        <div className="relative mb-8">
          {/* Ambient halo behind the mark. */}
          <div
            aria-hidden
            className="absolute inset-0 -m-12 rounded-full"
            style={{
              background:
                "radial-gradient(circle at center, rgba(167,139,250,0.18) 0%, rgba(167,139,250,0) 60%)",
            }}
          />
          <OrkestriaMark size={160} animated ariaLabel="Orkestria" />
        </div>

        {/* Wordmark — gradient, tracking-tight. */}
        <div className="mb-3 inline-flex items-end gap-1.5">
          <span
            className="bg-clip-text text-[28px] font-semibold tracking-tight text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)",
            }}
          >
            Orkestria
          </span>
        </div>

        {/* Status message — fades on change. */}
        <div className="mb-7 h-5 max-w-md text-center">
          <p
            key={visibleMessage}
            className="ork-fade text-[13px] text-white/55"
          >
            {visibleMessage}
          </p>
        </div>

        {/* Progress bar — gradient sweep (when shown). */}
        {showProgress ? (
          <div className="relative h-[3px] w-56 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, #22d3ee 0%, #a78bfa 60%, #f59e0b 100%)",
                boxShadow:
                  "0 0 12px rgba(167,139,250,0.45), 0 0 24px rgba(34,211,238,0.25)",
              }}
            />
          </div>
        ) : (
          // Indeterminate sweep when progress is hidden.
          <div className="relative h-[3px] w-56 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="ork-sweep absolute inset-y-0 w-1/3 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, #22d3ee 30%, #a78bfa 70%, transparent 100%)",
              }}
            />
          </div>
        )}

        {/* Subtle eyebrow under the bar to anchor the brand. */}
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.28em] text-white/30">
          Orchestrate · Squads · Cortex
        </p>
      </div>

      <style jsx>{`
        @keyframes ork-particle-drift {
          0%   { transform: translate3d(0, 0, 0); opacity: 0; }
          25%  { opacity: 0.55; }
          50%  { transform: translate3d(20px, -16px, 0); opacity: 0.4; }
          75%  { opacity: 0.55; }
          100% { transform: translate3d(0, 0, 0); opacity: 0; }
        }
        .ork-particle {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.45);
          box-shadow: 0 0 6px rgba(167, 139, 250, 0.45);
          animation: ork-particle-drift linear infinite;
        }
        @keyframes ork-fade-in {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ork-fade {
          animation: ork-fade-in 0.45s ease-out;
        }
        @keyframes ork-sweep {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(360%); }
        }
        .ork-sweep {
          animation: ork-sweep 1.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
