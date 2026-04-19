import {
  CANVAS_H,
  CANVAS_W,
  DOOR_LENGTH,
  GYM_ROOM_END_X,
  GYM_ROOM_X,
  QA_LAB_BOTTOM_Y,
  QA_LAB_DOOR_Y,
  QA_LAB_END_X,
  QA_LAB_TOP_Y,
  QA_LAB_X,
  WALL_THICKNESS,
  EAST_WING_DOOR_Y,
  EAST_WING_ROOM_HEIGHT,
  EAST_WING_ROOM_TOP_Y,
} from "@/features/retro-office/core/constants";
import {
  getItemBounds,
  ITEM_FOOTPRINT,
  ITEM_METADATA,
  snap,
} from "@/features/retro-office/core/geometry";
import type {
  FacingPoint,
  FurnitureItem,
  GymWorkoutLocation,
  QaLabStationLocation,
} from "@/features/retro-office/core/types";
export {
  GYM_DEFAULT_TARGET,
  resolveGymRoute,
} from "@/features/retro-office/core/navigation/gymRoute";
export { getJanitorCleaningStops } from "@/features/retro-office/core/navigation/janitorStops";
export {
  resolveSmsBoothRoute,
  SMS_BOOTH_DEFAULT_TARGET,
} from "@/features/retro-office/core/navigation/smsBoothRoute";
export {
  PHONE_BOOTH_DEFAULT_TARGET,
  resolvePhoneBoothRoute,
} from "@/features/retro-office/core/navigation/phoneBoothRoute";
export {
  QA_LAB_DEFAULT_TARGET,
  resolveQaLabRoute,
} from "@/features/retro-office/core/navigation/qaLabRoute";
export {
  resolveServerRoomRoute,
  SERVER_ROOM_TARGET,
} from "@/features/retro-office/core/navigation/serverRoomRoute";

export const resolvePingPongTargets = (
  item: FurnitureItem,
): [FacingPoint, FacingPoint] => {
  const width = item.w ?? 100;
  const depth = item.h ?? 60;
  const centerY = snap(item.y + depth / 2);
  return [
    { x: snap(item.x - 40), y: centerY, facing: Math.PI / 2 },
    { x: snap(item.x + width + 20), y: centerY, facing: -Math.PI / 2 },
  ];
};

export const AGENT_SPAWN_POINTS: FacingPoint[] = [
  { x: 180, y: 560, facing: 0.3 },
  { x: 260, y: 460, facing: 0.45 },
  { x: 360, y: 560, facing: -0.15 },
  { x: 540, y: 520, facing: -0.4 },
  { x: 700, y: 560, facing: -0.8 },
  { x: 920, y: 520, facing: -1.2 },
  { x: 1120, y: 500, facing: -1.7 },
  { x: 1260, y: 420, facing: -2.2 },
  { x: 980, y: 300, facing: 2.6 },
  { x: 720, y: 320, facing: 2.3 },
  { x: 520, y: 350, facing: 0.2 },
  { x: 860, y: 410, facing: -0.9 },
  { x: 1080, y: 620, facing: -1.9 },
  { x: 380, y: 650, facing: -0.2 },
];

export const AGENT_PAUSE_EXCLUSION_ZONES = [
  // North entrance / corridor door clusters.
  { x: 420, y: 150, radius: 110 },
  { x: 455, y: 165, radius: 95 },
  { x: 330, y: 92, radius: 90 },
  { x: 700, y: 92, radius: 82 },

  // East wing room thresholds.
  { x: 1268, y: 280, radius: 78 },
  { x: 1324, y: 280, radius: 78 },

  // Server room / lower entry thresholds.
  { x: 210, y: 630, radius: 96 },
  { x: 230, y: 630, radius: 82 },

  // Pantry / lower-left doorway and vending choke point.
  { x: 142, y: 548, radius: 96 },
  { x: 170, y: 520, radius: 88 },
  { x: 188, y: 500, radius: 72 },
];

