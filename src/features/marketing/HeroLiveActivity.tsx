"use client";

/**
 * v142.1 — Hero "Live activity" feed.
 *
 * Sits below the 3D agent canvas inside the hero stage card. Fills
 * the empty middle area that used to be wasted negative space with a
 * rotating list of agent actions (lead found, message sent, brief
 * saved, etc.) so the operator immediately sees the SAME types of
 * events they'll see inside the workspace once they sign in.
 *
 * The feed cycles every 2.4s: a new entry slides in at the top, the
 * bottom-most entry slides out. All purely CSS animations + a single
 * `setInterval` — no React re-renders during the slide itself.
 */

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Brain,
  CheckCircle2,
  Mail,
  Send,
  Target,
  Timer,
} from "lucide-react";

type ActivityKind = "lead" | "email" | "brief" | "send" | "schedule" | "close";

type ActivityEntry = {
  id: number;
  kind: ActivityKind;
  agent: string;
  agentColor: string;
  agentEmoji: string;
  text: string;
  ago: string;
  status: "running" | "done";
};

const PALETTE = {
  cyan: "#22d3ee",
  violet: "#a78bfa",
  amber: "#f59e0b",
  emerald: "#34d399",
  rose: "#fb7185",
};

const SCRIPT: ReadonlyArray<Omit<ActivityEntry, "id" | "ago">> = [
  { kind: "lead",     agent: "Lúcia", agentColor: PALETTE.cyan,    agentEmoji: "🎯", text: "Found 8 new leads on Apollo · SaaS · Seattle",       status: "done" },
  { kind: "email",    agent: "Lúcio", agentColor: PALETTE.violet,  agentEmoji: "💼", text: "Drafted intro email for Aurora Spa · 142 words",     status: "running" },
  { kind: "brief",    agent: "Mira",  agentColor: PALETTE.rose,    agentEmoji: "📝", text: "Saved daily news brief to Cortex · #brand #leads",  status: "done" },
  { kind: "send",     agent: "Olga",  agentColor: PALETTE.amber,   agentEmoji: "🤝", text: "Sent 12 follow-ups · 3 replies waiting",            status: "done" },
  { kind: "schedule", agent: "Mira",  agentColor: PALETTE.rose,    agentEmoji: "📝", text: "Scheduled 'Pipeline digest' · daily at 5pm UTC-4",  status: "done" },
  { kind: "close",    agent: "Olga",  agentColor: PALETTE.amber,   agentEmoji: "🤝", text: "Closed Pinheiro Cleaning · $2.4k MRR",              status: "done" },
  { kind: "lead",     agent: "Lúcia", agentColor: PALETTE.cyan,    agentEmoji: "🎯", text: "Enriched 23 leads with website + email",             status: "running" },
  { kind: "email",    agent: "Lúcio", agentColor: PALETTE.violet,  agentEmoji: "💼", text: "Replied to Casa Verde · 2nd touch",                  status: "done" },
];

const ICONS: Record<ActivityKind, React.ReactNode> = {
  lead:     <Target className="h-3 w-3" />,
  email:    <Mail className="h-3 w-3" />,
  brief:    <Brain className="h-3 w-3" />,
  send:     <Send className="h-3 w-3" />,
  schedule: <Timer className="h-3 w-3" />,
  close:    <CheckCircle2 className="h-3 w-3" />,
};

const VISIBLE_COUNT = 4;

function pickInitial(): ActivityEntry[] {
  // Start with 4 entries so the feed is never empty on first paint.
  return SCRIPT.slice(0, VISIBLE_COUNT).map((s, i) => ({
    ...s,
    id: i,
    ago: i === 0 ? "now" : `${i + 1}m ago`,
  }));
}

export function HeroLiveActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>(() => pickInitial());
  const cursorRef = useRef(VISIBLE_COUNT);
  const idRef = useRef(VISIBLE_COUNT);

  useEffect(() => {
    const id = setInterval(() => {
      const idx = cursorRef.current % SCRIPT.length;
      const next = SCRIPT[idx]!;
      cursorRef.current += 1;
      idRef.current += 1;
      setEntries((prev) => [
        { ...next, id: idRef.current, ago: "now" },
        ...prev.slice(0, VISIBLE_COUNT - 1).map((e) => ({ ...e, ago: bumpAgo(e.ago) })),
      ]);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-t border-white/8">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
          <Bot className="h-3 w-3 text-violet-300" />
          Live activity
        </div>
        <div className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          streaming
        </div>
      </div>

      {/* Entries */}
      <div className="relative min-h-0 flex-1 overflow-hidden px-3 pb-3">
        <div className="space-y-1.5">
          {entries.slice(0, VISIBLE_COUNT).map((entry, idx) => (
            <ActivityRow key={entry.id} entry={entry} freshest={idx === 0} />
          ))}
        </div>
        {/* Bottom fade so the lowest row dissolves into the stat band */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(8,11,20,0.85) 100%)",
          }}
        />
      </div>
    </div>
  );
}

function ActivityRow({ entry, freshest }: { entry: ActivityEntry; freshest: boolean }) {
  return (
    <div
      key={entry.id}
      className={`hero-activity-row flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition ${
        freshest
          ? "border-white/10 bg-white/[0.05]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      {/* Avatar */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px]"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${entry.agentColor}66 0%, ${entry.agentColor}22 60%, transparent 100%)`,
          border: `1px solid ${entry.agentColor}55`,
        }}
      >
        {entry.agentEmoji}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-md"
            style={{ color: entry.agentColor }}
          >
            {ICONS[entry.kind]}
          </span>
          <span className="text-[12px] font-semibold text-white/90">{entry.agent}</span>
          <span className="font-mono text-[10px] text-white/35">·</span>
          <span className="font-mono text-[10px] text-white/45">{entry.ago}</span>
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-white/65">{entry.text}</div>
      </div>

      {/* Status pill */}
      <div
        className={`shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${
          entry.status === "running"
            ? "border-cyan-400/35 bg-cyan-500/10 text-cyan-200"
            : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
        }`}
      >
        {entry.status === "running" ? (
          <span className="inline-flex items-center gap-1">
            <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" />
            running
          </span>
        ) : (
          "done"
        )}
      </div>

      <style jsx>{`
        @keyframes hero-activity-slide {
          from { opacity: 0; transform: translateY(-6px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .hero-activity-row {
          animation: hero-activity-slide 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </div>
  );
}

function bumpAgo(prev: string): string {
  if (prev === "now") return "1m ago";
  const m = /^(\d+)m ago$/.exec(prev);
  if (m) return `${parseInt(m[1]!, 10) + 1}m ago`;
  return prev;
}
