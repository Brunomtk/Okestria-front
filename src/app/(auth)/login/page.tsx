"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { authenticateUser } from "@/lib/auth/api";
import { persistAuthSession } from "@/lib/auth/session-client";

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
      const count = Math.floor((canvas.width * canvas.height) / 20000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.4 + 0.1,
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
        ctx.fillStyle = `rgba(100, 180, 255, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(100, 180, 255, ${0.08 * (1 - dist / 100)})`;
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
      style={{ opacity: 0.5 }}
    />
  );
}

// Feature card component
function FeatureCard({ 
  icon: Icon, 
  title, 
  delay 
}: { 
  icon: LucideIcon; 
  title: string; 
  delay: number;
}) {
  return (
    <div
      className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all duration-300 animate-slide-in-left"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5 text-cyan-400" />
      </div>
      <span className="text-white font-medium">{title}</span>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
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

      const targetPath = session.type === 1 ? "/admin/companies" : "/company/office";
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

  const features = [
    { icon: Bot, title: "AI-Powered Agents" },
    { icon: Zap, title: "Lightning Fast Execution" },
    { icon: Sparkles, title: "Smart Automation" },
  ];

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#030810]">
      {/* Background */}
      <ParticlesBackground />
      
      {/* Gradient overlays */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
        <div className="absolute right-0 top-0 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(139,92,246,0.08),transparent_50%)]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-[radial-gradient(circle,rgba(6,182,212,0.08),transparent_50%)]" />
        
        {/* Top glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-cyan-500/10 via-violet-500/5 to-transparent blur-3xl" />
      </div>

      {/* Left Panel - Branding */}
      <div className="relative hidden w-1/2 flex-col p-12 lg:flex xl:p-16">
        {/* Logo */}
        <div className="relative z-10 mb-auto">
          <Link href="/home" className="flex items-center gap-3 group">
            <Image
              src="/images/logo.png"
              alt="Orkestria"
              width={40}
              height={40}
              className="h-10 w-10 transition-transform group-hover:scale-110"
            />
            <span className="text-xl font-semibold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              Orkestria
            </span>
          </Link>
        </div>

        {/* Feature cards */}
        <div className="relative z-10 flex flex-col gap-4 mt-32">
          {features.map((feature, i) => (
            <FeatureCard 
              key={feature.title} 
              icon={feature.icon} 
              title={feature.title} 
              delay={i * 150}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 mt-auto">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-white mb-4 animate-fade-in-up">
            Welcome back to
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              your workspace
            </span>
          </h1>
          <p className="text-lg text-white/50 max-w-md animate-fade-in-up animation-delay-200">
            Coordinate your agents, leads, knowledge, and execution from
            one polished workspace built to move fast.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-12 flex items-center gap-2 text-sm text-white/30">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Secure access for admin and company workspaces
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Link href="/home" className="flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt="Orkestria"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="font-semibold text-white">Orkestria</span>
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md animate-fade-in">
          {/* Back to home */}
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Sign in
            </h2>
            <p className="text-white/50">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
            {/* Email field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/70"
              >
                Email
              </label>
              <div className="relative group">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-12 pr-4 text-white outline-none transition-all placeholder:text-white/30 focus:border-cyan-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/70"
              >
                Password
              </label>
              <div className="relative group">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-12 pr-14 text-white outline-none transition-all placeholder:text-white/30 focus:border-cyan-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white"
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

            {/* Remember me toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`relative w-12 h-7 rounded-full transition-all ${
                  rememberMe 
                    ? "bg-gradient-to-r from-cyan-500 to-violet-500" 
                    : "bg-white/10"
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all ${
                    rememberMe ? "left-6" : "left-1"
                  }`}
                />
              </button>
              <label className="text-sm text-white/60 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                Remember me
              </label>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 animate-shake">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isDisabled}
              className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 transition-transform group-hover:scale-105" />
              
              {/* Shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </div>
              
              <span className="relative z-10">
                {isLoading ? "Signing in..." : "Sign in"}
              </span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          {/* Register link */}
          <div className="mt-8 text-center">
            <p className="text-white/50">
              {"Don't have an account? "}
              <Link
                href="/register"
                className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
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
        
        @keyframes slide-in-left {
          from { 
            opacity: 0;
            transform: translateX(-30px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        
        .animate-slide-in-left {
          animation: slide-in-left 0.5s ease-out forwards;
          opacity: 0;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animation-delay-200 {
          animation-delay: 200ms;
        }
      `}</style>
    </div>
  );
}
