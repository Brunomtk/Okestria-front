"use client";

/**
 * v115 — Per-user email account configuration modal.
 *
 * Lives in user settings. The user enters their personal IMAP/SMTP
 * credentials; on save the back persists the metadata (no password)
 * and pushes the password through the OpenClaw bridge to be written
 * on the gateway VPS as a himalaya config the agents can use.
 *
 * Squad task dispatch then injects an "EMAIL ACCESS" hint into the
 * agent's prompt pointing at the on-disk config — so any agent can
 * read or send email from the dispatching user's mailbox.
 *
 * The password field is one-way: the back never sends it back. To
 * rotate, the user re-types it. The "Configured ✓" banner shows when
 * a config is on file but the password field is intentionally blank.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AtSign,
  Check,
  Eye,
  EyeOff,
  Inbox,
  KeyRound,
  Loader2,
  Mail,
  Send,
  Server,
  Trash2,
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

type Props = {
  open: boolean;
  onClose: () => void;
};

const ENCRYPTION_OPTIONS = ["tls", "start-tls", "none"] as const;

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

export function UserEmailConfigModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existing, setExisting] = useState<UserEmailConfig | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<UserEmailConfigTestResult | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState(993);
  const [imapEncryption, setImapEncryption] = useState<string>("tls");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpEncryption, setSmtpEncryption] = useState<string>("start-tls");
  const [password, setPassword] = useState("");

  // Reset & load on open
  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(null);
      setShowPassword(false);
      setPassword("");
      setTestResult(null);
      return;
    }
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
          // Password stays blank — back never returns it.
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
  }, [open]);

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
    () => email.trim().length > 0 && imapHost.trim().length > 0 && smtpHost.trim().length > 0 && password.trim().length > 0,
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
      // v116 — all three dispatch surfaces are wired now:
      //   • squad tasks → injected per-dispatch (back v68+)
      //   • cron jobs   → injected per-dispatch (back v69+)
      //   • chat        → patched into agent TOOLS.md (back v69+)
      setSuccess(
        "Email account saved. Every agent in your company can now use this mailbox in squad tasks, cron jobs and chat.",
      );
      // Wipe the password from memory after save — it's already on disk.
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
      if (!result.ok) {
        setError(result.error || result.stderr || "Connection test failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (typeof window !== "undefined" && !window.confirm(
      "Delete this email account? Your agents will no longer be able to send/read email from this mailbox. This cannot be undone.",
    )) return;
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-email-config-title"
    >
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={() => {
          if (!saving && !deleting && !testing) onClose();
        }}
      />
      <section className="relative z-[171] flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#0b0e14] shadow-[0_30px_90px_rgba(0,0,0,.75)]">
        <header className="flex items-start gap-3 border-b border-white/10 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30">
            <Mail className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
              Email account
            </div>
            <h2 id="user-email-config-title" className="mt-0.5 text-base font-semibold text-white">
              Configure your mailbox
            </h2>
            <p className="mt-0.5 text-[12px] text-white/55">
              Agents in your company can use this mailbox to read inbox and send replies on your behalf.
            </p>
            {/* v116 — three pills showing every dispatch surface this
                mailbox is wired into. Helps the operator understand the
                blast radius BEFORE saving (chat especially is non-obvious
                because it's the agent's TOOLS.md that gets patched). */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em]">
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
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            aria-label="Close"
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

          {/* Status banner */}
          {existing ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-100/90">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <div>
                <div className="font-medium text-emerald-100">Configured ✓</div>
                <div className="mt-0.5 text-[11.5px] text-emerald-200/80">
                  Wired to <strong>{existing.email}</strong>. Re-enter the password to update credentials. Other agents in your company will use this mailbox.
                </div>
                {existing.lastTestedAtUtc ? (
                  <div className="mt-1 text-[11px] text-white/45">
                    Last test:{" "}
                    {existing.lastTestSucceeded ? (
                      <span className="text-emerald-300">✓ ok</span>
                    ) : (
                      <span className="text-rose-300">✗ {existing.lastTestError ?? "failed"}</span>
                    )}
                    {" · "}
                    {RELATIVE_TIME(existing.lastTestedAtUtc)}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Presets */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Quick presets
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(EMAIL_PRESETS) as Array<keyof typeof EMAIL_PRESETS>).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-100"
                >
                  {key}
                </button>
              ))}
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
                <label className="mb-1.5 block text-xs font-medium text-white/55">Port</label>
                <input
                  type="number"
                  value={imapPort}
                  onChange={(e) => setImapPort(Number(e.target.value) || 0)}
                  className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/50"
                  disabled={saving || deleting}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/55">Encryption</label>
                <select
                  value={imapEncryption}
                  onChange={(e) => setImapEncryption(e.target.value)}
                  className="w-full rounded-lg bg-white/5 px-2 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/50 [&>option]:bg-slate-900"
                  disabled={saving || deleting}
                >
                  {ENCRYPTION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
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
                <label className="mb-1.5 block text-xs font-medium text-white/55">Port</label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value) || 0)}
                  className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/50"
                  disabled={saving || deleting}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/55">Encryption</label>
                <select
                  value={smtpEncryption}
                  onChange={(e) => setSmtpEncryption(e.target.value)}
                  className="w-full rounded-lg bg-white/5 px-2 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-cyan-400/50 [&>option]:bg-slate-900"
                  disabled={saving || deleting}
                >
                  {ENCRYPTION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
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
                  placeholder={existing ? "(unchanged — type to rotate)" : "Your mailbox password or app password"}
                  className="w-full rounded-lg bg-white/5 px-3 py-2.5 pr-10 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-400/50"
                  disabled={saving || deleting}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-white/30">
                Stored only on the OpenClaw gateway VPS (file mode 600). Never persisted in the Okestria database.
                Gmail / Outlook with 2FA: use an app password.
              </p>
            </div>
          </div>

          {/* Test result inline */}
          {testResult ? (
            <div
              className={`rounded-xl border px-3 py-2 text-[12.5px] ${
                testResult.ok
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90"
                  : "border-rose-400/30 bg-rose-500/10 text-rose-200/90"
              }`}
            >
              <div className="font-medium">
                {testResult.ok ? "✓ Connection test succeeded" : "✗ Connection test failed"}
              </div>
              {testResult.stdout ? (
                <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-white/55">{testResult.stdout}</pre>
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

        <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-3">
          <div className="flex items-center gap-2">
            {existing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || deleting || testing}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/10 px-3.5 text-[12.5px] font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-40"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Server className="h-3.5 w-3.5" />}
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
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !canSave}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-cyan-400/45 bg-cyan-500/15 px-4 text-[12.5px] font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              {existing ? "Update mailbox" : "Save mailbox"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
