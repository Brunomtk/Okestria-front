"use client";

/**
 * v111 — Squad Edit / Delete modal.
 *
 * One modal, two modes, kept as a single component because the
 * operator workflow flows naturally between them: open → edit name &
 * description → click "Delete squad" → confirm → done.
 *
 * Edit form covers the metadata that's safe to change inline (name,
 * description, emoji, color). Member changes still happen in the
 * dedicated Squad Ops modal — surfacing them here would double the
 * UX surface for no real benefit.
 *
 * Delete flow does a preview fetch first so the operator sees an
 * honest count of what's about to be wiped (cron jobs, runs,
 * tasks, executions) and what's preserved (the agents themselves
 * stay; lead missions are detached, not deleted). Mirrors the
 * agent-delete confirm modal we already ship in v105.
 *
 * z-index sits at 170 so it floats above the squad ops modal (z-160)
 * if the operator opens both at once.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Layers,
  Loader2,
  Save,
  Smile,
  Sparkles,
  Trash2,
  Users,
  X as XIcon,
} from "lucide-react";
import {
  previewCompanySquadDelete,
  type DeleteSquadSummary,
  type SquadSummary,
} from "@/lib/squads/api";

type Mode = "edit" | "confirm-delete";

type SquadEditDeleteModalProps = {
  open: boolean;
  squad: SquadSummary | null;
  /** Called when the user submits the edit form. Parent is in charge of
   *  calling `updateCompanySquad` + reloading the list. */
  onSave: (input: { name: string; description: string; iconEmoji: string | null; color: string | null }) => Promise<void>;
  /** Called after the user confirms the destructive action. Parent
   *  performs the delete + closes the modal on success. */
  onConfirmDelete: () => Promise<void>;
  onClose: () => void;
};

const DEFAULT_PALETTE = [
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#facc15",
];

