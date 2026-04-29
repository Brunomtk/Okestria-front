"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, ChevronDown, Loader2, Mic, Radar, PanelsTopLeft, Timer, Users2 } from "lucide-react";
import { RetroOffice3D } from "@/features/retro-office/RetroOffice3D";
import type { OfficeAgent } from "@/features/retro-office/core/types";
import { GatewayConnectScreen } from "@/features/agents/components/GatewayConnectScreen";
import { useAgentStore, type AgentState, type AgentStoreSeed } from "@/features/agents/state/store";
import {
  GatewayClient,
  buildAgentMainSessionKey,
  useGatewayConnection,
  type EventFrame,
  isSameSessionKey,
  parseAgentIdFromSessionKey,
} from "@/lib/gateway/GatewayClient";
import {
  createStudioSettingsCoordinator,
  type StudioSettingsLoadOptions,
} from "@/lib/studio/coordinator";
import { resolveDeskAssignments } from "@/lib/studio/settings";
import {
  createGatewayAgent,
  deleteGatewayAgent,
  renameGatewayAgent,
} from "@/lib/gateway/agentConfig";
import {
  runStudioBootstrapLoadOperation,
  executeStudioBootstrapLoadCommands,
  type StudioBootstrapLoadCommand,
} from "@/features/agents/operations/studioBootstrapOperation";
import { isGatewayDisconnectLikeError } from "@/lib/gateway/GatewayClient";
import { createGatewayRuntimeEventHandler } from "@/features/agents/state/gatewayRuntimeEventHandler";
import {
  buildHistoryLines,
  classifyGatewayEventKind,
  isReasoningRuntimeAgentStream,
  type AgentEventPayload,
  type ChatEventPayload,
  type SummaryPreviewSnapshot,
} from "@/features/agents/state/runtimeEventBridge";
import {
  extractText,
  extractThinking,
  extractToolLines,
  isHeartbeatPrompt,
  stripUiMetadata,
} from "@/lib/text/message-extract";
import { resolveOfficeIntentSnapshot } from "@/lib/office/deskDirectives";
import { AgentChatPanel } from "@/features/agents/components/AgentChatPanel";
import {
  RemoteAgentChatPanel,
  type RemoteAgentChatMessage,
} from "@/features/office/components/RemoteAgentChatPanel";
import {
  AgentEditorModal,
  type AgentEditorSection,
} from "@/features/agents/components/AgentEditorModal";
import { AgentCreateWizardModal } from "@/features/agents/components/AgentCreateWizardModal";
import { CreateTargetModal } from "@/features/office/components/CreateTargetModal";
import { SquadChatPanel } from "@/features/office/components/SquadChatPanel";
import { SquadCreateModal } from "@/features/office/components/SquadCreateModal";
import { SquadOpsModal } from "@/features/office/components/SquadOpsModal";
import { SquadEditDeleteModal } from "@/features/office/components/SquadEditDeleteModal";
import { CronJobsModal } from "@/features/office/components/CronJobsModal";
import { CompanyProfileModal } from "@/features/office/components/CompanyProfileModal";
// v118 — Email + Meta config consolidated into a single Tools modal with
// horizontal tabs. The standalone v115 (UserEmailConfigModal) and v117
// (UserMetaAccountModal) are no longer wired here; they remain in the
// codebase for now but can be deleted once nothing imports them.
import { UserToolsModal } from "@/features/office/components/UserToolsModal";
import { LeadChatContextModal } from "@/features/office/components/LeadChatContextModal";
import type { AgentIdentityValues } from "@/features/agents/components/AgentIdentityFields";
import { useChatInteractionController } from "@/features/agents/operations/useChatInteractionController";
import type { ChatSendPayload } from "@/features/agents/operations/chatSendOperation";
import {
  applyCreateAgentBootstrapPermissions,
  CREATE_AGENT_DEFAULT_PERMISSIONS,
} from "@/features/agents/operations/createAgentBootstrapOperation";
import { deleteAgentRecordViaStudio } from "@/features/agents/operations/deleteAgentOperation";
// v104 — replaces the old `window.confirm` for agent deletion with a
// custom modal that previews the cascade (cron jobs, runs, squads,
// files) before the destructive POST.
import { useAgentDeleteConfirmModal } from "@/features/agents/components/AgentDeleteConfirmModal";
import { previewPersistedCompanyAgentDelete } from "@/lib/agents/backend-api";
// v106 — ambient script queue: lead scouts, mail runners, squad huddle.
// Pushed when long-running operations start so the floor reflects the
// activity ("something is happening!").
import { useAmbientCueQueue } from "@/features/office/hooks/useAmbientCueQueue";
import { planAgentSettingsMutation } from "@/features/agents/operations/agentSettingsMutationWorkflow";
import {
  executeHistorySyncCommands,
  runHistorySyncOperation,
} from "@/features/agents/operations/historySyncOperation";
import {
  buildQueuedMutationBlock,
  runAgentConfigMutationLifecycle,
  runCreateAgentMutationLifecycle,
  type CreateAgentBlockState,
} from "@/features/agents/operations/mutationLifecycleWorkflow";
import { useConfigMutationQueue } from "@/features/agents/operations/useConfigMutationQueue";
import {
  RUNTIME_SYNC_DEFAULT_HISTORY_LIMIT,
  RUNTIME_SYNC_MAX_HISTORY_LIMIT,
} from "@/features/agents/operations/runtimeSyncControlWorkflow";
import {
  TRANSCRIPT_V2_ENABLED,
  buildTranscriptEntriesFromLines,
  logTranscriptDebugMetric,
} from "@/features/agents/state/transcript";
import {
  buildGatewayModelChoices,
  type GatewayModelChoice,
} from "@/lib/gateway/models";
import type { GatewayModelPolicySnapshot } from "@/lib/gateway/models";
import {
  createDefaultAgentAvatarProfile,
  normalizeAgentAvatarProfile,
  type AgentAvatarProfile,
} from "@/lib/avatars/profile";
import {
  createEmptyPersonalityDraft,
  serializePersonalityFiles,
  type PersonalityBuilderDraft,
} from "@/lib/agents/personalityBuilder";
import { writeGatewayAgentFiles } from "@/lib/gateway/agentFiles";
import {
  extractGatewayAgentId,
  fetchCompanyAgentDetails,
  fetchCompanyAgentRuntimeRoster,
  fetchCompanyAgents,
  fetchCompanyAgentScope,
  getBrowserAccessToken,
  persistCompanyAgentFromWizard,
  updateAgentAvatarProfileJson,
  type CompanyAgentScope,
  type CompanyRuntimeRosterAgent,
} from "@/lib/agents/backend-api";
import {
  listLeadGenerationJobs,
  listLeadsByCompany,
  fetchLeadChatContext,
  fetchJobChatContext,
  type LeadGenerationJob,
  type LeadSummary,
} from "@/lib/leads/lead-generation-api";
import {
  createCompanySquad,
  createSquadTask,
  deleteCompanySquad,
  deleteSquadTask,
  dispatchSquadTask,
  estimateSquadTaskDispatch,
  applySquadSessionMessage,
  applySquadSessionMessageBySession,
  fetchCompanySquads,
  fetchSquadCatalog,
  fetchSquadTask,
  fetchSquadTasks,
  updateCompanySquad,
  updateSquadTaskRun,
  type SquadCatalog,
  type SquadExecutionMode,
  type SquadSummary,
  type SquadTask,
  type SquadTaskAttachment,
  type SquadTaskDispatchEstimate,
  type SquadTaskSummary,
} from "@/lib/squads/api";
import { applyCronRunMessageBySession } from "@/lib/cron/api";
import { computeWorkingAgentIds } from "@/lib/office/agentWorkingState";
import { randomUUID } from "@/lib/uuid";
import { HistoryPanel } from "@/features/office/components/panels/HistoryPanel";
import { InboxPanel } from "@/features/office/components/panels/InboxPanel";
import { PlaybooksPanel } from "@/features/office/components/panels/PlaybooksPanel";
import { LeadOpsModal } from "@/features/office/components/LeadOpsModal";
import { SkillsMarketplaceModal } from "@/features/office/components/panels/SkillsMarketplaceModal";
import { JukeboxPanel } from "@/features/spotify-jukebox/components/JukeboxPanel";
import { JukeboxDisabledPanel } from "@/features/spotify-jukebox/components/JukeboxDisabledPanel";
import { executeBrowserJukeboxCommand } from "@/features/spotify-jukebox/agentBridge";
import {
  SOUNDCLAW_PLAYBACK_STARTED_EVENT_NAME,
  useJukeboxStore,
} from "@/features/spotify-jukebox/store";
import { useOfficeSkillTriggers } from "@/features/office/hooks/useOfficeSkillTriggers";
import { useRemoteOfficePresence } from "@/features/office/hooks/useRemoteOfficePresence";
import { useRemoteOfficeLayout } from "@/features/office/hooks/useRemoteOfficeLayout";
import { useOfficeSkillsMarketplace } from "@/features/office/hooks/useOfficeSkillsMarketplace";
import { useOfficeStandupController } from "@/features/office/hooks/useOfficeStandupController";
import { useRunLog } from "@/features/office/hooks/useRunLog";
import { useOnboardingState } from "@/features/onboarding";
import { useFinalizedAssistantReplyListener } from "@/hooks/useFinalizedAssistantReplyListener";
import { useStudioOfficePreference } from "@/hooks/useStudioOfficePreference";
import { isRemoteOfficeAgentId } from "@/features/retro-office/core/district";
import type { FurnitureItem } from "@/features/retro-office/core/types";
import { useStudioVoiceRepliesPreference } from "@/hooks/useStudioVoiceRepliesPreference";
import {
  useVoiceRecorder,
  type VoiceSendPayload,
} from "@/hooks/useVoiceRecorder";
import { useVoiceReplyPlayback } from "@/hooks/useVoiceReplyPlayback";
import {
  buildOfficeAnimationState,
  clearOfficeAnimationTriggerHold,
  createOfficeAnimationTriggerState,
  reconcileOfficeAnimationTriggerState,
  reduceOfficeAnimationTriggerEvent,
  type OfficePhoneCallRequest,
  type OfficeTextMessageRequest,
} from "@/lib/office/eventTriggers";
import { buildOfficeSkillTriggerHoldMaps } from "@/lib/office/places";
import type { MockPhoneCallScenario } from "@/lib/office/call/types";
import type { MockTextMessageScenario } from "@/lib/office/text/types";
import {
  buildOfficeDeskMonitor,
  type OfficeDeskMonitor,
} from "@/lib/office/deskMonitor";
import { deriveSkillReadinessState } from "@/lib/skills/presentation";
import type { StandupAgentSnapshot } from "@/lib/office/standup/types";
import type { SkillStatusEntry } from "@/lib/skills/types";
import { fetchCompanyEmailContext, fetchRuntimeConfigStatus, type OkestriaCompanyEmailContext, type RuntimeConfigStatusResponse } from "@/lib/auth/api";
import { ensureFreshAccessToken } from "@/lib/auth/session-client";

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
};

const ITEMS = [
  "globe",
  "books",
  "coffee",
  "palette",
  "camera",
  "waveform",
  "shield",
  "fire",
  "plant",
  "laptop",
];
const GYM_WORKOUT_LATCH_MS = 60_000;
const MAIN_AGENT_ID = "main";
const MAX_OPENCLAW_LOG_ENTRIES = 200;
const MAX_OPENCLAW_AGENT_OUTPUT_LINES = 12;
const OFFICE_DANCE_MS = 60_000;

const buildFallbackOfficeSeedsFromRuntimeRoster = (
  runtimeRoster: CompanyRuntimeRosterAgent[],
): AgentStoreSeed[] => {
  return runtimeRoster
    .filter(
      (entry) =>
        typeof entry.gatewayAgentId === "string" &&
        entry.gatewayAgentId.trim().length > 0,
    )
    .map((entry) => {
      const gatewayAgentId = entry.gatewayAgentId!.trim();
      return {
        agentId: gatewayAgentId,
        name: (entry.name ?? entry.slug ?? gatewayAgentId).trim(),
        sessionKey: buildAgentMainSessionKey(gatewayAgentId, "main"),
        avatarSeed: gatewayAgentId,
        avatarUrl: null,
        model: null,
        thinkingLevel: null,
        toolCallingEnabled: true,
        showThinkingTraces: false,
      };
    });
};

const getLatestUserRequestForAgent = (
  agent: AgentState,
): { text: string; requestKey: string } | null => {
  const transcriptEntries = Array.isArray(agent.transcriptEntries)
    ? agent.transcriptEntries
    : [];
  for (let index = transcriptEntries.length - 1; index >= 0; index -= 1) {
    const entry = transcriptEntries[index];
    if (!entry || entry.role !== "user") continue;
    const text = entry.text.trim();
    if (!text) continue;
    return {
      text,
      requestKey: `${agent.sessionKey}:${entry.sequenceKey}:${text}`,
    };
  }
  const fallback = agent.lastUserMessage?.trim() ?? "";
  if (!fallback) return null;
  return {
    text: fallback,
    requestKey: `${agent.sessionKey}:fallback:${fallback}`,
  };
};

type OpenClawLogEntry = {
  id: string;
  timestamp: string;
  eventName: string;
  eventKind: string;
  summary: string;
  role: string | null;
  messageText: string | null;
  thinkingText: string | null;
  streamText: string | null;
  toolText: string | null;
  payloadText: string;
};

type PreparedPhoneCallEntry = {
  requestKey: string;
  scenario: MockPhoneCallScenario;
};

type PreparedTextMessageEntry = {
  requestKey: string;
  scenario: MockTextMessageScenario;
};

type OfficeDeleteMutationBlockState = {
  kind: "delete-agent";
  agentId: string;
  agentName: string;
  phase: "queued" | "mutating" | "awaiting-restart";
  startedAt: number;
  sawDisconnect: boolean;
};

type PhoneCallSpeakPayload = {
  agentId: string;
  requestKey: string;
  scenario: MockPhoneCallScenario;
};

const createOpenClawLogEntry = (params: {
  eventName: string;
  eventKind: string;
  summary: string;
  payload?: unknown;
  role?: string | null;
  messageText?: string | null;
  thinkingText?: string | null;
  streamText?: string | null;
  toolText?: string | null;
}): OpenClawLogEntry => ({
  id: randomUUID(),
  timestamp: formatOpenClawTimestamp(Date.now()),
  eventName: params.eventName,
  eventKind: params.eventKind,
  summary: params.summary,
  role: params.role ?? null,
  messageText: params.messageText ?? null,
  thinkingText: params.thinkingText ?? null,
  streamText: params.streamText ?? null,
  toolText: params.toolText ?? null,
  payloadText: safeJsonStringify(params.payload ?? null),
});

const formatOpenClawTimestamp = (timestampMs: number) => {
  const date = new Date(timestampMs);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
};

const formatOpenClawValue = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed || "-";
};

const buildPhoneCallOutputLine = (text: string) => `[phone booth] ${text}`;
const buildTextMessageOutputLine = (text: string) => `[messaging booth] ${text}`;

const buildIdentityFileDraft = (identity: AgentIdentityValues) => {
  const draft = createEmptyPersonalityDraft();
  draft.identity = {
    ...draft.identity,
    ...identity,
  };
  return serializePersonalityFiles(draft);
};

const resolveOfficeMutationGuardMessage = (guardReason?: string) => {
  if (guardReason === "not-connected") {
    return "Connect to the gateway before changing the office fleet.";
  }
  if (guardReason === "create-block-active") {
    return "Finish the active agent creation before starting another fleet change.";
  }
  if (guardReason === "rename-block-active") {
    return "Finish the active rename before changing the office fleet.";
  }
  if (guardReason === "delete-block-active") {
    return "Finish the active deletion before changing the office fleet.";
  }
  return "The office fleet is busy right now.";
};

const PHONE_BOOTH_ASSISTANT_FALLBACK_RE =
  /\b(?:i\s+)?can(?:not|['’]t)\s+(?:place|make)\s+(?:phone\s+)?calls?\b/i;

const shouldSuppressPhoneBoothAssistantReply = (params: {
  agents: AgentState[];
  event: EventFrame;
  phoneCallByAgentId: Record<string, OfficePhoneCallRequest>;
}): boolean => {
  if (classifyGatewayEventKind(params.event.event) !== "runtime-chat") return false;
  const payload = params.event.payload as ChatEventPayload | undefined;
  if (!payload?.sessionKey) return false;
  const message =
    typeof payload.message === "object" && payload.message !== null
      ? (payload.message as Record<string, unknown>)
      : null;
  const role = typeof message?.role === "string" ? message.role : null;
  if (role !== "assistant") return false;
  const text = extractText(payload.message)?.trim() ?? "";
  if (!text || !PHONE_BOOTH_ASSISTANT_FALLBACK_RE.test(text)) return false;
  const agentId =
    params.agents.find((agent) => agent.sessionKey === payload.sessionKey)?.agentId ??
    parseAgentIdFromSessionKey(payload.sessionKey);
  if (!agentId) return false;
  return Boolean(params.phoneCallByAgentId[agentId]);
};

const safeJsonStringify = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch (error) {
    return `[unserializable payload: ${error instanceof Error ? error.message : "unknown error"}]`;
  }
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const renderOpenClawHighlightedText = (
  value: string,
  query: string,
): ReactNode => {
  if (!query) return value;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return value;
  const pattern = new RegExp(`(${escapeRegExp(trimmedQuery)})`, "gi");
  return value.split(pattern).map((part, index) =>
    part.toLowerCase() === trimmedQuery.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-amber-300/25 px-0.5 text-amber-100"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

const resolveMessageRole = (message: unknown) =>
  message && typeof message === "object"
    ? ((message as Record<string, unknown>).role ?? null)
    : null;

const formatOpenClawEventLogEntry = (event: EventFrame): OpenClawLogEntry => {
  const eventKind = classifyGatewayEventKind(event.event);
  const baseSummary = `seq=${event.seq ?? "-"} stateVersion=${safeJsonStringify(event.stateVersion ?? null)}`;
  let summary = baseSummary;
  let role: string | null = null;
  let messageText: string | null = null;
  let thinkingText: string | null = null;
  let streamText: string | null = null;
  let toolText: string | null = null;

  if (eventKind === "runtime-chat") {
    const payload = event.payload as ChatEventPayload | undefined;
    if (payload) {
      role =
        typeof resolveMessageRole(payload.message) === "string"
          ? String(resolveMessageRole(payload.message))
          : null;
      const text = extractText(payload.message);
      const thinking = extractThinking(payload.message ?? payload);
      const toolLines = extractToolLines(payload.message ?? payload);
      summary = `chat session=${payload.sessionKey || "-"} run=${payload.runId || "-"} state=${payload.state} role=${String(role ?? "-")} stopReason=${payload.stopReason ?? "-"} | ${baseSummary}`;
      if (text) {
        messageText = stripUiMetadata(text).trim() || text.trim();
      }
      if (thinking) {
        thinkingText = thinking.trim();
      }
      if (toolLines.length > 0) {
        toolText = toolLines.join(" | ");
      }
    }
  } else if (eventKind === "runtime-agent") {
    const payload = event.payload as AgentEventPayload | undefined;
    if (payload) {
      const data =
        payload.data && typeof payload.data === "object"
          ? (payload.data as Record<string, unknown>)
          : null;
      const phase = typeof data?.phase === "string" ? data.phase : "-";
      const text =
        typeof data?.text === "string"
          ? data.text
          : typeof data?.delta === "string"
            ? data.delta
            : "";
      const extractedThinking = extractThinking(data ?? payload);
      summary = `agent session=${payload.sessionKey || "-"} run=${payload.runId || "-"} stream=${payload.stream || "-"} phase=${phase} reasoning=${String(isReasoningRuntimeAgentStream(payload.stream ?? ""))} | ${baseSummary}`;
      if (extractedThinking) {
        thinkingText = extractedThinking.trim();
      } else if (text.trim()) {
        streamText = text.trim();
      }
    }
  }

  return createOpenClawLogEntry({
    eventName: event.event,
    eventKind,
    summary,
    role,
    messageText,
    thinkingText,
    streamText,
    toolText,
    payload: event.payload ?? null,
  });
};

const resolveLatestUserTextFromPreview = (
  previewResult: SummaryPreviewSnapshot | null | undefined,
  sessionKey: string,
): string | null => {
  const previews = Array.isArray(previewResult?.previews)
    ? previewResult.previews
    : [];
  const preview = previews.find((entry) => entry.key === sessionKey);
  if (!preview || !Array.isArray(preview.items)) return null;
  for (let index = preview.items.length - 1; index >= 0; index -= 1) {
    const item = preview.items[index];
    if (!item) continue;
    if (item.role === "assistant") continue;
    if (item.role === "user") {
      const text = item.text.trim();
      if (text) return text;
    }
  }
  return null;
};

const getDeterministicItem = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ITEMS[Math.abs(hash) % ITEMS.length];
};

const mapAgentToOffice = (agent: AgentState): OfficeAgent => {
  if (agent.status === "error") {
    return {
      id: agent.agentId,
      name: agent.name || "Unknown",
      status: "error",
      color: stringToColor(agent.agentId),
      item: getDeterministicItem(agent.agentId),
      avatarProfile: agent.avatarProfile ?? null,
    };
  }
  const isWorking = agent.status === "running" || Boolean(agent.runId);
  return {
    id: agent.agentId,
    name: agent.name || "Unknown",
    status: isWorking ? "working" : "idle",
    color: stringToColor(agent.agentId),
    item: getDeterministicItem(agent.agentId),
    avatarProfile: agent.avatarProfile ?? null,
  };
};

const mapRemotePresenceAgentToOffice = (agent: {
  agentId: string;
  name: string;
  state: "idle" | "working" | "meeting" | "error";
}): OfficeAgent => {
  const stableId = `remote:${agent.agentId}`;
  const isWorking = agent.state === "working" || agent.state === "meeting";
  return {
    id: stableId,
    name: agent.name || "Unknown",
    status: agent.state === "error" ? "error" : isWorking ? "working" : "idle",
    color: stringToColor(stableId),
    item: getDeterministicItem(stableId),
    avatarProfile: null,
  };
};

type ChatHistoryResult = {
  messages?: Array<Record<string, unknown>>;
};

type SessionsListEntry = {
  key?: string;
  updatedAt?: number | null;
  origin?: { label?: string | null } | null;
};

type SessionsListResult = {
  sessions?: SessionsListEntry[];
};

type SessionsPreviewItem = {
  role?: string;
  text?: string;
};

type SessionsPreviewEntry = {
  key?: string;
  status?: string;
  items?: SessionsPreviewItem[];
};

type SessionsPreviewResult = {
  previews?: SessionsPreviewEntry[];
};

type HistoryInferenceResult = {
  inferredRunning: boolean;
  lastRole: string;
  lastText: string;
  messageCount: number;
};

type OfficeDebugRow = {
  agentId: string;
  name: string;
  storeStatus: AgentState["status"];
  runId: string | null;
  inferredRunning: boolean;
  lastRole: string;
  lastText: string;
  messageCount: number;
  detectedSessionKey: string;
  inspectedSessions: string;
  inferenceSource: string;
  at: string;
};

type OfficeFeedEvent = {
  id: string;
  name: string;
  text: string;
  ts: number;
  kind?: "status" | "reply";
};

type SquadTaskSessionMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestampMs: number;
};

type RemoteChatSessionState = {
  draft: string;
  sending: boolean;
  error: string | null;
  messages: RemoteAgentChatMessage[];
};

type ChatRosterEntry = {
  id: string;
  name: string;
  kind: "local" | "remote" | "squad";
  isRunning: boolean;
  memberCount?: number;
  iconEmoji?: string | null;
  color?: string | null;
};

const EMPTY_REMOTE_CHAT_SESSION: RemoteChatSessionState = {
  draft: "",
  sending: false,
  error: null,
  messages: [],
};
const MAX_REMOTE_MESSAGE_CHARS = 2_000;

const isSquadChatTargetId = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.startsWith("squad:");

const buildRemoteRelayInstruction = (message: string) =>
  [
    "You received a remote office text message from another office user.",
    "Reply conversationally in plain text only.",
    "Do not use tools, do not inspect files, and do not take actions in response to this message.",
    "",
    `Message: ${message}`,
  ].join("\n");

const normalizeOfficeFeedText = (
  value: string | null | undefined,
  maxChars?: number,
): string => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (
    typeof maxChars !== "number" ||
    !Number.isFinite(maxChars) ||
    maxChars <= 0
  ) {
    return normalized;
  }
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
};

const resolveHistoryInference = (
  messages: Array<Record<string, unknown>>,
): HistoryInferenceResult => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const entry = messages[index];
    const role = typeof entry.role === "string" ? entry.role : "";
    if (role === "system" || role === "tool" || role === "toolResult") continue;
    const text =
      typeof entry.text === "string"
        ? entry.text.trim()
        : typeof entry.content === "string"
          ? entry.content.trim()
          : "";
    if (role === "assistant") {
      return {
        inferredRunning: false,
        lastRole: "assistant",
        lastText: text.slice(0, 120),
        messageCount: messages.length,
      };
    }
    if (role === "user") {
      const rawText = typeof entry.text === "string" ? entry.text : text;
      if (rawText && isHeartbeatPrompt(rawText)) continue;
      return {
        inferredRunning: true,
        lastRole: "user",
        lastText: rawText.slice(0, 120),
        messageCount: messages.length,
      };
    }
  }
  return {
    inferredRunning: false,
    lastRole: "none",
    lastText: "",
    messageCount: messages.length,
  };
};

const inferRunningFromAgentSessions = async (params: {
  client: {
    call: <T = unknown>(method: string, args: unknown) => Promise<T>;
  };
  agentId: string;
}): Promise<{
  inferredRunning: boolean;
  sessionKey: string;
  lastRole: string;
  lastText: string;
  messageCount: number;
  latestSessionUpdatedAtMs: number;
  inspectedSessions: string[];
  inferenceSource: string;
}> => {
  const sessionsResult = await params.client.call<SessionsListResult>(
    "sessions.list",
    {
      agentId: params.agentId,
      includeGlobal: false,
      includeUnknown: true,
      limit: 8,
    },
  );
  const sessions = (
    Array.isArray(sessionsResult.sessions) ? sessionsResult.sessions : []
  )
    .filter(
      (entry) => typeof entry.key === "string" && entry.key.trim().length > 0,
    )
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
    .slice(0, 4);
  const latestSessionUpdatedAtMs =
    typeof sessions[0]?.updatedAt === "number" &&
    Number.isFinite(sessions[0].updatedAt)
      ? sessions[0].updatedAt
      : 0;
  const inspectedSessions = sessions.map((entry) => {
    const key = entry.key?.trim() ?? "";
    const label = entry.origin?.label?.trim() ?? "";
    const updatedAt =
      typeof entry.updatedAt === "number" && Number.isFinite(entry.updatedAt)
        ? new Date(entry.updatedAt).toISOString()
        : "n/a";
    const base = label ? `${key} [${label}]` : key;
    return `${base} @${updatedAt}`;
  });
  const sessionKeys = sessions
    .map((entry) => entry.key?.trim() ?? "")
    .filter((key) => key.length > 0);

  if (sessionKeys.length > 0) {
    const previewResult = await params.client.call<SessionsPreviewResult>(
      "sessions.preview",
      {
        keys: sessionKeys,
        limit: 8,
        maxChars: 240,
      },
    );
    const previews = Array.isArray(previewResult.previews)
      ? previewResult.previews
      : [];
    for (const preview of previews) {
      const key = typeof preview.key === "string" ? preview.key.trim() : "";
      const items = Array.isArray(preview.items) ? preview.items : [];
      for (let index = items.length - 1; index >= 0; index -= 1) {
        const item = items[index];
        if (!item) continue;
        const role = typeof item.role === "string" ? item.role : "";
        const text = typeof item.text === "string" ? item.text.trim() : "";
        if (role === "system" || role === "tool" || role === "toolResult") {
          continue;
        }
        if (role === "assistant") break;
        if (role === "user") {
          if (text && isHeartbeatPrompt(text)) continue;
          return {
            inferredRunning: true,
            sessionKey: key,
            lastRole: "user",
            lastText: text.slice(0, 120),
            messageCount: items.length,
            latestSessionUpdatedAtMs,
            inspectedSessions,
            inferenceSource: "sessions.preview.user-tail",
          };
        }
      }
    }
  }

  for (const session of sessions) {
    const key = session.key?.trim() ?? "";
    if (!key) continue;
    const history = await params.client.call<ChatHistoryResult>(
      "chat.history",
      {
        sessionKey: key,
        limit: 24,
      },
    );
    const messages = Array.isArray(history.messages) ? history.messages : [];
    const inference = resolveHistoryInference(messages);
    if (inference.inferredRunning) {
      return {
        inferredRunning: true,
        sessionKey: key,
        lastRole: inference.lastRole,
        lastText: inference.lastText,
        messageCount: inference.messageCount,
        latestSessionUpdatedAtMs,
        inspectedSessions,
        inferenceSource: "chat.history.user-tail",
      };
    }
  }

  return {
    inferredRunning: false,
    sessionKey: "",
    lastRole: "assistant",
    lastText: "",
    messageCount: 0,
    latestSessionUpdatedAtMs,
    inspectedSessions,
    inferenceSource: "none",
  };
};

type OfficeScreenProps = {
  showOpenClawConsole?: boolean;
  companyId?: number | null;
  workspaceId?: number | null;
  companyName?: string | null;
  workspaceName?: string | null;
  userId?: number | null;
  userFullName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  initialOfficeFurniture?: FurnitureItem[] | null;
};

const OFFICE_TITLE_DEFAULTS = new Set(["Luke Headquarters", "Company Headquarters", "Headquarters"]);

