"use client";

/**
 * v118 / v137 — Unified Tools modal.
 *
 * Replaces the two standalone modals from v115/v117 (UserEmailConfigModal,
 * UserMetaAccountModal). Same backing APIs, same payloads — just collapsed
 * into a single modal with horizontal tabs at the top so the operator has
 * one place to configure every external tool their agents can use.
 *
 * Tabs:
 *   • Email   — IMAP/SMTP credentials for the operator's mailbox.
 *   • Meta    — Instagram + Facebook Pages + WhatsApp Business via one
 *               long-lived Meta access token + per-platform IDs.
 *   • Apify   — v137. Per-COMPANY Apify token + scrape caps for the
 *               apify/instagram-scraper actor. Lets agents read any
 *               public Instagram (handle / hashtag / place) the Meta
 *               Graph API can't reach. Token & caps are shared across
 *               every operator in the same company.
 *
 * Each tab is fully self-contained: load → edit → test → save → delete.
 * The shared chrome (header, tab bar, footer with per-tab actions) keeps
 * the visual language consistent and makes adding a new tool tab a 1-file
 * change.
 *
 * Visual choices:
 *   • Email tab is cyan (matches v115).
 *   • Meta tab is fuchsia (matches v117).
 *   • Apify tab is amber/orange (Apify brand colour, matches v137).
 *   • Active tab gets a colored underline + tinted background; inactive
 *     tabs are muted.
 *   • The header icon + accent color swap with the active tab so the
 *     operator always knows where they are.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AtSign,
  Check,
  Eye,
  EyeOff,
  Facebook,
  Inbox,
  Instagram,
  KeyRound,
  Loader2,
  Mail,
  MessageCircle,
  Save,
  Search,
  Send,
  Server,
  Trash2,
  Wrench,
  X as XIcon,
  Zap,
} from "lucide-react";
import {
  EMAIL_PRESETS,
  deleteMyEmailConfig,
  getMyEmailConfig,
  testMyEmailConfig,
  upsertMyEmailConfig,
  type UpsertUserEmailConfigPayload,
  type UserEmailConfig,
  type UserEmailConfigTestResult,
} from "@/lib/email/api";
import {
  deleteMyMetaAccount,
  getMyMetaAccount,
  testMyMetaAccount,
  upsertMyMetaAccount,
  type UpsertUserSocialAccountPayload,
  type UserSocialAccount,
  type UserSocialAccountTestResult,
} from "@/lib/social/api";
import {
  deleteMyApifyConfig,
  getMyApifyConfig,
  runInstagramScrape,
  testMyApifyConfig,
  upsertMyApifyConfig,
  type CompanyApifyConfig,
  type CompanyApifyConfigTestResult,
  type InstagramScrapeResponse,
  type UpsertCompanyApifyConfigPayload,
} from "@/lib/apify/api";

type TabKey = "email" | "meta" | "apify";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Optional initial tab to land on. Defaults to "email". */
  initialTab?: TabKey;
};

const RELATIVE_TIME = (iso: string | null) => {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleDateString();
};

// ─────────────────────────────────────────────────────────────────────
// Outer chrome
// ─────────────────────────────────────────────────────────────────────

