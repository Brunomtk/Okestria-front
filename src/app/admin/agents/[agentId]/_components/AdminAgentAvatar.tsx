"use client";

/**
 * v148 — Admin · Agent avatar preview wrapper.
 *
 * Tiny client island that renders the SAME 3D figure used in the
 * office (sidebar rows, chat panel, agent editor) inside the admin
 * detail page. Keeping a thin wrapper here means the server page
 * stays a server component and just hands a serialized profile +
 * fallback seed across the boundary.
 */

import { useMemo } from "react";
import { AgentAvatarPreview3D } from "@/features/agents/components/AgentAvatarPreview3D";
import {
  normalizeAgentAvatarProfile,
  type AgentAvatarProfile,
} from "@/lib/avatars/profile";

export function AdminAgentAvatar({
  avatarProfileJson,
  fallbackSeed,
  className = "",
}: {
  avatarProfileJson: string | null;
  fallbackSeed: string;
  className?: string;
}) {
  const profile: AgentAvatarProfile = useMemo(() => {
    let raw: unknown = null;
    if (avatarProfileJson && typeof avatarProfileJson === "string") {
      try {
        raw = JSON.parse(avatarProfileJson);
      } catch {
        raw = null;
      }
    }
    return normalizeAgentAvatarProfile(raw, fallbackSeed);
  }, [avatarProfileJson, fallbackSeed]);

  return <AgentAvatarPreview3D profile={profile} className={className} />;
}