export const isInAgentPauseExclusionZone = (x: number, y: number) =>
  AGENT_PAUSE_EXCLUSION_ZONES.some((zone) => Math.hypot(x - zone.x, y - zone.y) <= zone.radius);

export const ROAM_POINTS = [
  { x: 780, y: 230 },
  { x: 880, y: 500 },
  { x: 860, y: 590 },
  { x: 740, y: 360 },
  { x: 640, y: 280 },
  { x: 560, y: 520 },
  { x: 470, y: 430 },
  { x: 340, y: 320 },
  { x: 250, y: 450 },
  { x: 670, y: 430 },
  { x: 220, y: 590 },
  { x: 430, y: 620 },
  { x: 980, y: 380 },
  { x: 1140, y: 540 },
  { x: 1240, y: 230 },
  { x: 1060, y: 250 },
  { x: 900, y: 640 },
  { x: 620, y: 610 },
  { x: 300, y: 560 },
  { x: 530, y: 610 },
  { x: 690, y: 470 },
  { x: 1040, y: 430 },
  { x: 1180, y: 610 },
  { x: 360, y: 500 },
].filter((point) => !isInAgentPauseExclusionZone(point.x, point.y));


export type RoamRouteModel =
  | "loop"
  | "focus_shift"
  | "cross_current"
  | "north_bypass"
  | "south_sweep"
  | "zigzag"
  | "orbit"
  | "perimeter_drift"
  | "serpentine"
  | "diagonal_weave";

export const ROAM_ROUTE_MODELS: Record<RoamRouteModel, FacingPoint[]> = {
  loop: [
    { x: 230, y: 250, facing: 0.55 },
    { x: 560, y: 210, facing: 1.0 },
    { x: 920, y: 220, facing: 1.8 },
    { x: 1180, y: 330, facing: 2.2 },
    { x: 1130, y: 560, facing: -2.4 },
    { x: 760, y: 620, facing: -1.7 },
    { x: 380, y: 590, facing: -0.9 },
    { x: 200, y: 400, facing: -0.25 },
  ],
  focus_shift: [
    { x: 310, y: 540, facing: -0.2 },
    { x: 500, y: 420, facing: 0.25 },
    { x: 690, y: 300, facing: 0.75 },
    { x: 930, y: 270, facing: 1.55 },
    { x: 1030, y: 450, facing: 2.7 },
    { x: 840, y: 560, facing: -2.4 },
    { x: 600, y: 520, facing: -1.8 },
    { x: 430, y: 390, facing: -1.1 },
  ],
  cross_current: [
    { x: 190, y: 620, facing: 0.2 },
    { x: 430, y: 490, facing: 0.55 },
    { x: 700, y: 350, facing: 0.95 },
    { x: 1000, y: 220, facing: 1.4 },
    { x: 1240, y: 300, facing: 2.5 },
    { x: 1060, y: 490, facing: -2.8 },
    { x: 770, y: 590, facing: -2.05 },
    { x: 480, y: 640, facing: -1.2 },
  ],
  north_bypass: [
    { x: 210, y: 240, facing: 0.45 },
    { x: 410, y: 230, facing: 0.7 },
    { x: 690, y: 220, facing: 1.0 },
    { x: 980, y: 230, facing: 1.4 },
    { x: 1230, y: 260, facing: 2.1 },
    { x: 1040, y: 360, facing: -2.7 },
    { x: 760, y: 340, facing: -2.1 },
    { x: 470, y: 300, facing: -1.3 },
  ],
  south_sweep: [
    { x: 170, y: 610, facing: 0.2 },
    { x: 340, y: 620, facing: 0.1 },
    { x: 590, y: 630, facing: -0.2 },
    { x: 850, y: 630, facing: -0.6 },
    { x: 1110, y: 590, facing: -1.2 },
    { x: 1240, y: 500, facing: -2.0 },
    { x: 990, y: 520, facing: 2.8 },
    { x: 700, y: 560, facing: 2.2 },
  ],
  zigzag: [
    { x: 260, y: 540, facing: 0.35 },
    { x: 520, y: 260, facing: 0.9 },
    { x: 690, y: 540, facing: -0.9 },
    { x: 900, y: 280, facing: 0.95 },
    { x: 1100, y: 540, facing: -1.3 },
    { x: 1240, y: 320, facing: 2.2 },
    { x: 820, y: 420, facing: -2.8 },
    { x: 460, y: 470, facing: -2.1 },
  ],
  orbit: [
    { x: 520, y: 360, facing: 0.3 },
    { x: 650, y: 260, facing: 0.9 },
    { x: 840, y: 250, facing: 1.5 },
    { x: 970, y: 360, facing: 2.1 },
    { x: 940, y: 520, facing: 2.9 },
    { x: 780, y: 580, facing: -2.2 },
    { x: 610, y: 550, facing: -1.5 },
    { x: 500, y: 460, facing: -0.7 },
  ],
  perimeter_drift: [
    { x: 180, y: 220, facing: 0.25 },
    { x: 520, y: 170, facing: 0.85 },
    { x: 930, y: 170, facing: 1.35 },
    { x: 1260, y: 250, facing: 2.0 },
    { x: 1250, y: 520, facing: 2.8 },
    { x: 980, y: 620, facing: -2.6 },
    { x: 560, y: 645, facing: -1.8 },
    { x: 220, y: 560, facing: -0.35 },
  ],
  serpentine: [
    { x: 250, y: 580, facing: 0.15 },
    { x: 470, y: 430, facing: 0.65 },
    { x: 650, y: 560, facing: -0.7 },
    { x: 820, y: 360, facing: 0.95 },
    { x: 980, y: 540, facing: -1.1 },
    { x: 1150, y: 330, facing: 1.8 },
    { x: 960, y: 270, facing: -2.9 },
    { x: 620, y: 320, facing: -2.2 },
  ],
  diagonal_weave: [
    { x: 220, y: 620, facing: 0.2 },
    { x: 400, y: 470, facing: 0.55 },
    { x: 600, y: 330, facing: 0.95 },
    { x: 820, y: 220, facing: 1.4 },
    { x: 1060, y: 310, facing: 2.2 },
    { x: 1180, y: 520, facing: -2.3 },
    { x: 840, y: 610, facing: -2.7 },
    { x: 460, y: 580, facing: -1.8 },
  ],
};


