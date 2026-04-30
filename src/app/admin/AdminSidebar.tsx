"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { OrkestriaMark } from "@/components/OrkestriaMark";
import {
  Building2,
  Users,
  Bot,
  Layers,
  UsersRound,
  Target,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    title: "Visao Geral",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Gestao",
    items: [
      { href: "/admin/companies", label: "Companies", icon: Building2 },
      { href: "/admin/users", label: "Usuarios", icon: Users },
      { href: "/admin/agents", label: "Agents", icon: Bot },
    ],
  },
  {
    title: "Operacional",
    items: [
      { href: "/admin/workspaces", label: "Workspaces", icon: Layers },
      { href: "/admin/squads", label: "Squads", icon: UsersRound },
      { href: "/admin/leads", label: "Leads", icon: Target },
    ],
  },
  {
    title: "Financeiro",
    items: [{ href: "/admin/billing", label: "Billing", icon: CreditCard }],
  },
];

export function AdminSidebar({ fullName, email }: { fullName?: string; email?: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <OrkestriaMark size={36} />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">Orkestria</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Admin Panel</span>
        </div>
      </div>

      <div className="border-b border-border px-6 py-4">
        <p className="text-xs text-muted-foreground">Sessao atual</p>
        <p className="mt-1 text-sm font-medium text-foreground">{fullName ?? "Administrador"}</p>
        <p className="text-xs text-muted-foreground">{email ?? ""}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <h3 className="mb-2 px-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{group.title}</h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                      {item.label}
                      {active ? <ChevronRight className="ml-auto h-4 w-4 text-primary" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Link href="/admin/settings" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground">
          <Settings className="h-4 w-4" />
          Configuracoes
        </Link>
        <Link href="/logout" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="h-4 w-4" />
          Sair
        </Link>
      </div>
    </aside>
  );
}
