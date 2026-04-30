"use client";

/**
 * v141 — "Inside Orkestria, right now".
 *
 * Re-designed from v139 → v141 to give every feature room to breathe:
 *
 *   1. Section hero — eyebrow pill + headline + lede.
 *   2. <OfficeRoom /> — full-width SVG isometric office where 5
 *      agents walk between desks, sit, work, and pop speech
 *      bubbles. This is the visual anchor of the section, not a
 *      tiny strip.
 *   3. Four FEATURE BLOCKS, one per surface (Chat, Cron, Cortex,
 *      Squads). Each block alternates left/right layout and pairs
 *      a live mini-mock with short, value-driven copy. Reads as
 *      four separate slides, not a cluttered grid.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Bot,
  Brain,
  Clock,
  FileText,
  Hash,
  MessageSquare,
  Paperclip,
  Send,
  Timer,
  Users2,
} from "lucide-react";

// v142 — Real 3D office mock, dynamic-imported so Three.js stays out
// of the SSR bundle. The component uses the same `OfficeFigure` rig
// the operator sees inside the workspace, so the landing-page preview
// is no longer a fake — it's the actual product surface.
const OfficeMock3D = dynamic(
  () => import("./OfficeMock3D").then((m) => m.OfficeMock3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] items-center justify-center text-[12px] text-white/45">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-violet-300" />
      </div>
    ),
  },
);

const PALETTE = {
  cyan: "#22d3ee",
  violet: "#a78bfa",
  amber: "#f59e0b",
  emerald: "#34d399",
  rose: "#fb7185",
  white: "#ffffff",
};

// ═════════════════════════════════════════════════════════════════════
// 1. OFFICE ROOM — full-width SVG isometric office with walking agents
// ═════════════════════════════════════════════════════════════════════

type RoomAgent = {
  id: string;
  name: string;
  color: string;
  path: Array<{ x: number; y: number }>;
  /** Phase offset (0–1) so agents don't move in sync. */
  phase: number;
  /** Total seconds for one full loop. */
  duration: number;
};

