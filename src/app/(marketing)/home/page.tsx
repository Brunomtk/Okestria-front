"use client";
// HMR cache buster: 2026-04-05T17:27
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Brain,
  Check,
  ChevronRight,
  Clock,
  Globe,
  LineChart,
  Lock,
  MessageSquare,
  Play,
  Shield,
  Target,
  Users,
  Zap,
} from "lucide-react";

// Animated particles background
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
      const count = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.2,
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
        ctx.fillStyle = `rgba(100, 200, 255, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(100, 200, 255, ${0.1 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    createParticles();
    animate();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.6 }}
    />
  );
}

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// Floating animation wrapper
function FloatingElement({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="animate-float"
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

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

  const agentTypes = [
    { icon: Target, label: "Lead Scout", color: "from-cyan-500 to-blue-500", desc: "Prospecção" },
    { icon: MessageSquare, label: "Sales Rep", color: "from-violet-500 to-purple-500", desc: "Vendas" },
    { icon: Brain, label: "Closer", color: "from-pink-500 to-rose-500", desc: "Fechamento" },
    { icon: LineChart, label: "Analyst", color: "from-amber-500 to-orange-500", desc: "Análise" },
  ];

  const features = [
    {
      icon: Bot,
      title: "AI-Powered Squads",
      description: "Coordinated agents operate as a synchronized team that scales infinitely to meet demand, 24/7/365.",
      color: "from-cyan-500/20 to-blue-500/20",
      iconColor: "text-cyan-400",
    },
    {
      icon: Target,
      title: "Smart Lead Scoring",
      description: "Qualify leads in real-time with ML models tailored to your ICP, with laser-focused precision.",
      color: "from-violet-500/20 to-purple-500/20",
      iconColor: "text-violet-400",
    },
    {
      icon: MessageSquare,
      title: "Intelligent Conversations",
      description: "Craft multi-faceted agents that understand context, anticipate needs, and connect emotionally.",
      color: "from-pink-500/20 to-rose-500/20",
      iconColor: "text-pink-400",
    },
    {
      icon: LineChart,
      title: "Real-time Analytics",
      description: "Monitor conversion pipeline, engagement metrics, and agent performance with live dashboards.",
      color: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-400",
    },
    {
      icon: Zap,
      title: "Instant Automation",
      description: "Let your agents handle everything from outreach to follow-ups and keep your team money-focused.",
      color: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-400",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Secure your agents above industry standards with SOC 2 compliance, encryption, and audit trails.",
      color: "from-slate-500/20 to-gray-500/20",
      iconColor: "text-slate-400",
    },
  ];

  const steps = [
    { num: "01", title: "Shape your squads", desc: "Organize specialized agents by roles, objectives, and workflows so each team has a clear mission." },
    { num: "02", title: "Bring in your knowledge", desc: "Connect docs and context, train on your messaging, and configure rules so each agent aligns with the core of your brand." },
    { num: "03", title: "Execute with clarity", desc: "Run tasks, direct agents to your own unique needs for full control over AI in a feedback-fueled system." },
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
      features: ["5 AI Agents", "Unlimited leads", "Advanced analytics", "Priority support", "Custom integrations", "A/B testing tools"],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations.",
      features: ["Unlimited agents", "Unlimited leads", "Custom integrations", "Dedicated support", "API access", "99.9% uptime SLA"],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  const stats = [
    { value: 10, suffix: "x", label: "faster lead qualification" },
    { value: 85, suffix: "%", label: "reduction in manual tasks" },
    { value: 3.2, suffix: "x", label: "higher conversion rates" },
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
            scrolled ? "bg-[#030810]/80 backdrop-blur-xl border-b border-white/5 py-3" : "py-5"
          }`}
        >
          <nav className="mx-auto max-w-7xl px-6 flex items-center justify-between">
            <Link href="/home" className="flex items-center gap-4 group">
              <div className="relative">
                <Image
                  src="/images/logo.png"
                  alt="Orkestria"
                  width={56}
                  height={56}
                  className="h-14 w-14 transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-violet-500/40 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Orkestria
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors relative group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 group-hover:w-full transition-all" />
              </a>
              <a href="#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors relative group">
                How it Works
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 group-hover:w-full transition-all" />
              </a>
              <a href="#pricing" className="text-sm text-white/60 hover:text-white transition-colors relative group">
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 group-hover:w-full transition-all" />
              </a>
              <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
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

        {/* Hero Section - Unique Animated Design */}
        <section className="relative min-h-screen pt-28 pb-20 px-6 overflow-hidden flex items-center">
          {/* Animated orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          <div className="mx-auto max-w-7xl w-full relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left content */}
              <div className="order-2 lg:order-1">
                {/* Animated Logo Hero Element */}
                <div className="relative mb-8">
                  <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-violet-500 via-pink-500 to-orange-500 rounded-full" />
                  <div className="pl-6">
                    <p className="text-sm font-medium text-violet-400 mb-2 tracking-widest uppercase">AI-Powered Platform</p>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
                      <span className="text-white block">Your Agents.</span>
                      <span className="text-white block">Your Rules.</span>
                      <span className="block mt-2 bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                        Infinite Scale.
                      </span>
                    </h1>
                  </div>
                </div>

                <p className="text-lg text-white/60 max-w-xl mb-10 leading-relaxed">
                  Deploy intelligent AI squads that work 24/7. From lead generation to customer success, 
                  Orkestria orchestrates your entire operation with precision and power.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <Link
                    href="/register"
                    className="group relative px-8 py-4 rounded-2xl font-semibold overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-violet-500 via-pink-500 to-orange-500" />
                    <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-pink-600 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                      Start Building Free
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                  <button className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-medium text-white border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <Play className="h-4 w-4 ml-0.5" />
                    </div>
                    Watch Demo
                  </button>
                </div>

                {/* Quick stats */}
                <div className="flex flex-wrap gap-8">
                  {stats.slice(0, 3).map((stat) => (
                    <div key={stat.label} className="text-left">
                      <div className="text-3xl font-bold text-white mb-1">
                        <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                      </div>
                      <p className="text-sm text-white/40">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right - Hero Visual */}
              <div className="order-1 lg:order-2 relative">
                <div className="relative mx-auto max-w-2xl">
                  <div className="absolute -top-10 right-10 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />
                  <div className="absolute bottom-8 left-0 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

                  <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl md:p-6">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
                        <div className="rounded-[28px] border border-white/10 bg-[#07111d]/80 p-5">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300/80">Live command center</p>
                              <h3 className="mt-2 text-2xl font-semibold text-white">AI squads running in sync</h3>
                            </div>
                            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                              12 agents online
                            </div>
                          </div>

                          <div className="mb-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Qualified</p>
                              <p className="mt-2 text-3xl font-semibold text-white">284</p>
                              <p className="mt-1 text-xs text-emerald-300">+18% this week</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Outreach</p>
                              <p className="mt-2 text-3xl font-semibold text-white">1.2k</p>
                              <p className="mt-1 text-xs text-cyan-300">Batch emails active</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Reply rate</p>
                              <p className="mt-2 text-3xl font-semibold text-white">37%</p>
                              <p className="mt-1 text-xs text-violet-300">Across 4 workflows</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {["Lead discovery", "Qualification", "Email sequence", "CRM sync"].map((item, idx) => (
                              <div key={item} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${agentTypes[idx]?.color ?? 'from-cyan-500 to-blue-500'} flex items-center justify-center`}>
                                    {(() => {
                                      const Icon = agentTypes[idx]?.icon ?? Bot;
                                      return <Icon className="h-5 w-5 text-white" />;
                                    })()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-white">{item}</p>
                                    <p className="text-xs text-white/45">{agentTypes[idx]?.label ?? 'Automation'} working now</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.8)]" />
                                  Stable
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-4">
                          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-violet-500/18 via-fuchsia-500/10 to-cyan-500/10 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Pipeline velocity</p>
                            <div className="mt-4 flex items-end gap-2">
                              {[42, 58, 55, 72, 68, 84, 91].map((height, index) => (
                                <div key={index} className="flex-1 rounded-t-2xl bg-gradient-to-t from-cyan-400/70 to-violet-400/80" style={{ height: `${height}px` }} />
                              ))}
                            </div>
                            <p className="mt-4 text-sm text-white/70">Conversion trend accelerating as squads qualify and follow up automatically.</p>
                          </div>

                          <div className="rounded-[28px] border border-white/10 bg-[#09121f]/85 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Coverage</p>
                            <div className="mt-4 space-y-4">
                              <div>
                                <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                                  <span>Outbound orchestration</span>
                                  <span>94%</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-white/10">
                                  <div className="h-2.5 w-[94%] rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
                                </div>
                              </div>
                              <div>
                                <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                                  <span>Lead enrichment</span>
                                  <span>88%</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-white/10">
                                  <div className="h-2.5 w-[88%] rounded-full bg-gradient-to-r from-violet-400 to-pink-400" />
                                </div>
                              </div>
                              <div>
                                <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                                  <span>Ops automation</span>
                                  <span>79%</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-white/10">
                                  <div className="h-2.5 w-[79%] rounded-full bg-gradient-to-r from-pink-400 to-orange-400" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4">
                        {agentTypes.map((agent, i) => (
                          <FloatingElement key={agent.label} delay={i * 180}>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-transform hover:-translate-y-1">
                              <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${agent.color}`}>
                                <agent.icon className="h-5 w-5 text-white" />
                              </div>
                              <p className="text-sm font-medium text-white">{agent.label}</p>
                              <p className="mt-1 text-xs text-white/45">{agent.desc}</p>
                            </div>
                          </FloatingElement>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030810] to-transparent" />
        </section>

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
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
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

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 px-6">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/home" className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt="Orkestria"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="font-semibold text-white/80">Orkestria</span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-white/40">
              <span>&copy; 2024 Orkestria. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/50">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        
        .animation-delay-400 {
          animation-delay: 400ms;
        }
        
        .animation-delay-600 {
          animation-delay: 600ms;
        }
      `}</style>
    </>
  );
}
