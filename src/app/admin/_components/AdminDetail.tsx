/**
 * v145 — Admin · Detail page primitives.
 *
 *   <DetailHeader>     back link + title + tag pills + action slot
 *   <DetailActionLink> outlined action button styled like the table
 *   <DetailDeleteForm> destructive submit form (with native confirm)
 *   <DetailFact>       label + value cell (used inside grids)
 *   <DetailLinkRow>    full-width navigation row for "quick actions"
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { AdminDeleteButton } from "./AdminDeleteButton";

/* ------------------------------------------------------------------ */
/* Header                                                             */
/* ------------------------------------------------------------------ */

export function DetailHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  subtitle,
  pills,
  actions,
}: {
  backHref: string;
  backLabel: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  pills?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/45 transition hover:text-white/80"
        >
          <ArrowLeft className="h-3 w-3" />
          {backLabel}
        </Link>
        <div className="mt-3">
          {eyebrow ? (
            <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-violet-300/65">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 bg-gradient-to-r from-white via-violet-100 to-cyan-100 bg-clip-text text-[26px] font-semibold tracking-tight text-transparent">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/55">
              {subtitle}
            </p>
          ) : null}
          {pills ? <div className="mt-3 flex flex-wrap gap-2">{pills}</div> : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Action button                                                      */
/* ------------------------------------------------------------------ */

export function DetailActionLink({
  href,
  children,
  accent = "default",
  icon: Icon,
}: {
  href: string;
  children: ReactNode;
  accent?: "default" | "violet" | "cyan";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const palette = {
    default:
      "border-white/12 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white",
    violet:
      "border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
    cyan:
      "border-cyan-400/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25",
  }[accent];

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12.5px] font-medium transition ${palette}`}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Delete form                                                        */
/* ------------------------------------------------------------------ */

export function DetailDeleteForm({
  action,
  fieldName,
  fieldValue,
  label = "Delete",
  confirmText = "Delete this record? This cannot be undone.",
}: {
  action: (formData: FormData) => void | Promise<void>;
  fieldName: string;
  fieldValue: string | number;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name={fieldName} value={fieldValue} />
      <AdminDeleteButton confirmText={confirmText} label={label} />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Fact cell                                                          */
/* ------------------------------------------------------------------ */

export function DetailFact({
  label,
  value,
  icon: Icon,
  span = 1,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  span?: 1 | 2;
  mono?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-black/25 p-4 ${
        span === 2 ? "md:col-span-2" : ""
      }`}
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
        {label}
      </p>
      <div
        className={`mt-1.5 flex items-center gap-2 text-[13px] text-white/90 ${
          mono ? "font-mono text-cyan-100/85" : ""
        }`}
      >
        {Icon ? <Icon className="h-3.5 w-3.5 text-white/45" /> : null}
        <span className="min-w-0 truncate">{value}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tag pill                                                           */
/* ------------------------------------------------------------------ */

export function DetailTagPill({
  children,
  variant = "outline",
}: {
  children: ReactNode;
  variant?: "outline" | "violet" | "cyan" | "amber" | "emerald" | "rose";
}) {
  const palette = {
    outline: "border-white/15 bg-white/[0.04] text-white/65",
    violet: "border-violet-400/30 bg-violet-500/[0.10] text-violet-200",
    cyan: "border-cyan-400/30 bg-cyan-500/[0.10] text-cyan-200",
    amber: "border-amber-400/30 bg-amber-500/[0.10] text-amber-200",
    emerald: "border-emerald-400/30 bg-emerald-500/[0.10] text-emerald-200",
    rose: "border-rose-400/30 bg-rose-500/[0.10] text-rose-200",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${palette}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Quick link row                                                     */
/* ------------------------------------------------------------------ */

export function DetailLinkRow({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/20 hover:bg-white/[0.06]"
    >
      <span className="flex items-center gap-2 text-[12.5px] text-white/75">
        {Icon ? (
          <Icon className="h-3.5 w-3.5 text-white/40 transition group-hover:text-white/70" />
        ) : null}
        {children}
      </span>
      <span className="font-mono text-[11px] text-white/35 transition group-hover:text-white/65">
        →
      </span>
    </Link>
  );
}