export function OfficeScreen({
  // Dev-only OpenClaw console button — hidden in the shipped product.
  showOpenClawConsole = false,
  companyId = null,
  workspaceId = null,
  companyName = null,
  workspaceName = null,
  userId = null,
  userFullName = null,
  userEmail = null,
  userRole = null,
  initialOfficeFurniture = null,
}: OfficeScreenProps) {
  const searchParams = useSearchParams();
  const debugEnabled = searchParams.get("officeDebug") === "1";
  const [settingsCoordinator] = useState(() =>
    createStudioSettingsCoordinator(),
  );
  const {
    client,
    status,
    connectPromptReady,
    shouldPromptForConnect,
    gatewayUrl,
    token,
    localGatewayDefaults,
    error: gatewayError,
    connect,
    disconnect,
    useLocalGatewayDefaults,
    setGatewayUrl,
    setToken,
  } =
    useGatewayConnection(settingsCoordinator);
  const { state, dispatch, hydrateAgents, setError, setLoading } =
    useAgentStore();
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [companyScopedAgentIds, setCompanyScopedAgentIds] = useState<string[] | null>(null);
  const companyScopedAgentIdsRef = useRef<string[] | null>(null);
  const companyScopedAgentSlugsRef = useRef<string[] | null>(null);
  const lastCompanyScopedAgentIdsLoadAtRef = useRef(0);
  const [didAttemptGatewayConnect, setDidAttemptGatewayConnect] = useState(false);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [showGatewayErrorModal, setShowGatewayErrorModal] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [debugRows, setDebugRows] = useState<OfficeDebugRow[]>([]);
  const [feedEvents, setFeedEvents] = useState<OfficeFeedEvent[]>([]);
  const officeAgentCacheRef = useRef<
    Map<
      string,
      {
        agent: AgentState;
        deskHeld: boolean;
        gymHeld: boolean;
        latchedWorking: boolean;
        officeAgent: OfficeAgent;
        phoneBoothHeld: boolean;
        qaHeld: boolean;
        smsBoothHeld: boolean;
        // v131 — squad color the cached entry was built with. Cache
        // hits when this matches the current value; otherwise the
        // memo recomputes the entry so the override picks up squad
        // edits immediately.
        squadColor: string | undefined;
      }
    >
  >(new Map());
  const deskMonitorCacheRef = useRef<
    Map<string, { agent: AgentState; monitor: OfficeDeskMonitor }>
  >(new Map());
  const [openClawLogEntries, setOpenClawLogEntries] = useState<
    OpenClawLogEntry[]
  >([]);
  const [openClawConsoleCollapsed, setOpenClawConsoleCollapsed] =
    useState(true);
  const [openClawConsoleSearch, setOpenClawConsoleSearch] = useState("");
  const [openClawConsoleCopyStatus, setOpenClawConsoleCopyStatus] = useState<
    "idle" | "copied" | "error"
  >("idle");
  const [openClawConsoleModalOpen, setOpenClawConsoleModalOpen] = useState(false);
  const [officeTriggerState, setOfficeTriggerState] = useState(() =>
    createOfficeAnimationTriggerState(),
  );
  const prevWorkingRef = useRef<Record<string, boolean>>({});
  const prevAssistantPreviewRef = useRef<
    Record<string, { ts: number; text: string }>
  >({});
  const [runCountByAgentId, setRunCountByAgentId] = useState<
    Record<string, number>
  >({});
  const [lastSeenByAgentId, setLastSeenByAgentId] = useState<
    Record<string, number>
  >({});
  const [marketplaceGymHoldByAgentId, setMarketplaceGymHoldByAgentId] =
    useState<Record<string, boolean>>({});
  const [gymCooldownUntilByAgentId, setGymCooldownUntilByAgentId] = useState<
    Record<string, number>
  >({});
  const prevImmediateGymHoldRef = useRef<Record<string, boolean>>({});
  const [monitorAgentId, setMonitorAgentId] = useState<string | null>(null);
  const [githubReviewAgentId, setGithubReviewAgentId] = useState<string | null>(
    null,
  );
  const [qaTestingAgentId, setQaTestingAgentId] = useState<string | null>(null);
  const gatewayConfigSnapshot = useRef<GatewayModelPolicySnapshot | null>(null);
  const loadAgentsInFlightRef = useRef<Promise<void> | null>(null);
  const connectionEpochRef = useRef(0);
  const backendAgentByGatewayIdRef = useRef<Map<string, number>>(new Map());
  const lastLoadAgentsStartedAtRef = useRef(0);
  const lastGatewayActivityAtRef = useRef(0);
  const stateRef = useRef(state);
  const officeTriggerStateRef = useRef(officeTriggerState);
  const historyInFlightRef = useRef<Set<string>>(new Set());
  const lastTransportHistoryRefreshKeyRef = useRef<Record<string, string>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const chatRosterMode = "company"; // Always show all agents
  const [chatTargetView, setChatTargetView] = useState<"all" | "agents" | "squads">("all");
  const [companySquads, setCompanySquads] = useState<SquadSummary[]>([]);
  const [squadChatById, setSquadChatById] = useState<Record<string, RemoteChatSessionState>>({});
  const [selectedChatAgentId, setSelectedChatAgentId] = useState<string | null>(
    null,
  );
  const [leadChatContextOpen, setLeadChatContextOpen] = useState(false);
  const [leadChatContextLoading, setLeadChatContextLoading] = useState(false);
  const [leadChatContextTab, setLeadChatContextTab] = useState<"jobs" | "leads">("jobs");
  const [leadChatContextError, setLeadChatContextError] = useState<string | null>(null);
  const [leadChatJobs, setLeadChatJobs] = useState<LeadGenerationJob[]>([]);
  const [leadChatLeads, setLeadChatLeads] = useState<LeadSummary[]>([]);
  const [leadChatBusyKey, setLeadChatBusyKey] = useState<string | null>(null);
  const pendingLeadChatContextRef = useRef<string | null>(null);
  const [pendingLeadContextLabel, setPendingLeadContextLabel] = useState<string | null>(null);
  const [remoteChatByAgentId, setRemoteChatByAgentId] = useState<
    Record<string, RemoteChatSessionState>
  >({});
  const [agentEditorAgentId, setAgentEditorAgentId] = useState<string | null>(null);
  const [agentEditorInitialSection, setAgentEditorInitialSection] =
    useState<AgentEditorSection>("avatar");
  const [createAgentWizardNonce, setCreateAgentWizardNonce] = useState(0);
  const [createTargetModalOpen, setCreateTargetModalOpen] = useState(false);
  const [createSquadModalOpen, setCreateSquadModalOpen] = useState(false);
  const [createSquadBusy, setCreateSquadBusy] = useState(false);
  const [createSquadError, setCreateSquadError] = useState<string | null>(null);
  const [createSquadCatalog, setCreateSquadCatalog] = useState<SquadCatalog | null>(null);
  const [squadOpsModalOpen, setSquadOpsModalOpen] = useState(false);
  const [squadOpsSquadId, setSquadOpsSquadId] = useState<string | null>(null);
  const [squadOpsTasks, setSquadOpsTasks] = useState<SquadTaskSummary[]>([]);
  const [squadOpsSelectedTask, setSquadOpsSelectedTask] = useState<SquadTask | null>(null);
  const [selectedSquadTasks, setSelectedSquadTasks] = useState<SquadTask[]>([]);
  const [squadChatTasksBySquadId, setSquadChatTasksBySquadId] = useState<Record<string, SquadTask[]>>({});
  const [activeSquadChatTaskBySquadId, setActiveSquadChatTaskBySquadId] = useState<Record<string, number | null>>({});
  const [squadTaskSessionByTaskId, setSquadTaskSessionByTaskId] = useState<Record<number, { sessionKey: string; loading: boolean; error: string | null; messages: SquadTaskSessionMessage[]; outputLines: string[] }>>({});
  const [squadOpsLoading, setSquadOpsLoading] = useState(false);
  const [squadOpsRefreshingTask, setSquadOpsRefreshingTask] = useState(false);
  const [squadOpsCreateBusy, setSquadOpsCreateBusy] = useState(false);
  const [squadOpsDispatchBusy, setSquadOpsDispatchBusy] = useState(false);
  const [squadOpsError, setSquadOpsError] = useState<string | null>(null);
  const [squadOpsRuntimeStatus, setSquadOpsRuntimeStatus] = useState<RuntimeConfigStatusResponse | null>(null);
  const [squadOpsDispatchEstimate, setSquadOpsDispatchEstimate] = useState<SquadTaskDispatchEstimate | null>(null);
  const [squadOpsDispatchApprovalMode, setSquadOpsDispatchApprovalMode] = useState<"pending" | "retryFailed" | "redispatchAll" | null>(null);
  const [squadOpsDispatchEstimateBusy, setSquadOpsDispatchEstimateBusy] = useState(false);
  const [createAgentWizardOpen, setCreateAgentWizardOpen] = useState(false);
  const [createAgentBusy, setCreateAgentBusy] = useState(false);
  const [createAgentModalError, setCreateAgentModalError] = useState<string | null>(
    null,
  );
  const [createAgentBlock, setCreateAgentBlock] =
    useState<CreateAgentBlockState | null>(null);
  const [deleteAgentBlock, setDeleteAgentBlock] =
    useState<OfficeDeleteMutationBlockState | null>(null);
  const [preparedPhoneCallsByAgentId, setPreparedPhoneCallsByAgentId] = useState<
    Record<string, PreparedPhoneCallEntry>
  >({});
  const [preparedTextMessagesByAgentId, setPreparedTextMessagesByAgentId] = useState<
    Record<string, PreparedTextMessageEntry>
  >({});
  const promptedPhoneCallKeysRef = useRef<Set<string>>(new Set());
  const preparedPhoneCallKeysRef = useRef<Set<string>>(new Set());
  const spokenPhoneCallKeysRef = useRef<Set<string>>(new Set());
  const promptedTextMessageKeysRef = useRef<Set<string>>(new Set());
  const preparedTextMessageKeysRef = useRef<Set<string>>(new Set());
  const [deskAssignmentByDeskUid, setDeskAssignmentByDeskUid] = useState<
    Record<string, string>
  >({});
  const [gatewayModels, setGatewayModels] = useState<GatewayModelChoice[]>([]);
  const [hqModalOpen, setHqModalOpen] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [leadOpsModalOpen, setLeadOpsModalOpen] = useState(false);
  const [cronJobsModalOpen, setCronJobsModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  // v118 — single modal for all per-user external tool wiring (email +
  // Meta IG/FB/WhatsApp). Opened from the Tools button in the toolbar
  // group next to the avatar profile button. `userToolsInitialTab` lets
  // a future caller (e.g. an empty-state nudge) jump straight to a
  // specific tab; defaults to "email".
  const [userToolsModalOpen, setUserToolsModalOpen] = useState(false);
  const [userToolsInitialTab, setUserToolsInitialTab] = useState<"email" | "meta">("email");
  const leadOpsAutoOpenTimeoutRef = useRef<number | null>(null);
  const [danceUntilByAgentId, setDanceUntilByAgentId] = useState<Record<string, number>>({});
  const initJukeboxStore = useJukeboxStore((state) => state.init);
  const jukeboxToken = useJukeboxStore((state) => state.token);
  // Auto-open jukebox panel for legacy direct-auth callbacks.
  const [jukeboxOpen, setJukeboxOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const searchParams = new URL(window.location.href).searchParams;
    return searchParams.has("code");
  });
  const [activeSidebarTab, setActiveSidebarTab] =
    useState<"inbox" | "history" | "playbooks">("inbox");
  const pendingJukeboxCommandTimeoutsRef = useRef<
    Map<string, { requestKey: string; timeoutId: number }>
  >(new Map());
  const handledJukeboxRequestKeyByAgentIdRef = useRef<Record<string, string>>({});
  const router = useRouter();
  const { showOnboarding, completeOnboarding, resetOnboarding } =
    useOnboardingState();
  const [forceShowOnboarding, setForceShowOnboarding] = useState(false);
  useEffect(() => {
    initJukeboxStore();
  }, [initJukeboxStore]);
  useEffect(() => {
    if (!chatOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setChatOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [chatOpen]);
  useEffect(() => {
    const handlePlaybackStarted = () => {
      const now = Date.now();
      const until = now + OFFICE_DANCE_MS;
      // Use stateRef to access agents without causing re-renders
      const currentAgents = stateRef.current?.agents ?? [];
      setDanceUntilByAgentId((previous) => {
        const next: Record<string, number> = {};
        for (const agent of currentAgents) {
          next[agent.agentId] = until;
        }
        // Check if anything actually changed
        const hasChanges = Object.keys(next).some(
          (id) => previous[id] !== next[id]
        );
        if (!hasChanges && Object.keys(previous).length === Object.keys(next).length) {
          return previous;
        }
        return { ...previous, ...next };
      });
    };
    window.addEventListener(
      SOUNDCLAW_PLAYBACK_STARTED_EVENT_NAME,
      handlePlaybackStarted,
    );
    return () => {
      window.removeEventListener(
        SOUNDCLAW_PLAYBACK_STARTED_EVENT_NAME,
        handlePlaybackStarted,
      );
    };
  }, [companyId]);
  useEffect(() => {
    return () => {
      for (const pendingEntry of pendingJukeboxCommandTimeoutsRef.current.values()) {
        window.clearTimeout(pendingEntry.timeoutId);
      }
      pendingJukeboxCommandTimeoutsRef.current.clear();
    };
  }, []);
  const normalizedCompanyName = companyName?.trim() || null;
  const normalizedWorkspaceName = workspaceName?.trim() || null;

  // ── Company email context (loaded once, injected silently into every chat message) ──
  const companyContextRef = useRef<string | null>(null);
  useEffect(() => {
    if (!companyId) return;
    const token = getBrowserAccessToken();
    if (!token) return;
    fetchCompanyEmailContext(companyId, token)
      .then((ctx: OkestriaCompanyEmailContext) => {
        const parts: string[] = [];
        if (normalizedCompanyName) parts.push(`Company: ${normalizedCompanyName}`);
        if (ctx.description?.trim()) parts.push(`About: ${ctx.description.trim()}`);
        if (ctx.products?.trim()) parts.push(`Products/Services: ${ctx.products.trim()}`);
        if (ctx.tone?.trim()) parts.push(`Communication tone: ${ctx.tone.trim()}`);
        if (ctx.website?.trim()) parts.push(`Website: ${ctx.website.trim()}`);
        if (ctx.phone?.trim()) parts.push(`Phone: ${ctx.phone.trim()}`);
        if (ctx.extraNotes?.trim()) parts.push(`Additional notes: ${ctx.extraNotes.trim()}`);
        if (userFullName?.trim()) parts.push(`Current user: ${userFullName.trim()}`);
        if (userRole?.trim()) parts.push(`User role: ${userRole.trim()}`);
        companyContextRef.current = parts.length > 0 ? parts.join("\n") : null;
      })
      .catch(() => {
        // Silently ignore — company context is best-effort
      });
  }, [companyId, normalizedCompanyName, userFullName, userRole]);
  const companyHeadline = normalizedCompanyName ?? normalizedWorkspaceName ?? "Headquarters";
  const preferredOfficeTitle = normalizedCompanyName
    ? `${normalizedCompanyName} Headquarters`
    : normalizedWorkspaceName
      ? `${normalizedWorkspaceName} Headquarters`
      : "Company Headquarters";

  const {
    loaded: officeTitleLoaded,
    title: officeTitle,
    remoteOfficeEnabled,
    remoteOfficeSourceKind,
    remoteOfficeLabel,
    remoteOfficePresenceUrl,
    remoteOfficeGatewayUrl,
    remoteOfficeTokenConfigured,
    setTitle: setOfficeTitle,
    setRemoteOfficeEnabled,
    setRemoteOfficeSourceKind,
    setRemoteOfficeLabel,
    setRemoteOfficePresenceUrl,
    setRemoteOfficeGatewayUrl,
    setRemoteOfficeToken,
  } = useStudioOfficePreference({
    gatewayUrl,
    settingsCoordinator,
  });

  const effectiveOfficeTitle = useMemo(() => {
    const normalizedTitle = officeTitle?.trim() ?? "";
    if (!normalizedTitle || OFFICE_TITLE_DEFAULTS.has(normalizedTitle)) {
      return preferredOfficeTitle;
    }
    return normalizedTitle;
  }, [officeTitle, preferredOfficeTitle]);

  useEffect(() => {
    if (!officeTitleLoaded) return;
    const normalizedTitle = officeTitle?.trim() ?? "";
    if (!normalizedCompanyName) return;
    if (normalizedTitle && !OFFICE_TITLE_DEFAULTS.has(normalizedTitle)) return;
    if (normalizedTitle === preferredOfficeTitle) return;
    setOfficeTitle(preferredOfficeTitle);
  }, [officeTitle, officeTitleLoaded, normalizedCompanyName, preferredOfficeTitle, setOfficeTitle]);
  const {
    error: remoteOfficeError,
    loaded: remoteOfficeLoaded,
    snapshot: remoteOfficeSnapshot,
  } = useRemoteOfficePresence({
    enabled: remoteOfficeEnabled,
    sourceKind: remoteOfficeSourceKind,
    presenceUrl: remoteOfficePresenceUrl,
    gatewayUrl: remoteOfficeGatewayUrl,
    allowedAgentIds: companyScopedAgentIds,
  });
  const { snapshot: remoteOfficeLayoutSnapshot } = useRemoteOfficeLayout({
    enabled: remoteOfficeEnabled,
    presenceUrl: remoteOfficePresenceUrl,
  });
  const {
    loaded: voiceRepliesLoaded,
    preference: voiceRepliesPreference,
    enabled: voiceRepliesEnabled,
    voiceId: voiceRepliesVoiceId,
    speed: voiceRepliesSpeed,
    setEnabled: setVoiceRepliesEnabled,
    setVoiceId: setVoiceRepliesVoiceId,
    setSpeed: setVoiceRepliesSpeed,
  } = useStudioVoiceRepliesPreference({
    gatewayUrl,
    settingsCoordinator,
  });
  const {
    enqueue: enqueueVoiceReply,
    preview: previewVoiceReply,
    stop: stopVoiceReplyPlayback,
  } = useVoiceReplyPlayback({
    enabled: voiceRepliesEnabled,
    provider: voiceRepliesPreference.provider,
    voiceId: voiceRepliesPreference.voiceId,
    speed: voiceRepliesPreference.speed,
  });
  const showOnboardingWizard = false; // onboarding modal disabled by request
  const handleOpenOnboarding = useCallback(() => {
    resetOnboarding();
    setForceShowOnboarding(true);
  }, [resetOnboarding]);
  const handleCompleteOnboarding = useCallback(() => {
    completeOnboarding();
    setForceShowOnboarding(false);
  }, [completeOnboarding]);

  const resolveBackendAgentIdForGatewayAgent = useCallback(async (gatewayAgentId: string) => {
    const cached = backendAgentByGatewayIdRef.current.get(gatewayAgentId);
    if (typeof cached === "number" && Number.isFinite(cached)) return cached;
    if (!companyId) return null;
    const token = getBrowserAccessToken();
    const companyAgents = await fetchCompanyAgents(companyId, token);
    for (const summary of companyAgents) {
      try {
        const details = await fetchCompanyAgentDetails(summary.id, token);
        const mappedGatewayAgentId = extractGatewayAgentId(details);
        if (mappedGatewayAgentId) {
          backendAgentByGatewayIdRef.current.set(mappedGatewayAgentId, details.id);
        }
      } catch {
        // ignore broken company records
      }
    }
    return backendAgentByGatewayIdRef.current.get(gatewayAgentId) ?? null;
  }, [companyId]);

  const handleAvatarProfileSave = useCallback(
    (agentId: string, profile: AgentAvatarProfile) => {
      dispatch({
        type: "updateAgent",
        agentId,
        patch: { avatarProfile: profile, avatarSeed: profile.seed },
      });
      const key = gatewayUrl.trim();
      if (!key) return;
      settingsCoordinator.schedulePatch(
        { avatars: { [key]: { [agentId]: profile } } },
        0,
      );
      // Persist avatar profile to backend so it loads with the agent record
      const backendId = backendAgentByGatewayIdRef.current.get(agentId);
      if (typeof backendId === "number" && Number.isFinite(backendId)) {
        const token = getBrowserAccessToken();
        updateAgentAvatarProfileJson({
          backendAgentId: backendId,
          avatarProfileJson: JSON.stringify(profile),
          token,
        }).catch(() => {/* silent – local settings are the fallback */});
      } else if (companyId) {
        // Resolve backend ID first, then persist
        const token = getBrowserAccessToken();
        void (async () => {
          try {
            const resolved = await resolveBackendAgentIdForGatewayAgent(agentId);
            if (typeof resolved === "number") {
              await updateAgentAvatarProfileJson({
                backendAgentId: resolved,
                avatarProfileJson: JSON.stringify(profile),
                token,
              });
            }
          } catch {/* silent */}
        })();
      }
    },
    [dispatch, gatewayUrl, settingsCoordinator, companyId, resolveBackendAgentIdForGatewayAgent],
  );
  const openAgentEditor = useCallback(
    (agentId: string, initialSection: AgentEditorSection = "avatar") => {
      setAgentEditorAgentId(agentId);
      setAgentEditorInitialSection(initialSection);
      setSelectedChatAgentId(agentId);
      dispatch({ type: "selectAgent", agentId });
    },
    [dispatch],
  );

  const handleDeskAssignmentChange = useCallback(
    (deskUid: string, agentId: string | null) => {
      const key = gatewayUrl.trim();
      const normalizedDeskUid = deskUid.trim();
      if (!key || !normalizedDeskUid) return;
      setDeskAssignmentByDeskUid((previous) => {
        const next = { ...previous };
        if (agentId) {
          for (const [existingDeskUid, existingAgentId] of Object.entries(
            next,
          )) {
            if (
              existingDeskUid !== normalizedDeskUid &&
              existingAgentId === agentId
            ) {
              delete next[existingDeskUid];
            }
          }
          next[normalizedDeskUid] = agentId;
        } else {
          delete next[normalizedDeskUid];
        }
        return next;
      });
      settingsCoordinator.schedulePatch(
        {
          deskAssignments: {
            [key]: {
              [normalizedDeskUid]: agentId,
            },
          },
        },
        0,
      );
    },
    [gatewayUrl, settingsCoordinator],
  );

  const handleDeskAssignmentsReset = useCallback(
    (deskUids: string[]) => {
      const key = gatewayUrl.trim();
      if (!key || deskUids.length === 0) return;
      setDeskAssignmentByDeskUid((previous) => {
        const next = { ...previous };
        for (const deskUid of deskUids) delete next[deskUid];
        return next;
      });
      settingsCoordinator.schedulePatch(
        {
          deskAssignments: {
            [key]: Object.fromEntries(
              deskUids.map((deskUid) => [deskUid, null]),
            ),
          },
        },
        0,
      );
    },
    [gatewayUrl, settingsCoordinator],
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const hasRunningAgents = useMemo(
    () =>
      state.agents.some(
        (agent) => agent.status === "running" || Boolean(agent.runId),
      ),
    [state.agents],
  );

  const cronAgentOptions = useMemo<{
    id: number;
    name: string;
    slug?: string | null;
    avatarUrl?: string | null;
  }[]>(() => {
    const out: { id: number; name: string; slug?: string | null; avatarUrl?: string | null }[] = [];
    const seen = new Set<number>();
    for (const agent of state.agents) {
      const backendId = backendAgentByGatewayIdRef.current.get(agent.agentId);
      if (typeof backendId === "number" && !seen.has(backendId)) {
        seen.add(backendId);
        out.push({
          id: backendId,
          name: agent.name || `Agent ${backendId}`,
          slug: agent.agentId ?? null,
          avatarUrl: agent.avatarUrl ?? null,
        });
      }
    }
    return out;
  }, [state.agents]);

  const cronSquadOptions = useMemo<{ id: string; name: string }[]>(
    () => companySquads.map((s) => ({ id: s.id, name: s.name })),
    [companySquads],
  );

  // v129 — Set of backend agent ids already assigned to some squad.
  // Used by the SquadCreateModal picker to hide already-taken agents.
  // MUST be memoised so its identity is stable across renders — passing
  // a fresh Set per render would re-trigger the modal's reset useEffect
  // on every parent tick (v128 bug: color/icon kept reshuffling and the
  // Squad name auto-overrode the operator's edits).
  const excludedAgentIdsForCreate = useMemo<ReadonlySet<number>>(() => {
    const ids = new Set<number>();
    for (const squad of companySquads) {
      for (const member of squad.members) {
        if (typeof member.backendAgentId === "number") {
          ids.add(member.backendAgentId);
        }
      }
    }
    return ids;
  }, [companySquads]);

  // v93 — avatar lookup keyed by gatewayAgentId so SquadChatPanel can
  // render each member's real photo (falls back to the multiavatar SVG
  // inside <AgentAvatar /> when the agent has no upload).
  const squadAgentAvatarLookup = useMemo<Record<string, string | null | undefined>>(() => {
    const map: Record<string, string | null | undefined> = {};
    for (const agent of state.agents) {
      const key = (agent.agentId ?? "").toString().trim();
      if (!key) continue;
      map[key] = agent.avatarUrl ?? null;
    }
    return map;
  }, [state.agents]);
  const hasDeleteMutationBlock = deleteAgentBlock?.kind === "delete-agent";
  const { enqueueConfigMutation } = useConfigMutationQueue({
    status,
    hasRunningAgents,
    hasRestartBlockInProgress: Boolean(
      deleteAgentBlock && deleteAgentBlock.phase !== "queued",
    ),
  });

  useEffect(() => {
    officeTriggerStateRef.current = officeTriggerState;
  }, [officeTriggerState]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 2000);
    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    if (status === "connecting") {
      setDidAttemptGatewayConnect(true);
    }
    if (status === "connected") {
      setHasConnectedOnce(true);
      setShowGatewayErrorModal(false);
    }
    // Show error modal when disconnected after having connected once
    if (status === "disconnected" && hasConnectedOnce && gatewayError) {
      setShowGatewayErrorModal(true);
    }
  }, [status, hasConnectedOnce, gatewayError]);

  useEffect(() => {
    if (gatewayError) {
      setDidAttemptGatewayConnect(true);
    }
  }, [gatewayError]);

  const loadStudioSettings = useCallback(
    (options?: StudioSettingsLoadOptions) => settingsCoordinator.loadSettings(options),
    [settingsCoordinator],
  );

  useEffect(() => {
    let cancelled = false;
    const key = gatewayUrl.trim();
    if (!key) {
      setDeskAssignmentByDeskUid({});
      return;
    }
    void (async () => {
      try {
        const settings = await loadStudioSettings();
        if (cancelled) return;
        setDeskAssignmentByDeskUid(
          settings ? resolveDeskAssignments(settings, key) : {},
        );
      } catch {
        if (cancelled) return;
        setDeskAssignmentByDeskUid({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gatewayUrl, loadStudioSettings]);

  const loadCompanyScopedAgentScope = useCallback(async (force = false): Promise<CompanyAgentScope> => {
    const now = Date.now();
    if (
      !force &&
      companyScopedAgentIdsRef.current !== null &&
      companyScopedAgentSlugsRef.current !== null &&
      now - lastCompanyScopedAgentIdsLoadAtRef.current < 30_000
    ) {
      return {
        gatewayAgentIds: companyScopedAgentIdsRef.current,
        agentSlugs: companyScopedAgentSlugsRef.current,
      };
    }
    try {
      const scope = await fetchCompanyAgentScope();
      companyScopedAgentIdsRef.current = scope.gatewayAgentIds;
      companyScopedAgentSlugsRef.current = scope.agentSlugs;
      lastCompanyScopedAgentIdsLoadAtRef.current = now;
      setCompanyScopedAgentIds(scope.gatewayAgentIds);
      return scope;
    } catch (error) {
      if (
        companyScopedAgentIdsRef.current !== null &&
        companyScopedAgentSlugsRef.current !== null
      ) {
        console.warn("Failed to refresh company-scoped agent scope. Reusing cached scope.", error);
        return {
          gatewayAgentIds: companyScopedAgentIdsRef.current,
          agentSlugs: companyScopedAgentSlugsRef.current,
        };
      }
      throw error;
    }
  }, []);

  const loadCompanySquads = useCallback(async (force = false) => {
    try {
      const squads = await fetchCompanySquads({ companyId: companyId ?? undefined });
      if (force || squads.length > 0 || companySquads.length === 0) {
        setCompanySquads(squads);
      }
    } catch {
      if (force) {
        setCompanySquads([]);
      }
    }
  }, [companyId, companySquads.length]);

  const loadCreateSquadCatalog = useCallback(async () => {
    try {
      const catalog = await fetchSquadCatalog({ companyId: companyId ?? undefined });
      setCreateSquadCatalog(catalog);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load the squad catalog right now.";
      setCreateSquadError(message);
      setCreateSquadCatalog(null);
    }
  }, [companyId]);

  useEffect(() => {
    void loadCompanySquads(false);
  }, [loadCompanySquads, state.agents.length]);

  // Keep the access token fresh while the user lingers on the Office screen.
  // We decode the JWT expiry and proactively refresh before it lapses so they
  // don't get booted back to the login page while the 3D scene is idle.
  useEffect(() => {
    let cancelled = false;
    const REFRESH_CHECK_MS = 5 * 60_000; // check every 5 minutes

    const tick = async () => {
      if (cancelled) return;
      try {
        // 2 minute pre-expiry window: refreshes if the current token has less
        // than ~120s of life remaining.
        await ensureFreshAccessToken(120);
      } catch {
        /* silent — next tick will retry */
      }
    };

    // Kick off immediately so we refresh right when the user opens the Office.
    void tick();
    const intervalId = window.setInterval(tick, REFRESH_CHECK_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void tick();
    };
    const handleFocus = () => {
      void tick();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    // First load is forceful so the scope is hydrated fresh.
    void loadCompanyScopedAgentScope(true);
    // Subsequent polls reuse the gatewayAgentId cache to avoid a
    // 1 + N fan-out of /api/Agents/by-company + /api/Agents/{id} requests
    // every interval. Bumped from 20s to 120s, skipped when hidden.
    const intervalId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void loadCompanyScopedAgentScope(false);
    }, 120_000);
    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadCompanyScopedAgentScope(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadCompanyScopedAgentScope, status]);

  useEffect(() => {
    const allowedIds = companyScopedAgentIdsRef.current;
    if (!Array.isArray(allowedIds)) return;
    const allowedIdSet = new Set(
      allowedIds
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    );
    // Safety: if the scope poll returned an empty allow-list but we *do* have
    // agents loaded, assume the scope call was transient (e.g. the tab just
    // woke up from standby and the backend scope endpoint hasn't warmed up).
    // Do NOT flush every agent off-screen — wait for the next successful poll.
    if (allowedIdSet.size === 0 && state.agents.length > 0) {
      return;
    }
    for (const agent of state.agents) {
      if (!allowedIdSet.has(agent.agentId.trim())) {
        dispatch({ type: "removeAgent", agentId: agent.agentId });
      }
    }
    setRemoteChatByAgentId((previous) => {
      const next = Object.fromEntries(
        Object.entries(previous).filter(([agentId]) => allowedIdSet.has(agentId.trim())),
      );
      return Object.keys(next).length === Object.keys(previous).length ? previous : next;
    });
    setPreparedPhoneCallsByAgentId((previous) => {
      const next = Object.fromEntries(
        Object.entries(previous).filter(([agentId]) => allowedIdSet.has(agentId.trim())),
      );
      return Object.keys(next).length === Object.keys(previous).length ? previous : next;
    });
    setPreparedTextMessagesByAgentId((previous) => {
      const next = Object.fromEntries(
        Object.entries(previous).filter(([agentId]) => allowedIdSet.has(agentId.trim())),
      );
      return Object.keys(next).length === Object.keys(previous).length ? previous : next;
    });
  }, [companyScopedAgentIds, dispatch, state.agents]);

  // Seed avatar profiles from backend on first load so agents render with the
  // latest persisted avatar — always overwrite the local profile so freshly
  // saved customizations (top style, hair, accessories, etc.) come back after
  // a page reload. Previously this only hydrated when the local profile was
  // missing, which caused the "old agent" to stick around on refresh.
  const backendAvatarSeedDoneRef = useRef(false);
  useEffect(() => {
    if (backendAvatarSeedDoneRef.current) return;
    if (!companyId || state.agents.length === 0) return;
    backendAvatarSeedDoneRef.current = true;
    void (async () => {
      try {
        const token = getBrowserAccessToken();
        const companyAgents = await fetchCompanyAgents(companyId, token);
        for (const summary of companyAgents) {
          if (!summary.avatarProfileJson) continue;
          try {
            const parsed = JSON.parse(summary.avatarProfileJson) as Record<string, unknown>;
            const profile = normalizeAgentAvatarProfile(parsed, String(summary.id));
            // Find matching gateway agent by matching through details
            const details = await fetchCompanyAgentDetails(summary.id, token);
            const gatewayAgentId = extractGatewayAgentId(details);
            if (!gatewayAgentId) continue;
            backendAgentByGatewayIdRef.current.set(gatewayAgentId, summary.id);
            // Seed into local state and settings — always overwrite so the
            // 3D office scene and Agents screen pick up the newest fields.
            const existingAgent = state.agents.find((a) => a.agentId === gatewayAgentId);
            if (existingAgent) {
              dispatch({
                type: "updateAgent",
                agentId: gatewayAgentId,
                patch: { avatarProfile: profile, avatarSeed: profile.seed },
              });
              const key = gatewayUrl.trim();
              if (key) {
                settingsCoordinator.schedulePatch(
                  { avatars: { [key]: { [gatewayAgentId]: profile } } },
                  0,
                );
              }
            }
          } catch {/* ignore malformed profiles */}
        }
      } catch {/* silent */}
    })();
  }, [companyId, state.agents, dispatch, gatewayUrl, settingsCoordinator]);

  const loadAgents = useCallback(async (options?: {
    forceSettings?: boolean;
    minIntervalMs?: number;
    onlyWhenIdleForMs?: number;
    settingsMaxAgeMs?: number;
    silent?: boolean;
  }) => {
    if (status !== "connected") return;
    if (loadAgentsInFlightRef.current) return loadAgentsInFlightRef.current;
    const now = Date.now();
    const minIntervalMs = options?.minIntervalMs ?? 0;
    if (
      minIntervalMs > 0 &&
      now - lastLoadAgentsStartedAtRef.current < minIntervalMs
    ) {
      return;
    }
    const onlyWhenIdleForMs = options?.onlyWhenIdleForMs ?? 0;
    if (
      onlyWhenIdleForMs > 0 &&
      now - lastGatewayActivityAtRef.current < onlyWhenIdleForMs
    ) {
      return;
    }
    lastLoadAgentsStartedAtRef.current = now;
    const connectionEpochAtStart = connectionEpochRef.current;
    const task = (async () => {
      if (!options?.silent) {
        setLoading(true);
      }
      try {
        const settingsLoadOptions: StudioSettingsLoadOptions | undefined =
          options?.forceSettings
            ? { force: true }
            : { maxAgeMs: options?.settingsMaxAgeMs ?? 60_000 };
        const companyAgentScope = await loadCompanyScopedAgentScope(options?.forceSettings === true);
        const commands = await runStudioBootstrapLoadOperation({
          client,
          gatewayUrl,
          cachedConfigSnapshot: gatewayConfigSnapshot.current,
          loadStudioSettings: () => loadStudioSettings(settingsLoadOptions),
          isDisconnectLikeError: isGatewayDisconnectLikeError,
          preferredSelectedAgentId: null,
          hasCurrentSelection: false,
          logError: console.error,
          allowedAgentIds: companyAgentScope.gatewayAgentIds,
          allowedAgentSlugs: companyAgentScope.agentSlugs,
        });
        if (connectionEpochAtStart !== connectionEpochRef.current) {
          return;
        }
        const previousAgents = stateRef.current.agents;
        let commandsToExecute: StudioBootstrapLoadCommand[] = commands;
        const hydrateCommand = commands.find(
          (command): command is Extract<StudioBootstrapLoadCommand, { kind: "hydrate-agents" }> =>
            command.kind === "hydrate-agents",
        );
        if (hydrateCommand && hydrateCommand.seeds.length === 0) {
          const runtimeRoster = await fetchCompanyAgentRuntimeRoster();
          const fallbackSeeds = buildFallbackOfficeSeedsFromRuntimeRoster(runtimeRoster);

          if (fallbackSeeds.length > 0) {
            console.warn(
              "Gateway hydration returned an empty fleet after reconnect/standby. Rehydrating the office roster from the backend runtime roster and scheduling a silent retry.",
            );

            const fallbackHydrateCommand: Extract<
              StudioBootstrapLoadCommand,
              { kind: "hydrate-agents" }
            > = {
              kind: "hydrate-agents",
              seeds: fallbackSeeds,
              initialSelectedAgentId:
                previousAgents.find((agent) =>
                  fallbackSeeds.some((seed) => seed.agentId === agent.agentId),
                )?.agentId ?? fallbackSeeds[0]?.agentId,
            };

            commandsToExecute = [
              ...commands.filter((command) => command.kind !== "hydrate-agents"),
              fallbackHydrateCommand,
            ];
          } else if (previousAgents.length > 0) {
            console.warn(
              "Gateway hydration returned an empty fleet after reconnect/standby. Preserving the previous office roster and scheduling a silent retry.",
            );
            commandsToExecute = commands.filter((command) => command.kind !== "hydrate-agents");
          }

          window.setTimeout(() => {
            void loadAgents({
              forceSettings: true,
              silent: true,
              minIntervalMs: 3_000,
            });
          }, 3_000);
        }
        executeStudioBootstrapLoadCommands({
          commands: commandsToExecute,
          setGatewayConfigSnapshot: (val: GatewayModelPolicySnapshot) => {
            gatewayConfigSnapshot.current = val;
          },
          hydrateAgents,
          dispatchUpdateAgent: (agentId, patch) => {
            dispatch({ type: "updateAgent", agentId, patch });
          },
          setError,
        });
        if (connectionEpochAtStart !== connectionEpochRef.current) {
          return;
        }
        const refreshedAgents = stateRef.current.agents;
        const debugCollector: OfficeDebugRow[] = [];
        const inferredByAgentId = new Map<string, boolean>();
        await Promise.all(
          refreshedAgents.map(async (agent) => {
          if (connectionEpochAtStart !== connectionEpochRef.current) {
            return;
          }
          try {
            const inference = await inferRunningFromAgentSessions({
              client,
              agentId: agent.agentId,
            });
            if (connectionEpochAtStart !== connectionEpochRef.current) {
              return;
            }
            const inferredRunning = inference.inferredRunning;
            inferredByAgentId.set(agent.agentId, inferredRunning);
            if (inference.latestSessionUpdatedAtMs > 0) {
              setLastSeenByAgentId((prev) => ({
                ...prev,
                [agent.agentId]: inference.latestSessionUpdatedAtMs,
              }));
            }
            const nextStatus: AgentState["status"] = inferredRunning
              ? "running"
              : "idle";
            if (agent.status !== nextStatus) {
              dispatch({
                type: "updateAgent",
                agentId: agent.agentId,
                patch: {
                  status: nextStatus,
                  runId: inferredRunning
                    ? (agent.runId ?? `inferred-${agent.agentId}`)
                    : null,
                },
              });
            }
            if (debugEnabled) {
              debugCollector.push({
                agentId: agent.agentId,
                name: agent.name,
                storeStatus: agent.status,
                runId: agent.runId,
                inferredRunning,
                lastRole: inference.lastRole,
                lastText: inference.lastText,
                messageCount: inference.messageCount,
                detectedSessionKey: inference.sessionKey,
                inspectedSessions: inference.inspectedSessions.join(" | "),
                inferenceSource: inference.inferenceSource,
                at: new Date().toISOString(),
              });
            }
          } catch (error) {
            if (!isGatewayDisconnectLikeError(error)) {
              console.warn(
                "Failed to infer agent run state from history.",
                error,
              );
            }
          }
          }),
        );
        if (connectionEpochAtStart !== connectionEpochRef.current) {
          return;
        }
        if (debugEnabled) {
          setDebugRows(debugCollector);
          console.info("[office-debug] Reconciled agent state.", debugCollector);
        }
        lastGatewayActivityAtRef.current = Date.now();
        setAgentsLoaded(true);
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
        loadAgentsInFlightRef.current = null;
      }
    })();
    loadAgentsInFlightRef.current = task;
    return task;
  }, [
    client,
    debugEnabled,
    dispatch,
    gatewayUrl,
    hydrateAgents,
    loadCompanyScopedAgentScope,
    loadStudioSettings,
    setError,
    setLoading,
    status,
  ]);

  useEffect(() => {
    if (status !== "connected") return;
    if (!agentsLoaded) return;
    if (!Array.isArray(companyScopedAgentIds)) return;
    void loadAgents({ forceSettings: true, silent: true, minIntervalMs: 1_500 });
  }, [agentsLoaded, companyScopedAgentIds, loadAgents, status]);

  const handleCloseCreateAgentWizard = useCallback(
    (createdAgentId: string | null) => {
      setCreateAgentWizardOpen(false);
      setCreateAgentModalError(null);
      if (createdAgentId) {
        openAgentEditor(createdAgentId, "IDENTITY.md");
      }
    },
    [openAgentEditor],
  );
  const handleOpenCreateModal = useCallback(() => {
    setCreateSquadError(null);
    setCreateAgentModalError(null);
    setCreateTargetModalOpen(true);
  }, []);
  const handleOpenCreateAgentWizard = useCallback(() => {
    setCreateTargetModalOpen(false);
    setCreateSquadModalOpen(false);
    setCreateSquadError(null);
    setCreateAgentModalError(null);
    setCreateAgentWizardNonce((current) => current + 1);
    setCreateAgentWizardOpen(true);
  }, []);
  const handleOpenCreateSquadModal = useCallback(() => {
    setCreateTargetModalOpen(false);
    setCreateAgentWizardOpen(false);
    setCreateAgentModalError(null);
    setCreateSquadError(null);
    setCreateSquadCatalog(null);
    setCreateSquadModalOpen(true);
    void loadCreateSquadCatalog();
  }, [loadCreateSquadCatalog]);
  const clearDeletedAgentUiState = useCallback((agentId: string) => {
    setSelectedChatAgentId((current) => (current === agentId ? null : current));
    setAgentEditorAgentId((current) => (current === agentId ? null : current));
    setMonitorAgentId((current) => (current === agentId ? null : current));
    setGithubReviewAgentId((current) => (current === agentId ? null : current));
    setQaTestingAgentId((current) => (current === agentId ? null : current));
    setPreparedPhoneCallsByAgentId((current) => {
      if (!(agentId in current)) return current;
      const next = { ...current };
      delete next[agentId];
      return next;
    });
    setPreparedTextMessagesByAgentId((current) => {
      if (!(agentId in current)) return current;
      const next = { ...current };
      delete next[agentId];
      return next;
    });
  }, []);
  const createAgentStatusLine = useMemo(() => {
    if (!createAgentBlock) return null;
    if (createAgentBlock.phase === "queued") {
      return "Waiting for active runs to finish before creating the new agent.";
    }
    return `Creating ${createAgentBlock.agentName}.`;
  }, [createAgentBlock]);
  const deleteAgentStatusLine = useMemo(() => {
    if (!deleteAgentBlock) return null;
    if (deleteAgentBlock.phase === "queued") {
      return `Waiting for active runs to finish before deleting ${deleteAgentBlock.agentName}.`;
    }
    return `Deleting ${deleteAgentBlock.agentName}.`;
  }, [deleteAgentBlock]);
  const handleCreateAgentFromIdentity = useCallback(
    async (identity: AgentIdentityValues) => {
      let createdAgentId: string | null = null;
      const success = await runCreateAgentMutationLifecycle(
        {
          payload: {
            name: identity.name,
          },
          status,
          hasCreateBlock: Boolean(createAgentBlock),
          hasRenameBlock: false,
          hasDeleteBlock: Boolean(hasDeleteMutationBlock),
          createAgentBusy,
        },
        {
          enqueueConfigMutation,
          createAgent: async (name) => {
            const created = await createGatewayAgent({ client, name });
            try {
              const files = buildIdentityFileDraft(identity);
              await writeGatewayAgentFiles({
                client,
                agentId: created.id,
                files: {
                  "IDENTITY.md": files["IDENTITY.md"],
                },
              });

              const bootstrapDraft = createEmptyPersonalityDraft();
              bootstrapDraft.identity = {
                ...bootstrapDraft.identity,
                ...identity,
                name: identity.name.trim() || name,
              };

              await persistCompanyAgentFromWizard({
                gatewayAgentId: created.id,
                draft: bootstrapDraft,
                profile: createDefaultAgentAvatarProfile(created.id),
              });

              return { id: created.id };
            } catch (error) {
              try {
                await deleteGatewayAgent({ client, agentId: created.id });
              } catch {
                // ignore rollback errors and surface the original creation problem
              }
              throw error instanceof Error
                ? error
                : new Error("Failed to create the backend agent record.");
            }
          },
          setQueuedBlock: ({ agentName, startedAt }) => {
            const queuedCreateBlock = buildQueuedMutationBlock({
              kind: "create-agent",
              agentId: "",
              agentName,
              startedAt,
            });
            setCreateAgentBlock({
              agentName: queuedCreateBlock.agentName,
              phase: "queued",
              startedAt: queuedCreateBlock.startedAt,
            });
          },
          setCreatingBlock: (agentName) => {
            setCreateAgentBlock((current) => {
              if (!current || current.agentName !== agentName) return current;
              return { ...current, phase: "creating" };
            });
          },
          onCompletion: async (completion) => {
            createdAgentId = completion.agentId;
            await loadAgents({ forceSettings: true });
            const createdAgent =
              stateRef.current.agents.find(
                (entry) => entry.agentId === completion.agentId,
              ) ?? null;
            if (createdAgent?.sessionKey) {
              try {
                await applyCreateAgentBootstrapPermissions({
                  client,
                  agentId: createdAgent.agentId,
                  sessionKey: createdAgent.sessionKey,
                  draft: { ...CREATE_AGENT_DEFAULT_PERMISSIONS },
                  loadAgents: () => loadAgents({ forceSettings: true }),
                });
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Failed to apply default permissions.";
                setError(
                  `Agent created, but default permissions could not be applied: ${message}`,
                );
              }
            }
            dispatch({
              type: "selectAgent",
              agentId: completion.agentId,
            });
            setSelectedChatAgentId(completion.agentId);
            setCreateAgentBlock(null);
            setCreateAgentModalError(null);
          },
          setCreateAgentModalError,
          setCreateAgentBusy,
          clearCreateBlock: () => {
            setCreateAgentBlock(null);
          },
          onError: setError,
        },
      );
      return success ? createdAgentId : null;
    },
    [
      client,
      createAgentBlock,
      createAgentBusy,
      dispatch,
      enqueueConfigMutation,
      hasDeleteMutationBlock,
      loadAgents,
      setError,
      status,
    ],
  );
  const handleFinishCreateAgentAvatar = useCallback(
    async (params: {
      agentId: string;
      draft: PersonalityBuilderDraft;
      profile: AgentAvatarProfile;
    }) => {
      setCreateAgentBusy(true);
      setCreateAgentModalError(null);
      try {
        const files = serializePersonalityFiles(params.draft);
        await writeGatewayAgentFiles({
          client,
          agentId: params.agentId,
          files,
        });
        const currentAgent =
          stateRef.current.agents.find((entry) => entry.agentId === params.agentId) ?? null;
        const nextName = params.draft.identity.name.trim();
        const currentName = currentAgent?.name.trim() ?? "";
        if (nextName && nextName !== currentName) {
          const renamed = await renameGatewayAgent({
            client,
            agentId: params.agentId,
            name: nextName,
          });
          if (!renamed) {
            throw new Error("Saved the wizard files, but could not rename the live agent.");
          }
        }
        handleAvatarProfileSave(params.agentId, params.profile);
        await persistCompanyAgentFromWizard({
          gatewayAgentId: params.agentId,
          draft: params.draft,
          profile: params.profile,
        });
        await loadAgents({ forceSettings: true });
        setCreateAgentWizardOpen(false);
        setCreateAgentModalError(null);
        openAgentEditor(params.agentId, "IDENTITY.md");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to finish creating the agent.";
        setCreateAgentModalError(message);
      } finally {
        setCreateAgentBusy(false);
      }
    },
    [client, handleAvatarProfileSave, loadAgents, openAgentEditor],
  );
  const handleCreateSquad = useCallback(
    async (payload: {
      name: string;
      description: string;
      iconEmoji: string | null;
      color: string | null;
      memberAgentIds: number[];
      leaderAgentId: number | null;
      executionMode: SquadExecutionMode;
      workspaceId: number | null;
    }) => {
      setCreateSquadBusy(true);
      setCreateSquadError(null);
      try {
        const createdSquad = await createCompanySquad({ ...payload, companyId: companyId ?? undefined });
        await loadCompanySquads(true);
  setCreateSquadModalOpen(false);
  setSelectedChatAgentId(`squad:${createdSquad.id}`);
  setChatOpen(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create the squad right now.";
        setCreateSquadError(message);
      } finally {
        setCreateSquadBusy(false);
      }
    },
    [companyId, loadCompanySquads],
  );

  const handleEditSquad = useCallback(
    async (
      squadId: string,
      payload: {
        name?: string;
        description?: string | null;
        iconEmoji?: string | null;
        color?: string | null;
        executionMode?: SquadExecutionMode | null;
      },
    ) => {
      const numericId = Number(squadId);
      if (!Number.isFinite(numericId)) return;
      await updateCompanySquad({ squadId: numericId, ...payload, companyId: companyId ?? undefined });
      await loadCompanySquads(true);
    },
    [companyId, loadCompanySquads],
  );

  const handleDeleteSquad = useCallback(
    async (squadId: string) => {
      const numericId = Number(squadId);
      if (!Number.isFinite(numericId)) return;
      await deleteCompanySquad({ squadId: numericId, companyId: companyId ?? undefined });
      setSquadOpsModalOpen(false);
      setSquadOpsSquadId(null);
      setSquadOpsError(null);
      await loadCompanySquads(true);
    },
    [companyId, loadCompanySquads],
  );

  // v111 — SquadEditDeleteModal wiring. We own the open/close state +
  // the async handlers here so the cascade-delete (which clears the
  // squad ops modal too if it was open on the same squad) can flush
  // every related piece of state in one place. The modal itself is
  // pure presentation and lives in components/SquadEditDeleteModal.
  const [squadEditorSquadId, setSquadEditorSquadId] = useState<string | null>(null);
  const handleOpenSquadEditor = useCallback((squadId: string) => {
    setSquadEditorSquadId(squadId || null);
  }, []);
  const handleCloseSquadEditor = useCallback(() => {
    setSquadEditorSquadId(null);
  }, []);
  const activeSquadEditorSquad = useMemo(
    () => companySquads.find((entry) => entry.id === squadEditorSquadId) ?? null,
    [companySquads, squadEditorSquadId],
  );
  const handleSaveSquadFromEditor = useCallback(
    async (input: {
      name: string;
      description: string;
      iconEmoji: string | null;
      color: string | null;
    }) => {
      if (!squadEditorSquadId) return;
      const numericId = Number(squadEditorSquadId);
      if (!Number.isFinite(numericId)) return;
      await updateCompanySquad({
        squadId: numericId,
        name: input.name,
        description: input.description,
        iconEmoji: input.iconEmoji,
        color: input.color,
        companyId: companyId ?? undefined,
      });
      await loadCompanySquads(true);
    },
    [squadEditorSquadId, companyId, loadCompanySquads],
  );
  const handleDeleteSquadFromEditor = useCallback(async () => {
    if (!squadEditorSquadId) return;
    const numericId = Number(squadEditorSquadId);
    if (!Number.isFinite(numericId)) return;
    await deleteCompanySquad({ squadId: numericId, companyId: companyId ?? undefined });
    // If the operator happened to have Squad Ops open on the same squad,
    // close it so it doesn't try to refetch a now-deleted row.
    if (squadOpsSquadId === squadEditorSquadId) {
      setSquadOpsModalOpen(false);
      setSquadOpsSquadId(null);
      setSquadOpsError(null);
    }
    await loadCompanySquads(true);
  }, [squadEditorSquadId, squadOpsSquadId, companyId, loadCompanySquads]);

  const loadSquadOpsRuntimeStatus = useCallback(async () => {
    const token = getBrowserAccessToken();
    if (!token) {
      setSquadOpsRuntimeStatus(null);
      return;
    }
    try {
      const runtimeStatus = await fetchRuntimeConfigStatus(token);
      setSquadOpsRuntimeStatus(runtimeStatus);
    } catch {
      setSquadOpsRuntimeStatus(null);
    }
  }, []);

  const activeSquadOpsSquad = useMemo(
    () => companySquads.find((entry) => entry.id === squadOpsSquadId) ?? null,
    [companySquads, squadOpsSquadId],
  );

  const loadSquadOpsTasks = useCallback(
    async (squadId: string, preferredTaskId?: number | null) => {
      const numericSquadId = Number(squadId);
      if (!Number.isFinite(numericSquadId)) return;
      setSquadOpsLoading(true);
      setSquadOpsError(null);
      try {
        const summaries = await fetchSquadTasks({ squadId: numericSquadId });
        setSquadOpsTasks(summaries);
        const nextTaskId = preferredTaskId ?? summaries[0]?.id ?? null;
        if (nextTaskId) {
          setSquadOpsRefreshingTask(true);
          try {
            const detail = await fetchSquadTask(nextTaskId);
            setSquadOpsSelectedTask(detail);
          } finally {
            setSquadOpsRefreshingTask(false);
          }
        } else {
          setSquadOpsSelectedTask(null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load squad tasks right now.";
        setSquadOpsError(message);
      } finally {
        setSquadOpsLoading(false);
      }
    },
    [squadOpsSelectedTask?.preferredModel],
  );

  const handleOpenSquadOps = useCallback(
    (squadId: string) => {
      setSquadOpsSquadId(squadId || null);
      setSquadOpsModalOpen(true);
      setSquadOpsError(null);
      setSquadOpsDispatchEstimate(null);
      setSquadOpsDispatchApprovalMode(null);
      void loadSquadOpsRuntimeStatus();
      if (!squadId) {
        setSquadOpsTasks([]);
        setSquadOpsSelectedTask(null);
        return;
      }
      void loadSquadOpsTasks(squadId);
    },
    [loadSquadOpsRuntimeStatus, loadSquadOpsTasks],
  );

  const handleSelectSquadTask = useCallback(async (taskId: number) => {
    setSquadOpsRefreshingTask(true);
    setSquadOpsError(null);
    setSquadOpsDispatchEstimate(null);
    setSquadOpsDispatchApprovalMode(null);
    try {
      const detail = await fetchSquadTask(taskId);
      setSquadOpsSelectedTask(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load task details right now.";
      setSquadOpsError(message);
    } finally {
      setSquadOpsRefreshingTask(false);
    }
  }, []);

  const handleCreateSquadTask = useCallback(
    async (payload: {
      title: string;
      prompt: string;
      preferredModel: string | null;
      executionMode: string | null;
      leadId?: number | null;
      leadGenerationJobId?: number | null;
      attachments?: SquadTaskAttachment[] | null;
    }) => {
      const numericSquadId = Number(squadOpsSquadId);
      if (!Number.isFinite(numericSquadId)) return;
      setSquadOpsCreateBusy(true);
      setSquadOpsError(null);
      setSquadOpsDispatchEstimate(null);
      setSquadOpsDispatchApprovalMode(null);
      try {
        const created = await createSquadTask({
          squadId: numericSquadId,
          title: payload.title,
          prompt: payload.prompt,
          // Prefer the per-task override the user picked in the modal. Fall back to
          // the squad's default execution mode when they left it on "squad default".
          executionMode:
            payload.executionMode || activeSquadOpsSquad?.executionMode || "leader",
          preferredModel: payload.preferredModel,
          leadId: payload.leadId ?? null,
          leadGenerationJobId: payload.leadGenerationJobId ?? null,
          attachments: payload.attachments ?? null,
        });
        await loadSquadOpsTasks(String(numericSquadId), created.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create the squad task right now.";
        setSquadOpsError(message);
      } finally {
        setSquadOpsCreateBusy(false);
      }
    },
    [activeSquadOpsSquad?.executionMode, loadSquadOpsTasks, squadOpsSquadId],
  );

  // Delete a squad task and cascade-clean every local slice that references it
  // so the conversation, per-agent sessions and lingering UI state disappear
  // from every agent associated with it — same UX as "delete chat".
  //
  // v112 — also surfaces the gateway sweep counts the back v63 endpoint
  // returns (runsRemoved + sessionsCleaned). The result lands in
  // `squadOpsError` as a transient success line ("Task deleted — N
  // OpenClaw sessions cleaned") so the operator sees the cleanup
  // happened on the gateway side too, not just locally.
  const handleDeleteSquadTask = useCallback(
    async (taskId: number) => {
      let result;
      try {
        result = await deleteSquadTask(taskId);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to delete the squad task right now.";
        setSquadOpsError(message);
        return;
      }
      // v114 — three outcome buckets:
      //   1) task was already gone on the server (taskExists:false) —
      //      treat as silent success; just clear local state.
      //   2) task existed and we got real sweep counts — show the
      //      "N runs wiped / N sessions cleaned" toast for 6s.
      //   3) task existed but the back returned zeros (older deploy or
      //      ran without the bridge) — silent; no misleading
      //      "0 sessions cleaned" toast.
      if (!result.taskExists) {
        // Already gone — silent. The local state cleanup below is
        // still needed in case the operator's tab was stale.
        setSquadOpsError(null);
      } else if (result.sessionsCleaned > 0 || result.runsRemoved > 0) {
        const parts: string[] = ["Task deleted"];
        if (result.runsRemoved > 0) {
          parts.push(`${result.runsRemoved} run${result.runsRemoved === 1 ? "" : "s"} wiped`);
        }
        if (result.sessionsCleaned > 0) {
          parts.push(
            `${result.sessionsCleaned} OpenClaw session${result.sessionsCleaned === 1 ? "" : "s"} cleaned`,
          );
        }
        setSquadOpsError(parts.join(" · "));
        // Clear the transient success line after 6s so it doesn't
        // squat where actual error text usually lives.
        window.setTimeout(() => {
          setSquadOpsError((current) => (current === parts.join(" · ") ? null : current));
        }, 6000);
      } else {
        setSquadOpsError(null);
      }
      setSquadOpsTasks((prev) => prev.filter((task) => task.id !== taskId));
      setSelectedSquadTasks((prev) => prev.filter((task) => task.id !== taskId));
      setSquadOpsSelectedTask((prev) => (prev?.id === taskId ? null : prev));
      setSquadTaskSessionByTaskId((prev) => {
        if (!(taskId in prev)) return prev;
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setSquadChatTasksBySquadId((prev) => {
        let changed = false;
        const next: Record<string, SquadTask[]> = {};
        for (const [key, list] of Object.entries(prev)) {
          const filtered = list.filter((task) => task.id !== taskId);
          if (filtered.length !== list.length) changed = true;
          next[key] = filtered;
        }
        return changed ? next : prev;
      });
      setActiveSquadChatTaskBySquadId((prev) => {
        let changed = false;
        const next: Record<string, number | null> = {};
        for (const [key, value] of Object.entries(prev)) {
          if (value === taskId) {
            next[key] = null;
            changed = true;
          } else {
            next[key] = value;
          }
        }
        return changed ? next : prev;
      });
      // Refresh the active squad's task list from the server so the count
      // matches even if the backend fell back to "cancel" instead of DELETE.
      if (squadOpsSquadId) {
        void loadSquadOpsTasks(squadOpsSquadId, null);
      }
    },
    [loadSquadOpsTasks, squadOpsSquadId],
  );

  const buildSquadDispatchPayload = useCallback(
    (mode: "pending" | "retryFailed" | "redispatchAll") => ({
      onlyPendingRuns: mode === "pending",
      retryFailedRuns: mode !== "redispatchAll",
      forceRedispatchCompletedRuns: mode === "redispatchAll",
      model: squadOpsSelectedTask?.preferredModel ?? null,
      thinking: "medium",
      deliveryMode: "none",
      wakeMode: "now",
    }),
    [squadOpsSelectedTask?.preferredModel],
  );

  const handlePreviewDispatchSquadTask = useCallback(
    async (taskId: number, mode: "pending" | "retryFailed" | "redispatchAll") => {
      setSquadOpsDispatchEstimateBusy(true);
      setSquadOpsError(null);
      setSquadOpsDispatchApprovalMode(mode);
      try {
        const estimate = await estimateSquadTaskDispatch(taskId, buildSquadDispatchPayload(mode));
        setSquadOpsDispatchEstimate(estimate);
      } catch (error) {
        setSquadOpsDispatchApprovalMode(null);
        setSquadOpsDispatchEstimate(null);
        const message = error instanceof Error ? error.message : "Unable to estimate squad task tokens right now.";
        setSquadOpsError(message);
      } finally {
        setSquadOpsDispatchEstimateBusy(false);
      }
    },
    [buildSquadDispatchPayload],
  );

  const handleCancelSquadTaskDispatchApproval = useCallback(() => {
    setSquadOpsDispatchEstimate(null);
    setSquadOpsDispatchApprovalMode(null);
  }, []);

  // v107 — ambient script queue lives ABOVE the squad/lead handlers so
  // the deps arrays of those `useCallback`s can reference it without
  // tripping a "used before declaration" TypeScript error. Push
  // helpers (pushLeadScout / pushMailRunner / pushSquadHuddle) are
  // called from the existing long-running flows further down.
  const ambientScript = useAmbientCueQueue();

  // v108 — agent ids the squad-huddle script wants in the meeting room.
  // When a squad task is dispatched, every member's gateway agent id
  // gets a `true` here. The agentMotion tick reads the map and forces
  // those agents into the meeting room (walk to a chair, sit). Cleared
  // automatically by the auto-release effect below once the dispatch
  // window closes.
  const [meetingForcedAgentIds, setMeetingForcedAgentIds] = useState<Record<string, boolean>>({});
  // Keep them in the room for ~75 s — slightly longer than the
  // squad-huddle ambient cue so the agents are still seated when the
  // task's first replies start landing in chat.
  const SQUAD_MEETING_HOLD_MS = 75_000;

  const handleConfirmDispatchSquadTask = useCallback(
    async (taskId: number, mode: "pending" | "retryFailed" | "redispatchAll") => {
      setSquadOpsDispatchBusy(true);
      setSquadOpsError(null);
      try {
        await dispatchSquadTask(taskId, buildSquadDispatchPayload(mode));
        // v109 — Real squad members head to the meeting room. The
        // violet janitor-style ambient cue from v106 was removed per
        // request — the actual agents walking to their own chairs
        // (each one to a UNIQUE chair, fixed in v109) is the
        // animation now.
        if (activeSquadOpsSquad) {
          const memberAgentSlugs = (activeSquadOpsSquad.members ?? [])
            .map((m) => m.gatewayAgentId)
            .filter((s): s is string => typeof s === "string" && s.length > 0);
          // Force every member into the meeting room. Unified
          // participant order in `resolveMeetingTarget` (v109) gives
          // each one a different chair.
          setMeetingForcedAgentIds((prev) => {
            const next = { ...prev };
            for (const slug of memberAgentSlugs) next[slug] = true;
            return next;
          });
          window.setTimeout(() => {
            setMeetingForcedAgentIds((prev) => {
              if (memberAgentSlugs.every((slug) => !prev[slug])) return prev;
              const next = { ...prev };
              for (const slug of memberAgentSlugs) delete next[slug];
              return next;
            });
          }, SQUAD_MEETING_HOLD_MS);
        }
        setSquadOpsDispatchEstimate(null);
        setSquadOpsDispatchApprovalMode(null);
        await loadSquadOpsTasks(squadOpsSquadId ?? String(activeSquadOpsSquad?.id ?? ""), taskId);
        await loadSquadOpsRuntimeStatus();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to dispatch squad task right now.";
        setSquadOpsError(message);
      } finally {
        setSquadOpsDispatchBusy(false);
      }
    },
    [
      activeSquadOpsSquad,
      buildSquadDispatchPayload,
      loadSquadOpsRuntimeStatus,
      loadSquadOpsTasks,
      squadOpsSquadId,
    ],
  );

  useEffect(() => {
    if (!squadOpsModalOpen || !squadOpsSquadId) return;
    // v45 — when a task is actively running we poll fast (2.5s) so the
    // chat lights up live as each member returns and the leader synthesises.
    // Idle tasks keep the slower 12s cadence to be polite to the API.
    const taskStatus = (squadOpsSelectedTask?.status ?? "").toLowerCase();
    const runs = squadOpsSelectedTask?.runs ?? [];
    const anyRunActive = runs.some((r) =>
      ["pending", "queued", "running", "dispatching", "processing", "in_progress"].includes(
        (r.status ?? "").toLowerCase(),
      ),
    );
    const isLive =
      ["running", "queued", "pending", "dispatching", "processing", "in_progress"].includes(taskStatus)
      || anyRunActive;
    const cadenceMs = isLive ? 2500 : 12000;
    const intervalId = window.setInterval(() => {
      void loadSquadOpsTasks(squadOpsSquadId, squadOpsSelectedTask?.id ?? null);
    }, cadenceMs);
    return () => window.clearInterval(intervalId);
  }, [
    loadSquadOpsTasks,
    squadOpsModalOpen,
    squadOpsSelectedTask?.id,
    squadOpsSelectedTask?.status,
    squadOpsSelectedTask?.runs,
    squadOpsSquadId,
  ]);

  // v88 — Gateway → back bridge for squad task replies.
  //
  // Why: OpenClaw 2026.4.25 doesn't honour per-request webhookUrl on
  // /hooks/agent, and cross-VPS GET /sessions/{key}/history is blocked
  // (`missing scope: operator.read`). The gateway WebSocket DOES emit
  // every assistant message in real time though — so when the squad ops
  // modal is open we listen for chat events, match the sessionKey to a
  // known squad task step, and POST the assistant text to the back. The
  // back finalises the step and cascades the workflow exactly as if it
  // had received a hook callback.
  useEffect(() => {
    if (!client || status !== "connected" || !squadOpsModalOpen || !squadOpsSelectedTask) {
      return;
    }
    const runs = squadOpsSelectedTask.runs ?? [];
    if (runs.length === 0) return;

    // Build a sessionKey → stepId index from the live task. We dedupe
    // forwards-per-run with `forwardedRunIds` so the same final answer
    // never gets POSTed twice if the gateway re-emits.
    const sessionKeyToRun = new Map<string, { stepId: number; agentId: number }>();
    for (const run of runs) {
      const key = (run.externalSessionKey ?? run.sessionKey ?? "").trim();
      if (!key) continue;
      sessionKeyToRun.set(key, { stepId: run.id, agentId: run.agentId });
    }
    if (sessionKeyToRun.size === 0) return;

    const forwardedRunIds = new Set<number>();
    // Pre-populate with runs that already have output so we never re-post
    // an answer that's already on file.
    for (const r of runs) {
      if ((r.outputText ?? "").trim().length > 0) forwardedRunIds.add(r.id);
    }

    const extractAssistantText = (message: unknown): string | null => {
      if (!message) return null;
      if (typeof message === "string") return message.trim() || null;
      if (typeof message !== "object") return null;
      const m = message as Record<string, unknown>;
      // Common shapes: { role:"assistant", content:"..." } or
      // { role:"assistant", content:[{type:"text", text:"..."}] } or
      // { text:"..." } / { markdown:"..." }
      const role = typeof m.role === "string" ? m.role.toLowerCase() : null;
      if (role && !role.includes("assistant") && !role.includes("agent") && !role.includes("model")) {
        return null;
      }
      const content = m.content;
      if (typeof content === "string" && content.trim().length > 0) return content.trim();
      if (Array.isArray(content)) {
        const parts: string[] = [];
        for (const item of content) {
          if (typeof item === "string") parts.push(item);
          else if (item && typeof item === "object") {
            const it = item as Record<string, unknown>;
            const t = typeof it.text === "string"
              ? it.text
              : typeof it.content === "string"
                ? it.content
                : null;
            if (t) parts.push(t);
          }
        }
        const joined = parts.join("\n").trim();
        if (joined.length > 0) return joined;
      }
      for (const k of ["text", "markdown", "outputText", "output_text", "message", "response"]) {
        const v = m[k];
        if (typeof v === "string" && v.trim().length > 0) return v.trim();
      }
      return null;
    };

    // v126 — Modal-gated bridge keeps its job: while the SquadOps modal
    // is open, observe chat events for the currently-selected task's
    // step session keys and forward them to the back so the modal UI
    // refreshes immediately. The v125 always-on background bridge
    // (further down in this file) handles the modal-CLOSED case via
    // the by-session endpoint, so we no longer need the verbose dbg
    // ring buffer / per-event console.info spam that this block carried
    // through v89-v124.
    const matchSessionKeyToRun = (rawSessionKey: string | null) => {
      if (!rawSessionKey) return null;
      const direct = sessionKeyToRun.get(rawSessionKey);
      if (direct) return direct;
      const hookIdx = rawSessionKey.indexOf("hook:");
      if (hookIdx > 0) {
        const suffix = rawSessionKey.slice(hookIdx);
        const suffixHit = sessionKeyToRun.get(suffix);
        if (suffixHit) return suffixHit;
      }
      for (const [k, v] of sessionKeyToRun.entries()) {
        if (rawSessionKey.endsWith(k) || k.endsWith(rawSessionKey)) return v;
      }
      return null;
    };

    const unsubscribe = client.onEvent((event) => {
      try {
        if (event.event !== "chat") return;
        const payload = event.payload as
          | { runId?: string; sessionKey?: string; state?: string; message?: unknown; errorMessage?: string }
          | undefined;
        if (!payload) return;
        const sessionKey = (payload.sessionKey ?? "").trim();
        if (!sessionKey) return;
        const target = matchSessionKeyToRun(sessionKey);
        if (!target) return;
        if (forwardedRunIds.has(target.stepId)) return;

        // Only forward final / aborted / error states — deltas would
        // create noise. We send the running text snapshot at the final
        // state, which is what the user sees in the OpenClaw UI.
        const state = (payload.state ?? "").toLowerCase();
        if (state !== "final" && state !== "aborted" && state !== "error") return;

        let text = extractAssistantText(payload.message);
        let runStatus: "completed" | "failed" = "completed";
        if (state === "error" || state === "aborted") {
          runStatus = "failed";
          text = text ?? payload.errorMessage ?? `Agent ${state}.`;
        }
        if (!text || text.length === 0) return;

        forwardedRunIds.add(target.stepId);
        void applySquadSessionMessage(target.stepId, {
          text,
          sessionKey,
          externalRunId: payload.runId ?? null,
          status: runStatus,
        })
          .then(() => {
            // Trigger a fast refresh so the chat picks up the new state
            // without waiting for the next 2.5s tick.
            if (squadOpsSquadId) {
              void loadSquadOpsTasks(squadOpsSquadId, squadOpsSelectedTask.id);
            }
          })
          .catch((err) => {
            // If forwarding fails, allow a retry on the next event.
            forwardedRunIds.delete(target.stepId);
            console.warn("Squad bridge: failed to apply session message", err);
          });
      } catch (err) {
        console.warn("Squad bridge: handler crashed", err);
      }
    });

    return unsubscribe;
  }, [
    client,
    status,
    squadOpsModalOpen,
    squadOpsSelectedTask,
    squadOpsSquadId,
    loadSquadOpsTasks,
  ]);

  // v125 — ALWAYS-ON background bridge for squad + cron replies.
  //
  // The squad bridge above (and its cousin inside CronJobsModal) only
  // runs while the corresponding modal is open. That left a real bug:
  // close the modal mid-run → the bridge unsubscribes → assistant
  // replies still arrive on the gateway WS but there's no observer
  // forwarding them to the back → steps stay stuck in "running"
  // forever, the cascade halts, and reopening the modal shows the
  // same frozen state.
  //
  // This always-on bridge runs while the gateway client is connected,
  // independent of any modal state. It listens for chat events with
  // session keys shaped like:
  //   • `hook:sqexec-…:agent:N:step:M`        (squad execution step)
  //   • `agent:<slug>:hook:sqexec-…:agent:N:step:M` (gateway-prefixed)
  //   • `agent:<slug>:cron-N`                  (new cron shape)
  //   • `hook:cron-N`, `hook:okestria-cron-N`  (legacy cron shapes)
  // and forwards them to the back's by-session apply-message
  // endpoints. The back's tolerant resolver figures out which row
  // the session belongs to and applies the assistant text exactly
  // as if the modal-bridge had received the event.
  //
  // Idempotency: a session-key + state + text-hash fingerprint cache
  // (kept in a ref so it survives effect-restarts) makes sure we
  // never double-POST when both bridges happen to be alive.
  useEffect(() => {
    if (!client || status !== "connected") return;

    const forwardedFingerprints = new Set<string>();
    const SQUAD_PREFIX = "hook:sqexec-";
    const CRON_SEGMENT = ":cron-";
    const CRON_LEGACY_PREFIX = "hook:cron-";
    const CRON_LEGACY_OKESTRIA = "hook:okestria-cron-";

    // Same extractor shape the modal bridges already use — keeps
    // assistant-only messages and tolerates the various
    // {role,content} payload shapes OpenClaw emits.
    const extractAssistantText = (message: unknown): string | null => {
      if (!message) return null;
      if (typeof message === "string") return message.trim() || null;
      if (typeof message !== "object") return null;
      const m = message as Record<string, unknown>;
      const role = typeof m.role === "string" ? m.role.toLowerCase() : null;
      if (role && !role.includes("assistant") && !role.includes("agent") && !role.includes("model")) {
        return null;
      }
      const content = m.content;
      if (typeof content === "string" && content.trim().length > 0) return content.trim();
      if (Array.isArray(content)) {
        const parts: string[] = [];
        for (const item of content) {
          if (typeof item === "string") parts.push(item);
          else if (item && typeof item === "object") {
            const it = item as Record<string, unknown>;
            const t = typeof it.text === "string"
              ? it.text
              : typeof it.content === "string"
                ? it.content
                : null;
            if (t) parts.push(t);
          }
        }
        const joined = parts.join("\n").trim();
        if (joined.length > 0) return joined;
      }
      for (const k of ["text", "markdown", "outputText", "output_text", "message", "response"]) {
        const v = m[k];
        if (typeof v === "string" && v.trim().length > 0) return v.trim();
      }
      return null;
    };

    const unsubscribe = client.onEvent((event) => {
      try {
        if (event.event !== "chat") return;
        const payload = event.payload as
          | { runId?: string; sessionKey?: string; state?: string; message?: unknown; errorMessage?: string }
          | undefined;
        if (!payload) return;
        const sessionKey = (payload.sessionKey ?? "").trim();
        if (!sessionKey) return;

        // Only act on terminal states — deltas would create noise.
        const state = (payload.state ?? "").toLowerCase();
        if (state !== "final" && state !== "aborted" && state !== "error") return;

        let text = extractAssistantText(payload.message);
        const status: "completed" | "failed" =
          state === "error" || state === "aborted" ? "failed" : "completed";
        if (!text || text.length === 0) {
          if (status === "failed") text = payload.errorMessage ?? `Agent ${state}.`;
          else return;
        }

        // Classify the session shape. The matchers tolerate the
        // gateway prefix (`agent:<slug>:`) by checking suffix /
        // contains rather than full equality.
        const isSquadSession =
          sessionKey.includes(SQUAD_PREFIX);
        const isCronSession =
          sessionKey.includes(CRON_SEGMENT) ||
          sessionKey.startsWith(CRON_LEGACY_PREFIX) ||
          sessionKey.startsWith(CRON_LEGACY_OKESTRIA);

        if (!isSquadSession && !isCronSession) return;

        // Fingerprint dedupe: same session + same final state + same
        // text counts as one delivery. A subsequent run on the same
        // session with new text gets a different hash and re-fires.
        const textHash = String(text!.length) + ":" + text!.slice(0, 80);
        const fingerprint = `${sessionKey}|${status}|${textHash}`;
        if (forwardedFingerprints.has(fingerprint)) return;
        forwardedFingerprints.add(fingerprint);
        // Cap the dedupe set so it doesn't grow unbounded over a
        // long-lived office tab.
        if (forwardedFingerprints.size > 500) {
          const first = forwardedFingerprints.values().next().value;
          if (first) forwardedFingerprints.delete(first);
        }

        if (isSquadSession) {
          void applySquadSessionMessageBySession({
            text: text!,
            sessionKey,
            externalRunId: payload.runId ?? null,
            status,
          }).catch((err) => {
            forwardedFingerprints.delete(fingerprint);
            console.warn("[bg-bridge] squad apply-by-session failed", err);
          });
          return;
        }

        if (isCronSession) {
          void applyCronRunMessageBySession({
            sessionKey,
            text: text!,
            state: status === "failed" ? state : "final",
            error: status === "failed" ? text! : null,
          }).catch((err) => {
            forwardedFingerprints.delete(fingerprint);
            console.warn("[bg-bridge] cron apply-by-session failed", err);
          });
          return;
        }
      } catch (err) {
        console.warn("[bg-bridge] handler crashed", err);
      }
    });

    return unsubscribe;
  }, [client, status]);

  // v104 — modal de confirmação de delete agent (vê AgentDeleteConfirmModal).
  const {
    renderModal: renderAgentDeleteConfirmModal,
    requestDelete: requestAgentDeleteConfirmation,
    close: closeAgentDeleteConfirmModal,
  } = useAgentDeleteConfirmModal({
    fetchPreview: async (gatewayAgentId) =>
      previewPersistedCompanyAgentDelete({ gatewayAgentId }),
  });

  // v106/v107 — ambient script queue moved up to the very top of the
  // hook section so callbacks defined later in this component
  // (handleConfirmDispatchSquadTask, etc.) can list it in their deps
  // arrays without a "used before declaration" TypeScript error.
  // (See the actual `const ambientScript = …` declaration above.)

  const handleDeleteAgent = useCallback(
    async (agentId: string) => {
      const decision = planAgentSettingsMutation(
        { kind: "delete-agent", agentId },
        {
          status,
          hasCreateBlock: Boolean(createAgentBlock),
          hasRenameBlock: false,
          hasDeleteBlock: Boolean(hasDeleteMutationBlock),
          cronCreateBusy: false,
          cronRunBusyJobId: null,
          cronDeleteBusyJobId: null,
        },
      );
      if (decision.kind === "deny") {
        setError(
          decision.message ?? resolveOfficeMutationGuardMessage(decision.guardReason),
        );
        return;
      }
      const agent = state.agents.find(
        (entry) => entry.agentId === decision.normalizedAgentId,
      );
      if (!agent) return;
      // v104 — usa modal custom em vez de window.confirm. O modal puxa
      // a prévia do back v60 (cron jobs, runs, squads, files) antes de
      // pedir confirmação.
      const confirmed = await requestAgentDeleteConfirmation({
        agentName: agent.name,
        agentSlug: agent.agentId,
        gatewayAgentId: agent.agentId,
      });
      if (!confirmed) return;

      await runAgentConfigMutationLifecycle({
        kind: "delete-agent",
        label: `Delete ${agent.name}`,
        isLocalGateway: false,
        deps: {
          enqueueConfigMutation,
          setQueuedBlock: () => {
            const queuedBlock = buildQueuedMutationBlock({
              kind: "delete-agent",
              agentId: decision.normalizedAgentId,
              agentName: agent.name,
              startedAt: Date.now(),
            });
            setDeleteAgentBlock({
              kind: "delete-agent",
              agentId: queuedBlock.agentId,
              agentName: queuedBlock.agentName,
              phase: queuedBlock.phase,
              startedAt: queuedBlock.startedAt,
              sawDisconnect: queuedBlock.sawDisconnect,
            });
          },
          setMutatingBlock: () => {
            setDeleteAgentBlock((current) => {
              if (!current || current.agentId !== decision.normalizedAgentId) {
                return current;
              }
              return {
                ...current,
                phase: "mutating",
              };
            });
          },
          patchBlockAwaitingRestart: (patch) => {
            setDeleteAgentBlock((current) => {
              if (!current || current.agentId !== decision.normalizedAgentId) {
                return current;
              }
              return {
                ...current,
                ...patch,
              };
            });
          },
          clearBlock: () => {
            setDeleteAgentBlock((current) => {
              if (!current || current.agentId !== decision.normalizedAgentId) {
                return current;
              }
              return null;
            });
          },
          executeMutation: async () => {
            try {
              await deleteAgentRecordViaStudio({
                client,
                agentId: decision.normalizedAgentId,
                logError: (message, error) => console.error(message, error),
              });
              await loadCompanyScopedAgentScope(true);
              clearDeletedAgentUiState(decision.normalizedAgentId);
              dispatch({
                type: "removeAgent",
                agentId: decision.normalizedAgentId,
              });
            } finally {
              // v104 — fecha o modal de confirmação no sucesso OU
              // no erro (no erro o setError já mostra o toast).
              closeAgentDeleteConfirmModal();
            }
          },
          shouldAwaitRemoteRestart: async () => false,
          reloadAgents: () => loadAgents({ forceSettings: true }),
          setMobilePaneChat: () => {},
          onError: setError,
        },
      });
    },
    [
      clearDeletedAgentUiState,
      client,
      closeAgentDeleteConfirmModal,
      createAgentBlock,
      dispatch,
      enqueueConfigMutation,
      hasDeleteMutationBlock,
      loadAgents,
      requestAgentDeleteConfirmation,
      setError,
      state.agents,
      status,
    ],
  );

  useEffect(() => {
    if (!createAgentBlock || createAgentBlock.phase === "queued") return;
    const maxWaitMs = 90_000;
    const elapsed = Date.now() - createAgentBlock.startedAt;
    const remaining = Math.max(0, maxWaitMs - elapsed);
    const timeoutId = window.setTimeout(() => {
      setCreateAgentBlock((current) => {
        if (!current || current.phase === "queued") return current;
        return null;
      });
      setCreateAgentBusy(false);
      setCreateAgentWizardOpen(false);
      setError("Agent creation timed out.");
      void loadAgents({ forceSettings: true });
    }, remaining);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [createAgentBlock, loadAgents, setError]);

  const requestAgentHistoryRefresh = useCallback(
    async (params: {
      agentId: string;
      reason: "chat-final-no-trace" | "run-start-no-chat";
      sessionKey?: string;
    }) => {
      if (status !== "connected") return;
      const requestedSessionKey = params.sessionKey?.trim() ?? "";
      if (requestedSessionKey) {
        try {
          const history = await client.call<{
            messages?: Record<string, unknown>[];
          }>("chat.history", {
            sessionKey: requestedSessionKey,
            limit: RUNTIME_SYNC_DEFAULT_HISTORY_LIMIT,
          });
          const messages = Array.isArray(history.messages)
            ? history.messages
            : [];
          const derived = buildHistoryLines(messages);
          let lastUser = derived.lastUser?.trim() ?? "";
          if (!lastUser) {
            const previewResult = await client.call<SummaryPreviewSnapshot>(
              "sessions.preview",
              {
                keys: [requestedSessionKey],
                limit: 12,
                maxChars: 400,
              },
            );
            lastUser =
              resolveLatestUserTextFromPreview(
                previewResult,
                requestedSessionKey,
              ) ?? "";
          }
          const targetAgentId =
            parseAgentIdFromSessionKey(requestedSessionKey) ?? params.agentId;
          const patch: Partial<AgentState> = {};
          if (lastUser) {
            patch.lastUserMessage = lastUser;
          }
          if (derived.lastAssistant) {
            patch.latestPreview = derived.lastAssistant;
          }
          if (typeof derived.lastAssistantAt === "number") {
            patch.lastAssistantMessageAt = derived.lastAssistantAt;
          }
          if (typeof derived.lastUserAt === "number") {
            patch.lastActivityAt = derived.lastUserAt;
          }
          if (Object.keys(patch).length > 0) {
            dispatch({
              type: "updateAgent",
              agentId: targetAgentId,
              patch,
            });
          }
          // Do not replay movement directives from history refresh.
          // History can include old transport commands; replaying them causes auto-walks on load.
          setOpenClawLogEntries((previous) => {
            const next = [
              ...previous,
              createOpenClawLogEntry({
                eventName: "history-refresh",
                eventKind: "derived",
                summary: `session=${requestedSessionKey} reason=${params.reason} lastUser=${formatOpenClawValue(lastUser)} lastAssistant=${formatOpenClawValue(derived.lastAssistant)}`,
                messageText: lastUser || null,
                streamText: derived.lastAssistant ?? null,
                payload: {
                  sessionKey: requestedSessionKey,
                  reason: params.reason,
                  historyMessageCount: messages.length,
                  lastUser: lastUser || null,
                  lastAssistant: derived.lastAssistant ?? null,
                },
              }),
            ];
            return next.slice(-MAX_OPENCLAW_LOG_ENTRIES);
          });
          if (debugEnabled) {
            console.info(
              "[office-debug] Refreshed transport session history.",
              {
                agentId: targetAgentId,
                requestedSessionKey,
                reason: params.reason,
                lastUser: lastUser || null,
              },
            );
          }
        } catch (error) {
          setOpenClawLogEntries((previous) => {
            const next = [
              ...previous,
              createOpenClawLogEntry({
                eventName: "history-refresh",
                eventKind: "error",
                summary: `session=${requestedSessionKey} reason=${params.reason} refresh failed`,
                payload: {
                  sessionKey: requestedSessionKey,
                  reason: params.reason,
                  error: error instanceof Error ? error.message : String(error),
                },
              }),
            ];
            return next.slice(-MAX_OPENCLAW_LOG_ENTRIES);
          });
          if (!isGatewayDisconnectLikeError(error)) {
            console.error(
              "Failed to refresh transport session history.",
              error,
            );
          }
        }
        return;
      }
      const commands = await runHistorySyncOperation({
        client,
        agentId: params.agentId,
        getAgent: (agentId) =>
          stateRef.current.agents.find((entry) => entry.agentId === agentId) ??
          null,
        inFlightSessionKeys: historyInFlightRef.current,
        requestId: randomUUID(),
        loadedAt: Date.now(),
        defaultLimit: RUNTIME_SYNC_DEFAULT_HISTORY_LIMIT,
        maxLimit: RUNTIME_SYNC_MAX_HISTORY_LIMIT,
        transcriptV2Enabled: TRANSCRIPT_V2_ENABLED,
      });
      executeHistorySyncCommands({
        commands,
        dispatch,
        logMetric: (metric, meta) => logTranscriptDebugMetric(metric, meta),
        isDisconnectLikeError: isGatewayDisconnectLikeError,
        logError: (message, error) => console.error(message, error),
      });
      if (debugEnabled) {
        console.info("[office-debug] Requested agent history refresh.", {
          agentId: params.agentId,
          reason: params.reason,
        });
      }
    },
    [client, debugEnabled, dispatch, status],
  );

  const refreshRecentTransportSessionHistory = useCallback(
    (event: EventFrame) => {
      if (event.event !== "health") return;
      const payload =
        event.payload as
          | {
              agents?: Array<{
                agentId?: unknown;
                sessions?: {
                  recent?: Array<{ key?: unknown; updatedAt?: unknown }>;
                };
              }>;
            }
          | undefined;
      const gatewayAgents = Array.isArray(payload?.agents) ? payload.agents : [];
      if (gatewayAgents.length === 0) return;
      for (const gatewayAgent of gatewayAgents) {
        const agentId =
          typeof gatewayAgent?.agentId === "string"
            ? gatewayAgent.agentId.trim()
            : "";
        if (!agentId) continue;
        const localAgent = stateRef.current.agents.find(
          (agent) => agent.agentId === agentId,
        );
        if (!localAgent?.sessionKey) continue;
        const recentSessions = Array.isArray(gatewayAgent.sessions?.recent)
          ? gatewayAgent.sessions.recent
          : [];
        const latestTransportSession = recentSessions.find((entry) => {
          const sessionKey =
            typeof entry?.key === "string" ? entry.key.trim() : "";
          if (!sessionKey) return false;
          if (isSameSessionKey(sessionKey, localAgent.sessionKey)) return false;
          return parseAgentIdFromSessionKey(sessionKey) === agentId;
        });
        if (!latestTransportSession) continue;
        const sessionKey =
          typeof latestTransportSession.key === "string"
            ? latestTransportSession.key.trim()
            : "";
        if (!sessionKey) continue;
        const updatedAt =
          typeof latestTransportSession.updatedAt === "number" &&
          Number.isFinite(latestTransportSession.updatedAt)
            ? latestTransportSession.updatedAt
            : 0;
        const refreshKey = `${sessionKey}:${updatedAt}`;
        if (lastTransportHistoryRefreshKeyRef.current[agentId] === refreshKey) {
          continue;
        }
        lastTransportHistoryRefreshKeyRef.current[agentId] = refreshKey;
        void requestAgentHistoryRefresh({
          agentId,
          reason: "run-start-no-chat",
          sessionKey,
        });
      }
    },
    [requestAgentHistoryRefresh],
  );

  useEffect(() => {
    if (status !== "connected" || agentsLoaded) return;
    void loadAgents({ forceSettings: true });
  }, [agentsLoaded, loadAgents, status]);

  useEffect(() => {
    if (status !== "connected") return;
    if (state.loading) return;
    if (state.agents.length > 0) return;
    const timeoutId = window.setTimeout(() => {
      void loadAgents({ forceSettings: true });
    }, 500);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadAgents, state.agents.length, state.loading, status]);

  useEffect(() => {
    if (status === "disconnected") {
      connectionEpochRef.current += 1;
      setAgentsLoaded(false);
      setCreateAgentWizardOpen(false);
      setCreateAgentBusy(false);
      setCreateAgentModalError(null);
      setCreateAgentBlock(null);
      setDeleteAgentBlock(null);
      loadAgentsInFlightRef.current = null;
      gatewayConfigSnapshot.current = null;
      lastLoadAgentsStartedAtRef.current = 0;
      setFeedEvents([]);
      setDebugRows([]);
      setRunCountByAgentId({});
      setLastSeenByAgentId({});
      prevAssistantPreviewRef.current = {};
      lastGatewayActivityAtRef.current = 0;
    }
  }, [hydrateAgents, status]);

  useEffect(() => {
    if (!agentsLoaded) return;
    const agents = stateRef.current?.agents ?? [];
    const previousByAgentId = prevAssistantPreviewRef.current;
    const nextByAgentId: Record<string, { ts: number; text: string }> = {};
    let initialized = Object.keys(previousByAgentId).length > 0;
    const newEvents: Array<{ id: string; name: string; text: string; ts: number; kind: "reply" }> = [];

    for (const agent of agents) {
      const previewText = normalizeOfficeFeedText(
        agent.lastResult ?? agent.latestPreview,
      );
      const previewTs = agent.lastAssistantMessageAt ?? 0;
      if (!previewText || previewTs <= 0) continue;
      nextByAgentId[agent.agentId] = { ts: previewTs, text: previewText };
      const previous = previousByAgentId[agent.agentId];
      if (!previous) continue;
      initialized = true;
      if (previous.ts === previewTs && previous.text === previewText) continue;
      if (previewTs < previous.ts) continue;
      newEvents.push({
        id: agent.agentId,
        name: agent.name || "Agent",
        text: previewText,
        ts: previewTs,
        kind: "reply" as const,
      });
    }

    if (newEvents.length > 0) {
      setFeedEvents((prev) => [...newEvents, ...prev].slice(0, 6));
    }

    if (!initialized) {
      prevAssistantPreviewRef.current = nextByAgentId;
      return;
    }
    prevAssistantPreviewRef.current = nextByAgentId;
  }, [agentsLoaded]);

  useEffect(() => {
    if (status !== "connected" || !agentsLoaded) return;
    const runtimeHandler = createGatewayRuntimeEventHandler({
      getStatus: () => status,
      getAgents: () => stateRef.current.agents,
      dispatch: (action) => {
        dispatch(action as never);
      },
      queueLivePatch: (agentId, patch) => {
        dispatch({ type: "updateAgent", agentId, patch });
        if ("status" in patch || "runId" in patch) {
          const agent = stateRef.current.agents.find(
            (entry) => entry.agentId === agentId,
          );
          if (agent) {
            const wasWorking = prevWorkingRef.current[agentId] ?? false;
            const isNowWorking =
              patch.status === "running" || Boolean(patch.runId);
            if (isNowWorking !== wasWorking) {
              prevWorkingRef.current[agentId] = isNowWorking;
              const text = isNowWorking ? "started working" : "went idle";
              setFeedEvents((prev) =>
                [
                  {
                    id: agentId,
                    name: agent.name || "Agent",
                    text,
                    ts: Date.now(),
                    kind: "status" as const,
                  },
                  ...prev,
                ].slice(0, 6),
              );
              if (isNowWorking) {
                setRunCountByAgentId((prev) => ({
                  ...prev,
                  [agentId]: (prev[agentId] ?? 0) + 1,
                }));
              }
            }
          }
        }
      },
      clearPendingLivePatch: () => {},
      loadSummarySnapshot: async () => {
        await loadAgents({
          minIntervalMs: 3_000,
          settingsMaxAgeMs: 60_000,
          silent: true,
        });
      },
      requestHistoryRefresh: requestAgentHistoryRefresh,
      refreshHeartbeatLatestUpdate: () => {},
      bumpHeartbeatTick: () => {},
      setTimeout: (fn, delayMs) => window.setTimeout(fn, delayMs),
      clearTimeout: (id) => window.clearTimeout(id),
      isDisconnectLikeError: isGatewayDisconnectLikeError,
      logWarn: (message, meta) => console.warn(message, meta),
      updateSpecialLatestUpdate: () => {},
    });

    // Run reconciliation before subscribing to events so dedup keys are
    // populated in the trigger state. This prevents stale gateway event
    // replays from setting timed room holds on page load.
    setOfficeTriggerState((previous) =>
      reconcileOfficeAnimationTriggerState({
        state: previous,
        agents: stateRef.current.agents,
      }),
    );
    const unsubscribeEvent = client.onEvent((event) => {
      lastGatewayActivityAtRef.current = Date.now();
      setOpenClawLogEntries((previous) => {
        const next = [...previous, formatOpenClawEventLogEntry(event)];
        return next.slice(-MAX_OPENCLAW_LOG_ENTRIES);
      });
      refreshRecentTransportSessionHistory(event);
      setOfficeTriggerState((previous) =>
        reduceOfficeAnimationTriggerEvent({
          state: previous,
          event,
          agents: stateRef.current.agents,
        }),
      );
      if (debugEnabled) {
        console.info("[office-debug] Gateway event.", {
          event: event.event,
          seq: event.seq,
          payload:
            typeof event.payload === "object" && event.payload !== null
              ? JSON.stringify(event.payload).slice(0, 220)
              : (event.payload ?? null),
        });
      }
      if (
        shouldSuppressPhoneBoothAssistantReply({
          event,
          agents: stateRef.current.agents,
          phoneCallByAgentId: officeTriggerStateRef.current.phoneCallByAgentId,
        })
      ) {
        return;
      }
      runtimeHandler.handleEvent(event);
    });
    const unsubscribeGap = client.onGap(() => {
      void loadAgents({
        minIntervalMs: 5_000,
        settingsMaxAgeMs: 30_000,
        silent: true,
      });
    });

    return () => {
      unsubscribeEvent();
      unsubscribeGap();
      runtimeHandler.dispose();
    };
  }, [
    agentsLoaded,
    client,
    debugEnabled,
    dispatch,
    loadAgents,
    refreshRecentTransportSessionHistory,
    requestAgentHistoryRefresh,
    status,
  ]);

  useEffect(() => {
    if (status !== "connected" || !agentsLoaded) return;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadAgents({
        minIntervalMs: 60_000,
        onlyWhenIdleForMs: 120_000,
        settingsMaxAgeMs: 180_000,
        silent: true,
      });
    }, 60_000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [agentsLoaded, loadAgents, status]);

  useEffect(() => {
    if (status !== "connected" || !agentsLoaded) return;
    const handleFocus = () => {
      if (document.visibilityState !== "visible") return;
      void loadAgents({
        minIntervalMs: 15_000,
        settingsMaxAgeMs: 30_000,
        silent: true,
      });
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [agentsLoaded, loadAgents, status]);

  useEffect(() => {
    const interval = setInterval(() => {
      const agents = stateRef.current?.agents ?? [];
      if (agents.length === 0) return;
      setOfficeTriggerState((previous) => {
        const next = reconcileOfficeAnimationTriggerState({
          state: previous,
          agents,
        });
        // Only update if state actually changed to avoid infinite loops
        if (JSON.stringify(next) === JSON.stringify(previous)) {
          return previous;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const agents = stateRef.current?.agents ?? [];
      if (agents.length === 0) return;
      setMarketplaceGymHoldByAgentId((previous) => {
        if (Object.keys(previous).length === 0) return previous;
        const activeAgentIds = new Set(
          agents.map((agent) => agent.agentId),
        );
        const next = Object.fromEntries(
          Object.entries(previous).filter(
            ([agentId, held]) => held && activeAgentIds.has(agentId),
          ),
        );
        if (
          Object.keys(previous).length === Object.keys(next).length &&
          Object.keys(previous).every(
            (agentId) => previous[agentId] === next[agentId],
          )
        ) {
          return previous;
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!monitorAgentId) return;
    const agents = stateRef.current?.agents ?? [];
    if (agents.some((agent) => agent.agentId === monitorAgentId)) return;
    setMonitorAgentId(null);
  }, [monitorAgentId]);

  useEffect(() => {
    if (!githubReviewAgentId) return;
    const agents = stateRef.current?.agents ?? [];
    if (agents.some((agent) => agent.agentId === githubReviewAgentId)) {
      return;
    }
    setGithubReviewAgentId(null);
  }, [githubReviewAgentId]);

  useEffect(() => {
    if (!qaTestingAgentId) return;
    const agents = stateRef.current?.agents ?? [];
    if (agents.some((agent) => agent.agentId === qaTestingAgentId)) {
      return;
    }
    setQaTestingAgentId(null);
  }, [qaTestingAgentId]);

  useEffect(() => {
    if (status !== "connected") return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await client.call<{ models: GatewayModelChoice[] }>(
          "models.list",
          {},
        );
        if (!cancelled) {
          setGatewayModels(
            buildGatewayModelChoices(
              Array.isArray(result.models) ? result.models : [],
              gatewayConfigSnapshot.current,
            ),
          );
        }
      } catch {
        // Models are optional - chat still works without model selection.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, client]);

  useEffect(() => {
    if (!chatOpen || selectedChatAgentId) return;
    const agents = stateRef.current?.agents ?? [];
    const selectedAgentId = stateRef.current?.selectedAgentId ?? null;
    const preferredAgentId = selectedAgentId ?? agents[0]?.agentId ?? null;
  if (preferredAgentId) {
  setSelectedChatAgentId(preferredAgentId);
  return;
  }
  if (companySquads.length > 0) {
  setSelectedChatAgentId(`squad:${companySquads[0]?.id}`);
  }
  }, [chatOpen, companySquads, selectedChatAgentId]);

  const remoteChatAgentIds = useMemo(
    () => (remoteOfficeSnapshot?.agents ?? []).map((agent) => `remote:${agent.agentId}`),
    [remoteOfficeSnapshot],
  );

  const loadAgentHistory = useCallback(
    async (agentId: string, options?: { limit?: number }) => {
      if (status !== "connected") return;
      const commands = await runHistorySyncOperation({
        client,
        agentId,
        requestedLimit: options?.limit,
        getAgent: (targetAgentId) =>
          stateRef.current.agents.find((entry) => entry.agentId === targetAgentId) ?? null,
        inFlightSessionKeys: historyInFlightRef.current,
        requestId: randomUUID(),
        loadedAt: Date.now(),
        defaultLimit: RUNTIME_SYNC_DEFAULT_HISTORY_LIMIT,
        maxLimit: RUNTIME_SYNC_MAX_HISTORY_LIMIT,
        transcriptV2Enabled: TRANSCRIPT_V2_ENABLED,
      });
      executeHistorySyncCommands({
        commands,
        dispatch,
        logMetric: (metric, meta) => logTranscriptDebugMetric(metric, meta),
        isDisconnectLikeError: isGatewayDisconnectLikeError,
        logError: (message, error) => console.error(message, error),
      });
    },
    [client, dispatch, status],
  );

  const loadMoreAgentHistory = useCallback(
    (agentId: string) => {
      const agent = stateRef.current.agents.find((entry) => entry.agentId === agentId) ?? null;
      const currentLimit = agent?.historyFetchLimit ?? null;
      const nextLimit = Math.min(
        RUNTIME_SYNC_MAX_HISTORY_LIMIT,
        Math.max(
          RUNTIME_SYNC_DEFAULT_HISTORY_LIMIT,
          currentLimit ? currentLimit + RUNTIME_SYNC_DEFAULT_HISTORY_LIMIT : RUNTIME_SYNC_DEFAULT_HISTORY_LIMIT * 2,
        ),
      );
      void loadAgentHistory(agentId, { limit: nextLimit });
    },
    [loadAgentHistory],
  );

  const chatController = useChatInteractionController({
    client,
    status,
    agents: state.agents,
    dispatch: (action) => dispatch(action as never),
    setError,
    getAgents: () => stateRef.current.agents,
    clearRunTracking: () => {},
    clearHistoryInFlight: () => {},
    clearSpecialUpdateMarker: () => {},
    clearSpecialLatestUpdateInFlight: () => {},
    setInspectSidebarNull: () => {},
    setMobilePaneChat: () => {},
  });

  const focusedChatAgent = selectedChatAgentId
    ? (state.agents.find((agent) => agent.agentId === selectedChatAgentId) ??
      null)
    : null;
  const selectedLocalChatAgentId = focusedChatAgent?.agentId ?? null;
  const agentEditorAgent = agentEditorAgentId
    ? (state.agents.find((agent) => agent.agentId === agentEditorAgentId) ?? null)
    : null;
  const autoLoadedHistorySessionRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!chatOpen || status !== "connected" || !focusedChatAgent) return;
    const sessionKey = focusedChatAgent.sessionKey?.trim() ?? "";
    if (!sessionKey) return;
    const historyIdentity = `${sessionKey}:${focusedChatAgent.historyLoadedAt ?? 0}:${focusedChatAgent.outputLines.length}`;
    if (autoLoadedHistorySessionRef.current[focusedChatAgent.agentId] === historyIdentity) {
      return;
    }
    const shouldLoadHistory =
      focusedChatAgent.historyLoadedAt == null ||
      focusedChatAgent.outputLines.length === 0 ||
      Boolean(focusedChatAgent.historyMaybeTruncated);
    if (!shouldLoadHistory) {
      autoLoadedHistorySessionRef.current[focusedChatAgent.agentId] = historyIdentity;
      return;
    }
    autoLoadedHistorySessionRef.current[focusedChatAgent.agentId] = historyIdentity;
    void loadAgentHistory(focusedChatAgent.agentId);
  }, [chatOpen, focusedChatAgent, loadAgentHistory, status]);

  useEffect(() => {
    if (!selectedChatAgentId) return;
    // Squad chat targets use "squad:{id}" — don't clear those.
    if (isSquadChatTargetId(selectedChatAgentId)) return;
    const agents = stateRef.current?.agents ?? [];
    if (agents.some((agent) => agent.agentId === selectedChatAgentId)) return;
    if (remoteChatAgentIds.includes(selectedChatAgentId)) return;
    setSelectedChatAgentId(null);
  }, [remoteChatAgentIds, selectedChatAgentId]);

  useEffect(() => {
    if (!agentEditorAgentId) return;
    const agents = stateRef.current?.agents ?? [];
    if (agents.some((agent) => agent.agentId === agentEditorAgentId)) return;
    setAgentEditorAgentId(null);
  }, [agentEditorAgentId]);

  const runLog = useRunLog({ client, status, agents: state.agents });
  const standupAgentSnapshots = useMemo<StandupAgentSnapshot[]>(
    () =>
      state.agents.map((agent) => ({
        agentId: agent.agentId,
        name: agent.name || agent.agentId,
        latestPreview: agent.latestPreview,
        lastUserMessage: agent.lastUserMessage,
      })),
    [state.agents],
  );
  const standupController = useOfficeStandupController({
    gatewayUrl,
    agents: standupAgentSnapshots,
  });
  const handleMarketplaceGymStart = useCallback((agentId: string) => {
    setMarketplaceGymHoldByAgentId((previous) => ({
      ...previous,
      [agentId]: true,
    }));
  }, []);
  const handleMarketplaceGymEnd = useCallback((agentId: string) => {
    setMarketplaceGymHoldByAgentId((previous) => {
      if (!previous[agentId]) return previous;
      const next = { ...previous };
      delete next[agentId];
      return next;
    });
  }, []);
  const marketplace = useOfficeSkillsMarketplace({
    client,
    status,
    agents: state.agents,
    preferredAgentId: selectedLocalChatAgentId,
    onSkillActivityStart: handleMarketplaceGymStart,
    onSkillActivityEnd: handleMarketplaceGymEnd,
  });
  const skillTriggers = useOfficeSkillTriggers({
    client,
    status,
    agents: state.agents,
  });
  const animationNowMs = Date.now();
  const officeAnimationState = useMemo(() => {
    const base = buildOfficeAnimationState({
      state: officeTriggerState,
      agents: state.agents,
      marketplaceGymHoldByAgentId,
      nowMs: animationNowMs,
    });
    const skillTriggerHoldMaps = buildOfficeSkillTriggerHoldMaps(
      skillTriggers.movementTargetByAgentId,
    );

    return {
      ...base,
      danceUntilByAgentId: danceUntilByAgentId,
      deskHoldByAgentId: {
        ...base.deskHoldByAgentId,
        ...skillTriggerHoldMaps.deskHoldByAgentId,
      },
      githubHoldByAgentId: {
        ...base.githubHoldByAgentId,
        ...skillTriggerHoldMaps.githubHoldByAgentId,
      },
      gymHoldByAgentId: {
        ...base.gymHoldByAgentId,
        ...skillTriggerHoldMaps.gymHoldByAgentId,
      },
      jukeboxHoldByAgentId: {
        ...base.jukeboxHoldByAgentId,
        ...skillTriggerHoldMaps.jukeboxHoldByAgentId,
      },
      qaHoldByAgentId: {
        ...base.qaHoldByAgentId,
        ...skillTriggerHoldMaps.qaHoldByAgentId,
      },
      skillGymHoldByAgentId: {
        ...base.skillGymHoldByAgentId,
        ...skillTriggerHoldMaps.skillGymHoldByAgentId,
      },
    };
  }, [
    animationNowMs,
    danceUntilByAgentId,
    marketplaceGymHoldByAgentId,
    officeTriggerState,
    skillTriggers.movementTargetByAgentId,
    state.agents,
  ]);
  const {
    deskHoldByAgentId,
    githubHoldByAgentId,
    jukeboxHoldByAgentId,
    manualGymUntilByAgentId,
    pendingStandupRequest,
    phoneBoothHoldByAgentId,
    phoneCallByAgentId,
    qaHoldByAgentId,
    smsBoothHoldByAgentId,
    skillGymHoldByAgentId,
    textMessageByAgentId,
    workingUntilByAgentId,
  } = officeAnimationState;
  const immediateGymHoldByAgentId = useMemo(
    () => ({
      ...marketplaceGymHoldByAgentId,
      ...skillGymHoldByAgentId,
    }),
    [marketplaceGymHoldByAgentId, skillGymHoldByAgentId],
  );

  useEffect(() => {
    const now = Date.now();
    const agents = stateRef.current?.agents ?? [];
    if (agents.length === 0) return;
    setGymCooldownUntilByAgentId((previous) => {
      const next: Record<string, number> = {};
      for (const agent of agents) {
        const agentId = agent.agentId;
        const immediateHeld = Boolean(immediateGymHoldByAgentId[agentId]);
        const wasImmediateHeld =
          prevImmediateGymHoldRef.current[agentId] ?? false;
        const previousUntil = previous[agentId] ?? 0;
        if (immediateHeld) {
          if (previousUntil > now) {
            next[agentId] = previousUntil;
          }
          continue;
        }
        if (wasImmediateHeld) {
          next[agentId] = now + GYM_WORKOUT_LATCH_MS;
          continue;
        }
        if (previousUntil > now) {
          next[agentId] = previousUntil;
        }
      }
      prevImmediateGymHoldRef.current = Object.fromEntries(
        agents.map((agent) => [
          agent.agentId,
          Boolean(immediateGymHoldByAgentId[agent.agentId]),
        ]),
      );
      // Only update if state actually changed
      if (JSON.stringify(next) === JSON.stringify(previous)) {
        return previous;
      }
      return next;
    });
  }, [immediateGymHoldByAgentId]);

  const activeGithubReviewAgentId = useMemo(
    () =>
      state.agents.find((agent) => githubHoldByAgentId[agent.agentId])
        ?.agentId ?? null,
    [githubHoldByAgentId, state.agents],
  );
  const activeQaTestingAgentId = useMemo(
    () =>
      state.agents.find((agent) => qaHoldByAgentId[agent.agentId])?.agentId ??
      null,
    [qaHoldByAgentId, state.agents],
  );
  useEffect(() => {
    setGithubReviewAgentId(activeGithubReviewAgentId);
  }, [activeGithubReviewAgentId]);

  useEffect(() => {
    if (!activeGithubReviewAgentId) return;
    setSelectedChatAgentId(activeGithubReviewAgentId);
    dispatch({ type: "selectAgent", agentId: activeGithubReviewAgentId });
  }, [activeGithubReviewAgentId, dispatch]);

  useEffect(() => {
    setQaTestingAgentId(activeQaTestingAgentId);
  }, [activeQaTestingAgentId]);

  useEffect(() => {
    if (!activeQaTestingAgentId) return;
    setSelectedChatAgentId(activeQaTestingAgentId);
    dispatch({ type: "selectAgent", agentId: activeQaTestingAgentId });
  }, [activeQaTestingAgentId, dispatch]);

  useEffect(() => {
    const activeKeys = new Set(
      Object.values(phoneCallByAgentId).map((request) => request.key),
    );
    promptedPhoneCallKeysRef.current = new Set(
      [...promptedPhoneCallKeysRef.current].filter((key) => activeKeys.has(key)),
    );
    preparedPhoneCallKeysRef.current = new Set(
      [...preparedPhoneCallKeysRef.current].filter((key) => activeKeys.has(key)),
    );
    spokenPhoneCallKeysRef.current = new Set(
      [...spokenPhoneCallKeysRef.current].filter((key) => activeKeys.has(key)),
    );
    setPreparedPhoneCallsByAgentId((previous) => {
      const next = Object.fromEntries(
        Object.entries(previous).filter(([, entry]) => activeKeys.has(entry.requestKey)),
      );
      if (
        Object.keys(previous).length === Object.keys(next).length &&
        Object.keys(previous).every((agentId) => previous[agentId] === next[agentId])
      ) {
        return previous;
      }
      return next;
    });
  }, [phoneCallByAgentId]);

  useEffect(() => {
    const requests = Object.entries(phoneCallByAgentId);
    if (requests.length === 0) return;

    const appendPromptForAgent = (agentId: string, request: OfficePhoneCallRequest) => {
      const agents = stateRef.current?.agents ?? [];
      const agent = agents.find((entry) => entry.agentId === agentId);
      if (!agent) return;
      promptedPhoneCallKeysRef.current.add(request.key);
      void fetch("/api/office/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callee: request.callee,
          message: null,
        }),
      })
        .then(async (response) => {
          const body = (await response.json().catch(() => null)) as {
            scenario?: MockPhoneCallScenario;
          } | null;
          const promptText = body?.scenario?.promptText?.trim();
          if (!response.ok || !promptText) {
            promptedPhoneCallKeysRef.current.delete(request.key);
            return;
          }
          // v121 — do NOT force-open the chat panel here. The phone-call
          // scenario was popping chat over whatever the operator was
          // doing (Squad Ops modal, Profile modal, …) every time an
          // ambient phone cue fired during a long-running squad task.
          // Just record the output line + remember the agent; the
          // operator will see the line the next time they open chat
          // for this agent on their own.
          setSelectedChatAgentId(agentId);
          dispatch({ type: "selectAgent", agentId });
          dispatch({
            type: "appendOutput",
            agentId,
            line: buildPhoneCallOutputLine(promptText),
          });
        })
        .catch(() => {
          promptedPhoneCallKeysRef.current.delete(request.key);
        });
    };

    const prepareScenarioForAgent = (agentId: string, request: OfficePhoneCallRequest) => {
      preparedPhoneCallKeysRef.current.add(request.key);
      void fetch("/api/office/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callee: request.callee,
          message: request.message,
        }),
      })
        .then(async (response) => {
          const body = (await response.json().catch(() => null)) as {
            scenario?: MockPhoneCallScenario;
          } | null;
          const scenario = body?.scenario;
          if (!response.ok || !scenario) {
            preparedPhoneCallKeysRef.current.delete(request.key);
            return;
          }
          setPreparedPhoneCallsByAgentId((previous) => ({
            ...previous,
            [agentId]: {
              requestKey: request.key,
              scenario,
            },
          }));
        })
        .catch(() => {
          preparedPhoneCallKeysRef.current.delete(request.key);
        });
    };

    for (const [agentId, request] of requests) {
      if (
        request.phase === "needs_message" &&
        !promptedPhoneCallKeysRef.current.has(request.key)
      ) {
        appendPromptForAgent(agentId, request);
      }
      if (
        request.phase === "ready_to_call" &&
        !preparedPhoneCallKeysRef.current.has(request.key)
      ) {
        prepareScenarioForAgent(agentId, request);
      }
    }
  }, [dispatch, phoneCallByAgentId]);

  const activePhoneBoothAgentId = useMemo(
    () =>
      state.agents.find((agent) => {
        if (!phoneBoothHoldByAgentId[agent.agentId]) return false;
        const prepared = preparedPhoneCallsByAgentId[agent.agentId];
        const request = phoneCallByAgentId[agent.agentId];
        return Boolean(prepared && request && prepared.requestKey === request.key);
      })?.agentId ?? null,
    [phoneBoothHoldByAgentId, phoneCallByAgentId, preparedPhoneCallsByAgentId, state.agents],
  );

  const activePhoneCallScenario = useMemo(() => {
    if (!activePhoneBoothAgentId) return null;
    return preparedPhoneCallsByAgentId[activePhoneBoothAgentId]?.scenario ?? null;
  }, [activePhoneBoothAgentId, preparedPhoneCallsByAgentId]);

  const handlePhoneCallSpeak = useCallback(
    ({ agentId, requestKey }: PhoneCallSpeakPayload) => {
      if (spokenPhoneCallKeysRef.current.has(requestKey)) return;
      spokenPhoneCallKeysRef.current.add(requestKey);
      setSelectedChatAgentId(agentId);
      dispatch({ type: "selectAgent", agentId });
    },
    [dispatch],
  );

  const handlePhoneCallComplete = useCallback(
    (agentId: string) => {
      setPreparedPhoneCallsByAgentId((previous) => {
        const next = { ...previous };
        delete next[agentId];
        return next;
      });
      const request = phoneCallByAgentId[agentId];
      if (request) {
        dispatch({
          type: "appendOutput",
          agentId,
          line: buildPhoneCallOutputLine(`Call with ${request.callee} finished.`),
        });
      }
      setOfficeTriggerState((previous) =>
        clearOfficeAnimationTriggerHold({
          state: previous,
          hold: "call",
          agentId,
        }),
      );
    },
    [dispatch, phoneCallByAgentId],
  );

  useEffect(() => {
    const activeKeys = new Set(
      Object.values(textMessageByAgentId).map((request) => request.key),
    );
    promptedTextMessageKeysRef.current = new Set(
      [...promptedTextMessageKeysRef.current].filter((key) => activeKeys.has(key)),
    );
    preparedTextMessageKeysRef.current = new Set(
      [...preparedTextMessageKeysRef.current].filter((key) => activeKeys.has(key)),
    );
    setPreparedTextMessagesByAgentId((previous) => {
      const next = Object.fromEntries(
        Object.entries(previous).filter(([, entry]) => activeKeys.has(entry.requestKey)),
      );
      if (
        Object.keys(previous).length === Object.keys(next).length &&
        Object.keys(previous).every((agentId) => previous[agentId] === next[agentId])
      ) {
        return previous;
      }
      return next;
    });
  }, [textMessageByAgentId]);

  useEffect(() => {
    const requests = Object.entries(textMessageByAgentId);
    if (requests.length === 0) return;

    const appendPromptForAgent = (agentId: string, request: OfficeTextMessageRequest) => {
      const agents = stateRef.current?.agents ?? [];
      const agent = agents.find((entry) => entry.agentId === agentId);
      if (!agent) return;
      promptedTextMessageKeysRef.current.add(request.key);
      void fetch("/api/office/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: request.recipient,
          message: null,
        }),
      })
        .then(async (response) => {
          const body = (await response.json().catch(() => null)) as {
            scenario?: MockTextMessageScenario;
          } | null;
          const promptText = body?.scenario?.promptText?.trim();
          if (!response.ok || !promptText) {
            promptedTextMessageKeysRef.current.delete(request.key);
            return;
          }
          // v121 — same fix as the phone-call path: don't force-open
          // chat. Ambient SMS scenarios that fire mid-Squad-Ops were
          // popping the chat panel over the modal repeatedly.
          setSelectedChatAgentId(agentId);
          dispatch({ type: "selectAgent", agentId });
          dispatch({
            type: "appendOutput",
            agentId,
            line: buildTextMessageOutputLine(promptText),
          });
        })
        .catch(() => {
          promptedTextMessageKeysRef.current.delete(request.key);
        });
    };

    const prepareScenarioForAgent = (agentId: string, request: OfficeTextMessageRequest) => {
      preparedTextMessageKeysRef.current.add(request.key);
      void fetch("/api/office/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: request.recipient,
          message: request.message,
        }),
      })
        .then(async (response) => {
          const body = (await response.json().catch(() => null)) as {
            scenario?: MockTextMessageScenario;
          } | null;
          const scenario = body?.scenario;
          if (!response.ok || !scenario) {
            preparedTextMessageKeysRef.current.delete(request.key);
            return;
          }
          setPreparedTextMessagesByAgentId((previous) => ({
            ...previous,
            [agentId]: {
              requestKey: request.key,
              scenario,
            },
          }));
        })
        .catch(() => {
          preparedTextMessageKeysRef.current.delete(request.key);
        });
    };

    for (const [agentId, request] of requests) {
      if (
        request.phase === "needs_message" &&
        !promptedTextMessageKeysRef.current.has(request.key)
      ) {
        appendPromptForAgent(agentId, request);
      }
      if (
        request.phase === "ready_to_send" &&
        !preparedTextMessageKeysRef.current.has(request.key)
      ) {
        prepareScenarioForAgent(agentId, request);
      }
    }
  }, [dispatch, textMessageByAgentId]);

  const activeSmsBoothAgentId = useMemo(
    () =>
      state.agents.find((agent) => {
        if (!smsBoothHoldByAgentId[agent.agentId]) return false;
        const prepared = preparedTextMessagesByAgentId[agent.agentId];
        const request = textMessageByAgentId[agent.agentId];
        return Boolean(prepared && request && prepared.requestKey === request.key);
      })?.agentId ?? null,
    [preparedTextMessagesByAgentId, smsBoothHoldByAgentId, state.agents, textMessageByAgentId],
  );

  const activeTextMessageScenario = useMemo(() => {
    if (!activeSmsBoothAgentId) return null;
    return preparedTextMessagesByAgentId[activeSmsBoothAgentId]?.scenario ?? null;
  }, [activeSmsBoothAgentId, preparedTextMessagesByAgentId]);

  const handleTextMessageComplete = useCallback(
    (agentId: string) => {
      const isManualSmsBoothFlow = agentId.startsWith("__manual");

      if (!isManualSmsBoothFlow) {
        setPreparedTextMessagesByAgentId((previous) => {
          const next = { ...previous };
          delete next[agentId];
          return next;
        });
      }

      const request = textMessageByAgentId[agentId];
      if (request && !isManualSmsBoothFlow) {
        dispatch({
          type: "appendOutput",
          agentId,
          line: buildTextMessageOutputLine(`Message to ${request.recipient} sent.`),
        });
      }
      if (typeof window !== "undefined" && leadOpsAutoOpenTimeoutRef.current) {
        window.clearTimeout(leadOpsAutoOpenTimeoutRef.current);
        leadOpsAutoOpenTimeoutRef.current = null;
      }

      setLeadOpsModalOpen(true);

      if (!isManualSmsBoothFlow) {
        setOfficeTriggerState((previous) =>
          clearOfficeAnimationTriggerHold({
            state: previous,
            hold: "text",
            agentId,
          }),
        );
      }
    },
    [dispatch, textMessageByAgentId],
  );

  const handleTextMessageClose = useCallback((agentId: string) => {
    if (agentId.startsWith("__manual")) return;

    if (typeof window !== "undefined" && leadOpsAutoOpenTimeoutRef.current) {
      window.clearTimeout(leadOpsAutoOpenTimeoutRef.current);
      leadOpsAutoOpenTimeoutRef.current = null;
    }

    setPreparedTextMessagesByAgentId((previous) => {
      const next = { ...previous };
      delete next[agentId];
      return next;
    });

    setOfficeTriggerState((previous) =>
      clearOfficeAnimationTriggerHold({
        state: previous,
        hold: "text",
        agentId,
      }),
    );
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && leadOpsAutoOpenTimeoutRef.current) {
        window.clearTimeout(leadOpsAutoOpenTimeoutRef.current);
      }
    };
  }, []);

  const gymHoldByAgentId = useMemo(() => {
    const next: Record<string, boolean> = {};
    for (const agent of state.agents) {
      const agentId = agent.agentId;
      if (
        immediateGymHoldByAgentId[agentId] ||
        (manualGymUntilByAgentId[agentId] ?? 0) > animationNowMs ||
        (gymCooldownUntilByAgentId[agentId] ?? 0) > animationNowMs
      ) {
        next[agentId] = true;
      }
    }
    return next;
  }, [
    animationNowMs,
    gymCooldownUntilByAgentId,
    immediateGymHoldByAgentId,
    manualGymUntilByAgentId,
    state.agents,
  ]);

  const resolveGatewayAgentIdForLeadContext = useCallback((params: {
    agentId?: number | null;
    agentSlug?: string | null;
    agentName?: string | null;
  }) => {
    if (typeof params.agentId === "number" && Number.isFinite(params.agentId)) {
      for (const [gatewayAgentId, backendAgentId] of backendAgentByGatewayIdRef.current.entries()) {
        if (backendAgentId === params.agentId) return gatewayAgentId;
      }
    }
    const normalizedSlug = params.agentSlug?.trim().toLowerCase();
    if (normalizedSlug) {
      const bySlug = state.agents.find((agent) => agent.agentId.trim().toLowerCase() === normalizedSlug);
      if (bySlug) return bySlug.agentId;
    }
    const normalizedName = params.agentName?.trim().toLowerCase();
    if (normalizedName) {
      const byName = state.agents.find((agent) => agent.name.trim().toLowerCase() === normalizedName);
      if (byName) return byName.agentId;
    }
    return selectedChatAgentId;
  }, [selectedChatAgentId, state.agents]);

  const loadLeadChatContext = useCallback(async () => {
    if (!companyId) {
      setLeadChatContextError("This workspace does not have a company context for leads.");
      setLeadChatJobs([]);
      setLeadChatLeads([]);
      return;
    }
    setLeadChatContextLoading(true);
    setLeadChatContextError(null);
    try {
      const [jobs, leads] = await Promise.all([
        listLeadGenerationJobs(companyId),
        listLeadsByCompany(companyId),
      ]);
      setLeadChatJobs(jobs.slice(0, 12));
      setLeadChatLeads(leads.slice(0, 24));
    } catch (error) {
      setLeadChatContextError(error instanceof Error ? error.message : "Unable to load lead context right now.");
      setLeadChatJobs([]);
      setLeadChatLeads([]);
    } finally {
      setLeadChatContextLoading(false);
    }
  }, [companyId]);

  const openLeadChatContext = useCallback(async (tab: "jobs" | "leads" = "jobs") => {
    setLeadChatContextTab(tab);
    setLeadChatContextOpen(true);
    if (leadChatJobs.length > 0 || leadChatLeads.length > 0 || leadChatContextLoading) return;
    await loadLeadChatContext();
  }, [leadChatContextLoading, leadChatJobs.length, leadChatLeads.length, loadLeadChatContext]);

  const handleOpenAgentChat = useCallback(
    (agentId: string, options?: { sessionKey?: string | null; leadContext?: string | null; leadContextLabel?: string | null; draft?: string | null }) => {
      if (!isRemoteOfficeAgentId(agentId) && !isSquadChatTargetId(agentId) && options?.sessionKey) {
        const targetAgent = state.agents.find((entry) => entry.agentId === agentId);
        if (targetAgent && targetAgent.sessionKey !== options.sessionKey) {
          dispatch({
            type: "updateAgent",
            agentId,
            patch: {
              sessionKey: options.sessionKey,
              outputLines: [],
              transcriptEntries: [],
              runId: null,
              historyLoadedAt: null,
              sessionCreated: false,
              sessionSettingsSynced: false,
            },
          });
        }
      }
      // Store lead context to prepend on next send
      if (options?.leadContext) {
        pendingLeadChatContextRef.current = options.leadContext;
        setPendingLeadContextLabel(options.leadContextLabel ?? "Lead context");
      }
      // Set draft if provided
      if (options?.draft && !isRemoteOfficeAgentId(agentId) && !isSquadChatTargetId(agentId)) {
        dispatch({
          type: "updateAgent",
          agentId,
          patch: { draft: options.draft },
        });
      }
      setSelectedChatAgentId(agentId);
      setChatTargetView(isSquadChatTargetId(agentId) ? "squads" : "agents");
      setChatOpen(true);
      if (!isRemoteOfficeAgentId(agentId) && !isSquadChatTargetId(agentId)) {
        dispatch({ type: "selectAgent", agentId });
      }
    },
    [dispatch, state.agents],
  );

  const handlePrimeLeadContextFromChat = useCallback(async (target: { type: "job"; id: number } | { type: "lead"; id: number }) => {
    if (!selectedChatAgentId) return;
    setLeadChatContextError(null);
    setLeadChatBusyKey(`${target.type}:${target.id}`);
    try {
      const ctx = target.type === "job"
        ? await fetchJobChatContext(target.id, {
            actionPrompt: "Use this full lead generation as context in the active chat. Analyze the opportunities and continue helping from here.",
          })
        : await fetchLeadChatContext(target.id);

      // Open agent chat with lead context stored (prepended on next send) and draft pre-filled
      handleOpenAgentChat(selectedChatAgentId, {
        leadContext: ctx.chatContext,
        leadContextLabel: ctx.title || (target.type === "job" ? "Lead generation job" : "Lead context"),
        draft: ctx.suggestedUserMessage,
      });
      setLeadChatContextOpen(false);
    } catch (error) {
      setLeadChatContextError(error instanceof Error ? error.message : "Unable to pull this lead context into chat.");
    } finally {
      setLeadChatBusyKey(null);
    }
  }, [handleOpenAgentChat, selectedChatAgentId]);
  const updateRemoteChatSession = useCallback(
    (
      agentId: string,
      updater: (session: RemoteChatSessionState) => RemoteChatSessionState,
    ) => {
      setRemoteChatByAgentId((previous) => {
        const current = previous[agentId] ?? EMPTY_REMOTE_CHAT_SESSION;
        return {
          ...previous,
          [agentId]: updater(current),
        };
      });
    },
    [],
  );
  const updateSquadChatSession = useCallback(
    (
      squadId: string,
      updater: (session: RemoteChatSessionState) => RemoteChatSessionState,
    ) => {
      setSquadChatById((previous) => {
        const current = previous[squadId] ?? EMPTY_REMOTE_CHAT_SESSION;
        return {
          ...previous,
          [squadId]: updater(current),
        };
      });
    },
    [],
  );

  const handleRemoteAgentChatSend = useCallback(
    async (agentId: string, message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      if (trimmed.length > MAX_REMOTE_MESSAGE_CHARS) {
        updateRemoteChatSession(agentId, (session) => ({
          ...session,
          sending: false,
          error: `Remote message must be ${MAX_REMOTE_MESSAGE_CHARS} characters or fewer.`,
        }));
        return;
      }
      const remoteAgentId = isRemoteOfficeAgentId(agentId)
        ? agentId.slice("remote:".length)
        : agentId;
      const sentAt = Date.now();
      updateRemoteChatSession(agentId, (session) => ({
        ...session,
        draft: "",
        sending: true,
        error: null,
        messages: [
          ...session.messages,
          {
            id: randomUUID(),
            role: "user",
            text: trimmed,
            timestampMs: sentAt,
          },
        ],
      }));
      const remoteClient = new GatewayClient();
      try {
        await remoteClient.connect({
          gatewayUrl: remoteOfficeGatewayUrl,
        });
        const agentsResult = (await remoteClient.call("agents.list", {})) as {
          mainKey?: string;
          agents?: Array<{ id?: string; name?: string; slug?: string }>;
        };
        const remoteAgents = Array.isArray(agentsResult.agents)
          ? agentsResult.agents.filter((entry) => {
              const entryId = entry.id?.trim() ?? "";
              if (entryId.length === 0) return false;
              const ids = companyScopedAgentIdsRef.current;
              const slugs = companyScopedAgentSlugsRef.current;
              if (ids == null && slugs == null) return true;
              if (ids?.includes(entryId)) return true;
              const entrySlug = (entry.slug ?? entry.name ?? "").toString().trim().toLowerCase();
              return Boolean(entrySlug && slugs?.includes(entrySlug));
            })
          : [];
        if (remoteAgents.length === 0) {
          throw new Error("Remote agent list is unavailable right now.");
        }
        if (!remoteAgents.some((entry) => (entry.id?.trim() ?? "") === remoteAgentId)) {
          throw new Error("Remote agent is no longer available.");
        }
        const sessionKey = buildAgentMainSessionKey(
          remoteAgentId,
          agentsResult.mainKey?.trim() || "main",
        );
        await remoteClient.call("chat.send", {
          sessionKey,
          message: buildRemoteRelayInstruction(trimmed),
          deliver: false,
          idempotencyKey: randomUUID(),
        });
        updateRemoteChatSession(agentId, (session) => ({
          ...session,
          sending: false,
          error: null,
          messages: [
            ...session.messages,
            {
              id: randomUUID(),
              role: "system",
              text: "Delivered to the remote agent.",
              timestampMs: Date.now(),
            },
          ],
        }));
      } catch (error) {
        const messageText =
          error instanceof Error
            ? error.message
            : "Failed to deliver the remote office message.";
        updateRemoteChatSession(agentId, (session) => ({
          ...session,
          sending: false,
          error: messageText,
          messages: [
            ...session.messages,
            {
              id: randomUUID(),
              role: "system",
              text: `Delivery failed: ${messageText}`,
              timestampMs: Date.now(),
            },
          ],
        }));
      } finally {
        remoteClient.disconnect();
      }
    },
    [remoteOfficeGatewayUrl, updateRemoteChatSession],
  );

  const lastStandupTriggerKeyRef = useRef<string | null>(null);
  const triggerStandupMeeting = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return false;
      if (
        standupController.meeting &&
        standupController.meeting.phase !== "complete"
      ) {
        return false;
      }
      await standupController.startMeeting("manual");
      return true;
    },
    [standupController],
  );

  const handleGithubReviewDismiss = useCallback(() => {
    if (!githubReviewAgentId) return;
    setOfficeTriggerState((previous) =>
      clearOfficeAnimationTriggerHold({
        state: previous,
        hold: "github",
        agentId: githubReviewAgentId,
      }),
    );
  }, [githubReviewAgentId]);

  const handleQaDismiss = useCallback(() => {
    if (!qaTestingAgentId) return;
    setOfficeTriggerState((previous) =>
      clearOfficeAnimationTriggerHold({
        state: previous,
        hold: "qa",
        agentId: qaTestingAgentId,
      }),
    );
  }, [qaTestingAgentId]);

  const handleSquadChatSend = useCallback(
    async (squad: SquadSummary, message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      updateSquadChatSession(squad.id, (session) => ({
        ...session,
        draft: "",
        sending: true,
        error: null,
      }));

      try {
        const numericSquadId = Number(squad.id);
        if (!Number.isFinite(numericSquadId) || numericSquadId <= 0) {
          throw new Error(`Invalid squad id: ${squad.id}`);
        }

        const createdTask = await createSquadTask({
          squadId: numericSquadId,
          title: trimmed.length > 80 ? `${trimmed.slice(0, 77).trimEnd()}…` : trimmed,
          prompt: trimmed,
          executionMode: squad.executionMode ?? "leader",
          preferredModel: null,
          targetAgentId: null,
        });

        setSquadOpsSelectedTask(createdTask);
        setActiveSquadChatTaskBySquadId((current) => ({ ...current, [squad.id]: createdTask.id }));
        setSelectedSquadTasks((current) => {
          const next = current.filter((task) => task.id !== createdTask.id);
          return [createdTask, ...next].sort((left, right) => right.id - left.id);
        });

        await dispatchSquadTask(createdTask.id, {
          onlyPendingRuns: true,
          retryFailedRuns: true,
          forceRedispatchCompletedRuns: false,
          deliveryMode: "none",
          wakeMode: "now",
          thinking: "medium",
          model: null,
        });

        const hydratedTask = await fetchSquadTask(createdTask.id);
        setSelectedSquadTasks((current) => {
          const next = current.filter((task) => task.id !== hydratedTask.id);
          return [hydratedTask, ...next].sort((left, right) => right.id - left.id);
        });

        setActiveSquadChatTaskBySquadId((current) => ({ ...current, [squad.id]: hydratedTask.id }));
        updateSquadChatSession(squad.id, (session) => ({
          ...session,
          sending: false,
          error: null,
        }));
      } catch (error) {
        updateSquadChatSession(squad.id, (session) => ({
          ...session,
          sending: false,
          error: error instanceof Error ? error.message : "Unable to dispatch the squad task right now.",
        }));
        throw error;
      }
    },
    [updateSquadChatSession],
  );

  const handleChatSend = useCallback(
    async (agentId: string, sessionKey: string, payload: string | ChatSendPayload) => {
      stopVoiceReplyPlayback();
      const resolvedPayload = typeof payload === "string" ? { text: payload } : payload;
      let trimmed = resolvedPayload.text.trim();
      const attachments = Array.isArray(resolvedPayload.attachments) ? resolvedPayload.attachments : [];
      if (!trimmed && attachments.length === 0) return;

      // Prepend pending lead context if available
      const pendingCtx = pendingLeadChatContextRef.current;
      if (pendingCtx) {
        pendingLeadChatContextRef.current = null;
        setPendingLeadContextLabel(null);
        trimmed = `${pendingCtx}\n\n---\n\n${trimmed}`;
      }
      if (isRemoteOfficeAgentId(agentId)) {
        if (attachments.length > 0) {
          throw new Error("Remote office chat does not support file attachments yet.");
        }
        await handleRemoteAgentChatSend(agentId, trimmed);
        return;
      }

      const intentSnapshot = resolveOfficeIntentSnapshot(trimmed);
      setOpenClawLogEntries((previous) => {
        const next = [
          ...previous,
          createOpenClawLogEntry({
            eventName: "office-intent",
            eventKind: "derived",
            summary: `agent=${agentId} gym=${intentSnapshot.gym?.source ?? "-"} qa=${intentSnapshot.qa ?? "-"} github=${intentSnapshot.github ?? "-"} desk=${intentSnapshot.desk ?? "-"} text=${intentSnapshot.text?.phase ?? "-"}`,
            payload: {
              agentId,
              message: trimmed,
              normalized: intentSnapshot.normalized,
              intentSnapshot,
            },
          }),
        ];
        return next.slice(-MAX_OPENCLAW_LOG_ENTRIES);
      });
      const pendingPhoneCall = phoneCallByAgentId[agentId] ?? null;
      const pendingTextMessage = textMessageByAgentId[agentId] ?? null;
      const hasImmediateOfficeTrigger = Boolean(
        intentSnapshot.desk ||
          intentSnapshot.github ||
          intentSnapshot.gym ||
          intentSnapshot.qa ||
          intentSnapshot.standup ||
          intentSnapshot.text,
      );
      const isPhoneCallFollowUp =
        pendingPhoneCall?.phase === "needs_message" &&
        !intentSnapshot.call &&
        !intentSnapshot.text &&
        !intentSnapshot.desk &&
        !intentSnapshot.github &&
        !intentSnapshot.gym &&
        !intentSnapshot.qa &&
        !intentSnapshot.standup;
      const isTextMessageFollowUp =
        pendingTextMessage?.phase === "needs_message" &&
        !intentSnapshot.call &&
        !intentSnapshot.text &&
        !intentSnapshot.desk &&
        !intentSnapshot.github &&
        !intentSnapshot.gym &&
        !intentSnapshot.qa &&
        !intentSnapshot.standup;

      // v122 — IMMEDIATE WORKING LATCH on every chat send.
      //
      // Without this branch the agent only flipped to "working" (green
      // dot + green ring + walk-to-desk) AFTER the gateway emitted its
      // first runtime-chat event, which can take a couple of seconds.
      // The operator's mental model: "I clicked send, the agent should
      // be working RIGHT NOW." We fire a synthetic chat event with our
      // local runId so the office animation reducer records working
      // activity + (via the reconciliation pass added in v122) auto-pins
      // the agent to its assigned desk for the duration of the run.
      //
      // Excluded paths: remote-office agents (handled by their own
      // remote chat send branch above), explicit `call` intents
      // (the phone-booth path below has its own animation cue),
      // and phone/SMS follow-ups (their booths drive the animation).
      if (
        !intentSnapshot.call &&
        !isPhoneCallFollowUp &&
        !isTextMessageFollowUp
      ) {
        const nowMs = Date.now();
        const runId = randomUUID();
        setOfficeTriggerState((previous) =>
          reduceOfficeAnimationTriggerEvent({
            state: previous,
            agents: stateRef.current.agents,
            nowMs,
            event: {
              type: "event",
              event: "chat",
              payload: {
                runId,
                sessionKey,
                state: "final",
                message: {
                  role: "user",
                  content: trimmed,
                },
              },
            },
          }),
        );
      }

      if (intentSnapshot.call || isPhoneCallFollowUp) {
        const nowMs = Date.now();
        const runId = randomUUID();
        dispatch({
          type: "updateAgent",
          agentId,
          patch: {
            draft: "",
            lastUserMessage: trimmed,
            lastActivityAt: nowMs,
          },
        });
        dispatch({
          type: "appendOutput",
          agentId,
          line: `> ${trimmed}`,
          transcript: {
            source: "local-send",
            runId,
            sessionKey,
            timestampMs: nowMs,
            role: "user",
            kind: "user",
            confirmed: true,
          },
        });
        setOfficeTriggerState((previous) =>
          reduceOfficeAnimationTriggerEvent({
            state: previous,
            agents: stateRef.current.agents,
            nowMs,
            event: {
              type: "event",
              event: "chat",
              payload: {
                runId,
                sessionKey,
                state: "final",
                message: {
                  role: "user",
                  content: trimmed,
                },
              },
            },
          }),
        );
        return;
      }

      await chatController.handleSend(agentId, sessionKey, {
        ...resolvedPayload,
        text: trimmed,
        systemContext: companyContextRef.current,
      });
    },
    [
      chatController,
      dispatch,
      handleRemoteAgentChatSend,
      phoneCallByAgentId,
      stopVoiceReplyPlayback,
      textMessageByAgentId,
    ],
  );

  useEffect(() => {
    if (!pendingStandupRequest) return;
    if (lastStandupTriggerKeyRef.current === pendingStandupRequest.key) return;
    if (
      standupController.meeting &&
      standupController.meeting.phase !== "complete"
    ) {
      return;
    }
    lastStandupTriggerKeyRef.current = pendingStandupRequest.key;
    void triggerStandupMeeting(pendingStandupRequest.message).catch((error) => {
      console.error("Failed to trigger standup meeting.", error);
    });
  }, [pendingStandupRequest, standupController.meeting, triggerStandupMeeting]);

  const transcribeVoicePayload = useCallback(
    async (payload: VoiceSendPayload) => {
      const file = new File([payload.blob], payload.fileName, {
        type: payload.mimeType,
      });
      const formData = new FormData();
      formData.set("audio", file);
      const response = await fetch("/api/office/voice/transcribe", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as {
        transcript?: string | null;
        error?: string;
        ignored?: boolean;
      } | null;
      if (!response.ok) {
        throw new Error(
          result?.error?.trim() || "Failed to transcribe voice input.",
        );
      }
      if (result?.ignored) {
        return null;
      }
      const transcript = result?.transcript?.trim() ?? "";
      if (!transcript) {
        throw new Error("OpenClaw returned an empty transcript.");
      }
      return transcript;
    },
    [],
  );

  const sendVoicePayloadToAgent = useCallback(
    async (
      agent: Pick<AgentState, "agentId" | "sessionKey"> | null,
      payload: VoiceSendPayload,
    ) => {
      if (!agent) {
        throw new Error("Target agent not found.");
      }
      const transcript = await transcribeVoicePayload(payload);
      if (!transcript) return;
      await handleChatSend(agent.agentId, agent.sessionKey, { text: transcript });
    },
    [handleChatSend, transcribeVoicePayload],
  );

  const handleVoiceSend = useCallback(
    async (payload: VoiceSendPayload) => {
      if (!focusedChatAgent) {
        throw new Error("Select an agent before using push-to-talk.");
      }
      await sendVoicePayloadToAgent(focusedChatAgent, payload);
    },
    [focusedChatAgent, sendVoicePayloadToAgent],
  );

  const {
    state: mainVoiceState,
    error: mainVoiceError,
    supported: mainVoiceSupported,
    start: startMainVoiceRecording,
    stop: stopMainVoiceRecording,
    clearError: clearMainVoiceError,
  } = useVoiceRecorder({
    enabled: status === "connected" && Boolean(focusedChatAgent),
    onVoiceSend: async (payload) => {
      if (!focusedChatAgent) {
        throw new Error("Main agent not found.");
      }
      await sendVoicePayloadToAgent(focusedChatAgent, payload);
    },
  });

  type SquadRunPreviewItem = {
    role?: string;
    text?: string;
    timestamp?: number | string;
  };

  type SquadRunPreviewEntry = {
    key?: string;
    status?: string;
    items?: SquadRunPreviewItem[];
  };

  type SquadRunPreviewResult = {
    previews?: SquadRunPreviewEntry[];
  };

  type SquadRunSessionListEntry = {
    key?: string;
    updatedAt?: number | null;
    origin?: {
      label?: string | null;
    } | null;
  };

  type SquadRunSessionListResult = {
    sessions?: SquadRunSessionListEntry[];
  };

  const activeSquadRunBySessionKey = useMemo(() => {
    const map = new Map<string, {
      taskId: number;
      runId: number;
      squadId: number;
      leaderGatewayAgentId: string | null;
      outputText: string | null;
      status: string | null;
    }>();
    for (const task of selectedSquadTasks) {
      const squad = companySquads.find((entry) => Number(entry.id) === task.squadId) ?? null;
      for (const run of task.runs) {
        const sessionKey = typeof run.externalSessionKey === "string" ? run.externalSessionKey.trim() : "";
        if (!sessionKey) continue;
        const normalizedStatus = (run.status ?? "").toLowerCase();
        if (normalizedStatus !== "running" && normalizedStatus !== "queued" && normalizedStatus !== "pending") continue;
        map.set(sessionKey, {
          taskId: task.id,
          runId: run.id,
          squadId: task.squadId,
          leaderGatewayAgentId: squad?.leaderGatewayAgentId?.trim() || null,
          outputText: run.outputText ?? null,
          status: run.status ?? null,
        });
      }
    }
    return map;
  }, [companySquads, selectedSquadTasks]);

  useFinalizedAssistantReplyListener(state.agents, ({ sessionKey, text }) => {
    if (!voiceRepliesLoaded || !voiceRepliesEnabled) return;
    enqueueVoiceReply({
      text,
      provider: voiceRepliesPreference.provider,
      voiceId: voiceRepliesPreference.voiceId,
    });
  });

  const squadRunMirrorInFlightRef = useRef<Set<number>>(new Set());
  const squadRunHistoryPollInFlightRef = useRef<Set<string>>(new Set());

  const mirrorSquadRunCompletion = useCallback(
    async (params: { taskId: number; runId: number; sessionKey: string; text: string }) => {
      const normalizedText = params.text.trim();
      if (!normalizedText) return;
      if (squadRunMirrorInFlightRef.current.has(params.runId)) return;

      squadRunMirrorInFlightRef.current.add(params.runId);
      try {
        await updateSquadTaskRun(params.runId, {
          status: "completed",
          outputText: normalizedText,
          externalSessionKey: params.sessionKey,
          dispatchError: "",
          lastSyncedAtUtc: new Date().toISOString(),
          finishedAtUtc: new Date().toISOString(),
        });
        const refreshedTask = await fetchSquadTask(params.taskId);
        setSelectedSquadTasks((current) => {
          const next = current.filter((task) => task.id !== refreshedTask.id);
          return [refreshedTask, ...next].sort((left, right) => right.id - left.id);
        });
        setActiveSquadChatTaskBySquadId((current) => ({ ...current, [String(refreshedTask.squadId)]: refreshedTask.id }));
        updateSquadChatSession(String(refreshedTask.squadId), (session) => ({
          ...session,
          sending: false,
          error: null,
        }));
      } catch (error) {
        console.error("Failed to mirror squad run result from runtime session.", error);
      } finally {
        squadRunMirrorInFlightRef.current.delete(params.runId);
      }
    },
    [fetchSquadTask, setSelectedSquadTasks, updateSquadChatSession],
  );


  const resolveLatestAssistantTextFromPreview = useCallback(
    (previewResult: SquadRunPreviewResult, sessionKey: string): string | null => {
      const normalizedSessionKey = sessionKey.trim();
      if (!normalizedSessionKey) return null;
      const previews = Array.isArray(previewResult.previews) ? previewResult.previews : [];
      const preview = previews.find((entry) => (entry.key?.trim() ?? "") === normalizedSessionKey);
      const items = Array.isArray(preview?.items) ? preview.items : [];
      for (let index = items.length - 1; index >= 0; index -= 1) {
        const item = items[index];
        if (!item) continue;
        const role = typeof item.role === "string" ? item.role.trim().toLowerCase() : "";
        const text = typeof item.text === "string" ? item.text.trim() : "";
        if (role === "assistant" && text) {
          return text;
        }
      }
      return null;
    },
    [],
  );

  const resolveSquadRunCompletionText = useCallback(
    async (params: { sessionKey: string; leaderGatewayAgentId: string | null }) => {
      const requestedSessionKey = params.sessionKey.trim();
      if (!requestedSessionKey) {
        return { sessionKey: "", text: null as string | null };
      }

      const candidateKeys = new Set<string>([requestedSessionKey]);
      const leaderGatewayAgentId = params.leaderGatewayAgentId?.trim() ?? "";

      const inspectSessionKey = async (candidateSessionKey: string) => {
        const history = await client.call<{ messages?: Record<string, unknown>[] }>("chat.history", {
          sessionKey: candidateSessionKey,
          limit: 80,
        });
        const messages = Array.isArray(history.messages) ? history.messages : [];
        const derived = buildHistoryLines(messages);
        const assistantText = derived.lastAssistant?.trim() ?? "";
        if (assistantText) {
          return { sessionKey: candidateSessionKey, text: assistantText };
        }

        const previewResult = await client.call<SquadRunPreviewResult>("sessions.preview", {
          keys: [candidateSessionKey],
          limit: 16,
          maxChars: 16000,
        });
        const previewText = resolveLatestAssistantTextFromPreview(previewResult, candidateSessionKey)?.trim() ?? "";
        if (previewText) {
          return { sessionKey: candidateSessionKey, text: previewText };
        }

        return { sessionKey: candidateSessionKey, text: null as string | null };
      };

      const directResult = await inspectSessionKey(requestedSessionKey);
      if (directResult.text) {
        return directResult;
      }

      if (leaderGatewayAgentId) {
        try {
          const sessionsResult = await client.call<SquadRunSessionListResult>("sessions.list", {
            agentId: leaderGatewayAgentId,
            includeGlobal: false,
            includeUnknown: true,
            limit: 16,
          });
          const sessions = Array.isArray(sessionsResult.sessions) ? sessionsResult.sessions : [];
          const requestedLower = requestedSessionKey.toLowerCase();
          const fallbackKeys = sessions
            .filter((entry) => {
              const key = entry.key?.trim() ?? "";
              if (!key) return false;
              const normalizedKey = key.toLowerCase();
              const label = entry.origin?.label?.trim().toLowerCase() ?? "";
              if (normalizedKey === requestedLower) return true;
              if (normalizedKey.includes(requestedLower)) return true;
              if (requestedLower.includes(normalizedKey)) return true;
              if (requestedLower.startsWith("hook:") && label === "hook") return true;
              return false;
            })
            .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
            .map((entry) => entry.key?.trim() ?? "")
            .filter((key) => key.length > 0);
          for (const key of fallbackKeys) {
            candidateKeys.add(key);
          }
        } catch (error) {
          console.warn("Failed to list leader sessions while resolving squad run completion.", error);
        }
      }

      for (const candidateSessionKey of candidateKeys) {
        if (candidateSessionKey === requestedSessionKey) continue;
        const result = await inspectSessionKey(candidateSessionKey);
        if (result.text) {
          return result;
        }
      }

      return { sessionKey: requestedSessionKey, text: null as string | null };
    },
    [client, resolveLatestAssistantTextFromPreview],
  );

  useFinalizedAssistantReplyListener(state.agents, ({ sessionKey, text }) => {
    const normalizedSessionKey = typeof sessionKey === "string" ? sessionKey.trim() : "";
    if (!normalizedSessionKey) return;

    const trackedRun = activeSquadRunBySessionKey.get(normalizedSessionKey);
    if (!trackedRun) return;

    const normalizedText = text.trim();
    if (!normalizedText) return;
    if ((trackedRun.outputText ?? "").trim() === normalizedText && (trackedRun.status ?? "").toLowerCase() === "completed") return;

    void mirrorSquadRunCompletion({
      taskId: trackedRun.taskId,
      runId: trackedRun.runId,
      sessionKey: normalizedSessionKey,
      text: normalizedText,
    });
  });

  useEffect(() => {
    if (!client || status !== "connected") return;
    if (activeSquadRunBySessionKey.size === 0) return;

    let cancelled = false;

    const poll = async () => {
      const entries = Array.from(activeSquadRunBySessionKey.entries());
      for (const [sessionKey, trackedRun] of entries) {
        if (cancelled) return;
        const normalizedSessionKey = sessionKey.trim();
        if (!normalizedSessionKey) continue;
        if (squadRunHistoryPollInFlightRef.current.has(normalizedSessionKey)) continue;
        if (squadRunMirrorInFlightRef.current.has(trackedRun.runId)) continue;

        squadRunHistoryPollInFlightRef.current.add(normalizedSessionKey);
        try {
          const resolved = await resolveSquadRunCompletionText({
            sessionKey: normalizedSessionKey,
            leaderGatewayAgentId: trackedRun.leaderGatewayAgentId,
          });
          if (cancelled) return;
          const normalizedText = (resolved.text ?? "").trim();
          if (!normalizedText) continue;
          if ((trackedRun.outputText ?? "").trim() === normalizedText && (trackedRun.status ?? "").toLowerCase() === "completed") continue;

          await mirrorSquadRunCompletion({
            taskId: trackedRun.taskId,
            runId: trackedRun.runId,
            sessionKey: resolved.sessionKey || normalizedSessionKey,
            text: normalizedText,
          });
        } catch (error) {
          console.warn("Failed to poll squad run history.", {
            sessionKey: normalizedSessionKey,
            error,
          });
        } finally {
          squadRunHistoryPollInFlightRef.current.delete(normalizedSessionKey);
        }
      }
    };

    void poll();
    // 8s cadence + visibility pause: squad run completion usually arrives via
    // the gateway event stream, this poll is a fallback for edge cases.
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void poll();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeSquadRunBySessionKey, client, mirrorSquadRunCompletion, resolveSquadRunCompletionText, status]);

  useEffect(() => {
    const optionHeldRef = { current: false };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Alt" || event.repeat || optionHeldRef.current) return;
      optionHeldRef.current = true;
      event.preventDefault();
      void startMainVoiceRecording();
    };
    const handleKeyUp = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Alt") return;
      optionHeldRef.current = false;
      event.preventDefault();
      stopMainVoiceRecording();
    };
    const handleWindowBlur = () => {
      optionHeldRef.current = false;
      stopMainVoiceRecording();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [startMainVoiceRecording, stopMainVoiceRecording]);

  useEffect(() => {
    if (!mainVoiceError) return;
    const timer = window.setTimeout(() => {
      clearMainVoiceError();
    }, 4000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [clearMainVoiceError, mainVoiceError]);

  // v131 — Map gateway-agentId → squad color so the 3D nameplate
  // (and any other surface that reads OfficeAgent.color) reflects the
  // SQUAD the agent belongs to instead of the agent's own brand color.
  // Falls back to the agent's deterministic stringToColor when not
  // in any squad. First squad wins on multi-squad legacy data.
  const squadColorByAgentGatewayId = useMemo(() => {
    const map = new Map<string, string>();
    for (const squad of companySquads) {
      const color = squad.color?.trim();
      if (!color) continue;
      for (const member of squad.members) {
        const slug = member.gatewayAgentId?.trim();
        if (!slug || map.has(slug)) continue;
        map.set(slug, color);
      }
    }
    return map;
  }, [companySquads]);

  // v126 — Build the squad-running-steps slice once per memo run.
  // Pulls from the currently-cached squad execution detail
  // (`squadOpsSelectedTask`) plus the squad ops list summaries; falls
  // back to an empty array when no squad data is loaded. The unified
  // working computer below uses this to keep an agent green even when
  // the WS resolver couldn't bind the session key to a local agent.
  const runningSquadSteps = useMemo(() => {
    const out: Array<{ agentId: string | number; status: string }> = [];
    const detail = squadOpsSelectedTask;
    if (detail?.runs) {
      for (const run of detail.runs) {
        // v126 fix — `SquadTaskRun.agentSlug` is the gateway slug
        // (matches the local agent registry's `agent.agentId` shape).
        // The numeric `run.agentId` is the back DB id and won't match.
        const slug = (run.agentSlug ?? "").trim();
        if (!slug) continue;
        out.push({
          agentId: slug,
          status: run.status ?? "",
        });
      }
    }
    return out;
  }, [squadOpsSelectedTask]);

  // v126 — Single source of truth for "is this agent working RIGHT NOW?".
  // Folds chat-driven runIds, the WS workingUntilByAgentId latch, and
  // the explicit squad-step cache into one Set<agentId>. The renderer
  // (and every other "should I show green?" call site) reads from
  // this set instead of its own ad-hoc rule.
  const workingAgentIds = useMemo(() => {
    return computeWorkingAgentIds(
      {
        chatAgents: state.agents,
        workingLatchByAgentId: workingUntilByAgentId,
        runningSquadSteps,
      },
      Date.now(),
    );
  }, [clockTick, state.agents, workingUntilByAgentId, runningSquadSteps]);

  const officeAgents = useMemo(() => {
    void clockTick;
    const nextCache = new Map<
      string,
      {
        agent: AgentState;
        deskHeld: boolean;
        gymHeld: boolean;
        latchedWorking: boolean;
        officeAgent: OfficeAgent;
        phoneBoothHeld: boolean;
        qaHeld: boolean;
        smsBoothHeld: boolean;
        squadColor: string | undefined; // v131 — invalidate cache when squad color changes
      }
    >();
    const nextOfficeAgents = state.agents.map((agent) => {
      // v126 — `latchedWorking` now comes from the unified Set instead
      // of querying workingUntilByAgentId directly. Same end-result
      // for chat-driven activity, but the Set ALSO includes squad/cron
      // signals that the latch alone might miss when the gateway WS
      // resolver couldn't bind the session key to a local agentId.
      const latchedWorking = workingAgentIds.has(agent.agentId);
      const deskHeld = Boolean(deskHoldByAgentId[agent.agentId]);
      const gymHeld = Boolean(gymHoldByAgentId[agent.agentId]);
      const phoneBoothHeld = Boolean(phoneBoothHoldByAgentId[agent.agentId]);
      const qaHeld = Boolean(qaHoldByAgentId[agent.agentId]);
      const smsBoothHeld = Boolean(smsBoothHoldByAgentId[agent.agentId]);
      const squadColorForAgent = squadColorByAgentGatewayId.get(agent.agentId);
      const cached = officeAgentCacheRef.current.get(agent.agentId);
      if (
        cached &&
        cached.agent === agent &&
        cached.latchedWorking === latchedWorking &&
        cached.squadColor === squadColorForAgent &&
        cached.deskHeld === deskHeld &&
        cached.gymHeld === gymHeld &&
        cached.phoneBoothHeld === phoneBoothHeld &&
        cached.qaHeld === qaHeld &&
        cached.smsBoothHeld === smsBoothHeld
      ) {
        nextCache.set(agent.agentId, cached);
        return cached.officeAgent;
      }
      const effectiveAgent: AgentState =
        latchedWorking && agent.status !== "error"
          ? {
              ...agent,
              status: "running",
              runId: agent.runId ?? `latched-${agent.agentId}`,
            }
          : (deskHeld || gymHeld || qaHeld || phoneBoothHeld || smsBoothHeld) &&
              agent.status !== "error"
            ? {
                ...agent,
                status: "running",
                runId:
                  agent.runId ??
                  (qaHeld
                    ? `qa-hold-${agent.agentId}`
                    : smsBoothHeld
                      ? `text-hold-${agent.agentId}`
                    : phoneBoothHeld
                      ? `call-hold-${agent.agentId}`
                    : gymHeld
                      ? `gym-hold-${agent.agentId}`
                      : `desk-hold-${agent.agentId}`),
              }
            : agent;
      const baseOfficeAgent = mapAgentToOffice(effectiveAgent);
      // v132 — STRICT rule for OfficeAgent.color across every surface
      // that reads it (3D nameplate stripe, HQ Overview cards, etc.):
      //   • Agent IS in a squad  → use the squad's color.
      //   • Agent is NOT in any squad → fixed neutral gray (#475569).
      //
      // v131 fell back to the agent's own deterministic stringToColor,
      // which gave each agent a different random-looking shade — the
      // operator read this as "the stripe colors are random". Strict
      // gray fallback removes any ambiguity: gray = no team, anything
      // else = the team color.
      const STRIPE_GRAY = "#475569";
      const officeAgent: OfficeAgent = {
        ...baseOfficeAgent,
        color: squadColorForAgent ?? STRIPE_GRAY,
      };
      nextCache.set(agent.agentId, {
        agent,
        deskHeld,
        gymHeld,
        latchedWorking,
        officeAgent,
        phoneBoothHeld,
        qaHeld,
        smsBoothHeld,
        squadColor: squadColorForAgent,
      });
      return officeAgent;
    });
    officeAgentCacheRef.current = nextCache;
    return nextOfficeAgents;
  }, [
    clockTick,
    deskHoldByAgentId,
    gymHoldByAgentId,
    phoneBoothHoldByAgentId,
    qaHoldByAgentId,
    smsBoothHoldByAgentId,
    squadColorByAgentGatewayId,
    state.agents,
    workingAgentIds,
  ]);
  const openClawLiveStateText = useMemo(() => {
    const lines = ["== LIVE OPENCLAW STATE =="];
    if (state.agents.length === 0) {
      lines.push("No agents loaded yet.");
      return lines.join("\n");
    }

    for (const agent of state.agents) {
      lines.push("");
      lines.push(`[${agent.agentId}] ${agent.name || "Agent"}`);
      lines.push(
        `status=${agent.status} runId=${agent.runId ?? "-"} session=${agent.sessionKey}`,
      );
      lines.push(
        `lastActivity=${agent.lastActivityAt ? formatOpenClawTimestamp(agent.lastActivityAt) : "-"} lastAssistant=${agent.lastAssistantMessageAt ? formatOpenClawTimestamp(agent.lastAssistantMessageAt) : "-"}`,
      );
      lines.push(
        `latestPreview=${formatOpenClawValue(agent.latestPreview)} lastUser=${formatOpenClawValue(agent.lastUserMessage)}`,
      );
      if (agent.thinkingTrace?.trim()) {
        lines.push("thinking>");
        lines.push(agent.thinkingTrace.trim());
      }
      if (agent.streamText?.trim()) {
        lines.push("assistant_stream>");
        lines.push(agent.streamText.trim());
      }
      const recentOutput = agent.outputLines
        .slice(-MAX_OPENCLAW_AGENT_OUTPUT_LINES)
        .map((line) => line.trimEnd())
        .filter(Boolean);
      if (recentOutput.length > 0) {
        lines.push("recent_output>");
        lines.push(...recentOutput);
      }
    }

    return lines.join("\n");
  }, [state.agents]);
  const remoteOfficeAgents = useMemo(
    () =>
      (remoteOfficeSnapshot?.agents ?? []).map((agent) =>
        mapRemotePresenceAgentToOffice(agent)
      ),
    [remoteOfficeSnapshot]
  );
  const chatRosterEntries = useMemo<ChatRosterEntry[]>(() => {
    const localEntries: ChatRosterEntry[] = state.agents.map((agent) => ({
      id: agent.agentId,
      name: agent.name || agent.agentId,
      kind: "local",
      isRunning: agent.status === "running",
    }));
    const squadEntries: ChatRosterEntry[] = companySquads
      .filter((squad) => squad.members.some((member) => member.gatewayAgentId))
      .map((squad) => ({
        id: `squad:${squad.id}`,
        name: squad.name,
        kind: "squad",
        isRunning: false,
        memberCount: squad.members.filter((member) => member.gatewayAgentId).length,
        iconEmoji: squad.iconEmoji,
        color: squad.color,
      }));
    const remoteEntries: ChatRosterEntry[] = remoteOfficeAgents.map((agent) => ({
      id: agent.id,
      name: agent.name || agent.id,
      kind: "remote",
      isRunning: agent.status === "working",
    }));
    const allEntries = [...squadEntries, ...localEntries, ...remoteEntries];

    if (chatTargetView === "agents") {
      return allEntries.filter((entry) => entry.kind === "local" || entry.kind === "remote");
    }

    if (chatTargetView === "squads") {
      return allEntries.filter((entry) => entry.kind === "squad");
    }

    return allEntries;
  }, [chatRosterMode, chatTargetView, companySquads, remoteOfficeAgents, state.agents]);
  const focusedSquadChatTarget = selectedChatAgentId && isSquadChatTargetId(selectedChatAgentId)
    ? (companySquads.find((squad) => `squad:${squad.id}` === selectedChatAgentId) ?? null)
    : null;
  const focusedSquadChatState = focusedSquadChatTarget
    ? (squadChatById[focusedSquadChatTarget.id] ?? EMPTY_REMOTE_CHAT_SESSION)
    : null;
  const focusedSquadChatEntryId = focusedSquadChatTarget ? `squad:${focusedSquadChatTarget.id}` : null;

  const focusedSquadChatTasks = focusedSquadChatTarget
    ? (() => {
        const merged = new Map<number, SquadTask>();
        for (const task of selectedSquadTasks) {
          if (String(task.squadId) === focusedSquadChatTarget.id) {
            merged.set(task.id, task);
          }
        }
        for (const task of squadChatTasksBySquadId[focusedSquadChatTarget.id] ?? []) {
          merged.set(task.id, task);
        }
        return Array.from(merged.values()).sort((left, right) => {
          const leftStarted = left.startedAtUtc ? new Date(left.startedAtUtc).getTime() : 0;
          const rightStarted = right.startedAtUtc ? new Date(right.startedAtUtc).getTime() : 0;
          return rightStarted - leftStarted || right.id - left.id;
        });
      })()
    : [];
  const activeFocusedSquadTask = focusedSquadChatTarget
    ? (() => {
        const activeTaskId = activeSquadChatTaskBySquadId[focusedSquadChatEntryId ?? ""] ?? null;
        if (typeof activeTaskId === "number") {
          return focusedSquadChatTasks.find((task) => task.id === activeTaskId) ?? null;
        }
        return focusedSquadChatTasks[0] ?? null;
      })()
    : null;

  useEffect(() => {
    if (!focusedSquadChatTarget) return;

    let cancelled = false;
    // v58 perf — delta-fetch + longer interval + pause-when-hidden.
    // Previously this fired every 3s and fanned out N + 1 GETs to the
    // backend (/SquadExecutions/by-company + /SquadExecutions/{id} per
    // task). With multiple squad chats mounted the office was making
    // ~7 requests/second which visibly choked the 3D scene and could
    // cause the gateway to drop the agent roster mid-refresh.
    const FOCUSED_POLL_MS = 15_000;
    const focusedSignatures = new Map<number, string>();
    const signatureFor = (summary: { id: number; status?: string | null; updatedDate?: string | null }) =>
      `${summary.status ?? ""}|${summary.updatedDate ?? ""}`;

    const loadFocusedSquadTasks = async (force = false) => {
      try {
        const summaries = await fetchSquadTasks({ squadId: Number(focusedSquadChatTarget.id) });
        if (cancelled) return;
        const selected = summaries.slice(0, 20);
        const stale: typeof selected = [];
        for (const entry of selected) {
          const sig = signatureFor(entry);
          const prev = focusedSignatures.get(entry.id);
          if (force || prev !== sig) stale.push(entry);
          focusedSignatures.set(entry.id, sig);
        }
        const refreshed = await Promise.all(
          stale.map(async (summary) => {
            try {
              return await fetchSquadTask(summary.id);
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        const refreshedById = new Map<number, SquadTask>();
        for (const t of refreshed) if (t) refreshedById.set(t.id, t);
        setSquadChatTasksBySquadId((current) => {
          const existing = current[focusedSquadChatTarget.id] ?? [];
          const byId = new Map(existing.map((t) => [t.id, t]));
          for (const [id, t] of refreshedById) byId.set(id, t);
          const keep = new Set(selected.map((s) => s.id));
          const next: SquadTask[] = [];
          for (const id of keep) {
            const found = byId.get(id);
            if (found) next.push(found);
          }
          return {
            ...current,
            [focusedSquadChatTarget.id]: next,
          };
        });
        setActiveSquadChatTaskBySquadId((current) => ({
          ...current,
          [focusedSquadChatEntryId ?? `squad:${focusedSquadChatTarget.id}`]:
            current[focusedSquadChatEntryId ?? `squad:${focusedSquadChatTarget.id}`] ??
            selected[0]?.id ??
            null,
        }));
      } catch {
        // best-effort hydration for squad chat task sessions
      }
    };

    void loadFocusedSquadTasks(true);
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void loadFocusedSquadTasks();
    };
    const timer = window.setInterval(tick, FOCUSED_POLL_MS);
    const onVis = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void loadFocusedSquadTasks();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
  }, [fetchSquadTask, fetchSquadTasks, focusedSquadChatEntryId, focusedSquadChatTarget]);

  useEffect(() => {
    if (!client || status !== "connected" || !focusedSquadChatTarget || !activeFocusedSquadTask) {
      return;
    }

    const latestRun = activeFocusedSquadTask.runs[0] ?? null;
    const requestedSessionKey = latestRun?.externalSessionKey?.trim() ?? "";
    if (!requestedSessionKey) {
      return;
    }

    let cancelled = false;

    const taskId = activeFocusedSquadTask.id;
    const leaderGatewayAgentId = focusedSquadChatTarget.leaderGatewayAgentId?.trim() ?? "";

    const previewToMessages = (previewResult: SquadRunPreviewResult, sessionKey: string): SquadTaskSessionMessage[] => {
      const previews = Array.isArray(previewResult.previews) ? previewResult.previews : [];
      const preview = previews.find((entry) => (entry.key?.trim() ?? "") === sessionKey);
      const items = Array.isArray(preview?.items) ? preview.items : [];
      return items
        .map((item, index) => {
          const text = typeof item.text === "string" ? item.text.trim() : "";
          if (!text) return null;
          const normalizedRole = typeof item.role === "string" ? item.role.trim().toLowerCase() : "assistant";
          const role: SquadTaskSessionMessage["role"] = normalizedRole === "user"
            ? "user"
            : normalizedRole === "system"
              ? "system"
              : "assistant";
          const rawTimestamp = item.timestamp;
          const timestampMs = typeof rawTimestamp === "number"
            ? rawTimestamp
            : typeof rawTimestamp === "string"
              ? new Date(rawTimestamp).getTime()
              : Date.now() + index;
          return {
            id: `preview:${sessionKey}:${index}`,
            role,
            text,
            timestampMs: Number.isFinite(timestampMs) ? timestampMs : Date.now() + index,
          } satisfies SquadTaskSessionMessage;
        })
        .filter((entry): entry is SquadTaskSessionMessage => Boolean(entry));
    };

    const historyToMessages = (messages: Record<string, unknown>[], sessionKey: string): SquadTaskSessionMessage[] => {
      return messages
        .map((message, index) => {
          const safeMessage = (message ?? {}) as Record<string, unknown>;
          const text = (extractText(safeMessage) ?? "").trim();
          if (!text) return null;
          const normalizedRole = typeof safeMessage.role === "string" ? safeMessage.role.trim().toLowerCase() : "assistant";
          const role: SquadTaskSessionMessage["role"] = normalizedRole === "user"
            ? "user"
            : normalizedRole === "system"
              ? "system"
              : "assistant";
          const rawTimestamp = safeMessage.timestamp ?? safeMessage.createdAt ?? safeMessage.createdDate;
          const timestampMs = typeof rawTimestamp === "number"
            ? rawTimestamp
            : typeof rawTimestamp === "string"
              ? new Date(rawTimestamp).getTime()
              : Date.now() + index;
          return {
            id: `history:${sessionKey}:${String(safeMessage.id ?? index)}`,
            role,
            text,
            timestampMs: Number.isFinite(timestampMs) ? timestampMs : Date.now() + index,
          } satisfies SquadTaskSessionMessage;
        })
        .filter((entry): entry is SquadTaskSessionMessage => Boolean(entry));
    };

    const resolveCandidateSessionKeys = async (): Promise<string[]> => {
      const keys = new Set<string>([requestedSessionKey]);
      if (!leaderGatewayAgentId) {
        return Array.from(keys);
      }

      try {
        const sessionsResult = await client.call<SquadRunSessionListResult>("sessions.list", {
          agentId: leaderGatewayAgentId,
          includeGlobal: false,
          includeUnknown: true,
          limit: 24,
        });
        const sessions = Array.isArray(sessionsResult.sessions) ? sessionsResult.sessions : [];
        const requestedLower = requestedSessionKey.toLowerCase();
        const fallbackKeys = sessions
          .filter((entry) => {
            const key = entry.key?.trim() ?? "";
            if (!key) return false;
            const normalizedKey = key.toLowerCase();
            const label = entry.origin?.label?.trim().toLowerCase() ?? "";
            if (normalizedKey === requestedLower) return true;
            if (normalizedKey.includes(requestedLower)) return true;
            if (requestedLower.includes(normalizedKey)) return true;
            if (requestedLower.startsWith("hook:") && label === "hook") return true;
            return false;
          })
          .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
          .map((entry) => entry.key?.trim() ?? "")
          .filter((value) => value.length > 0);
        for (const key of fallbackKeys) {
          keys.add(key);
        }
      } catch (error) {
        console.warn("Failed to resolve fallback squad session keys.", error);
      }

      return Array.from(keys);
    };

    const syncSession = async () => {
      setSquadTaskSessionByTaskId((current) => ({
        ...current,
        [taskId]: {
          sessionKey: current[taskId]?.sessionKey || requestedSessionKey,
          loading: true,
          error: null,
          messages: current[taskId]?.messages ?? [],
          outputLines: current[taskId]?.outputLines ?? [],
        },
      }));

      try {
        const candidateKeys = await resolveCandidateSessionKeys();
        let resolvedState: { sessionKey: string; messages: SquadTaskSessionMessage[]; outputLines: string[] } | null = null;
        let lastError: string | null = null;

        for (const candidateSessionKey of candidateKeys) {
          if (!candidateSessionKey) continue;
          try {
            const history = await client.call<{ messages?: Record<string, unknown>[] }>("chat.history", {
              sessionKey: candidateSessionKey,
              limit: 80,
            });
            const historyMessages = Array.isArray(history.messages) ? history.messages : [];
            const mappedHistoryMessages = historyToMessages(historyMessages, candidateSessionKey);
            const historyLines = buildHistoryLines(historyMessages).lines ?? [];
            if (mappedHistoryMessages.length > 0 || historyLines.length > 0) {
              resolvedState = {
                sessionKey: candidateSessionKey,
                messages: mappedHistoryMessages,
                outputLines: historyLines,
              };
              break;
            }
          } catch (error) {
            lastError = error instanceof Error ? error.message : "Failed to load squad session history.";
          }

          try {
            const preview = await client.call<SquadRunPreviewResult>("sessions.preview", {
              keys: [candidateSessionKey],
              limit: 16,
              maxChars: 20000,
            });
            const previewMessages = previewToMessages(preview, candidateSessionKey);
            if (previewMessages.length > 0) {
              resolvedState = {
                sessionKey: candidateSessionKey,
                messages: previewMessages,
                outputLines: previewMessages.flatMap((entry) => [entry.role === "assistant" ? "Assistant" : entry.role === "user" ? "You" : "System", entry.text, ""]),
              };
              break;
            }
          } catch (error) {
            lastError = error instanceof Error ? error.message : "Failed to preview squad session.";
          }
        }

        if (cancelled) return;

        setSquadTaskSessionByTaskId((current) => ({
          ...current,
          [taskId]: {
            sessionKey: resolvedState?.sessionKey || requestedSessionKey,
            loading: false,
            error: resolvedState ? null : lastError,
            messages: resolvedState?.messages ?? current[taskId]?.messages ?? [],
            outputLines: resolvedState?.outputLines ?? current[taskId]?.outputLines ?? [],
          },
        }));
      } catch (error) {
        if (cancelled) return;
        setSquadTaskSessionByTaskId((current) => ({
          ...current,
          [taskId]: {
            sessionKey: current[taskId]?.sessionKey || requestedSessionKey,
            loading: false,
            error: error instanceof Error ? error.message : "Failed to synchronize squad session.",
            messages: current[taskId]?.messages ?? [],
            outputLines: current[taskId]?.outputLines ?? [],
          },
        }));
      }
    };

    void syncSession();
    // 10s cadence + visibility pause for the focused squad session sync.
    // Events arrive on the gateway stream, this poll is a safety net.
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void syncSession();
    }, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    activeFocusedSquadTask,
    client,
    focusedSquadChatTarget,
    status,
  ]);

  const focusedSquadSessionAgent = focusedSquadChatTarget && activeFocusedSquadTask
    ? (() => {
        const latestRun = activeFocusedSquadTask.runs[0] ?? null;
        const sessionState = squadTaskSessionByTaskId[activeFocusedSquadTask.id];
        const sessionKey = sessionState?.sessionKey?.trim() || latestRun?.externalSessionKey?.trim() || "main";
        const inferredAgentId =
          latestRun?.agentSlug?.trim() ||
          parseAgentIdFromSessionKey(sessionKey) ||
          "main";
        const inferredAgentName =
          latestRun?.agentName?.trim() ||
          (inferredAgentId === "main" ? "Main" : inferredAgentId);
        const persistedOutputText =
          latestRun?.outputText?.trim() ||
          activeFocusedSquadTask.finalResponse?.trim() ||
          activeFocusedSquadTask.summary?.trim() ||
          "";
        const outputLines = sessionState?.outputLines?.length
          ? sessionState.outputLines
          : persistedOutputText
            ? persistedOutputText.split(/\r?\n/)
            : [

                `# ${activeFocusedSquadTask.title}`,
                "",
                activeFocusedSquadTask.prompt || "Opening squad task session...",
              ];
        const transcriptLines = sessionState?.messages?.length
          ? sessionState.messages.flatMap((message) => [
              message.role === "assistant"
                ? "Assistant"
                : message.role === "user"
                  ? "You"
                  : "System",
              message.text,
              "",
            ])
          : outputLines;
        const transcriptEntries = buildTranscriptEntriesFromLines({
          lines: transcriptLines,
          sessionKey,
          source: "history",
          runId: latestRun?.externalRunId ?? String(latestRun?.id ?? activeFocusedSquadTask.id),
          confirmed: true,
          entryIdPrefix: `squad-task-session:${activeFocusedSquadTask.id}`,
        });
        const now = Date.now();
        const assistantMessages = sessionState?.messages?.filter((entry) => entry.role === "assistant") ?? [];
        const lastAssistantMessageAt = assistantMessages.at(-1)?.timestampMs ?? now;
        const loading = sessionState?.loading ?? false;
        const error = sessionState?.error?.trim() ?? "";
        const hasAssistantContent = assistantMessages.length > 0 || outputLines.some((line) => line.trim().length > 0);
        const effectiveStatus: AgentState["status"] = error
          ? "error"
          : loading && !hasAssistantContent
            ? "running"
            : "idle";
        return {
          agentId: inferredAgentId,
          name: inferredAgentName,
          sessionKey,
          avatarSeed: inferredAgentName,
          avatarProfile: null,
          avatarUrl: null,
          model: activeFocusedSquadTask.preferredModel || "anthropic/claude-sonnet-4-6",
          thinkingLevel: null,
          sessionExecHost: "gateway",
          sessionExecSecurity: "allowlist",
          sessionExecAsk: "on-miss",
          toolCallingEnabled: true,
          showThinkingTraces: true,
          status: effectiveStatus,
          sessionCreated: true,
          awaitingUserInput: false,
          hasUnseenActivity: false,
          outputLines,
          lastResult: null,
          lastDiff: null,
          runId: latestRun?.externalRunId ?? String(latestRun?.id ?? activeFocusedSquadTask.id),
          runStartedAt: null,
          streamText: null,
          thinkingTrace: null,
          latestOverride: null,
          latestOverrideKind: null,
          lastAssistantMessageAt,
          lastActivityAt: lastAssistantMessageAt,
          latestPreview: null,
          lastUserMessage: error || null,
          draft: "",
          queuedMessages: [],
          sessionSettingsSynced: true,
          historyLoadedAt: now,
          historyFetchLimit: 80,
          historyFetchedCount: transcriptEntries.length,
          historyMaybeTruncated: false,
          transcriptEntries,
          transcriptRevision: transcriptEntries.length,
          transcriptSequenceCounter: transcriptEntries.length,
          sessionEpoch: 0,
          lastHistoryRequestRevision: transcriptEntries.length,
          lastAppliedHistoryRequestId: null,
        } satisfies AgentState;
      })()
    : null;

  const focusedRemoteChatTarget = selectedChatAgentId
    ? (remoteOfficeAgents.find((agent) => agent.id === selectedChatAgentId) ?? null)
    : null;
  const focusedRemoteChatState = focusedRemoteChatTarget
    ? (remoteChatByAgentId[focusedRemoteChatTarget.id] ?? EMPTY_REMOTE_CHAT_SESSION)
    : null;
  const allVisibleAgents = useMemo(
    () => [...officeAgents, ...remoteOfficeAgents],
    [officeAgents, remoteOfficeAgents],
  );
  const remoteOfficeVisible =
    remoteOfficeEnabled &&
    (remoteOfficeSourceKind === "presence_endpoint"
      ? remoteOfficePresenceUrl.trim().length > 0
      : remoteOfficeGatewayUrl.trim().length > 0);
  const remoteOfficeStatusText = !remoteOfficeVisible
    ? "Remote office disabled."
    : remoteOfficeError
      ? remoteOfficeError
      : !remoteOfficeLoaded
        ? "Loading remote office."
        : remoteOfficeAgents.length > 0
          ? `${remoteOfficeAgents.length} agents visible.`
          : remoteOfficeSourceKind === "openclaw_gateway"
            ? "Connected to remote gateway. No agents visible yet."
          : remoteOfficeTokenConfigured
            ? "Connected. No agents visible yet."
            : "No agents visible yet.";
  const remoteMessagingAvailable =
    remoteOfficeSourceKind === "openclaw_gateway" &&
    remoteOfficeGatewayUrl.trim().length > 0;
  const remoteMessagingDisabledReason = remoteMessagingAvailable
    ? null
    : remoteOfficeSourceKind !== "openclaw_gateway"
      ? "Remote messaging currently works only with the remote gateway source."
      : remoteOfficeGatewayUrl.trim().length === 0
      ? "Remote messaging requires a remote gateway URL in office settings."
      : "Remote messaging is unavailable until the remote gateway is configured.";
  const normalizedOpenClawConsoleSearch = openClawConsoleSearch
    .trim()
    .toLowerCase();
  const filteredOpenClawLogEntries = useMemo(() => {
    if (!normalizedOpenClawConsoleSearch) return openClawLogEntries;
    return openClawLogEntries.filter((entry) =>
      [
        entry.timestamp,
        entry.eventName,
        entry.eventKind,
        entry.summary,
        entry.role ?? "",
        entry.messageText ?? "",
        entry.thinkingText ?? "",
        entry.streamText ?? "",
        entry.toolText ?? "",
        entry.payloadText,
      ]
        .join("\n")
        .toLowerCase()
        .includes(normalizedOpenClawConsoleSearch),
    );
  }, [normalizedOpenClawConsoleSearch, openClawLogEntries]);
  const openClawLiveStateMatchesSearch = useMemo(() => {
    if (!normalizedOpenClawConsoleSearch) return true;
    return openClawLiveStateText
      .toLowerCase()
      .includes(normalizedOpenClawConsoleSearch);
  }, [normalizedOpenClawConsoleSearch, openClawLiveStateText]);
  const openClawConsoleExportJson = useMemo(
    () =>
      safeJsonStringify({
        exportedAt: new Date().toISOString(),
        searchQuery: openClawConsoleSearch,
        visibleEventCount: filteredOpenClawLogEntries.length,
        totalEventCount: openClawLogEntries.length,
        liveStateMatchesSearch: openClawLiveStateMatchesSearch,
        liveStateText: openClawLiveStateText,
        events: filteredOpenClawLogEntries,
      }),
    [
      filteredOpenClawLogEntries,
      openClawConsoleSearch,
      openClawLiveStateMatchesSearch,
      openClawLiveStateText,
      openClawLogEntries.length,
    ],
  );

  const handleClearOpenClawConsole = useCallback(() => {
    setOpenClawLogEntries([]);
  }, []);
  const handleCopyOpenClawConsoleJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(openClawConsoleExportJson);
      setOpenClawConsoleCopyStatus("copied");
      window.setTimeout(() => {
        setOpenClawConsoleCopyStatus("idle");
      }, 1800);
    } catch (error) {
      console.error("Failed to copy OpenClaw console JSON.", error);
      setOpenClawConsoleCopyStatus("error");
      window.setTimeout(() => {
        setOpenClawConsoleCopyStatus("idle");
      }, 1800);
    }
  }, [openClawConsoleExportJson]);
  const handleDownloadOpenClawConsoleJson = useCallback(() => {
    const blob = new Blob([openClawConsoleExportJson], {
      type: "application/json;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `openclaw-events-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }, [openClawConsoleExportJson]);

  const monitorByAgentId = useMemo(
    () => {
      const nextCache = new Map<
        string,
        { agent: AgentState; monitor: OfficeDeskMonitor }
      >();
      const nextMonitorByAgentId: Record<string, OfficeDeskMonitor> = {};

      for (const agent of state.agents) {
        const cached = deskMonitorCacheRef.current.get(agent.agentId);
        if (cached && cached.agent === agent) {
          nextCache.set(agent.agentId, cached);
          nextMonitorByAgentId[agent.agentId] = cached.monitor;
          continue;
        }

        const monitor = buildOfficeDeskMonitor(agent);
        const entry = { agent, monitor };
        nextCache.set(agent.agentId, entry);
        nextMonitorByAgentId[agent.agentId] = monitor;
      }

      deskMonitorCacheRef.current = nextCache;
      return nextMonitorByAgentId;
    },
    [state.agents],
  );
  const githubSkill = useMemo<SkillStatusEntry | null>(
    () =>
      marketplace.skillsReport?.skills.find((skill) => {
        const normalizedKey = skill.skillKey.trim().toLowerCase();
        const normalizedName = skill.name.trim().toLowerCase();
        return normalizedKey === "github" || normalizedName === "github";
      }) ?? null,
    [marketplace.skillsReport],
  );
  const soundclawSkill = useMemo<SkillStatusEntry | null>(
    () =>
      marketplace.skillsReport?.skills.find((skill) => {
        const normalizedKey = skill.skillKey.trim().toLowerCase();
        const normalizedName = skill.name.trim().toLowerCase();
        return normalizedKey === "soundclaw" || normalizedName === "soundclaw";
      }) ?? null,
    [marketplace.skillsReport],
  );
  const soundclawReady = useMemo(
    () => (soundclawSkill ? deriveSkillReadinessState(soundclawSkill) === "ready" : false),
    [soundclawSkill]
  );

  useEffect(() => {
    if (!soundclawReady || !jukeboxToken) {
      return;
    }

    const pending = pendingJukeboxCommandTimeoutsRef.current;
    const activeAgentIds = new Set<string>();

    for (const agent of state.agents) {
      if (skillTriggers.movementTargetByAgentId[agent.agentId] !== "jukebox") {
        continue;
      }

      const request = getLatestUserRequestForAgent(agent);
      if (!request) {
        continue;
      }

      activeAgentIds.add(agent.agentId);
      const handledKey = handledJukeboxRequestKeyByAgentIdRef.current[agent.agentId];
      if (handledKey === request.requestKey) {
        continue;
      }

      const existing = pending.get(agent.agentId);
      if (existing?.requestKey === request.requestKey) {
        continue;
      }
      if (existing) {
        window.clearTimeout(existing.timeoutId);
        pending.delete(agent.agentId);
      }

      const timeoutId = window.setTimeout(() => {
        void executeBrowserJukeboxCommand(request.text).then((result) => {
          if (result.ok) {
            handledJukeboxRequestKeyByAgentIdRef.current[agent.agentId] = request.requestKey;
            setJukeboxOpen(true);
            dispatch({
              type: "appendOutput",
              agentId: agent.agentId,
              line: result.reply,
              transcript: {
                role: "assistant",
                kind: "assistant",
                source: "legacy",
                sessionKey: agent.sessionKey,
                timestampMs: Date.now(),
                confirmed: true,
              },
            });
            dispatch({
              type: "updateAgent",
              agentId: agent.agentId,
              patch: {
                latestOverride: result.reply,
                latestOverrideKind: null,
                latestPreview: result.reply,
                lastAssistantMessageAt: Date.now(),
              },
            });
          }
          const latest = pendingJukeboxCommandTimeoutsRef.current.get(agent.agentId);
          if (latest?.timeoutId === timeoutId) {
            pendingJukeboxCommandTimeoutsRef.current.delete(agent.agentId);
          }
        });
      }, 1400);

      pending.set(agent.agentId, {
        requestKey: request.requestKey,
        timeoutId,
      });
    }

    for (const [agentId, pendingEntry] of pending.entries()) {
      if (activeAgentIds.has(agentId)) continue;
      window.clearTimeout(pendingEntry.timeoutId);
      pending.delete(agentId);
    }
  }, [
    jukeboxToken,
    skillTriggers.movementTargetByAgentId,
    soundclawReady,
    state.agents,
  ]);

  // No longer force-close the jukebox panel when skill is disabled;
  // the panel handles the disabled state itself.

  if (
    !agentsLoaded &&
    (!connectPromptReady ||
      (gatewayUrl.trim().length > 0 &&
        !shouldPromptForConnect &&
        (!didAttemptGatewayConnect || status === "connecting")))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-500" />
          <div className="h-1 w-32 overflow-hidden rounded-full bg-white/5">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-cyan-500/50 to-cyan-500" />
          </div>
        </div>
      </div>
    );
  }

  if (
    connectPromptReady &&
    status === "disconnected" &&
    !agentsLoaded &&
    (shouldPromptForConnect || didAttemptGatewayConnect)
  ) {
    return (
      <main className="min-h-screen bg-black px-4 py-10">
        <GatewayConnectScreen
          gatewayUrl={gatewayUrl}
          token={token}
          localGatewayDefaults={localGatewayDefaults}
          status={status}
          error={gatewayError}
          showApprovalHint={didAttemptGatewayConnect}
          onGatewayUrlChange={setGatewayUrl}
          onTokenChange={setToken}
          onUseLocalDefaults={useLocalGatewayDefaults}
          onConnect={() => void connect()}
        />
      </main>
    );
  }

  const runningCount = state.agents.filter(
    (agent) =>
      agent.status === "running" ||
      deskHoldByAgentId[agent.agentId] ||
      gymHoldByAgentId[agent.agentId] ||
      jukeboxHoldByAgentId[agent.agentId] ||
      phoneBoothHoldByAgentId[agent.agentId] ||
      smsBoothHoldByAgentId[agent.agentId] ||
      qaHoldByAgentId[agent.agentId],
  ).length;
  const unseenInboxCount = state.agents.filter(
    (agent) => agent.hasUnseenActivity,
  ).length;
  const companyScopedAgentCount = Array.isArray(companyScopedAgentIds)
    ? companyScopedAgentIds.length
    : null;
  const hasScopedFleetExpectation =
    companyScopedAgentCount !== null && companyScopedAgentCount > 0;
  const showEmptyFleetBanner =
    status === "connected" &&
    agentsLoaded &&
    state.agents.length === 0 &&
    !!state.error?.trim() ||
    (status === "connected" &&
      agentsLoaded &&
      state.agents.length === 0 &&
      hasScopedFleetExpectation);
  const emptyFleetMessage =
    state.error?.trim() ||
    `Connected to the gateway, but ${companyScopedAgentCount === 1 ? "1 expected agent was" : `${companyScopedAgentCount ?? 0} expected agents were`} not loaded into the office yet.`;

  return (
    <main className="h-full w-full overflow-hidden bg-black">
      <section className="relative h-full min-h-0 min-w-0 overflow-hidden">
        <RetroOffice3D
          agents={allVisibleAgents}
          companyId={companyId}
          workspaceId={workspaceId}
          initialFurniture={initialOfficeFurniture}
          animationState={officeAnimationState}
          deskAssignmentByDeskUid={deskAssignmentByDeskUid}
          ambientCues={ambientScript.cues}
          meetingForcedAgentIds={meetingForcedAgentIds}
          githubReviewAgentId={githubReviewAgentId}
          qaTestingAgentId={qaTestingAgentId}
          phoneBoothAgentId={activePhoneBoothAgentId}
          phoneCallScenario={activePhoneCallScenario}
          smsBoothAgentId={activeSmsBoothAgentId}
          textMessageScenario={activeTextMessageScenario}
          monitorAgentId={monitorAgentId}
          monitorByAgentId={monitorByAgentId}
          githubSkill={githubSkill}
          soundclawEnabled={soundclawReady}
          officeTitle={effectiveOfficeTitle}
          officeTitleLoaded={officeTitleLoaded}
          remoteOfficeEnabled={remoteOfficeEnabled}
          remoteOfficeSourceKind={remoteOfficeSourceKind}
          remoteOfficeLabel={remoteOfficeLabel}
          remoteOfficePresenceUrl={remoteOfficePresenceUrl}
          remoteOfficeGatewayUrl={remoteOfficeGatewayUrl}
          remoteOfficeStatusText={remoteOfficeStatusText}
          remoteLayoutSnapshot={remoteOfficeLayoutSnapshot}
          remoteOfficeTokenConfigured={remoteOfficeTokenConfigured}
          voiceRepliesEnabled={voiceRepliesEnabled}
          voiceRepliesVoiceId={voiceRepliesVoiceId}
          voiceRepliesSpeed={voiceRepliesSpeed}
          voiceRepliesLoaded={voiceRepliesLoaded}
          onOfficeTitleChange={setOfficeTitle}
          onRemoteOfficeEnabledChange={setRemoteOfficeEnabled}
          onRemoteOfficeSourceKindChange={setRemoteOfficeSourceKind}
          onRemoteOfficeLabelChange={setRemoteOfficeLabel}
          onRemoteOfficePresenceUrlChange={setRemoteOfficePresenceUrl}
          onRemoteOfficeGatewayUrlChange={setRemoteOfficeGatewayUrl}
          onRemoteOfficeTokenChange={setRemoteOfficeToken}
          onVoiceRepliesToggle={setVoiceRepliesEnabled}
          onVoiceRepliesVoiceChange={setVoiceRepliesVoiceId}
          onVoiceRepliesSpeedChange={setVoiceRepliesSpeed}
          onVoiceRepliesPreview={(voiceId, voiceName) => {
            void previewVoiceReply({
              text: `Hi, how can I help you? My name is ${voiceName}.`,
              provider: voiceRepliesPreference.provider,
              voiceId,
              speed: voiceRepliesSpeed,
            });
          }}
          atmAnalytics={{
            client,
            status,
            agents: state.agents,
            gatewayUrl,
            settingsCoordinator,
          }}
          onGatewayDisconnect={disconnect}
          onOpenOnboarding={handleOpenOnboarding}
          feedEvents={feedEvents}
          gatewayStatus={status}
          runCountByAgentId={runCountByAgentId}
          lastSeenByAgentId={lastSeenByAgentId}
          standupMeeting={standupController.meeting}
          standupAutoOpenBoard={standupController.openBoardByDefault}
          onStandupArrivalsChange={(arrivedAgentIds) => {
            void standupController.reportArrivals(arrivedAgentIds);
          }}
          onStandupStartRequested={() => {
            if (
              !standupController.meeting ||
              standupController.meeting.phase === "complete"
            ) {
              void standupController.startMeeting("manual");
            }
          }}
          onMonitorSelect={(agentId) => {
            setMonitorAgentId(agentId);
            if (agentId && !isRemoteOfficeAgentId(agentId)) {
              setSelectedChatAgentId(agentId);
              dispatch({ type: "selectAgent", agentId });
            }
          }}
          onAgentChatSelect={(agentId) => {
            dispatch({ type: "selectAgent", agentId });
            openAgentEditor(agentId, "IDENTITY.md");
          }}
          squads={companySquads}
          onSquadOps={(squadId) => {
            handleOpenSquadOps(squadId);
          }}
          // v111 — opens the rich edit/delete modal from the small
          // pencil button on each squad card. The big card area still
          // routes to Squad Ops above, so the existing primary gesture
          // is preserved and the new editor lives one click away.
          onSquadEditRequest={(squadId) => {
            handleOpenSquadEditor(squadId);
          }}
          onAddAgent={handleOpenCreateModal}
          onAgentEdit={(agentId) => {
            openAgentEditor(agentId, "avatar");
          }}
          onOpenAgentSkills={(agentId) => {
            const resolvedAgentId = (agentId ?? selectedChatAgentId ?? state.selectedAgentId ?? "").trim();
            if (resolvedAgentId) {
              dispatch({ type: "selectAgent", agentId: resolvedAgentId });
            }
            setMarketplaceOpen(true);
          }}
          onAgentDelete={(agentId) => {
            void handleDeleteAgent(agentId);
          }}
          onDeskAssignmentChange={handleDeskAssignmentChange}
          onDeskAssignmentsReset={handleDeskAssignmentsReset}
          onGithubReviewDismiss={() => {
            handleGithubReviewDismiss();
          }}
          onQaLabDismiss={() => {
            handleQaDismiss();
          }}
          onPhoneCallSpeak={handlePhoneCallSpeak}
          onPhoneCallComplete={handlePhoneCallComplete}
          onTextMessageComplete={handleTextMessageComplete}
          onTextMessageClose={handleTextMessageClose}
          onTextMessageDismiss={handleTextMessageClose}
          onOpenGithubSkillSetup={() => {
            setMarketplaceOpen(true);
          }}
          onJukeboxInteract={() => {
            setJukeboxOpen(true);
          }}
          profileButtonActive={profileModalOpen}
          onOpenProfile={() => {
            setProfileModalOpen(true);
          }}
          // v118 — Tools button lives right next to the avatar profile
          // button in the same view-controls toolbar group. Single click
          // opens the unified Email + Meta config modal.
          toolsButtonActive={userToolsModalOpen}
          onOpenTools={() => {
            setUserToolsInitialTab("email");
            setUserToolsModalOpen(true);
          }}
          onLogout={() => {
            router.push("/logout");
          }}
        />

        {leadOpsModalOpen ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,rgba(40,70,80,0.22),rgba(2,9,11,0.96)_62%)]"
            aria-hidden="true"
          />
        ) : null}

        {jukeboxOpen ? (
          soundclawReady ? (
            <JukeboxPanel
              client={client}
              onClose={() => setJukeboxOpen(false)}
              selectedAgentName={focusedChatAgent?.name ?? null}
            />
          ) : (
            <JukeboxDisabledPanel
              onClose={() => setJukeboxOpen(false)}
              onInstall={() => {
                setJukeboxOpen(false);
                setMarketplaceOpen(true);
              }}
            />
          )
        ) : null}
      </section>

      {showEmptyFleetBanner ? (
        <div className="pointer-events-none fixed left-1/2 top-16 z-40 w-full max-w-xl -translate-x-1/2 px-4">
          <div className="pointer-events-auto rounded-lg border border-amber-400/35 bg-black/80 px-4 py-3 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-200/80">
                  Office fleet status
                </p>
                <p className="mt-1 text-sm text-amber-50">{emptyFleetMessage}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="ui-btn-secondary px-3 py-2 text-xs font-semibold tracking-[0.05em] text-foreground"
                  onClick={() => {
                    handleOpenCreateModal();
                  }}
                >
                  Add Agent
                </button>
                <button
                  type="button"
                  className="ui-btn-secondary px-3 py-2 text-xs font-semibold tracking-[0.05em] text-foreground"
                  onClick={() => {
                    void loadAgents({ forceSettings: true });
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteAgentStatusLine ? (
        <div className="pointer-events-none fixed left-1/2 top-5 z-40 -translate-x-1/2 px-4">
          <div className="pointer-events-auto rounded-lg border border-red-400/30 bg-black/85 px-4 py-3 shadow-2xl backdrop-blur">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-red-200/75">
              Fleet mutation
            </div>
            <div className="mt-1 text-sm text-red-50">{deleteAgentStatusLine}</div>
          </div>
        </div>
      ) : null}

      {hqModalOpen ? (
        <div className="pointer-events-auto fixed inset-0 z-40 overflow-y-auto bg-black/72 p-3 backdrop-blur-sm md:p-4" onClick={() => setHqModalOpen(false)}>
          <section
            className="mx-auto my-4 flex h-[min(92vh,940px)] min-h-[620px] w-[min(1240px,96vw)] flex-col overflow-hidden rounded-[28px] border border-cyan-500/20 bg-[#02090b]/96 shadow-[0_30px_120px_rgba(0,0,0,0.65)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-4 border-b border-cyan-500/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">Operations HQ</div>
                <div className="mt-1 text-sm text-white/55">Inbox, history, active jobs and automation controls in one centered workspace.</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-400/40 hover:text-cyan-100"
                >
                  Add Agent
                </button>
                <button
                  type="button"
                  onClick={() => setHqModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/65 transition hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 border-b border-cyan-500/10 bg-[#041015]/70">
              {(["inbox", "history", "playbooks"] as const).map((tab) => {
                const isActive = activeSidebarTab === tab;
                const showBadge = tab === "inbox" && unseenInboxCount > 0;
                const label = tab === "inbox" ? "Inbox" : tab === "history" ? "History" : "Jobs";

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSidebarTab(tab)}
                    className={`flex items-center justify-center gap-2 border-r border-cyan-500/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition last:border-r-0 ${
                      isActive
                        ? "bg-cyan-500/12 text-cyan-50"
                        : "text-white/45 hover:bg-white/5 hover:text-white/80"
                    }`}
                  >
                    <span>{label}</span>
                    {showBadge ? (
                      <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-300">
                        {unseenInboxCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {activeSidebarTab === "inbox" ? (
                <InboxPanel
                  agents={state.agents}
                  onSelectAgent={(agentId) => {
                    handleOpenAgentChat(agentId);
                    setActiveSidebarTab("inbox");
                    setHqModalOpen(false);
                  }}
                />
              ) : activeSidebarTab === "history" ? (
                <HistoryPanel
                  runs={runLog}
                  agents={state.agents}
                  onSelectAgent={(agentId) => {
                    handleOpenAgentChat(agentId);
                    setActiveSidebarTab("history");
                    setHqModalOpen(false);
                  }}
                />
              ) : (
                <PlaybooksPanel
                  client={client}
                  status={status}
                  agents={state.agents}
                  standup={standupController}
                />
              )}
            </div>
          </section>
        </div>
      ) : null}

      <SkillsMarketplaceModal
        open={marketplaceOpen}
        marketplace={marketplace}
        onClose={() => setMarketplaceOpen(false)}
        onSelectAgent={(agentId) => {
          handleOpenAgentChat(agentId);
          setMarketplaceOpen(false);
        }}
        onOpenAgentSettings={(agentId) => {
          handleOpenAgentChat(agentId);
          setMarketplaceOpen(false);
          router.push("/office");
        }}
      />

      <LeadOpsModal
        open={leadOpsModalOpen}
        companyId={companyId}
        companyName={companyName}
        agents={state.agents}
        onSelectAgent={handleOpenAgentChat}
        onClose={() => setLeadOpsModalOpen(false)}
        onLeadGenerationStarted={(info) =>
          ambientScript.pushLeadScout({
            jobId: info.jobId,
            targetLeadCount: info.targetLeadCount,
            label: info.label,
          })
        }
        onEmailBatchStarted={(info) =>
          ambientScript.pushMailRunner({
            batchId: info.batchId,
            emailsToSend: info.emailsToSend,
            label: info.label,
          })
        }
      />


      {/* Onboarding wizard modal disabled by request.
      {showOnboardingWizard ? (
        <OnboardingWizard
          gatewayConnected={status === "connected"}
          agentCount={state.agents.length}
          gatewayUrl={gatewayUrl}
          token={token}
          onGatewayUrlChange={setGatewayUrl}
          onTokenChange={setToken}
          onConnect={() => {
            void connect();
          }}
          onComplete={handleCompleteOnboarding}
          connectionError={gatewayError}
          connecting={status === "connecting"}
        />
      ) : null}
      */}

      {/* v93 — OpenClaw console button hidden per product polish pass.
          The console modal itself is preserved below in case `showOpenClawConsole`
          is flipped on for debugging. */}
      {false && showOpenClawConsole ? (
        <>
          <button
            type="button"
            onClick={() => setOpenClawConsoleModalOpen(true)}
            className="pointer-events-auto fixed bottom-3 left-3 z-30 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-black/72 text-cyan-100 shadow-xl backdrop-blur transition-colors hover:border-cyan-400/45 hover:text-white"
            aria-label="Open OpenClaw console"
            title="Open OpenClaw console"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h16v14H4z" />
              <path d="m8 10 2 2-2 2" />
              <path d="M13 14h3" />
            </svg>
          </button>
          {openClawConsoleModalOpen ? (
            <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm" onClick={() => setOpenClawConsoleModalOpen(false)}>
              <section className="flex h-[min(78vh,720px)] w-[min(960px,96vw)] flex-col overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#02090b]/96 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between gap-3 border-b border-cyan-500/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200/75">
                  <div className="flex items-center gap-3">
                    <span>OpenClaw Console</span>
                    <span className="text-[10px] text-cyan-100/40">{state.agents.length} agents · {filteredOpenClawLogEntries.length}/{openClawLogEntries.length} events</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { void handleCopyOpenClawConsoleJson(); }} className="rounded border border-cyan-500/20 px-2 py-1 text-[9px] text-cyan-100/65 transition-colors hover:border-cyan-400/45 hover:text-cyan-50">{openClawConsoleCopyStatus === "copied" ? "Copied" : openClawConsoleCopyStatus === "error" ? "Copy Failed" : "Copy JSON"}</button>
                    <button type="button" onClick={handleDownloadOpenClawConsoleJson} className="rounded border border-cyan-500/20 px-2 py-1 text-[9px] text-cyan-100/65 transition-colors hover:border-cyan-400/45 hover:text-cyan-50">Download JSON</button>
                    <button type="button" onClick={handleClearOpenClawConsole} className="rounded border border-cyan-500/20 px-2 py-1 text-[9px] text-cyan-100/65 transition-colors hover:border-cyan-400/45 hover:text-cyan-50">Clear</button>
                    <button type="button" onClick={() => setOpenClawConsoleModalOpen(false)} className="rounded border border-cyan-500/20 px-2 py-1 text-[9px] text-cyan-100/65 transition-colors hover:border-cyan-400/45 hover:text-cyan-50">Close</button>
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#02090b]/96 px-4 py-3 font-mono text-[10px] leading-4">
                  <div className="rounded border border-cyan-500/10 bg-cyan-950/10 p-2">
                    <div className="flex items-center gap-2">
                      <input type="text" value={openClawConsoleSearch} onChange={(event) => setOpenClawConsoleSearch(event.target.value)} placeholder="Search logs, payloads, thinking, user text." className="min-w-0 flex-1 rounded border border-cyan-500/20 bg-black/35 px-2 py-1 text-[10px] normal-case tracking-normal text-cyan-50 placeholder:text-cyan-100/30 focus:border-cyan-400/40 focus:outline-none" />
                      {openClawConsoleSearch ? <button type="button" onClick={() => setOpenClawConsoleSearch("")} className="rounded border border-cyan-500/20 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-cyan-100/70 transition-colors hover:border-cyan-400/45 hover:text-cyan-50">Reset</button> : null}
                    </div>
                  </div>
                  {openClawLiveStateMatchesSearch ? (
                    <div className="rounded border border-cyan-500/10 bg-cyan-950/10 p-2">
                      <div className="mb-1 text-[9px] uppercase tracking-[0.16em] text-cyan-300/70">Live OpenClaw State</div>
                      <pre className="whitespace-pre-wrap break-words text-cyan-100/80">{renderOpenClawHighlightedText(openClawLiveStateText, openClawConsoleSearch)}</pre>
                    </div>
                  ) : (
                    <div className="rounded border border-cyan-500/10 bg-cyan-950/10 p-2 text-cyan-100/45">Live OpenClaw state does not match the current search.</div>
                  )}
                  <div className="text-[9px] uppercase tracking-[0.16em] text-cyan-300/70">Raw OpenClaw Gateway Events</div>
                  {filteredOpenClawLogEntries.length === 0 ? (
                    <div className="rounded border border-cyan-500/10 bg-cyan-950/10 p-2 text-cyan-100/45">{openClawLogEntries.length === 0 ? "No OpenClaw gateway events received yet." : "No OpenClaw events match the current search."}</div>
                  ) : (
                    filteredOpenClawLogEntries.map((entry) => {
                      const isUserMessage = entry.role === "user";
                      return (
                        <div key={entry.id} className={`rounded border p-2 ${isUserMessage ? "border-amber-400/30 bg-amber-950/12" : "border-cyan-500/12 bg-cyan-950/8"}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className={`text-[9px] uppercase tracking-[0.16em] ${isUserMessage ? "text-amber-300/85" : "text-cyan-300/75"}`}>{renderOpenClawHighlightedText(`[${entry.timestamp}] ${entry.eventName} / ${entry.eventKind}`, openClawConsoleSearch)}</div>
                            {entry.role ? <span className={`rounded px-1.5 py-0.5 text-[9px] uppercase ${isUserMessage ? "bg-amber-400/15 text-amber-200" : "bg-cyan-400/10 text-cyan-200/80"}`}>{entry.role}</span> : null}
                          </div>
                          <div className="mt-1 whitespace-pre-wrap break-words text-cyan-100/55">{renderOpenClawHighlightedText(entry.summary, openClawConsoleSearch)}</div>
                          {entry.messageText ? <div className="mt-2 rounded border border-amber-400/20 bg-amber-950/25 px-2 py-1 text-amber-100"><div className="text-[9px] uppercase tracking-[0.16em] text-amber-300/75">User / Message Text</div><div className="mt-1 whitespace-pre-wrap break-words">{renderOpenClawHighlightedText(entry.messageText, openClawConsoleSearch)}</div></div> : null}
                          {entry.thinkingText ? <div className="mt-2 rounded border border-fuchsia-400/15 bg-fuchsia-950/15 px-2 py-1 text-fuchsia-100/90"><div className="text-[9px] uppercase tracking-[0.16em] text-fuchsia-300/70">Thinking</div><div className="mt-1 whitespace-pre-wrap break-words">{renderOpenClawHighlightedText(entry.thinkingText, openClawConsoleSearch)}</div></div> : null}
                          {entry.streamText ? <div className="mt-2 rounded border border-cyan-400/15 bg-cyan-950/18 px-2 py-1 text-cyan-50/90"><div className="text-[9px] uppercase tracking-[0.16em] text-cyan-300/70">Stream</div><div className="mt-1 whitespace-pre-wrap break-words">{renderOpenClawHighlightedText(entry.streamText, openClawConsoleSearch)}</div></div> : null}
                          {entry.toolText ? <div className="mt-2 rounded border border-violet-400/15 bg-violet-950/15 px-2 py-1 text-violet-100/90"><div className="text-[9px] uppercase tracking-[0.16em] text-violet-300/70">Tool Output</div><div className="mt-1 whitespace-pre-wrap break-words">{renderOpenClawHighlightedText(entry.toolText, openClawConsoleSearch)}</div></div> : null}
                          <details className="mt-2"><summary className="cursor-pointer text-[9px] uppercase tracking-[0.16em] text-cyan-300/55">Raw Payload</summary><pre className="mt-1 whitespace-pre-wrap break-words text-cyan-100/45">{renderOpenClawHighlightedText(entry.payloadText, openClawConsoleSearch)}</pre></details>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </>
      ) : null}

      <div
        className={`fixed bottom-3 right-3 z-30 flex flex-col items-end gap-2 ${debugEnabled ? "hidden" : ""}`}
      >
        {chatOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
            <div
              className="absolute inset-0"
              onClick={() => setChatOpen(false)}
              aria-hidden="true"
            />

            {/* v99 — chat modal widened from 1180px to 1480px and the
                agents/squads rail trimmed from w-64 (256px) to w-56
                (224px) so the chat takes more of the screen. The modal
                now scales to ~92vw on smaller windows so it never feels
                cramped. */}
            <div
              className="relative z-10 flex max-h-[92vh] w-full max-w-[1480px] overflow-hidden rounded-2xl border border-amber-700/30 bg-[#0b0703] shadow-[0_30px_120px_rgba(0,0,0,0.65)]"
              style={{ height: "min(840px, calc(100vh - 48px))", width: "min(1480px, 92vw)" }}
            >
              <div className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-black/20">
                <div className="border-b border-white/10 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
                        Agents & Squads
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-white/35">
                        {chatRosterEntries.length} visible in chat
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setChatOpen(false)}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 transition hover:bg-white/10 hover:text-white"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {([
                      ["agents", "Agents"],
                      ["squads", "Squads"],
                      ["all", "All"],
                    ] as const).map(([value, label]) => {
                      const active = chatTargetView === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setChatTargetView(value)}
                          className={`rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
                            active
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
                              : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {chatRosterEntries.length === 0 ? (
                    <div className="px-4 py-4 font-mono text-[11px] text-white/30">
                      No chat targets in this view.
                    </div>
                  ) : (
                    chatRosterEntries.map((agent) => {
                      const isSelected = agent.id === selectedChatAgentId;
                      const isRunning = agent.isRunning;
                      const squadTasksForEntry =
                        agent.kind === "squad" && focusedSquadChatEntryId === agent.id
                          ? focusedSquadChatTasks
                          : [];
                      const activeSquadTaskId =
                        agent.kind === "squad" ? activeSquadChatTaskBySquadId[agent.id] ?? squadTasksForEntry[0]?.id ?? null : null;

                      return (
                        <div key={agent.id} className="border-b border-white/5 last:border-b-0">
                          <button
                            type="button"
                            onClick={() => handleOpenAgentChat(agent.id)}
                            className={`flex w-full items-center gap-2 px-4 py-3 text-left transition-colors ${
                              isSelected
                                ? "bg-white/10 text-white"
                                : "text-white/50 hover:bg-white/5 hover:text-white/80"
                            }`}
                          >
                            {agent.kind === "squad" && agent.iconEmoji ? (
                              <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px]"
                                style={{ backgroundColor: `${agent.color || "#3b82f6"}20` }}
                              >
                                {agent.iconEmoji}
                              </span>
                            ) : (
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                  isRunning ? "bg-emerald-400" : "bg-white/20"
                                }`}
                              />
                            )}
                            <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                              {agent.name}
                            </span>

                            {agent.kind === "remote" ? (
                              <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-300/60">
                                Remote
                              </span>
                            ) : agent.kind === "squad" ? (
                              <span
                                className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]"
                                style={{ color: agent.color || "#f59e0b", backgroundColor: `${agent.color || "#f59e0b"}15` }}
                              >
                                {typeof agent.memberCount === "number" ? `${agent.memberCount}` : ""}
                              </span>
                            ) : null}

                            <span className="sr-only">
                              {agent.kind === "remote" ? "Remote agent" : agent.kind === "squad" ? "Squad" : "Local agent"}
                            </span>
                          </button>

                          {agent.kind === "squad" && isSelected && squadTasksForEntry.length > 0 ? (
                            <div className="space-y-1 px-3 pb-3 pt-2">
                              <div className="px-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
                                Tasks
                              </div>
                              {squadTasksForEntry.map((task) => {
                                const isTaskSelected = activeSquadTaskId === task.id;
                                const taskStatusTone = task.status === "failed"
                                  ? "text-rose-300"
                                  : task.status === "done"
                                    ? "text-emerald-300"
                                    : task.status === "running"
                                      ? "text-cyan-300"
                                      : "text-white/50";
                                return (
                                  <button
                                    key={`${agent.id}:task:${task.id}`}
                                    type="button"
                                    onClick={() => {
                                      setActiveSquadChatTaskBySquadId((current) => ({
                                        ...current,
                                        [agent.id]: task.id,
                                      }));
                                    }}
                                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                                      isTaskSelected
                                        ? "border-cyan-400/40 bg-cyan-400/10 text-white"
                                        : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.05]"
                                    }`}
                                  >
                                    <div className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                                      {task.title || `Task ${task.id}`}
                                    </div>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                      <span className={`font-mono text-[9px] uppercase tracking-[0.14em] ${taskStatusTone}`}>
                                        {task.status}
                                      </span>
                                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
                                        {task.runs.length} runs
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                {/* v128 — Chat bar gets a SUBTLE color accent + clearer
                    icon when focused on a squad. The whole bar carries
                    the squad's brand color: a 1px top border line, a
                    very faint background tint, and the icon/name in the
                    same hue. The operator can scan across multiple chat
                    windows and immediately know which squad they're in
                    without reading the name.
                    For solo agent chat, no color tint — the bar stays
                    neutral so the squad treatment really stands out. */}
                {(() => {
                  const squadAccent = focusedSquadChatTarget?.color?.trim() || null;
                  return (
                    <div
                      className="relative flex items-center justify-between border-b border-white/10 px-5 py-3"
                      style={
                        squadAccent
                          ? { backgroundColor: `${squadAccent}08` }
                          : undefined
                      }
                    >
                      {/* Top accent hairline in squad color (~1px). */}
                      {squadAccent ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-0 top-0 h-px"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${squadAccent}cc, transparent)`,
                          }}
                        />
                      ) : null}
                      <div className="min-w-0 flex items-center gap-3">
                        {focusedSquadChatTarget?.iconEmoji && (
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                            style={{
                              backgroundColor: `${squadAccent ?? "#3b82f6"}1a`,
                              border: `1.5px solid ${squadAccent ?? "#3b82f6"}55`,
                              boxShadow: `0 0 0 1px ${squadAccent ?? "#3b82f6"}10 inset`,
                            }}
                          >
                            {focusedSquadChatTarget.iconEmoji}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div
                            className="truncate font-mono text-[12px] font-semibold uppercase tracking-[0.16em]"
                            style={{
                              color: squadAccent
                                ? `${squadAccent}e6`
                                : "rgba(255,255,255,0.55)",
                            }}
                          >
                            {focusedSquadChatTarget ? "Squad" : "Conversation"}
                          </div>
                          <div className="mt-1 truncate font-mono text-[11px] text-white/55">
                            {focusedSquadChatTarget
                              ? focusedSquadChatTarget.name
                              : (focusedChatAgent?.name ??
                                focusedRemoteChatTarget?.name ??
                                "Select an agent or squad to start chatting")}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {focusedSquadChatTarget ? (
                          <button
                            type="button"
                            onClick={() => handleOpenSquadOps(focusedSquadChatTarget.id)}
                            className="rounded-md border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition"
                            style={{
                              borderColor: `${squadAccent ?? "#3b82f6"}55`,
                              backgroundColor: `${squadAccent ?? "#3b82f6"}1a`,
                              color: squadAccent ?? "#a5f3fc",
                            }}
                          >
                            Squad ops
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setChatOpen(false)}
                          className="rounded-md border border-amber-700/40 bg-amber-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300 transition hover:bg-amber-500/15 hover:text-amber-200"
                        >
                          Hide chat
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div className="min-h-0 flex-1">
                  {focusedChatAgent ? (
                    <AgentChatPanel
                      agent={focusedChatAgent}
                      isSelected={false}
                      canSend={status === "connected"}
                      models={gatewayModels}
                      stopBusy={
                        chatController.stopBusyAgentId === focusedChatAgent.agentId
                      }
                      onLoadMoreHistory={() =>
                        loadMoreAgentHistory(focusedChatAgent.agentId)
                      }
                      onOpenSettings={() => {
                        router.push("/office");
                      }}
                      onNewSession={() =>
                        chatController.handleNewSession(focusedChatAgent.agentId)
                      }
                      onModelChange={(value) =>
                        dispatch({
                          type: "updateAgent",
                          agentId: focusedChatAgent.agentId,
                          patch: { model: value ?? undefined },
                        })
                      }
                      onThinkingChange={(value) =>
                        dispatch({
                          type: "updateAgent",
                          agentId: focusedChatAgent.agentId,
                          patch: { thinkingLevel: value ?? undefined },
                        })
                      }
                      onDraftChange={(value) =>
                        chatController.handleDraftChange(
                          focusedChatAgent.agentId,
                          value,
                        )
                      }
                      onSend={(payload) => {
                        void handleChatSend(
                          focusedChatAgent.agentId,
                          focusedChatAgent.sessionKey,
                          payload,
                        );
                      }}
                      onRemoveQueuedMessage={(index) =>
                        chatController.removeQueuedMessage(
                          focusedChatAgent.agentId,
                          index,
                        )
                      }
                      onStopRun={() => {
                        void chatController.handleStopRun(
                          focusedChatAgent.agentId,
                          focusedChatAgent.sessionKey,
                        );
                      }}
                      onAvatarShuffle={() =>
                        openAgentEditor(focusedChatAgent.agentId, "avatar")
                      }
                      onVoiceSend={handleVoiceSend}
                      leadContextLabel={pendingLeadContextLabel}
                      onClearLeadContext={() => {
                        pendingLeadChatContextRef.current = null;
                        setPendingLeadContextLabel(null);
                      }}
                      composerToolbarExtra={
                        !isSquadChatTargetId(focusedChatAgent.agentId) && companyId ? (
                          <button
                            type="button"
                            onClick={() => {
                              void openLeadChatContext(leadChatContextTab);
                            }}
                            className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-2 font-mono text-[11px] font-medium tracking-[0.02em] text-cyan-200 transition hover:bg-cyan-500/20"
                            aria-label="Use leads or a full generation in chat"
                            title="Use leads or a full generation in chat"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {leadChatContextLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                              <span>Leads</span>
                            </span>
                          </button>
                        ) : null
                      }
                    />
                  ) : focusedSquadChatTarget ? (
                    // v90 — render the SquadChatPanel which renders one
                    // bubble per run (Step N · Author · text), exactly like
                    // the squad ops modal. The previous AgentChatPanel
                    // approach mirrored a synthetic agent's session and only
                    // showed the squad's final response.
                    <SquadChatPanel
                      squad={focusedSquadChatTarget}
                      activeTaskId={activeFocusedSquadTask?.id ?? null}
                      activeSessionKey={activeFocusedSquadTask?.sessionKey ?? null}
                      taskCache={focusedSquadChatTasks}
                      onTaskFocusChange={(taskId) => {
                        if (!focusedSquadChatEntryId) return;
                        setActiveSquadChatTaskBySquadId((current) => ({
                          ...current,
                          [focusedSquadChatEntryId]: taskId ?? null,
                        }));
                      }}
                      onOpenOps={(squadId) => handleOpenSquadOps(squadId)}
                      agentAvatars={squadAgentAvatarLookup}
                    />
                  ) : focusedRemoteChatTarget && focusedRemoteChatState ? (
                    <RemoteAgentChatPanel
                      agentName={focusedRemoteChatTarget.name}
                      canSend={remoteMessagingAvailable}
                      sending={focusedRemoteChatState.sending}
                      draft={focusedRemoteChatState.draft}
                      error={focusedRemoteChatState.error}
                      messages={focusedRemoteChatState.messages}
                      disabledReason={remoteMessagingDisabledReason}
                      onDraftChange={(value) => {
                        updateRemoteChatSession(focusedRemoteChatTarget.id, (session) => ({
                          ...session,
                          draft: value,
                          error: null,
                        }));
                      }}
                      onSend={(message) => {
                        void handleChatSend(focusedRemoteChatTarget.id, "", { text: message });
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-mono text-[12px] text-white/30">
                      Select an agent or squad to chat.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* v93 — HQ button hidden per product polish pass. Uncomment to bring it back.
        <button
          type="button"
          onClick={() => setHqModalOpen((current) => !current)}
          className={`flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11px] font-medium tracking-wider shadow-lg backdrop-blur transition-colors ${hqModalOpen ? "border-amber-300/55 bg-amber-500/14 text-amber-50" : "border-amber-500/35 bg-[#120c04]/92 text-amber-200 hover:border-amber-400/55 hover:text-amber-50"}`}
        >
          {hqModalOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <PanelsTopLeft className="h-3.5 w-3.5" />}
          <span>{hqModalOpen ? "CLOSE HQ" : "OPEN HQ"}</span>
        </button>
        */}

        <button
          type="button"
          onClick={() => setLeadOpsModalOpen((current) => !current)}
          className={`flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11px] font-medium tracking-wider shadow-lg backdrop-blur transition-colors ${leadOpsModalOpen ? "border-cyan-300/55 bg-cyan-500/14 text-cyan-50" : "border-cyan-500/35 bg-[#041015]/92 text-cyan-200 hover:border-cyan-400/55 hover:text-cyan-50"}`}
        >
          {leadOpsModalOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <Radar className="h-3.5 w-3.5" />}
          <span>{leadOpsModalOpen ? "HIDE LEADS" : "LEADS"}</span>
        </button>

        <button
          type="button"
          disabled={companySquads.length === 0}
          onClick={() => {
            const preferredSquadId =
              focusedSquadChatTarget?.id?.replace(/^squad:/, "") ??
              (selectedChatAgentId && isSquadChatTargetId(selectedChatAgentId)
                ? selectedChatAgentId.replace(/^squad:/, "")
                : companySquads[0]?.id ?? null);
            if (!preferredSquadId) {
              return;
            }
            handleOpenSquadOps(preferredSquadId);
          }}
          className="flex items-center gap-1.5 rounded border border-violet-500/35 bg-[#0a0715]/92 px-3 py-1.5 font-mono text-[11px] font-medium tracking-wider text-violet-200 shadow-lg backdrop-blur transition-colors hover:border-violet-400/55 hover:text-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Users2 className="h-3.5 w-3.5" />
          <span>SQUADS</span>
          {companySquads.length > 0 ? (
            <span className="rounded bg-violet-500/20 px-1 text-[10px] text-violet-300">{companySquads.length}</span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setCronJobsModalOpen((current) => !current)}
          className={`flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11px] font-medium tracking-wider shadow-lg backdrop-blur transition-colors ${cronJobsModalOpen ? "border-amber-300/55 bg-amber-500/14 text-amber-50" : "border-amber-500/35 bg-[#120c04]/92 text-amber-200 hover:border-amber-400/55 hover:text-amber-50"}`}
        >
          {cronJobsModalOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
          <span>{cronJobsModalOpen ? "CLOSE CRON" : "CRON JOBS"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (chatOpen) {
              setChatOpen(false);
              return;
            }
            const preferredTargetId = selectedChatAgentId ?? state.selectedAgentId ?? (companySquads[0] ? `squad:${companySquads[0].id}` : null);
            if (preferredTargetId && !selectedChatAgentId) {
              setSelectedChatAgentId(preferredTargetId);
            }
  if (!selectedChatAgentId) {
  setChatTargetView(isSquadChatTargetId(preferredTargetId) ? "squads" : "agents");
  }
            setChatOpen(true);
          }}
          className="flex items-center gap-1.5 rounded border border-amber-700/50 bg-[#0e0a04]/90 px-3 py-1.5 font-mono text-[11px] font-medium tracking-wider text-amber-500/80 shadow-lg backdrop-blur transition-colors hover:border-amber-600/70 hover:text-amber-400"
        >
          {chatOpen ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>HIDE CHAT</span>
            </>
          ) : (
            <>
              <MessageSquare className="h-3.5 w-3.5" />
              <span>OPEN CHAT</span>
              {runningCount > 0 ? (
                <span className="rounded bg-amber-500/20 px-1 text-[10px] text-amber-400">
                  {runningCount}
                </span>
              ) : null}
            </>
          )}
        </button>
      </div>

      {mainVoiceState !== "idle" || mainVoiceError ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
          <div
            className={`flex min-w-[220px] items-center gap-3 rounded-full border px-4 py-3 font-mono text-[12px] shadow-2xl backdrop-blur ${
              mainVoiceError
                ? "border-red-500/45 bg-red-950/75 text-red-100"
                : "border-cyan-400/35 bg-black/70 text-white"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                mainVoiceState === "recording"
                  ? "bg-red-500/25 text-red-200"
                  : mainVoiceState === "transcribing"
                    ? "bg-cyan-400/20 text-cyan-100"
                    : "bg-white/10 text-white"
              }`}
            >
              <Mic className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/55">
                Main agent
              </span>
              <span className="text-[12px] font-medium text-white">
                {mainVoiceError
                  ? mainVoiceError
                  : mainVoiceState === "recording"
                    ? "Listening. Release Option to send."
                    : mainVoiceState === "transcribing"
                      ? "Transcribing your voice note."
                      : mainVoiceState === "requesting"
                        ? "Requesting microphone access."
                        : !mainVoiceSupported
                          ? "Voice shortcuts are not supported in this browser."
                          : "Voice shortcut ready."}
              </span>
            </div>
          </div>
        </div>
      ) : null}


      <CompanyProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onLogout={() => {
          setProfileModalOpen(false);
          router.push("/logout");
        }}
        fullName={userFullName}
        email={userEmail}
        role={userRole}
        companyName={companyName}
        workspaceName={workspaceName}
        companyId={companyId}
        userId={userId}
      />

      {/* v118 — unified Tools modal (Email + Meta IG/FB/WhatsApp) with
          horizontal tabs. Replaces UserEmailConfigModal (v115) and
          UserMetaAccountModal (v117). Triggered from the Tools button in
          the toolbar slot next to the avatar profile button. */}
      <UserToolsModal
        open={userToolsModalOpen}
        onClose={() => setUserToolsModalOpen(false)}
        initialTab={userToolsInitialTab}
      />

      {debugEnabled ? (
        <section className="fixed bottom-3 right-3 z-50 max-h-[45vh] w-[560px] overflow-auto rounded border border-slate-700 bg-black/90 p-3 font-mono text-[11px] text-slate-100">
          <div className="mb-2 font-semibold text-cyan-300">office debug</div>
          <div className="mb-2 text-slate-400">
            status: {status} | agents: {state.agents.length}
          </div>
          {debugRows.length === 0 ? (
            <div className="text-slate-500">No debug data yet.</div>
          ) : (
            <div className="space-y-2">
              {debugRows.map((row) => (
                <div
                  key={row.agentId}
                  className="rounded border border-slate-800 p-2"
                >
                  <div className="text-cyan-200">
                    {row.name} ({row.agentId})
                  </div>
                  <div>
                    storeStatus={row.storeStatus} runId={row.runId ?? "null"}{" "}
                    inferredRunning=
                    {String(row.inferredRunning)}
                  </div>
                  <div>
                    lastRole={row.lastRole} messages={row.messageCount}
                  </div>
                  <div className="truncate text-slate-400">
                    detectedSession={row.detectedSessionKey || "-"}
                  </div>
                  <div className="truncate text-slate-400">
                    lastText={row.lastText || "-"}
                  </div>
                  <div className="truncate text-slate-500">
                    sessions={row.inspectedSessions || "-"}
                  </div>
                  <div className="text-slate-500">
                    source={row.inferenceSource}
                  </div>
                  <div className="text-slate-500">at={row.at}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
      <LeadChatContextModal
        open={leadChatContextOpen}
        initialTab={leadChatContextTab}
        loading={leadChatContextLoading}
        error={leadChatContextError}
        jobs={leadChatJobs}
        leads={leadChatLeads}
        busyKey={leadChatBusyKey}
        agentName={focusedChatAgent?.name ?? null}
        onClose={() => setLeadChatContextOpen(false)}
        onUseJob={(jobId) => {
          void handlePrimeLeadContextFromChat({ type: "job", id: jobId });
        }}
        onUseLead={(leadId) => {
          void handlePrimeLeadContextFromChat({ type: "lead", id: leadId });
        }}
        onRefresh={() => {
          void loadLeadChatContext();
        }}
      />

      {agentEditorAgent ? (
        <AgentEditorModal
          key={`${agentEditorAgent.agentId}:${agentEditorInitialSection}`}
          open
          client={client}
          agents={state.agents}
          agent={agentEditorAgent}
          initialSection={agentEditorInitialSection}
          onClose={() => {
            setAgentEditorAgentId(null);
          }}
          onAvatarSave={handleAvatarProfileSave}
          onRename={async (agentId, name) => {
            if (!client) return false;
            try {
              await renameGatewayAgent({ client, agentId, name });
              dispatch({ type: "updateAgent", agentId, patch: { name } });
              return true;
            } catch {
              return false;
            }
          }}
          onDelete={async (agentId) => {
            await handleDeleteAgent(agentId);
          }}
          onNavigateAgent={(agentId, section) => {
            openAgentEditor(agentId, section);
          }}
        />
      ) : null}
      <CreateTargetModal
        open={createTargetModalOpen}
        onClose={() => setCreateTargetModalOpen(false)}
        onCreateAgent={handleOpenCreateAgentWizard}
        onCreateSquad={handleOpenCreateSquadModal}
      />
      <SquadCreateModal
        open={createSquadModalOpen}
        busy={createSquadBusy}
        error={createSquadError}
        agents={createSquadCatalog?.agents ?? []}
        workspaces={createSquadCatalog?.workspaces ?? []}
        preferredAgentId={state.selectedAgentId}
        // v128/v129 — only show agents NOT yet in any squad. Set is
        // memoised below so its identity is stable across parent
        // re-renders; passing a fresh Set per render in v128 was
        // re-triggering the modal's reset useEffect on every parent
        // tick (which reshuffled color/icon and reset the squad name).
        excludedAgentIds={excludedAgentIdsForCreate}
        onClose={() => {
          setCreateSquadModalOpen(false);
          setCreateSquadError(null);
          setCreateSquadCatalog(null);
        }}
        onSubmit={(payload) => {
          void handleCreateSquad(payload);
        }}
      />
      {/* v111 — Squad rename / cascade-delete modal. Floats above
          SquadOps (z-170 vs z-160) so the operator can pop it up
          even from the ops view if needed. */}
      <SquadEditDeleteModal
        open={squadEditorSquadId !== null}
        squad={activeSquadEditorSquad}
        onSave={handleSaveSquadFromEditor}
        onConfirmDelete={handleDeleteSquadFromEditor}
        onClose={handleCloseSquadEditor}
      />
      <SquadOpsModal
        open={squadOpsModalOpen}
        squads={companySquads}
        squad={activeSquadOpsSquad}
        selectedSquadId={squadOpsSquadId}
        tasks={squadOpsTasks}
        selectedTask={squadOpsSelectedTask}
        loading={squadOpsLoading}
        refreshingTask={squadOpsRefreshingTask}
        createBusy={squadOpsCreateBusy}
        dispatchBusy={squadOpsDispatchBusy}
        dispatchEstimate={squadOpsDispatchEstimate}
        dispatchEstimateBusy={squadOpsDispatchEstimateBusy}
        dispatchApprovalMode={squadOpsDispatchApprovalMode}
        error={squadOpsError}
        hooksConfigured={squadOpsRuntimeStatus?.hooksConfigured === true}
        availableModels={gatewayModels}
        hooksMessage={
          squadOpsRuntimeStatus
            ? squadOpsRuntimeStatus.hooksConfigured
              ? "OpenClaw hooks are configured. You can dispatch runs to squad sub-agents."
              : "OpenClaw hooks are not configured for this backend yet. Set a dedicated hooks token in the gateway and expose Okestria runtime hook settings in the service before dispatching squad runs."
            : null
        }
        onClose={() => {
          setSquadOpsModalOpen(false);
          setSquadOpsError(null);
          setSquadOpsDispatchEstimate(null);
          setSquadOpsDispatchApprovalMode(null);
        }}
        onRefresh={() => {
          void loadSquadOpsRuntimeStatus();
          if (squadOpsSquadId) {
            void loadSquadOpsTasks(squadOpsSquadId, squadOpsSelectedTask?.id ?? null);
          }
        }}
        onSelectSquad={(squadId) => {
          handleOpenSquadOps(squadId);
        }}
        onSelectTask={(taskId) => {
          void handleSelectSquadTask(taskId);
        }}
        onCreateTask={(payload) => {
          void handleCreateSquadTask(payload);
        }}
        onPreviewDispatchTask={(taskId, mode) => {
          void handlePreviewDispatchSquadTask(taskId, mode);
        }}
        onConfirmDispatchTask={(taskId, mode) => {
          void handleConfirmDispatchSquadTask(taskId, mode);
        }}
        onCancelDispatchApproval={handleCancelSquadTaskDispatchApproval}
        onDeleteTask={(taskId) => {
          void handleDeleteSquadTask(taskId);
        }}
        onEditSquad={handleEditSquad}
        onDeleteSquad={handleDeleteSquad}
      />

      <CronJobsModal
        open={cronJobsModalOpen}
        companyId={companyId ?? null}
        agents={cronAgentOptions}
        squads={cronSquadOptions}
        onClose={() => setCronJobsModalOpen(false)}
        gatewayClient={client}
        gatewayConnected={status === "connected"}
      />

      {/* v104 — confirmação de delete agent (mostra prévia da cascata). */}
      {renderAgentDeleteConfirmModal()}

      <AgentCreateWizardModal
        key={createAgentWizardNonce}
        open={createAgentWizardOpen}
        suggestedName={`Agent ${state.agents.length + 1}`}
        busy={createAgentBusy}
        submitError={createAgentModalError}
        statusLine={createAgentStatusLine}
        onClose={handleCloseCreateAgentWizard}
        onCreateAgent={handleCreateAgentFromIdentity}
        onFinishWizard={handleFinishCreateAgentAvatar}
      />

      {hasConnectedOnce && status === "disconnected" ? (
        <div className="fixed bottom-6 right-6 z-[96] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl border border-amber-400/25 bg-[#0b0f14]/94 p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/12 text-amber-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.33 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">Gateway desconectado</div>
              <div className="mt-1 text-xs leading-5 text-white/65">
                A conexao com o gateway foi perdida. O sistema vai tentar reconectar automaticamente.
              </div>
              {gatewayError ? (
                <div className="mt-2 line-clamp-3 rounded-lg border border-white/8 bg-white/5 px-2.5 py-2 font-mono text-[11px] text-amber-100/75">
                  {gatewayError}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void connect()}
              className="flex-1 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Reconectar agora
            </button>
            <button
              type="button"
              onClick={() => setShowGatewayErrorModal(true)}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white"
            >
              Detalhes
            </button>
          </div>
        </div>
      ) : null}

      {/* Gateway Disconnection Error Modal */}
      {showGatewayErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-red-500/30 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Gateway Desconectado</h2>
            </div>

            <p className="mb-2 text-sm text-gray-300">
              A conexao com o gateway foi perdida.
            </p>

            {gatewayError && (
              <div className="mb-4 rounded-lg bg-red-500/10 p-3 font-mono text-xs text-red-300">
                {gatewayError}
              </div>
            )}

            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="font-medium text-gray-300">URL:</span>
                <code className="rounded bg-gray-800 px-2 py-0.5 text-xs text-cyan-300">
                  {gatewayUrl}
                </code>
              </div>
              {token && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="font-medium text-gray-300">Token:</span>
                  <code className="rounded bg-gray-800 px-2 py-0.5 text-xs text-green-300">
                    {token.slice(0, 12)}...
                  </code>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowGatewayErrorModal(false);
                  void connect();
                }}
                className="flex-1 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
              >
                Reconectar
              </button>
              <button
                type="button"
                onClick={() => setShowGatewayErrorModal(false)}
                className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
