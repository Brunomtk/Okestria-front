"use client";

/**
 * v143 — Admin sidebar redesigned to match the rest of the brand.
 *
 *   • Glass-morphism dark surface with a subtle violet glow under
 *     the brand mark, mirroring the OrkestriaLoader / Cortex modal
 *     visual language.
 *   • Active navigation items get a colored accent stripe + glow
 *     pill on the left edge — same idiom we use on the operator
 *     toolbar buttons.
 *   • Copy is fully English (the previous version mixed PT/EN).
 *   • Adds new sections: Activity log, System health, Gateway,
 *     Database, Integrations — so the admin really does cover the
 *     whole system instead of just CRUD over the core tables.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrkestriaMark } from "@/components/OrkestriaMark";
import {
  Activity,
  Bot,
  Brain,
  Building2,
  CreditCard,
  Database,
  History,
  Layers,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MessageSquare,
  Network,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind text-* token used for the icon when this item is active. */
  accent?: string;
  /** When true, only highlight on EXACT path match (used for the
      dashboard root so /admin/anything-else doesn't keep it lit). */
  exact?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, accent: "text-violet-300", exact: true },
      { href: "/admin/activity", label: "Activity log", icon: History, accent: "text-cyan-300" },
      { href: "/admin/health", label: "System health", icon: ShieldCheck, accent: "text-emerald-300" },
    ],
  },
  {
    title: "Tenants",
    items: [
      { href: "/admin/companies", label: "Companies", icon: Building2, accent: "text-violet-300" },
      { href: "/admin/users", label: "Users", icon: Users, accent: "text-cyan-300" },
      { href: "/admin/workspaces", label: "Workspaces", icon: Layers, accent: "text-emerald-300" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/agents", label: "Agents", icon: Bot, accent: "text-violet-300" },
      { href: "/admin/squads", label: "Squads", icon: UsersRound, accent: "text-cyan-300" },
      { href: "/admin/chats", label: "Chats", icon: MessageSquare, accent: "text-violet-300" },
      { href: "/admin/tasks", label: "Tasks", icon: ListTodo, accent: "text-cyan-300" },
      { href: "/admin/cron", label: "Cron jobs", icon: Timer, accent: "text-amber-300" },
      { href: "/admin/cortex", label: "Cortex", icon: Brain, accent: "text-cyan-300" },
    ],
  },
  {
    title: "Pipeline",
    items: [
      { href: "/admin/leads", label: "Leads", icon: Target, accent: "text-amber-300" },
      { href: "/admin/missions", label: "Missions", icon: Sparkles, accent: "text-emerald-300" },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      { href: "/admin/gateway", label: "Gateway", icon: Network, accent: "text-cyan-300" },
      { href: "/admin/database", label: "Database", icon: Database, accent: "text-violet-300" },
      { href: "/admin/integrations", label: "Integrations", icon: Activity, accent: "text-amber-300" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/admin/billing", label: "Billing", icon: CreditCard, accent: "text-amber-300" },
    ],
  },
];

export function AdminSidebar({
  fullName,
  email,
}: {
  fullName?: string;
  email?: string;
}) {
  const pathname = usePathname() ?? "/admin";

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col overflow-hidden border-r border-white/8 backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(180deg, rgba(15,18,30,0.92) 0%, rgba(8,11,20,0.96) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Top accent hairline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.55) 50%, transparent 100%)",
        }}
      />

      {/* Brand */}
      <div className="relative flex h-16 items-center gap-3 border-b border-white/8 px-5">
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -m-1.5 rounded-full"
            style={{
              background:
                "radial-gradient(circle at center, rgba(167,139,250,0.32) 0%, rgba(167,139,250,0) 65%)",
            }}
          />
          <OrkestriaMark size={32} animated />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-[14.5px] font-semibold tracking-tight text-transparent">
            Orkestria
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-violet-300/65">
            admin · by ptx
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-4 [scrollbar-color:rgba(255,255,255,0.18)_transparent]">
        {NAV.map((group) => (
          <div key={group.title} className="mb-5">
            <h3 className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
              {group.title}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const accent = item.accent ?? "text-white/80";
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                        active
                          ? "bg-white/[0.05] text-white"
                          : "text-white/55 hover:bg-white/[0.03] hover:text-white",
                      )}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r"
                          style={{
                            background:
                              "linear-gradient(180deg, #22d3ee 0%, #a78bfa 100%)",
                            boxShadow: "0 0 12px rgba(167,139,250,0.6)",
                          }}
                        />
                      ) : null}
                      <item.icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          active ? accent : "text-white/45 group-hover:text-white/85",
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account card + actions */}
      <div className="border-t border-white/8 px-3 py-3">
        <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-violet-300/65">
            Signed in
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-white/90">
            {fullName ?? "Administrator"}
          </p>
          {email ? (
            <p className="truncate font-mono text-[10.5px] text-white/40">
              {email}
            </p>
          ) : null}
        </div>
        <Link
          href="/admin/settings"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium text-white/55 transition hover:bg-white/[0.05] hover:text-white"
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
        <Link
          href="/logout"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium text-white/55 transition hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Link>
      </div>
    </aside>
  );
}
