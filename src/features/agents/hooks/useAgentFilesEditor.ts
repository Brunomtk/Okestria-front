"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AgentState } from "@/features/agents/state/store";
import type { GatewayClient } from "@/lib/gateway/GatewayClient";
import { readGatewayAgentFile, writeGatewayAgentFile } from "@/lib/gateway/agentFiles";
import {
  AGENT_FILE_NAMES,
  type AgentFileName,
  createAgentFilesState,
  isAgentFileName,
} from "@/lib/agents/agentFiles";

type AgentFilesState = ReturnType<typeof createAgentFilesState>;

export type UseAgentFilesEditorResult = {
  activeGatewayAgentId: string | null;
  agentFiles: AgentFilesState;
  agentFilesLoading: boolean;
  agentFilesSaving: boolean;
  agentFilesDirty: boolean;
  agentFilesError: string | null;
  setAgentFileContent: (name: AgentFileName, value: string) => void;
  saveAgentFiles: () => Promise<boolean>;
  discardAgentFileChanges: () => void;
};

type AgentsListResult = {
  agents?: Array<{
    id?: string;
    name?: string;
    identity?: {
      name?: string;
    };
  }>;
};

const slugifyGatewayCandidate = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isUnknownAgentIdError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.toLowerCase().includes("unknown agent id");
};

