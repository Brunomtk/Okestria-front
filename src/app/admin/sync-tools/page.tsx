import {
  AlertTriangle,
  Bot,
  Brain,
  Cog,
  Sparkles,
  Wrench,
} from "lucide-react";
import { requireAdminSession } from "../_lib/admin";
import { PageHeader, Section } from "../_components/AdminUI";
import { safeAdminPage } from "../_lib/safe-page";
import { AdminSyncToolsButton } from "./_components/AdminSyncToolsButton";

/**
 * v156 — Admin · Sync agent TOOLS to OpenClaw.
 *
 * Single-button utility page. Used after a back deploy that
 * touches the auto-injected TOOLS recipe (notes vault + Apify
 * scrape) to push the freshly-composed TOOLS.md into every
 * existing agent's OpenClaw filesystem in one click.
 */

export default async function AdminSyncToolsPage() {
  return safeAdminPage("admin/sync-tools", renderPage);
}

async function renderPage() {
  await requireAdminSession();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations · Maintenance"
        title="Sync agent TOOLS"
        subtitle="One-click push of the recipe-injected TOOLS.md into OpenClaw for every agent across every tenant. Use after a back deploy that updates the auto-injected blocks."
      />

      <AdminSyncToolsButton />

      <Section title="What this does" subtitle="step by step" accent="violet">
        <div className="grid gap-3 p-5 md:grid-cols-3">
          <Step
            icon={Cog}
            n={1}
            title="Re-save profile"
            body="POST /api/Agents/{id}/profile fires SyncProfileFiles → ComposeAutoInjectedToolsAsync. The AgentFile TOOLS row in the DB is rewritten with operator content + auto-injected cortex/Apify recipes."
          />
          <Step
            icon={Brain}
            n={2}
            title="Compose TOOLS.md"
            body="Operator-authored TOOLS notes stay above the markers. Cortex (Obsidian vault) recipe + Apify scrape recipe are inserted between okestria:auto-tools markers."
          />
          <Step
            icon={Bot}
            n={3}
            title="Push to OpenClaw"
            body="Server opens a WebSocket to the gateway proxy and calls agents.files.set with the freshly-composed content for each agent's slug. OpenClaw's filesystem is updated; chat sessions started after see the new TOOLS."
          />
        </div>
      </Section>

      <Section
        title="When to use"
        subtitle="trigger conditions"
        accent="amber"
      >
        <div className="space-y-3 p-5 text-[13px] leading-relaxed text-white/70">
          <p className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/70" />
            <span>
              <strong className="text-white/90">After deploying back v84+</strong> the
              first time, to retrofit the cortex/Apify recipe into every
              agent that already exists. Only needed once per agent per
              recipe change.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/70" />
            <span>
              <strong className="text-white/90">After changing a recipe</strong> in{" "}
              <code className="rounded bg-white/10 px-1 font-mono text-[11px] text-cyan-200">
                AgentRecipeComposer.cs
              </code>{" "}
              and redeploying the back, to flush the new wording out to
              every agent.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/70" />
            <span>
              <strong className="text-white/90">If the office chat agents</strong> stop
              being able to write to the Cortex (or Apify), this is the
              first thing to try — usually means an agent was created
              before the recipe injection landed and never got the
              update.
            </span>
          </p>
        </div>
      </Section>

      <Section
        title="Safety"
        subtitle="what does NOT get touched"
        accent="cyan"
      >
        <div className="space-y-3 p-5 text-[13px] leading-relaxed text-white/70">
          <p>
            <strong className="text-white/90">Operator-authored TOOLS.md content</strong>{" "}
            (above the{" "}
            <code className="rounded bg-white/10 px-1 font-mono text-[11px] text-cyan-200">
              &lt;!-- okestria:auto-tools:start --&gt;
            </code>{" "}
            marker) is preserved as-is. The composer rewrites only the
            block between the markers — operator text stays untouched.
          </p>
          <p>
            <strong className="text-white/90">Other agent files</strong> (SOUL.md, AGENTS.md,
            USER.md, MEMORY.md, HEARTBEAT.md, AVATAR notes) are not
            touched by this sync.
          </p>
          <p>
            <strong className="text-white/90">Tenants without notes/Apify configured</strong>{" "}
            get an empty managed section — no broken recipes pointing
            at unconfigured services.
          </p>
        </div>
      </Section>
    </div>
  );
}

function Step({
  icon: Icon,
  n,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  n: number;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-violet-400/40 bg-violet-500/[0.10] font-mono text-[10.5px] font-semibold text-violet-200">
          {n}
        </span>
        <Icon className="h-3.5 w-3.5 text-violet-300/70" />
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/60">
          {title}
        </p>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-white/70">{body}</p>
    </div>
  );
}
