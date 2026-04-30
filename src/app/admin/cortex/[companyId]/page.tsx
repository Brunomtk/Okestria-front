import {
  Brain,
  Building2,
  FileText,
  Files,
  FolderTree,
  Hash,
  Network,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  fetchAdminCortexGraph,
  fetchAdminCortexTree,
  fetchCompaniesPaged,
  type AdminCortexNote,
  type AdminCortexTree,
} from "@/lib/auth/api";
import { requireAdminSession } from "../../_lib/admin";
import { Section, StatCard } from "../../_components/AdminUI";
import {
  DetailHeader,
  DetailTagPill,
} from "../../_components/AdminDetail";
import { safeAdminPage } from "../../_lib/safe-page";
import { AdminCortexGraph3D } from "./_components/AdminCortexGraph3D";
import { AdminCortexTabs } from "./_components/AdminCortexTabs";

/**
 * v150 — Admin · Cortex tenant detail.
 *
 * Two-pane layout: FILES list (every note in the vault, grouped by
 * folder) and 3D graph (Obsidian-style — same component as the
 * office cortex modal). Both are wired to the new admin-scoped
 * proxy endpoints `/api/AdminOverview/cortex/{companyId}/tree` and
 * `…/graph` so the admin can inspect any tenant's vault without a
 * tenant context switch.
 */

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fmtAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h ago`;
  return `${Math.round(diff / 86400_000)}d ago`;
}

function groupByFolder(notes: AdminCortexNote[]) {
  const buckets = new Map<string, AdminCortexNote[]>();
  for (const n of notes) {
    const key = (n.folder ?? "").trim() || "(root)";
    const arr = buckets.get(key) ?? [];
    arr.push(n);
    buckets.set(key, arr);
  }
  // Sort folders alphabetically, root first
  return [...buckets.entries()].sort((a, b) => {
    if (a[0] === "(root)") return -1;
    if (b[0] === "(root)") return 1;
    return a[0].localeCompare(b[0]);
  });
}

export default async function AdminCortexCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  return safeAdminPage("admin/cortex/[id]", () => render(params));
}

async function render(params: Promise<{ companyId: string }>) {
  const { companyId } = await params;
  const id = Number(companyId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [treeResult, graphResult, companiesResp] = await Promise.all([
    fetchAdminCortexTree(id, session.token!).then(
      (t) => ({ ok: true as const, value: t }),
      (err) => ({
        ok: false as const,
        error: err instanceof Error ? err.message : String(err),
      }),
    ),
    fetchAdminCortexGraph(id, session.token!).then(
      (g) => ({ ok: true as const, value: g }),
      (err) => ({
        ok: false as const,
        error: err instanceof Error ? err.message : String(err),
      }),
    ),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);

  const tree = treeResult.ok ? treeResult.value : null;
  const graph = graphResult.ok ? graphResult.value : null;
  const treeError = treeResult.ok ? null : treeResult.error;
  const graphError = graphResult.ok ? null : graphResult.error;
  if (treeError) console.error("[admin/cortex] tree fetch failed:", treeError);
  if (graphError) console.error("[admin/cortex] graph fetch failed:", graphError);

  const company = (companiesResp?.result ?? []).find((c) => c.id === id);
  const companyName = company?.name ?? `Company #${id}`;

  const safeTree: AdminCortexTree =
    tree ?? {
      companyId: id,
      vaultName: "default",
      notes: [],
      folders: [],
      totalCount: 0,
    };
  const safeGraph = graph ?? {
    companyId: id,
    vaultName: "default",
    nodes: [],
    links: [],
    tags: [],
    folders: [],
  };

  const grouped = groupByFolder(safeTree.notes);

  return (
    <div className="space-y-8">
      <DetailHeader
        backHref="/admin/cortex"
        backLabel="Back to cortex"
        eyebrow={`Tenant · #${id}`}
        title={`${companyName} · vault`}
        subtitle={`Knowledge graph for the "${safeTree.vaultName}" vault — files on the left, 3D wiki-link graph on the right.`}
        pills={
          <>
            <DetailTagPill variant="cyan">{safeTree.vaultName}</DetailTagPill>
            <DetailTagPill>{safeTree.totalCount} note{safeTree.totalCount === 1 ? "" : "s"}</DetailTagPill>
            <DetailTagPill variant="violet">
              {safeGraph.tags.length} tag{safeGraph.tags.length === 1 ? "" : "s"}
            </DetailTagPill>
            <DetailTagPill variant="emerald">
              {safeGraph.links.length} link{safeGraph.links.length === 1 ? "" : "s"}
            </DetailTagPill>
          </>
        }
      />

      {treeError || graphError ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/[0.06] p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-rose-300/80">
            Cortex backend probe failed
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/65">
            One or both Cortex endpoints returned an error for this tenant.
            The page rendered with whatever it could load — re-check the
            host log for the full stack.
          </p>
          <ul className="mt-2.5 space-y-1 font-mono text-[11px] text-rose-200/85">
            {treeError ? (
              <li>
                ✗{" "}
                <code className="rounded bg-white/10 px-1 text-cyan-200">
                  GET /api/AdminOverview/cortex/{id}/tree
                </code>{" "}
                — {treeError}
              </li>
            ) : null}
            {graphError ? (
              <li>
                ✗{" "}
                <code className="rounded bg-white/10 px-1 text-cyan-200">
                  GET /api/AdminOverview/cortex/{id}/graph
                </code>{" "}
                — {graphError}
              </li>
            ) : null}
          </ul>
          <p className="mt-2.5 font-mono text-[10px] text-white/40">
            Most common cause: the back is older than v83 and these proxy
            endpoints don&apos;t exist yet. Deploy{" "}
            <code className="rounded bg-white/10 px-1 text-cyan-200">
              ok_back_v83_admin_cortex_proxy
            </code>{" "}
            (or newer) and refresh.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tenant"
          value={companyName.length > 18 ? `${companyName.slice(0, 16)}…` : companyName}
          icon={Building2}
          accent="violet"
          hint={`#${id}`}
        />
        <StatCard label="Notes" value={safeTree.totalCount} icon={FileText} accent="cyan" />
        <StatCard
          label="Folders"
          value={safeTree.folders.length}
          icon={FolderTree}
          accent="amber"
        />
        <StatCard
          label="Tags"
          value={safeGraph.tags.length}
          icon={Hash}
          accent="emerald"
        />
      </div>

      <AdminCortexTabs
        files={
          <Section
            title={`Files · ${safeTree.totalCount}`}
            subtitle="grouped by folder"
            accent="cyan"
          >
            {safeTree.totalCount === 0 ? (
              <div className="p-5">
                <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
                  <Files className="mx-auto h-6 w-6 text-white/30" />
                  <p className="mt-3 text-[13px] text-white/55">
                    No notes in this tenant&apos;s vault yet.
                  </p>
                  <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
                    once an agent writes its first note, it shows up here
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-h-[600px] divide-y divide-white/[0.04] overflow-auto">
                {grouped.map(([folder, notes]) => (
                  <div key={folder}>
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/8 bg-[rgba(8,11,20,0.92)] px-5 py-2 backdrop-blur">
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-3.5 w-3.5 text-amber-300/70" />
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/65">
                          {folder}
                        </span>
                      </div>
                      <span className="font-mono text-[10.5px] text-white/35">
                        {notes.length} note{notes.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ul className="divide-y divide-white/[0.04]">
                      {notes
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.lastModifiedUtc).getTime() -
                            new Date(a.lastModifiedUtc).getTime(),
                        )
                        .map((note) => (
                          <li
                            key={note.path}
                            className="flex items-start justify-between gap-3 px-5 py-3 transition-colors hover:bg-white/[0.025]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-white/90">
                                {note.title}
                              </p>
                              <p className="mt-0.5 truncate font-mono text-[10.5px] text-white/40">
                                {note.path}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="font-mono text-[10.5px] text-white/55">
                                {fmtBytes(note.sizeBytes)}
                              </p>
                              <p className="mt-0.5 font-mono text-[10px] text-white/35">
                                {fmtAgo(note.lastModifiedUtc)}
                              </p>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Section>
        }
        graph={
          <Section
            title={`Graph · ${safeGraph.nodes.length} nodes`}
            subtitle="3D wiki-link visualization"
            accent="violet"
          >
            <div className="h-[600px] p-5">
              <AdminCortexGraph3D graph={safeGraph} />
            </div>
          </Section>
        }
      />

      <Section title="Top tags" subtitle="frequency in this vault" accent="emerald">
        {safeGraph.tags.length === 0 ? (
          <div className="p-5 text-[13px] text-white/45">
            No tags in this vault yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-5">
            {safeGraph.tags.slice(0, 40).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-emerald-200"
              >
                <Hash className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {safeGraph.tags.length > 40 ? (
              <span className="font-mono text-[10.5px] text-white/35">
                + {safeGraph.tags.length - 40} more
              </span>
            ) : null}
          </div>
        )}
      </Section>

      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
        <Brain className="mr-1 inline h-3 w-3" />
        live · vault &quot;{safeTree.vaultName}&quot; · backed by S3 ·{" "}
        <Network className="ml-1 inline h-3 w-3" />
        wiki + tag graph
      </p>
    </div>
  );
}
