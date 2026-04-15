"use client";

import { type ReactNode, useState, useEffect, useCallback } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  Globe,
  Loader2,
  LogOut,
  Mail,
  MessageSquareText,
  Mic2,
  Package,
  Phone,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  UserRound,
  X,
} from "lucide-react";
import {
  fetchCompanyEmailContext,
  updateCompanyEmailContext,
  type OkestriaCompanyEmailContext,
} from "@/lib/auth/api";
import { getBrowserAccessToken } from "@/lib/agents/backend-api";

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

type TabId = "profile" | "email-context";

type CompanyProfileModalProps = {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  companyName?: string | null;
  workspaceName?: string | null;
  companyId?: number | null;
};

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

const getInitials = (name?: string | null) => {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "CU";
  const parts = trimmed.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "CU";
};

/* ═══════════════════════════════════════════════════════════════════════
   MAIN MODAL
   ═══════════════════════════════════════════════════════════════════════ */

export function CompanyProfileModal({
  open,
  onClose,
  onLogout,
  fullName,
  email,
  role,
  companyName,
  workspaceName,
  companyId,
}: CompanyProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  // Reset tab when modal opens
  useEffect(() => {
    if (open) setActiveTab("profile");
  }, [open]);

  if (!open) return null;

  const displayName = fullName?.trim() || "Company User";
  const displayEmail = email?.trim() || "No email connected";
  const displayRole = role?.trim() || "Company member";
  const displayCompany = companyName?.trim() || "Your company";
  const displayWorkspace = workspaceName?.trim() || "Main workspace";
  const initials = getInitials(displayName);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-5"
      onClick={onClose}
    >
      <section
        className="relative flex max-h-[min(92vh,900px)] w-full max-w-[960px] flex-col overflow-hidden rounded-[28px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(50,125,150,0.18),rgba(8,12,18,0.98)_42%,rgba(4,7,12,1)_100%)] shadow-[0_40px_120px_rgba(0,0,0,0.68)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ── Gradient overlays ─────────────────────────────────── */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),transparent_30%,transparent_68%,rgba(245,158,11,0.08))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent" />

        {/* ── Header ────────────────────────────────────────────── */}
        <header className="relative flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-cyan-200/72">
              Company profile
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
              {activeTab === "profile" ? "Profile" : "Email Context"}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-300/70">
              {activeTab === "profile"
                ? "A clean overview of your account, workspace access, and company session."
                : "Define the default context sent to AI when generating outreach emails for your leads."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-red-400/24 bg-red-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-100 transition hover:border-red-300/42 hover:bg-red-500/16"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/72 transition hover:border-white/20 hover:text-white"
              aria-label="Close profile"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="relative shrink-0 border-b border-white/8 px-4 sm:px-6">
          <div className="flex gap-1 py-2">
            <TabButton
              active={activeTab === "profile"}
              icon={<UserRound className="h-3.5 w-3.5" />}
              label="Profile"
              onClick={() => setActiveTab("profile")}
            />
            <TabButton
              active={activeTab === "email-context"}
              icon={<MessageSquareText className="h-3.5 w-3.5" />}
              label="Email Context"
              onClick={() => setActiveTab("email-context")}
            />
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────── */}
        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {activeTab === "profile" ? (
            <ProfileTabContent
              displayName={displayName}
              displayEmail={displayEmail}
              displayRole={displayRole}
              displayCompany={displayCompany}
              displayWorkspace={displayWorkspace}
              initials={initials}
              onLogout={onLogout}
            />
          ) : (
            <EmailContextTabContent companyId={companyId} />
          )}
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB BUTTON
   ═══════════════════════════════════════════════════════════════════════ */

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/30"
          : "text-white/50 hover:bg-white/5 hover:text-white/75"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PROFILE TAB (original content)
   ═══════════════════════════════════════════════════════════════════════ */

function ProfileTabContent({
  displayName,
  displayEmail,
  displayRole,
  displayCompany,
  displayWorkspace,
  initials,
  onLogout,
}: {
  displayName: string;
  displayEmail: string;
  displayRole: string;
  displayCompany: string;
  displayWorkspace: string;
  initials: string;
  onLogout: () => void;
}) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.18fr_0.82fr] lg:gap-5">
      {/* Left column */}
      <div className="overflow-hidden rounded-[24px] border border-cyan-300/16 bg-[linear-gradient(160deg,rgba(16,27,40,0.94),rgba(5,10,16,0.92))] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border border-cyan-300/24 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.34),rgba(8,18,28,0.92)_72%)] shadow-[0_0_0_1px_rgba(255,255,255,0.04)] sm:h-24 sm:w-24">
            <span className="text-xl font-semibold tracking-[0.18em] text-white sm:text-2xl">
              {initials}
            </span>
            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-500/16 text-emerald-100">
              <BadgeCheck className="h-4 w-4" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-400/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/88">
              <Sparkles className="h-3.5 w-3.5" />
              Active session
            </div>
            <h3 className="mt-4 truncate text-2xl font-semibold text-white sm:text-3xl">
              {displayName}
            </h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-300/78">
              <Mail className="h-4 w-4 shrink-0 text-cyan-200/72" />
              <span className="truncate">{displayEmail}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ProfileStatCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Role"
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
            Workspace
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-100">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold text-white">
                {displayWorkspace}
              </div>
              <div className="mt-1 text-sm text-slate-300/68">
                Your current workspace is connected to the active company context.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-4">
        <InfoPanel
          title="Account overview"
          items={[
            { label: "User", value: displayName, icon: <UserRound className="h-4 w-4" /> },
            { label: "Email", value: displayEmail, icon: <Mail className="h-4 w-4" /> },
            { label: "Access", value: displayRole, icon: <ShieldCheck className="h-4 w-4" /> },
          ]}
        />

        <InfoPanel
          title="Company access"
          items={[
            { label: "Company", value: displayCompany, icon: <Building2 className="h-4 w-4" /> },
            { label: "Workspace", value: displayWorkspace, icon: <BriefcaseBusiness className="h-4 w-4" /> },
          ]}
        />

        <div className="rounded-[24px] border border-amber-300/18 bg-amber-400/8 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-100/70">
            Quick action
          </div>
          <p className="mt-3 text-sm leading-6 text-amber-50/82">
            Need to end this session? Use the button below for a safe logout.
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/24 bg-red-500/12 px-4 py-3 text-sm font-semibold text-red-50 transition hover:border-red-300/44 hover:bg-red-500/18"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EMAIL CONTEXT TAB
   ═══════════════════════════════════════════════════════════════════════ */

