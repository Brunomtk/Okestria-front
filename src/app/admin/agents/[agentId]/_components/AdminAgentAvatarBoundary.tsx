"use client";

/**
 * v177 — Error boundary around AdminAgentAvatar's <Canvas>.
 *
 * THREE / react-three-fiber can throw at runtime in the wild — bad
 * shader compile, missing texture path on a mounted volume, GPU
 * driver hiccup, profile JSON the avatar normalizer didn't expect.
 * Without a boundary the whole `/admin/agents/[id]` server page
 * tree gets unmounted and the operator sees Okestria's generic
 * "Something went wrong while rendering this view." card.
 *
 * Catching it here means the rest of the agent detail (identity
 * section, files, profile prose, delete button) keeps working;
 * the avatar slot shows a quiet fallback with the agent's name
 * + a "report this" link to the operator.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Visible name shown inside the fallback card. */
  agentName?: string | null;
};

type State = { error: Error | null };

export class AdminAgentAvatarBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Console-only; we don't want a full toast cascade here.
    // The operator will see the visible fallback card.
    // eslint-disable-next-line no-console
    console.warn("[admin] AdminAgentAvatar render failed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/35 bg-amber-500/10 text-amber-200">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="text-[12.5px] text-white/70">
            3D avatar preview failed to render.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
            {this.props.agentName ?? "Agent"} · check the avatar profile JSON
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
