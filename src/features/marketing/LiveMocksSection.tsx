"use client";

/**
 * v139 — "See it live" landing-page section.
 *
 * Five inline mocks rendered in a single grid so visitors who never
 * sign up still get a feel for the product. Each mock is fully
 * self-contained, no API calls — just CSS + a couple of useEffect
 * timers. Designed to look identical (same surfaces, same palette,
 * same iconography) to the real workspace inside the app.
 *
 *   1. OfficeStrip   — pixel-style agents milling around a virtual office row
 *   2. ChatMock      — agent chat window with streaming messages
 *   3. CronMock      — cron job list with live countdowns
 *   4. CortexMock    — knowledge graph snapshot with particle flows
 *   5. SquadsMock    — squad cards mid-task with progress shimmer
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
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

const PALETTE = {
  cyan: "#22d3ee",
  violet: "#a78bfa",
  amber: "#f59e0b",
  emerald: "#34d399",
  rose: "#fb7185",
  white: "#ffffff",
};

// ─────────────────────────────────────────────────────────────────────
// 1. OFFICE STRIP — animated row of agents, bobbing + occasional walk
// ─────────────────────────────────────────────────────────────────────

type AgentDef = {
  id: string;
  name: string;
  role: string;
  color: string;
  emoji: string;
};

const OFFICE_AGENTS: AgentDef[] = [
  { id: "scout", name: "Lúcia", role: "Lead scout", color: PALETTE.cyan, emoji: "🎯" },
  { id: "rep", name: "Lúcio", role: "Sales rep", color: PALETTE.violet, emoji: "💼" },
  { id: "closer", name: "Olga", role: "Closer", color: PALETTE.amber, emoji: "🤝" },
  { id: "analyst", name: "Yann", role: "Analyst", color: PALETTE.emerald, emoji: "📊" },
  { id: "scribe", name: "Mira", role: "Scribe", color: PALETTE.rose, emoji: "📝" },
];

function OfficeStrip() {
  // Working state cycles every few seconds — picks a random agent to
  // glow as "doing something".
  const [workingId, setWorkingId] = useState<string>(OFFICE_AGENTS[0]!.id);
  useEffect(() => {
    const id = setInterval(() => {
      const next = OFFICE_AGENTS[Math.floor(Math.random() * OFFICE_AGENTS.length)]!;
      setWorkingId(next.id);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/8 px-6 py-7"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18) 0%, rgba(15,23,42,0.95) 55%, #06080f 100%)",
      }}
    >
      {/* Top hairline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.5) 50%, transparent 100%)",
        }}
      />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300/85">
            Live in the office
          </div>
          <div className="mt-0.5 text-[13px] text-white/65">
            Your agents, picking up cycles + handing off in the background.
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-2 py-0.5 font-mono text-[10px] text-emerald-200">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          OPERATIONAL
        </div>
      </div>

      {/* Agent strip — each agent sits on a "floor" line */}
      <div className="relative h-[120px]">
        {/* Floor */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-2 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 flex justify-around">
          {OFFICE_AGENTS.map((agent, i) => {
            const isWorking = agent.id === workingId;
            return (
              <div
                key={agent.id}
                className="relative flex flex-col items-center"
                style={{
                  animation: `agent-bob ${2.4 + i * 0.27}s ease-in-out ${i * 0.15}s infinite`,
                }}
              >
                {/* Speech bubble pops when working */}
                {isWorking ? (
                  <div
                    className="absolute -top-7 whitespace-nowrap rounded-md border border-white/10 bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white/80 backdrop-blur"
                    style={{
                      animation: "agent-bubble 0.4s ease-out",
                      boxShadow: `0 4px 16px ${agent.color}40`,
                    }}
                  >
                    <span style={{ color: agent.color }}>●</span> working
                  </div>
                ) : null}

                {/* Body — color halo + emoji avatar */}
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-all"
                  style={{
                    background:
                      isWorking
                        ? `radial-gradient(circle at 30% 30%, ${agent.color}99 0%, ${agent.color}33 60%, transparent 100%)`
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isWorking ? agent.color + "80" : "rgba(255,255,255,0.06)"}`,
                    boxShadow: isWorking
                      ? `0 0 24px ${agent.color}55, inset 0 1px 0 rgba(255,255,255,0.18)`
                      : "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  {agent.emoji}
                </div>
                <div className="mt-1 text-center">
                  <div className="text-[10.5px] font-semibold text-white/85">
                    {agent.name}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
                    {agent.role}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes agent-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @keyframes agent-bubble {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 2. CHAT MOCK — streaming messages, typing indicator
// ─────────────────────────────────────────────────────────────────────

type ChatMsg = { id: string; from: "user" | "agent"; text: string; full?: string };

const CHAT_SCRIPT: ChatMsg[] = [
  {
    id: "u1",
    from: "user",
    text: "Lúcio, quem fechou hoje? Resumo curto.",
  },
  {
    id: "a1",
    from: "agent",
    text: "",
    full:
      "Hoje tivemos 3 fechamentos: Pinheiro Cleaning ($2.4k MRR), Aurora Spa ($890), e Jet Auto ($1.8k). Pinheiro indicou outro lead — Casa Verde — que já te coloquei na sua caixa.",
  },
  {
    id: "u2",
    from: "user",
    text: "Top. Manda o follow-up pra Casa Verde.",
  },
  {
    id: "a2",
    from: "agent",
    text: "",
    full: "Feito. Sequence iniciado — primeira mensagem dispara em 12 min.",
  },
];

function ChatMock() {
  const [visibleMsgs, setVisibleMsgs] = useState<ChatMsg[]>([CHAT_SCRIPT[0]!]);
  const [streamingIdx, setStreamingIdx] = useState(1); // next to stream
  const [typedText, setTypedText] = useState("");

  // Resets the loop after the last agent message has fully streamed.
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

  // Stream the next message (agent: char-by-char, user: instant)
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

    // Agent — show "typing…" briefly, then typewriter the message.
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

  // Auto-scroll to bottom when new content arrives
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
      <div className="flex h-[280px] flex-col">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-white/8 px-3 py-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[14px]"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(167,139,250,0.7) 0%, rgba(76,29,149,0.6) 60%, transparent 100%)",
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

        {/* Messages */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {visibleMsgs.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
          {streamingIdx < CHAT_SCRIPT.length && CHAT_SCRIPT[streamingIdx]!.from === "agent" && typedText.length > 0 ? (
            <ChatBubble
              msg={{
                id: `streaming-${streamingIdx}`,
                from: "agent",
                text: typedText + "▋",
              }}
            />
          ) : null}
          {isAgentTyping ? <TypingDots /> : null}
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 border-t border-white/8 px-3 py-2">
          <Paperclip className="h-3.5 w-3.5 text-white/35" />
          <div className="flex-1 truncate font-mono text-[11px] text-white/35">
            Type a message…
          </div>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-violet-400/40 bg-violet-500/15 text-violet-100"
            disabled
          >
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

// ─────────────────────────────────────────────────────────────────────
// 3. CRON MOCK — list with live countdowns
// ─────────────────────────────────────────────────────────────────────

type CronJob = {
  id: string;
  name: string;
  schedule: string;
  agent: string;
  agentColor: string;
  emoji: string;
  nextInSecs: number; // initial seconds to next run
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
          if (next <= 0) {
            // briefly switch to "running" then "ok" then re-arm
            return { ...j, nextInSecs: 60 + Math.floor(Math.random() * 240), status: "running" };
          }
          if (j.status === "running" && j.nextInSecs % 5 === 0) {
            return { ...j, nextInSecs: next, status: "ok" };
          }
          if (j.status === "ok" && next % 7 === 0) {
            return { ...j, nextInSecs: next, status: "armed" };
          }
          return { ...j, nextInSecs: next };
        }),
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <MockShell title="Cron" subtitle="Scheduled work" icon={<Timer className="h-3.5 w-3.5" />} accent={PALETTE.amber}>
      <div className="flex h-[280px] flex-col">
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {jobs.map((j) => (
            <CronRow key={j.id} job={j} />
          ))}
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
    job.status === "running"
      ? "bg-cyan-500/15 text-cyan-200 border-cyan-400/30"
      : job.status === "ok"
        ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
        : "bg-white/[0.04] text-white/55 border-white/10";

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
          <span>{job.schedule}</span>
          <span className="text-white/20">·</span>
          <span>{job.agent}</span>
        </div>
      </div>
      <div className="text-right">
        <div className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] ${statusColor}`}>
          {job.status === "running" ? (
            <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" />
          ) : job.status === "ok" ? (
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
          ) : (
            <Clock className="h-2 w-2" />
          )}
          {job.status === "running" ? "running" : job.status === "ok" ? "done" : "armed"}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-white/45">in {fmt(job.nextInSecs)}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 4. CORTEX MOCK — small force-graph snapshot, particles flowing
// ─────────────────────────────────────────────────────────────────────

type CortexNode = { id: string; label: string; x: number; y: number; r: number; color: string; kind: "note" | "tag" };
type CortexEdge = { from: string; to: string; kind: "wiki" | "tag" };

const CORTEX_NODES: CortexNode[] = [
  // Center cluster — current company brain
  { id: "playbook", label: "Brand voice", x: 50, y: 50, r: 9, color: PALETTE.violet, kind: "note" },
  { id: "leads", label: "Leads SEA", x: 24, y: 32, r: 7, color: PALETTE.cyan, kind: "note" },
  { id: "comp", label: "Competitors", x: 76, y: 30, r: 7, color: PALETTE.emerald, kind: "note" },
  { id: "playoffs", label: "Q1 wins", x: 78, y: 70, r: 6, color: PALETTE.cyan, kind: "note" },
  { id: "scripts", label: "Cold scripts", x: 22, y: 70, r: 6, color: PALETTE.emerald, kind: "note" },
  // Tag nodes (amber)
  { id: "t-lead", label: "lead", x: 12, y: 50, r: 4.5, color: PALETTE.amber, kind: "tag" },
  { id: "t-brand", label: "brand", x: 88, y: 50, r: 4.5, color: PALETTE.amber, kind: "tag" },
];

const CORTEX_EDGES: CortexEdge[] = [
  { from: "playbook", to: "leads", kind: "wiki" },
  { from: "playbook", to: "comp", kind: "wiki" },
  { from: "playbook", to: "playoffs", kind: "wiki" },
  { from: "playbook", to: "scripts", kind: "wiki" },
  { from: "leads", to: "scripts", kind: "wiki" },
  { from: "comp", to: "playoffs", kind: "wiki" },
  // tag edges
  { from: "t-lead", to: "leads", kind: "tag" },
  { from: "t-lead", to: "scripts", kind: "tag" },
  { from: "t-brand", to: "playbook", kind: "tag" },
  { from: "t-brand", to: "comp", kind: "tag" },
];

function CortexMock() {
  // Animation: particles travel along each edge in a loop.
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
        className="relative h-[280px] overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(124,58,237,0.10) 0%, rgba(15,23,42,0.95) 50%, #050714 100%)",
        }}
      >
        {/* Subtle starfield via dots */}
        <div className="absolute inset-0 opacity-30">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-px w-px rounded-full bg-white/40"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
              }}
            />
          ))}
        </div>

        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="cm-link" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={PALETTE.cyan} stopOpacity="0.5" />
              <stop offset="100%" stopColor={PALETTE.violet} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {/* edges */}
          {CORTEX_EDGES.map((e, i) => {
            const a = findNode(e.from);
            const b = findNode(e.to);
            const tagColor = e.kind === "tag" ? "rgba(245,158,11,0.4)" : undefined;
            return (
              <g key={i}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={tagColor ?? "url(#cm-link)"}
                  strokeWidth="0.35"
                  opacity="0.55"
                />
              </g>
            );
          })}
          {/* particles flowing along each edge */}
          {CORTEX_EDGES.map((e, i) => {
            const a = findNode(e.from);
            const b = findNode(e.to);
            const phase = (tick + i * 0.13) % 1;
            const px = a.x + (b.x - a.x) * phase;
            const py = a.y + (b.y - a.y) * phase;
            const color = e.kind === "tag" ? PALETTE.amber : PALETTE.cyan;
            return (
              <circle
                key={`p-${i}`}
                cx={px}
                cy={py}
                r={0.55}
                fill={color}
                opacity={0.85}
              />
            );
          })}
          {/* nodes */}
          {CORTEX_NODES.map((n) => (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={n.r * 1.6} fill={n.color} opacity="0.18" />
              <circle cx={n.x} cy={n.y} r={n.r * 0.5} fill={n.color} />
            </g>
          ))}
          {/* labels for big nodes */}
          {CORTEX_NODES.filter((n) => n.r >= 7).map((n) => (
            <text
              key={`l-${n.id}`}
              x={n.x}
              y={n.y + n.r + 3}
              textAnchor="middle"
              fontSize="2.6"
              fontFamily="ui-sans-serif, -apple-system, 'Segoe UI', sans-serif"
              fill="rgba(255,255,255,0.7)"
            >
              {n.label}
            </text>
          ))}
        </svg>

        {/* legend */}
        <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-lg border border-white/8 bg-black/40 px-2 py-1.5 backdrop-blur">
          <div className="flex items-center gap-1.5 text-[9.5px] text-white/65">
            <FileText className="h-2.5 w-2.5 text-violet-300" /> notes
          </div>
          <div className="flex items-center gap-1.5 text-[9.5px] text-white/65">
            <Hash className="h-2.5 w-2.5 text-amber-300" /> tags
          </div>
        </div>
        <div className="absolute left-3 bottom-3 font-mono text-[9.5px] text-white/40">
          5 notes · 2 tags · 10 links
        </div>
      </div>
    </MockShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 5. SQUADS MOCK — multi-agent task progress cards