export function SquadEditDeleteModal({
  open,
  squad,
  onSave,
  onConfirmDelete,
  onClose,
}: SquadEditDeleteModalProps) {
  const [mode, setMode] = useState<Mode>("edit");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconEmoji, setIconEmoji] = useState<string>("");
  const [color, setColor] = useState<string>(DEFAULT_PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DeleteSquadSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Reset every field when the squad behind the modal changes (or when
  // the modal closes). Avoids leaking edits from one squad into another.
  useEffect(() => {
    if (!open || !squad) {
      setMode("edit");
      setName("");
      setDescription("");
      setIconEmoji("");
      setColor(DEFAULT_PALETTE[0]);
      setSaving(false);
      setDeleting(false);
      setError(null);
      setSummary(null);
      setSummaryLoading(false);
      setSummaryError(null);
      return;
    }
    setName(squad.name ?? "");
    setDescription(squad.description ?? "");
    setIconEmoji(squad.iconEmoji ?? "");
    setColor(squad.color || DEFAULT_PALETTE[0]);
    setMode("edit");
    setError(null);
    setSummary(null);
    setSummaryError(null);
  }, [open, squad?.id]);

  // Esc closes the modal (unless we're mid-save / mid-delete).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving && !deleting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, saving, deleting, onClose]);

  const memberCount = squad?.members?.length ?? 0;

  const dirty = useMemo(() => {
    if (!squad) return false;
    return (
      (name.trim() || "") !== (squad.name ?? "") ||
      (description.trim() || "") !== (squad.description ?? "") ||
      (iconEmoji.trim() || "") !== (squad.iconEmoji ?? "") ||
      (color || "") !== (squad.color ?? "")
    );
  }, [squad, name, description, iconEmoji, color]);

  const handleEnterDeleteMode = async () => {
    if (!squad) return;
    setMode("confirm-delete");
    setSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      const persistedId = Number(squad.id);
      if (!Number.isFinite(persistedId) || persistedId <= 0) {
        // Local-only squad (no backend id) — skip the preview, the
        // delete will just clear local state.
        setSummaryLoading(false);
        return;
      }
      const preview = await previewCompanySquadDelete({ squadId: persistedId });
      setSummary(preview);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : String(err));
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSave = async () => {
    if (!squad) return;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        iconEmoji: iconEmoji.trim() || null,
        color: color || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!squad) return;
    setDeleting(true);
    setError(null);
    try {
      await onConfirmDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  };

  if (!open || !squad) return null;

  return (
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="squad-edit-title"
    >
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={() => {
          if (!saving && !deleting) onClose();
        }}
      />

      <section
        className="relative z-[171] flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border bg-[#0b0e14] shadow-[0_30px_90px_rgba(0,0,0,.7)]"
        style={{ borderColor: mode === "confirm-delete" ? "#fb7185aa" : `${color || "#f59e0b"}55` }}
      >
        <header className="flex items-start gap-3 border-b border-white/10 px-5 py-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base"
            style={{
              backgroundColor: `${color || "#f59e0b"}20`,
              border: `1.5px solid ${color || "#f59e0b"}55`,
              color: color || "#f59e0b",
            }}
            aria-hidden
          >
            {iconEmoji?.trim() || squad.iconEmoji?.trim() || "🛡️"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">
              {mode === "confirm-delete" ? "Delete squad" : "Edit squad"}
            </div>
            <h2
              id="squad-edit-title"
              className="mt-0.5 truncate text-base font-semibold text-white"
            >
              {squad.name}
            </h2>
            <p className="mt-0.5 text-[12px] text-white/55">
              {memberCount} member{memberCount === 1 ? "" : "s"} · members are
              never deleted with the squad.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            aria-label="Close squad editor"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </header>

        {mode === "edit" ? (
          <div className="space-y-4 px-5 py-5">
            <div>
              <label
                htmlFor="squad-edit-name"
                className="mb-1.5 block text-xs font-medium text-white/55"
              >
                Squad name
              </label>
              <input
                id="squad-edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Squad Comercial"
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-amber-400/50"
                disabled={saving || deleting}
              />
            </div>

            <div>
              <label
                htmlFor="squad-edit-description"
                className="mb-1.5 block text-xs font-medium text-white/55"
              >
                Description{" "}
                <span className="text-white/30">· optional</span>
              </label>
              <textarea
                id="squad-edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One sentence about what this squad owns. Shown in the company overview."
                rows={3}
                className="w-full resize-none rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-amber-400/50"
                disabled={saving || deleting}
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label
                  htmlFor="squad-edit-emoji"
                  className="mb-1.5 block text-xs font-medium text-white/55"
                >
                  <Smile className="mr-1 inline-block h-3 w-3 -translate-y-px" />
                  Emoji
                </label>
                <input
                  id="squad-edit-emoji"
                  value={iconEmoji}
                  onChange={(e) => setIconEmoji(e.target.value.slice(0, 4))}
                  placeholder="🛡️"
                  className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-center text-base text-white outline-none ring-1 ring-white/10 focus:ring-amber-400/50"
                  disabled={saving || deleting}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/55">
                  Color
                </label>
                <div className="flex items-center gap-1.5 rounded-lg bg-white/5 p-2 ring-1 ring-white/10">
                  {DEFAULT_PALETTE.map((swatch) => {
                    const isActive = color === swatch;
                    return (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => setColor(swatch)}
                        disabled={saving || deleting}
                        title={swatch}
                        className={`h-6 w-6 rounded-full transition ${
                          isActive
                            ? "scale-110 ring-2 ring-white/80"
                            : "opacity-75 ring-1 ring-white/10 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: swatch }}
                        aria-label={`Pick color ${swatch}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-200/85">
                {error}
              </div>
            ) : null}

            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[12px] text-white/55">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                Tip
              </div>
              <div className="mt-1">
                Members are managed in <span className="font-medium text-white/75">Squad Ops</span>.
                The agents themselves are <span className="font-medium text-white/75">never</span>{" "}
                deleted when you delete a squad.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 px-5 py-5 text-sm text-white/80">
            {summaryLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white/55">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Calculating what will be removed…
              </div>
            ) : null}

            {!summaryLoading && summaryError ? (
              <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-200/85">
                Could not load the preview ({summaryError}). The deletion will
                still proceed, but you won't see the impact counts up front.
              </div>
            ) : null}

            {!summaryLoading && summary ? (
              <>
                <p className="text-[13px] text-white/75">
                  Deleting <strong className="text-white">{squad.name}</strong>{" "}
                  will remove every record below. This cannot be undone.
                </p>
                <ul className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white/82">
                  {summary.tasksAffected > 0 ? (
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-red-400/80" />
                      <span>
                        <strong className="text-white">{summary.tasksAffected}</strong>{" "}
                        squad task{summary.tasksAffected === 1 ? "" : "s"}
                        {summary.taskRunsAffected > 0 ? (
                          <span className="text-white/55">
                            {" "}({summary.taskRunsAffected} run
                            {summary.taskRunsAffected === 1 ? "" : "s"} in history)
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ) : null}
                  {summary.executionsAffected > 0 ? (
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-red-400/80" />
                      <span>
                        <Layers className="mr-1 inline-block h-3 w-3 -translate-y-px text-white/55" />
                        <strong className="text-white">{summary.executionsAffected}</strong>{" "}
                        squad execution{summary.executionsAffected === 1 ? "" : "s"}
                        {summary.executionStepsAffected > 0 ? (
                          <span className="text-white/55">
                            {" "}({summary.executionStepsAffected} step
                            {summary.executionStepsAffected === 1 ? "" : "s"})
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ) : null}
                  {summary.cronJobsAffected > 0 ? (
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-red-400/80" />
                      <span>
                        <Calendar className="mr-1 inline-block h-3 w-3 -translate-y-px text-white/55" />
                        <strong className="text-white">{summary.cronJobsAffected}</strong>{" "}
                        cron job{summary.cronJobsAffected === 1 ? "" : "s"}
                        {summary.cronJobRunsAffected > 0 ? (
                          <span className="text-white/55">
                            {" "}({summary.cronJobRunsAffected} run
                            {summary.cronJobRunsAffected === 1 ? "" : "s"} in history)
                          </span>
                        ) : null}
                        {summary.cronJobNames.length > 0 ? (
                          <span className="ml-1 text-white/55">
                            — {summary.cronJobNames.slice(0, 3).join(", ")}
                            {summary.cronJobNames.length > 3 ? "…" : ""}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ) : null}
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-emerald-400/80" />
                    <span>
                      <Users className="mr-1 inline-block h-3 w-3 -translate-y-px text-emerald-300" />
                      <strong className="text-white">{summary.membersRemoved}</strong>{" "}
                      member{summary.membersRemoved === 1 ? "" : "s"}{" "}
                      <span className="text-emerald-200/85">released — agents are kept</span>
                      {summary.memberAgentNames.length > 0 ? (
                        <span className="ml-1 text-white/55">
                          — {summary.memberAgentNames.slice(0, 3).join(", ")}
                          {summary.memberAgentNames.length > 3 ? "…" : ""}
                        </span>
                      ) : null}
                    </span>
                  </li>
                  {summary.leadJobsDetached > 0 ? (
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-amber-300/80" />
                      <span>
                        <Sparkles className="mr-1 inline-block h-3 w-3 -translate-y-px text-amber-300" />
                        <strong className="text-white">{summary.leadJobsDetached}</strong>{" "}
                        lead mission{summary.leadJobsDetached === 1 ? "" : "s"}{" "}
                        <span className="text-amber-200/85">
                          will be detached, not deleted
                        </span>
                      </span>
                    </li>
                  ) : null}
                </ul>
                <p className="text-[12px] text-white/45">
                  Tasks, executions and cron jobs are wiped together with the
                  squad. The agents themselves stay in the company and can be
                  added to a new squad anytime.
                </p>
              </>
            ) : null}

            {!summaryLoading && !summary && !summaryError ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white/75">
                No tasks, executions or cron jobs are tied to this squad. Only
                the squad row + the member links will be removed; the agents
                themselves stay in the company.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-200/85">
                {error}
              </div>
            ) : null}
          </div>
        )}

        <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-3">
          {mode === "edit" ? (
            <>
              <button
                type="button"
                onClick={handleEnterDeleteMode}
                disabled={saving || deleting}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 px-3.5 text-[12.5px] font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete squad
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="inline-flex h-9 items-center rounded-full border border-white/12 bg-white/[0.03] px-3.5 text-[12.5px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !dirty || !name.trim()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-[12.5px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: `${color || "#f59e0b"}66`,
                    backgroundColor: `${color || "#f59e0b"}20`,
                    color: color || "#f59e0b",
                  }}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>{saving ? "Saving…" : "Save changes"}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMode("edit")}
                disabled={deleting}
                className="inline-flex h-9 items-center rounded-full border border-white/12 bg-white/[0.03] px-3.5 text-[12.5px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
              >
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-amber-300" />
                Back to edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || summaryLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-400/45 bg-red-500/20 px-4 text-[12.5px] font-medium text-red-100 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>{deleting ? "Deleting…" : "Confirm delete"}</span>
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
