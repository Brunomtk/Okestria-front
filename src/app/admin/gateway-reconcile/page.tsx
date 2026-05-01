import { ShieldAlert } from "lucide-react";
import { PageHeader } from "../_components/AdminUI";
import { GatewayReconcilerClient } from "./_components/GatewayReconcilerClient";

/**
 * v169 — Admin · Gateway agent reconciler.
 * v170 — also covers cron jobs (any cron whose target agentId has no
 *         back DB row is flagged as orphan).
 *
 * Lists every OpenClaw gateway agent + every cron, flags orphans,
 * and lets the operator garbage-collect them in one click. This is
 * the "hard fence" backing the soft prohibition the v87 composer
 * injects into every TOOLS.md (forbidden RPCs: agents.create,
 * cron.add against another agent, config.set / patch, sessions.*
 * on other agents, exec.approvals.set, skills.install, etc.).
 * Anything an agent sneaks past the prohibition shows up here.
 *
 * All cross-referencing happens in the API routes — the client just
 * renders the tables, posts deletes, and refreshes.
 */

export default function AdminGatewayReconcilePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Gateway"
        title="Reconcile gateway"
        subtitle="Cross-reference OpenClaw's agents.list and cron.list against the back DB and garbage-collect orphans. Orphans are records that exist on the gateway but have no matching back row — typically left behind by an autonomous agent calling agents.create or cron.add behind our back."
        right={<ShieldAlert className="h-5 w-5 text-rose-300" />}
      />
      <GatewayReconcilerClient />
    </div>
  );
}