export const JANITOR_ENTRY_POINTS: FacingPoint[] = [
  { x: 80, y: 360, facing: Math.PI / 2 },
  { x: 820, y: 70, facing: Math.PI },
  { x: 1540, y: 360, facing: -Math.PI / 2 },
];

export const JANITOR_EXIT_POINTS: FacingPoint[] = [
  { x: 110, y: 680, facing: Math.PI / 2 },
  { x: 820, y: 680, facing: Math.PI },
  { x: 1510, y: 680, facing: -Math.PI / 2 },
];

const GRID_CELL = 25;
const GRID_COLS = Math.ceil(CANVAS_W / GRID_CELL);
const GRID_ROWS = Math.ceil(CANVAS_H / GRID_CELL);

export type NavGrid = Uint8Array;

const ROOM_PORTAL_OFFSET = GRID_CELL + 5;

type OfficeNavZone = "office" | "gym" | "qa";

const isInsideGymRoom = (x: number, y: number) =>
  x >= GYM_ROOM_X + WALL_THICKNESS + 12 &&
  x <= GYM_ROOM_END_X - 12 &&
  y >= EAST_WING_ROOM_TOP_Y + 12 &&
  y <= EAST_WING_ROOM_TOP_Y + EAST_WING_ROOM_HEIGHT - WALL_THICKNESS - 12;

const isInsideQaLab = (x: number, y: number) =>
  x >= QA_LAB_X + WALL_THICKNESS + 12 &&
  x <= QA_LAB_END_X - 12 &&
  y >= QA_LAB_TOP_Y + 12 &&
  y <= QA_LAB_BOTTOM_Y - WALL_THICKNESS - 12;

