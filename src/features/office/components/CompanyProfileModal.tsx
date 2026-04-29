"use client";

import { type ReactNode, useState, useEffect, useCallback } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  Globe,
  ImageIcon,
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
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import {
  fetchCompanyEmailContext,
  fetchUserEmailContext,
  isOkestriaPayloadTooLargeError,
  updateCompanyEmailContext,
  updateUserEmailContext,
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
  /**
   * Authenticated user id — needed to read/write the per-user email
   * signature footer. The six text fields (description/products/tone/etc)
   * are still per-company; the footer banner image moved to the User row
   * in v21 so every teammate has their own.
   */
  userId?: number | null;
  /**
   * v115 — opens the himalaya per-user email config modal where the
   * authenticated user wires their personal mailbox (IMAP/SMTP/password).
   * Once configured, every agent in the user's company can read/send
   * email through that mailbox during squad task dispatch.
   */
  onOpenEmailConfig?: () => void;
  /**
   * v117 — opens the per-user Meta credentials modal (Instagram +
   * Facebook + WhatsApp Business). One access token unlocks all three.
   */
  onOpenMetaConfig?: () => void;
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
  userId,
  onOpenEmailConfig,
  onOpenMetaConfig,
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
              onOpenEmailConfig={onOpenEmailConfig}
              onOpenMetaConfig={onOpenMetaConfig}
            />
          ) : (
            <EmailContextTabContent companyId={companyId} userId={userId} />
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
  onOpenEmailConfig,
  onOpenMetaConfig,
}: {
  displayName: string;
  displayEmail: string;
  displayRole: string;
  displayCompany: string;
  displayWorkspace: string;
  initials: string;
  onLogout: () => void;
  onOpenEmailConfig?: () => void;
  onOpenMetaConfig?: () => void;
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

        {/* v115 — per-user email account configuration. Once set,
            every agent in this user's company can read/send email
            through this mailbox during squad task dispatch. */}
        {onOpenEmailConfig ? (
          <div className="rounded-[24px] border border-cyan-300/22 bg-cyan-400/8 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-100/70">
              Email account
            </div>
            <p className="mt-3 text-sm leading-6 text-cyan-50/85">
              Wire your IMAP/SMTP mailbox so agents can read your inbox and
              send replies on your behalf in <strong>squad tasks</strong>,{" "}
              <strong>cron jobs</strong> and <strong>chat</strong>. Password
              lives only on the gateway VPS — never in the database.
            </p>
            <button
              type="button"
              onClick={onOpenEmailConfig}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/55 hover:bg-cyan-500/25"
            >
              <Mail className="h-4 w-4" />
              Configure email
            </button>
          </div>
        ) : null}

        {/* v117 — Meta integration card. One access token, three platforms. */}
        {onOpenMetaConfig ? (
          <div className="rounded-[24px] border border-fuchsia-300/22 bg-fuchsia-400/8 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fuchsia-100/70">
              Social media (Meta)
            </div>
            <p className="mt-3 text-sm leading-6 text-fuchsia-50/85">
              Wire your Meta access token so agents can use{" "}
              <strong>Instagram</strong>, <strong>Facebook Pages</strong> and{" "}
              <strong>WhatsApp Business</strong> on your behalf — read posts,
              reply to comments, send messages, post content. Token lives only
              on the gateway VPS.
            </p>
            <button
              type="button"
              onClick={onOpenMetaConfig}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-fuchsia-400/35 bg-fuchsia-500/15 px-4 py-3 text-sm font-semibold text-fuchsia-50 transition hover:border-fuchsia-300/55 hover:bg-fuchsia-500/25"
            >
              <Sparkles className="h-4 w-4" />
              Configure Instagram, Facebook & WhatsApp
            </button>
          </div>
        ) : null}

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
  footerImageBase64: "",
};

// Hard cap on footer image size (data URL string length). Roughly ~1.5MB
// of raw bytes after base64 decoding. Anything bigger risks payload
// rejections and bloats the DB row unnecessarily.
// Cap the encoded data URL at ~1.2 MB, which decodes to roughly 900 KB of
// actual image bytes. This is slightly below the 1 MB body limit that the
// production nginx proxy enforces by default, so users get an in-page
// "too large" message *before* they hit the server and receive a 413.
const FOOTER_IMAGE_MAX_DATAURL_LENGTH = 1_200_000;