const ROOM_AGENTS: RoomAgent[] = [
  { id: "lucia", name: "Lúcia", color: PALETTE.cyan, path: [{ x: 220, y: 300 }, { x: 380, y: 220 }, { x: 600, y: 230 }, { x: 480, y: 360 }], phase: 0,    duration: 18 },
  { id: "lucio", name: "Lúcio", color: PALETTE.violet, path: [{ x: 700, y: 360 }, { x: 850, y: 250 }, { x: 970, y: 320 }, { x: 820, y: 410 }], phase: 0.25, duration: 16 },
  { id: "olga",  name: "Olga",  color: PALETTE.amber,  path: [{ x: 320, y: 410 }, { x: 540, y: 350 }, { x: 720, y: 410 }, { x: 480, y: 430 }], phase: 0.55, duration: 20 },
  { id: "yann",  name: "Yann",  color: PALETTE.emerald, path: [{ x: 950, y: 380 }, { x: 1080, y: 280 }, { x: 1100, y: 420 }, { x: 880, y: 430 }], phase: 0.7, duration: 22 },
  { id: "mira",  name: "Mira",  color: PALETTE.rose,   path: [{ x: 140, y: 430 }, { x: 250, y: 380 }, { x: 380, y: 430 }, { x: 200, y: 380 }], phase: 0.4, duration: 24 },
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

function OfficeRoom() {
  const [speechBy, setSpeechBy] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const tick = () => {
      const i = Math.floor(Math.random() * ROOM_AGENTS.length);
      const agent = ROOM_AGENTS[i]!;
      const line = SPEECH_LINES[Math.floor(Math.random() * SPEECH_LINES.length)]!;
      setSpeechBy((prev) => ({ ...prev, [agent.id]: line }));
      setTimeout(() => {
        setSpeechBy((prev) => ({ ...prev, [agent.id]: null }));
      }, 2400);
    };
    tick();
    const id = setInterval(tick, 2400);
    return () => clearInterval(id);
  }, []);

  // Per-agent CSS keyframes — each translates between 4 waypoints + back.
  const styleSheet = useMemo(() => {
    return ROOM_AGENTS.map((a) => {
      const [p0, p1, p2, p3] = a.path;
      return `
        @keyframes path-${a.id} {
          0%   { transform: translate(${p0!.x}px, ${p0!.y}px); }
          25%  { transform: translate(${p1!.x}px, ${p1!.y}px); }
          50%  { transform: translate(${p2!.x}px, ${p2!.y}px); }
          75%  { transform: translate(${p3!.x}px, ${p3!.y}px); }
          100% { transform: translate(${p0!.x}px, ${p0!.y}px); }
        }
      `;
    }).join("\n");
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/8"
      style={{
        background: "linear-gradient(180deg, rgba(13,16,28,0.95) 0%, rgba(8,11,20,0.98) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 30px 80px rgba(0,0,0,0.5)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.55) 50%, transparent 100%)" }}
      />

      {/* Header strip */}
      <div className="flex items-center justify-between border-b border-white/8 px-6 py-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(167,139,250,0.5) 0%, rgba(76,29,149,0.3) 60%, transparent 100%)",
              border: "1px solid rgba(167,139,250,0.4)",
            }}
          >
            🏢
          </span>
          <div>
            <div className="text-[13px] font-semibold text-white">Office</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300/70">
              Live workspace · 5 agents
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-200">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          OPERATIONAL
        </div>
      </div>

      {/* Stage */}
      <div className="relative h-[440px]">
        <svg
          viewBox="0 0 1200 500"
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full"
          style={{ display: "block" }}
        >
          <defs>
            <linearGradient id="ofr-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e1322" />
              <stop offset="100%" stopColor="#070a14" />
            </linearGradient>
            <linearGradient id="ofr-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(124,58,237,0.16)" />
              <stop offset="100%" stopColor="rgba(15,23,42,0.92)" />
            </linearGradient>
            <radialGradient id="ofr-floor-glow" cx="0.5" cy="0.4" r="0.6">
              <stop offset="0%" stopColor="rgba(167,139,250,0.18)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0)" />
            </radialGradient>
            <radialGradient id="ofr-window-glow" cx="0.5" cy="0.4" r="0.7">
              <stop offset="0%" stopColor="rgba(34,211,238,0.6)" />
              <stop offset="60%" stopColor="rgba(34,211,238,0.15)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0)" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="1200" height="190" fill="url(#ofr-wall)" />
          <line x1="0" y1="190" x2="1200" y2="190" stroke="rgba(167,139,250,0.18)" strokeWidth="1" />
          <polygon points="0,190 1200,190 1200,500 0,500" fill="url(#ofr-floor)" />
          <ellipse cx="600" cy="380" rx="500" ry="80" fill="url(#ofr-floor-glow)" />

          {/* Floor grid */}
          <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
            {[230, 280, 330, 380, 430, 480].map((y) => (
              <line key={`h-${y}`} x1="0" y1={y} x2="1200" y2={y} />
            ))}
            {Array.from({ length: 16 }).map((_, i) => {
              const x = i * 80;
              return <line key={`v-${i}`} x1={x} y1="190" x2={x + 30} y2="500" />;
            })}
          </g>

          {/* Window */}
          <g>
            <rect x="80" y="40" width="220" height="130" rx="8" fill="rgba(34,211,238,0.08)" stroke="rgba(34,211,238,0.35)" strokeWidth="1.5" />
            <rect x="180" y="40" width="2" height="130" fill="rgba(34,211,238,0.35)" />
            <rect x="80" y="103" width="220" height="2" fill="rgba(34,211,238,0.35)" />
            <ellipse cx="190" cy="100" rx="120" ry="60" fill="url(#ofr-window-glow)" opacity="0.7" />
            <circle cx="130" cy="80" r="1" fill="rgba(255,255,255,0.85)">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="240" cy="120" r="1" fill="rgba(255,255,255,0.85)">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="200" cy="60" r="1" fill="rgba(255,255,255,0.85)">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2.8s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Wall art — Orkestria mark */}
          <g transform="translate(900, 50) scale(0.4)" opacity="0.55">
            <polygon
              points="128,48 197.28,88 197.28,168 128,208 58.72,168 58.72,88"
              fill="none"
              stroke="rgba(167,139,250,0.45)"
              strokeWidth="2"
            />
            {[[128,48],[197.28,88],[197.28,168],[128,208],[58.72,168],[58.72,88]].map(([x,y],i) => (
              <line key={i} x1="128" y1="128" x2={x} y2={y} stroke="rgba(167,139,250,0.4)" strokeWidth="1.5" />
            ))}
            <circle cx="128" cy="48" r="8" fill={PALETTE.amber} />
            <circle cx="197.28" cy="88" r="7" fill={PALETTE.cyan} />
            <circle cx="197.28" cy="168" r="7" fill={PALETTE.violet} />
            <circle cx="128" cy="208" r="7" fill={PALETTE.cyan} />
            <circle cx="58.72" cy="168" r="7" fill={PALETTE.violet} />
            <circle cx="58.72" cy="88" r="7" fill={PALETTE.cyan} />
            <circle cx="128" cy="128" r="11" fill={PALETTE.violet} />
            <circle cx="128" cy="128" r="5" fill={PALETTE.white} />
          </g>

          {/* Desks */}
          {[
            { x: 380, y: 220, c: PALETTE.cyan },
            { x: 700, y: 220, c: PALETTE.violet },
            { x: 380, y: 400, c: PALETTE.emerald },
            { x: 950, y: 380, c: PALETTE.amber },
          ].map((d, i) => (
            <Desk key={i} x={d.x} y={d.y} accent={d.c} />
          ))}

          <Plant x={60} y={310} />
          <Plant x={1130} y={290} />

          {/* Walking paths (faint dashed) */}
          <g stroke="rgba(167,139,250,0.08)" strokeWidth="1.2" strokeDasharray="3 4" fill="none">
            {ROOM_AGENTS.map((a) => (
              <polyline
                key={`path-${a.id}`}
                points={a.path.map((p) => `${p.x},${p.y}`).join(" ") + ` ${a.path[0]!.x},${a.path[0]!.y}`}
              />
            ))}
          </g>

          {/* Agents */}
          {ROOM_AGENTS.map((a) => (
            <g
              key={a.id}
              style={{
                animation: `path-${a.id} ${a.duration}s linear infinite`,
                animationDelay: `${-a.phase * a.duration}s`,
              }}
            >
              <ellipse cx="0" cy="14" rx="9" ry="2.5" fill="rgba(0,0,0,0.4)" />
              <circle cx="0" cy="6" r="13" fill={`${a.color}25`} />
              <circle cx="0" cy="6" r="9" fill={a.color} />
              <circle cx="0" cy="6" r="4.5" fill="rgba(255,255,255,0.92)" />
              <circle cx="0" cy="-6" r="6" fill={a.color} />
              <circle cx="0" cy="-6" r="3" fill="rgba(255,255,255,0.92)" />

              {speechBy[a.id] ? (
                <g transform="translate(8, -22)">
                  <rect
                    x="0"
                    y="-12"
                    rx="6"
                    ry="6"
                    width={Math.max(48, speechBy[a.id]!.length * 5)}
                    height="16"
                    fill="rgba(2,6,23,0.92)"
                    stroke={a.color + "80"}
                    strokeWidth="0.8"
                  />
                  <text x="6" y="-1" fontSize="9" fill="rgba(255,255,255,0.85)" fontFamily="ui-monospace, Menlo, monospace">
                    {speechBy[a.id]}
                  </text>
                </g>
              ) : null}

              <text x="0" y="28" fontSize="9" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontFamily="ui-monospace, Menlo, monospace">
                {a.name}
              </text>
            </g>
          ))}
        </svg>

        {/* Vignette overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.45) 100%)" }}
        />
      </div>

      <div className="flex items-center justify-between border-t border-white/8 px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/40">
        <span>5 agents · 4 desks · always rendering</span>
        <span className="inline-flex items-center gap-1.5 text-cyan-300/85">
          <Bot className="h-3 w-3" /> live preview
        </span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: styleSheet }} />
    </div>
  );
}

function Desk({ x, y, accent }: { x: number; y: number; accent: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <ellipse cx="0" cy="34" rx="12" ry="3" fill="rgba(0,0,0,0.4)" />
      <rect x="-12" y="14" width="24" height="20" rx="5" fill="#1f2937" stroke="rgba(255,255,255,0.08)" />
      <rect x="-10" y="-4" width="20" height="22" rx="4" fill="#374151" stroke="rgba(255,255,255,0.08)" />
      <ellipse cx="40" cy="18" rx="62" ry="6" fill="rgba(0,0,0,0.4)" />
      <rect x="-22" y="-2" width="124" height="14" rx="3" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
      <rect x="22" y="-32" width="44" height="28" rx="3" fill="#0f172a" stroke={accent + "55"} strokeWidth="1.5" />
      <rect x="24" y="-30" width="40" height="24" rx="2" fill={accent + "22"} />
      <g opacity="0.65">
        <rect x="27" y="-26" width="14" height="1.5" rx="0.5" fill={accent} opacity="0.7" />
        <rect x="27" y="-22" width="22" height="1.5" rx="0.5" fill={accent} opacity="0.5" />
        <rect x="27" y="-18" width="10" height="1.5" rx="0.5" fill={accent} opacity="0.7" />
        <rect x="27" y="-14" width="18" height="1.5" rx="0.5" fill={accent} opacity="0.4" />
      </g>
      <rect x="14" y="3" width="38" height="4" rx="1.5" fill="#374151" />
      <circle cx="78" cy="4" r="3" fill="#7c3aed" />
      <circle cx="78" cy="4" r="1.5" fill="#1e1b4b" />
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <ellipse cx="0" cy="22" rx="14" ry="3" fill="rgba(0,0,0,0.4)" />
      <rect x="-9" y="6" width="18" height="14" rx="2" fill="#7c3aed" opacity="0.6" stroke="rgba(255,255,255,0.1)" />
      <ellipse cx="-4" cy="2" rx="6" ry="10" fill="#34d399" opacity="0.7" />
      <ellipse cx="4" cy="-4" rx="6" ry="11" fill="#34d399" opacity="0.85" />
      <ellipse cx="0" cy="-12" rx="5" ry="9" fill="#34d399" opacity="0.65" />
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════
// 2-5 — same mocks as v139, kept self-contained
// ═════════════════════════════════════════════════════════════════════

type ChatMsg = { id: string; from: "user" | "agent"; text: string; full?: string };
const CHAT_SCRIPT: ChatMsg[] = [
  { id: "u1", from: "user",  text: "Lucio, who closed today? Quick summary." },
  { id: "a1", from: "agent", text: "", full: "We closed 3 today: Pinheiro Cleaning ($2.4k MRR), Aurora Spa ($890), and Jet Auto ($1.8k). Pinheiro referred another lead — Casa Verde — already in your inbox." },
  { id: "u2", from: "user",  text: "Nice. Kick off the follow-up sequence for Casa Verde." },
  { id: "a2", from: "agent", text: "", full: "Done. Sequence started — first message fires in 12 min." },
];

function ChatMock() {
  const [visibleMsgs, setVisibleMsgs] = useState<ChatMsg[]>([CHAT_SCRIPT[0]!]);
  const [streamingIdx, setStreamingIdx] = useState(1);
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    if (streamingIdx >= CHAT_SCRIPT.length) {
      const t = setTimeout(() => {
        setVisibleMsgs([CHAT_SCRIPT[0]!]);
        setStreamingIdx(1);
        setTypedText("");
      }, 4500);
      return () => clearTimeout(t);
    }
  }, [streamingIdx]);

  useEffect(() => {
    if (streamingIdx >= CHAT_SCRIPT.length) return;
    const next = CHAT_SCRIPT[streamingIdx]!;
    if (next.from === "user") {
      const t = setTimeout(() => {
        setVisibleMsgs((prev) => [...prev, next]);
        setStreamingIdx((idx) => idx + 1);
      }, 1200);
      return () => clearTimeout(t);
    }
    const target = next.full ?? next.text;
    setTypedText("");
    let charsTimer: ReturnType<typeof setInterval> | null = null;
    const startTimer = setTimeout(() => {
      let chars = 0;
      charsTimer = setInterval(() => {
        chars += 1;
        setTypedText(target.slice(0, chars));
        if (chars >= target.length) {
          if (charsTimer) clearInterval(charsTimer);
          charsTimer = null;
          setVisibleMsgs((prev) => [...prev, { ...next, text: target }]);
          setTypedText("");
          setStreamingIdx((idx) => idx + 1);
        }
      }, 22);
    }, 800);
    return () => {
      clearTimeout(startTimer);
      if (charsTimer) clearInterval(charsTimer);
    };
  }, [streamingIdx]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleMsgs, typedText]);

  const isAgentTyping =
    streamingIdx < CHAT_SCRIPT.length &&
    CHAT_SCRIPT[streamingIdx]!.from === "agent" &&
    typedText.length === 0;

  return (
    <MockShell title="Chat" subtitle="Operator ↔ agent" icon={<MessageSquare className="h-3.5 w-3.5" />} accent={PALETTE.violet}>
      <div className="flex h-[300px] flex-col">
        <div className="flex items-center gap-2.5 border-b border-white/8 px-3 py-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[14px]"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(167,139,250,0.7) 0%, rgba(76,29,149,0.6) 60%, transparent 100%)",
              boxShadow: "0 4px 14px rgba(124,58,237,0.5)",
            }}
          >
            💼
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-white">Lúcio · Sales rep</div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-300">
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              online
            </div>
          </div>
        </div>
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {visibleMsgs.map((msg) => <ChatBubble key={msg.id} msg={msg} />)}
          {streamingIdx < CHAT_SCRIPT.length && CHAT_SCRIPT[streamingIdx]!.from === "agent" && typedText.length > 0 ? (
            <ChatBubble msg={{ id: `streaming-${streamingIdx}`, from: "agent", text: typedText + "▋" }} />
          ) : null}
          {isAgentTyping ? <TypingDots /> : null}
        </div>
        <div className="flex items-center gap-2 border-t border-white/8 px-3 py-2">
          <Paperclip className="h-3.5 w-3.5 text-white/35" />
          <div className="flex-1 truncate font-mono text-[11px] text-white/35">Type a message…</div>
          <button type="button" className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-violet-400/40 bg-violet-500/15 text-violet-100" disabled>
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>
    </MockShell>
  );
}

function ChatBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.from === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-1.5 text-[12.5px] leading-snug ${
          isUser
            ? "rounded-br-sm bg-violet-500/20 text-violet-50 border border-violet-400/25"
            : "rounded-bl-sm bg-white/[0.04] text-white/85 border border-white/10"
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="rounded-xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
      </div>
      <style jsx>{`
        .dot {
          width: 4px; height: 4px; border-radius: 999px;
          background: rgba(255,255,255,0.55);
          animation: dot-pulse 1.2s ease-in-out infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.30s; }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50%      { opacity: 1;    transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}

// ── Cron mock ────────────────────────────────────────────────────────

type CronJob = {
  id: string;
  name: string;
  schedule: string;
  agent: string;
  agentColor: string;
  emoji: string;
  nextInSecs: number;
  status: "armed" | "running" | "ok";
};

function CronMock() {
  const initialJobs: CronJob[] = useMemo(
    () => [
      { id: "1", name: "Daily news brief", schedule: "0 8 * * *", agent: "Mira", agentColor: PALETTE.rose, emoji: "📝", nextInSecs: 47, status: "armed" },
      { id: "2", name: "Stale leads sweep", schedule: "*/15 * * * *", agent: "Lúcia", agentColor: PALETTE.cyan, emoji: "🎯", nextInSecs: 12, status: "running" },
      { id: "3", name: "Pipeline digest", schedule: "0 17 * * 1-5", agent: "Yann", agentColor: PALETTE.emerald, emoji: "📊", nextInSecs: 380, status: "armed" },
      { id: "4", name: "Birthday outreach", schedule: "0 9 * * *", agent: "Olga", agentColor: PALETTE.amber, emoji: "🤝", nextInSecs: 5, status: "armed" },
    ],
    [],
  );
  const [jobs, setJobs] = useState<CronJob[]>(initialJobs);

  useEffect(() => {
    const id = setInterval(() => {
      setJobs((prev) =>
        prev.map((j) => {
          const next = j.nextInSecs - 1;
          if (next <= 0) return { ...j, nextInSecs: 60 + Math.floor(Math.random() * 240), status: "running" };
          if (j.status === "running" && j.nextInSecs % 5 === 0) return { ...j, nextInSecs: next, status: "ok" };
          if (j.status === "ok" && next % 7 === 0) return { ...j, nextInSecs: next, status: "armed" };
          return { ...j, nextInSecs: next };
        }),
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <MockShell title="Cron" subtitle="Scheduled work" icon={<Timer className="h-3.5 w-3.5" />} accent={PALETTE.amber}>
      <div className="flex h-[300px] flex-col">
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {jobs.map((j) => <CronRow key={j.id} job={j} />)}
        </div>
        <div className="flex items-center justify-between border-t border-white/8 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
          <span>{jobs.length} jobs · UTC</span>
          <span className="text-emerald-300">all healthy</span>
        </div>
      </div>
    </MockShell>
  );
}

function CronRow({ job }: { job: CronJob }) {
  const fmt = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m < 60) return `${m}m${r ? ` ${r}s` : ""}`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };
  const statusColor =
    job.status === "running" ? "bg-cyan-500/15 text-cyan-200 border-cyan-400/30" :
    job.status === "ok" ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30" :
    "bg-white/[0.04] text-white/55 border-white/10";

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px]"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${job.agentColor}66 0%, ${job.agentColor}22 60%, transparent 100%)`,
          border: `1px solid ${job.agentColor}55`,
        }}
      >
        {job.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium text-white/85">{job.name}</div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/40">
          <span>{job.schedule}</span><span className="text-white/20">·</span><span>{job.agent}</span>
        </div>
      </div>
      <div className="text-right">
        <div className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] ${statusColor}`}>
          {job.status === "running" ? <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" /> :
           job.status === "ok"      ? <span className="h-1 w-1 rounded-full bg-emerald-400" /> :
                                       <Clock className="h-2 w-2" />}
          {job.status === "running" ? "running" : job.status === "ok" ? "done" : "armed"}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-white/45">in {fmt(job.nextInSecs)}</div>
      </div>
    </div>
  );
}

// ── Cortex mock ──────────────────────────────────────────────────────

type CortexNode = { id: string; label: string; x: number; y: number; r: number; color: string; kind: "note" | "tag" };
type CortexEdge = { from: string; to: string; kind: "wiki" | "tag" };

const CORTEX_NODES: CortexNode[] = [
  { id: "playbook", label: "Brand voice", x: 50, y: 50, r: 9, color: PALETTE.violet, kind: "note" },
  { id: "leads",    label: "Leads SEA",   x: 24, y: 32, r: 7, color: PALETTE.cyan,   kind: "note" },
  { id: "comp",     label: "Competitors", x: 76, y: 30, r: 7, color: PALETTE.emerald,kind: "note" },
  { id: "playoffs", label: "Q1 wins",     x: 78, y: 70, r: 6, color: PALETTE.cyan,   kind: "note" },
  { id: "scripts",  label: "Cold scripts",x: 22, y: 70, r: 6, color: PALETTE.emerald,kind: "note" },
  { id: "t-lead",   label: "lead",        x: 12, y: 50, r: 4.5, color: PALETTE.amber, kind: "tag" },
  { id: "t-brand",  label: "brand",       x: 88, y: 50, r: 4.5, color: PALETTE.amber, kind: "tag" },
];

const CORTEX_EDGES: CortexEdge[] = [
  { from: "playbook", to: "leads",   kind: "wiki" },
  { from: "playbook", to: "comp",    kind: "wiki" },
  { from: "playbook", to: "playoffs",kind: "wiki" },
  { from: "playbook", to: "scripts", kind: "wiki" },
  { from: "leads",    to: "scripts", kind: "wiki" },
  { from: "comp",     to: "playoffs",kind: "wiki" },
  { from: "t-lead",   to: "leads",   kind: "tag" },
  { from: "t-lead",   to: "scripts", kind: "tag" },
  { from: "t-brand",  to: "playbook",kind: "tag" },
  { from: "t-brand",  to: "comp",    kind: "tag" },
];

function CortexMock() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTick((t) => (t + dt * 0.35) % 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const findNode = (id: string) => CORTEX_NODES.find((n) => n.id === id)!;

  return (
    <MockShell title="Cortex" subtitle="Knowledge graph" icon={<Brain className="h-3.5 w-3.5" />} accent={PALETTE.cyan}>
      <div
        className="relative h-[300px] overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 50% 35%, rgba(124,58,237,0.10) 0%, rgba(15,23,42,0.95) 50%, #050714 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-30">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="absolute h-px w-px rounded-full bg-white/40" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }} />
          ))}
        </div>
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="cm-link" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={PALETTE.cyan} stopOpacity="0.5" />
              <stop offset="100%" stopColor={PALETTE.violet} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {CORTEX_EDGES.map((e, i) => {
            const a = findNode(e.from);
            const b = findNode(e.to);
            const tagColor = e.kind === "tag" ? "rgba(245,158,11,0.4)" : undefined;
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={tagColor ?? "url(#cm-link)"} strokeWidth="0.35" opacity="0.55" />;
          })}
          {CORTEX_EDGES.map((e, i) => {
            const a = findNode(e.from);
            const b = findNode(e.to);
            const phase = (tick + i * 0.13) % 1;
            const px = a.x + (b.x - a.x) * phase;
            const py = a.y + (b.y - a.y) * phase;
            const color = e.kind === "tag" ? PALETTE.amber : PALETTE.cyan;
            return <circle key={`p-${i}`} cx={px} cy={py} r={0.55} fill={color} opacity={0.85} />;
          })}
          {CORTEX_NODES.map((n) => (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={n.r * 1.6} fill={n.color} opacity="0.18" />
              <circle cx={n.x} cy={n.y} r={n.r * 0.5} fill={n.color} />
            </g>
          ))}
          {CORTEX_NODES.filter((n) => n.r >= 7).map((n) => (
            <text key={`l-${n.id}`} x={n.x} y={n.y + n.r + 3} textAnchor="middle" fontSize="2.6" fontFamily="ui-sans-serif, -apple-system, 'Segoe UI', sans-serif" fill="rgba(255,255,255,0.7)">{n.label}</text>
          ))}
        </svg>
        <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-lg border border-white/8 bg-black/40 px-2 py-1.5 backdrop-blur">
          <div className="flex items-center gap-1.5 text-[9.5px] text-white/65"><FileText className="h-2.5 w-2.5 text-violet-300" /> notes</div>
          <div className="flex items-center gap-1.5 text-[9.5px] text-white/65"><Hash className="h-2.5 w-2.5 text-amber-300" /> tags</div>
        </div>
      </div>
    </MockShell>
  );
}

// ── Squads mock ──────────────────────────────────────────────────────

type SquadDef = {
  id: string;
  name: string;
  task: string;
  agents: { emoji: string; color: string }[];
  baseProgress: number;
  phase: string;
};

const SQUAD_DEFS: SquadDef[] = [
  {
    id: "outbound",
    name: "Outbound — SEA",
    task: "Generate 50 leads + 10-step sequence",
    agents: [
      { emoji: "🎯", color: PALETTE.cyan },
      { emoji: "💼", color: PALETTE.violet },
      { emoji: "🤝", color: PALETTE.amber },
    ],
    baseProgress: 64,
    phase: "Sales-rep · drafting message 3/10",
  },
  {
    id: "research",
    name: "Market intel",
    task: "Weekly competitor digest",
    agents: [
      { emoji: "📊", color: PALETTE.emerald },
      { emoji: "📝", color: PALETTE.rose },
    ],
    baseProgress: 28,
    phase: "Analyst · scraping 6 IG profiles",
  },
];

function SquadsMock() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1000), 80);
    return () => clearInterval(id);
  }, []);

  return (
    <MockShell title="Squads" subtitle="Multi-agent missions" icon={<Users2 className="h-3.5 w-3.5" />} accent={PALETTE.cyan}>
      <div className="flex h-[300px] flex-col">
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {SQUAD_DEFS.map((sq, i) => {
            const wobble = Math.sin((tick + i * 30) * 0.05) * 1.6;
            const progress = Math.min(98, sq.baseProgress + wobble);
            return (
              <div key={sq.id} className="rounded-xl border border-white/8 bg-white/[0.025] p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-semibold text-white/90">{sq.name}</div>
                    <div className="mt-0.5 truncate text-[11px] text-white/55">{sq.task}</div>
                  </div>
                  <div className="flex -space-x-1.5">
                    {sq.agents.map((a, idx) => (
                      <div
                        key={idx}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, ${a.color}80 0%, ${a.color}33 60%, transparent 100%)`,
                          border: `1.5px solid #0b0e14`,
                          boxShadow: `0 0 8px ${a.color}55`,
                        }}
                      >
                        {a.emoji}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative mt-2 h-[4px] overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #22d3ee 0%, #a78bfa 60%, #f59e0b 100%)", boxShadow: "0 0 8px rgba(167,139,250,0.45)" }} />
                  <div className="absolute inset-y-0 w-1/4 rounded-full" style={{ left: `${progress - 24}%`, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)", filter: "blur(2px)" }} />
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-white/45">
                  <span>{sq.phase}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-white/8 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
          <span>2 squads active</span>
          <span className="inline-flex items-center gap-1 text-cyan-300"><Bot className="h-3 w-3" /> 5 agents</span>
        </div>
      </div>
    </MockShell>
  );
}

