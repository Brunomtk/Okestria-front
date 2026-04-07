"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Shield,
  Sparkles,
  User,
} from "lucide-react";

const planFeatures = [
  "Unlimited AI agents deployment",
  "Real-time analytics dashboard",
  "Custom workflow builder",
  "24/7 priority support",
  "99.99% uptime SLA",
];

const passwordRequirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = useMemo(() => {
    return passwordRequirements.filter((req) => req.test(password)).length;
  }, [password]);

  const isStep1Valid = useMemo(
    () => fullName.trim() && email.trim() && company.trim(),
    [fullName, email, company]
  );

  const isStep2Valid = useMemo(
    () =>
      password.length >= 8 &&
      password === confirmPassword &&
      agreeTerms &&
      passwordStrength >= 3,
    [password, confirmPassword, agreeTerms, passwordStrength]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step === 1) {
      if (isStep1Valid) {
        setStep(2);
      }
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Simulate registration API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // On success, redirect to login
      router.push("/login?registered=true");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to create account at this time.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#030810]">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.12),transparent)]" />
        <div className="absolute left-0 top-0 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] bg-[radial-gradient(circle,rgba(59,130,246,0.08),transparent_50%)]" />
      </div>

      {/* Grid overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.02] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:64px_64px]" />

      {/* Left Panel - Form */}
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        {/* Logo */}
        <div className="mb-8">
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

        <div className="mx-auto w-full max-w-md">
          {/* Progress steps */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  step >= 1
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "bg-white/10 text-slate-500"
                }`}
              >
                {step > 1 ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <span
                className={`text-sm font-medium ${
                  step >= 1 ? "text-white" : "text-slate-500"
                }`}
              >
                Account Info
              </span>
            </div>
            <div className="h-px flex-1 bg-white/10" />
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  step >= 2
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "bg-white/10 text-slate-500"
                }`}
              >
                2
              </div>
              <span
                className={`text-sm font-medium ${
                  step >= 2 ? "text-white" : "text-slate-500"
                }`}
              >
                Security
              </span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
              {step === 1 ? "Create your account" : "Set up security"}
            </h2>
            <p className="text-slate-400">
              {step === 1
                ? "Start your 14-day free trial. No credit card required."
                : "Choose a strong password to protect your account."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 ? (
              <>
                {/* Full name field */}
                <div className="space-y-2">
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Full name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Smith"
                      autoComplete="name"
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>

                {/* Email field */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Work email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>

                {/* Company field */}
                <div className="space-y-2">
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Company name
                  </label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="company"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Inc."
                      autoComplete="organization"
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Password field */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            passwordStrength >= level
                              ? passwordStrength <= 2
                                ? "bg-rose-500"
                                : passwordStrength === 3
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {passwordRequirements.map((req) => (
                        <div
                          key={req.label}
                          className={`flex items-center gap-2 text-xs ${
                            req.test(password)
                              ? "text-green-400"
                              : "text-slate-500"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded-full ${
                              req.test(password) ? "bg-green-500/20" : "bg-white/5"
                            }`}
                          >
                            {req.test(password) && (
                              <Check className="h-2.5 w-2.5" />
                            )}
                          </div>
                          {req.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Confirm password field */}
                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      className={`h-12 w-full rounded-xl border bg-white/5 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:bg-white/[0.07] focus:ring-2 ${
                        confirmPassword && password !== confirmPassword
                          ? "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20"
                          : "border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-rose-400">
                      Passwords do not match
                    </p>
                  )}
                </div>

                {/* Terms checkbox */}
                <div className="flex items-start gap-3">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 bg-white/5 transition checked:border-cyan-500 checked:bg-cyan-500"
                    />
                    <svg
                      className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 peer-checked:opacity-100"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <label
                    htmlFor="terms"
                    className="cursor-pointer text-sm text-slate-400"
                  >
                    I agree to the{" "}
                    <a href="#" className="text-cyan-400 hover:text-cyan-300">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-cyan-400 hover:text-cyan-300">
                      Privacy Policy
                    </a>
                  </label>
                </div>
              </>
            )}

            {/* Error message */}
            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-base font-medium text-white transition-all hover:bg-white/10"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={step === 1 ? !isStep1Valid : !isStep2Valid || isLoading}
                className="group relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-base font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-10">
                  {step === 1
                    ? "Continue"
                    : isLoading
                      ? "Creating account..."
                      : "Create account"}
                </span>
                <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-blue-600 to-violet-600 transition-transform group-hover:translate-x-0" />
              </button>
            </div>
          </form>

          {/* Sign in link */}
          <p className="mt-8 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-cyan-400 transition-colors hover:text-cyan-300"
            >
              Sign in
            </Link>
          </p>

          {/* Security note */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
            <Shield className="h-4 w-4" />
            <span>Your data is encrypted and secure</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Features */}
      <div className="relative hidden w-1/2 flex-col justify-center p-12 lg:flex xl:p-16">
        <div className="relative z-10 max-w-lg">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300">
            <Sparkles className="h-4 w-4" />
            14-day free trial
          </div>
          <h2 className="mb-6 text-4xl font-bold leading-tight text-white xl:text-5xl">
            Start Automating
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 bg-clip-text text-transparent">
              In Minutes
            </span>
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-slate-400">
            Join over 10,000 teams using Okestria to transform their operations
            with intelligent automation.
          </p>

          {/* Features list */}
          <div className="space-y-4">
            {planFeatures.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                  <Check className="h-4 w-4 text-cyan-400" />
                </div>
                <span className="text-sm text-slate-300">{feature}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-10 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <p className="mb-4 text-sm leading-relaxed text-slate-300">
              {'"'}Okestria has completely transformed how we handle automation.
              What used to take days now takes minutes. The AI agents are
              incredibly intuitive.{'"'}
            </p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500" />
              <div>
                <div className="font-medium text-white">Alex Rivera</div>
                <div className="text-sm text-slate-500">CTO at TechNova</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative orb */}
        <div className="absolute bottom-20 left-20 h-72 w-72 rounded-full bg-gradient-to-br from-violet-500/10 via-blue-500/10 to-cyan-500/10 blur-3xl" />
      </div>
    </div>
  );
}
