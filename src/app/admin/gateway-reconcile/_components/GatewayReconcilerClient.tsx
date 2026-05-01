"use client";

/**
 * v169 — Reconciler client.
 * v170 — extended to also reconcile cron jobs. Two tables, one page:
 *   • Orphan AGENTS  → POST /api/admin/gateway-reconcile/delete
 *   • Orphan CRONS   → POST /api/admin/gateway-crons/remove (v165)
 *
 * On mount + every "Refresh" click, both GETs run in parallel:
 *   • /api/admin/gateway-reconcile/list       — agents
 *   • /api/admin/gateway-reconcile/list-crons — crons
 * Each tags rows with `isOrphan: true` when the gateway has the
 * record but the back doesn't.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { Section, StatCard, StatusPill } from "../../_components/AdminUI";

type ReconcileItem = {
  gatewayAgentId: string;
  gatewayName: string | null;
  isOrphan: boolean;
  backendAgentId: number | null;
  backendName: string | null;
  backendCompanyId: number | null;
  backendCompanyName: string | null;
};

type ReconcileResponse = {
  ok?: boolean;
  items?: ReconcileItem[];
  summary?: { totalGateway: number; totalBack: number; orphans: number };
  error?: string;
};

// v170 — orphan cron rows.
type CronReportItem = {
  cronId: string;
  cronName: string | null;
  agentId: string | null;
  isOrphan: boolean;
  enabled: boolean;
  backendCompanyName: string | null;
  nextRunAtMs: number | null;
  lastStatus: string | null;
  scheduleSummary: string;
};

type CronReconcileResponse = {
  ok?: boolean;
  items?: CronReportItem[];
  summary?: { totalCrons: number; orphans: number };
  error?: string;
};

type Banner =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string }
  | null;

export function GatewayReconcilerClient() {
  const [items, setItems] = useState<ReconcileItem[]>([]);
  const [summary, setSummary] = useState<{ totalGateway: number; totalBack: number; orphans: number } | null>(null);
  // v170 — cron state lives next to the agent state; both refresh together.
  const [crons, setCrons] = useState<CronReportItem[]>([]);
  const [cronSummary, setCronSummary] = useState<{ totalCrons: number; orphans: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmOne, setConfirmOne] = useState<ReconcileItem | null>(null);
  // v170 — separate confirm state for crons so deletes don't collide.
  const [busyCronId, setBusyCronId] = useState<string | null>(null);
  const [confirmCronOne, setConfirmCronOne] = useState<CronReportItem | null>(null);
  const [confirmCronBulk, setConfirmCronBulk] = useState(false);
  const [bulkCronBusy, setBulkCronBusy] = useState(false);

  const showBanner = useCallback((b: Banner) => {
    setBanner(b);
    if (b) {
      window.setTimeout(() => setBanner((cur) => (cur === b ? null : cur)), 4500);
    }
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      // v170 — agents + crons in parallel; one failing doesn't poison the other.
      const [agentsResult, cronsResult] = await Promise.allSettled([
        fetch("/api/admin/gateway-reconcile/list", { cache: "no-store" }).then((res) =>
          res.json().then((json) => ({ res, json: json as ReconcileResponse })),
        ),
        fetch("/api/admin/gateway-reconcile/list-crons", { cache: "no-store" }).then((res) =>
          res.json().then((json) => ({ res, json: json as CronReconcileResponse })),
        ),
      ]);

      const errors: string[] = [];

      if (agentsResult.status === "fulfilled") {
        const { res, json } = agentsResult.value;
        if (!res.ok || !json.ok) {
          errors.push(json.error ?? `agents HTTP ${res.status}`);
        } else {
          setItems(json.items ?? []);
          setSummary(json.summary ?? null);
        }
      } else {
        errors.push(
          `agents fetch failed: ${
            agentsResult.reason instanceof Error
              ? agentsResult.reason.message
              : String(agentsResult.reason)
          }`,
        );
      }

      if (cronsResult.status === "fulfilled") {
        const { res, json } = cronsResult.value;
        if (!res.ok || !json.ok) {
          errors.push(json.error ?? `crons HTTP ${res.status}`);
        } else {
          setCrons(json.items ?? []);
          setCronSummary(json.summary ?? null);
        }
      } else {
        errors.push(
          `crons fetch failed: ${
            cronsResult.reason instanceof Error
              ? cronsResult.reason.message
              : String(cronsResult.reason)
          }`,
        );
      }

      if (errors.length > 0) {
        showBanner({ kind: "error", text: errors.join(" · ") });
      }
      setLoading(false);
      setRefreshing(false);
    },
    [showBanner],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const deleteOne = useCallback(
    async (item: ReconcileItem) => {
      setBusyId(item.gatewayAgentId);
      try {
        const res = await fetch("/api/admin/gateway-reconcile/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: item.gatewayAgentId }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        showBanner({
          kind: "success",
          text: `Deleted ${item.gatewayName ?? item.gatewayAgentId} from the gateway.`,
        });
        setConfirmOne(null);
        await load("refresh");
      } catch (err) {
        showBanner({
          kind: "error",
          text: err instanceof Error ? err.message : "Delete failed.",
        });
      } finally {
        setBusyId(null);
      }
    },
    [load, showBanner],
  );

  const deleteAllOrphans = useCallback(async () => {
    const orphans = items.filter((i) => i.isOrphan);
    if (orphans.length === 0) return;
    setBulkBusy(true);
    let okCount = 0;
    let failCount = 0;
    for (const orphan of orphans) {
      try {
        const res = await fetch("/api/admin/gateway-reconcile/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: orphan.gatewayAgentId }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        okCount += 1;
      } catch {
        failCount += 1;
      }
    }
    setBulkBusy(false);
    setConfirmBulk(false);
    showBanner({
      kind: failCount > 0 ? "error" : "success",
      text:
        failCount > 0
          ? `Deleted ${okCount} of ${orphans.length} orphans (${failCount} failed).`
          : `Deleted ${okCount} orphans.`,
    });
    await load("refresh");
  }, [items, load, showBanner]);

  // v170 — cron handlers, mirror of the agent ones but hit the
  // gateway-crons remove route (already wired with the v164 origin
  // header + v85 device handshake).
  const deleteOneCron = useCallback(
    async (item: CronReportItem) => {
      setBusyCronId(item.cronId);
      try {
        const res = await fetch("/api/admin/gateway-crons/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.cronId }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        showBanner({
          kind: "success",
          text: `Deleted cron ${item.cronName ?? item.cronId}.`,
        });
        setConfirmCronOne(null);
        await load("refresh");
      } catch (err) {
        showBanner({
          kind: "error",
          text: err instanceof Error ? err.message : "Cron delete failed.",
        });
      } finally {
        setBusyCronId(null);
      }
    },
    [load, showBanner],
  );

  const deleteAllOrphanCrons = useCallback(async () => {
    const orphans = crons.filter((c) => c.isOrphan);
    if (orphans.length === 0) return;
    setBulkCronBusy(true);
    let okCount = 0;
    let failCount = 0;
    for (const orphan of orphans) {
      try {
        const res = await fetch("/api/admin/gateway-crons/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: orphan.cronId }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        okCount += 1;
      } catch {
        failCount += 1;
      }
    }
    setBulkCronBusy(false);
    setConfirmCronBulk(false);
    showBanner({
      kind: failCount > 0 ? "error" : "success",
      text:
        failCount > 0
          ? `Deleted ${okCount} of ${orphans.length} orphan crons (${failCount} failed).`
          : `Deleted ${okCount} orphan crons.`,
    });
    await load("refresh");
  }, [crons, load, showBanner]);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.isOrphan !== b.isOrphan) return a.isOrphan ? -1 : 1;
        return (a.gatewayName ?? a.gatewayAgentId).localeCompare(
          b.gatewayName ?? b.gatewayAgentId,
        );
      }),
    [items],
  );

  const sortedCrons = useMemo(
    () =>
      [...crons].sort((a, b) => {
        if (a.isOrphan !== b.isOrphan) return a.isOrphan ? -1 : 1;
        return (a.cronName ?? a.cronId).localeCompare(b.cronName ?? b.cronId);
      }),
    [crons],
  );

  const orphanCount = summary?.orphans ?? items.filter((i) => i.isOrphan).length;
  const orphanCronCount = cronSummary?.orphans ?? crons.filter((c) => c.isOrphan).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Gateway agents"
          value={summary?.totalGateway ?? items.length}
          icon={ShieldAlert}
          accent="cyan"
        />
        <StatCard
          label="Back DB agents"
          value={summary?.totalBack ?? 0}
          icon={CheckCircle2}
          accent="emerald"
        />
        <StatCard
          label="Orphans"
          value={orphanCount}
          icon={AlertTriangle}
          accent={orphanCount > 0 ? "rose" : "violet"}
          hint={orphanCount > 0 ? "exist on gateway, not in back DB" : "all clean"}
        />
      </div>

      {banner ? (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-[12.5px] leading-relaxed ${
            banner.kind === "error"
              ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
              : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {banner.kind === "error" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 break-words">{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="ml-auto shrink-0 rounded p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <Section
        title={`All gateway agents · ${items.length}`}
        subtitle="orphans (red) on top — they have no matching back DB row"
        accent="rose"
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load("refresh")}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/75 transition hover:bg-white/[0.08] disabled:opacity-40"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setConfirmBulk(true)}
              disabled={bulkBusy || orphanCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-40"
            >
              {bulkBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete all orphans ({orphanCount})
            </button>
          </div>
        }
      >
        <div className="p-5">
          {loading ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-[13px] text-white/65">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
              Loading gateway + back DB agents…
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-[13px] text-white/55">
              No agents on the gateway.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.55)]">
              {sorted.map((item) => (
                <ReconcileRow
                  key={item.gatewayAgentId}
                  item={item}
                  busy={busyId === item.gatewayAgentId}
                  onAskDelete={() => setConfirmOne(item)}
                />
              ))}
            </ul>
          )}
        </div>
      </Section>

      {/* v170 — orphan crons section, mirrors the agents one. */}
      <Section
        title={`Gateway crons · ${crons.length}`}
        subtitle="orphans (red) target an agent that has no back DB row — typically scheduled by an autonomous agent"
        accent="amber"
        right={
          <button
            type="button"
            onClick={() => setConfirmCronBulk(true)}
            disabled={bulkCronBusy || orphanCronCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-40"
          >
            {bulkCronBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete all orphan crons ({orphanCronCount})
          </button>
        }
      >
        <div className="p-5">
          {loading ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-[13px] text-white/65">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
              Loading gateway crons…
            </div>
          ) : sortedCrons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-[13px] text-white/55">
              No cron jobs on the gateway.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/8 bg-[rgba(8,11,20,0.55)]">
              {sortedCrons.map((cron) => (
                <CronReconcileRow
                  key={cron.cronId}
                  cron={cron}
                  busy={busyCronId === cron.cronId}
                  onAskDelete={() => setConfirmCronOne(cron)}
                />
              ))}
            </ul>
          )}
        </div>
      </Section>

      {confirmBulk ? (
        <ConfirmModal
          title="Delete all orphan gateway agents?"
          description={`${orphanCount} agents on OpenClaw have no matching back DB row. They were almost certainly created by an autonomous agent calling agents.create. This cannot be undone.`}
          confirmLabel={`Delete ${orphanCount} orphans`}
          busy={bulkBusy}
          onCancel={() => setConfirmBulk(false)}
          onConfirm={() => void deleteAllOrphans()}
        />
      ) : null}

      {confirmOne ? (
        <ConfirmModal
          title="Delete this gateway agent?"
          description={
            confirmOne.isOrphan
              ? `${confirmOne.gatewayName ?? confirmOne.gatewayAgentId} has no back DB row. Removing it from the gateway is safe.`
              : `${confirmOne.gatewayName ?? confirmOne.gatewayAgentId} HAS a back DB row (${confirmOne.backendName} · ${confirmOne.backendCompanyName}). Deleting from the gateway will leave the back row dangling — you'll have to re-sync via the wizard or recreate.`
          }
          confirmLabel="Delete from gateway"
          warn={!confirmOne.isOrphan}
          busy={busyId === confirmOne.gatewayAgentId}
          onCancel={() => setConfirmOne(null)}
          onConfirm={() => void deleteOne(confirmOne)}
        />
      ) : null}

      {confirmCronBulk ? (
        <ConfirmModal
          title="Delete all orphan crons?"
          description={`${orphanCronCount} cron jobs on OpenClaw target agents that don't exist in the back DB. They will keep firing until removed. This cannot be undone.`}
          confirmLabel={`Delete ${orphanCronCount} crons`}
          busy={bulkCronBusy}
          onCancel={() => setConfirmCronBulk(false)}
          onConfirm={() => void deleteAllOrphanCrons()}
        />
      ) : null}

      {confirmCronOne ? (
        <ConfirmModal
          title="Delete this cron?"
          description={
            confirmCronOne.isOrphan
              ? `${confirmCronOne.cronName ?? confirmCronOne.cronId} targets agent "${confirmCronOne.agentId ?? "(none)"}" which has no back DB row. Removing it is safe.`
              : `${confirmCronOne.cronName ?? confirmCronOne.cronId} is a legitimate cron belonging to ${confirmCronOne.backendCompanyName}. Deleting it will stop the schedule. Re-create from /admin/cron if needed.`
          }
          confirmLabel="Delete cron"
          warn={!confirmCronOne.isOrphan}
          busy={busyCronId === confirmCronOne.cronId}
          onCancel={() => setConfirmCronOne(null)}
          onConfirm={() => void deleteOneCron(confirmCronOne)}
        />
      ) : null}
    </div>
  );
}

