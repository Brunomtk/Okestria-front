"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Check, RefreshCcw, Shuffle } from "lucide-react";
import {
  AGENT_AVATAR_BOTTOM_STYLE_OPTIONS,
  AGENT_AVATAR_CLOTHING_COLOR_OPTIONS,
  AGENT_AVATAR_HAIR_COLOR_OPTIONS,
  AGENT_AVATAR_HAIR_STYLE_OPTIONS,
  AGENT_AVATAR_HAT_STYLE_OPTIONS,
  AGENT_AVATAR_SHOE_COLOR_OPTIONS,
  AGENT_AVATAR_SKIN_TONE_OPTIONS,
  AGENT_AVATAR_TOP_STYLE_OPTIONS,
  type AgentAvatarProfile,
  createDefaultAgentAvatarProfile,
} from "@/lib/avatars/profile";
import { AgentAvatarPreview3D } from "@/features/agents/components/AgentAvatarPreview3D";
import { randomUUID } from "@/lib/uuid";

export type AgentAvatarEditorPanelProps = {
  agentId: string;
  agentName: string;
  initialProfile: AgentAvatarProfile | null | undefined;
  onSave: (profile: AgentAvatarProfile) => Promise<void> | void;
  onDraftChange?: (profile: AgentAvatarProfile) => void;
  onCancel?: () => void;
  onSaved?: () => void;
  cancelLabel?: string;
  saveLabel?: string;
  showActions?: boolean;
};

export type AgentAvatarEditorPanelHandle = {
  save: () => Promise<void>;
};

const pillClassName =
  "rounded-lg border px-3 py-2 text-[11px] font-medium transition-all duration-150 cursor-pointer";

const colorSwatchClassName =
  "h-8 w-8 rounded-lg border-2 transition-all duration-150 hover:scale-110 cursor-pointer";

const sectionTitle =
  "font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80";

const activePill =
  "border-cyan-500/60 bg-cyan-500/15 text-cyan-100 shadow-[0_0_8px_rgba(6,182,212,0.15)]";
const inactivePill =
  "border-border/40 bg-muted/20 text-muted-foreground hover:border-border/60 hover:bg-muted/35";

export const AgentAvatarEditorPanel = forwardRef<
  AgentAvatarEditorPanelHandle,
  AgentAvatarEditorPanelProps
