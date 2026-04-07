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
                Build squads for prospecting, outreach, follow-up and execution in one clean workspace.
                Simple to launch, easy to control, ready to scale.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 font-semibold text-[#060b12] transition-transform hover:-translate-y-0.5"
                >
                  Start free
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.03] px-7 py-4 font-medium text-white/85 transition-colors hover:bg-white/[0.06]"
                >
                  Open workspace
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-3 text-sm text-white/55">
                {['Lead generation', 'Email outreach', 'Agent squads', 'Live workspace'].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-x-8 top-6 h-40 rounded-full bg-violet-500/15 blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl md:p-6">
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Agent lineup</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">A cleaner way to orchestrate work</h3>
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    4 agents online
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {agentTypes.map((agent, i) => (
                    <div
                      key={agent.label}
                      className="rounded-[24px] border border-white/10 bg-[#08111c]/85 p-4 transition-transform hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${agent.color}`}>
                          <agent.icon className="h-6 w-6 text-white" />
                        </div>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                          Active
                        </span>
                      </div>
                      <h4 className="mt-4 text-lg font-semibold text-white">{agent.label}</h4>
                      <p className="mt-1 text-sm text-white/50">{agent.desc} with clear prompts, memory and execution rules.</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">One workspace. Multiple agents. Less noise.</p>
                      <p className="mt-1 text-sm text-white/45">Launch fast and keep full control over the way each agent operates.</p>
                    </div>
                    <div className="flex -space-x-3">
                      {['LS', 'SR', 'CL', 'AN'].map((initial, index) => (
                        <div
                          key={initial}
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-[#030810] text-xs font-semibold text-white bg-gradient-to-br ${agentTypes[index]?.color ?? 'from-cyan-500 to-blue-500'}`}
                        >
                          {initial}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