const resolveOfficeNavZone = (x: number, y: number): OfficeNavZone => {
  if (isInsideGymRoom(x, y)) return "gym";
  if (isInsideQaLab(x, y)) return "qa";
  return "office";
};

const getZonePortal = (zone: Exclude<OfficeNavZone, "office">) => {
  if (zone === "gym") {
    const doorCenterY = EAST_WING_DOOR_Y + DOOR_LENGTH / 2;
    return {
      outside: { x: GYM_ROOM_X - ROOM_PORTAL_OFFSET, y: doorCenterY },
      inside: { x: GYM_ROOM_X + ROOM_PORTAL_OFFSET, y: doorCenterY },
    };
  }
  const doorCenterY = QA_LAB_DOOR_Y + DOOR_LENGTH / 2;
  return {
    outside: { x: QA_LAB_X - ROOM_PORTAL_OFFSET, y: doorCenterY },
    inside: { x: QA_LAB_X + ROOM_PORTAL_OFFSET, y: doorCenterY },
  };
};

const concatPathSegments = (
  acc: { x: number; y: number }[],
  segment: { x: number; y: number }[],
) => {
  if (segment.length === 0) return acc;
  if (acc.length === 0) return [...segment];
  const [first, ...rest] = segment;
  const last = acc[acc.length - 1];
  if (last && first && Math.hypot(last.x - first.x, last.y - first.y) < 1) {
    return [...acc, ...rest];
  }
  return [...acc, ...segment];
};

const clampPointToCanvas = (x: number, y: number) => ({
  x: Math.min(CANVAS_W - GRID_CELL * 1.5, Math.max(GRID_CELL * 1.5, x)),
  y: Math.min(CANVAS_H - GRID_CELL * 1.5, Math.max(GRID_CELL * 1.5, y)),
});

export const projectPointToNavigable = (
  x: number,
  y: number,
  grid: NavGrid,
): { x: number; y: number } => {
  const clamped = clampPointToCanvas(x, y);
  const startColumn = Math.min(
    GRID_COLS - 1,
    Math.max(0, Math.floor(clamped.x / GRID_CELL)),
  );
  const startRow = Math.min(
    GRID_ROWS - 1,
    Math.max(0, Math.floor(clamped.y / GRID_CELL)),
  );
  const cellCx = (column: number) => column * GRID_CELL + GRID_CELL / 2;
  const cellCy = (row: number) => row * GRID_CELL + GRID_CELL / 2;
  if (!grid[startRow * GRID_COLS + startColumn]) {
    // Keep the original continuous point when it is already inside a free cell.
    // Snapping every in-flight movement step to the cell center makes agents
    // animate as walking while visually staying in place until they cross a
    // whole grid cell.
    return clamped;
  }
  for (let distance = 1; distance < 12; distance += 1) {
    for (let rowOffset = -distance; rowOffset <= distance; rowOffset += 1) {
      for (let columnOffset = -distance; columnOffset <= distance; columnOffset += 1) {
        if (Math.abs(rowOffset) !== distance && Math.abs(columnOffset) !== distance) {
          continue;
        }
        const nextRow = startRow + rowOffset;
        const nextColumn = startColumn + columnOffset;
        if (
          nextRow < 0 ||
          nextRow >= GRID_ROWS ||
          nextColumn < 0 ||
          nextColumn >= GRID_COLS
        ) {
          continue;
        }
        if (!grid[nextRow * GRID_COLS + nextColumn]) {
          return { x: cellCx(nextColumn), y: cellCy(nextRow) };
        }
      }
    }
  }
  return clamped;
};


/**
 * Returns true if the given item type should block pathfinding cells.
 * Driven by ITEM_METADATA.blocksNavigation — the single source of truth for
 * nav-blocking behaviour. Unknown types default to false (non-blocking) so
 * newly added decorative items never accidentally block navigation.
 */
