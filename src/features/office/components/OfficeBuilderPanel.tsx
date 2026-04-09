"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  RotateCw,
  Save,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";

import { OfficePhaserCanvas } from "@/features/office/components/OfficePhaserCanvas";
import { useOfficeBuilderStore } from "@/features/office/state/useOfficeBuilderStore";
import type { OfficeMap } from "@/lib/office/schema";

type OfficeBuilderPanelProps = {
  initialMap: OfficeMap;
  workspaceId: string;
  officeId: string;
};

const nextId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;

const toggleClassName =
  "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:border-amber-400/40 hover:bg-white/10";

const actionButtonClassName =
  "inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export function OfficeBuilderPanel({ initialMap, workspaceId, officeId }: OfficeBuilderPanelProps) {
  const router = useRouter();
  const store = useOfficeBuilderStore(initialMap);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string>("");
  const [showDebug, setShowDebug] = useState(true);
  const [lightingEnabled, setLightingEnabled] = useState(true);
  const [ambienceEnabled, setAmbienceEnabled] = useState(true);
  const [thoughtEnabled, setThoughtEnabled] = useState(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        router.back();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const saveVersion = async () => {
    const versionId = `v${Date.now()}`;
    const response = await fetch("/api/office", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveVersion",
        workspaceId,
        officeId,
        versionId,
        createdBy: "studio",
        notes: "builder save",
        map: store.map,
      }),
    });
    if (!response.ok) {
      setMessage("Save failed. Try again.");
      return;
    }
    setMessage(`Version ${versionId} saved successfully.`);
  };

  const publishLatest = async () => {
    const response = await fetch("/api/office/publish", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        officeId,
        publishedBy: "studio",
      }),
    });
    if (!response.ok) {
      setMessage("Publish failed. Try again.");
      return;
    }
    setMessage("Active layout published.");
  };

  const debug = useMemo(
    () => ({
      showZones: showDebug,
      showAnchors: showDebug,
      showEmitterBounds: showDebug,
      showLightBounds: showDebug,
      showMetrics: true,
    }),
    [showDebug]
  );

  const stats = useMemo(
    () => ({
      objects: store.map.objects.length,
      lights: store.map.lights?.length ?? 0,
      emitters: store.map.ambienceEmitters?.length ?? 0,
      interactions: store.map.interactionPoints?.length ?? 0,
      zones: store.map.zones?.length ?? 0,
    }),
    [store.map]
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_24%),linear-gradient(180deg,#04070f_0%,#0a1020_100%)]" />
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 md:p-6">
        <div className="flex h-[92vh] w-full max-w-[1560px] overflow-hidden rounded-[32px] border border-white/12 bg-[#0b1020]/95 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
          <aside className="flex w-full max-w-[360px] shrink-0 flex-col border-r border-white/10 bg-[#0d1326]/96">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-300/85">
                    Office layout editor
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-white">Central builder modal</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Ajuste o office com mais clareza visual, menos bagunça e um editor centralizado.
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-amber-400/50 hover:bg-white/10 hover:text-white"
                  onClick={() => router.back()}
                  aria-label="Fechar editor"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={store.undo}
                  disabled={!store.canUndo}
                  className={`${actionButtonClassName} border-white/10 bg-white/5 text-white hover:border-amber-400/40 hover:bg-white/10`}
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={store.redo}
                  disabled={!store.canRedo}
                  className={`${actionButtonClassName} border-white/10 bg-white/5 text-white hover:border-amber-400/40 hover:bg-white/10`}
                >
                  Redo
                </button>
                <button
                  type="button"
                  onClick={saveVersion}
                  className={`${actionButtonClassName} gap-2 border-amber-400/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/18`}
                >
                  <Save className="h-4 w-4" />
                  Save version
                </button>
                <button
                  type="button"
                  onClick={publishLatest}
                  className={`${actionButtonClassName} gap-2 border-emerald-400/35 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/18`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Publish
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <section className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  Layout summary
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ["Objects", stats.objects],
                    ["Lights", stats.lights],
                    ["Emitters", stats.emitters],
                    ["Interactions", stats.interactions],
                    ["Zones", stats.zones],
                    ["Selected", selectedIds.length],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
                      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <Wand2 className="h-4 w-4 text-sky-300" />
                  Quick actions
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    className={`${toggleClassName} text-left`}
                    onClick={() => store.rotateSelected(90)}
                  >
                    <span>Rotate selected</span>
                    <RotateCw className="h-4 w-4 text-amber-300" />
                  </button>
                  <button
                    type="button"
                    className={`${toggleClassName} text-left`}
                    onClick={() => store.flipSelected("x")}
                  >
                    <span>Flip selected on X</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-300">X</span>
                  </button>
                  <button
                    type="button"
                    className={`${toggleClassName} text-left`}
                    onClick={() => store.flipSelected("y")}
                  >
                    <span>Flip selected on Y</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-300">Y</span>
                  </button>
                  <button
                    type="button"
                    className={`${toggleClassName} text-left`}
                    onClick={() =>
                      store.addLight({
                        id: nextId("light"),
                        preset: "ceiling_lamp",
                        animationPreset: "soft_flicker",
                        x: 220,
                        y: 180,
                        radius: 120,
                        baseIntensity: 0.45,
                        enabled: true,
                      })
                    }
                  >
                    <span>Add light</span>
                    <Lightbulb className="h-4 w-4 text-amber-300" />
                  </button>
                  <button
                    type="button"
                    className={`${toggleClassName} text-left`}
                    onClick={() =>
                      store.addEmitter({
                        id: nextId("emitter"),
                        preset: "coffee_steam",
                        zoneId: store.map.zones[0]?.id ?? "",
                        enabled: true,
                        maxParticles: 12,
                        spawnRate: 0.15,
                      })
                    }
                  >
                    <span>Add ambience emitter</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-300">FX</span>
                  </button>
                  <button
                    type="button"
                    className={`${toggleClassName} text-left`}
                    onClick={() =>
                      store.addInteractionPoint({
                        id: nextId("interaction"),
                        kind: "tv_watch",
                        x: 260,
                        y: 220,
                        tags: [],
                      })
                    }
                  >
                    <span>Add interaction point</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-300">INT</span>
                  </button>
                </div>
              </section>

              <section className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <ArrowLeft className="h-4 w-4 text-violet-300" />
                  Scene toggles
                </div>
                <div className="mt-3 space-y-2">
                  <label className={toggleClassName}>
                    <span>Debug guides</span>
                    <input type="checkbox" checked={showDebug} onChange={(event) => setShowDebug(event.target.checked)} />
                  </label>
                  <label className={toggleClassName}>
                    <span>Lighting</span>
                    <input
                      type="checkbox"
                      checked={lightingEnabled}
                      onChange={(event) => setLightingEnabled(event.target.checked)}
                    />
                  </label>
                  <label className={toggleClassName}>
                    <span>Ambience</span>
                    <input
                      type="checkbox"
                      checked={ambienceEnabled}
                      onChange={(event) => setAmbienceEnabled(event.target.checked)}
                    />
                  </label>
                  <label className={toggleClassName}>
                    <span>Thought bubbles</span>
                    <input
                      type="checkbox"
                      checked={thoughtEnabled}
                      onChange={(event) => setThoughtEnabled(event.target.checked)}
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-slate-300">
                <div className="font-semibold text-white">Melhorias desta versão</div>
                <div className="mt-1">
                  Editor centralizado, visual mais limpo e ações principais agrupadas no mesmo painel.
                </div>
                <div className="mt-2 text-slate-400">Pressione ESC para fechar o editor rapidamente.</div>
              </section>
            </div>
          </aside>

          <div className="relative flex min-w-0 flex-1 flex-col bg-[#090f1d]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Live canvas</div>
                <div className="mt-1 text-sm text-slate-300">
                  Arraste, selecione e refine o layout em um canvas mais limpo e centralizado.
                </div>
              </div>
              {message ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                  {message}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 p-4 md:p-5">
              <div className="h-full overflow-hidden rounded-[28px] border border-white/10 bg-black/25 shadow-inner shadow-black/30">
                <OfficePhaserCanvas
                  mode="builder"
                  map={store.map}
                  presence={[]}
                  debug={debug}
                  runtime={{
                    enableLighting: lightingEnabled,
                    enableAmbience: ambienceEnabled,
                    enableThoughtBubbles: thoughtEnabled,
                  }}
                  onObjectMoved={(id, x, y) => {
                    store.moveObject(id, x, y);
                  }}
                  onSelectionChange={(ids) => {
                    store.select(ids);
                    setSelectedIds(ids);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
