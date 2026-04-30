/**
 * v145.2 — Reusable admin building blocks.
 *
 * IMPORTANT: this file is a SERVER component (no "use client"). The
 * primitives below have no hooks and no event handlers, so they can
 * render on the server. That matters because admin pages pass
 * lucide-react icon FUNCTIONS as props (`icon={Building2}`) and
 * passing component references across a server→client boundary
 * fails serialization in Next 16's strict prod build, throwing
 * "An error occurred in the Server Components render".
 *
 * If you ever need state/handlers here, move only THAT component
 * into its own client file — don't blanket-flip this file.
 *
 *   <PageHeader>            page title + subtitle + right slot
 *   <Section>               labeled card (header + body)
 *   <StatCard>              KPI tile with accent + delta
 *   <DataTable>             rows + columns with hover lift
 *   <StatusPill>            colored chip (ok / warn / error / idle)
 *   <SectionHairline>       hairline separator with glow
 */

import type { ReactNode } from "react";

// ── Page header ────────────────────────────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-violet-300/85">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-white md:text-[32px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/55">
            {subtitle}
          </p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

// ── Card / section ─────────────────────────────────────────────────

export function Section({
  title,
  subtitle,
  right,
  children,
  accent = "violet",
  className = "",
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  accent?: "violet" | "cyan" | "amber" | "emerald" | "rose";
  className?: string;
}) {
  const accentLine = {
    violet: "rgba(167,139,250,0.55)",
    cyan: "rgba(34,211,238,0.55)",
    amber: "rgba(245,158,11,0.55)",
    emerald: "rgba(52,211,153,0.55)",
    rose: "rgba(251,113,133,0.55)",
  }[accent];

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.6)] backdrop-blur-md ${className}`}
      style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accentLine} 50%, transparent 100%)`,
        }}
      />
      {title || right ? (
        <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-3.5">
          <div>
            {title ? (
              <h2 className="text-[14px] font-semibold text-white/90">{title}</h2>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/40">
                {subtitle}
              </p>
            ) : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

// ── Stat card ──────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "violet",
  href,
  hint,
}: {
  label: string;
  value: string | number;
  delta?: { value: string; positive?: boolean };
  icon: React.ComponentType<{ className?: string }>;
  accent?: "violet" | "cyan" | "amber" | "emerald" | "rose";
  href?: string;
  hint?: string;
}) {
  const colors = {
    violet: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.30)" },
    cyan:   { color: "#22d3ee", bg: "rgba(34,211,238,0.10)",  border: "rgba(34,211,238,0.30)" },
    amber:  { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.30)" },
    emerald:{ color: "#34d399", bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.30)" },
    rose:   { color: "#fb7185", bg: "rgba(251,113,133,0.10)", border: "rgba(251,113,133,0.30)" },
  }[accent];

  const Card = (props: { children: ReactNode }) =>
    href ? (
      <a
        href={href}
        className="group relative block overflow-hidden rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.6)] p-5 backdrop-blur-md transition hover:border-white/20 hover:bg-[rgba(8,11,20,0.85)]"
        style={{ boxShadow: "0 18px 50px rgba(0,0,0,0.35)" }}
      >
        {props.children}
      </a>
    ) : (
      <div
        className="relative overflow-hidden rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.6)] p-5 backdrop-blur-md"
        style={{ boxShadow: "0 18px 50px rgba(0,0,0,0.35)" }}
      >
        {props.children}
      </div>
    );

  return (
    <Card>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${colors.color}80 50%, transparent 100%)`,
        }}
      />
      <div className="flex items-start justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            color: colors.color,
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
        {delta ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
              delta.positive
                ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                : "border-rose-400/30 bg-rose-500/[0.08] text-rose-200"
            }`}
          >
            {delta.positive ? "↑" : "↓"} {delta.value}
          </span>
        ) : null}
      </div>
      <div className="mt-5">
        <div className="text-[28px] font-semibold leading-none tracking-tight text-white">
          {value}
        </div>
        <div className="mt-1.5 text-[13px] text-white/65">{label}</div>
        {hint ? (
          <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/35">
            {hint}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

// ── Status pill ────────────────────────────────────────────────────

export function StatusPill({
  status,
  label,
}: {
  status: "ok" | "warn" | "error" | "idle" | "info";
  label: string;
}) {
  const styles = {
    ok:    { border: "border-emerald-400/30", bg: "bg-emerald-500/[0.08]", text: "text-emerald-200", dot: "bg-emerald-400" },
    warn:  { border: "border-amber-400/30",   bg: "bg-amber-500/[0.08]",   text: "text-amber-200",   dot: "bg-amber-400" },
    error: { border: "border-rose-400/30",    bg: "bg-rose-500/[0.08]",    text: "text-rose-200",    dot: "bg-rose-400" },
    idle:  { border: "border-white/10",       bg: "bg-white/[0.04]",       text: "text-white/60",    dot: "bg-white/40" },
    info:  { border: "border-cyan-400/30",    bg: "bg-cyan-500/[0.08]",    text: "text-cyan-200",    dot: "bg-cyan-400" },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${styles.border} ${styles.bg} ${styles.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {label}
    </span>
  );
}

// ── Hairline separator ────────────────────────────────────────────

export function SectionHairline() {
  return (
    <div
      aria-hidden
      className="my-1 h-px"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 50%, transparent 100%)",
      }}
    />
  );
}
