"use client";

/**
 * v141 — Minimalist login.
 *
 * Re-designed from scratch. Old version was a busy two-column split
 * with marketing copy + activity feed + 3D agent + feature cards on
 * the left and a form on the right. The new version is a single
 * centered column on a quiet cosmic background — premium, calm,
 * professional. The brand mark animates softly, the form fields fade
 * in on mount, the submit button has a subtle gradient sweep on
 * hover. Nothing competes with the user's only goal here: log in.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { authenticateUser } from "@/lib/auth/api";
import { persistAuthSession } from "@/lib/auth/session-client";
import { OrkestriaMark } from "@/components/OrkestriaMark";

// Accept only same-origin paths — same logic as v139 (open-redirect guard).
function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed, "http://localhost");
    if (u.origin !== "http://localhost") return null;
    const path = `${u.pathname}${u.search}${u.hash}`;
    if (!path.startsWith("/") || path.startsWith("//")) return null;
    return path;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#04060d] text-white/60">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

function LoginPageInner() {
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
    [email, password, isLoading],
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
      const defaultPath = session.type === 1 ? "/admin/companies" : "/company/office";
      const targetPath = returnTo ?? defaultPath;
      window.location.assign(targetPath);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to authenticate at this time.";
      setError(message.replace(/^"|"$/g, ""));
      submitLockRef.current = false;
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#04060d] px-6 py-10">
      {/* Quiet cosmic background — three layered radial gradients, no
          particles, no grid. Sets the mood without competing for
          attention. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18) 0%, rgba(15,23,42,0.92) 50%, #04060d 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 80%, rgba(34,211,238,0.06), transparent 45%)," +
            "radial-gradient(circle at 82% 78%, rgba(245,158,11,0.05), transparent 45%)",
        }}
      />

      {/* Top brand bar — sits floating, no border, very minimal */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5">
        <Link
          href="/home"
          className="login-fade-in group inline-flex items-center gap-2.5"
          style={{ animationDelay: "0ms" }}
        >
          <OrkestriaMark size={28} animated className="transition-transform group-hover:scale-105" />
          <span className="bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-[15px] font-semibold tracking-tight text-transparent">
            Orkestria
          </span>
        </Link>
        <Link
          href="/home"
          className="login-fade-in text-[13px] text-white/45 transition-colors hover:text-white/85"
          style={{ animationDelay: "80ms" }}
        >
          Back to home
        </Link>
      </header>

      {/* Centered card — 420px max, glassy, calm */}
      <main className="relative z-10 w-full max-w-[420px]">
        <div
          className="login-fade-in relative overflow-hidden rounded-3xl border border-white/8 backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,18,30,0.85) 0%, rgba(8,11,20,0.92) 100%)",
            boxShadow:
              "0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
            animationDelay: "120ms",
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

          <div className="px-7 py-9">
            {/* Animated mark + welcome */}
            <div className="login-fade-in mb-7 flex flex-col items-center text-center" style={{ animationDelay: "200ms" }}>
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 -m-3 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at center, rgba(167,139,250,0.30) 0%, rgba(167,139,250,0) 65%)",
                  }}
                />
                <OrkestriaMark size={56} animated />
              </div>
              <h1 className="mt-5 text-[26px] font-semibold leading-tight tracking-tight text-white">
                Welcome back
              </h1>
              <p className="mt-1 text-[13.5px] text-white/50">
                Sign in to continue to your workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5" aria-busy={isLoading}>
              {/* Email */}
              <Field
                label="Email"
                icon={<Mail className="h-4 w-4" />}
                style={{ animationDelay: "320ms" }}
              >
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-transparent pl-9 pr-3 py-2.5 text-[14px] text-white placeholder-white/30 outline-none"
                />
              </Field>

              {/* Password */}
              <Field
                label="Password"
                icon={<Lock className="h-4 w-4" />}
                style={{ animationDelay: "400ms" }}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/40 transition-colors hover:text-white/80"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              >
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent pl-9 pr-9 py-2.5 text-[14px] text-white placeholder-white/30 outline-none"
                />
              </Field>

              {/* Remember + forgot */}
              <div
                className="login-fade-in flex items-center justify-between pt-1 text-[12.5px]"
                style={{ animationDelay: "480ms" }}
              >
                <label className="inline-flex cursor-pointer items-center gap-2 text-white/55 transition-colors hover:text-white/80">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 cursor-pointer accent-violet-400"
                  />
                  Remember me
                </label>
                <Link href="/forgot" className="text-white/55 transition-colors hover:text-violet-200">
                  Forgot password?
                </Link>
              </div>

              {/* Error */}
              {error ? (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-3 py-2 text-[12.5px] text-rose-200"
                >
                  {error}
                </div>
              ) : null}

              {/* Submit */}
              <button
                type="submit"
                disabled={isDisabled}
                className="login-fade-in group relative mt-2 inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-[14px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{ animationDelay: "560ms" }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 transition-opacity"
                  style={{
                    background:
                      "linear-gradient(90deg, #22d3ee 0%, #a78bfa 50%, #f59e0b 100%)",
                  }}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(90deg, #22d3ee 0%, #a78bfa 35%, #f59e0b 70%, #a78bfa 100%)",
                    backgroundSize: "200% 100%",
                    animation: "login-sweep 2.4s linear infinite",
                  }}
                />
                <span className="relative z-10 inline-flex items-center gap-2 text-[#0b0e14]">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Divider + register CTA */}
            <div
              className="login-fade-in mt-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/30"
              style={{ animationDelay: "640ms" }}
            >
              <span className="h-px flex-1 bg-white/10" />
              new here?
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div
              className="login-fade-in mt-4 text-center text-[13px] text-white/55"
              style={{ animationDelay: "720ms" }}
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 font-medium text-white/75 transition-colors hover:text-white"
              >
                Create your workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Trust footnote */}
        <div
          className="login-fade-in mt-5 flex items-center justify-center gap-2 text-[11.5px] text-white/30"
          style={{ animationDelay: "800ms" }}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Encrypted in transit · sessions you can revoke</span>
        </div>
      </main>

      <style jsx global>{`
        @keyframes login-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-fade-in {
          animation: login-fade-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes login-sweep {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        /* Soft focus ring inside the field — more elegant than the
           default browser ring. */
        .login-field:focus-within {
          border-color: rgba(167,139,250,0.55) !important;
          box-shadow:
            0 0 0 1px rgba(167,139,250,0.25),
            0 4px 18px rgba(167,139,250,0.12);
        }
      `}</style>
    </div>
  );
}

// ── Field primitive ──────────────────────────────────────────────────

function Field({
  label,
  icon,
  rightSlot,
  children,
  style,
}: {
  label: string;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <label className="login-fade-in block" style={style}>
      <span className="mb-1.5 block text-[11.5px] font-medium text-white/55">
        {label}
      </span>
      <div className="login-field relative flex items-center rounded-xl border border-white/10 bg-white/[0.025] transition-all">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35">
          {icon}
        </span>
        {children}
        {rightSlot}
      </div>
    </label>
  );
}
