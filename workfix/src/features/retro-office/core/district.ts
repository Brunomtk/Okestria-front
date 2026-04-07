import { CANVAS_H, CANVAS_W, SCALE } from "./constants";

// Local office dimensions within the larger district canvas
export const LOCAL_OFFICE_CANVAS_WIDTH = 1075;
export const LOCAL_OFFICE_CANVAS_HEIGHT = 720;

// Remote office zone - positioned below the local office
export const REMOTE_OFFICE_ZONE = {
  minX: 0,
  maxX: LOCAL_OFFICE_CANVAS_WIDTH,
  minY: 1080,
  maxY: 1800,
} as const;

// City path zone - the garden/walkway area between local and remote offices
export const CITY_PATH_ZONE = {
  minX: 100,
  maxX: 1700,
  minY: 720,
  maxY: 1080,
} as const;

// District camera settings for viewing the full district
export const DISTRICT_CAMERA_POSITION: [number, number, number] = [
  (CANVAS_W / 2) * SCALE,
  14,
  (CANVAS_H / 2) * SCALE + 6,
];

export const DISTRICT_CAMERA_TARGET: [number, number, number] = [
  (CANVAS_W / 2) * SCALE,
  0,
  (CANVAS_H / 2) * SCALE - 2,
];

export const DISTRICT_CAMERA_ZOOM = 38;

// Roam points for remote office agents
export const REMOTE_ROAM_POINTS: [number, number][] = [
  [200, 1200],
  [400, 1300],
  [600, 1200],
  [800, 1400],
  [300, 1500],
  [500, 1600],
  [700, 1500],
  [900, 1300],
];

// Check if an agent ID belongs to the remote office
export function isRemoteOfficeAgentId(agentId: string | null | undefined): boolean {
  if (!agentId) return false;
  return agentId.startsWith("remote-");
}

// Zone type for clamping calculations
export type Zone = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

// Clamp a point to stay within a zone boundary
export function clampPointToZone(
  x: number,
  y: number,
  zone: Zone,
): [number, number] {
  return [
    Math.max(zone.minX, Math.min(zone.maxX, x)),
    Math.max(zone.minY, Math.min(zone.maxY, y)),
  ];
}

// Project furniture items from source dimensions into the remote office zone
export function projectFurnitureIntoRemoteOfficeZone<T extends { x: number; y: number }>(args: {
  item: T;
  sourceWidth: number;
  sourceHeight: number;
}): T;
export function projectFurnitureIntoRemoteOfficeZone<T extends { x: number; y: number }>(args: {
  furniture: T[];
  sourceWidth: number;
  sourceHeight: number;
}): T[];
export function projectFurnitureIntoRemoteOfficeZone<T extends { x: number; y: number }>({
  item,
  furniture,
  sourceWidth,
  sourceHeight,
}: {
  item?: T;
  furniture?: T[];
  sourceWidth: number;
  sourceHeight: number;
}): T | T[] {
  const remoteZoneWidth = REMOTE_OFFICE_ZONE.maxX - REMOTE_OFFICE_ZONE.minX;
  const remoteZoneHeight = REMOTE_OFFICE_ZONE.maxY - REMOTE_OFFICE_ZONE.minY;

  const projectOne = (entry: T): T => {
    const normalizedX = entry.x / sourceWidth;
    const normalizedY = entry.y / sourceHeight;

    const projectedX = REMOTE_OFFICE_ZONE.minX + normalizedX * remoteZoneWidth;
    const projectedY = REMOTE_OFFICE_ZONE.minY + normalizedY * remoteZoneHeight;

    return {
      ...entry,
      x: projectedX,
      y: projectedY,
    };
  };

  if (Array.isArray(furniture)) {
    return furniture.map(projectOne);
  }

  if (item) {
    return projectOne(item);
  }

  return [] as T[];
}
