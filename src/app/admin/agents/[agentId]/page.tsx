import {
  AlertTriangle,
  AtSign,
  Bot,
  Brain,
  Building2,
  CircleDot,
  Files,
  Flame,
  HeartHandshake,
  Layers,
  ListTodo,
  Network,
  Paperclip,
  Power,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Star,
  Telescope,
  Thermometer,
  UserRound,
  Users as UsersIcon,
  UsersRound,
  Wrench,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  fetchAgentDeletePreview,
  fetchAgentDetails,
  fetchCompaniesPaged,
  type OkestriaAgentDetails,
  type OkestriaAgentDeleteSummary,
} from "@/lib/auth/api";
import { deleteAgentAction } from "../../_actions";
import { requireAdminSession } from "../../_lib/admin";
import { Section } from "../../_components/AdminUI";
import {
  DetailActionLink,
  DetailFact,
  DetailHeader,
  DetailTagPill,
} from "../../_components/AdminDetail";
import { AdminDeleteButton } from "../../_components/AdminDeleteButton";
import { safeAdminPage } from "../../_lib/safe-page";
import { AdminAgentAvatar } from "./_components/AdminAgentAvatar";

/**
 * v148 — Admin · Agent detail (rich edition).
 *
 * Mirrors what the office shows about an agent — full identity,
 * runtime knobs, profile prose, attached files, plus a live 3D
 * preview of the avatar (same component the office uses). Every
 * field is server-rendered from /api/Agents/{id}.
 */

export default async function AdminAgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  return safeAdminPage("admin/agents/[id]", () => render(params));
}

