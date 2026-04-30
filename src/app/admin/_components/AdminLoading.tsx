/**
 * v152 — Admin · cosmic loading skeleton.
 *
 * Reused by every admin route's `loading.tsx`. Renders a calm
 * cosmic-styled placeholder shaped like the page that's about to
 * appear (eyebrow + title + subtitle + a few stat-card-shaped
 * blocks + a large card-shaped block). Pure server component —
 * pure JSX, no client JS.
 *
 * Usage in any admin segment:
 *   // app/admin/<segment>/loading.tsx
 *   import { AdminLoading } from "../_components/AdminLoading";
 *   export default function Loading() {
 *     return <AdminLoading title="Companies" eyebrow="Tenants" />;
 *   }
 */

export type AdminLoadingProps = {
  /** Tiny mono kicker over the title (matches PageHeader.eyebrow). */
  eyebrow?: string;
  /** Page title placeholder. */
  title?: string;
  /** Subtitle line under the title. */
  subtitle?: string;
  /** How many stat-card-shaped blocks to draw. */
  stats?: number;
  /** How many wide section-shaped blocks to draw. */
  sections?: number;
};

export function AdminLoading({
  eyebrow = "Loading",
  title = "Loading…",
  subtitle = "Pulling fresh data from the back.",
  stats = 4,
  sections = 1,
}: AdminLoadingProps) {
  return (
    <div className="relative space-y-8" aria-busy="true">
      {/* Header */}
      <header>
        {eyebrow ? (
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-violet-300/65">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 inline-flex items-center gap-3">
          <span className="bg-gradient-to-r from-white via-violet-100 to-cyan-100 bg-clip-text text-[26px] font-semibold tracking-tight text-transparent">
            {title}
          </span>
          <CosmicSpinner />
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/55">
            {subtitle}
          </p>
        ) : null}
      </header>

      {/* Stat cards skeleton */}
      {stats > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: stats }).map((_, i) => (
            <StatSkeleton key={i} delayMs={i * 80} />
          ))}
        </div>
      ) : null}

      {/* Section skeletons */}
      {Array.from({ length: sections }).map((_, i) => (
        <SectionSkeleton key={i} delayMs={120 + i * 100} />
      ))}
    </div>
  );
}

/* ── Atoms ─────────────────────────────────────────────────────── */

function CosmicSpinner() {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center"
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 90deg, rgba(167,139,250,0.85) 0deg, rgba(34,211,238,0.0) 220deg, rgba(34,211,238,0.85) 320deg, rgba(167,139,250,0.85) 360deg)",
          maskImage:
            "radial-gradient(circle, transparent 6px, black 7px, black 11px, transparent 12px)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 6px, black 7px, black 11px, transparent 12px)",
          animation: "spin 0.95s linear infinite",
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: "@keyframes spin{to{transform:rotate(360deg)}}",
        }}
      />
    </span>
  );
}

function Shimmer({
  className = "",
  delayMs = 0,
}: {
  className?: string;
  delayMs?: number;
}) {
  return (
    <span
      aria-hidden
      className={`relative block overflow-hidden rounded-md bg-white/[0.04] ${className}`}
    >
      <span
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 40%, rgba(167,139,250,0.10) 50%, rgba(255,255,255,0.07) 60%, transparent 100%)",
          animation: "adminShimmer 1.6s ease-in-out infinite",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@keyframes adminShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}",
        }}
      />
    </span>
  );
}

function StatSkeleton({ delayMs }: { delayMs: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.6)] p-5 backdrop-blur-md"
      style={{ boxShadow: "0 18px 50px rgba(0,0,0,0.35)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.45) 50%, transparent 100%)",
        }}
      />
      <div className="flex items-start justify-between">
        <Shimmer className="h-10 w-10 rounded-xl" delayMs={delayMs} />
        <Shimmer className="h-4 w-12 rounded-full" delayMs={delayMs + 80} />
      </div>
      <div className="mt-5 space-y-2">
        <Shimmer className="h-7 w-24" delayMs={delayMs + 40} />
        <Shimmer className="h-3 w-16" delayMs={delayMs + 100} />
      </div>
    </div>
  );
}

function SectionSkeleton({ delayMs }: { delayMs: number }) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.6)] backdrop-blur-md"
      style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.55) 50%, transparent 100%)",
        }}
      />
      <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-3.5">
        <div className="space-y-1.5">
          <Shimmer className="h-3.5 w-32" delayMs={delayMs} />
          <Shimmer className="h-2.5 w-20" delayMs={delayMs + 40} />
        </div>
        <Shimmer className="h-3 w-16 rounded-full" delayMs={delayMs + 80} />
      </div>
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Shimmer
              className="h-8 w-8 rounded-lg"
              delayMs={delayMs + i * 40}
            />
            <div className="flex-1 space-y-1.5">
              <Shimmer
                className="h-3 w-2/5"
                delayMs={delayMs + 40 + i * 40}
              />
              <Shimmer
                className="h-2.5 w-1/4"
                delayMs={delayMs + 80 + i * 40}
              />
            </div>
            <Shimmer
              className="h-3 w-16 rounded-full"
              delayMs={delayMs + 120 + i * 40}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
