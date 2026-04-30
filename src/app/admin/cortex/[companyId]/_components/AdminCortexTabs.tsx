"use client";

/**
 * v150 — Admin · Cortex tenant detail tabs.
 *
 * Two-tab switcher: the FILES list and the 3D GRAPH. Both tabs are
 * always mounted (so the heavy 3D canvas keeps its WebGL context
 * when toggling) — we just toggle visibility with CSS `hidden`.
 *
 * Both tabs render side-by-side on xl screens (≥1280px), and as a
 * tab toggle on smaller widths. That way the "duas abas mostrando
 * arquivos e visualização 3D" reads as both at once on a desktop
 * monitor and as a clean tab pair on a laptop.
 */

import { useState, type ReactNode } from "react";
import { Files, Network } from "lucide-react";

type Tab = "files" | "graph";

export function AdminCortexTabs({
  files,
  graph,
}: {
  files: ReactNode;
  graph: ReactNode;
}) {
  const [active, setActive] = useState<Tab>("files");

  return (
    <div className="space-y-4">
      {/* Mobile / laptop toggle (hidden ≥xl, both panels show side-by-side). */}
      <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1 xl:hidden">
        <TabButton
          icon={Files}
          label="Files"
          active={active === "files"}
          onClick={() => setActive("files")}
        />
        <TabButton
          icon={Network}
          label="3D graph"
          active={active === "graph"}
          onClick={() => setActive("graph")}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className={active === "files" ? "block" : "hidden xl:block"}>
          {files}
        </div>
        <div className={active === "graph" ? "block" : "hidden xl:block"}>
          {graph}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
        active
          ? "bg-gradient-to-r from-violet-500/30 to-cyan-500/25 text-white shadow-[0_0_12px_rgba(167,139,250,0.30)]"
          : "text-white/55 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
