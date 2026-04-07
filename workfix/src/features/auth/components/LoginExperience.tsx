'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
} from 'lucide-react';
import { authenticateUser } from '@/lib/auth/api';
import { persistAuthSession } from '@/lib/auth/session-client';

export function LoginExperience() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    router.prefetch('/admin/companies');
    router.prefetch('/company/office');
  }, [router]);

  const isDisabled = useMemo(() => !email.trim() || !password.trim() || isLoading, [email, password, isLoading]);

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

      const targetPath = session.type === 1 ? '/admin/companies' : '/company/office';
      window.location.assign(targetPath);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível autenticar agora.';
      setError(message.replace(/^"|"$/g, ''));
      submitLockRef.current = false;
      setIsLoading(false);
    }
  }

  const features = [
    { icon: Bot, title: 'AI-Powered Agents' },
    { icon: Zap, title: 'Lightning Fast Execution' },
    { icon: Sparkles, title: 'Smart Automation' },
  ];

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#030810]">
      {/* Gradient overlays */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
        <div className="absolute right-0 top-0 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(139,92,246,0.08),transparent_50%)]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-[radial-gradient(circle,rgba(6,182,212,0.08),transparent_50%)]" />
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
            <div
              key={feature.title}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all duration-300"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <feature.icon className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="text-white font-medium">{feature.title}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 mt-auto">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-white mb-4">
            Welcome back to
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              your workspace
            </span>
          </h1>
          <p className="text-lg text-white/50 max-w-md">
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

        <div className="mx-auto w-full max-w-md">
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
                  type={showPassword ? 'text' : 'password'}
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                    ? 'bg-gradient-to-r from-cyan-500 to-violet-500' 
                    : 'bg-white/10'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all ${
                    rememberMe ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
              <label className="text-sm text-white/60 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                Remember me
              </label>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isDisabled}
              className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 transition-transform group-hover:scale-105" />
              <span className="relative z-10">
                {isLoading ? 'Signing in...' : 'Sign in'}
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
    </div>
  );
}