const itemBlocksNavigation = (type: string): boolean =>
  ITEM_METADATA[type]?.blocksNavigation ?? false;

export function buildNavGrid(furniture: FurnitureItem[]): NavGrid {
  const grid = new Uint8Array(GRID_COLS * GRID_ROWS);
  const pad = GRID_CELL * 0.6;
  for (const item of furniture) {
    if (!itemBlocksNavigation(item.type)) continue;
    const bounds = getItemBounds(item);
    const x1 = bounds.x - pad;
    const y1 = bounds.y - pad;
    const x2 = bounds.x + bounds.w + pad;
    const y2 = bounds.y + bounds.h + pad;
    const c1 = Math.max(0, Math.floor(x1 / GRID_CELL));
    const c2 = Math.min(GRID_COLS - 1, Math.floor(x2 / GRID_CELL));
    const r1 = Math.max(0, Math.floor(y1 / GRID_CELL));
    const r2 = Math.min(GRID_ROWS - 1, Math.floor(y2 / GRID_CELL));
    for (let row = r1; row <= r2; row += 1) {
      for (let column = c1; column <= c2; column += 1) {
        grid[row * GRID_COLS + column] = 1;
      }
    }
  }

  for (let column = 0; column < GRID_COLS; column += 1) {
    grid[column] = 1;
    grid[(GRID_ROWS - 1) * GRID_COLS + column] = 1;
  }
  for (let row = 0; row < GRID_ROWS; row += 1) {
    grid[row * GRID_COLS] = 1;
    grid[row * GRID_COLS + GRID_COLS - 1] = 1;
  }
  return grid;
}

export function planOfficePath(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  grid: NavGrid,
): { x: number; y: number }[] {
  const safeStart = projectPointToNavigable(sx, sy, grid);
  const safeEnd = projectPointToNavigable(ex, ey, grid);
  const startZone = resolveOfficeNavZone(safeStart.x, safeStart.y);
  const endZone = resolveOfficeNavZone(safeEnd.x, safeEnd.y);

  if (startZone === endZone) {
    return astar(safeStart.x, safeStart.y, safeEnd.x, safeEnd.y, grid);
  }

  const waypoints: { x: number; y: number }[] = [];
  if (startZone !== "office") {
    const portal = getZonePortal(startZone);
    waypoints.push(portal.inside, portal.outside);
  }
  if (endZone !== "office") {
    const portal = getZonePortal(endZone);
    waypoints.push(portal.outside, portal.inside);
  }

  let cursorX = safeStart.x;
  let cursorY = safeStart.y;
  let fullPath: { x: number; y: number }[] = [];
  for (const waypoint of [...waypoints, safeEnd]) {
    const safeWaypoint = projectPointToNavigable(waypoint.x, waypoint.y, grid);
    const segment = astar(cursorX, cursorY, safeWaypoint.x, safeWaypoint.y, grid);
    if (segment.length === 0) {
      return [];
    }
    fullPath = concatPathSegments(fullPath, segment);
    cursorX = safeWaypoint.x;
    cursorY = safeWaypoint.y;
  }
  return fullPath;
}