// ── Shared shell ─────────────────────────────────────────────────────

function MockShell({
  title,
  subtitle,
  icon,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(8,11,20,0.85)] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${accent}80 50%, transparent 100%)` }} />
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `radial-gradient(circle at 30% 30%, ${accent}66 0%, ${accent}22 60%, transparent 100%)`, color: accent, border: `1px solid ${accent}55` }}>
            {icon}
          </span>
          <div>
            <div className="text-[12px] font-semibold text-white/90">{title}</div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/35">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-white/30">
          <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          <span className="h-2 w-2 rounded-full bg-amber-400/55" />
          <span className="h-2 w-2 rounded-full bg-rose-400/55" />
        </div>
      </div>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// FEATURE BLOCK — alternating layout, mock + value-prop copy
// ═════════════════════════════════════════════════════════════════════

type FeatureBullet = { label: string; detail?: string };

function FeatureBlock({
  eyebrow,
  eyebrowColor,
  title,
  description,
  bullets,
  side,
  mock,
}: {
  eyebrow: string;
  eyebrowColor: string;
  title: React.ReactNode;
  description: string;
  bullets: FeatureBullet[];
  side: "left" | "right";
  mock: React.ReactNode;
}) {
  const copy = (
    <div className="space-y-5">
      <div
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.22em]"
        style={{ borderColor: eyebrowColor + "40", background: eyebrowColor + "10", color: eyebrowColor }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: eyebrowColor, boxShadow: `0 0 8px ${eyebrowColor}` }} />
        {eyebrow}
      </div>
      <h3 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">{title}</h3>
      <p className="max-w-md text-[15px] leading-relaxed text-white/60">{description}</p>
      <ul className="space-y-2 pt-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: eyebrowColor, boxShadow: `0 0 8px ${eyebrowColor}99` }} />
            <div>
              <span className="text-[14px] font-semibold text-white/90">{b.label}</span>
              {b.detail ? <span className="ml-2 text-[13px] text-white/50">{b.detail}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      {side === "left" ? (
        <>
          <div className="order-2 md:order-1">{mock}</div>
          <div className="order-1 md:order-2">{copy}</div>
        </>
      ) : (
        <>
          <div>{copy}</div>
          <div>{mock}</div>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Section root
// ═════════════════════════════════════════════════════════════════════

// Wraps the 3D office scene with the same "operational" chrome the
// SVG mock used in v141 — header pill + footer ribbon — so the
// transition to the real R3F scene preserves the visual language.
function OfficeRoomShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/8"
      style={{
        background: "linear-gradient(180deg, rgba(13,16,28,0.95) 0%, rgba(8,11,20,0.98) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 30px 80px rgba(0,0,0,0.5)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px z-10"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.55) 50%, transparent 100%)" }}
      />
      <div className="relative z-10 flex items-center justify-between border-b border-white/8 px-6 py-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(167,139,250,0.5) 0%, rgba(76,29,149,0.3) 60%, transparent 100%)",
              border: "1px solid rgba(167,139,250,0.4)",
            }}
          >
            🏢
          </span>
          <div>
            <div className="text-[13px] font-semibold text-white">Office</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300/70">
              Live workspace · 5 agents
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-200">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          OPERATIONAL
        </div>
      </div>
      <div className="relative">{children}</div>
      <div className="relative z-10 flex items-center justify-between border-t border-white/8 px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/40">
        <span>5 agents · 4 desks · always rendering</span>
        <span className="inline-flex items-center gap-1.5 text-cyan-300/85">
          <Bot className="h-3 w-3" /> live preview · by Ptx
        </span>
      </div>
    </div>
  );
}

export function LiveMocksSection() {
  return (
    <section id="live-demo" className="relative px-6 py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.10), transparent 70%)" }}
      />

      <div className="relative mx-auto max-w-7xl">
        {/* Section hero */}
        <div className="mb-16 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/[0.08] px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.22em] text-violet-200/85">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-violet-300/60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-violet-300" />
            </span>
            See it live
          </div>
          <h2 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
            Inside Orkestria,{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-400 bg-clip-text text-transparent">
              right now
            </span>
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-white/55 md:text-[17px]">
            Each surface below is a real preview of what your operators interact with day-to-day.
            Live data shapes, live animations, live cadence — no mock screenshots.
          </p>
        </div>

        {/* Block 01 — Office (full width, REAL 3D scene) */}
        <div className="mb-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-emerald-300/85">
                01 · Live in the office
              </div>
              <h3 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Your agents, walking the floor
              </h3>
              <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-white/55">
                Five agents — the same 3D figures that live inside your workspace — pick up
                cycles between desks, sit down to work, and chime in when something happens.
                This is the actual scene, not a screenshot.
              </p>
            </div>
          </div>
          <OfficeRoomShell>
            <OfficeMock3D className="h-[520px] w-full" />
          </OfficeRoomShell>
        </div>

        {/* Block 02 — Chat */}
        <div className="mt-32">
          <FeatureBlock
            side="right"
            eyebrow="02 · Chat"
            eyebrowColor={PALETTE.violet}
            title={<>Talk to agents.{" "}<span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">They actually do the work.</span></>}
            description="Every agent has a chat surface. Drop a request in plain language and they pull from leads, email, calendar, and the cortex to act — not just summarize."
            bullets={[
              { label: "Streaming replies", detail: "no awkward thinking pauses" },
              { label: "Tool calls inline", detail: "you see what they ran" },
              { label: "Context memory",   detail: "scoped per company, per squad" },
            ]}
            mock={<ChatMock />}
          />
        </div>

        {/* Block 03 — Cron */}
        <div className="mt-32">
          <FeatureBlock
            side="left"
            eyebrow="03 · Cron"
            eyebrowColor={PALETTE.amber}
            title={<>Schedule once.{" "}<span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">Forget about it.</span></>}
            description="Daily briefings, weekly digests, hourly lead sweeps — every recurring agent task fires on its own and reports back. Crontab syntax under the hood, plain language on top."
            bullets={[
              { label: "Cron syntax + presets",  detail: "0 8 * * * → 'every day 8am'" },
              { label: "Per-job timezones",      detail: "match the operator, not UTC" },
              { label: "Live dispatch log",      detail: "see every fire, every result" },
            ]}
            mock={<CronMock />}
          />
        </div>

        {/* Block 04 — Cortex */}
        <div className="mt-32">
          <FeatureBlock
            side="right"
            eyebrow="04 · Cortex"
            eyebrowColor={PALETTE.cyan}
            title={<>One brain.{" "}<span className="bg-gradient-to-r from-cyan-300 to-sky-300 bg-clip-text text-transparent">Every agent reads from it.</span></>}
            description="A company-scoped knowledge graph the operator AND the agents share. Briefings drop here. Playbooks live here. Wiki-links and tags wire it all together."
            bullets={[
              { label: "Obsidian-compatible",  detail: "open it locally too if you want" },
              { label: "Auto-grown by agents", detail: "they save what matters" },
              { label: "3D graph view",        detail: "rotate, focus, follow connections" },
            ]}
            mock={<CortexMock />}
          />
        </div>

        {/* Block 05 — Squads */}
        <div className="mt-32">
          <FeatureBlock
            side="left"
            eyebrow="05 · Squads"
            eyebrowColor={PALETTE.emerald}
            title={<>Compose multi-agent missions.{" "}<span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">Hand off automatically.</span></>}
            description="Bundle 2–5 agents into a squad with a shared goal. The lead scout finds them, the sales rep drafts, the closer follows up — each one passes the baton without you in the middle."
            bullets={[
              { label: "Templates + custom",  detail: "Outbound, Onboarding, Research" },
              { label: "Live progress bar",   detail: "watch the baton get passed" },
              { label: "Approval gates",      detail: "pause squads at any step" },
            ]}
            mock={<SquadsMock />}
          />
        </div>
      </div>
    </section>
  );
}
