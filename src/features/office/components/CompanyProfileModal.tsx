"use client";

import type { ReactNode } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

const getInitials = (name?: string | null) => {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "CO";
  const parts = trimmed.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "CO";
};

type CompanyProfileModalProps = {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  companyName?: string | null;
  workspaceName?: string | null;
};

export function CompanyProfileModal({
  open,
  onClose,
  onLogout,
  fullName,
  email,
  role,
  companyName,
  workspaceName,
}: CompanyProfileModalProps) {
  if (!open) return null;

  const displayName = fullName?.trim() || "Company User";
  const displayEmail = email?.trim() || "No email linked";
  const displayRole = role?.trim() || "company";
  const displayCompany = companyName?.trim() || "Sua company";
  const displayWorkspace = workspaceName?.trim() || "Workspace operacional";
  const initials = getInitials(displayName);

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[130] flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="relative w-full max-w-3xl overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(48,120,145,0.18),rgba(7,12,20,0.96)_42%,rgba(4,7,12,0.98)_100%)] shadow-[0_36px_120px_rgba(0,0,0,0.68)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),transparent_28%,transparent_72%,rgba(245,158,11,0.08))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent" />

        <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-cyan-200/72">
              Company profile
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Perfil do usuário</h2>
            <p className="mt-1 text-sm text-slate-300/72">
              Sessão, company e acesso organizados no padrão do office.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-red-400/24 bg-red-500/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-100 transition hover:border-red-300/42 hover:bg-red-500/16"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/72 transition hover:border-white/20 hover:text-white"
              aria-label="Fechar perfil"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative grid gap-6 px-6 py-6 md:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-[24px] border border-cyan-300/16 bg-[linear-gradient(160deg,rgba(16,27,40,0.94),rgba(5,10,16,0.92))] p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-[26px] border border-cyan-300/24 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.34),rgba(8,18,28,0.92)_72%)] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                <span className="text-2xl font-semibold tracking-[0.18em] text-white">{initials}</span>
                <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-500/16 text-emerald-100">
                  <BadgeCheck className="h-4 w-4" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-400/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/88">
                  <Sparkles className="h-3.5 w-3.5" />
                  Active company session
                </div>
                <h3 className="mt-4 truncate text-3xl font-semibold text-white">{displayName}</h3>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-300/78">
                  <Mail className="h-4 w-4 text-cyan-200/72" />
                  <span className="truncate">{displayEmail}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ProfileStatCard
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Perfil"
                value={displayRole}
                tone="cyan"
              />
              <ProfileStatCard
                icon={<Building2 className="h-4 w-4" />}
                label="Company"
                value={displayCompany}
                tone="amber"
              />
            </div>

            <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">
                Workspace atual
              </div>
              <div className="mt-3 flex items-start gap-3">
                <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-100">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-white">{displayWorkspace}</div>
                  <div className="mt-1 text-sm text-slate-300/68">
                    Acesso alinhado à sua company com contexto do office ativo.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <InfoPanel
              title="Resumo da sessão"
              items={[
                { label: "Usuário", value: displayName, icon: <UserRound className="h-4 w-4" /> },
                { label: "Email", value: displayEmail, icon: <Mail className="h-4 w-4" /> },
                { label: "Acesso", value: displayRole, icon: <ShieldCheck className="h-4 w-4" /> },
              ]}
            />

            <InfoPanel
              title="Estrutura da company"
              items={[
                { label: "Company", value: displayCompany, icon: <Building2 className="h-4 w-4" /> },
                { label: "Workspace", value: displayWorkspace, icon: <BriefcaseBusiness className="h-4 w-4" /> },
              ]}
            />

            <div className="rounded-[24px] border border-amber-300/18 bg-amber-400/8 p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-100/70">
                Quick actions
              </div>
              <p className="mt-3 text-sm leading-6 text-amber-50/82">
                Use este painel para conferir rapidamente quem está logado, qual company está ativa e encerrar a sessão com segurança.
              </p>
              <button
                type="button"
                onClick={onLogout}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/24 bg-red-500/12 px-4 py-3 text-sm font-semibold text-red-50 transition hover:border-red-300/44 hover:bg-red-500/18"
              >
                <LogOut className="h-4 w-4" />
                Encerrar sessão
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileStatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "cyan" | "amber";
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 ${
        tone === "cyan"
          ? "border-cyan-300/16 bg-cyan-400/7"
          : "border-amber-300/16 bg-amber-400/7"
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
        <span className={tone === "cyan" ? "text-cyan-100/78" : "text-amber-100/78"}>{icon}</span>
        {label}
      </div>
      <div className="mt-3 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

function InfoPanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string; icon: ReactNode }>;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">{title}</div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={`${title}-${item.label}`}
            className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/14 px-4 py-3"
          >
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-100/82">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">{item.label}</div>
              <div className="mt-1 break-words text-sm font-medium text-white/88">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
