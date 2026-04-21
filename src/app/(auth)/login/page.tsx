"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageSquare,
  Shield,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { authenticateUser } from "@/lib/auth/api";
import { persistAuthSession } from "@/lib/auth/session-client";

// -------------------------------------------------------------------------
// Ambient background — soft particles + connecting lines. Cheap enough to
// run on any laptop, and gives the page a subtle living-network feel.
// -------------------------------------------------------------------------
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
      const count = Math.floor((canvas.width * canvas.height) / 22000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          size: Math.random() * 1.4 + 0.4,
          opacity: Math.random() * 0.35 + 0.08,
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
        ctx.fillStyle = `rgba(120, 190, 255, ${p.opacity})`;
        ctx.fill();
      });

      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(120, 190, 255, ${0.08 * (1 - dist / 110)})`;
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
      style={{ opacity: 0.45 }}
    />
  );
}

// -------------------------------------------------------------------------
// Live agent activity pill. Cycles through short "what the agents are doing
// right now" phrases so the login screen feels alive — same spirit as the
// landing page.
// -------------------------------------------------------------------------
const ACTIVITY_TICKS: Array<{
  icon: LucideIcon;
  color: string;
  agent: string;
  text: string;
}> = [
  {
    icon: Bot,
    color: "text-cyan-300",
    agent: "Prospector",
    text: "Found 38 new qualified leads in São Paulo",
  },
  {
    icon: MessageSquare,
    color: "text-violet-300",
    agent: "Outreach",
    text: "Sent 12 personalised replies on WhatsApp",
  },
  {
    icon: Zap,
    color: "text-amber-300",
    agent: "Follow-up",
    text: "Re-engaged 7 cold leads from last week",
  },
  {
    icon: CheckCircle2,
    color: "text-emerald-300",
    agent: "Closer",
    text: "Booked 3 meetings for tomorrow morning",
  },
];

function LiveActivityFeed() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % ACTIVITY_TICKS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  const tick = ACTIVITY_TICKS[index];
  const Icon = tick.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5" />
      <div className="relative flex items-center gap-4 px-5 py-4">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 ring-1 ring-white/10">
          <Icon className={`h-5 w-5 ${tick.color}`} />
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-white/50">
            <span>{tick.agent} agent</span>
            <span className="text-white/20">•</span>
            <span className="text-emerald-400">Active now</span>
          </div>
          <p
            key={index}
            className="mt-1 truncate text-sm font-medium text-white animate-fade-in"
          >
            {tick.text}
          </p>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Feature card — tight spacing, consistent icon chip.
// -------------------------------------------------------------------------
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div
      className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-300 hover:border-cyan-400/30 hover:bg-white/[0.06] animate-slide-in-left"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 ring-1 ring-white/10 transition-transform group-hover:scale-110">
        <Icon className="h-5 w-5 text-cyan-300" />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-white">{title}</p>
        <p className="mt-0.5 text-sm text-white/50">{description}</p>
      </div>
    </div>
  );
}

// Accept only same-origin paths like "/company/office?x=1" — this blocks
// the classic open-redirect foot-gun where a crafted `?returnTo=https://evil`
// would bounce the user off-site right after login.
function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/login")) return null; // avoid redirect loop
  return trimmed;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams?.get("returnTo") ?? null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    router.prefetch("/admin/companies");
    router.prefetch("/company/office");
  }, [router]);

  const isDisabled = useMemo(
    () => !email.trim() || !password.trim() || isLoading,
    [email, password, isLoading]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current || isLoading) return;

    submitLockRef.current = true;
    setError(null);
    setIsLoading(true);

    try {
      const session = await authenticateUser({
        email: email.trim(),
        password,
        rememberMe,
      });

      persistAuthSession(session);

      // If the user landed here after a "Sua sessão expirou" bounce, send
      // them back to the screen they were on instead of the default role
      // landing page — that's what "não sai da tela" means in practice.
      const defaultPath = session.type === 1 ? "/admin/companies" : "/company/office";
      const targetPath = returnTo ?? defaultPath;
      window.location.assign(targetPath);
      return;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to authenticate at this time.";
      setError(message.replace(/^"|"$/g, ""));
      submitLockRef.current = false;
      setIsLoading(false);
    }
  }

  const features: Array<{
    icon: LucideIcon;
    title: string;
    description: string;
  }> = [
    {
      icon: Bot,
      title: "Focused AI squads",
      description: "Build agents for prospecting, outreach, follow-up and execution.",
    },
    {
      icon: Zap,
      title: "One clean workspace",
      description: "Simple to launch, easy to control, ready to scale.",
    },
    {
      icon: Sparkles,
      title: "Live orchestration",
      description: "Watch your operation run in real time — no guesswork.",
    },
  ];

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#030810]">
      {/* Ambient layers */}
      <ParticlesBackground />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-15%,rgba(59,130,246,0.14),transparent)]" />
        <div className="absolute right-0 top-0 h-[640px] w-[640px] bg-[radial-gradient(circle,rgba(139,92,246,0.09),transparent_55%)]" />
        <div className="absolute bottom-0 left-0 h-[560px] w-[560px] bg-[radial-gradient(circle,rgba(6,182,212,0.09),transparent_55%)]" />
        <div className="absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 bg-gradient-to-b from-cyan-500/10 via-violet-500/5 to-transparent blur-3xl" />
      </div>

      {/* -------------------------- LEFT PANEL -------------------------- */}
      <aside className="relative hidden w-1/2 flex-col justify-between p-10 lg:flex xl:p-14 2xl:p-16">
        <div className="relative z-10 flex flex-col gap-10">
          {/* Logo */}
          <Link href="/home" className="group inline-flex items-center gap-3 self-start">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
              <Image
                src="/images/logo.png"
                alt="Orkestria"
                width={40}
                height={40}
                className="relative h-10 w-10 transition-transform group-hover:scale-105"
              />
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-white via-violet-200 to-pink-200 bg-clip-text text-transparent">
              Orkestria
            </span>
          </Link>

          {/* Live activity */}
          <LiveActivityFeed />
        </div>

        {/* Headline + supporting copy */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs font-medium text-cyan-300 backdrop-blur-sm animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/80" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            Your squads are already working
          </div>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-5xl 2xl:text-[3.3rem] animate-fade-in-up">
            Welcome back to
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">
              your workspace
            </span>
          </h1>

          <p className="max-w-md text-base leading-relaxed text-white/55 xl:text-lg animate-fade-in-up animation-delay-200">
            Coordinate your agents, leads, knowledge and execution from one
            polished workspace built to move fast.
          </p>

          <div className="grid gap-3 pt-2">
            {features.map((feature, i) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={400 + i * 120}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-2 text-sm text-white/35">
          <Shield className="h-4 w-4" />
          <span>Secure access for admin &amp; company workspaces</span>
        </div>
      </aside>

      {/* -------------------------- RIGHT PANEL ------------------------- */}
      <section className="relative flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-1/2 lg:px-12 xl:px-20 2xl:px-28">
        {/* Mobile logo */}
        <div className="mb-10 lg:hidden">
          <Link href="/home" className="inline-flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt="Orkestria"
              width={34}
              height={34}
              className="h-8 w-8"
            />
            <span className="font-semibold text-white">Orkestria</span>
          </Link>
        </div>

        <div className="relative mx-auto w-full max-w-md animate-fade-in">
          {/* Back to home */}
          <Link
            href="/home"
            className="group mb-10 inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to home
          </Link>

          {/* Header */}
          <div className="mb-9">
            <h2 className="text-3xl font-bold tracking-tight text-white xl:text-[2rem]">
              Sign in to Orkestria
            </h2>
            <p className="mt-2 text-white/50">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
            {/* Email field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/75"
              >
                Email
              </label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-cyan-300" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-12 pr-4 text-[15px] text-white outline-none transition-all placeholder:text-white/30 hover:border-white/15 focus:border-cyan-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-cyan-500/15"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-white/75"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-cyan-300 transition-colors hover:text-cyan-200"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="group relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-cyan-300" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-12 pr-14 text-[15px] text-white outline-none transition-all placeholder:text-white/30 hover:border-white/15 focus:border-cyan-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-cyan-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/35 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className="group inline-flex items-center gap-3"
                aria-pressed={rememberMe}
              >
                <span
                  className={`relative h-6 w-11 rounded-full transition-all ${
                    rememberMe
                      ? "bg-gradient-to-r from-cyan-500 to-violet-500 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_20px_-4px_rgba(139,92,246,0.4)]"
                      : "bg-white/10 ring-1 ring-inset ring-white/5"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all ${
                      rememberMe ? "left-[1.375rem]" : "left-1"
                    }`}
                  />
                </span>
                <span className="text-sm text-white/65 transition-colors group-hover:text-white/85">
                  Keep me signed in
                </span>
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 animate-shake">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20">
                  <span className="text-xs font-bold text-rose-300">!</span>
                </div>
                <p className="flex-1">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isDisabled}
              className="group relative mt-2 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold text-white shadow-[0_8px_30px_-6px_rgba(139,92,246,0.45)] transition-all hover:shadow-[0_10px_40px_-6px_rgba(139,92,246,0.6)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 transition-transform group-hover:scale-[1.03]" />
              <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </div>
              <span className="relative z-10 text-[15px]">
                {isLoading ? "Signing in..." : "Sign in"}
              </span>
              {!isLoading && (
                <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </form>

          {/* Divider + Register */}
          <div className="mt-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#030810] px-3 uppercase tracking-wider text-white/35">
                  New to Orkestria?
                </span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200"
              >
                Create your workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile footer */}
        <div className="mt-12 flex items-center justify-center gap-2 text-xs text-white/35 lg:hidden">
          <Shield className="h-3.5 w-3.5" />
          <span>Secure access for admin &amp; company workspaces</span>
        </div>
      </section>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.5s ease-out forwards;
          opacity: 0;
        }
        .animate-shake {
          animation: shake 0.45s ease-in-out;
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
      `}</style>
    </div>
  );
}
