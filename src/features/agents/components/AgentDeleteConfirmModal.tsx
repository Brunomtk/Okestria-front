"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2, X as XIcon } from "lucide-react";
import type { DeleteAgentSummary } from "@/lib/agents/backend-api";

type AgentDeleteConfirmModalProps = {
  open: boolean;
  agentName: string;
  agentSlug?: string | null;
  /** Loaded asynchronously while the modal opens. */
  summary: DeleteAgentSummary | null;
  loading: boolean;
  busy: boolean;
  /** Surface for any preview-fetch error so the operator knows what's missing. */
  loadError?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * v104 — Polished confirmation modal for deleting an agent.
 *
 * Replaces the old `window.confirm("Delete X?")` with a dialog that
 * lists exactly what the cascade-delete will wipe (cron jobs, runs,
 * squad memberships, files), pulled from the back's
 * `GET /api/Agents/delete/{id}/preview` endpoint.
 */
export function AgentDeleteConfirmModal({
  open,
  agentName,
  agentSlug,
  summary,
  loading,
  busy,
  loadError,
  onCancel,
  onConfirm,
}: AgentDeleteConfirmModalProps) {
  // Esc closes the modal (unless we're mid-delete).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const hasCascade =
    !!summary &&
    (summary.cronJobsAffected > 0 ||
      summary.cronJobRunsAffected > 0 ||
      summary.squadMembershipsAffected > 0 ||
      summary.filesAffected > 0 ||
      summary.hasProfile);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-agent-title"
    >
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <section className="relative z-[121] flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-red-400/35 bg-[#13080a] shadow-[0_30px_90px_rgba(0,0,0,.7)]">
        <header className="flex items-start gap-3 border-b border-white/10 px-5 py-4">
          <span
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-red-500/15"
            aria-hidden
          >
            <AlertTriangle className="h-4 w-4 text-red-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="delete-agent-title" className="text-base font-semibold text-white">
              Apagar agente “{agentName}”?
            </h2>
            <p className="mt-0.5 text-[12px] text-white/55">
              {agentSlug ? <span className="font-mono">{agentSlug}</span> : null}
              {agentSlug ? " · " : null}Ação irreversível.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Cancel"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-3 px-5 py-4 text-sm text-white/80">
          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white/55">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Calculando o que será apagado…
            </div>
          ) : null}

          {!loading && loadError ? (
            <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-200/85">
              Não consegui carregar a prévia ({loadError}). A exclusão ainda
              segue, mas você não vai ver os contadores de antemão.
            </div>
          ) : null}

          {!loading && summary && summary.warning ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-200/90">
              <AlertTriangle className="mr-1 inline-block h-3.5 w-3.5 -translate-y-px" />
              {summary.warning}
            </div>
          ) : null}

          {!loading && summary ? (
            hasCascade ? (
              <>
                <p className="text-[13px] text-white/75">
                  Isto também vai apagar:
                </p>
                <ul className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white/82">
                  {summary.cronJobsAffected > 0 ? (
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-red-400/80" />
                      <span>
                        <strong className="text-white">{summary.cronJobsAffected}</strong>{" "}
                        cron{summary.cronJobsAffected === 1 ? "" : "s"}
                        {summary.cronJobRunsAffected > 0 ? (
                          <>
                            {" "}
                            <span className="text-white/55">
                              ({summary.cronJobRunsAffected} run
                              {summary.cronJobRunsAffected === 1 ? "" : "s"} no histórico)
                            </span>
                          </>
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
                  {summary.squadMembershipsAffected > 0 ? (
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-red-400/80" />
                      <span>
                        Remove o agente de{" "}
                        <strong className="text-white">{summary.squadMembershipsAffected}</strong>{" "}
                        squad{summary.squadMembershipsAffected === 1 ? "" : "s"}
                        {summary.squadNames.length > 0 ? (
                          <span className="ml-1 text-white/55">
                            — {summary.squadNames.slice(0, 3).join(", ")}
                            {summary.squadNames.length > 3 ? "…" : ""}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ) : null}
                  {summary.filesAffected > 0 ? (
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-red-400/80" />
                      <span>
                        <strong className="text-white">{summary.filesAffected}</strong> arquivo
                        {summary.filesAffected === 1 ? "" : "s"} do agente (IDENTITY, SOUL,
                        AGENTS, etc.)
                      </span>
                    </li>
                  ) : null}
                  {summary.hasProfile ? (
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-red-400/80" />
                      <span>O profile do agente (Soul / Vibe / Boundaries / etc.).</span>
                    </li>
                  ) : null}
                </ul>
                <p className="text-[12px] text-white/45">
                  Os arquivos do workspace na VPS do gateway não são tocados.
                </p>
              </>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white/75">
                Esse agente não tem cron jobs, squads, nem arquivos atrelados —
                exclusão direta.
              </div>
            )
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-full border border-white/12 bg-white/[0.03] px-3.5 text-[12.5px] text-white/75 transition hover:bg-white/10 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-400/45 bg-red-500/20 px-4 text-[12.5px] font-medium text-red-100 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>{busy ? "Apagando…" : "Apagar agente"}</span>
          </button>
        </footer>
      </section>
    </div>
  );
}

/**
 * v104 — Hook to manage modal state + preview fetch in OfficeScreen.
 * Exposes the open/close handlers and an `await openAndAwait()` flow
 * that resolves to the user's decision (true=confirm, false=cancel).
 *
 * Use directly in the screen component:
 *   const { renderModal, requestDelete } = useAgentDeleteConfirmModal({ fetchPreview });
 *   const ok = await requestDelete({ agentName, agentSlug, gatewayAgentId });
 *   if (!ok) return;
 *   ... actually delete the agent ...
 *   {renderModal()}
 */
type UseAgentDeleteConfirmModalParams = {
  fetchPreview: (gatewayAgentId: string) => Promise<DeleteAgentSummary | null>;
};

type ResolveFn = (decision: boolean) => void;

export function useAgentDeleteConfirmModal({
  fetchPreview,
}: UseAgentDeleteConfirmModalParams) {
  const [state, setState] = useState<{
    open: boolean;
    agentName: string;
    agentSlug: string | null;
    summary: DeleteAgentSummary | null;
    loading: boolean;
    busy: boolean;
    loadError: string | null;
    resolve: ResolveFn | null;
  }>({
    open: false,
    agentName: "",
    agentSlug: null,
    summary: null,
    loading: false,
    busy: false,
    loadError: null,
    resolve: null,
  });

  const requestDelete = (params: {
    agentName: string;
    agentSlug?: string | null;
    gatewayAgentId: string;
  }): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        agentName: params.agentName,
        agentSlug: params.agentSlug ?? null,
        summary: null,
        loading: true,
        busy: false,
        loadError: null,
        resolve,
      });

      fetchPreview(params.gatewayAgentId)
        .then((summary) => {
          setState((prev) =>
            prev.open ? { ...prev, summary, loading: false } : prev,
          );
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          setState((prev) =>
            prev.open ? { ...prev, loading: false, loadError: message } : prev,
          );
        });
    });
  };

  const onCancel = () => {
    setState((prev) => {
      prev.resolve?.(false);
      return { ...prev, open: false, resolve: null };
    });
  };

  const onConfirm = () => {
    setState((prev) => {
      if (!prev.open || prev.busy) return prev;
      prev.resolve?.(true);
      return { ...prev, busy: true };
    });
  };

  // Caller calls this after the destructive action finishes (success or error)
  // to dismiss the modal and reset state.
  const close = () => {
    setState((prev) => ({ ...prev, open: false, busy: false, resolve: null }));
  };

  const renderModal = () => (
    <AgentDeleteConfirmModal
      open={state.open}
      agentName={state.agentName}
      agentSlug={state.agentSlug}
      summary={state.summary}
      loading={state.loading}
      busy={state.busy}
      loadError={state.loadError}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );

  return { renderModal, requestDelete, close };
}