export function astar(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  grid: NavGrid,
): { x: number; y: number }[] {
  const clamp = (value: number, low: number, high: number) =>
    Math.min(high, Math.max(low, value));
  const toCell = (x: number, y: number) => ({
    c: clamp(Math.floor(x / GRID_CELL), 0, GRID_COLS - 1),
    r: clamp(Math.floor(y / GRID_CELL), 0, GRID_ROWS - 1),
  });
  const cellCx = (column: number) => column * GRID_CELL + GRID_CELL / 2;
  const cellCy = (row: number) => row * GRID_CELL + GRID_CELL / 2;

  const findFree = (column: number, row: number) => {
    if (!grid[row * GRID_COLS + column]) return { c: column, r: row };
    for (let distance = 1; distance < 10; distance += 1) {
      for (let rowOffset = -distance; rowOffset <= distance; rowOffset += 1) {
        for (
          let columnOffset = -distance;
          columnOffset <= distance;
          columnOffset += 1
        ) {
          if (
            Math.abs(rowOffset) !== distance &&
            Math.abs(columnOffset) !== distance
          ) {
            continue;
          }
          const nextRow = row + rowOffset;
          const nextColumn = column + columnOffset;
          if (
            nextRow < 0 ||
            nextRow >= GRID_ROWS ||
            nextColumn < 0 ||
            nextColumn >= GRID_COLS
          ) {
            continue;
          }
          if (!grid[nextRow * GRID_COLS + nextColumn]) {
            return { c: nextColumn, r: nextRow };
          }
        }
      }
    }
    return null;
  };

  let { c: sc, r: sr } = toCell(sx, sy);
  let { c: ec, r: er } = toCell(ex, ey);
  const startFree = findFree(sc, sr);
  const endFree = findFree(ec, er);
  if (!startFree || !endFree) return [];
  sc = startFree.c;
  sr = startFree.r;
  ec = endFree.c;
  er = endFree.r;
  if (sc === ec && sr === er) return [projectPointToNavigable(ex, ey, grid)];

  const nodeCount = GRID_COLS * GRID_ROWS;
  const gCost = new Float32Array(nodeCount).fill(Infinity);
  const parent = new Int32Array(nodeCount).fill(-1);
  const visited = new Uint8Array(nodeCount);
  const startIndex = sr * GRID_COLS + sc;
  const endIndex = er * GRID_COLS + ec;
  gCost[startIndex] = 0;

  const open: [number, number][] = [];
  const pushOpen = (entry: [number, number]) => {
    open.push(entry);
    let index = open.length - 1;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (open[parentIndex][1] <= entry[1]) break;
      open[index] = open[parentIndex];
      index = parentIndex;
    }
    open[index] = entry;
  };
  const popOpen = (): [number, number] | null => {
    if (open.length === 0) return null;
    const first = open[0];
    const last = open.pop();
    if (!last || open.length === 0) return first;
    let index = 0;
    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = leftIndex + 1;
      if (leftIndex >= open.length) break;
      let smallestIndex = leftIndex;
      if (
        rightIndex < open.length &&
        open[rightIndex][1] < open[leftIndex][1]
      ) {
        smallestIndex = rightIndex;
      }
      if (open[smallestIndex][1] >= last[1]) break;
      open[index] = open[smallestIndex];
      index = smallestIndex;
    }
    open[index] = last;
    return first;
  };
  pushOpen([startIndex, Math.hypot(ec - sc, er - sr)]);
  const directions: [number, number, number][] = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [-1, -1, 1.414],
  ];

  while (open.length) {
    const next = popOpen();
    if (!next) break;
    const [current] = next;
    if (visited[current]) continue;
    visited[current] = 1;

    if (current === endIndex) {
      const path: { x: number; y: number }[] = [];
      let node = current;
      while (node !== startIndex) {
        path.push({
          x: cellCx(node % GRID_COLS),
          y: cellCy(Math.floor(node / GRID_COLS)),
        });
        node = parent[node];
      }
      path.reverse();
      const safeEnd = projectPointToNavigable(ex, ey, grid);
      if (path.length) path[path.length - 1] = safeEnd;
      else path.push(safeEnd);
      return path;
    }

    const currentColumn = current % GRID_COLS;
    const currentRow = Math.floor(current / GRID_COLS);
    for (const [columnOffset, rowOffset, cost] of directions) {
      const nextColumn = currentColumn + columnOffset;
      const nextRow = currentRow + rowOffset;
      if (
        nextColumn < 0 ||
        nextColumn >= GRID_COLS ||
        nextRow < 0 ||
        nextRow >= GRID_ROWS
      ) {
        continue;
      }
      const nextIndex = nextRow * GRID_COLS + nextColumn;
      if (visited[nextIndex] || grid[nextIndex]) continue;

      // For diagonal moves, require both orthogonal neighbours to be free so
      // agents cannot clip through the corner of a blocked cell (issue #6).
      // E.g. moving NE (dc=+1, dr=-1) requires N (dc=0, dr=-1) and E (dc=+1, dr=0) to be clear.
      if (columnOffset !== 0 && rowOffset !== 0) {
        const orthogonalA =
          (currentRow + rowOffset) * GRID_COLS + currentColumn;
        const orthogonalB =
          currentRow * GRID_COLS + (currentColumn + columnOffset);
        if (grid[orthogonalA] || grid[orthogonalB]) continue;
      }
      const nextCost = gCost[current] + cost;
      if (nextCost < gCost[nextIndex]) {
        gCost[nextIndex] = nextCost;
        parent[nextIndex] = current;
        pushOpen([
          nextIndex,
          nextCost + Math.hypot(ec - nextColumn, er - nextRow),
        ]);
      }
    }
  }

  return [];
}

