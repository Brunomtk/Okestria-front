"use client";

/**
 * v165 — Two-tab switcher for /admin/cron.
 *
 *   • "Sistema (PTX)" — server-rendered admin cron table (passed in
 *     via the `ptxContent` prop, so we don't lose any of v146 work).
 *   • "Agentes (OpenClaw)" — new client tab that talks to the gateway
 *     via /api/admin/gateway-crons/* routes.
 *
 * Tab choice persists in localStorage so the operator's preference
 * survives navigation.
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Bot, Server } from "lucide-react";
import { GatewayCronTab } from "./GatewayCronTab";

type TabId = "ptx" | "gateway";

const STORAGE_KEY = "okestria.admin.cron.tab";

export function CronAdminTabs({
  ptxContent,
  ptxJobCount,
}: {
  ptxContent: ReactNode;
  ptxJobCount: number;
}) {
  const [tab, setTab] = useState<TabId>("ptx");

  // Hydrate tab pref from localStorage on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "gateway" || stored === "ptx") {
        setTab(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const select = (next: TabId) => {
    setTab(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.02] p-1">
        <TabButton
          active={tab === "ptx"}
          icon={Server}
          label="Sistema (PTX)"
          count={ptxJobCount}
          onClick={() => select("ptx")}
        />
        <TabButton
          active={tab === "gateway"}
          icon={Bot}
          label="Agentes (OpenClaw)"
          onClick={() => select("gateway")}
        />
      </div>

      {/* Render both, hide inactive — keeps PTX server tree mounted so */}
      {/* tab switching is instant and the gateway tab keeps its state.  */}
      <div hidden={tab !== "ptx"}>{ptxContent}</div>
      <div hidden={tab !== "gateway"}>
        <GatewayCronTab />
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: typeof Bot;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12.5px] font-medium transition ${
        active
          ? "bg-gradient-to-r from-cyan-500/35 to-violet-500/30 text-white shadow-[0_0_18px_rgba(34,211,238,0.25)]"
          : "text-white/65 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {typeof count === "number" ? (
        <span
          className={`ml-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
            active ? "bg-white/15 text-white" : "bg-white/[0.05] text-white/65"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
