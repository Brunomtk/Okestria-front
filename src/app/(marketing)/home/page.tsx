"use client";
// HMR cache buster: 2026-04-20T10:00 — landing v2 with live agent previews
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Brain,
  Calendar,
  Check,
  ChevronDown,
  LineChart,
  Mail,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { OrkestriaMark } from "@/components/OrkestriaMark";
import { LiveMocksSection } from "@/features/marketing/LiveMocksSection";
import { HeroLiveActivity } from "@/features/marketing/HeroLiveActivity";
import dynamic from "next/dynamic";

// React Three Fiber must run client-side; dynamic + ssr:false keeps
// Three.js out of the SSR bundle so the marketing page TTFB stays fast.
const HeroAgent = dynamic(
  () => import("@/features/marketing/HeroAgent").then((m) => m.HeroAgent),
  { ssr: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// Animated particles background
// ─────────────────────────────────────────────────────────────────────────────
function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: Array<{
      x: number; y: number; vx: number; vy: number; size: number; opacity: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles.length = 0;
      const count = Math.floor((canvas.width * canvas.height) / 18000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          size: Math.random() * 1.6 + 0.4,
          opacity: Math.random() * 0.45 + 0.15,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 200, 255, ${p.opacity})`;
        ctx.fill();
      });
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(120, 200, 255, ${0.09 * (1 - dist / 130)})`;
            ctx.stroke();
          }
        });
      });
      animationId = requestAnimationFrame(animate);
    };

    resize();
    createParticles();
    animate();

    const onResize = () => {
      resize();
      createParticles();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.55 }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated counter
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedCounter({
  end,
  duration = 2000,
  suffix = "",
  decimals = 0,
}: {
  end: number;
  duration?: number;
  suffix?: string;
  decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(progress * end);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref}>
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulsing status dot
// ─────────────────────────────────────────────────────────────────────────────
function PulsingDot({ tone = "emerald" }: { tone?: "emerald" | "cyan" | "violet" | "amber" | "pink" }) {
  const palette: Record<string, { bg: string; shadow: string }> = {
    emerald: { bg: "bg-emerald-400", shadow: "shadow-[0_0_10px_rgba(74,222,128,0.9)]" },
    cyan: { bg: "bg-cyan-400", shadow: "shadow-[0_0_10px_rgba(34,211,238,0.9)]" },
    violet: { bg: "bg-violet-400", shadow: "shadow-[0_0_10px_rgba(167,139,250,0.9)]" },
    amber: { bg: "bg-amber-400", shadow: "shadow-[0_0_10px_rgba(251,191,36,0.9)]" },
    pink: { bg: "bg-pink-400", shadow: "shadow-[0_0_10px_rgba(244,114,182,0.9)]" },
  };
  const c = palette[tone];
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className={`absolute inset-0 rounded-full ${c.bg} opacity-70 animate-ping`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${c.bg} ${c.shadow}`} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Typewriter text effect
// ─────────────────────────────────────────────────────────────────────────────
function TypewriterText({
  text,
  speed = 24,
  restartKey,
}: {
  text: string;
  speed?: number;
  restartKey?: string | number;
}) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (i > text.length) {
        window.clearInterval(id);
        return;
      }
      setShown(text.slice(0, i));
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed, restartKey]);
  return (
    <>
      {shown}
      <span className="inline-block w-[6px] translate-y-[1px] animate-pulse text-white/70">▌</span>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Lead Scout panel — leads appearing with scores
// ─────────────────────────────────────────────────────────────────────────────
function LeadScoutPanel() {
  const pool = useMemo(
    () => [
      { name: "Cedar Hill Roofing", city: "Austin, TX", score: 92, cat: "Roofing" },
      { name: "Ocean View Dental", city: "Miami, FL", score: 88, cat: "Dental" },
      { name: "Blue Ridge Legal", city: "Denver, CO", score: 84, cat: "Legal" },
      { name: "Atlas Plumbing Pros", city: "Chicago, IL", score: 91, cat: "Plumbing" },
      { name: "Stride Fitness Co.", city: "Portland, OR", score: 79, cat: "Fitness" },
      { name: "Pinewood Auto Shop", city: "Phoenix, AZ", score: 86, cat: "Auto" },
      { name: "Harbor Light Spa", city: "Boston, MA", score: 82, cat: "Beauty" },
      { name: "Redwood Accounting", city: "Seattle, WA", score: 90, cat: "Finance" },
    ],
    []
  );
  const [visible, setVisible] = useState<typeof pool>(() => pool.slice(0, 3));
  const [cursor, setCursor] = useState(3);

  useEffect(() => {
    const id = window.setInterval(() => {
      setVisible((prev) => [pool[cursor % pool.length], ...prev].slice(0, 4));
      setCursor((c) => c + 1);
    }, 1700);
    return () => window.clearInterval(id);
  }, [cursor, pool]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Search className="h-3.5 w-3.5" /> Scanning Google Places · Austin metro
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
          <PulsingDot tone="cyan" />
          Live
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {visible.map((lead, idx) => (
          <div
            key={`${lead.name}-${cursor}-${idx}`}
            className="group flex items-center justify-between rounded-xl border border-white/8 bg-[#0a131f]/80 px-3 py-2.5 animate-[slideIn_0.5s_ease]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/20">
                <Target className="h-3.5 w-3.5 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-white">{lead.name}</p>
                <p className="truncate text-[11px] text-white/40">{lead.cat} · {lead.city}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/25 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              <TrendingUp className="h-3 w-3" />
              {lead.score}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-white/45">
        <span>247 businesses scanned</span>
        <span className="text-emerald-300">+12 qualified</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Sales Rep panel — typewriter email draft
// ─────────────────────────────────────────────────────────────────────────────
function SalesRepPanel() {
  const drafts = useMemo(
    () => [
      {
        to: "hello@cedarhillroofing.com",
        subject: "A quick idea for Cedar Hill",
        body: "Hi Cedar Hill team, I was looking at roofing companies in Austin and your 4.9-star rating across 312 reviews really stood out. Most roofers that busy lose new requests in their inbox within a day. We built an AI flow that responds in under 3 minutes — worth a 10-min look?",
      },
      {
        to: "contact@oceanviewdental.com",
        subject: "Quick note for Ocean View Dental",
        body: "Hi Ocean View Dental — I noticed your 300+ patient reviews in Miami. With that kind of volume, appointment requests usually pile up faster than the front desk can handle. Mind if I show you how practices like yours are auto-qualifying new patients?",
      },
      {
        to: "info@blueridgelegal.com",
        subject: "Case intake idea for Blue Ridge",
        body: "Hi Blue Ridge Legal, saw your firm highlighted in Denver for personal injury work. Intake is usually where cases win or walk — we help firms qualify and schedule consults automatically so hot leads don't go cold. Open to a quick walkthrough?",
      },
    ],
    []
  );
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIdx((p) => (p + 1) % drafts.length), 11000);
    return () => window.clearInterval(id);
  }, [drafts.length]);
  const draft = drafts[idx];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Mail className="h-3.5 w-3.5" /> Composing personalized outreach
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-400/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
          <PulsingDot tone="violet" />
          Drafting
        </div>
      </div>
      <div className="mt-4 space-y-2 rounded-xl border border-white/8 bg-[#0a131f]/80 p-3.5 text-[12.5px] leading-relaxed">
        <div className="flex items-center gap-2 text-white/40">
          <span className="text-[10px] uppercase tracking-wide">To</span>
          <span className="text-white/70">{draft.to}</span>
        </div>
        <div className="flex items-center gap-2 text-white/40 border-b border-white/5 pb-2">
          <span className="text-[10px] uppercase tracking-wide">Subj</span>
          <span className="text-white/80 font-medium truncate">{draft.subject}</span>
        </div>
        <p className="pt-1 text-white/75 min-h-[120px]">
          <TypewriterText text={draft.body} restartKey={idx} speed={22} />
        </p>
      </div>
      <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-white/45">
        <span>18 emails in queue</span>
        <span className="text-violet-300">Personalized by Claude</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Closer panel — meeting calendar lighting up
// ─────────────────────────────────────────────────────────────────────────────
function CloserPanel() {
  const slots = useMemo(
    () => [
      { day: "Mon", time: "10:00" },
      { day: "Mon", time: "2:30" },
      { day: "Tue", time: "11:00" },
      { day: "Tue", time: "3:00" },
      { day: "Wed", time: "9:30" },
      { day: "Wed", time: "1:00" },
      { day: "Thu", time: "10:30" },
      { day: "Thu", time: "4:00" },
      { day: "Fri", time: "9:00" },
      { day: "Fri", time: "2:00" },
    ],
    []
  );
  const [booked, setBooked] = useState<Set<number>>(() => new Set([0, 4, 7]));
  const [latest, setLatest] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBooked((prev) => {
        const next = new Set(prev);
        let candidate = Math.floor(Math.random() * slots.length);
        let tries = 0;
        while (next.has(candidate) && tries < 10) {
          candidate = Math.floor(Math.random() * slots.length);
          tries += 1;
        }
        next.add(candidate);
        if (next.size > 6) {
          const first = next.values().next().value;
          if (first !== undefined) next.delete(first);
        }
        setLatest(candidate);
        return next;
      });
    }, 1900);
    return () => window.clearInterval(id);
  }, [slots.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Calendar className="h-3.5 w-3.5" /> Booking demos · This week
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-pink-500/10 border border-pink-400/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pink-300">
          <PulsingDot tone="pink" />
          Booking
        </div>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2 text-center text-[11px] font-medium">
        {slots.map((slot, i) => {
          const isBooked = booked.has(i);
          const isLatest = latest === i && isBooked;
          return (
            <div
              key={`${slot.day}-${slot.time}`}
              className={`relative rounded-lg border px-1.5 py-2 transition-all duration-500 ${
                isBooked
                  ? "border-pink-400/50 bg-gradient-to-br from-pink-500/20 to-rose-500/10 text-pink-200"
                  : "border-white/8 bg-[#0a131f]/60 text-white/45"
              }`}
            >
              <div className="text-[9px] uppercase tracking-wide opacity-70">{slot.day}</div>
              <div className="mt-0.5 text-[12px] font-semibold">{slot.time}</div>
              {isLatest && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="absolute inset-0 rounded-full bg-pink-400 animate-ping opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.9)]" />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl border border-white/8 bg-[#0a131f]/80 p-3">
        <div className="flex items-center gap-2 text-[11px] text-white/50">
          <Sparkles className="h-3 w-3 text-pink-300" />
          Latest booking
        </div>
        <p className="mt-1 text-[12.5px] text-white/80">
          {booked.size > 0 ? `${slots[latest].day} ${slots[latest].time} · ` : ""}
          {booked.size > 0 ? "Cedar Hill Roofing · 30 min demo" : "Awaiting first booking…"}
        </p>
      </div>
      <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-white/45">
        <span>{booked.size} demos booked</span>
        <span className="text-pink-300">This week</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Analyst panel — sparkline + KPIs
// ─────────────────────────────────────────────────────────────────────────────
function AnalystPanel() {
  const [values, setValues] = useState<number[]>(() =>
    Array.from({ length: 24 }, (_, i) => 42 + Math.sin(i / 2.5) * 14 + Math.random() * 6)
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      setValues((prev) => {
        const last = prev[prev.length - 1] ?? 50;
        const delta = (Math.random() - 0.45) * 12;
        const next = Math.min(98, Math.max(20, last + delta));
        return [...prev.slice(1), next];
      });
    }, 900);
    return () => window.clearInterval(id);
  }, []);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((v - min) / (max - min || 1)) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const latest = values[values.length - 1] ?? 50;
  const trend = latest - (values[values.length - 6] ?? latest);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <LineChart className="h-3.5 w-3.5" /> Pipeline health · Last 24h
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
          <PulsingDot tone="amber" />
          Analyzing
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-white/8 bg-[#0a131f]/80 p-3">
        <div className="flex items-baseline gap-3">
          <div className="text-[28px] font-semibold text-white">{latest.toFixed(0)}%</div>
          <div
            className={`text-[12px] font-medium ${
              trend >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}
          </div>
          <div className="text-[11px] text-white/45">reply rate</div>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-2 h-[90px] w-full">
          <defs>
            <linearGradient id="analystFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(251,191,36,0.35)" />
              <stop offset="100%" stopColor="rgba(251,191,36,0)" />
            </linearGradient>
          </defs>
          <polyline
            points={`0,100 ${points} 100,100`}
            fill="url(#analystFill)"
            stroke="none"
          />
          <polyline
            points={points}
            fill="none"
            stroke="rgba(251,191,36,0.95)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        {[
          { label: "Open rate", value: "62%" },
          { label: "Reply rate", value: `${latest.toFixed(0)}%` },
          { label: "Hot leads", value: "24" },
          { label: "Demos set", value: "7" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-white/8 bg-[#0a131f]/60 px-2.5 py-1.5"
          >
            <div className="text-[10px] uppercase tracking-wide text-white/45">{kpi.label}</div>
            <div className="text-[13px] font-semibold text-white">{kpi.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live activity feed
// ─────────────────────────────────────────────────────────────────────────────
type FeedEvent = { agent: string; action: string; tone: "cyan" | "violet" | "pink" | "amber" };

function LiveFeed() {
  const events = useMemo<FeedEvent[]>(
    () => [
      { agent: "Scout", action: "qualified 3 new leads in Austin", tone: "cyan" },
      { agent: "Rep", action: "drafted personalized email for Ocean View Dental", tone: "violet" },
      { agent: "Closer", action: "booked Tuesday 3pm with Cedar Hill", tone: "pink" },
      { agent: "Analyst", action: "flagged 5 hot replies", tone: "amber" },
      { agent: "Scout", action: "scraped 247 businesses from Google Places", tone: "cyan" },
      { agent: "Rep", action: "sent batch to 18 recipients", tone: "violet" },
      { agent: "Closer", action: "scheduled Fri 9am demo", tone: "pink" },
      { agent: "Analyst", action: "pipeline health up 12% vs last week", tone: "amber" },
      { agent: "Scout", action: "enriched website emails for 9 leads", tone: "cyan" },
      { agent: "Rep", action: "re-qualified 4 leads with Claude", tone: "violet" },
    ],
    []
  );
  const [log, setLog] = useState<Array<FeedEvent & { id: number }>>(() =>
    events.slice(0, 4).map((e, i) => ({ ...e, id: i }))
  );
  useEffect(() => {
    let id = log.length;
    const interval = window.setInterval(() => {
      const next = events[id % events.length];
      id += 1;
      setLog((prev) => [{ ...next, id }, ...prev].slice(0, 5));
    }, 1700);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const toneStyles: Record<FeedEvent["tone"], string> = {
    cyan: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
    violet: "border-violet-400/30 bg-violet-500/10 text-violet-300",
    pink: "border-pink-400/30 bg-pink-500/10 text-pink-300",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="space-y-2">
      {log.map((event) => (
        <div
          key={event.id}
          className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#0a131f]/70 px-3 py-2 animate-[slideIn_0.5s_ease]"
        >
          <PulsingDot tone={event.tone} />
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              toneStyles[event.tone]
            }`}
          >
            {event.agent}
          </span>
          <span className="truncate text-[12.5px] text-white/75">{event.action}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero operations console (upgraded right panel)
// ─────────────────────────────────────────────────────────────────────────────
function HeroConsole() {
  const agents = useMemo(
    () => [
      {
        label: "Lead Scout",
        desc: "Prospecting",
        icon: Target,
        tone: "cyan" as const,
        color: "from-cyan-500 to-blue-500",
        activities: ["Scanning Austin metro", "Qualifying leads", "Enriching emails"],
      },
      {
        label: "Sales Rep",
        desc: "Outreach",
        icon: MessageSquare,
        tone: "violet" as const,
        color: "from-violet-500 to-purple-500",
        activities: ["Drafting email", "Personalizing body", "Queuing batch"],
      },
      {
        label: "Closer",
        desc: "Scheduling",
        icon: Brain,
        tone: "pink" as const,
        color: "from-pink-500 to-rose-500",
        activities: ["Reading replies", "Proposing slots", "Booking demo"],
      },
      {
        label: "Analyst",
        desc: "Reporting",
        icon: LineChart,
        tone: "amber" as const,
        color: "from-amber-500 to-orange-500",
        activities: ["Tracking pipeline", "Ranking replies", "Flagging hot"],
      },
    ],
    []
  );

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative">
      <div className="absolute inset-x-8 top-6 h-40 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl md:p-6">
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
              Operations console
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Your squad, live right now</h3>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300 flex items-center gap-2">
            <PulsingDot tone="emerald" />
            4 agents online
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {agents.map((agent, i) => {
            const activity = agent.activities[tick % agent.activities.length];
            return (
              <div
                key={agent.label}
                className="group relative rounded-[24px] border border-white/10 bg-[#08111c]/85 p-4 transition-transform hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl"
                  style={{}}
                />
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${agent.color}`}
                  >
                    <agent.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    <PulsingDot tone={agent.tone} />
                    Active
                  </span>
                </div>
                <h4 className="mt-4 text-lg font-semibold text-white">{agent.label}</h4>
                <p className="mt-1 text-sm text-white/50">{agent.desc}</p>
                <div className="mt-3 flex items-center gap-2 text-[11.5px] text-white/65">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/60" />
                  <span key={`${agent.label}-${tick}`} className="animate-[fadeIn_0.4s_ease]">
                    {activity}
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full bg-gradient-to-r ${agent.color} transition-all duration-[2000ms]`}
                    style={{ width: `${35 + ((tick + i * 11) % 65)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
            <PulsingDot tone="emerald" />
            Live activity
          </div>
          <LiveFeed />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Agents in action showcase (big section with 4 live panels + feed)
// ─────────────────────────────────────────────────────────────────────────────
function AgentsInActionSection() {
  const panels = [
    {
      label: "Lead Scout",
      role: "Prospecting",
      icon: Target,
      tone: "cyan" as const,
      gradient: "from-cyan-500 to-blue-500",
      content: <LeadScoutPanel />,
    },
    {
      label: "Sales Rep",
      role: "Outreach copywriter",
      icon: MessageSquare,
      tone: "violet" as const,
      gradient: "from-violet-500 to-purple-500",
      content: <SalesRepPanel />,
    },
    {
      label: "Closer",
      role: "Scheduling demos",
      icon: Calendar,
      tone: "pink" as const,
      gradient: "from-pink-500 to-rose-500",
      content: <CloserPanel />,
    },
    {
      label: "Analyst",
      role: "Pipeline analytics",
      icon: LineChart,
      tone: "amber" as const,
      gradient: "from-amber-500 to-orange-500",
      content: <AnalystPanel />,
    },
  ];
  return (
    <section id="live" className="relative px-6 py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_50%_0%,rgba(139,92,246,0.1),transparent_70%)] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/85">
            <PulsingDot tone="cyan" />
            Live demo
          </div>
          <h2 className="mt-6 text-4xl md:text-5xl font-bold leading-tight text-white">
            Watch your squad
            <span className="block bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              work in real time
            </span>
          </h2>
          <p className="mt-4 text-white/55 text-lg">
            Four agents, four roles, one coordinated operation. Everything below is a real preview of
            what they do — no static screenshots.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {panels.map((panel) => (
            <div
              key={panel.label}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-white/20"
            >
              <div
                className={`absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br ${panel.gradient} opacity-10 blur-3xl`}
              />
              <div className="relative flex items-start justify-between gap-3 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${panel.gradient}`}
                  >
                    <panel.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{panel.label}</h3>
                    <p className="text-sm text-white/45">{panel.role}</p>
                  </div>
                </div>
              </div>
              <div className="relative mt-4 min-h-[260px]">{panel.content}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ section
// ─────────────────────────────────────────────────────────────────────────────
function FAQSection() {
  const items = [
    {
      q: "How fast can I get my first squad running?",
      a: "Most teams launch their first squad within 10 minutes. Create a company, connect your email sender, pick a squad template, and hit go. You can tune each agent's prompt, tools, and memory without leaving the workspace.",
    },
    {
      q: "Which AI models power the agents?",
      a: "Agents run on Claude (Sonnet and Haiku) by default, with optional fallback to GPT-4 class models. You can set a preferred model per agent or per task — or let Orkestria pick the right one automatically based on the workload.",
    },
    {
      q: "Can I bring my own data and context?",
      a: "Yes. Upload docs, connect CSV imports, add company context (products, services, tone, boundaries), and the agents automatically read from it. No training, no fine-tuning — context updates take effect instantly.",
    },
    {
      q: "How does lead generation work?",
      a: "The Scout agent pulls businesses from Google Places (via Apify), enriches emails from their websites, and auto-scores them against your ICP. You can run one-shot jobs or cron jobs that refresh overnight.",
    },
    {
      q: "Is my data secure?",
      a: "Workspaces are isolated per company, data is encrypted in transit and at rest, and API keys stay on the server. We're aligned with SOC 2 controls and follow least-privilege access on every agent action.",
    },
    {
      q: "Can I try it before paying?",
      a: "Absolutely. The Starter plan is free forever and lets you test the full workflow with 1 agent and 100 leads per month. No card required — upgrade when your team is ready.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 px-6 relative">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Common{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              questions
            </span>
          </h2>
          <p className="text-white/50 text-lg">Everything you want to know before starting.</p>
        </div>
        <div className="space-y-3">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isOpen
                    ? "border-white/20 bg-white/[0.04]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-[15px] font-medium text-white">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-white/50 transition-transform ${
                      isOpen ? "rotate-180 text-white/80" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-[14px] leading-relaxed text-white/60">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main landing page
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Bot,
      title: "AI-Powered Squads",
      description:
        "Coordinated agents operate as a synchronized team that scales infinitely to meet demand, 24/7/365.",
      color: "from-cyan-500/20 to-blue-500/20",
      iconColor: "text-cyan-400",
    },
    {
      icon: Target,
      title: "Smart Lead Scoring",
      description:
        "Qualify leads in real-time with ML models tailored to your ICP, with laser-focused precision.",
      color: "from-violet-500/20 to-purple-500/20",
      iconColor: "text-violet-400",
    },
    {
      icon: MessageSquare,
      title: "Intelligent Conversations",
      description:
        "Craft multi-faceted agents that understand context, anticipate needs, and connect emotionally.",
      color: "from-pink-500/20 to-rose-500/20",
      iconColor: "text-pink-400",
    },
    {
      icon: LineChart,
      title: "Real-time Analytics",
      description:
        "Monitor conversion pipeline, engagement metrics, and agent performance with live dashboards.",
      color: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-400",
    },
    {
      icon: Zap,
      title: "Instant Automation",
      description:
        "Let your agents handle everything from outreach to follow-ups and keep your team money-focused.",
      color: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-400",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "Secure your agents above industry standards with SOC 2 compliance, encryption, and audit trails.",
      color: "from-slate-500/20 to-gray-500/20",
      iconColor: "text-slate-400",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Shape your squads",
      desc: "Organize specialized agents by roles, objectives, and workflows so each team has a clear mission.",
    },
    {
      num: "02",
      title: "Bring in your knowledge",
      desc: "Connect docs and context, train on your messaging, and configure rules so each agent aligns with the core of your brand.",
    },
    {
      num: "03",
      title: "Execute with clarity",
      desc: "Run tasks, direct agents to your own unique needs for full control over AI in a feedback-fueled system.",
    },
  ];

  const testimonials = [
    {
      quote: "This platform transformed our sales process. We're closing deals faster than ever!",
      author: "Sarah Chen",
      role: "VP of Sales, TechCorp",
      avatar: "SC",
    },
    {
      quote: "The AI agents feel like having a dedicated team working around the clock.",
      author: "Michael Torres",
      role: "Founder, StartupXYZ",
      avatar: "MT",
    },
    {
      quote: "Finally, a tool that actually delivers on the promise of AI-powered sales.",
      author: "Emma Williams",
      role: "Sales Director, Enterprise Inc",
      avatar: "EW",
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: "$0",
      period: "/month",
      description: "Perfect for trying out the platform.",
      features: ["1 AI Agent", "100 leads/month", "Basic analytics", "Email support"],
      cta: "Start Free",
      popular: false,
    },
    {
      name: "Pro",
      price: "$99",
      period: "/month",
      description: "For growing teams that need more.",
      features: [
        "5 AI Agents",
        "Unlimited leads",
        "Advanced analytics",
        "Priority support",
        "Custom integrations",
        "A/B testing tools",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations.",
      features: [
        "Unlimited agents",
        "Unlimited leads",
        "Custom integrations",
        "Dedicated support",
        "API access",
        "99.9% uptime SLA",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  const stats = [
    { value: 10, suffix: "x", label: "faster lead qualification" },
    { value: 85, suffix: "%", label: "reduction in manual tasks" },
    { value: 3.2, suffix: "x", label: "higher conversion rates", decimals: 1 },
    { value: 24, suffix: "/7", label: "always-on availability" },
  ];

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 bg-[#030810]" style={{ zIndex: -2 }} />
      <ParticlesBackground />

      {/* Gradient overlays */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: -1 }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]" />
        <div className="absolute right-0 top-1/4 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(6,182,212,0.1),transparent_50%)]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] bg-[radial-gradient(circle,rgba(236,72,153,0.08),transparent_50%)]" />
      </div>

      <div className="relative min-h-screen text-white">
        {/* Navigation */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
            scrolled
              ? "bg-[#030810]/80 backdrop-blur-xl border-b border-white/5 py-3"
              : "py-5"
          }`}
        >
          <nav className="mx-auto max-w-7xl px-6 flex items-center justify-between">
            <Link href="/home" className="flex items-center gap-4 group">
              <div className="relative">
                <OrkestriaMark size={56} className="transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-violet-500/40 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Orkestria
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a
                href="#live"
                className="text-sm text-white/60 hover:text-white transition-colors relative group"
              >
                Live demo
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 group-hover:w-full transition-all" />
              </a>
              <a
                href="#features"
                className="text-sm text-white/60 hover:text-white transition-colors relative group"
              >
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 group-hover:w-full transition-all" />
              </a>
              <a
                href="#how-it-works"
                className="text-sm text-white/60 hover:text-white transition-colors relative group"
              >
                How it Works
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 group-hover:w-full transition-all" />
              </a>
              <a
                href="#pricing"
                className="text-sm text-white/60 hover:text-white transition-colors relative group"
              >
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 group-hover:w-full transition-all" />
              </a>
              <Link
                href="/login"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="group relative px-5 py-2.5 rounded-xl text-sm font-medium overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 transition-all group-hover:scale-105" />
                <span className="absolute inset-[1px] bg-[#030810] rounded-[10px] group-hover:bg-transparent transition-colors" />
                <span className="relative z-10 bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent group-hover:text-white transition-colors">
                  Get Started
                </span>
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="relative min-h-screen pt-28 pb-20 px-6 overflow-hidden flex items-center">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-24 left-10 h-64 w-64 rounded-full bg-violet-500/12 blur-3xl" />
            <div className="absolute bottom-20 right-12 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          </div>

          <div className="mx-auto grid max-w-7xl w-full gap-14 lg:grid-cols-[1.05fr_0.95fr] items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/85">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.85)]" />
                AI agents for real operations
              </div>

              <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-white md:text-6xl lg:text-7xl">
                Run your operation with
                <span className="block bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  focused AI agents
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60 md:text-xl">
                Build squads for prospecting, outreach, follow-up and execution in one clean
                workspace. Simple to launch, easy to control, ready to scale.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 font-semibold text-[#060b12] transition-transform hover:-translate-y-0.5"
                >
                  Start free
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#live"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] px-7 py-4 font-medium text-white/85 transition-colors hover:bg-white/[0.06]"
                >
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  See agents live
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-3 text-sm text-white/55">
                {["Lead generation", "Email outreach", "Agent squads", "Live workspace"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2"
                    >
                      {item}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* v140 — Real 3D agent (the same OfficeFigure used inside
                the workspace). Renders a randomly-seeded character that
                cycles idle → wave → walk → point in a 15s loop. */}
            {/* v142 — Hero stage made bigger + restructured.
                The agent now lives in a tall framed card with proper
                top header (live indicator + brand) and a footer band
                of stat tiles. Reads as a real product preview, not a
                floating decoration. */}
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 rounded-[44px]"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 40%, rgba(124,58,237,0.22) 0%, rgba(34,211,238,0.08) 45%, transparent 75%)",
                }}
              />
              <div
                className="relative flex h-[640px] flex-col overflow-hidden rounded-[28px] border border-white/10 backdrop-blur-md md:h-[700px]"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 30%, rgba(124,58,237,0.18) 0%, rgba(15,23,42,0.86) 50%, rgba(6,8,15,0.96) 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.04), 0 30px 80px rgba(0,0,0,0.55)",
                }}
              >
                {/* Top hairline */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.55) 50%, transparent 100%)",
                  }}
                />

                {/* Header strip */}
                <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-200/85 backdrop-blur">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 animate-ping rounded-full bg-violet-300/60" />
                      <span className="relative h-1.5 w-1.5 rounded-full bg-violet-300" />
                    </span>
                    Live agent
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                    Orkestria · by Ptx
                  </div>
                </div>

                {/* v142.1 — REBUILT body. Used to be one tall canvas
                    with a void below. Now it's a fixed-height agent
                    canvas + a live activity feed that fills the
                    remaining space, so every pixel of the card has
                    purpose. */}
                <div className="relative h-[380px] shrink-0">
                  {/* v142.4 — taller canvas + hidden phase label.
                      Combined with the close-in camera in HeroAgent,
                      the figure now fills the frame top-to-bottom
                      with a focused portrait composition. */}
                  <HeroAgent className="absolute inset-0" showPhaseLabel={false} />
                  {/* Soft fade into the activity feed below */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
                    style={{
                      background:
                        "linear-gradient(to bottom, transparent, rgba(6,8,15,0.92))",
                    }}
                  />
                </div>

                <HeroLiveActivity />

                {/* Stat band footer */}
                <div className="grid grid-cols-3 gap-px border-t border-white/8 bg-white/[0.04] text-center text-[11.5px]">
                  <div className="bg-[rgba(8,11,20,0.55)] px-3 py-3">
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-cyan-300/80">
                      Status
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-white/90">
                      Operational
                    </div>
                  </div>
                  <div className="bg-[rgba(8,11,20,0.55)] px-3 py-3">
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-violet-300/80">
                      Tasks today
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-white/90">12</div>
                  </div>
                  <div className="bg-[rgba(8,11,20,0.55)] px-3 py-3">
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-amber-300/80">
                      Squads active
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-white/90">3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030810] to-transparent" />
        </section>

        {/* Stats band */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
                    <AnimatedCounter
                      end={stat.value}
                      suffix={stat.suffix}
                      decimals={stat.decimals ?? 0}
                    />
                  </div>
                  <p className="mt-2 text-sm text-white/50">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* v141 — Inside Orkestria, right now (replaces both the
            v138 AgentsInActionSection and the v139 4-up mocks grid
            with a roomier feature-by-feature layout + a real
            isometric office preview). */}
        <LiveMocksSection />

        {/* Features Section */}
        <section id="features" className="py-24 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Everything you need to
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  run your operation
                </span>
              </h2>
              <p className="text-white/50 text-lg max-w-2xl mx-auto">
                A coordinated ecosystem for lead generation, monetization, knowledge, and expert
                collaboration.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all overflow-hidden"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`}
                  />
                  <div className="relative z-10">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />
          <div className="mx-auto max-w-5xl relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Get started in{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  minutes
                </span>
              </h2>
              <p className="text-white/50 text-lg">
                Three clear steps to kick off your workspace and start executing with Orkestria.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((step, i) => (
                <div key={i} className="relative group">
                  <div className="text-7xl md:text-8xl font-bold text-white/[0.03] mb-4 group-hover:text-white/[0.08] transition-colors">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">{step.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Loved by{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  high-output teams
                </span>
              </h2>
              <p className="text-white/50 text-lg">
                Built for teams that want a clear, smooth operating rhythm.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, i) => (
                <div
                  key={i}
                  className={`p-6 rounded-2xl border transition-all duration-500 ${
                    i === activeTestimonial
                      ? "bg-white/[0.06] border-white/20 scale-105"
                      : "bg-white/[0.02] border-white/5"
                  }`}
                >
                  <p className="text-white/70 text-sm mb-6 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-sm font-medium">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{testimonial.author}</p>
                      <p className="text-xs text-white/40">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Start simple,{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  scale intentionally
                </span>
              </h2>
              <p className="text-white/50 text-lg">
                Choose the setup that fits your stage and grow into a full AI workspace.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan, i) => (
                <div
                  key={i}
                  className={`relative p-8 rounded-2xl border transition-all ${
                    plan.popular
                      ? "bg-gradient-to-b from-violet-500/10 to-transparent border-violet-500/30"
                      : "bg-white/[0.02] border-white/5 hover:border-white/15"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-xs font-medium">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-white/50">{plan.period}</span>
                  </div>
                  <p className="text-sm text-white/40 mb-6">{plan.description}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm text-white/70">
                        <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`block w-full py-3 rounded-xl font-medium text-center transition-all ${
                      plan.popular
                        ? "bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FAQSection />

        {/* CTA Section */}
        <section className="py-24 px-6">
          <div className="mx-auto max-w-4xl">
            <div className="relative rounded-3xl overflow-hidden p-12 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-cyan-600/20 to-pink-600/20" />
              <div className="absolute inset-0 backdrop-blur-3xl" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to orchestrate your
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                    growth?
                  </span>
                </h2>
                <p className="text-white/60 mb-8 max-w-xl mx-auto">
                  Join teams already running their operations with Orkestria. Start free, scale
                  when ready.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold bg-white text-[#030810] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all"
                >
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer — v142: brand attribution by Ptx group, the parent
            company that owns and runs Orkestria. */}
        <footer className="border-t border-white/5 py-12 px-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
            <Link href="/home" className="flex items-center gap-3">
              <OrkestriaMark size={32} />
              <div className="flex flex-col">
                <span className="font-semibold text-white/85">Orkestria</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                  by Ptx
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-6 text-sm text-white/40">
              <span>&copy; 2026 Ptx Group. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/50">
              <a href="#" className="transition-colors hover:text-white">Privacy</a>
              <a href="#" className="transition-colors hover:text-white">Terms</a>
              <a href="#" className="transition-colors hover:text-white">Contact</a>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </>
  );
}