export const getDeskLocations = (items: FurnitureItem[]) =>
  items
    .filter((item) => item.type === "desk_cubicle")
    .map((item) => ({ x: item.x + 40, y: item.y + 40 }));

export const getMeetingSeatLocations = (items: FurnitureItem[]) => {
  // Meeting seats are inferred from chair placement in the conference area so standup
  // gathering follows the authored layout instead of a hardcoded attendee list.
  const chairs = items
    .filter(
      (item) =>
        item.type === "chair" &&
        item.x >= 0 &&
        item.x <= 290 &&
        item.y >= 0 &&
        item.y <= 235,
    )
    .sort((left, right) => left.y - right.y || left.x - right.x);
  if (chairs.length === 0) return [];

  const chairCenters = chairs.map((item) => ({
    item,
    x: item.x + ITEM_FOOTPRINT.chair[0] / 2,
    y: item.y + ITEM_FOOTPRINT.chair[1] / 2,
  }));
  const centerX =
    chairCenters.reduce((sum, chair) => sum + chair.x, 0) / chairCenters.length;
  const centerY =
    chairCenters.reduce((sum, chair) => sum + chair.y, 0) / chairCenters.length;

  return chairCenters.map((chair) => {
    const offsetX = chair.x - centerX;
    const offsetY = chair.y - centerY;
    const distance = Math.hypot(offsetX, offsetY) || 1;
    const seatPullback = 14;
    return {
      x: chair.x + (offsetX / distance) * seatPullback,
      y: chair.y + (offsetY / distance) * seatPullback,
      facing: Math.atan2(centerX - chair.x, centerY - chair.y),
    };
  });
};

