"use client";

/**
 * Context + Attachments panel shared by CronJobsModal and SquadOpsModal.
 *
 * ── What this gives the user ──────────────────────────────────────────────
 *   1. Attach a Lead (single business) or a full Lead Generation mission as
 *      frozen context — the backend then prefixes every run with an
 *      [OKESTRIA_LEAD_CHAT_CONTEXT] block built from that source.
 *   2. Upload up to 6 files (15MB each, 25MB total) that the agent can read
 *      at runtime.
 *
 * The component is deliberately *presentation only*: it owns no fetch calls
 * and no global state. The parent passes in lead + mission options and
 * receives back the chosen ids + base64-encoded attachments.
 *
 * Visual language matches the rest of the office HUD: glass-morphism card,
 * subtle cyan accents for "active" states, amber for cron, rose for errors.
 */

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FileText,
  Link2,
  Paperclip,
  Target,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";

/** Matches both CronJobAttachment and SquadTaskAttachment — duck-typed. */
export type AttachmentPayload = {
  filename: string;
  mimeType: string;
  content: string;
  sizeBytes: number;
};

export type LeadOption = {
  id: number;
  label: string;
  sublabel?: string | null;
};

export type MissionOption = {
  id: number;
  label: string;
  sublabel?: string | null;
};

export type LeadContextAttachmentsValue = {
  leadId: number | null;
  leadGenerationJobId: number | null;
  attachments: AttachmentPayload[];
};

export const DEFAULT_ATTACHMENT_LIMITS = {
  maxFiles: 6,
  maxFileBytes: 15 * 1024 * 1024, // 15MB
  maxTotalBytes: 25 * 1024 * 1024, // 25MB
};

type Props = {
  value: LeadContextAttachmentsValue;
  onChange: (next: LeadContextAttachmentsValue) => void;
  leadOptions: LeadOption[];
  missionOptions: MissionOption[];
  /** Tailwind accent color — "cyan" (default) for leads, "amber" for cron, etc. */
  accent?: "cyan" | "amber" | "violet" | "emerald";
  /** When true, the whole section is visually dimmed (e.g. while submitting). */
  disabled?: boolean;
  /** Optional header override. */
  title?: string;
  /** Optional short description above the controls. */
  description?: string;
};

const ACCENT_MAP: Record<NonNullable<Props["accent"]>, { text: string; ring: string; bg: string; border: string; hoverBg: string }> = {
  cyan: {
    text: "text-cyan-300",
    ring: "ring-cyan-500/25",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/25",
    hoverBg: "hover:bg-cyan-500/20",
  },
  amber: {
    text: "text-amber-300",
    ring: "ring-amber-500/25",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    hoverBg: "hover:bg-amber-500/20",
  },
  violet: {
    text: "text-violet-300",
    ring: "ring-violet-500/25",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    hoverBg: "hover:bg-violet-500/20",
  },
  emerald: {
    text: "text-emerald-300",
    ring: "ring-emerald-500/25",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    hoverBg: "hover:bg-emerald-500/20",
  },
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Strip the `data:*;base64,` prefix FileReader.readAsDataURL emits so the
 * server sees pure base64 (the backend won't decode a data-url wrapper).
 */
const stripDataUrlPrefix = (dataUrl: string): string => {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
};

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected file read result."));
        return;
      }
      resolve(stripDataUrlPrefix(result));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });

