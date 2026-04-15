"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Brain,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Command,
  Crown,
  Globe,
  Layers3,
  LineChart,
  Lock,
  Mail,
  MessageSquare,
  Monitor,
  MousePointerClick,
  Play,
  Rocket,
  Search,
  Send,
  Shield,
  Sparkles,
  Target,
  Users,
  Users2,
  Workflow,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Particles Background                                               */
/* ------------------------------------------------------------------ */

function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
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
          size: Math.random() * 1.8 + 0.4,
          opacity: Math.random() * 0.4 + 0.15,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,200,255,${p.opacity})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(100,200,255,${0.08 * (1 - dist / 110)})`;
            ctx.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    resize();
    createParticles();
    animate();
    window.addEventListener("resize", () => {
      resize();
      createParticles();
    });
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" style={{ opacity: 0.5 }} />;
}

/* ------------------------------------------------------------------ */
/*  Scroll-reveal wrapper                                              */
/* ------------------------------------------------------------------ */

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */

function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          let startTime: number;
          const duration = 1800;
          const step = (ts: number) => {
            if (!startTime) startTime = ts;
            const progress = Math.min((ts - startTime) / duration, 1);
            setCount(Math.floor(progress * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const AGENT_ROLES = [
  {
    icon: Target,
    label: "Lead Scout",
    desc: "Finds & qualifies leads with laser precision using your ICP criteria.",
    color: "from-cyan-500 to-blue-500",
    glow: "shadow-cyan-500/25",
  },
  {
    icon: MessageSquare,
    label: "Sales Rep",
    desc: "Engages prospects with personalized multi-channel outreach.",
    color: "from-violet-500 to-purple-500",
    glow: "shadow-violet-500/25",
  },
  {
    icon: Brain,
    label: "Closer",
    desc: "Handles objections and guides leads through the final mile.",
    color: "from-pink-500 to-rose-500",
    glow: "shadow-pink-500/25",
  },
  {
    icon: LineChart,
    label: "Analyst",
    desc: "Monitors pipeline, conversion rates, and agent performance live.",
    color: "from-amber-500 to-orange-500",
    glow: "shadow-amber-500/25",
  },
  {
    icon: Code2,
    label: "Dev Agent",
    desc: "Automates code reviews, deploys, and technical workflows.",
    color: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/25",
  },
  {
    icon: Mail,
    label: "Outreach Bot",
    desc: "Crafts and sends personalized emails at scale, tracks opens.",
    color: "from-sky-500 to-indigo-500",
    glow: "shadow-sky-500/25",
  },
];

const FEATURES = [
  {
    icon: Bot,
    title: "AI Agent Squads",
    desc: "Group agents into specialized squads with a leader, execution modes, and shared context. Dispatch tasks to the whole team at once.",
    accent: "cyan",
  },
  {
    icon: Monitor,
    title: "Retro 3D Office",
    desc: "A beautiful isometric virtual office where every agent has a desk. Watch them work in real-time with live status indicators.",
    accent: "violet",
  },
  {
    icon: Workflow,
    title: "Smart Execution Modes",
    desc: "Leader-first, all-at-once, workflow, or manual — choose how tasks flow through your squad for maximum control.",
    accent: "amber",
  },
  {
    icon: MessageSquare,
    title: "Agent Chat",
    desc: "Chat directly with any agent or squad. Messages route to the right team member based on execution mode and context.",
    accent: "pink",
  },
  {
    icon: Layers3,
    title: "Knowledge Base",
    desc: "Upload docs, brand guidelines, and SOPs. Agents reference your knowledge automatically for on-brand, accurate responses.",
    accent: "emerald",
  },
  {
    icon: Zap,
    title: "OpenClaw Dispatch",
    desc: "One-click dispatch with token estimation, approval flows, and real-time run tracking across all squad members.",
    accent: "sky",
  },
];

const accentMap: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  cyan: { border: "border-cyan-500/20", bg: "bg-cyan-500/8", text: "text-cyan-300", icon: "text-cyan-400" },
  violet: { border: "border-violet-500/20", bg: "bg-violet-500/8", text: "text-violet-300", icon: "text-violet-400" },
  amber: { border: "border-amber-500/20", bg: "bg-amber-500/8", text: "text-amber-300", icon: "text-amber-400" },
  pink: { border: "border-pink-500/20", bg: "bg-pink-500/8", text: "text-pink-300", icon: "text-pink-400" },
  emerald: { border: "border-emerald-500/20", bg: "bg-emerald-500/8", text: "text-emerald-300", icon: "text-emerald-400" },
  sky: { border: "border-sky-500/20", bg: "bg-sky-500/8", text: "text-sky-300", icon: "text-sky-400" },
};

const STEPS = [
  {
    num: "01",
    title: "Create your agents",
    desc: "Define roles, upload knowledge, set rules and personality. Each agent gets a desk in your virtual office.",
    icon: Bot,
  },
  {
    num: "02",
    title: "Build squads",
    desc: "Group agents by mission — sales, support, dev ops. Pick a leader, set execution mode, and connect a workspace.",
    icon: Users2,
  },
  {
    num: "03",
    title: "Dispatch & monitor",
    desc: "Create tasks, dispatch with one click, and watch runs complete in real-time. Approve, retry, or redirect as needed.",
    icon: Rocket,
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    desc: "Try the platform with basic agents.",
    features: ["2 AI Agents", "1 Squad", "100 tasks/month", "Community support", "Retro office access"],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    desc: "For teams that need real output.",
    features: ["10 AI Agents", "Unlimited squads", "Unlimited tasks", "Priority support", "Custom knowledge base", "OpenClaw dispatch", "Advanced analytics"],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Full control for large organizations.",
    features: ["Unlimited agents", "Unlimited everything", "Dedicated support", "SSO & API access", "Custom integrations", "99.9% uptime SLA", "On-prem option"],
    cta: "Contact Sales",
    popular: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Global bg */}
      <div className="fixed inset-0 bg-[#030810]" style={{ zIndex: -2 }} />
      <ParticlesBackground />
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: -1 }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.12),transparent)]" />
        <div className="absolute right-0 top-1/4 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] bg-[radial-gradient(circle,rgba(236,72,153,0.06),transparent_50%)]" />
      </div>

      <div className="relative min-h-screen text-white">
        {/* ============================================================ */}
        {/*  NAV                                                         */}
        {/* ============================================================ */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
            scrolled
              ? "bg-[#030810]/80 backdrop-blur-2xl border-b border-white/5 py-3"
              : "py-5"
          }`}
        >
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6">
            <Link href="/home" className="group flex items-center gap-3">
              <div className="relative">
                <Image
                  src="/images/logo.png"
                  alt="Okestria"
                  width={48}
                  height={48}
                  className="h-12 w-12 transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-violet-500/40 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Okestria
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-7">
              {["Features", "How it Works", "Pricing"].map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="relative text-sm text-white/55 transition-colors hover:text-white group"
                >
                  {label}
                  <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gradient-to-r from-cyan-400 to-violet-400 transition-all group-hover:w-full" />
                </a>
              ))}
              <Link href="/login" className="text-sm text-white/55 transition-colors hover:text-white">
                Login
              </Link>
              <Link
                href="/register"
                className="group relative overflow-hidden rounded-xl px-5 py-2.5 text-sm font-medium"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 transition-all group-hover:scale-105" />
                <span className="absolute inset-[1px] rounded-[10px] bg-[#030810] transition-colors group-hover:bg-transparent" />
                <span className="relative z-10 bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent transition-colors group-hover:text-white">
                  Get Started
                </span>
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="flex md:hidden h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <div className="space-y-1.5">
                <span className={`block h-0.5 w-5 bg-white/70 transition-all ${mobileMenuOpen ? "translate-y-2 rotate-45" : ""}`} />
                <span className={`block h-0.5 w-5 bg-white/70 transition-all ${mobileMenuOpen ? "opacity-0" : ""}`} />
                <span className={`block h-0.5 w-5 bg-white/70 transition-all ${mobileMenuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
              </div>
            </button>
          </nav>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/5 bg-[#030810]/95 backdrop-blur-2xl px-6 py-6 space-y-4">
              {["Features", "How it Works", "Pricing"].map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="block text-sm text-white/60 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </a>
              ))}
              <Link href="/login" className="block text-sm text-white/60 hover:text-white">Login</Link>
              <Link href="/register" className="block rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-3 text-center text-sm font-medium">
                Get Started
              </Link>
            </div>
          )}
        </header>

        {/* ============================================================ */}
        {/*  HERO                                                        */}
        {/* ============================================================ */}
        <section className="relative flex min-h-screen items-center overflow-hidden px-6 pt-28 pb-20">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-24 left-10 h-72 w-72 rounded-full bg-violet-500/10 blur-[100px]" />
            <div className="absolute bottom-20 right-12 h-80 w-80 rounded-full bg-cyan-500/8 blur-[100px]" />
          </div>

          <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left: copy */}
            <div>
              <Reveal>
                <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/80">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Your AI workforce is ready
                </div>
              </Reveal>

              <Reveal delay={100}>
                <h1 className="mt-8 max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-[4.25rem]">
                  The virtual office for your
                  <span className="block bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                    AI agent teams
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="mt-6 max-w-xl text-lg leading-8 text-white/55 md:text-xl">
                  Build agents, organize them into squads, dispatch tasks, and watch them work
                  together — all from a retro 3D office you&apos;ll actually enjoy using.
                </p>
              </Reveal>

              <Reveal delay={300}>
                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/register"
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 font-semibold text-[#060b12] shadow-[0_0_40px_rgba(255,255,255,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(255,255,255,0.15)]"
                  >
                    Start free
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] px-7 py-4 font-medium text-white/80 transition-all hover:bg-white/[0.06] hover:border-white/20"
                  >
                    <Play className="h-4 w-4" />
                    Open workspace
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={400}>
                <div className="mt-10 flex flex-wrap gap-3 text-sm">
                  {[
                    { icon: Users2, label: "Agent squads" },
                    { icon: Monitor, label: "3D retro office" },
                    { icon: Zap, label: "One-click dispatch" },
                    { icon: MessageSquare, label: "Live agent chat" },
                  ].map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-white/50"
                    >
                      <Icon className="h-3.5 w-3.5 text-white/35" />
                      {label}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Right: Product showcase card */}
            <Reveal delay={200}>
              <div className="relative">
                <div className="absolute inset-x-4 top-4 h-40 rounded-full bg-violet-500/12 blur-[60px]" />
                <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40 backdrop-blur-2xl">
                  {/* Top bar - mimics the retro office */}
                  <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.02] px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                      </div>
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                        okestria.app — virtual office
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                      <span className="text-[10px] text-emerald-300/70">6 agents online</span>
                    </div>
                  </div>

                  {/* Agent grid */}
                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-3">
                      {AGENT_ROLES.slice(0, 6).map((agent) => (
                        <div
                          key={agent.label}
                          className={`group rounded-2xl border border-white/8 bg-[#08111c]/70 p-3.5 transition-all hover:-translate-y-0.5 hover:border-white/15 hover:shadow-lg ${agent.glow}`}
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${agent.color}`}>
                            <agent.icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="mt-2.5 text-xs font-semibold text-white">{agent.label}</div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-emerald-400" />
                            <span className="text-[9px] text-white/35">Active</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Squad summary bar */}
                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/15 bg-amber-500/5 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                          <Crown className="h-4 w-4 text-amber-300" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-amber-100">Sales Squad</div>
                          <div className="text-[10px] text-amber-200/40">4 members · Leader mode</div>
                        </div>
                      </div>
                      <div className="flex -space-x-2">
                        {["from-cyan-500 to-blue-500", "from-violet-500 to-purple-500", "from-pink-500 to-rose-500", "from-amber-500 to-orange-500"].map((color, i) => (
                          <div
                            key={i}
                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0a0603] bg-gradient-to-br ${color} text-[9px] font-bold text-white`}
                          >
                            {["LS", "SR", "CL", "AN"][i]}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live task feed */}
                    <div className="mt-4 space-y-2">
                      {[
                        { status: "completed", label: "Qualified 23 new leads from LinkedIn", agent: "Lead Scout", color: "emerald" },
                        { status: "running", label: "Sending outreach batch #47...", agent: "Sales Rep", color: "cyan" },
                        { status: "pending", label: "Analyze Q2 conversion funnel", agent: "Analyst", color: "amber" },
                      ].map((task) => (
                        <div key={task.label} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
                          {task.status === "completed" ? (
                            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          ) : task.status === "running" ? (
                            <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 shrink-0 text-white/25" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[11px] text-white/70">{task.label}</div>
                          </div>
                          <span className="shrink-0 text-[9px] text-white/30">{task.agent}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030810] to-transparent" />
        </section>

        {/* ============================================================ */}
        {/*  STATS BAR                                                   */}
        {/* ============================================================ */}
        <section className="relative py-16 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {[
                { value: 10, suffix: "x", label: "Faster lead qualification" },
                { value: 85, suffix: "%", label: "Less manual work" },
                { value: 24, suffix: "/7", label: "Always-on agents" },
                { value: 3, suffix: "min", label: "Setup to first task" },
              ].map((stat) => (
                <Reveal key={stat.label} className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent md:text-5xl">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="mt-2 text-sm text-white/40">{stat.label}</div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  FEATURES                                                    */}
        {/* ============================================================ */}
        <section id="features" className="py-24 px-6">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-violet-300/70 mb-6">
                  <Sparkles className="h-3.5 w-3.5" />
                  Built for real operations
                </div>
                <h2 className="text-4xl font-bold md:text-5xl">
                  Everything your AI team
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                    needs to deliver
                  </span>
                </h2>
                <p className="mt-4 text-lg text-white/45 max-w-2xl mx-auto">
                  From squad coordination to knowledge management, every feature is designed
                  to make your agents actually useful.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, i) => {
                const a = accentMap[feature.accent] ?? accentMap.cyan;
                return (
                  <Reveal key={feature.title} delay={i * 80}>
                    <div className={`group relative rounded-2xl border ${a.border} bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04] hover:border-opacity-40 h-full`}>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${a.bg} transition-transform group-hover:scale-110`}>
                        <feature.icon className={`h-6 w-6 ${a.icon}`} />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/45">{feature.desc}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  PRODUCT DEEP DIVE — "INSIDE THE OFFICE"                     */}
        {/* ============================================================ */}
        <section className="py-24 px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.03] to-transparent" />
          <div className="mx-auto max-w-7xl relative z-10">
            <Reveal>
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold md:text-5xl">
                  See the office{" "}
                  <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                    in action
                  </span>
                </h2>
                <p className="mt-4 text-lg text-white/45 max-w-2xl mx-auto">
                  Every agent gets a desk. Every squad has a mission. Watch your AI workforce
                  collaborate in a space that feels alive.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Card 1: Agent Management */}
              <Reveal delay={100}>
                <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-7 h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                      <Bot className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Agent Management</h3>
                      <p className="text-xs text-white/40">Create, configure, and deploy</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: "Lead Scout", role: "Prospecting", status: true, isLeader: false },
                      { name: "Sales Rep", role: "Outreach & engagement", status: true, isLeader: true },
                      { name: "Content Writer", role: "Blog & social media", status: true, isLeader: false },
                      { name: "Data Analyst", role: "Pipeline analytics", status: false, isLeader: false },
                    ].map((agent) => (
                      <div key={agent.name} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${agent.isLeader ? "border-amber-500/20 bg-amber-500/5" : "border-white/6 bg-white/[0.02]"}`}>
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${agent.isLeader ? "bg-amber-500/15" : "bg-white/5"}`}>
                          {agent.isLeader ? <Crown className="h-4 w-4 text-amber-300" /> : <Bot className="h-4 w-4 text-white/40" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white">{agent.name}</div>
                          <div className="text-[11px] text-white/35">{agent.role}</div>
                        </div>
                        <span className={`flex items-center gap-1.5 text-[10px] ${agent.status ? "text-emerald-300/70" : "text-white/25"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${agent.status ? "bg-emerald-400" : "bg-white/20"}`} />
                          {agent.status ? "Online" : "Offline"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              {/* Card 2: Squad Operations */}
              <Reveal delay={200}>
                <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-7 h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                      <Zap className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Squad Operations</h3>
                      <p className="text-xs text-white/40">Tasks, dispatch, and real-time runs</p>
                    </div>
                  </div>

                  {/* Mini task card */}
                  <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4 mb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">Review landing page copy</div>
                        <div className="mt-1 text-xs text-white/35">Sales Squad · Leader mode · 3 runs</div>
                      </div>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-200">
                        Running
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-white/6 bg-white/[0.02] p-2.5 text-center">
                        <div className="text-lg font-semibold text-white">3</div>
                        <div className="text-[9px] text-white/30">Total</div>
                      </div>
                      <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/5 p-2.5 text-center">
                        <div className="text-lg font-semibold text-emerald-100">1</div>
                        <div className="text-[9px] text-emerald-200/40">Done</div>
                      </div>
                      <div className="rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-2.5 text-center">
                        <div className="text-lg font-semibold text-cyan-100">2</div>
                        <div className="text-[9px] text-cyan-200/40">Running</div>
                      </div>
                    </div>
                  </div>

                  {/* Dispatch preview */}
                  <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Rocket className="h-4 w-4 text-amber-300" />
                      <span className="text-xs font-medium text-amber-200">Dispatch Preview</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="rounded-lg border border-white/8 bg-black/20 p-2 text-center">
                        <div className="text-[10px] text-white/30">Runs</div>
                        <div className="text-sm font-semibold text-white">3</div>
                      </div>
                      <div className="rounded-lg border border-white/8 bg-black/20 p-2 text-center">
                        <div className="text-[10px] text-white/30">Tokens/run</div>
                        <div className="text-sm font-semibold text-white">~4.2k</div>
                      </div>
                      <div className="rounded-lg border border-amber-400/20 bg-amber-500/8 p-2 text-center">
                        <div className="text-[10px] text-amber-200/50">Total</div>
                        <div className="text-sm font-semibold text-amber-100">~12.6k</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-amber-300/25 bg-amber-500/10 py-2.5 text-xs font-medium text-amber-100 transition hover:bg-amber-500/15"
                    >
                      Approve &amp; dispatch
                    </button>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  HOW IT WORKS                                                */}
        {/* ============================================================ */}
        <section id="how-it-works" className="py-24 px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.03] to-transparent" />
          <div className="mx-auto max-w-5xl relative z-10">
            <Reveal>
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold md:text-5xl">
                  Up and running in{" "}
                  <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                    three steps
                  </span>
                </h2>
                <p className="mt-4 text-lg text-white/45">
                  From zero to a fully operational AI workspace in minutes.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal key={step.num} delay={i * 120}>
                  <div className="group relative">
                    {/* Connecting line */}
                    {i < STEPS.length - 1 && (
                      <div className="absolute right-0 top-10 hidden h-px w-8 bg-gradient-to-r from-white/10 to-transparent md:block translate-x-full" />
                    )}
                    <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 transition-all group-hover:border-white/12 group-hover:bg-white/[0.04] h-full">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-lg font-bold text-white/80">
                          {step.num}
                        </div>
                        <step.icon className="h-5 w-5 text-white/30" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-white/45">{step.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  AGENT ROLES SHOWCASE                                        */}
        {/* ============================================================ */}
        <section className="py-24 px-6">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold md:text-5xl">
                  Agents built for{" "}
                  <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                    every role
                  </span>
                </h2>
                <p className="mt-4 text-lg text-white/45 max-w-2xl mx-auto">
                  Pre-configured roles to get you started fast, or build completely custom agents
                  tailored to your workflow.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {AGENT_ROLES.map((agent, i) => (
                <Reveal key={agent.label} delay={i * 70}>
                  <div className={`group rounded-2xl border border-white/8 bg-[#08111c]/50 p-6 transition-all hover:-translate-y-1 hover:border-white/15 hover:shadow-xl ${agent.glow} h-full`}>
                    <div className="flex items-center gap-4">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${agent.color} shadow-lg transition-transform group-hover:scale-110`}>
                        <agent.icon className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{agent.label}</h3>
                        <span className="inline-flex items-center gap-1.5 mt-1 text-[10px] text-emerald-300/60">
                          <span className="h-1 w-1 rounded-full bg-emerald-400" />
                          Ready to deploy
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-white/45">{agent.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  PRICING                                                     */}
        {/* ============================================================ */}
        <section id="pricing" className="py-24 px-6">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold md:text-5xl">
                  Start simple,{" "}
                  <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                    scale when ready
                  </span>
                </h2>
                <p className="mt-4 text-lg text-white/45">
                  Every plan includes the retro office, agent chat, and real-time monitoring.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-6 md:grid-cols-3">
              {PLANS.map((plan, i) => (
                <Reveal key={plan.name} delay={i * 100}>
                  <div
                    className={`relative flex flex-col rounded-2xl border p-8 transition-all h-full ${
                      plan.popular
                        ? "bg-gradient-to-b from-violet-500/10 to-transparent border-violet-500/30 shadow-[0_0_60px_rgba(139,92,246,0.1)]"
                        : "bg-white/[0.02] border-white/6 hover:border-white/12"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-1 text-xs font-medium shadow-lg">
                        Most Popular
                      </div>
                    )}
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-white/40">{plan.period}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/35">{plan.desc}</p>

                    <ul className="mt-6 flex-1 space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-3 text-sm text-white/65">
                          <Check className="h-4 w-4 shrink-0 text-cyan-400" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/register"
                      className={`mt-8 block w-full rounded-xl py-3.5 text-center text-sm font-medium transition-all ${
                        plan.popular
                          ? "bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 shadow-[0_4px_20px_rgba(139,92,246,0.3)]"
                          : "border border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  FINAL CTA                                                   */}
        {/* ============================================================ */}
        <section className="py-24 px-6">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl p-12 text-center md:p-16">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/15 via-cyan-600/15 to-pink-600/15" />
                <div className="absolute inset-0 backdrop-blur-3xl" />
                <div className="absolute inset-0 border border-white/8 rounded-3xl" />
                <div className="relative z-10">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 mb-6">
                    <Command className="h-7 w-7 text-white/70" />
                  </div>
                  <h2 className="text-3xl font-bold md:text-4xl lg:text-5xl">
                    Ready to build your
                    <br />
                    <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                      AI workforce?
                    </span>
                  </h2>
                  <p className="mt-4 text-white/50 max-w-xl mx-auto text-lg">
                    Create your first agent, build a squad, and dispatch your first task — all in under 3 minutes. No credit card required.
                  </p>
                  <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                    <Link
                      href="/register"
                      className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 font-semibold text-[#030810] shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]"
                    >
                      Get Started Free
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-4 font-medium text-white/80 transition-all hover:bg-white/[0.08]"
                    >
                      Open workspace
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  FOOTER                                                      */}
        {/* ============================================================ */}
        <footer className="border-t border-white/5 py-12 px-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
            <Link href="/home" className="flex items-center gap-3">
              <Image src="/images/logo.png" alt="Okestria" width={32} height={32} className="h-8 w-8" />
              <span className="font-semibold text-white/70">Okestria</span>
            </Link>
            <div className="text-sm text-white/30">
              &copy; {new Date().getFullYear()} Okestria. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm text-white/40">
              <a href="#" className="transition-colors hover:text-white">Privacy</a>
              <a href="#" className="transition-colors hover:text-white">Terms</a>
              <a href="#" className="transition-colors hover:text-white">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Small helper icons used inline                                     */
/* ------------------------------------------------------------------ */

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
