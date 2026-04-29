"use client";

/**
 * v117 — Per-user Meta credentials configuration modal.
 *
 * One Meta access token unlocks Instagram, Facebook Pages and WhatsApp
 * Business depending on which IDs the operator fills in. The token is
 * one-shot — sent only on save, never returned by the API. To rotate,
 * the operator re-types it.
 *
 * Same UX language as the email modal (UserEmailConfigModal). Three
 * pills under the subtitle show which Meta surfaces are enabled:
 * Instagram / Facebook / WhatsApp — each lights up green when the
 * matching ID is filled.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Facebook,
  Instagram,
  KeyRound,
  Loader2,
  MessageCircle,
  Save,
  Server,
  Trash2,
  X as XIcon,
  Zap,
} from "lucide-react";
import {
  deleteMyMetaAccount,
  getMyMetaAccount,
  testMyMetaAccount,
  upsertMyMetaAccount,
  type UpsertUserSocialAccountPayload,
  type UserSocialAccount,
  type UserSocialAccountTestResult,
} from "@/lib/social/api";

type Props = {
  open: boolean;
  onClose: () => void;
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

export function UserMetaAccountModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existing, setExisting] = useState<UserSocialAccount | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<UserSocialAccountTestResult | null>(null);

  const [accessToken, setAccessToken] = useState("");
  const [displayHandle, setDisplayHandle] = useState("");
  const [igUserId, setIgUserId] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");

  useEffect(() => {
    if (!open) {
      setError(null); setSuccess(null); setShowToken(false);
      setAccessToken(""); setTestResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true); setError(null); setSuccess(null);
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
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const enabled = useMemo(() => ({
    instagram: igUserId.trim().length > 0,
    facebook: facebookPageId.trim().length > 0,
    whatsapp: whatsappPhoneNumberId.trim().length > 0,
  }), [igUserId, facebookPageId, whatsappPhoneNumberId]);

  const canSave = useMemo(
    () => accessToken.trim().length > 0
      && (enabled.instagram || enabled.facebook || enabled.whatsapp),
    [accessToken, enabled],
  );

  const handleSave = async () => {
    if (!canSave) {
      setError("Need an access token + at least one ID (Instagram, Facebook Page or WhatsApp).");
      return;
    }
    setSaving(true); setError(null); setSuccess(null);
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
    setTesting(true); setError(null); setTestResult(null);
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
    if (typeof window !== "undefined" && !window.confirm(
      "Remove this Meta account? Agents will no longer be able to read/post on Instagram, Facebook or WhatsApp on your behalf. This cannot be undone.",
    )) return;
    setDeleting(true); setError(null); setSuccess(null);
    try {
      await deleteMyMetaAccount();
      setExisting(null);
      setAccessToken(""); setDisplayHandle(""); setIgUserId("");
      setFacebookPageId(""); setWhatsappPhoneNumberId(""); setBusinessAccountId("");
      setTestResult(null);
      setSuccess("Meta account removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="user-meta-account-title"
    >
      <button
        type="button" aria-hidden tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={() => { if (!saving && !deleting && !testing) onClose(); }}
      />
      <section className="relative z-[171] flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-fuchsia-400/35 bg-[#0b0e14] shadow-[0_30px_90px_rgba(0,0,0,.75)]">
        <header className="flex items-start gap-3 border-b border-white/10 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30">
            <Instagram className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300/80">
              Meta integration
            </div>
            <h2 id="user-meta-account-title" className="mt-0.5 text-base font-semibold text-white">
              Configure Instagram, Facebook & WhatsApp
            </h2>
            <p className="mt-0.5 text-[12px] text-white/55">
              One Meta access token unlocks all three. Fill the IDs for the platforms you want enabled.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em]">
              <span className="text-white/35">Enabled:</span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                enabled.instagram
                  ? "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100"
                  : "border-white/10 bg-white/[0.03] text-white/35"
              }`}>
                <Instagram className="h-2.5 w-2.5" /> Instagram
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                enabled.facebook
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-100"
                  : "border-white/10 bg-white/[0.03] text-white/35"
              }`}>
                <Facebook className="h-2.5 w-2.5" /> Facebook
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                enabled.whatsapp
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                  : "border-white/10 bg-white/[0.03] text-white/35"
              }`}>
                <MessageCircle className="h-2.5 w-2.5" /> WhatsApp
              </span>
            </div>
          </div>
          <button
            type="button" onClick={onClose} disabled={saving || deleting} aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-5">
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
                  {existing.displayHandle ? <>Handle: <strong>{existing.displayHandle}</strong> · </> : null}
                  Re-enter the access token below to update credentials.
                </div>
                {existing.lastTestedAtUtc ? (
                  <div className="mt-1 text-[11px] text-white/45">
                    Last test:{" "}
                    {existing.lastTestSucceeded ? <span className="text-emerald-300">✓ ok</span> : <span className="text-rose-300">✗ failed</span>}
                    {" · "}{RELATIVE_TIME(existing.lastTestedAtUtc)}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Help link */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[11.5px] leading-5 text-white/65">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">How to get these</div>
            <div className="mt-1.5 space-y-1">
              <div>1. Create an app at <span className="text-cyan-300">developers.facebook.com</span></div>
              <div>2. Add the products: Instagram Graph API, Facebook Login, WhatsApp</div>
              <div>3. Generate a long-lived token (60d) with: <code className="rounded bg-white/[0.06] px-1 text-[10.5px]">instagram_basic, pages_show_list, pages_read_engagement, instagram_manage_comments, whatsapp_business_messaging</code></div>
              <div>4. Get your IDs from Graph API Explorer (igUserId, pageId, phoneNumberId)</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                <KeyRound className="mr-1 inline-block h-3 w-3 -translate-y-px" />
                Meta access token
                <span className="ml-1 text-white/30">{existing ? "· re-enter to update" : "· required"}</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={existing ? "(unchanged — type to rotate)" : "EAAxxx... (long-lived)"}
                  className="w-full rounded-lg bg-white/5 px-3 py-2.5 pr-10 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-fuchsia-400/50 font-mono text-[12px]"
                  disabled={saving || deleting}
                  autoComplete="off"
                />
                <button
                  type="button" onClick={() => setShowToken((v) => !v)} tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition hover:text-white"
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-white/30">
                Stored only on the OpenClaw gateway VPS (file mode 600). Never persisted in the Okestria database.
              </p>
            </div>

            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                Display handle <span className="text-white/30">· optional, e.g. @ptxgrowth</span>
              </label>
              <input
                value={displayHandle} onChange={(e) => setDisplayHandle(e.target.value)}
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
                value={igUserId} onChange={(e) => setIgUserId(e.target.value)}
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
                value={facebookPageId} onChange={(e) => setFacebookPageId(e.target.value)}
                placeholder="100000000000000"
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-fuchsia-400/50 font-mono text-[12px]"
                disabled={saving || deleting}
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                <MessageCircle className="mr-1 inline-block h-3 w-3 -translate-y-px text-emerald-300" />
                WhatsApp Phone Number ID <span className="text-white/30">· optional</span>
              </label>
              <input
                value={whatsappPhoneNumberId} onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                placeholder="100000000000000"
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-fuchsia-400/50 font-mono text-[12px]"
                disabled={saving || deleting}
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                Business Account ID <span className="text-white/30">· optional, for Ads/Insights</span>
              </label>
              <input
                value={businessAccountId} onChange={(e) => setBusinessAccountId(e.target.value)}
                placeholder="100000000000000"
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-fuchsia-400/50 font-mono text-[12px]"
                disabled={saving || deleting}
              />
            </div>
          </div>

          {testResult ? (
            <div className={`rounded-xl border px-3 py-2 text-[12.5px] ${
              testResult.ok
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90"
                : "border-rose-400/30 bg-rose-500/10 text-rose-200/90"
            }`}>
              <div className="font-medium">
                {testResult.ok ? "✓ Connection test succeeded" : "✗ Connection test failed"}
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
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-200/90">{error}</div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-200/90">{success}</div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-3">
          <div className="flex items-center gap-2">
            {existing ? (
              <button
                type="button" onClick={handleDelete} disabled={saving || deleting || testing}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/10 px-3.5 text-[12.5px] font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-40"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Remove
              </button>
            ) : null}
            {existing ? (
              <button
                type="button" onClick={handleTest} disabled={saving || deleting || testing}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3.5 text-[12.5px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Server className="h-3.5 w-3.5" />}
                Test connection
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button" onClick={onClose} disabled={saving || deleting}
              className="inline-flex h-9 items-center rounded-full border border-white/12 bg-white/[0.03] px-3.5 text-[12.5px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button" onClick={handleSave} disabled={saving || !canSave}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-fuchsia-400/45 bg-fuchsia-500/15 px-4 text-[12.5px] font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              {existing ? "Update Meta account" : "Save Meta account"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