export function LeadContextAttachmentsSection({
  value,
  onChange,
  leadOptions,
  missionOptions,
  accent = "cyan",
  disabled = false,
  title = "Lead context & attachments",
  description = "Pin a lead or mission so every run sees the same briefing, and drop up to 6 files the agent can read at runtime.",
}: Props) {
  const colors = ACCENT_MAP[accent];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const attachedBytes = useMemo(
    () => value.attachments.reduce((sum, a) => sum + a.sizeBytes, 0),
    [value.attachments],
  );

  const handleLeadChange = useCallback(
    (raw: string) => {
      const next = raw === "" ? null : Number(raw);
      onChange({
        ...value,
        leadId: Number.isFinite(next) ? next : null,
        // Picking a lead clears the mission pick (they're mutually exclusive
        // inside the session context block — backend respects whichever is set).
        leadGenerationJobId: Number.isFinite(next) ? null : value.leadGenerationJobId,
      });
    },
    [onChange, value],
  );

  const handleMissionChange = useCallback(
    (raw: string) => {
      const next = raw === "" ? null : Number(raw);
      onChange({
        ...value,
        leadGenerationJobId: Number.isFinite(next) ? next : null,
        leadId: Number.isFinite(next) ? null : value.leadId,
      });
    },
    [onChange, value],
  );

  const handleFilesSelected = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setPickerError(null);

      const picked = Array.from(files);
      const remainingSlots = DEFAULT_ATTACHMENT_LIMITS.maxFiles - value.attachments.length;
      if (remainingSlots <= 0) {
        setPickerError(`Maximum ${DEFAULT_ATTACHMENT_LIMITS.maxFiles} files already attached.`);
        return;
      }

      const toAdd = picked.slice(0, remainingSlots);
      if (toAdd.length < picked.length) {
        setPickerError(`Only the first ${toAdd.length} file(s) were added — ${DEFAULT_ATTACHMENT_LIMITS.maxFiles}-file cap.`);
      }

      const over = toAdd.find((f) => f.size > DEFAULT_ATTACHMENT_LIMITS.maxFileBytes);
      if (over) {
        setPickerError(`"${over.name}" is ${formatBytes(over.size)} — max per file is ${formatBytes(DEFAULT_ATTACHMENT_LIMITS.maxFileBytes)}.`);
        return;
      }

      const projectedTotal =
        attachedBytes + toAdd.reduce((sum, f) => sum + f.size, 0);
      if (projectedTotal > DEFAULT_ATTACHMENT_LIMITS.maxTotalBytes) {
        setPickerError(
          `Total payload ${formatBytes(projectedTotal)} exceeds ${formatBytes(DEFAULT_ATTACHMENT_LIMITS.maxTotalBytes)}. Remove a file or pick smaller ones.`,
        );
        return;
      }

      try {
        const encoded = await Promise.all(
          toAdd.map(async (file) => ({
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            content: await readFileAsBase64(file),
            sizeBytes: file.size,
          })),
        );
        onChange({ ...value, attachments: [...value.attachments, ...encoded] });
      } catch (err) {
        setPickerError(err instanceof Error ? err.message : "Failed to read file.");
      }
    },
    [attachedBytes, onChange, value],
  );

  const handleRemoveAttachment = useCallback(
    (idx: number) => {
      onChange({ ...value, attachments: value.attachments.filter((_, i) => i !== idx) });
    },
    [onChange, value],
  );

  const handleClearContext = useCallback(() => {
    onChange({ ...value, leadId: null, leadGenerationJobId: null });
  }, [onChange, value]);

  return (
    <div
      className={`rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/5 transition ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
            <Link2 className="h-3.5 w-3.5" />
            {title}
          </div>
          {description && (
            <p className="mt-1 text-xs text-white/45">{description}</p>
          )}
        </div>
        {(value.leadId || value.leadGenerationJobId) && (
          <button
            type="button"
            onClick={handleClearContext}
            className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white/50 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Pickers — lead + mission, mutually exclusive */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ContextPicker
          label="Pin a lead"
          icon={Target}
          emptyLabel="No specific lead"
          options={leadOptions}
          selectedId={value.leadId}
          onChange={handleLeadChange}
          accent={colors}
          disabled={disabled}
        />
        <ContextPicker
          label="Pin a mission"
          icon={FileText}
          emptyLabel="No specific mission"
          options={missionOptions}
          selectedId={value.leadGenerationJobId}
          onChange={handleMissionChange}
          accent={colors}
          disabled={disabled}
        />
      </div>

      {/* Attachments */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-white/60">
            <Paperclip className="h-3.5 w-3.5" />
            Attachments
            <span className="text-white/30">
              · {value.attachments.length}/{DEFAULT_ATTACHMENT_LIMITS.maxFiles} ·{" "}
              {formatBytes(attachedBytes)} of {formatBytes(DEFAULT_ATTACHMENT_LIMITS.maxTotalBytes)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || value.attachments.length >= DEFAULT_ATTACHMENT_LIMITS.maxFiles}
            className={`inline-flex items-center gap-1.5 rounded-md ${colors.bg} px-2.5 py-1.5 text-[11px] font-medium ${colors.text} ring-1 ${colors.ring} transition ${colors.hoverBg} disabled:opacity-40`}
          >
            <Upload className="h-3 w-3" />
            Add files
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFilesSelected(e.target.files);
            // Reset input so the same file can be re-picked after removal.
            e.target.value = "";
          }}
        />

        {value.attachments.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-white/10 bg-black/20 px-4 py-5 text-center text-xs text-white/40">
            No files attached yet. Max {DEFAULT_ATTACHMENT_LIMITS.maxFiles} files ·{" "}
            {formatBytes(DEFAULT_ATTACHMENT_LIMITS.maxFileBytes)} each.
          </div>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {value.attachments.map((file, idx) => (
              <li
                key={`${file.filename}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2 ring-1 ring-white/5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${colors.text}`} />
                  <span className="truncate text-xs text-white/80">{file.filename}</span>
                  <span className="text-[10px] text-white/35">{formatBytes(file.sizeBytes)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="rounded-md p-1 text-white/40 transition hover:bg-rose-500/10 hover:text-rose-300"
                  title="Remove file"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {pickerError && (
          <div className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 ring-1 ring-rose-500/20">
            {pickerError}
          </div>
        )}
      </div>
    </div>
  );
}

type PickerProps = {
  label: string;
  icon: LucideIcon;
  emptyLabel: string;
  options: { id: number; label: string; sublabel?: string | null }[];
  selectedId: number | null;
  onChange: (rawValue: string) => void;
  accent: (typeof ACCENT_MAP)[keyof typeof ACCENT_MAP];
  disabled?: boolean;
};

function ContextPicker({
  label,
  icon: Icon,
  emptyLabel,
  options,
  selectedId,
  onChange,
  accent,
  disabled,
}: PickerProps): ReactNode {
  const isPicked = selectedId !== null;
  return (
    <label className={`block ${disabled ? "opacity-60" : ""}`}>
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/50">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <div
        className={`relative flex items-center rounded-lg bg-black/40 ring-1 transition ${
          isPicked ? `${accent.ring} ${accent.bg}` : "ring-white/10 hover:ring-white/20"
        }`}
      >
        <select
          value={selectedId ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none bg-transparent px-3 py-2 text-sm ${
            isPicked ? accent.text : "text-white/70"
          } outline-none`}
        >
          <option value="" className="bg-slate-900">
            {emptyLabel}
          </option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-slate-900">
              {opt.label}
              {opt.sublabel ? ` — ${opt.sublabel}` : ""}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

export default LeadContextAttachmentsSection;