export const getGymWorkoutLocations = (
  items: FurnitureItem[],
): GymWorkoutLocation[] =>
  items
    .filter((item) =>
      [
        "treadmill",
        "weight_bench",
        "dumbbell_rack",
        "exercise_bike",
        "squat_rack",
        "deadlift_platform",
        "cable_crossover",
        "punching_bag",
        "rowing_machine",
        "kettlebell_rack",
        "yoga_mat",
      ].includes(item.type),
    )
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((item) => {
      // Each workout target is an agent standing point plus a facing direction toward equipment.
      const bounds = getItemBounds(item);
      const equipmentCenterX = bounds.x + bounds.w / 2;
      const equipmentCenterY = bounds.y + bounds.h / 2;
      const facingTowardEquipment = (targetX: number, targetY: number) =>
        Math.atan2(equipmentCenterX - targetX, equipmentCenterY - targetY);
      if (item.type === "treadmill") {
        const x = item.x + 35;
        const y = item.y + 65;
        return {
          x,
          y,
          facing: facingTowardEquipment(x, y),
          workoutStyle: "run",
        };
      }
      if (item.type === "weight_bench") {
        const x = item.x + 38;
        const y = item.y + 20;
        return {
          x,
          y,
          facing: facingTowardEquipment(x, y),
          workoutStyle: "lift",
        };
      }
      if (item.type === "dumbbell_rack" || item.type === "kettlebell_rack") {
        const x = item.x - 18;
        const y = item.y + 14;
        return {
          x,
          y,
          facing: facingTowardEquipment(x, y),
          workoutStyle: "lift",
        };
      }
      if (item.type === "exercise_bike") {
        const x = item.x + 18;
        const y = item.y + 28;
        return {
          x,
          y,
          facing: facingTowardEquipment(x, y),
          workoutStyle: "bike",
        };
      }
      if (item.type === "squat_rack") {
        const x = item.x + 36;
        const y = item.y + 24;
        return {
          x,
          y,
          facing: facingTowardEquipment(x, y),
          workoutStyle: "lift",
        };
      }
      if (item.type === "deadlift_platform") {
        const x = item.x + 75;
        const y = item.y + 55;
        return {
          x,
          y,
          facing: facingTowardEquipment(x, y),
          workoutStyle: "lift",
        };
      }
      if (item.type === "cable_crossover") {
        const x = item.x + 50;
        const y = item.y + 45;
        return {
          x,
          y,
          facing: facingTowardEquipment(x, y),
          workoutStyle: "lift",
        };
      }
      if (item.type === "rowing_machine") {
        const x = item.x + 28;
        const y = item.y + 16;
        return {
          x,
          y,
          facing: facingTowardEquipment(x, y),
          workoutStyle: "row",
        };
      }
      if (item.type === "yoga_mat") {
        const x = item.x + 35;
        const y = item.y + 15;
        return {
          x,
          y,
          facing: facingTowardEquipment(x, y),
          workoutStyle: "stretch",
        };
      }
      const x = item.x - 18;
      const y = item.y + 14;
      return {
        x,
        y,
        facing: facingTowardEquipment(x, y),
        workoutStyle: "box",
      };
    });

export const getQaLabStations = (
  items: FurnitureItem[],
): QaLabStationLocation[] =>
  items
    .filter((item) =>
      ["qa_terminal", "device_rack", "test_bench"].includes(item.type),
    )
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((item) => {
      // QA stations follow the same pattern as gym targets: derive a nearby standing point
      // from authored furniture so scene motion stays data-driven.
      const bounds = getItemBounds(item);
      const stationCenterX = bounds.x + bounds.w / 2;
      const stationCenterY = bounds.y + bounds.h / 2;
      const facingTowardStation = (targetX: number, targetY: number) =>
        Math.atan2(stationCenterX - targetX, stationCenterY - targetY);

      if (item.type === "qa_terminal") {
        const x = item.x + 26;
        const y = item.y + 56;
        return {
          x,
          y,
          facing: facingTowardStation(x, y),
          stationType: "console" as const,
        };
      }
      if (item.type === "device_rack") {
        const x = item.x - 18;
        const y = item.y + 18;
        return {
          x,
          y,
          facing: facingTowardStation(x, y),
          stationType: "device_rack" as const,
        };
      }
      const x = item.x + 45;
      const y = item.y + 58;
      return {
        x,
        y,
        facing: facingTowardStation(x, y),
        stationType: "bench" as const,
      };
    });

export const MEETING_OVERFLOW_LOCATIONS = [
  { x: 18, y: 118, facing: Math.PI / 2 },
  { x: 270, y: 118, facing: -Math.PI / 2 },
  { x: 145, y: 24, facing: Math.PI },
  { x: 145, y: 220, facing: 0 },
];

export const resolveDeskIndexForItem = (
  item: FurnitureItem,
  deskLocations: { x: number; y: number }[],
): number => {
  if (deskLocations.length === 0) return -1;
  if (item.type === "desk_cubicle") {
    return deskLocations.findIndex(
      (desk) => desk.x === item.x + 40 && desk.y === item.y + 40,
    );
  }

  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < deskLocations.length; index += 1) {
    const desk = deskLocations[index];
    if (!desk) continue;
    const distance = Math.hypot(item.x - desk.x, item.y - desk.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestDistance <= 80 ? bestIndex : -1;
};