const EMPTY_CONTEXT: OkestriaCompanyEmailContext = {
  description: "",
  products: "",
  tone: "",
  website: "",
  phone: "",
  extraNotes: "",
};

function EmailContextTabContent({ companyId }: { companyId?: number | null }) {
  const [form, setForm] = useState<OkestriaCompanyEmailContext>({ ...EMPTY_CONTEXT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing context on mount
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = getBrowserAccessToken();
        if (!token) throw new Error("No auth token");
        const ctx = await fetchCompanyEmailContext(companyId, token);
        if (!cancelled) {
          setForm({
            description: ctx.description ?? "",
            products: ctx.products ?? "",
            tone: ctx.tone ?? "",
            website: ctx.website ?? "",
            phone: ctx.phone ?? "",
            extraNotes: ctx.extraNotes ?? "",
          });
        }
      } catch {
        // If 404 or empty, that's fine — fields stay empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const handleSave = useCallback(async () => {
    if (!companyId) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const token = getBrowserAccessToken();
      if (!token) throw new Error("No auth token");
      await updateCompanyEmailContext(companyId, form, token);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [companyId, form]);

  const updateField = (key: keyof OkestriaCompanyEmailContext, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-white/40">
        No company connected to configure email context.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-300/60" />
        <span className="text-sm text-white/50">Loading email context…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="rounded-[20px] border border-cyan-300/12 bg-cyan-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-cyan-50/90">
              Default email generation context
            </div>
            <div className="mt-1 text-[13px] leading-relaxed text-white/50">
              These fields are automatically sent to the AI when generating outreach emails.
              You can still override them per-send through the email modal before sending.
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left column — main fields */}
        <div className="space-y-4">
          <ContextField
            icon={<Building2 className="h-4 w-4" />}
            label="Company Description"
            placeholder="Brief description of what your company does, your mission, and unique value proposition…"
            value={form.description ?? ""}
            onChange={(v) => updateField("description", v)}
            multiline
            rows={4}
          />

          <ContextField
            icon={<Package className="h-4 w-4" />}
            label="Products & Services"
            placeholder="List your main products or services. Be specific — the AI will reference these in emails…"
            value={form.products ?? ""}
            onChange={(v) => updateField("products", v)}
            multiline
            rows={4}
          />

          <ContextField
            icon={<Mic2 className="h-4 w-4" />}
            label="Email Tone & Style"
            placeholder="e.g. Warm and professional, Direct and consultative, Friendly but authoritative…"
            value={form.tone ?? ""}
            onChange={(v) => updateField("tone", v)}
          />
        </div>

        {/* Right column — secondary fields + preview */}
        <div className="space-y-4">
          <ContextField
            icon={<Globe className="h-4 w-4" />}
            label="Website"
            placeholder="https://yourcompany.com"
            value={form.website ?? ""}
            onChange={(v) => updateField("website", v)}
          />

          <ContextField
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            placeholder="+1 (555) 000-0000"
            value={form.phone ?? ""}
            onChange={(v) => updateField("phone", v)}
          />

          <ContextField
            icon={<StickyNote className="h-4 w-4" />}
            label="Extra Instructions"
            placeholder="Any additional instructions for the AI when writing emails. E.g. 'Always mention our free trial', 'Never compare to competitors', 'Include Spanish greeting'…"
            value={form.extraNotes ?? ""}
            onChange={(v) => updateField("extraNotes", v)}
            multiline
            rows={5}
          />

          {/* Context preview card */}
          <ContextPreviewCard form={form} />
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between gap-4 rounded-[20px] border border-white/8 bg-white/[0.03] px-5 py-4">
        <div className="text-sm text-white/45">
          {error ? (
            <span className="text-red-300">{error}</span>
          ) : saved ? (
            <span className="flex items-center gap-2 text-emerald-300">
              <Check className="h-4 w-4" />
              Context saved successfully
            </span>
          ) : (
            "Changes will be used as defaults for all new email generations."
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/28 bg-cyan-500/14 px-5 py-2.5 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/42 hover:bg-cyan-500/22 disabled:pointer-events-none disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving…" : "Save Context"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CONTEXT FIELD (reusable input/textarea)
   ═══════════════════════════════════════════════════════════════════════ */

function ContextField({
  icon,
  label,
  placeholder,
  value,
  onChange,
  multiline = false,
  rows = 3,
}: {
  icon: ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  const inputClasses =
    "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20";

  return (
    <label className="block">
      <span className="flex items-center gap-2">
        <span className="text-cyan-200/60">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
          {label}
        </span>
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${inputClasses} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CONTEXT PREVIEW CARD
   ═══════════════════════════════════════════════════════════════════════ */

function ContextPreviewCard({ form }: { form: OkestriaCompanyEmailContext }) {
  const filledCount = [
    form.description,
    form.products,
    form.tone,
    form.website,
    form.phone,
    form.extraNotes,
  ].filter((v) => v && v.trim().length > 0).length;

  const completionPercent = Math.round((filledCount / 6) * 100);

  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.02] p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
        Context completeness
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${completionPercent}%`,
            background:
              completionPercent === 100
                ? "linear-gradient(90deg, #34d399, #22d3ee)"
                : completionPercent >= 50
                  ? "linear-gradient(90deg, #22d3ee, #38bdf8)"
                  : "linear-gradient(90deg, #f59e0b, #fbbf24)",
          }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-white/40">
          {filledCount} of 6 fields configured
        </span>
        <span
          className={`text-xs font-semibold ${
            completionPercent === 100
              ? "text-emerald-300"
              : completionPercent >= 50
                ? "text-cyan-300"
                : "text-amber-300"
          }`}
        >
          {completionPercent}%
        </span>
      </div>

      {/* Field status pills */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusPill filled={!!form.description?.trim()} label="Description" />
        <StatusPill filled={!!form.products?.trim()} label="Products" />
        <StatusPill filled={!!form.tone?.trim()} label="Tone" />
        <StatusPill filled={!!form.website?.trim()} label="Website" />
        <StatusPill filled={!!form.phone?.trim()} label="Phone" />
        <StatusPill filled={!!form.extraNotes?.trim()} label="Extra" />
      </div>
    </div>
  );
}

function StatusPill({ filled, label }: { filled: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        filled
          ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
          : "border border-white/8 bg-white/[0.03] text-white/30"
      }`}
    >
      {filled ? <Check className="h-2.5 w-2.5" /> : <span className="h-2.5 w-2.5 rounded-full border border-white/15" />}
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SHARED SUBCOMPONENTS (same as before)
   ═══════════════════════════════════════════════════════════════════════ */

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
      <div className="mt-3 break-words text-base font-semibold text-white">{value}</div>
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
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-100/82">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                {item.label}
              </div>
              <div className="mt-1 break-words text-sm font-medium text-white/92">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
