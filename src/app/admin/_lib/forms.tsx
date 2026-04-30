/**
 * v145.2 — Admin form primitives, cosmic style.
 *
 * Server components (no "use client"): these are pure JSX
 * primitives. Form submission is handled by Next.js server
 * actions on the parent <form action={...}>; the inputs use
 * native browser behavior so no client JS is needed here. Keeping
 * this file server-rendered avoids the RSC serialization boundary
 * for any prop the consumer passes in.
 *
 *   <FormShell>     full-page wrapper with back-link + eyebrow + title
 *   <FormSection>   grouped fields card (uses AdminUI Section)
 *   <Field>         labelled input (text / number / email / etc.)
 *   <SelectField>   labelled native <select> with custom caret
 *   <TextareaField> labelled multiline input
 *   <ToggleField>   on/off switch row
 *   <FormActions>   Cancel + violet-gradient Submit button
 *
 * All inputs are dark glass (bg-black/35 + border-white/10) with a
 * violet focus ring to match the rest of the v144 admin look.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ChevronDown, Loader2, Save } from "lucide-react";
import { Section } from "../_components/AdminUI";

/* ------------------------------------------------------------------ */
/* Shell                                                              */
/* ------------------------------------------------------------------ */

export function FormShell({
  eyebrow,
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
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
        </div>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                            */
/* ------------------------------------------------------------------ */

export function FormSection({
  title,
  description,
  children,
  accent = "violet",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  accent?: "violet" | "cyan" | "amber" | "emerald";
}) {
  return (
    <Section title={title} subtitle={description} accent={accent}>
      <div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div>
    </Section>
  );
}

/** Single column variant for sections with one wide field (e.g. textarea). */
export function FormSectionStacked({
  title,
  description,
  children,
  accent = "violet",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  accent?: "violet" | "cyan" | "amber" | "emerald";
}) {
  return (
    <Section title={title} subtitle={description} accent={accent}>
      <div className="space-y-4 p-5">{children}</div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs                                                             */
/* ------------------------------------------------------------------ */

const inputCls =
  "block w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-[13.5px] text-white placeholder:text-white/30 transition focus:border-violet-400/55 focus:outline-none focus:ring-2 focus:ring-violet-400/20";

const labelCls =
  "block font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55";

const hintCls = "mt-1.5 text-[11.5px] leading-snug text-white/40";

export function Field({
  label,
  name,
  defaultValue = "",
  required = false,
  placeholder = "",
  type = "text",
  hint,
  span = 1,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
  type?: string;
  hint?: string;
  span?: 1 | 2;
}) {
  return (
    <label className={`space-y-2 block ${span === 2 ? "sm:col-span-2" : ""}`}>
      <span className={labelCls}>
        {label}
        {required ? <span className="ml-1 text-rose-300">*</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={inputCls}
      />
      {hint ? <p className={hintCls}>{hint}</p> : null}
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
  required = false,
  hint,
  span = 1,
  placeholder = "Select…",
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  options: { value: string | number; label: string }[];
  required?: boolean;
  hint?: string;
  span?: 1 | 2;
  placeholder?: string;
}) {
  return (
    <label className={`space-y-2 block ${span === 2 ? "sm:col-span-2" : ""}`}>
      <span className={labelCls}>
        {label}
        {required ? <span className="ml-1 text-rose-300">*</span> : null}
      </span>
      <div className="relative">
        <select
          name={name}
          required={required}
          defaultValue={String(defaultValue ?? "")}
          className={`${inputCls} appearance-none pr-9`}
        >
          <option value="" className="bg-[#0a0d18] text-white/70">
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={String(option.value)}
              className="bg-[#0a0d18] text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/45"
        />
      </div>
      {hint ? <p className={hintCls}>{hint}</p> : null}
    </label>
  );
}

export function TextareaField({
  label,
  name,
  defaultValue = "",
  placeholder = "",
  hint,
  rows = 4,
  span = 2,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  rows?: number;
  span?: 1 | 2;
}) {
  return (
    <label className={`space-y-2 block ${span === 2 ? "sm:col-span-2" : ""}`}>
      <span className={labelCls}>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className={`${inputCls} min-h-[6.5rem] resize-y`}
      />
      {hint ? <p className={hintCls}>{hint}</p> : null}
    </label>
  );
}

export function ToggleField({
  label,
  name,
  defaultChecked = false,
  description,
  span = 2,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  description?: string;
  span?: 1 | 2;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-white/10 bg-black/30 px-4 py-3 transition hover:border-white/20 ${
        span === 2 ? "sm:col-span-2" : ""
      }`}
    >
      <span>
        <span className="text-[13px] font-semibold text-white/85">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11.5px] leading-snug text-white/45">
            {description}
          </span>
        ) : null}
      </span>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-white/15 bg-white/5 transition peer-checked:border-violet-400/60 peer-checked:bg-violet-500/40"
        />
        <span
          aria-hidden
          className="absolute left-0.5 h-4 w-4 rounded-full bg-white/85 shadow-md transition peer-checked:translate-x-4"
        />
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Hidden field convenience                                           */
/* ------------------------------------------------------------------ */

export function HiddenField({
  name,
  value,
}: {
  name: string;
  value: string | number;
}) {
  return <input type="hidden" name={name} value={value} />;
}

/* ------------------------------------------------------------------ */
/* Actions row                                                        */
/* ------------------------------------------------------------------ */

export function FormActions({
  cancelHref,
  submitLabel = "Save changes",
  cancelLabel = "Cancel",
  pending = false,
  destructive,
}: {
  cancelHref: string;
  submitLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  destructive?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="min-w-0">{destructive}</div>
      <div className="flex items-center gap-2">
        <Link
          href={cancelHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[12.5px] font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          {cancelLabel}
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/45 bg-gradient-to-r from-violet-500/30 to-cyan-500/25 px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_0_18px_rgba(167,139,250,0.35)] transition hover:from-violet-500/45 hover:to-cyan-500/35 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DeleteAction removed in v145.2 — destructive actions now use the   */
/* client-only AdminDeleteButton from _components/AdminDeleteButton.  */
/* ------------------------------------------------------------------ */
