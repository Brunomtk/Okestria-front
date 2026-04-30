"use client";

/**
 * v139 — Orkestria visual identity, single source of truth.
 *
 * The mark is "Cortex Cluster": one violet core node + six satellites
 * arranged in a hexagonal lattice, connected by gradient spokes. The
 * top satellite is amber (the "lead voice"); the others alternate
 * cyan/violet. Rationale: the mark literally pictures the knowledge
 * graph that powers the product (the Cortex view), so the brand and
 * the feature reinforce each other every time you look at either.
 *
 * Three shapes are exposed:
 *   - <OrkestriaMark />                  — symbol only, square
 *   - <OrkestriaLogo layout="horizontal"/> — mark + wordmark side by side
 *   - <OrkestriaLogo layout="stacked" />   — mark above wordmark
 *
 * Optional `animated` toggles a slow rotation of the satellite ring
 * + a soft breathe on the core. Use it on the loading screen and the
 * landing hero, never inside dense data UI.
 *
 * All gradients use unique IDs derived from a passed-in `idScope` so
 * multiple instances on the same page don't collide.
 */

import { useId } from "react";

type Size = number | string;

const PALETTE = {
  cyan: "#22d3ee",
  violet: "#a78bfa",
  amber: "#f59e0b",
  amberSoft: "#fffbe6",
  ink: "#ffffff",
} as const;

// ── Mark (symbol only) ───────────────────────────────────────────────

export function OrkestriaMark({
  size = 40,
  animated = false,
  className,
  ariaLabel = "Orkestria",
}: {
  size?: Size;
  animated?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  // Stable per-instance gradient ids — useId is hydration-safe.
  const scope = useId().replace(/:/g, "");
  const ids = {
    grad: `om-${scope}-grad`,
    link: `om-${scope}-link`,
    amber: `om-${scope}-amber`,
    violetGlow: `om-${scope}-violet`,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={ids.grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={PALETTE.cyan} />
          <stop offset="100%" stopColor={PALETTE.violet} />
        </linearGradient>
        <linearGradient id={ids.link} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={PALETTE.cyan} stopOpacity="0.55" />
          <stop offset="100%" stopColor={PALETTE.violet} stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={ids.amber} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={PALETTE.amber} stopOpacity="0.55" />
          <stop offset="60%" stopColor={PALETTE.amber} stopOpacity="0.1" />
          <stop offset="100%" stopColor={PALETTE.amber} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.violetGlow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={PALETTE.violet} stopOpacity="0.55" />
          <stop offset="60%" stopColor={PALETTE.violet} stopOpacity="0.12" />
          <stop offset="100%" stopColor={PALETTE.violet} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/*
        v142 — rotation now uses SVG-native <animateTransform> with
        an explicit pivot at (128, 128). The v141 version drove this
        via CSS `transform: rotate()` + `transform-box: fill-box`,
        which silently drifted on Safari and on certain compound
        transforms (the "satellites slowly leaving orbit" bug). The
        SVG path is rock-solid across browsers.
      */}
      <g>
        {animated ? (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 128 128"
            to="360 128 128"
            dur="32s"
            repeatCount="indefinite"
          />
        ) : null}

        <polygon
          points="128,48 197.28,88 197.28,168 128,208 58.72,168 58.72,88"
          fill="none"
          stroke={`url(#${ids.link})`}
          strokeWidth="1.6"
          strokeOpacity="0.45"
          strokeLinejoin="round"
        />
        {[
          [128, 48],
          [197.28, 88],
          [197.28, 168],
          [128, 208],
          [58.72, 168],
          [58.72, 88],
        ].map(([x, y], i) => (
          <line
            key={`spoke-${i}`}
            x1="128"
            y1="128"
            x2={x}
            y2={y}
            stroke={`url(#${ids.link})`}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        ))}
        <circle cx="128" cy="48" r="22" fill={`url(#${ids.amber})`} />
        <circle cx="197.28" cy="88" r="20" fill={`url(#${ids.violetGlow})`} />
        <circle cx="197.28" cy="168" r="20" fill={`url(#${ids.violetGlow})`} />
        <circle cx="128" cy="208" r="20" fill={`url(#${ids.violetGlow})`} />
        <circle cx="58.72" cy="168" r="20" fill={`url(#${ids.violetGlow})`} />
        <circle cx="58.72" cy="88" r="20" fill={`url(#${ids.violetGlow})`} />
        <circle cx="128" cy="48" r="10" fill={PALETTE.amber} />
        <circle cx="128" cy="48" r="4" fill={PALETTE.amberSoft} />
        <circle cx="197.28" cy="88" r="9" fill={PALETTE.cyan} />
        <circle cx="197.28" cy="168" r="9" fill={PALETTE.violet} />
        <circle cx="128" cy="208" r="9" fill={PALETTE.cyan} />
        <circle cx="58.72" cy="168" r="9" fill={PALETTE.violet} />
        <circle cx="58.72" cy="88" r="9" fill={PALETTE.cyan} />
      </g>

      {/*
        Core — gradient sphere + white inner. Breathes via translate
        → scale → translate so the scale pivots on (128, 128) without
        any CSS-transform-origin drift.
      */}
      <g transform="translate(128 128)">
        {animated ? (
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1; 1.07; 1"
            keyTimes="0; 0.5; 1"
            dur="3.6s"
            additive="sum"
            repeatCount="indefinite"
          />
        ) : null}
        <g transform="translate(-128 -128)">
          <circle cx="128" cy="128" r="14" fill={`url(#${ids.grad})`} />
          <circle cx="128" cy="128" r="6" fill={PALETTE.ink} />
        </g>
      </g>
    </svg>
  );
}

// ── Wordmark + lockups ───────────────────────────────────────────────

function OrkestriaWordmark({
  height = 28,
  className,
  monochrome = false,
}: {
  height?: number;
  className?: string;
  monochrome?: boolean;
}) {
  const scope = useId().replace(/:/g, "");
  const id = `ow-${scope}-grad`;
  return (
    <svg
      height={height}
      viewBox="0 0 480 96"
      role="img"
      aria-label="Orkestria"
      className={className}
      style={{ width: "auto" }}
    >
      <defs>
        {!monochrome ? (
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0%" stopColor={PALETTE.cyan} />
            <stop offset="100%" stopColor={PALETTE.violet} />
          </linearGradient>
        ) : null}
      </defs>
      <text
        x="0"
        y="68"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif"
        fontSize="64"
        fontWeight="700"
        letterSpacing="-2.4"
        fill={monochrome ? "currentColor" : `url(#${id})`}
      >
        Orkestria
      </text>
    </svg>
  );
}

export function OrkestriaLogo({
  size = 40,
  layout = "horizontal",
  animated = false,
  monochrome = false,
  className,
}: {
  /** Height of the mark in pixels. Wordmark is sized proportionally. */
  size?: number;
  layout?: "horizontal" | "stacked";
  animated?: boolean;
  monochrome?: boolean;
  className?: string;
}) {
  const wordmarkHeight = layout === "horizontal" ? size * 0.7 : size * 0.6;
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: layout === "horizontal" ? "row" : "column",
        alignItems: "center",
        gap: layout === "horizontal" ? size * 0.32 : size * 0.22,
      }}
    >
      <OrkestriaMark size={size} animated={animated} />
      <OrkestriaWordmark height={wordmarkHeight} monochrome={monochrome} />
    </div>
  );
}