// v170 — single cron row inside the reconciler list.
function CronReconcileRow({
  cron,
  busy,
  onAskDelete,
}: {
  cron: CronReportItem;
  busy: boolean;
  onAskDelete: () => void;
}) {
  const fmtNext = (ms: number | null) => {
    if (!ms) return "—";
    const delta = ms - Date.now();
    if (delta <= 0) return "due now";
    if (delta < 60_000) return `${Math.round(delta / 1000)}s`;
    if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m`;
    if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h`;
    return `${Math.round(delta / 86_400_000)}d`;
  };
  return (
    <li
      className={`grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start ${
        cron.isOrphan ? "bg-rose-500/[0.04]" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-white">
            {cron.cronName ?? "(unnamed)"}
          </span>
          {cron.isOrphan ? (
            <StatusPill status="error" label="orphan" />
          ) : cron.enabled ? (
            <StatusPill status="ok" label="armed" />
          ) : (
            <StatusPill status="warn" label="disabled" />
          )}
          {cron.lastStatus === "error" ? (
            <StatusPill status="error" label="last failed" />
          ) : null}
        </div>
        <p className="mt-0.5 font-mono text-[10.5px] text-white/45">
          cron id <span className="text-white/65">{cron.cronId}</span>
          {cron.agentId ? (
            <>
              {" · "}targets <span className="text-cyan-200/85">{cron.agentId}</span>
            </>
          ) : (
            <>
              {" · "}
              <span className="text-rose-300/85">no agent</span>
            </>
          )}
          {cron.backendCompanyName ? (
            <>
              {" · "}
              <span className="text-emerald-200/85">{cron.backendCompanyName}</span>
            </>
          ) : null}
        </p>
        <p className="mt-1 text-[12px] text-white/75">
          {cron.scheduleSummary} · next in {fmtNext(cron.nextRunAtMs)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onAskDelete}
          disabled={busy}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-40 ${
            cron.isOrphan
              ? "border border-rose-400/45 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
              : "border border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
          }`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </button>
      </div>
    </li>
  );
}

function ReconcileRow({
  item,
  busy,
  onAskDelete,
}: {
  item: ReconcileItem;
  busy: boolean;
  onAskDelete: () => void;
}) {
  return (
    <li
      className={`grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start ${
        item.isOrphan ? "bg-rose-500/[0.04]" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-white">
            {item.gatewayName ?? "(unnamed)"}
          </span>
          {item.isOrphan ? (
            <StatusPill status="error" label="orphan" />
          ) : (
            <StatusPill status="ok" label="linked" />
          )}
        </div>
        <p className="mt-0.5 font-mono text-[10.5px] text-white/45">
          gateway id <span className="text-white/65">{item.gatewayAgentId}</span>
          {item.backendAgentId !== null ? (
            <>
              {" · "}back #{item.backendAgentId}
              {item.backendCompanyName ? (
                <>
                  {" · "}
                  <span className="text-cyan-200/85">{item.backendCompanyName}</span>
                </>
              ) : null}
            </>
          ) : (
            <>
              {" · "}
              <span className="text-rose-300/85">no back DB row</span>
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onAskDelete}
          disabled={busy}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-40 ${
            item.isOrphan
              ? "border border-rose-400/45 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
              : "border border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
          }`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </button>
      </div>
    </li>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  busy,
  warn,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  warn?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl border p-5 ${
        warn
          ? "border-amber-400/40 bg-[rgba(13,16,28,0.96)]"
          : "border-rose-400/30 bg-[rgba(13,16,28,0.95)]"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            warn ? "bg-amber-500/15 text-amber-200" : "bg-rose-500/15 text-rose-200"
          }`}>
            {warn ? <AlertTriangle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-[14.5px] font-semibold text-white">{title}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-white/65">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/75 transition hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-40 ${
              warn
                ? "border-amber-400/45 bg-amber-500/25 text-amber-100 hover:bg-amber-500/35"
                : "border-rose-400/45 bg-rose-500/25 text-rose-100 hover:bg-rose-500/35"
            }`}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