export const useAgentFilesEditor = (params: {
  client: GatewayClient | null | undefined;
  agentId: string | null | undefined;
  selectedAgent?: AgentState | null;
  agents?: AgentState[];
}): UseAgentFilesEditorResult => {
  const { client, agentId, selectedAgent, agents = [] } = params;
  const [agentFiles, setAgentFiles] = useState(createAgentFilesState);
  const [agentFilesLoading, setAgentFilesLoading] = useState(false);
  const [agentFilesSaving, setAgentFilesSaving] = useState(false);
  const [agentFilesDirty, setAgentFilesDirty] = useState(false);
  const [agentFilesError, setAgentFilesError] = useState<string | null>(null);
  const [resolvedGatewayAgentId, setResolvedGatewayAgentId] = useState<string | null>(null);
  const savedAgentFilesRef = useRef<AgentFilesState>(createAgentFilesState());
  const candidateAgentIds = useMemo(() => {
    const candidates = new Set<string>();
    const push = (value: string | null | undefined) => {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (trimmed) candidates.add(trimmed);
    };
    push(agentId);
    push(selectedAgent?.agentId);
    if (selectedAgent?.name) {
      push(slugifyGatewayCandidate(selectedAgent.name));
    }
    for (const entry of agents) {
      if (selectedAgent?.name && entry.name.trim().toLowerCase() === selectedAgent.name.trim().toLowerCase()) {
        push(entry.agentId);
      }
    }
    return [...candidates];
  }, [agentId, agents, selectedAgent]);

  const resolveWorkingGatewayAgentId = useCallback(async () => {
    const directAgentId = resolvedGatewayAgentId?.trim() || agentId?.trim() || selectedAgent?.agentId?.trim() || "";
    if (!client) {
      throw new Error("Gateway client is not available.");
    }
    if (directAgentId) {
      return directAgentId;
    }
    const byNameSlug = selectedAgent?.name ? slugifyGatewayCandidate(selectedAgent.name) : "";
    if (byNameSlug) {
      return byNameSlug;
    }
    throw new Error("Agent ID is missing for this agent.");
  }, [agentId, client, resolvedGatewayAgentId, selectedAgent]);

  const recoverGatewayAgentId = useCallback(async () => {
    if (!client) return null;
    try {
      const response = (await client.call("agents.list", {})) as AgentsListResult;
      const gatewayAgents = Array.isArray(response?.agents) ? response.agents : [];
      const selectedName = selectedAgent?.name?.trim().toLowerCase() ?? "";
      const byId = gatewayAgents.find((entry) => {
        const id = typeof entry.id === "string" ? entry.id.trim() : "";
        return id.length > 0 && candidateAgentIds.includes(id);
      });
      const byName = gatewayAgents.find((entry) => {
        const values = [entry.name, entry.identity?.name]
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim().toLowerCase())
          .filter((value) => value.length > 0);
        return selectedName.length > 0 && values.includes(selectedName);
      });
      const bySlug = gatewayAgents.find((entry) => {
        const id = typeof entry.id === "string" ? entry.id.trim() : "";
        if (!id) return false;
        const names = [entry.name, entry.identity?.name]
          .filter((value): value is string => typeof value === "string")
          .map((value) => slugifyGatewayCandidate(value));
        return candidateAgentIds.includes(id) || names.some((value) => candidateAgentIds.includes(value));
      });
      const match = byId ?? byName ?? bySlug ?? null;
      const resolved = typeof match?.id === "string" ? match.id.trim() : "";
      if (!resolved) return null;
      setResolvedGatewayAgentId(resolved);
      return resolved;
    } catch {
      return null;
    }
  }, [candidateAgentIds, client, selectedAgent]);

  const cloneAgentFilesState = useCallback((source: AgentFilesState): AgentFilesState => {
    const next = createAgentFilesState();
    for (const name of AGENT_FILE_NAMES) {
      next[name] = { ...source[name] };
    }
    return next;
  }, []);

  const loadAgentFiles = useCallback(async () => {
    setAgentFilesLoading(true);
    setAgentFilesError(null);

    try {
      let trimmedAgentId = await resolveWorkingGatewayAgentId().catch(() => "");
      if (!trimmedAgentId) {
        const emptyState = createAgentFilesState();
        savedAgentFilesRef.current = emptyState;
        setAgentFiles(emptyState);
        setAgentFilesDirty(false);
        setAgentFilesError("Agent ID is missing for this agent.");
        return;
      }

      if (!client) {
        setAgentFilesError("Gateway client is not available.");
        return;
      }

      let results;
      try {
        results = await Promise.all(
          AGENT_FILE_NAMES.map(async (name) => {
            const file = await readGatewayAgentFile({ client, agentId: trimmedAgentId, name });
            return { name, content: file.content, exists: file.exists };
          })
        );
      } catch (error) {
        if (!isUnknownAgentIdError(error)) {
          throw error;
        }
        const recoveredAgentId = await recoverGatewayAgentId();
        if (!recoveredAgentId) {
          throw new Error("This agent is not available in the connected gateway anymore. Refresh the office roster and try again.");
        }
        trimmedAgentId = recoveredAgentId;
        results = await Promise.all(
          AGENT_FILE_NAMES.map(async (name) => {
            const file = await readGatewayAgentFile({ client, agentId: trimmedAgentId, name });
            return { name, content: file.content, exists: file.exists };
          })
        );
      }

      const nextState = createAgentFilesState();
      for (const file of results) {
        if (!isAgentFileName(file.name)) continue;
        nextState[file.name] = {
          content: file.content ?? "",
          exists: Boolean(file.exists),
        };
      }

      savedAgentFilesRef.current = nextState;
      setAgentFiles(nextState);
      setAgentFilesDirty(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load agent files.";
      setAgentFilesError(message);
    } finally {
      setAgentFilesLoading(false);
    }
  }, [agentId, client, recoverGatewayAgentId, resolveWorkingGatewayAgentId]);

  const saveAgentFiles = useCallback(async () => {
    setAgentFilesSaving(true);
    setAgentFilesError(null);

    try {
      let trimmedAgentId = await resolveWorkingGatewayAgentId().catch(() => "");
      if (!trimmedAgentId) {
        setAgentFilesError("Agent ID is missing for this agent.");
        return false;
      }

      if (!client) {
        setAgentFilesError("Gateway client is not available.");
        return false;
      }

      try {
        await Promise.all(
          AGENT_FILE_NAMES.map(async (name) => {
            await writeGatewayAgentFile({
              client,
              agentId: trimmedAgentId,
              name,
              content: agentFiles[name].content,
            });
          })
        );
      } catch (error) {
        if (!isUnknownAgentIdError(error)) {
          throw error;
        }
        const recoveredAgentId = await recoverGatewayAgentId();
        if (!recoveredAgentId) {
          throw new Error("This agent is not available in the connected gateway anymore. Refresh the office roster and try again.");
        }
        trimmedAgentId = recoveredAgentId;
        await Promise.all(
          AGENT_FILE_NAMES.map(async (name) => {
            await writeGatewayAgentFile({
              client,
              agentId: trimmedAgentId,
              name,
              content: agentFiles[name].content,
            });
          })
        );
      }

      const nextState = createAgentFilesState();
      for (const name of AGENT_FILE_NAMES) {
        nextState[name] = {
          content: agentFiles[name].content,
          exists: true,
        };
      }

      savedAgentFilesRef.current = nextState;
      setAgentFiles(nextState);
      setAgentFilesDirty(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save agent files.";
      setAgentFilesError(message);
      return false;
    } finally {
      setAgentFilesSaving(false);
    }
  }, [agentFiles, agentId, client, recoverGatewayAgentId, resolveWorkingGatewayAgentId]);

  const setAgentFileContent = useCallback((name: AgentFileName, value: string) => {
    if (!isAgentFileName(name)) return;

    setAgentFiles((prev) => ({
      ...prev,
      [name]: { ...prev[name], content: value },
    }));
    setAgentFilesDirty(true);
  }, []);

  const discardAgentFileChanges = useCallback(() => {
    setAgentFiles(cloneAgentFilesState(savedAgentFilesRef.current));
    setAgentFilesDirty(false);
    setAgentFilesError(null);
  }, [cloneAgentFilesState]);

  useEffect(() => {
    setResolvedGatewayAgentId(null);
  }, [agentId, selectedAgent?.name]);

  useEffect(() => {
    void loadAgentFiles();
  }, [loadAgentFiles]);

  return {
    activeGatewayAgentId: resolvedGatewayAgentId?.trim() || agentId?.trim() || selectedAgent?.agentId?.trim() || null,
    agentFiles,
    agentFilesLoading,
    agentFilesSaving,
    agentFilesDirty,
    agentFilesError,
    setAgentFileContent,
    saveAgentFiles,
    discardAgentFileChanges,
  };
};