>(function AgentAvatarEditorPanel(
  {
    agentId,
    agentName,
    initialProfile,
    onSave,
    onDraftChange,
    onCancel,
    onSaved,
    cancelLabel = "Cancel",
    saveLabel = "Save",
    showActions = true,
  }: AgentAvatarEditorPanelProps,
  ref
) {
  const fallbackProfile = useMemo(
    () => createDefaultAgentAvatarProfile(agentId),
    [agentId]
  );
  const resolvedInitialProfile = initialProfile ?? fallbackProfile;
  const [draft, setDraft] = useState<AgentAvatarProfile>(resolvedInitialProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(resolvedInitialProfile);
  }, [resolvedInitialProfile]);

  useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await onSave(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }, [draft, onSave, onSaved, saving]);

  useImperativeHandle(
    ref,
    () => ({
      save,
    }),
    [save]
  );

  return (
    <div className="grid h-full min-h-0 gap-0 xl:grid-cols-[340px_minmax(0,1fr)]">
      {/* ── Left: Preview ── */}
      <div className="border-b border-border/40 p-5 xl:border-b-0 xl:border-r">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-400/80">
          Customize Avatar
        </div>
        <div className="mt-1 text-lg font-semibold text-foreground">{agentName}</div>
        <div className="mt-1 text-[11px] text-muted-foreground/70">
          Customize this agent's appearance in the office.
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-border/30 bg-[#070b16]">
          <AgentAvatarPreview3D profile={draft} className="h-[340px] w-full" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground"
            onClick={() => setDraft(createDefaultAgentAvatarProfile(agentId))}
            disabled={saving}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/8 px-3 py-2 text-[11px] font-medium text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/15"
            onClick={() => setDraft(createDefaultAgentAvatarProfile(randomUUID()))}
            disabled={saving}
          >
            <Shuffle className="h-3.5 w-3.5" />
            Randomize
          </button>
        </div>
      </div>

      {/* ── Right: Controls ── */}
      <div className="min-h-0 overflow-y-auto p-5">
        {showActions ? (
          <div className="mb-5 flex items-center justify-between border-b border-border/30 pb-4">
            <div className="text-[11px] text-muted-foreground/60">
              {saved ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Saved successfully!
                </span>
              ) : (
                "Choose the perfect look"
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-border/40 bg-muted/20 px-3.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={onCancel}
                disabled={saving}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className="rounded-lg border border-cyan-500/50 bg-cyan-500/15 px-4 py-2 text-[11px] font-semibold text-cyan-200 transition-all hover:border-cyan-400/70 hover:bg-cyan-500/25 disabled:opacity-50"
                onClick={() => {
                  void save();
                }}
                disabled={saving}
              >
                {saving ? "Saving..." : saved ? "Saved ✓" : saveLabel}
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Pele ── */}
        <section className="mb-5">
          <h3 className={sectionTitle}>Skin Tone</h3>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {AGENT_AVATAR_SKIN_TONE_OPTIONS.map((option) => {
              const selected = draft.body.skinTone === option.color;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-label={option.label}
                  className={`${colorSwatchClassName} ${selected ? "border-white shadow-[0_0_8px_rgba(255,255,255,0.25)]" : "border-white/10"}`}
                  style={{ backgroundColor: option.color }}
                  onClick={() =>
                    setDraft((c) => ({
                      ...c,
                      body: { ...c.body, skinTone: option.color },
                    }))
                  }
                />
              );
            })}
          </div>
        </section>

        {/* ── Cabelo ── */}
        <section className="mb-5">
          <h3 className={sectionTitle}>Hair</h3>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {AGENT_AVATAR_HAIR_STYLE_OPTIONS.map((option) => {
              const selected = draft.hair.style === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${pillClassName} ${selected ? activePill : inactivePill}`}
                  onClick={() =>
                    setDraft((c) => ({
                      ...c,
                      hair: { ...c.hair, style: option.id },
                    }))
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGENT_AVATAR_HAIR_COLOR_OPTIONS.map((option) => {
              const selected = draft.hair.color === option.color;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-label={option.label}
                  className={`${colorSwatchClassName} ${selected ? "border-white shadow-[0_0_8px_rgba(255,255,255,0.25)]" : "border-white/10"}`}
                  style={{ backgroundColor: option.color }}
                  onClick={() =>
                    setDraft((c) => ({
                      ...c,
                      hair: { ...c.hair, color: option.color },
                    }))
                  }
                />
              );
            })}
          </div>
        </section>

        {/* ── Roupa de cima ── */}
        <section className="mb-5">
          <h3 className={sectionTitle}>Top</h3>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {AGENT_AVATAR_TOP_STYLE_OPTIONS.map((option) => {
              const selected = draft.clothing.topStyle === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${pillClassName} ${selected ? activePill : inactivePill}`}
                  onClick={() =>
                    setDraft((c) => ({
                      ...c,
                      clothing: { ...c.clothing, topStyle: option.id },
                    }))
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGENT_AVATAR_CLOTHING_COLOR_OPTIONS.map((option) => {
              const selected = draft.clothing.topColor === option.color;
              return (
                <button
                  key={`top-${option.id}`}
                  type="button"
                  aria-label={option.label}
                  className={`${colorSwatchClassName} ${selected ? "border-white shadow-[0_0_8px_rgba(255,255,255,0.25)]" : "border-white/10"}`}
                  style={{ backgroundColor: option.color }}
                  onClick={() =>
                    setDraft((c) => ({
                      ...c,
                      clothing: { ...c.clothing, topColor: option.color },
                    }))
                  }
                />
              );
            })}
          </div>
        </section>

        {/* ── Roupa de baixo ── */}
        <section className="mb-5">
          <h3 className={sectionTitle}>Bottom</h3>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {AGENT_AVATAR_BOTTOM_STYLE_OPTIONS.map((option) => {
              const selected = draft.clothing.bottomStyle === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${pillClassName} ${selected ? activePill : inactivePill}`}
                  onClick={() =>
                    setDraft((c) => ({
                      ...c,
                      clothing: { ...c.clothing, bottomStyle: option.id },
                    }))
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGENT_AVATAR_CLOTHING_COLOR_OPTIONS.map((option) => {
              const selected = draft.clothing.bottomColor === option.color;
              return (
                <button
                  key={`bottom-${option.id}`}
                  type="button"
                  aria-label={option.label}
                  className={`${colorSwatchClassName} ${selected ? "border-white shadow-[0_0_8px_rgba(255,255,255,0.25)]" : "border-white/10"}`}
                  style={{ backgroundColor: option.color }}
                  onClick={() =>
                    setDraft((c) => ({
                      ...c,
                      clothing: { ...c.clothing, bottomColor: option.color },
                    }))
                  }
                />
              );
            })}
          </div>
        </section>

        {/* ── Sapatos ── */}
        <section className="mb-5">
          <h3 className={sectionTitle}>Shoes</h3>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {AGENT_AVATAR_SHOE_COLOR_OPTIONS.map((option) => {
              const selected = draft.clothing.shoesColor === option.color;
              return (
                <button
                  key={`shoes-${option.id}`}
                  type="button"
                  aria-label={option.label}
                  className={`${colorSwatchClassName} ${selected ? "border-white shadow-[0_0_8px_rgba(255,255,255,0.25)]" : "border-white/10"}`}
                  style={{ backgroundColor: option.color }}
                  onClick={() =>
                    setDraft((c) => ({
                      ...c,
                      clothing: { ...c.clothing, shoesColor: option.color },
                    }))
                  }
                />
              );
            })}
          </div>
        </section>

        {/* ── Chapéus ── */}
        <section className="mb-5">
          <h3 className={sectionTitle}>Hat</h3>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {AGENT_AVATAR_HAT_STYLE_OPTIONS.map((option) => {
              const selected = draft.accessories.hatStyle === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${pillClassName} ${selected ? activePill : inactivePill}`}
                  onClick={() =>
                    setDraft((c) => ({
                      ...c,
                      accessories: { ...c.accessories, hatStyle: option.id },
                    }))
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Acessórios ── */}
        <section className="mb-3">
          <h3 className={sectionTitle}>Accessories</h3>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {([
              { key: "glasses" as const, label: "Glasses", emoji: "👓" },
              { key: "headset" as const, label: "Headset", emoji: "🎧" },
              { key: "backpack" as const, label: "Backpack", emoji: "🎒" },
              { key: "scarf" as const, label: "Scarf", emoji: "🧣" },
              { key: "watch" as const, label: "Watch", emoji: "⌚" },
            ]).map((option) => {
              const enabled = draft.accessories[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`${pillClassName} inline-flex items-center gap-1.5 ${enabled ? activePill : inactivePill}`}
                  onClick={() =>
                    setDraft((c) => ({
                      ...c,
                      accessories: {
                        ...c.accessories,
                        [option.key]: !c.accessories[option.key],
                      },
                    }))
                  }
                >
                  <span className="text-[13px]">{option.emoji}</span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
});
