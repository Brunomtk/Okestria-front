"use client";

import { CURATED_ELEVENLABS_VOICES } from "@/lib/voiceReply/catalog";

type SettingsPanelProps = {
  gatewayStatus?: string;
  gatewayUrl?: string;
  onGatewayDisconnect?: () => void;
  onOpenOnboarding?: () => void;
  officeTitle: string;
  officeTitleLoaded: boolean;
  onOfficeTitleChange: (title: string) => void;
  remoteOfficeEnabled: boolean;
  remoteOfficeSourceKind: "presence_endpoint" | "openclaw_gateway";
  remoteOfficeLabel: string;
  remoteOfficePresenceUrl: string;
  remoteOfficeGatewayUrl: string;
  remoteOfficeTokenConfigured: boolean;
  onRemoteOfficeEnabledChange: (enabled: boolean) => void;
  onRemoteOfficeSourceKindChange: (kind: "presence_endpoint" | "openclaw_gateway") => void;
  onRemoteOfficeLabelChange: (label: string) => void;
  onRemoteOfficePresenceUrlChange: (url: string) => void;
  onRemoteOfficeGatewayUrlChange: (url: string) => void;
  onRemoteOfficeTokenChange: (token: string) => void;
  voiceRepliesEnabled: boolean;
  voiceRepliesVoiceId: string | null;
  voiceRepliesSpeed: number;
  voiceRepliesLoaded: boolean;
  onVoiceRepliesToggle: (enabled: boolean) => void;
  onVoiceRepliesVoiceChange: (voiceId: string | null) => void;
  onVoiceRepliesSpeedChange: (speed: number) => void;
  onVoiceRepliesPreview: (voiceId: string | null, voiceName: string) => void;
  onOpenAgentSkills?: () => void;
  skillsButtonLabel?: string;
};

export function SettingsPanel({
  officeTitle,
  officeTitleLoaded,
  onOfficeTitleChange,
  voiceRepliesEnabled,
  voiceRepliesVoiceId,
  voiceRepliesSpeed,
  voiceRepliesLoaded,
  onVoiceRepliesToggle,
  onVoiceRepliesVoiceChange,
  onVoiceRepliesSpeedChange,
  onVoiceRepliesPreview,
  onOpenAgentSkills,
  skillsButtonLabel,
}: SettingsPanelProps) {
  return (
    <div className="px-4 py-4">
      <div className="rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">Studio title</div>
            <div className="mt-1 text-[10px] text-white/75">
              Customize the banner shown at the top of the office.
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
            {officeTitleLoaded ? "Ready" : "Loading"}
          </span>
        </div>
        <input
          type="text"
          value={officeTitle}
          maxLength={48}
          disabled={!officeTitleLoaded}
          onChange={(event) => onOfficeTitleChange(event.target.value)}
          placeholder="Company Headquarters"
          className="mt-3 w-full rounded-md border border-cyan-500/10 bg-black/25 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-cyan-100 outline-none transition-colors placeholder:text-cyan-100/30 focus:border-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="mt-2 text-[10px] text-white/50">Used in the office scene header.</div>
      </div>

      <div className="ui-settings-row mt-3 flex min-h-[72px] items-center justify-between gap-6 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-label="Voice replies"
            aria-checked={voiceRepliesEnabled}
            className={`ui-switch self-center ${voiceRepliesEnabled ? "ui-switch--on" : ""}`}
            onClick={() => onVoiceRepliesToggle(!voiceRepliesEnabled)}
            disabled={!voiceRepliesLoaded}
          >
            <span className="ui-switch-thumb" />
          </button>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-white">Voice replies</span>
            <span className="text-[10px] text-white/80">
              Play finalized assistant replies with a natural voice.
            </span>
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
          {voiceRepliesLoaded ? (voiceRepliesEnabled ? "On" : "Off") : "Loading"}
        </span>
      </div>


      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">Agent skills</div>
            <div className="mt-1 text-[10px] text-white/75">
              Open the skills marketplace modal to configure and install agent skills.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenAgentSkills?.()}
            className="rounded-md border border-cyan-400/25 bg-cyan-500/12 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!onOpenAgentSkills}
          >
            {skillsButtonLabel?.trim() || "Open marketplace"}
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="text-[11px] font-medium text-white">Voice</div>
        <div className="mt-1 text-[10px] text-white/75">
          Choose the voice used for spoken agent replies.
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {CURATED_ELEVENLABS_VOICES.map((voice) => {
            const selected = voice.id === voiceRepliesVoiceId;
            return (
              <button
                key={voice.id ?? "default"}
                type="button"
                onClick={() => {
                  onVoiceRepliesVoiceChange(voice.id);
                  onVoiceRepliesPreview(voice.id, voice.label);
                }}
                disabled={!voiceRepliesLoaded}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  selected
                    ? "border-cyan-400/40 bg-cyan-500/12 text-white"
                    : "border-cyan-500/10 bg-black/15 text-white/80 hover:border-cyan-400/20 hover:bg-cyan-500/6"
                }`}
              >
                <div className="text-[11px] font-medium">{voice.label}</div>
                <div className="mt-1 text-[10px] text-white/65">{voice.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-cyan-500/10 bg-black/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-white">Speed</div>
            <div className="mt-1 text-[10px] text-white/75">
              Adjust how fast the selected voice speaks.
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200/70">
            {voiceRepliesSpeed.toFixed(2)}x
          </span>
        </div>
        <input
          type="range"
          min="0.7"
          max="1.2"
          step="0.05"
          value={voiceRepliesSpeed}
          disabled={!voiceRepliesLoaded}
          onChange={(event) => onVoiceRepliesSpeedChange(Number.parseFloat(event.target.value))}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-cyan-500/15 accent-cyan-400"
        />
        <div className="mt-1 flex items-center justify-between text-[10px] text-white/45">
          <span>Slower</span>
          <span>Faster</span>
        </div>
      </div>
    </div>
  );
}