// ─────────────────────────────────────────────────────────────────────

type SquadDef = {
  id: string;
  name: string;
  task: string;
  agents: { emoji: string; color: string }[];
  baseProgress: number; // 0-100
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
  // Subtle per-squad progress shimmer
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1000), 80);
    return () => clearInterval(id);
  }, []);

  return (
    <MockShell title="Squads" subtitle="Multi-agent missions" icon={<Users2 className="h-3.5 w-3.5" />} accent={PALETTE.cyan}>
      <div className="flex h-[280px] flex-col">
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {SQUAD_DEFS.map((sq, i) => {
            const wobble = Math.sin((tick + i * 30) * 0.05) * 1.6;
            const progress = Math.min(98, sq.baseProgress + wobble);
            return (
              <div
                key={sq.id}
                className="rounded-xl border border-white/8 bg-white/[0.025] p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-semibold text-white/90">
                      {sq.name}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-white/55">
                      {sq.task}
                    </div>
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
                {/* Progress bar */}
                <div className="relative mt-2 h-[4px] overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${progress}%`,
                      background:
                        "linear-gradient(90deg, #22d3ee 0%, #a78bfa 60%, #f59e0b 100%)",
                      boxShadow: "0 0 8px rgba(167,139,250,0.45)",
                    }}
                  />
                  {/* Shimmer */}
                  <div
                    className="absolute inset-y-0 w-1/4 rounded-full"
                    style={{
                      left: `${progress - 24}%`,
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                      filter: "blur(2px)",
                    }}
                  />
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
          <span className="inline-flex items-center gap-1 text-cyan-300">
            <Bot className="h-3 w-3" /> 5 agents
          </span>
        </div>
      </div>
    </MockShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Shared shell — same chrome on every mock so the section reads as
// one coherent surface
// ─────────────────────────────────────────────────────────────────────

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
    <div
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.85)] shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent}80 50%, transparent 100%)`,
        }}
      />
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${accent}66 0%, ${accent}22 60%, transparent 100%)`,
              color: accent,
              border: `1px solid ${accent}55`,
            }}
          >
            {icon}
          </span>
          <div>
            <div className="text-[12px] font-semibold text-white/90">{title}</div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/35">
              {subtitle}
            </div>
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

// ─────────────────────────────────────────────────────────────────────
// Section wrapper exported to the landing page
// ─────────────────────────────────────────────────────────────────────

export function LiveMocksSection() {
  return (
    <section id="live-demo" className="relative px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/[0.08] px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.22em] text-violet-200/85">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-violet-300/60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-violet-300" />
            </span>
            See it live
          </div>
          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Inside Orkestria,{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-400 bg-clip-text text-transparent">
              right now
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[14.5px] leading-relaxed text-white/55">
            These mini-mocks render the actual surfaces your operators use every day — chat,
            cron, the cortex graph, and squads — pulled together so you can feel the rhythm of
            the workspace before you sign up.
          </p>
        </div>

        {/* Office strip — full width on top */}
        <OfficeStrip />

        {/* 4-mock grid */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <ChatMock />
          <CronMock />
          <CortexMock />
          <SquadsMock />
        </div>
      </div>
    </section>
  );
}