function EmailContextTabContent({
  companyId,
  userId,
}: {
  companyId?: number | null;
  userId?: number | null;
}) {
  // Form state holds the six per-company text fields + the per-user footer
  // image (split targets on save, merged here only for UI convenience).
  const [form, setForm] = useState<OkestriaCompanyEmailContext>({ ...EMPTY_CONTEXT });
  // Remember what the footer looked like when we loaded the page so we
  // can tell whether the user actually changed it (and skip the extra
  // PUT to /api/Users/{id}/email-context when they didn't).
  const [initialFooter, setInitialFooter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing context on mount. We hit two endpoints in parallel:
  // - /api/Companies/{id}/email-context → text fields (tone, products, ...)
  // - /api/Users/{id}/email-context     → per-user footer banner image
  // In v21 the footer column was moved from Company to User so each
  // teammate has their own signature; the two endpoints are the correct
  // shape even though both payloads end up merged into the same form.
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

        const companyCtxPromise = fetchCompanyEmailContext(companyId, token).catch(
          () => null,
        );
        const userCtxPromise = userId
          ? fetchUserEmailContext(userId, token).catch(() => null)
          : Promise.resolve(null);
        const [companyCtx, userCtx] = await Promise.all([
          companyCtxPromise,
          userCtxPromise,
        ]);

        if (!cancelled) {
          const nextFooter = userCtx?.footerImageBase64 ?? "";
          setForm({
            description: companyCtx?.description ?? "",
            products: companyCtx?.products ?? "",
            tone: companyCtx?.tone ?? "",
            website: companyCtx?.website ?? "",
            phone: companyCtx?.phone ?? "",
            extraNotes: companyCtx?.extraNotes ?? "",
            // The footer is held on the form for UI convenience but is
            // persisted to the User endpoint, not the Company one.
            footerImageBase64: nextFooter,
          });
          setInitialFooter(nextFooter);
        }
      } catch {
        // If 404 or empty, that's fine — fields stay empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, userId]);

  const handleSave = useCallback(async () => {
    if (!companyId) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const token = getBrowserAccessToken();
      if (!token) throw new Error("No auth token");

      // Split the payload: text fields go to the company endpoint,
      // the footer banner goes to the per-user endpoint (v21 and later).
      // Strip footerImageBase64 from the company payload so the backend
      // doesn't misinterpret it as a company-level field (the Company
      // endpoint no longer reads that column — sending it would be a
      // dead write).
      const companyPayload: OkestriaCompanyEmailContext = {
        description: form.description ?? "",
        products: form.products ?? "",
        tone: form.tone ?? "",
        website: form.website ?? "",
        phone: form.phone ?? "",
        extraNotes: form.extraNotes ?? "",
      };

      await updateCompanyEmailContext(companyId, companyPayload, token);

      // Only hit the user endpoint if (a) we know who we are and
      // (b) the footer actually changed. This keeps the request small
      // and avoids 413s when the user is only editing their tone.
      const nextFooter = form.footerImageBase64 ?? "";
      if (userId && nextFooter !== initialFooter) {
        await updateUserEmailContext(
          userId,
          { footerImageBase64: nextFooter },
          token,
        );

        // Round-trip verification — re-fetch the user's email context and
        // confirm the footer actually persisted. This catches the silent
        // "column doesn't exist / DB said OK but stored nothing" class of
        // bug (see the v23 backend fix, which repaired the table-name
        // mismatch on "User" vs "Users"). If the server is back to a
        // sane state the confirmed value matches what we just sent; if
        // not, we surface a clear warning instead of pretending it saved.
        try {
          const confirmed = await fetchUserEmailContext(userId, token);
          const persisted = (confirmed?.footerImageBase64 ?? "") as string;
          if (nextFooter.length > 0 && persisted.length === 0) {
            setError(
              "A imagem foi enviada, mas o servidor não persistiu o rodapé. Se isso continuar após o deploy do backend v23, avise o time — é sinal de que a coluna do banner ainda não existe na tabela de usuários.",
            );
            return;
          }
          setInitialFooter(persisted);
        } catch {
          // Verification is best-effort — don't block the UX if the
          // follow-up GET fails for an unrelated reason (e.g. token race).
          setInitialFooter(nextFooter);
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      // Translate "413 Content Too Large" from the backend / nginx into a
      // direct, human message pointing at the most common culprit (the
      // footer image). nginx returns an HTML error page, which is useless
      // to surface verbatim — so we detect the 413 status and write our
      // own copy. If the user *hasn't* uploaded a footer image, we fall
      // back to a neutral "payload too large" phrasing.
      if (isOkestriaPayloadTooLargeError(err)) {
        const hasFooter =
          !!form.footerImageBase64 && form.footerImageBase64.trim().length > 0;
        setError(
          hasFooter
            ? "A imagem do rodapé é grande demais para o servidor aceitar. Escolha uma imagem menor (idealmente até ~1 MB, um banner fino em torno de 600×160 px) e salve de novo."
            : "O conteúdo é grande demais para o servidor aceitar. Reduza o tamanho do texto ou da imagem e tente novamente."
        );
      } else {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }, [companyId, userId, form, initialFooter]);

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

      {/* Footer image uploader — full-width, visually prominent */}
      <FooterImageUploader
        value={form.footerImageBase64 ?? ""}
        onChange={(v) => updateField("footerImageBase64", v)}
      />

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
  const filledFlags = [
    !!form.description?.trim(),
    !!form.products?.trim(),
    !!form.tone?.trim(),
    !!form.website?.trim(),
    !!form.phone?.trim(),
    !!form.extraNotes?.trim(),
    !!form.footerImageBase64 && form.footerImageBase64.trim().length > 0,
  ];
  const filledCount = filledFlags.filter(Boolean).length;
  const totalFields = filledFlags.length;

  const completionPercent = Math.round((filledCount / totalFields) * 100);

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
          {filledCount} of {totalFields} fields configured
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
        <StatusPill
          filled={!!form.footerImageBase64 && form.footerImageBase64.trim().length > 0}
          label="Footer"
        />
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
   FOOTER IMAGE UPLOADER

   Full-width card that lets the user attach a signature/banner image to
   every outreach email. The image is persisted as a complete data URL on
   the User row (User.EmailContextFooterImageBase64 — moved from Company
   in v21 so every teammate has their own banner) and rendered as an
   inline Resend attachment at the bottom of each outbound email.

   - File picker: accepts image/* only
   - Preview thumbnail (on a subtle checkered background so transparent
     PNGs read correctly)
   - Clear button sets the value to "" which the backend treats as
     "remove saved image"
   - Soft size validation: rejects files whose encoded data URL exceeds
     FOOTER_IMAGE_MAX_DATAURL_LENGTH (~1.5MB of decoded bytes)
   ═══════════════════════════════════════════════════════════════════════ */

function FooterImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasImage = !!value && value.trim().length > 0;

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setError(null);

      if (!file.type.startsWith("image/")) {
        setError("Please select an image file (PNG, JPG, or WebP).");
        return;
      }

      setBusy(true);
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") resolve(result);
            else reject(new Error("Could not read file"));
          };
          reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
          reader.readAsDataURL(file);
        });

        if (dataUrl.length > FOOTER_IMAGE_MAX_DATAURL_LENGTH) {
          setError(
            "That image is too large. Please pick a file under ~900 KB — ideally a slim banner around 600×160 px."
          );
          return;
        }

        onChange(dataUrl);
      } catch {
        setError("Could not read that file. Try a different image.");
      } finally {
        setBusy(false);
      }
    },
    [onChange]
  );

  const handleClear = () => {
    // Empty string signals the backend to clear the saved footer.
    setError(null);
    onChange("");
  };

  return (
    <div className="rounded-[22px] border border-cyan-300/16 bg-[linear-gradient(140deg,rgba(15,26,38,0.82),rgba(7,12,18,0.82))] p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
        {/* ── Label / copy ─────────────────────────────────── */}
        <div className="min-w-0 lg:w-[280px] lg:shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/22 bg-cyan-400/10 text-cyan-100">
              <ImageIcon className="h-4 w-4" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
              Email Signature Footer
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/55">
            Attach a banner or signature image — it&rsquo;s appended to every outreach
            email, right under the sign-off. A slim, wide banner around{" "}
            <span className="text-white/75">600×160&nbsp;px</span> looks best.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-white/35">
            PNG, JPG, or WebP · up to ~900 KB
          </p>
        </div>

        {/* ── Preview + controls ──────────────────────────── */}
        <div className="min-w-0 flex-1">
          {hasImage ? (
            <div className="overflow-hidden rounded-[16px] border border-white/10 bg-[repeating-conic-gradient(rgba(255,255,255,0.04)_0%_25%,rgba(255,255,255,0.08)_25%_50%)] bg-[length:18px_18px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Email signature footer"
                className="block max-h-52 w-full object-contain"
              />
            </div>
          ) : (
            <label className="group flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-white/15 bg-black/20 text-center text-white/50 transition hover:border-cyan-300/40 hover:bg-cyan-500/5 hover:text-white/80">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  void handleFile(f);
                  // Reset so picking the same file again still fires onChange.
                  e.target.value = "";
                }}
              />
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-cyan-200/70 transition group-hover:border-cyan-300/35 group-hover:text-cyan-100">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </div>
              <div className="text-sm font-medium">
                {busy ? "Reading file…" : "Click to upload a footer image"}
              </div>
              <div className="text-[11px] text-white/35">PNG · JPG · WebP</div>
            </label>
          )}

          {/* Action bar (only when an image is loaded) */}
          {hasImage && (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[12px] font-medium text-white/75 transition hover:border-cyan-300/35 hover:bg-cyan-500/10 hover:text-white">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    void handleFile(f);
                    e.target.value = "";
                  }}
                />
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Replace
              </label>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-2 rounded-xl border border-red-400/22 bg-red-500/8 px-3.5 py-2 text-[12px] font-medium text-red-100/85 transition hover:border-red-300/40 hover:bg-red-500/14"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg border border-red-400/24 bg-red-500/8 px-3 py-2 text-[12px] text-red-200/90">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
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