async function render(params: Promise<{ agentId: string }>) {
  const { agentId } = await params;
  const id = Number(agentId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [agent, companiesResp, deletePreview] = await Promise.all([
    fetchAgentDetails(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
    fetchAgentDeletePreview(id, session.token!).catch(() => null),
  ]);
  if (!agent) notFound();

  const companyName =
    (companiesResp?.result ?? []).find((c) => c.id === agent.companyId)?.name ??
    `Company #${agent.companyId}`;

  const isActive = agent.status !== false;
  const profile = agent.profile ?? null;
  const files = (agent.files ?? []).filter(
    (f) => f.fileType || (f.content ?? "").trim() !== "",
  );

  return (
    <div className="space-y-8">
      <DetailHeader
        backHref="/admin/agents"
        backLabel="Back to agents"
        eyebrow={`Agent · #${agent.id}`}
        title={agent.name ?? `Agent #${agent.id}`}
        subtitle={
          agent.role
            ? `${agent.role} · @${agent.slug ?? "no-slug"}`
            : `@${agent.slug ?? "no-slug"}`
        }
        pills={
          <>
            <DetailTagPill variant={isActive ? "emerald" : "outline"}>
              {isActive ? "active" : "inactive"}
            </DetailTagPill>
            <DetailTagPill>ID #{agent.id}</DetailTagPill>
            {agent.isDefault ? (
              <DetailTagPill variant="amber">default · auto-attach</DetailTagPill>
            ) : null}
            {profile?.model ? (
              <DetailTagPill variant="violet">{profile.model}</DetailTagPill>
            ) : null}
            {profile?.thinkingLevel ? (
              <DetailTagPill variant="cyan">
                think · {profile.thinkingLevel}
              </DetailTagPill>
            ) : null}
          </>
        }
        actions={
          <>
            <DetailActionLink
              href={`/admin/agents/${agent.id}/edit`}
              accent="violet"
              icon={SettingsIcon}
            >
              Edit
            </DetailActionLink>
            <form action={deleteAgentAction}>
              <input type="hidden" name="agentId" value={agent.id} />
              <AdminDeleteButton
                confirmText={buildDeleteConfirmText(agent, deletePreview)}
              />
            </form>
          </>
        }
      />

      {/* ── Top split: 3D avatar + identity ─────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Section
          title="Avatar"
          subtitle="same 3D figure rendered in the office"
          accent="violet"
        >
          <div className="space-y-4 p-5">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[360px] overflow-hidden rounded-2xl border border-white/8 bg-[radial-gradient(ellipse_at_top,_rgba(167,139,250,0.18)_0%,_rgba(8,11,20,0.85)_55%,_#04060d_100%)]">
              <AdminAgentAvatar
                avatarProfileJson={agent.avatarProfileJson ?? null}
                fallbackSeed={agent.slug ?? `agent-${agent.id}`}
                className="absolute inset-0"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 0%, rgba(4,6,13,0.85) 100%)",
                }}
              />
              <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300/70">
                    Live preview
                  </p>
                  <p className="text-[14.5px] font-semibold text-white/90">
                    {agent.name ?? `Agent #${agent.id}`}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
                  <CircleDot
                    className={`h-2.5 w-2.5 ${
                      isActive ? "text-emerald-300" : "text-white/35"
                    }`}
                  />
                  {isActive ? "online" : "offline"}
                </span>
              </div>
            </div>

            {profile?.avatarNotes ? (
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-violet-300/70">
                  Avatar notes
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">
                  {profile.avatarNotes}
                </p>
              </div>
            ) : null}
          </div>
        </Section>

        <Section
          title="Identity"
          subtitle="primary record"
          accent="cyan"
          right={<UserRound className="h-4 w-4 text-cyan-300/70" />}
        >
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <DetailFact label="Name" value={agent.name ?? "—"} icon={Bot} />
            <DetailFact
              label="Slug"
              value={agent.slug ?? "—"}
              icon={AtSign}
              mono
            />
            <DetailFact
              label="Role"
              value={agent.role ?? "—"}
              icon={Telescope}
            />
            <DetailFact label="Tenant" value={companyName} icon={Building2} />
            <DetailFact label="Emoji" value={agent.emoji ?? "—"} />
            <DetailFact
              label="Status"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Power
                    className={`h-3.5 w-3.5 ${
                      isActive ? "text-emerald-300" : "text-white/35"
                    }`}
                  />
                  {isActive ? "Active" : "Inactive"}
                </span>
              }
            />
            <DetailFact
              label="Default agent"
              value={
                <span className="inline-flex items-center gap-1.5">
                  {agent.isDefault ? (
                    <Star className="h-3.5 w-3.5 text-amber-300" />
                  ) : null}
                  {agent.isDefault ? "Yes" : "No"}
                </span>
              }
            />
            <DetailFact
              label="Avatar URL"
              value={agent.avatarUrl ?? "—"}
              mono
            />
            <DetailFact
              label="Description"
              span={2}
              value={agent.description ?? "No description set."}
            />
          </div>
        </Section>
      </div>

      {/* ── Runtime knobs ─────────────────────────────────────────── */}
      <Section
        title="Runtime"
        subtitle="model, thinking, temperature"
        accent="amber"
        right={<Brain className="h-4 w-4 text-amber-300/70" />}
      >
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <DetailFact
            label="Model"
            value={profile?.model ?? "default"}
            icon={Brain}
            mono
          />
          <DetailFact
            label="Thinking level"
            value={profile?.thinkingLevel ?? "medium"}
            icon={Sparkles}
          />
          <DetailFact
            label="Temperature"
            value={
              profile?.temperature != null
                ? String(profile.temperature)
                : "default"
            }
            icon={Thermometer}
            mono
          />
          <DetailFact
            label="Files attached"
            value={String(files.length)}
            icon={Paperclip}
            mono
          />
        </div>
      </Section>

      {/* ── Profile prose ────────────────────────────────────────── */}
      <Section
        title="Profile"
        subtitle="soul, vibe, continuity, boundaries"
        accent="violet"
        right={<HeartHandshake className="h-4 w-4 text-violet-300/70" />}
      >
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <ProseCard
            label="Soul"
            value={profile?.soul}
            icon={Flame}
            accent="#fb7185"
          />
          <ProseCard
            label="Vibe"
            value={profile?.vibe}
            icon={Sparkles}
            accent="#a78bfa"
          />
          <ProseCard
            label="Continuity"
            value={profile?.continuity}
            icon={Network}
            accent="#22d3ee"
          />
          <ProseCard
            label="Boundaries"
            value={profile?.boundaries}
            icon={ShieldCheck}
            accent="#fb7185"
          />
          <ProseCard
            label="Identity notes"
            value={profile?.identityNotes}
            icon={UserRound}
            accent="#34d399"
          />
          <ProseCard
            label="Agents instructions"
            value={profile?.agentsInstructions}
            icon={UsersRound}
            accent="#f59e0b"
          />
          <ProseCard
            label="User notes"
            value={profile?.userNotes}
            icon={UsersIcon}
            accent="#22d3ee"
          />
          <ProseCard
            label="Tools notes"
            value={profile?.toolsNotes}
            icon={Wrench}
            accent="#f59e0b"
          />
          <ProseCard
            label="Memory notes"
            value={profile?.memoryNotes}
            icon={Layers}
            accent="#a78bfa"
          />
          <ProseCard
            label="Heartbeat notes"
            value={profile?.heartbeatNotes}
            icon={ListTodo}
            accent="#34d399"
          />
        </div>
      </Section>

      {/* ── Files ──────────────────────────────────────────────── */}
      <Section
        title={`Files · ${files.length}`}
        subtitle="agent context blobs"
        accent="emerald"
        right={<Files className="h-4 w-4 text-emerald-300/70" />}
      >
        {files.length === 0 ? (
          <div className="p-5">
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
              <p className="text-[13px] text-white/55">
                No files attached to this agent yet.
              </p>
              <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
                files appear when the operator drops context blobs in the editor
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-5">
            {files.map((file, idx) => {
              const content = (file.content ?? "").trim();
              const lines = content.split(/\r?\n/);
              const preview = lines.slice(0, 6).join("\n");
              const truncated = lines.length > 6;
              return (
                <div
                  key={`${file.fileType ?? "file"}-${idx}`}
                  className="rounded-xl border border-white/10 bg-black/25 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-emerald-300/70" />
                      <span className="font-mono text-[11.5px] uppercase tracking-[0.22em] text-white/70">
                        {file.fileType ?? `file-${idx + 1}`}
                      </span>
                    </div>
                    <span className="font-mono text-[10.5px] text-white/40">
                      {content.length} chars
                    </span>
                  </div>
                  {content ? (
                    <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/8 bg-black/40 p-3 font-mono text-[11.5px] leading-relaxed text-white/75">
                      {preview}
                      {truncated ? "\n…" : ""}
                    </pre>
                  ) : (
                    <p className="mt-2 text-[12px] text-white/40">
                      (empty file)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Delete impact preview ─────────────────────────────── */}
      {deletePreview ? (
        <Section
          title="Delete impact"
          subtitle="what gets wiped if you remove this agent"
          accent="rose"
          right={<AlertTriangle className="h-4 w-4 text-rose-300/70" />}
        >
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            <ImpactStat
              label="Cron jobs"
              value={deletePreview.cronJobsAffected}
              hint={`${deletePreview.cronJobRunsAffected} run${
                deletePreview.cronJobRunsAffected === 1 ? "" : "s"
              }`}
            />
            <ImpactStat
              label="Squad memberships"
              value={deletePreview.squadMembershipsAffected}
              hint={
                deletePreview.squadNames.length > 0
                  ? deletePreview.squadNames.slice(0, 2).join(", ")
                  : "—"
              }
            />
            <ImpactStat
              label="Files"
              value={deletePreview.filesAffected}
              hint={deletePreview.hasProfile ? "+ profile row" : "no profile"}
            />
            <ImpactStat
              label="Lead missions"
              value={deletePreview.leadJobsDetached}
              hint="will be detached, not deleted"
            />
          </div>
          {deletePreview.warning ? (
            <div className="mx-5 mb-5 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-3">
              <p className="flex items-start gap-2 text-[12.5px] text-amber-200/85">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                {deletePreview.warning}
              </p>
            </div>
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}

function buildDeleteConfirmText(
  agent: OkestriaAgentDetails,
  preview: OkestriaAgentDeleteSummary | null,
): string {
  const name = agent.name ?? `Agent #${agent.id}`;
  if (!preview) return `Delete ${name}? This cannot be undone.`;
  const bits: string[] = [];
  if (preview.cronJobsAffected > 0)
    bits.push(`${preview.cronJobsAffected} cron job${preview.cronJobsAffected === 1 ? "" : "s"}`);
  if (preview.squadMembershipsAffected > 0)
    bits.push(
      `${preview.squadMembershipsAffected} squad membership${
        preview.squadMembershipsAffected === 1 ? "" : "s"
      }`,
    );
  if (preview.filesAffected > 0)
    bits.push(`${preview.filesAffected} file${preview.filesAffected === 1 ? "" : "s"}`);
  if (preview.leadJobsDetached > 0)
    bits.push(
      `detach ${preview.leadJobsDetached} lead mission${
        preview.leadJobsDetached === 1 ? "" : "s"
      }`,
    );
  const tail = bits.length > 0 ? ` This will also wipe ${bits.join(", ")}.` : "";
  return `Delete ${name}?${tail} Cannot be undone.`;
}

/* ── Sub-cards ──────────────────────────────────────────────────── */

function ProseCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value?: string | null;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  const text = (value ?? "").trim();
  const empty = text.length === 0;
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: `${accent}1a`,
              border: `1px solid ${accent}40`,
              color: accent,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/60">
            {label}
          </p>
        </div>
        {empty ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/30">
            empty
          </span>
        ) : (
          <span className="font-mono text-[10px] text-white/35">
            {text.length} chars
          </span>
        )}
      </div>
      <p
        className={`mt-2.5 whitespace-pre-wrap text-[12.5px] leading-relaxed ${
          empty ? "text-white/35" : "text-white/80"
        }`}
      >
        {empty ? "Not set." : text}
      </p>
    </div>
  );
}

function ImpactStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  const heavy = value > 0;
  return (
    <div
      className={`rounded-xl border p-4 ${
        heavy
          ? "border-rose-400/25 bg-rose-500/[0.05]"
          : "border-white/10 bg-black/25"
      }`}
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
        {label}
      </p>
      <p
        className={`mt-1 text-[20px] font-semibold leading-none tracking-tight ${
          heavy ? "text-rose-200" : "text-white/85"
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 truncate font-mono text-[10.5px] text-white/40">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
