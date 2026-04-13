import { CANVAS_H, CANVAS_W, SCALE } from "./constants";
import type { FurnitureItem } from "./types";

/**
 * District layout constants
 * The district contains local office, city path, and remote office zones
 */

export const LOCAL_OFFICE_CANVAS_WIDTH = CANVAS_W;
export const LOCAL_OFFICE_CANVAS_HEIGHT = 720;

export const CITY_PATH_ZONE = {
  minX: 0,
  maxX: CANVAS_W,
  minY: LOCAL_OFFICE_CANVAS_HEIGHT,
  maxY: LOCAL_OFFICE_CANVAS_HEIGHT + 360,
};

export const REMOTE_OFFICE_ZONE = {
  minX: 0,
  maxX: CANVAS_W,
  minY: CITY_PATH_ZONE.maxY,
  maxY: CANVAS_H,
};

export const DISTRICT_CAMERA_POSITION: [number, number, number] = [
  (CANVAS_W * SCALE) / 2,
  35,
  (CANVAS_H * SCALE) / 2 + 20,
];

export const DISTRICT_CAMERA_TARGET: [number, number, number] = [
  (CANVAS_W * SCALE) / 2,
  0,
  (CANVAS_H * SCALE) / 2,
];

export const DISTRICT_CAMERA_ZOOM = 0.8;

export const REMOTE_ROAM_POINTS: Array<{ x: number; y: number }> = [
  { x: 200, y: REMOTE_OFFICE_ZONE.minY + 100 },
  { x: 400, y: REMOTE_OFFICE_ZONE.minY + 200 },
  { x: 600, y: REMOTE_OFFICE_ZONE.minY + 150 },
  { x: 800, y: REMOTE_OFFICE_ZONE.minY + 250 },
  { x: 1000, y: REMOTE_OFFICE_ZONE.minY + 100 },
  { x: 1200, y: REMOTE_OFFICE_ZONE.minY + 200 },
  { x: 1400, y: REMOTE_OFFICE_ZONE.minY + 150 },
  { x: 1600, y: REMOTE_OFFICE_ZONE.minY + 250 },
];

export function clampPointToZone(
  x: number,
  y: number,
  zone: { minX: number; maxX: number; minY: number; maxY: number }
): { x: number; y: number } {
  return {
    x: Math.max(zone.minX, Math.min(zone.maxX, x)),
    y: Math.max(zone.minY, Math.min(zone.maxY, y)),
  };
}

type FurnitureProjectionInput =
  | FurnitureItem[]
  | {
      furniture: FurnitureItem[];
      sourceWidth?: number;
      sourceHeight?: number;
    };

export function projectFurnitureIntoRemoteOfficeZone(
  input: FurnitureProjectionInput
): FurnitureItem[] {
  const furniture = Array.isArray(input) ? input : input.furniture;
  const offsetY = REMOTE_OFFICE_ZONE.minY;
  return furniture.map((item) => ({
    ...item,
    _uid: `remote_${item._uid}`,
    y: item.y + offsetY,
  }));
}

const REMOTE_AGENT_PREFIX = "remote:";

export function isRemoteOfficeAgentId(agentId: string): boolean {
  return agentId.startsWith(REMOTE_AGENT_PREFIX);
}

export function extractRemoteAgentId(agentId: string): string {
  if (isRemoteOfficeAgentId(agentId)) {
    return agentId.slice(REMOTE_AGENT_PREFIX.length);
  }
  return agentId;
}

export function toRemoteAgentId(agentId: string): string {
  if (isRemoteOfficeAgentId(agentId)) {
    return agentId;
  }
  return `${REMOTE_AGENT_PREFIX}${agentId}`;
}
