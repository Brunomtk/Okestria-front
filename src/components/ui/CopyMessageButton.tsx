"use client";

/**
 * v163 — Tiny "copy this message" button used by chat / cron / task
 * bubbles. Mirrors the behavior the operator already has in office
 * panels: click → text → clipboard, swap to a check icon, revert to
 * the copy icon after ~1.5s. Ships its own tiny aria-live region so
 * screen readers also know the message landed.
 *
 * Variants:
 *   • "ghost"  — minimal icon-only chip that blends with bubble headers
 *                (used in the chat user / assistant bubble strips).
 *   • "subtle" — same icon-only button but rendered as a floating chip
 *                in the top-right of admin chat bubbles.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

type Variant = "ghost" | "subtle";

const RESET_AFTER_MS = 1_500;

const VARIANT_CLASS: Record<Variant, string> = {
  ghost:
    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition hover:bg-white/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300/60 disabled:opacity-40",
  subtle:
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/30 text-white/65 backdrop-blur-sm transition hover:border-white/20 hover:bg-black/50 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300/60 disabled:opacity-40",
};

const ICON_SIZE_CLASS: Record<Variant, string> = {
  ghost: "h-3.5 w-3.5",
  subtle: "h-3.5 w-3.5",
};

async function writeTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to legacy path */
    }
  }
  if (typeof document === "undefined") return false;
  // Legacy fallback for non-secure contexts (older Safari, http://, etc).
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function CopyMessageButton({
  text,
  variant = "ghost",
  label = "Copy message",
  className,
}: {
  text: string;
  variant?: Variant;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const trimmed = (text ?? "").trim();
    if (!trimmed) {
      setState("error");
      timerRef.current = setTimeout(() => setState("idle"), RESET_AFTER_MS);
      return;
    }
    const ok = await writeTextToClipboard(trimmed);
    setState(ok ? "copied" : "error");
    timerRef.current = setTimeout(() => setState("idle"), RESET_AFTER_MS);
  }, [text]);

  const Icon = state === "copied" ? Check : Copy;
  const ariaLabel =
    state === "copied"
      ? "Copied to clipboard"
      : state === "error"
        ? "Could not copy message"
        : label;

  return (
    <button
      type="button"
      onClick={() => {
        void handleClick();
      }}
      title={ariaLabel}
      aria-label={ariaLabel}
      data-state={state}
      className={`${VARIANT_CLASS[variant]}${className ? ` ${className}` : ""}`}
    >
      <Icon
        className={`${ICON_SIZE_CLASS[variant]} ${
          state === "copied" ? "text-emerald-300" : ""
        }`}
        aria-hidden="true"
      />
      <span className="sr-only">{ariaLabel}</span>
    </button>
  );
}