export function UserToolsModal({ open, onClose, initialTab = "email" }: Props) {
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Reset to the requested tab whenever the modal is opened.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  const accent =
    tab === "email"
      ? {
          ring: "border-cyan-400/30",
          gradient:
            "bg-[linear-gradient(160deg,rgba(20,38,56,0.94),rgba(7,12,20,0.96))]",
          glow: "shadow-[0_30px_90px_rgba(8,145,178,0.18)]",
          hairline: "via-cyan-300/55",
          pillBorder: "border-cyan-400/35",
          pillBg: "bg-cyan-500/12",
          pillText: "text-cyan-100",
          headerIconBg: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
          eyebrow: "text-cyan-300/80",
        }
      : tab === "meta"
        ? {
            ring: "border-fuchsia-400/35",
            gradient:
              "bg-[linear-gradient(160deg,rgba(40,18,46,0.94),rgba(8,7,16,0.96))]",
            glow: "shadow-[0_30px_90px_rgba(232,121,249,0.18)]",
            hairline: "via-fuchsia-300/55",
            pillBorder: "border-fuchsia-400/35",
            pillBg: "bg-fuchsia-500/12",
            pillText: "text-fuchsia-100",
            headerIconBg: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
            eyebrow: "text-fuchsia-300/80",
          }
        : {
            // v137 — Apify (amber).
            ring: "border-amber-400/35",
            gradient:
              "bg-[linear-gradient(160deg,rgba(46,30,8,0.94),rgba(14,8,3,0.96))]",
            glow: "shadow-[0_30px_90px_rgba(245,158,11,0.18)]",
            hairline: "via-amber-300/55",
            pillBorder: "border-amber-400/35",
            pillBg: "bg-amber-500/12",
            pillText: "text-amber-100",
            headerIconBg: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
            eyebrow: "text-amber-300/80",
          };

  return (
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-tools-modal-title"
    >
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        className={`relative z-[171] flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border ${accent.ring} ${accent.gradient} ${accent.glow}`}
      >
        {/* Top hairline accent — matches the active tab color. */}
        <div
          className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${accent.hairline} to-transparent`}
        />

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex items-start gap-3 border-b border-white/10 px-5 py-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${accent.headerIconBg}`}
          >
            <Wrench className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div
              className={`font-mono text-[10px] font-semibold uppercase tracking-[0.22em] ${accent.eyebrow}`}
            >
              Operator tools
            </div>
            <h2
              id="user-tools-modal-title"
              className="mt-0.5 text-base font-semibold text-white"
            >
              Tools
            </h2>
            <p className="mt-0.5 text-[12px] text-white/55">
              Wire the external accounts your agents can use on your behalf
              during squad tasks, cron jobs and chat.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/65 transition hover:bg-white/10 hover:text-white"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </header>

        {/* ── Tab bar ────────────────────────────────────────────── */}
        <nav
          role="tablist"
          aria-label="Tools tabs"
          className="flex items-center gap-1 border-b border-white/10 bg-white/[0.015] px-2 pt-2"
        >
          <TabTrigger
            active={tab === "email"}
            onClick={() => setTab("email")}
            color="cyan"
            label="Email"
            icon={<Mail className="h-3.5 w-3.5" />}
          />
          <TabTrigger
            active={tab === "meta"}
            onClick={() => setTab("meta")}
            color="fuchsia"
            label="Instagram · Facebook · WhatsApp"
            icon={<Instagram className="h-3.5 w-3.5" />}
          />
          {/* v137 — Apify Instagram scraper (per-company token). */}
          <TabTrigger
            active={tab === "apify"}
            onClick={() => setTab("apify")}
            color="amber"
            label="Apify · IG scraper"
            icon={<Search className="h-3.5 w-3.5" />}
          />
        </nav>

        {/* ── Tab body ──────────────────────────────────────────── */}
        {tab === "email" ? (
          <EmailTab onClose={onClose} />
        ) : tab === "meta" ? (
          <MetaTab onClose={onClose} />
        ) : (
          <ApifyTab onClose={onClose} />
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Tab trigger
// ─────────────────────────────────────────────────────────────────────

function TabTrigger({
  active,
  onClick,
  color,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  color: "cyan" | "fuchsia" | "amber";
  label: string;
  icon: React.ReactNode;
}) {
  const activeStyles =
    color === "cyan"
      ? "border-cyan-400/45 bg-cyan-500/10 text-cyan-100"
      : color === "fuchsia"
        ? "border-fuchsia-400/45 bg-fuchsia-500/10 text-fuchsia-100"
        : "border-amber-400/45 bg-amber-500/10 text-amber-100";
  const idleStyles =
    "border-transparent bg-transparent text-white/55 hover:bg-white/[0.04] hover:text-white";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 rounded-t-lg border-b-2 px-3.5 py-2 text-[12px] font-medium transition ${
        active ? activeStyles : idleStyles
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// EMAIL TAB
// ─────────────────────────────────────────────────────────────────────

const ENCRYPTION_OPTIONS = ["tls", "start-tls", "none"] as const;

function EmailTab({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existing, setExisting] = useState<UserEmailConfig | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<UserEmailConfigTestResult | null>(
    null,
  );

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState(993);
  const [imapEncryption, setImapEncryption] = useState<string>("tls");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpEncryption, setSmtpEncryption] = useState<string>("start-tls");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSuccess(null);
    void getMyEmailConfig()
      .then((row) => {
        if (cancelled) return;
        setExisting(row);
        if (row) {
          setEmail(row.email);
          setDisplayName(row.displayName ?? "");
          setImapHost(row.imapHost);
          setImapPort(row.imapPort);
          setImapEncryption(row.imapEncryption);
          setSmtpHost(row.smtpHost);
          setSmtpPort(row.smtpPort);
          setSmtpEncryption(row.smtpEncryption);
          setPassword("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyPreset = (key: keyof typeof EMAIL_PRESETS) => {
    const preset = EMAIL_PRESETS[key];
    setImapHost(preset.imapHost);
    setImapPort(preset.imapPort);
    setImapEncryption(preset.imapEncryption);
    setSmtpHost(preset.smtpHost);
    setSmtpPort(preset.smtpPort);
    setSmtpEncryption(preset.smtpEncryption);
  };

  const canSave = useMemo(
    () =>
      email.trim().length > 0 &&
      imapHost.trim().length > 0 &&
      smtpHost.trim().length > 0 &&
      password.trim().length > 0,
    [email, imapHost, smtpHost, password],
  );

  const handleSave = async () => {
    if (!canSave) {
      setError("Email, IMAP/SMTP hosts and password are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: UpsertUserEmailConfigPayload = {
        email: email.trim(),
        displayName: displayName.trim() || undefined,
        imapHost: imapHost.trim(),
        imapPort,
        imapEncryption,
        smtpHost: smtpHost.trim(),
        smtpPort,
        smtpEncryption,
        password,
      };
      const saved = await upsertMyEmailConfig(payload);
      setExisting(saved);
      setSuccess(
        "Email account saved. Every agent in your company can now use this mailbox in squad tasks, cron jobs and chat.",
      );
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const result = await testMyEmailConfig();
      setTestResult(result);
      if (!result.ok)
        setError(result.error || result.stderr || "Connection test failed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Delete this email account? Your agents will no longer be able to send/read email from this mailbox. This cannot be undone.",
      )
    )
      return;
    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteMyEmailConfig();
      setExisting(null);
      setEmail("");
      setDisplayName("");
      setImapHost("");
      setImapPort(993);
      setImapEncryption("tls");
      setSmtpHost("");
      setSmtpPort(587);
      setSmtpEncryption("start-tls");
      setPassword("");
      setTestResult(null);
      setSuccess("Email account removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-4 overflow-y-auto px-5 py-5">
        {/* Surface-availability pills (the blast radius of saving). */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em]">
          <span className="text-white/35">Available in:</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200/85">
            <Check className="h-2.5 w-2.5" /> Squad tasks
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200/85">
            <Check className="h-2.5 w-2.5" /> Cron jobs
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200/85">
            <Check className="h-2.5 w-2.5" /> Chat
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white/55">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : null}

        {existing ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-100/90">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
            <div>
              <div className="font-medium text-emerald-100">Configured ✓</div>
              <div className="mt-0.5 text-[11.5px] text-emerald-200/80">
                Wired to <strong>{existing.email}</strong>. Re-enter the password
                to update credentials.
              </div>
              {existing.lastTestedAtUtc ? (
                <div className="mt-1 text-[11px] text-white/45">
                  Last test:{" "}
                  {existing.lastTestSucceeded ? (
                    <span className="text-emerald-300">✓ ok</span>
                  ) : (
                    <span className="text-rose-300">
                      ✗ {existing.lastTestError ?? "failed"}
                    </span>
                  )}
                  {" · "}
                  {RELATIVE_TIME(existing.lastTestedAtUtc)}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Quick presets */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            Quick presets
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(EMAIL_PRESETS) as Array<keyof typeof EMAIL_PRESETS>).map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-100"
                >
                  {key}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              <AtSign className="mr-1 inline-block h-3 w-3 -translate-y-px" />
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourdomain.com"
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-400/50"
              disabled={saving || deleting}
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Display name <span className="text-white/30">· optional</span>
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-400/50"
              disabled={saving || deleting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              <Inbox className="mr-1 inline-block h-3 w-3 -translate-y-px" />
              IMAP host
            </label>
            <input
              value={imapHost}
              onChange={(e) => setImapHost(e.target.value)}
              placeholder="imap.example.com"
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-400/50"
              disabled={saving || deleting}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                Port
              </label>
              <input
                type="number"
                value={imapPort}
                onChange={(e) => setImapPort(Number(e.target.value) || 0)}
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/50"
                disabled={saving || deleting}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                Encryption
              </label>
              <select
                value={imapEncryption}
                onChange={(e) => setImapEncryption(e.target.value)}
                className="w-full rounded-lg bg-white/5 px-2 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/50 [&>option]:bg-slate-900"
                disabled={saving || deleting}
              >
                {ENCRYPTION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              <Send className="mr-1 inline-block h-3 w-3 -translate-y-px" />
              SMTP host
            </label>
            <input
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.example.com"
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-400/50"
              disabled={saving || deleting}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                Port
              </label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value) || 0)}
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/50"
                disabled={saving || deleting}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                Encryption
              </label>
              <select
                value={smtpEncryption}
                onChange={(e) => setSmtpEncryption(e.target.value)}
                className="w-full rounded-lg bg-white/5 px-2 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/50 [&>option]:bg-slate-900"
                disabled={saving || deleting}
              >
                {ENCRYPTION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              <KeyRound className="mr-1 inline-block h-3 w-3 -translate-y-px" />
              Password / app password
              <span className="ml-1 text-white/30">
                {existing ? "· re-enter to update" : "· required"}
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  existing
                    ? "(unchanged — type to rotate)"
                    : "Your mailbox password or app password"
                }
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 pr-10 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-400/50"
                disabled={saving || deleting}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-white/30">
              Stored only on the OpenClaw gateway VPS (file mode 600). Never
              persisted in the Okestria database. Gmail / Outlook with 2FA: use
              an app password.
            </p>
          </div>
        </div>

        {testResult ? (
          <div
            className={`rounded-xl border px-3 py-2 text-[12.5px] ${
              testResult.ok
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90"
                : "border-rose-400/30 bg-rose-500/10 text-rose-200/90"
            }`}
          >
            <div className="font-medium">
              {testResult.ok
                ? "✓ Connection test succeeded"
                : "✗ Connection test failed"}
            </div>
            {testResult.stdout ? (
              <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-white/55">
                {testResult.stdout}
              </pre>
            ) : null}
            {testResult.stderr || testResult.error ? (
              <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-rose-200/80">
                {testResult.stderr || testResult.error}
              </pre>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-200/90">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-200/90">
            {success}
          </div>
        ) : null}
      </div>

      {/* Footer (per-tab actions) */}
      <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-3">
        <div className="flex items-center gap-2">
          {existing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting || testing}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/10 px-3.5 text-[12.5px] font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-40"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Remove
            </button>
          ) : null}
          {existing ? (
            <button
              type="button"
              onClick={handleTest}
              disabled={saving || deleting || testing}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3.5 text-[12.5px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Server className="h-3.5 w-3.5" />
              )}
              Test
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            className="inline-flex h-9 items-center rounded-full border border-white/12 bg-white/[0.03] px-3.5 text-[12.5px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-cyan-400/45 bg-cyan-500/15 px-4 text-[12.5px] font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {existing ? "Update mailbox" : "Save mailbox"}
          </button>
        </div>
      </footer>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// META TAB
// ─────────────────────────────────────────────────────────────────────

function MetaTab({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existing, setExisting] = useState<UserSocialAccount | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<UserSocialAccountTestResult | null>(
    null,
  );

  const [accessToken, setAccessToken] = useState("");
  const [displayHandle, setDisplayHandle] = useState("");
  const [igUserId, setIgUserId] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSuccess(null);
    void getMyMetaAccount()
      .then((row) => {
        if (cancelled) return;
        setExisting(row);
        if (row) {
          setDisplayHandle(row.displayHandle ?? "");
          setIgUserId(row.igUserId ?? "");
          setFacebookPageId(row.facebookPageId ?? "");
          setWhatsappPhoneNumberId(row.whatsappPhoneNumberId ?? "");
          setBusinessAccountId(row.businessAccountId ?? "");
          setAccessToken("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled = useMemo(
    () => ({
      instagram: igUserId.trim().length > 0,
      facebook: facebookPageId.trim().length > 0,
      whatsapp: whatsappPhoneNumberId.trim().length > 0,
    }),
    [igUserId, facebookPageId, whatsappPhoneNumberId],
  );

  const canSave = useMemo(
    () =>
      accessToken.trim().length > 0 &&
      (enabled.instagram || enabled.facebook || enabled.whatsapp),
    [accessToken, enabled],
  );

  const handleSave = async () => {
    if (!canSave) {
      setError(
        "Need an access token + at least one ID (Instagram, Facebook Page or WhatsApp).",
      );
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: UpsertUserSocialAccountPayload = {
        provider: "meta",
        accessToken,
        displayHandle: displayHandle.trim() || undefined,
        igUserId: igUserId.trim() || undefined,
        facebookPageId: facebookPageId.trim() || undefined,
        whatsappPhoneNumberId: whatsappPhoneNumberId.trim() || undefined,
        businessAccountId: businessAccountId.trim() || undefined,
      };
      const saved = await upsertMyMetaAccount(payload);
      setExisting(saved);
      setSuccess(
        "Meta account saved. Every agent in your company can now use Instagram, Facebook and WhatsApp on your behalf during squad tasks, cron jobs and chat.",
      );
      setAccessToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const result = await testMyMetaAccount();
      setTestResult(result);
      if (!result.ok) setError(result.error || "Connection test failed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Remove this Meta account? Agents will no longer be able to read/post on Instagram, Facebook or WhatsApp on your behalf. This cannot be undone.",
      )
    )
      return;
    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteMyMetaAccount();
      setExisting(null);
      setAccessToken("");
      setDisplayHandle("");
      setIgUserId("");
      setFacebookPageId("");
      setWhatsappPhoneNumberId("");
      setBusinessAccountId("");
      setTestResult(null);
      setSuccess("Meta account removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-4 overflow-y-auto px-5 py-5">
        {/* Per-platform pills (light up as IDs are filled). */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em]">
          <span className="text-white/35">Enabled:</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
              enabled.instagram
                ? "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100"
                : "border-white/10 bg-white/[0.03] text-white/35"
            }`}
          >
            <Instagram className="h-2.5 w-2.5" /> Instagram
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
              enabled.facebook
                ? "border-blue-400/40 bg-blue-500/15 text-blue-100"
                : "border-white/10 bg-white/[0.03] text-white/35"
            }`}
          >
            <Facebook className="h-2.5 w-2.5" /> Facebook
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
              enabled.whatsapp
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                : "border-white/10 bg-white/[0.03] text-white/35"
            }`}
          >
            <MessageCircle className="h-2.5 w-2.5" /> WhatsApp
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white/55">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : null}

        {existing ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-100/90">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
            <div>
              <div className="font-medium text-emerald-100">Configured ✓</div>
              <div className="mt-0.5 text-[11.5px] text-emerald-200/80">
                {existing.displayHandle ? (
                  <>
                    Handle: <strong>{existing.displayHandle}</strong> ·{" "}
                  </>
                ) : null}
                Re-enter the access token below to update credentials.
              </div>
              {existing.lastTestedAtUtc ? (
                <div className="mt-1 text-[11px] text-white/45">
                  Last test:{" "}
                  {existing.lastTestSucceeded ? (
                    <span className="text-emerald-300">✓ ok</span>
                  ) : (
                    <span className="text-rose-300">✗ failed</span>
                  )}
                  {" · "}
                  {RELATIVE_TIME(existing.lastTestedAtUtc)}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Help link */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[11.5px] leading-5 text-white/65">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
            How to get these
          </div>
          <div className="mt-1.5 space-y-1">
            <div>
              1. Create an app at{" "}
              <span className="text-cyan-300">developers.facebook.com</span>
            </div>
            <div>
              2. Add the products: Instagram Graph API, Facebook Login, WhatsApp
            </div>
            <div>
              3. Generate a long-lived token (60d) with:{" "}
              <code className="rounded bg-white/[0.06] px-1 text-[10.5px]">
                instagram_basic, pages_show_list, pages_read_engagement,
                instagram_manage_comments, whatsapp_business_messaging
              </code>
            </div>
            <div>
              4. Get your IDs from Graph API Explorer (igUserId, pageId,
              phoneNumberId)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              <KeyRound className="mr-1 inline-block h-3 w-3 -translate-y-px" />
              Meta access token
              <span className="ml-1 text-white/30">
                {existing ? "· re-enter to update" : "· required"}
              </span>
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={
                  existing ? "(unchanged — type to rotate)" : "EAAxxx... (long-lived)"
                }
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 pr-10 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-fuchsia-400/50 font-mono text-[12px]"
                disabled={saving || deleting}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition hover:text-white"
              >
                {showToken ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-white/30">
              Stored only on the OpenClaw gateway VPS (file mode 600). Never
              persisted in the Okestria database.
            </p>
          </div>

          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Display handle{" "}
              <span className="text-white/30">· optional, e.g. @ptxgrowth</span>
            </label>
            <input
              value={displayHandle}
              onChange={(e) => setDisplayHandle(e.target.value)}
              placeholder="@your-handle"
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-fuchsia-400/50"
              disabled={saving || deleting}
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              <Instagram className="mr-1 inline-block h-3 w-3 -translate-y-px text-fuchsia-300" />
              Instagram User ID <span className="text-white/30">· optional</span>
            </label>
            <input
              value={igUserId}
              onChange={(e) => setIgUserId(e.target.value)}
              placeholder="17841400000000000"
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-fuchsia-400/50 font-mono text-[12px]"
              disabled={saving || deleting}
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              <Facebook className="mr-1 inline-block h-3 w-3 -translate-y-px text-blue-300" />
              Facebook Page ID <span className="text-white/30">· optional</span>
            </label>
            <input
              value={facebookPageId}
              onChange={(e) => setFacebookPageId(e.target.value)}
              placeholder="100000000000000"
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-fuchsia-400/50 font-mono text-[12px]"
              disabled={saving || deleting}
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              <MessageCircle className="mr-1 inline-block h-3 w-3 -translate-y-px text-emerald-300" />
              WhatsApp Phone Number ID{" "}
              <span className="text-white/30">· optional</span>
            </label>
            <input
              value={whatsappPhoneNumberId}
              onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
              placeholder="100000000000000"
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-fuchsia-400/50 font-mono text-[12px]"
              disabled={saving || deleting}
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Business Account ID{" "}
              <span className="text-white/30">· optional, for Ads/Insights</span>
            </label>
            <input
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
              placeholder="100000000000000"
              className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-fuchsia-400/50 font-mono text-[12px]"
              disabled={saving || deleting}
            />
          </div>
        </div>

        {testResult ? (
          <div
            className={`rounded-xl border px-3 py-2 text-[12.5px] ${
              testResult.ok
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90"
                : "border-rose-400/30 bg-rose-500/10 text-rose-200/90"
            }`}
          >
            <div className="font-medium">
              {testResult.ok
                ? "✓ Connection test succeeded"
                : "✗ Connection test failed"}
            </div>
            {testResult.checkResultsJson ? (
              <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-all text-[11px] text-white/60">
                {testResult.checkResultsJson}
              </pre>
            ) : null}
            {testResult.error ? (
              <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] text-rose-200/80">
                {testResult.error}
              </pre>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-200/90">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-200/90">
            {success}
          </div>
        ) : null}
      </div>

      {/* Footer (per-tab actions) */}
      <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-3">
        <div className="flex items-center gap-2">
          {existing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting || testing}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/10 px-3.5 text-[12.5px] font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-40"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Remove
            </button>
          ) : null}
          {existing ? (
            <button
              type="button"
              onClick={handleTest}
              disabled={saving || deleting || testing}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3.5 text-[12.5px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Server className="h-3.5 w-3.5" />
              )}
              Test connection
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            className="inline-flex h-9 items-center rounded-full border border-white/12 bg-white/[0.03] px-3.5 text-[12.5px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-fuchsia-400/45 bg-fuchsia-500/15 px-4 text-[12.5px] font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {existing ? "Update Meta account" : "Save Meta account"}
          </button>
        </div>
      </footer>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// APIFY TAB (v137)
// ─────────────────────────────────────────────────────────────────────

/**
 * v137 (hotfix) — Decorate raw error messages so a 404 is recognised
 * as "the back endpoint is missing — deploy v79". Without this the
 * operator sees a bare "Request failed with status 404" and has no
 * way to act on it.
 */
function explainApifyError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw);
  if (/\b404\b|not\s*found/i.test(msg)) {
    return "Back doesn't expose the Apify endpoints yet (404). Deploy back v79 to the VPS, restart `pepe`, then refresh this page.";
  }
  if (/\b401\b|unauthor/i.test(msg)) {
    return "Authentication failed (401). Sign out and sign back in, then retry.";
  }
  if (/\b502\b|bad\s*gateway/i.test(msg)) {
    return `Back returned 502 (bridge unreachable). Original message: ${msg}`;
  }
  return msg;
}

function ApifyTab({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  const [existing, setExisting] = useState<CompanyApifyConfig | null>(null);
  const [token, setToken] = useState("");
  const [label, setLabel] = useState("");
  const [dailyCap, setDailyCap] = useState(500);
  const [perCallCap, setPerCallCap] = useState(50);
  const [testResult, setTestResult] = useState<CompanyApifyConfigTestResult | null>(null);

  // Inline "Try it" panel.
  const [tryHandles, setTryHandles] = useState("");
  const [tryHashtags, setTryHashtags] = useState("");
  const [tryLimit, setTryLimit] = useState(6);
  const [tryResultsType, setTryResultsType] = useState<"posts" | "details" | "comments" | "mentions" | "stories">(
    "posts",
  );
  const [tryPersist, setTryPersist] = useState(true);
  const [tryResult, setTryResult] = useState<InstagramScrapeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSuccess(null);
    void getMyApifyConfig()
      .then((row) => {
        if (cancelled) return;
        setExisting(row);
        if (row) {
          setLabel(row.label ?? "");
          setDailyCap(row.dailyResultsCap);
          setPerCallCap(row.perCallResultsCap);
          setToken("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(explainApifyError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSave = useMemo(
    () => (existing ? true : token.trim().length > 0) && dailyCap > 0 && perCallCap > 0,
    [existing, token, dailyCap, perCallCap],
  );
  const canTry = useMemo(
    () => existing != null && (tryHandles.trim().length > 0 || tryHashtags.trim().length > 0),
    [existing, tryHandles, tryHashtags],
  );

  const handleSave = async () => {
    if (!canSave) {
      setError("Provide a token (first time) and positive caps.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: UpsertCompanyApifyConfigPayload = {
        apifyToken: token.trim() || undefined,
        label: label.trim() || undefined,
        dailyResultsCap: Math.max(1, Math.min(50000, Math.floor(dailyCap))),
        perCallResultsCap: Math.max(1, Math.min(1000, Math.floor(perCallCap))),
      };
      const saved = await upsertMyApifyConfig(payload);
      setExisting(saved);
      setToken("");
      setSuccess("Saved.");
    } catch (err) {
      setError(explainApifyError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await testMyApifyConfig();
      setTestResult(result);
      if (result.ok) setSuccess(`Apify reachable — ${result.username ?? "ok"} (${result.plan ?? "?"}).`);
      else setError(result.error ?? "Test failed.");
    } catch (err) {
      setError(explainApifyError(err));
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (!confirm("Delete the Apify config for this company? Agents will lose access to the scraper.")) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteMyApifyConfig();
      setExisting(null);
      setToken("");
      setLabel("");
      setDailyCap(500);
      setPerCallCap(50);
      setTestResult(null);
      setTryResult(null);
      setSuccess("Deleted.");
    } catch (err) {
      setError(explainApifyError(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleTry = async () => {
    if (!canTry) return;
    setScraping(true);
    setError(null);
    setSuccess(null);
    try {
      const handles = tryHandles
        .split(/[\s,]+/)
        .map((h) => h.trim().replace(/^@/, ""))
        .filter(Boolean);
      const hashtags = tryHashtags
        .split(/[\s,]+/)
        .map((h) => h.trim().replace(/^#/, ""))
        .filter(Boolean);
      const result = await runInstagramScrape({
        handles: handles.length ? handles : undefined,
        hashtags: hashtags.length ? hashtags : undefined,
        resultsType: tryResultsType,
        limit: Math.max(1, Math.min(50, Math.floor(tryLimit))),
        persistToVault: tryPersist,
      });
      setTryResult(result);
      // Refresh config so the consumed counter shows the latest value.
      const refreshed = await getMyApifyConfig();
      setExisting(refreshed);
    } catch (err) {
      setError(explainApifyError(err));
    } finally {
      setScraping(false);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-5">
            {/* Status row */}
            {existing ? (
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-3 text-[12px] sm:grid-cols-4">
                <StatCell label="Token" value={existing.maskedToken || "—"} mono />
                <StatCell label="Today" value={`${existing.resultsConsumedToday} / ${existing.dailyResultsCap}`} />
                <StatCell label="All time" value={existing.resultsConsumedTotal.toLocaleString()} />
                <StatCell
                  label="Last scrape"
                  value={existing.lastScrapeAtUtc ? RELATIVE_TIME(existing.lastScrapeAtUtc) : "never"}
                  hint={existing.lastScrapeTarget ?? undefined}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-3 text-[12px] text-amber-100/80">
                No Apify config yet for this company. Paste a token to wire up the
                <span className="font-mono"> apify/instagram-scraper</span> actor for every operator + agent here.
              </div>
            )}

            {/* Token */}
            <Field label="Apify API token" hint="Bearer token from Apify Console → Settings → Integrations.">
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={existing ? "Leave empty to keep the saved token" : "apify_api_…"}
                  autoComplete="new-password"
                  className="w-full rounded-md border border-white/12 bg-black/40 px-3 py-2 pr-9 font-mono text-[12px] text-white placeholder-white/30 outline-none focus:border-amber-400/50"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  aria-label={showToken ? "Hide token" : "Show token"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Label (optional)" hint="Human note — shown in audit only.">
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="PTX prod plan"
                  className="w-full rounded-md border border-white/12 bg-black/40 px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none focus:border-amber-400/50"
                />
              </Field>
              <Field label="Daily results cap" hint="Hard ceiling per UTC day for this company.">
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={dailyCap}
                  onChange={(e) => setDailyCap(Number(e.target.value) || 0)}
                  className="w-full rounded-md border border-white/12 bg-black/40 px-3 py-2 text-[12px] text-white outline-none focus:border-amber-400/50"
                />
              </Field>
              <Field label="Per-call cap" hint="Max items returned in one scrape call.">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={perCallCap}
                  onChange={(e) => setPerCallCap(Number(e.target.value) || 0)}
                  className="w-full rounded-md border border-white/12 bg-black/40 px-3 py-2 text-[12px] text-white outline-none focus:border-amber-400/50"
                />
              </Field>
            </div>

            {/* Test result */}
            {testResult && (
              <div
                className={`rounded-xl border p-3 text-[12px] ${
                  testResult.ok
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-400/30 bg-rose-500/10 text-rose-100"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {testResult.ok ? <Check className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                  Apify {testResult.ok ? "OK" : "failed"}
                </div>
                {testResult.ok ? (
                  <div className="mt-1 text-white/70">
                    Logged in as <span className="font-mono">{testResult.username ?? "?"}</span>
                    {testResult.plan ? <> · plan <span className="font-mono">{testResult.plan}</span></> : null}
                  </div>
                ) : (
                  <div className="mt-1 whitespace-pre-wrap text-white/70">{testResult.error}</div>
                )}
              </div>
            )}

            {/* Try it now */}
            {existing && (
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-amber-100">
                  <Search className="h-3.5 w-3.5" /> Try a scrape
                </div>
                <p className="mt-1 text-[11.5px] text-white/55">
                  Drives the actor live so you can verify cost / output shape before letting agents loose.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Handles (comma-separated)">
                    <input
                      type="text"
                      value={tryHandles}
                      onChange={(e) => setTryHandles(e.target.value)}
                      placeholder="brazilianreport, seattleprabrasileiros"
                      className="w-full rounded-md border border-white/12 bg-black/40 px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none focus:border-amber-400/50"
                    />
                  </Field>
                  <Field label="Hashtags (comma-separated)">
                    <input
                      type="text"
                      value={tryHashtags}
                      onChange={(e) => setTryHashtags(e.target.value)}
                      placeholder="seattlebrazil, br_in_us"
                      className="w-full rounded-md border border-white/12 bg-black/40 px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none focus:border-amber-400/50"
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      value={tryResultsType}
                      onChange={(e) =>
                        setTryResultsType(e.target.value as typeof tryResultsType)
                      }
                      className="w-full rounded-md border border-white/12 bg-black/40 px-3 py-2 text-[12px] text-white outline-none focus:border-amber-400/50"
                    >
                      <option value="posts">posts</option>
                      <option value="details">details</option>
                      <option value="comments">comments</option>
                      <option value="mentions">mentions</option>
                      <option value="stories">stories</option>
                    </select>
                  </Field>
                  <Field label="Limit per input">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={tryLimit}
                      onChange={(e) => setTryLimit(Number(e.target.value) || 0)}
                      className="w-full rounded-md border border-white/12 bg-black/40 px-3 py-2 text-[12px] text-white outline-none focus:border-amber-400/50"
                    />
                  </Field>
                </div>
                <label className="mt-2 inline-flex items-center gap-2 text-[11.5px] text-white/65">
                  <input
                    type="checkbox"
                    checked={tryPersist}
                    onChange={(e) => setTryPersist(e.target.checked)}
                    className="h-3.5 w-3.5 accent-amber-400"
                  />
                  Persist result as a markdown note in the company vault
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTry}
                    disabled={!canTry || scraping}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/45 bg-amber-500/15 px-3 py-1.5 text-[11.5px] font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {scraping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Run scrape
                  </button>
                  {tryResult && (
                    <span className="text-[11px] text-white/55">
                      {tryResult.resultsReturned} item{tryResult.resultsReturned === 1 ? "" : "s"} ·
                      budget left: {tryResult.dailyBudgetRemaining}
                      {tryResult.vaultNotePath ? <> · note <span className="font-mono">{tryResult.vaultNotePath}</span></> : null}
                    </span>
                  )}
                </div>
                {tryResult && tryResult.items && tryResult.items.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {tryResult.items.slice(0, 5).map((it, idx) => (
                      <div
                        key={(it.id as string | undefined) ?? idx}
                        className="rounded-md border border-white/10 bg-black/40 p-2 text-[11.5px] text-white/75"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-100">
                            {it.ownerUsername ? "@" + it.ownerUsername : "post"}
                          </span>
                          <span className="text-white/50">
                            ❤ {(it.likesCount as number | null) ?? 0} · 💬 {(it.commentsCount as number | null) ?? 0}
                          </span>
                        </div>
                        {it.caption && (
                          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-white/65">
                            {String(it.caption)}
                          </p>
                        )}
                        {it.url && (
                          <a
                            href={String(it.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block truncate font-mono text-[10.5px] text-amber-200 hover:underline"
                          >
                            {String(it.url)}
                          </a>
                        )}
                      </div>
                    ))}
                    {tryResult.items.length > 5 && (
                      <div className="text-[11px] text-white/45">
                        + {tryResult.items.length - 5} more (visible to the agent in the JSON response).
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bridge / Footer messages */}
            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-[12px] text-rose-100">
                {error}
              </div>
            )}
            {success && !error && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-[12px] text-emerald-100">
                {success}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-white/[0.02] px-5 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/75 hover:bg-white/10"
          >
            Close
          </button>
          {existing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-[12px] text-rose-100 hover:bg-rose-500/20 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={!existing || testing}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Test token
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/45 bg-amber-500/15 px-3 py-1.5 text-[12px] font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {existing ? "Update Apify config" : "Save Apify config"}
          </button>
        </div>
      </footer>
    </>
  );
}

// ── Small layout primitives reused inside ApifyTab ────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[11.5px] text-white/65">
      <span className="font-medium text-white/80">{label}</span>
      {hint && <span className="ml-2 text-[10.5px] text-white/45">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function StatCell({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-amber-300/65">{label}</div>
      <div className={`truncate text-[12.5px] text-white/90 ${mono ? "font-mono" : ""}`}>{value}</div>
      {hint && <div className="truncate text-[10.5px] text-white/45">{hint}</div>}
    </div>
  );
}

