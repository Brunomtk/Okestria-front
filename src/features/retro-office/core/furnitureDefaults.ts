import {
  DOOR_LENGTH,
  DOOR_THICKNESS,
  EAST_WING_DOOR_Y,
  EAST_WING_ROOM_HEIGHT,
  EAST_WING_ROOM_TOP_Y,
  GYM_ROOM_END_X,
  GYM_ROOM_WIDTH,
  GYM_ROOM_X,
  QA_LAB_BOTTOM_Y,
  QA_LAB_END_X,
  QA_LAB_TOP_Y,
  QA_LAB_X,
  WALL_THICKNESS,
} from "@/features/retro-office/core/constants";
import { nextUid } from "@/features/retro-office/core/geometry";
import {
  hasArtRoomRemovalMigrationApplied,
  hasAtmMigrationApplied,
  hasGymRoomMigrationApplied,
  hasPhoneBoothMigrationApplied,
  hasQaLabMigrationApplied,
  hasServerRoomMigrationApplied,
} from "@/features/retro-office/core/persistence";
import type {
  FurnitureItem,
  FurnitureSeed,
} from "@/features/retro-office/core/types";

const DEFAULT_PINGPONG_TABLE: FurnitureSeed = {
  type: "pingpong",
  x: 580,
  y: 610,
  w: 108,
  h: 60,
};

const DEFAULT_ATM_MACHINE: FurnitureSeed = {
  type: "atm",
  x: 330,
  y: 10,
  facing: 0,
};



const DEFAULT_SMS_BOOTH: FurnitureSeed = {
  type: "sms_booth",
  x: 700,
  y: 72,
  facing: 0,
};

const DEFAULT_JUKEBOX: FurnitureSeed = {
  type: "jukebox",
  x: 20,
  y: 400,
  facing: 90,
};

const PREVIOUS_SERVER_ROOM_ITEMS_BOTTOM_RIGHT: FurnitureSeed[] = [
  { type: "wall", x: 820, y: 540, w: 280, h: WALL_THICKNESS },
  { type: "wall", x: 820, y: 540, w: WALL_THICKNESS, h: 70 },
  { type: "wall", x: 820, y: 650, w: WALL_THICKNESS, h: 70 },
  {
    type: "door",
    x: 820,
    y: 610,
    w: DOOR_LENGTH,
    h: DOOR_THICKNESS,
    facing: 90,
  },
  { type: "server_rack", x: 885, y: 575, facing: 180 },
  { type: "server_rack", x: 955, y: 575, facing: 180 },
  { type: "server_terminal", x: 930, y: 640, facing: 0 },
];

const PREVIOUS_SERVER_ROOM_ITEMS_TOP_RIGHT: FurnitureSeed[] = [
  { type: "wall", x: 820, y: 0, w: WALL_THICKNESS, h: 130 },
  { type: "wall", x: 820, y: 170, w: WALL_THICKNESS, h: 60 },
  {
    type: "door",
    x: 820,
    y: 130,
    w: DOOR_LENGTH,
    h: DOOR_THICKNESS,
    facing: 90,
  },
  { type: "wall", x: 820, y: 230, w: 280, h: WALL_THICKNESS },
  { type: "server_rack", x: 875, y: 95, facing: 180 },
  { type: "server_rack", x: 950, y: 95, facing: 180 },
  { type: "server_terminal", x: 930, y: 185, facing: 0 },
];

const DEFAULT_DINING_ITEMS: FurnitureSeed[] = [
  // Shifted a bit to the left to keep the right-side doorway circulation clearer for agents.
  { type: "round_table", x: 820, y: 100, r: 50 },
  { type: "chair", x: 860, y: 100, facing: 0 },
  { type: "chair", x: 860, y: 180, facing: 180 },
  { type: "chair", x: 810, y: 130, facing: 90 },
  { type: "chair", x: 900, y: 130, facing: 270 },
];

const DEFAULT_SERVER_ROOM_ITEMS: FurnitureSeed[] = [
  { type: "wall", x: 0, y: 560, w: 230, h: WALL_THICKNESS },
  { type: "wall", x: 220, y: 560, w: WALL_THICKNESS, h: 60 },
  {
    type: "door",
    x: 210,
    y: 630,
    w: DOOR_LENGTH,
    h: DOOR_THICKNESS,
    facing: 90,
  },
  { type: "wall", x: 220, y: 660, w: WALL_THICKNESS, h: 60 },
  { type: "server_rack", x: 42, y: 590, facing: 0 },
  { type: "server_rack", x: 102, y: 590, facing: 0 },
];

const LEGACY_GYM_ROOM_ITEMS: FurnitureSeed[] = [
  { type: "wall", x: 1092, y: 0, w: WALL_THICKNESS, h: 260 },
  {
    type: "door",
    x: 1092,
    y: 260,
    w: DOOR_LENGTH,
    h: DOOR_THICKNESS,
    facing: 90,
  },
  { type: "wall", x: 1092, y: 300, w: WALL_THICKNESS, h: 420 },
  { type: "wall", x: 1092, y: 0, w: 358, h: WALL_THICKNESS },
  { type: "wall", x: 1092, y: 712, w: 358, h: WALL_THICKNESS },
  { type: "wall", x: 1442, y: 0, w: WALL_THICKNESS, h: 260 },
  {
    type: "door",
    x: 1442,
    y: 260,
    w: DOOR_LENGTH,
    h: DOOR_THICKNESS,
    facing: 90,
  },
  { type: "wall", x: 1442, y: 300, w: WALL_THICKNESS, h: 420 },
  { type: "treadmill", x: 1160, y: 90, facing: 90 },
  { type: "treadmill", x: 1160, y: 210, facing: 90 },
  { type: "rowing_machine", x: 1150, y: 340, facing: 90 },
  { type: "weight_bench", x: 1240, y: 120, facing: 90 },
  { type: "weight_bench", x: 1240, y: 260, facing: 90 },
  { type: "dumbbell_rack", x: 1320, y: 90, facing: 180 },
  { type: "dumbbell_rack", x: 1320, y: 220, facing: 180 },
  { type: "kettlebell_rack", x: 1310, y: 330, facing: 180 },
  { type: "exercise_bike", x: 1180, y: 410, facing: 90 },
  { type: "exercise_bike", x: 1180, y: 540, facing: 90 },
  { type: "punching_bag", x: 1360, y: 390, facing: 0 },
  { type: "punching_bag", x: 1360, y: 560, facing: 0 },
  { type: "yoga_mat", x: 1240, y: 470, facing: 0, color: "#0f766e" },
  { type: "yoga_mat", x: 1240, y: 560, facing: 0, color: "#7c3aed" },
  { type: "plant", x: 1400, y: 40 },
  { type: "plant", x: 1400, y: 660 },
];

const LEGACY_QA_LAB_ITEMS: FurnitureSeed[] = [
  { type: "wall", x: 1442, y: 0, w: 358, h: WALL_THICKNESS },
  { type: "wall", x: 1442, y: 712, w: 358, h: WALL_THICKNESS },
  { type: "wall", x: 1792, y: 0, w: WALL_THICKNESS, h: 720 },
  { type: "qa_terminal", x: 1530, y: 95, facing: 90 },
  { type: "device_rack", x: 1650, y: 90, facing: 180 },
  { type: "device_rack", x: 1650, y: 220, facing: 180 },
  { type: "test_bench", x: 1520, y: 320, facing: 90 },
  { type: "test_bench", x: 1520, y: 470, facing: 90 },
  { type: "plant", x: 1750, y: 40 },
  { type: "plant", x: 1750, y: 660 },
];

// Gym room dimensions (top room)
const GYM_ROOM_BOTTOM_Y = EAST_WING_ROOM_TOP_Y + EAST_WING_ROOM_HEIGHT; // = 360
const GYM_DOOR_BOTTOM_Y = EAST_WING_DOOR_Y + DOOR_LENGTH;
const GYM_TOP_WALL_HEIGHT = EAST_WING_DOOR_Y - EAST_WING_ROOM_TOP_Y;
const GYM_BOTTOM_WALL_HEIGHT = GYM_ROOM_BOTTOM_Y - GYM_DOOR_BOTTOM_Y;

// QA Lab dimensions (bottom room, below gym)
const QA_LAB_DOOR_Y = QA_LAB_TOP_Y + 140; // Door position for QA (y=500)
const QA_LAB_DOOR_BOTTOM_Y = QA_LAB_DOOR_Y + DOOR_LENGTH;
const QA_LAB_TOP_WALL_HEIGHT = QA_LAB_DOOR_Y - QA_LAB_TOP_Y;
const QA_LAB_BOTTOM_WALL_HEIGHT_CALC = QA_LAB_BOTTOM_Y - QA_LAB_DOOR_BOTTOM_Y;
const createVerticalWallDoor = (x: number, y: number): FurnitureSeed => ({
  type: "door",
  // Use the same standard door footprint/render used across the rest of the office
  // and offset it so the rotated door occupies the exact 8x40 wall opening.
  x: x - (DOOR_LENGTH - DOOR_THICKNESS) / 2,
  y: y + (DOOR_LENGTH - DOOR_THICKNESS) / 2,
  w: DOOR_LENGTH,
  h: DOOR_THICKNESS,
  facing: 90,
});

// Legacy variables for backward compatibility
const EAST_WING_ROOM_BOTTOM_Y = GYM_ROOM_BOTTOM_Y;
const EAST_WING_ROOM_BOTTOM_WALL_Y = GYM_ROOM_BOTTOM_Y - WALL_THICKNESS;
const EAST_WING_DOOR_BOTTOM_Y = GYM_DOOR_BOTTOM_Y;
const EAST_WING_TOP_WALL_HEIGHT = GYM_TOP_WALL_HEIGHT;
const EAST_WING_BOTTOM_WALL_HEIGHT = GYM_BOTTOM_WALL_HEIGHT;

// Old gym items with hardcoded positions (for migration removal)
const PREVIOUS_GYM_ROOM_ITEMS: FurnitureSeed[] = [
  // Old walls (various layouts)
  { type: "wall", x: 1092, y: 40, w: 8, h: 640 },
  { type: "wall", x: 1092, y: 40, w: 184, h: 8 },
  { type: "wall", x: 1092, y: 672, w: 184, h: 8 },
  { type: "wall", x: 1268, y: 40, w: 8, h: 220 },
  { type: "door", x: 1268, y: 260, w: 8, h: 40, facing: 0 },
  { type: "wall", x: 1268, y: 300, w: 8, h: 380 },
  // Old equipment positions
  { type: "treadmill", x: 1188, y: 88, facing: 90 },
  { type: "weight_bench", x: 1250, y: 92, facing: 90 },
  { type: "dumbbell_rack", x: 1272, y: 160, facing: 180 },
  { type: "rowing_machine", x: 1186, y: 248, facing: 90 },
  { type: "kettlebell_rack", x: 1278, y: 268, facing: 180 },
  { type: "exercise_bike", x: 1192, y: 370, facing: 90 },
  { type: "punching_bag", x: 1310, y: 394, facing: 0 },
  { type: "yoga_mat", x: 1218, y: 544, facing: 0, color: "#0f766e" },
  { type: "plant", x: 1312, y: 82 },
  { type: "plant", x: 1312, y: 622 },
  // Alternative old positions
  { type: "treadmill", x: 1142, y: 90, facing: 90 },
  { type: "weight_bench", x: 1204, y: 92, facing: 90 },
  { type: "dumbbell_rack", x: 1220, y: 160, facing: 180 },
  { type: "rowing_machine", x: 1140, y: 222, facing: 90 },
  { type: "kettlebell_rack", x: 1224, y: 248, facing: 180 },
  { type: "exercise_bike", x: 1146, y: 366, facing: 90 },
  { type: "punching_bag", x: 1232, y: 380, facing: 0 },
  { type: "yoga_mat", x: 1168, y: 542, facing: 0, color: "#0f766e" },
  { type: "plant", x: 1234, y: 82 },
  { type: "plant", x: 1234, y: 622 },
];

// Old QA lab items with hardcoded positions (for migration removal)
const PREVIOUS_QA_LAB_ITEMS: FurnitureSeed[] = [
  // Old walls (various layouts)
  { type: "wall", x: 1324, y: 40, w: 8, h: 220 },
  { type: "door", x: 1324, y: 260, w: 8, h: 40, facing: 0 },
  { type: "wall", x: 1324, y: 300, w: 8, h: 380 },
  { type: "wall", x: 1324, y: 40, w: 184, h: 8 },
  { type: "wall", x: 1324, y: 672, w: 184, h: 8 },
  { type: "wall", x: 1500, y: 40, w: 8, h: 640 },
  // Old equipment positions
  { type: "qa_terminal", x: 1496, y: 92, facing: 90 },
  { type: "device_rack", x: 1568, y: 88, facing: 180 },
  { type: "device_rack", x: 1568, y: 194, facing: 180 },
  { type: "test_bench", x: 1492, y: 300, facing: 90 },
  { type: "test_bench", x: 1492, y: 434, facing: 90 },
  { type: "plant", x: 1604, y: 82 },
  { type: "plant", x: 1604, y: 622 },
  // Alternative old positions
  { type: "qa_terminal", x: 1390, y: 92, facing: 90 },
  { type: "device_rack", x: 1470, y: 92, facing: 180 },
  { type: "device_rack", x: 1470, y: 204, facing: 180 },
  { type: "test_bench", x: 1388, y: 316, facing: 90 },
  { type: "test_bench", x: 1388, y: 450, facing: 90 },
  { type: "plant", x: 1482, y: 82 },
  { type: "plant", x: 1482, y: 622 },
];

// ---------------------------------------------------------------------------
// Gym room: 720 x 360 (x: 1075→1795, y: 0→360)
// Layout: 4 clear zones — Cardio | Weights | Combat | Flexibility
// ---------------------------------------------------------------------------
const GYM_X = GYM_ROOM_X;      // 1075
const GYM_Y = EAST_WING_ROOM_TOP_Y; // 0

const DEFAULT_GYM_ITEMS: FurnitureSeed[] = [
  // === WALLS ===
  { type: "wall", x: GYM_X, y: GYM_Y, w: WALL_THICKNESS, h: GYM_TOP_WALL_HEIGHT },
  createVerticalWallDoor(GYM_X, EAST_WING_DOOR_Y),
  { type: "wall", x: GYM_X, y: GYM_DOOR_BOTTOM_Y, w: WALL_THICKNESS, h: GYM_BOTTOM_WALL_HEIGHT },
  { type: "wall", x: GYM_X, y: GYM_ROOM_BOTTOM_Y - WALL_THICKNESS, w: GYM_ROOM_WIDTH, h: WALL_THICKNESS },

  // ── Zone A: CARDIO (top-left, 2 rows) ──
  { type: "treadmill",      x: GYM_X + 60,  y: GYM_Y + 40,  facing: 90 },
  { type: "treadmill",      x: GYM_X + 150, y: GYM_Y + 40,  facing: 90 },
  { type: "treadmill",      x: GYM_X + 240, y: GYM_Y + 40,  facing: 90 },
  { type: "exercise_bike",  x: GYM_X + 60,  y: GYM_Y + 110, facing: 90 },
  { type: "exercise_bike",  x: GYM_X + 150, y: GYM_Y + 110, facing: 90 },
  { type: "rowing_machine", x: GYM_X + 240, y: GYM_Y + 110, facing: 90 },
  { type: "rowing_machine", x: GYM_X + 340, y: GYM_Y + 110, facing: 90 },

  // ── Zone B: WEIGHTS (top-right) ──
  { type: "weight_bench",   x: GYM_X + 420, y: GYM_Y + 40,  facing: 90 },
  { type: "weight_bench",   x: GYM_X + 530, y: GYM_Y + 40,  facing: 90 },
  { type: "dumbbell_rack",  x: GYM_X + 420, y: GYM_Y + 120, facing: 180 },
  { type: "dumbbell_rack",  x: GYM_X + 530, y: GYM_Y + 120, facing: 180 },
  { type: "kettlebell_rack", x: GYM_X + 640, y: GYM_Y + 40,  facing: 180 },
  { type: "kettlebell_rack", x: GYM_X + 640, y: GYM_Y + 120, facing: 180 },

  // ── Zone C: COMBAT (bottom-right) ──
  { type: "punching_bag",   x: GYM_X + 530, y: GYM_Y + 210, facing: 0 },
  { type: "punching_bag",   x: GYM_X + 620, y: GYM_Y + 210, facing: 0 },

  // ── Zone D: FLEXIBILITY (bottom-left, yoga area) ──
  { type: "yoga_mat", x: GYM_X + 60,  y: GYM_Y + 250, facing: 0, color: "#0f766e" },
  { type: "yoga_mat", x: GYM_X + 150, y: GYM_Y + 250, facing: 0, color: "#7c3aed" },
  { type: "yoga_mat", x: GYM_X + 240, y: GYM_Y + 250, facing: 0, color: "#0891b2" },
  { type: "yoga_mat", x: GYM_X + 330, y: GYM_Y + 250, facing: 0, color: "#f59e0b" },
];

// ---------------------------------------------------------------------------
// QA Lab: 720 x 360 (x: 1075→1795, y: 360→720)
// Layout: 3 clear zones — Terminals | Racks | Test Benches
// ---------------------------------------------------------------------------
const QA_X = QA_LAB_X;     // 1075
const QA_Y = QA_LAB_TOP_Y; // 360

const DEFAULT_QA_LAB_ITEMS: FurnitureSeed[] = [
  // === WALLS ===
  { type: "wall", x: QA_X, y: QA_Y, w: WALL_THICKNESS, h: QA_LAB_TOP_WALL_HEIGHT },
  createVerticalWallDoor(QA_X, QA_LAB_DOOR_Y),
  { type: "wall", x: QA_X, y: QA_LAB_DOOR_BOTTOM_Y, w: WALL_THICKNESS, h: QA_LAB_BOTTOM_WALL_HEIGHT_CALC },

  // ── Zone A: QA TERMINALS (left side, 2 rows of 3) ──
  { type: "qa_terminal", x: QA_X + 60,  y: QA_Y + 50,  facing: 90 },
  { type: "qa_terminal", x: QA_X + 140, y: QA_Y + 50,  facing: 90 },
  { type: "qa_terminal", x: QA_X + 220, y: QA_Y + 50,  facing: 90 },
  { type: "qa_terminal", x: QA_X + 60,  y: QA_Y + 130, facing: 90 },
  { type: "qa_terminal", x: QA_X + 140, y: QA_Y + 130, facing: 90 },
  { type: "qa_terminal", x: QA_X + 220, y: QA_Y + 130, facing: 90 },

  // ── Zone B: DEVICE RACKS (right side, 2 columns of 3) ──
  { type: "device_rack", x: QA_X + 500, y: QA_Y + 40,  facing: 180 },
  { type: "device_rack", x: QA_X + 600, y: QA_Y + 40,  facing: 180 },
  { type: "device_rack", x: QA_X + 500, y: QA_Y + 120, facing: 180 },
  { type: "device_rack", x: QA_X + 600, y: QA_Y + 120, facing: 180 },
  { type: "device_rack", x: QA_X + 500, y: QA_Y + 200, facing: 180 },
  { type: "device_rack", x: QA_X + 600, y: QA_Y + 200, facing: 180 },

  // ── Zone C: TEST BENCHES (bottom, 2 rows of 3) ──
  { type: "test_bench", x: QA_X + 60,  y: QA_Y + 230, facing: 90 },
  { type: "test_bench", x: QA_X + 170, y: QA_Y + 230, facing: 90 },
  { type: "test_bench", x: QA_X + 280, y: QA_Y + 230, facing: 90 },
  { type: "test_bench", x: QA_X + 60,  y: QA_Y + 290, facing: 90 },
  { type: "test_bench", x: QA_X + 170, y: QA_Y + 290, facing: 90 },
  { type: "test_bench", x: QA_X + 280, y: QA_Y + 290, facing: 90 },
];


// ---------------------------------------------------------------------------
// Helper: generate a complete desk station (desk + chair + computer +
// keyboard + mouse + trash) from a single anchor point. Keeps every station
// pixel-consistent so the office feels calibrated and professional.
// ---------------------------------------------------------------------------
const deskStation = (
  x: number,
  y: number,
  id: string,
): FurnitureSeed[] => [
  { type: "desk_cubicle", x, y, id },
  { type: "chair", x: x + 22, y: y - 12, facing: 180 },
  { type: "computer", x: x + 22, y: y - 15 },
  { type: "keyboard", x: x + 34, y: y - 8 },
  { type: "mouse", x: x + 55, y: y - 8 },
  { type: "trash", x: x + 74, y: y - 12 },
];

// ---------------------------------------------------------------------------
// LAYOUT CONSTANTS – tweak these to adjust the whole office at once
// ---------------------------------------------------------------------------

// Main office usable area: 0 → 1075 (x), 0 → 720 (y)
// East wing starts at x = 1075

// ── Meeting / Reception (top-left) ──
// Larger table to seat 6 comfortably. Centre at (130, 100) gives clearance
// from walls and keeps all chairs within the meeting-seat detection region
// defined in navigation.ts (x: 0→320, y: 0→260).
const MEETING_TABLE_X = 100;
const MEETING_TABLE_Y = 100;
const MEETING_TABLE_R = 78;

// ── Kitchen / Break area (top-right of main office) ──
const KITCHEN_START_X = 760;

// ── Workspace grid ──
const DESK_ROW_1_Y = 310;
const DESK_ROW_2_Y = 490;
const DESK_COL_POSITIONS = [90, 290, 490, 690]; // 200 px even spacing

// ── Recreation (bottom-center-right) ──
const PINGPONG_X = 580;
const PINGPONG_Y = 610;

const DEFAULT_FURNITURE: FurnitureSeed[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // 1. MEETING / RECEPTION AREA  (top-left corner)
  // ═══════════════════════════════════════════════════════════════════════
  { type: "round_table", x: MEETING_TABLE_X, y: MEETING_TABLE_Y, r: MEETING_TABLE_R },
  // Six chairs evenly around the table (every 60°)
  // Table centre = (TABLE_X + R, TABLE_Y + R) = (178, 178).  Chair footprint = 24×24, pivot at +12.
  // Ring radius from table centre to chair centre = R + 14 = 92 px (chairs hug the table edge).
  // N  (top)
  { type: "chair", x: MEETING_TABLE_X + 66, y: MEETING_TABLE_Y - 14, facing: 0, elevation: 0 },
  // NE
  { type: "chair", x: MEETING_TABLE_X + 146, y: MEETING_TABLE_Y + 32, facing: 300, elevation: 0 },
  // SE
  { type: "chair", x: MEETING_TABLE_X + 146, y: MEETING_TABLE_Y + 112, facing: 240, elevation: 0 },
  // S  (bottom)
  { type: "chair", x: MEETING_TABLE_X + 66, y: MEETING_TABLE_Y + 158, facing: 180, elevation: 0 },
  // SW
  { type: "chair", x: MEETING_TABLE_X - 14, y: MEETING_TABLE_Y + 112, facing: 120, elevation: 0 },
  // NW
  { type: "chair", x: MEETING_TABLE_X - 14, y: MEETING_TABLE_Y + 32, facing: 60, elevation: 0 },

  // ═══════════════════════════════════════════════════════════════════════
  // 2. ATM & CORRIDOR  (between meeting and kitchen)
  //    Fills the top corridor with useful office furniture
  // ═══════════════════════════════════════════════════════════════════════
  { type: "atm", x: 330, y: 10, facing: 0 },

  // ── Lounge / waiting area (right of ATM) ──
  { type: "water_cooler", x: 400, y: 16, facing: 0 },
  { type: "plant", x: 440, y: 10, facing: 0 },
  { type: "couch", x: 470, y: 30, facing: 0 },
  { type: "side_table", x: 530, y: 30, facing: 0 },
  { type: "couch", x: 560, y: 30, facing: 0 },
  { type: "plant", x: 620, y: 10, facing: 0 },

  // ── Info wall (corridor north wall) ──
  { type: "whiteboard", x: 460, y: 4, facing: 0 },
  { type: "clock", x: 560, y: 4, facing: 0, elevation: 1.2 },

  // ── Corridor amenities ──
  { type: "coat_rack", x: 650, y: 16, facing: 0 },
  { type: "copier", x: 680, y: 24, facing: 0 },

  // ═══════════════════════════════════════════════════════════════════════
  // 3. KITCHEN / BREAK AREA  (top-right, flush against north wall)
  // ═══════════════════════════════════════════════════════════════════════
  // Appliance counter (left → right)
  { type: "vending", x: KITCHEN_START_X, y: 12 },
  { type: "trash", x: KITCHEN_START_X + 50, y: 26 },
  { type: "cabinet", x: KITCHEN_START_X + 66, y: 28, w: 80, h: 40, elevation: 0 },
  { type: "coffee_machine", x: KITCHEN_START_X + 114, y: 30, elevation: 0.56 },
  { type: "stove", x: KITCHEN_START_X + 152, y: 20 },
  { type: "dishwasher", x: KITCHEN_START_X + 192, y: 20, w: 40, h: 40 },
  { type: "sink", x: KITCHEN_START_X + 232, y: 20 },
  { type: "cabinet", x: KITCHEN_START_X + 252, y: 30, w: 40, h: 40, elevation: 0 },
  { type: "microwave", x: KITCHEN_START_X + 278, y: 10, facing: 0 },
  { type: "fridge", x: KITCHEN_START_X + 298, y: 18, w: 40, h: 80 },
  // Wall cabinets above the counter
  { type: "wall_cabinet", x: KITCHEN_START_X + 108, y: 10, w: 80, h: 20, elevation: 0.9 },
  { type: "wall_cabinet", x: KITCHEN_START_X + 200, y: 10, w: 80, h: 20, elevation: 0.9 },
  // Dining / break table with four chairs
  // Table centre = (KITCHEN_START_X + 90 + 52, 160 + 52) = (KSX+142, 212)
  // Chair pivot +12, ring = R + 14 = 66 px from centre → chairs hug the table.
  { type: "round_table", x: KITCHEN_START_X + 90, y: 160, r: 52 },
  // N (facing south)
  { type: "chair", x: KITCHEN_START_X + 130, y: 146, facing: 0 },
  // S (facing north)
  { type: "chair", x: KITCHEN_START_X + 130, y: 254, facing: 180 },
  // W (facing east)
  { type: "chair", x: KITCHEN_START_X + 64, y: 200, facing: 90 },
  // E (facing west)
  { type: "chair", x: KITCHEN_START_X + 196, y: 200, facing: 270 },

  // ═══════════════════════════════════════════════════════════════════════
  // 4. WORKSPACE – Row 1  (4 desks, 200 px apart)
  // ═══════════════════════════════════════════════════════════════════════
  ...deskStation(DESK_COL_POSITIONS[0], DESK_ROW_1_Y, "desk_0"),
  ...deskStation(DESK_COL_POSITIONS[1], DESK_ROW_1_Y, "desk_1"),
  ...deskStation(DESK_COL_POSITIONS[2], DESK_ROW_1_Y, "desk_2"),
  ...deskStation(DESK_COL_POSITIONS[3], DESK_ROW_1_Y, "desk_3"),

  // ═══════════════════════════════════════════════════════════════════════
  // 5. WORKSPACE – Row 2  (4 desks, same columns)
  // ═══════════════════════════════════════════════════════════════════════
  ...deskStation(DESK_COL_POSITIONS[0], DESK_ROW_2_Y, "desk_4"),
  ...deskStation(DESK_COL_POSITIONS[1], DESK_ROW_2_Y, "desk_5"),
  ...deskStation(DESK_COL_POSITIONS[2], DESK_ROW_2_Y, "desk_6"),
  ...deskStation(DESK_COL_POSITIONS[3], DESK_ROW_2_Y, "desk_7"),

  // ═══════════════════════════════════════════════════════════════════════
  // 6. JUKEBOX  (left wall, between meeting and server room)
  // ═══════════════════════════════════════════════════════════════════════
  { type: "jukebox", x: 20, y: 400, facing: 90 },

  // ═══════════════════════════════════════════════════════════════════════
  // 7. SERVER ROOM  (bottom-left, walled enclosure)
  //    ⚠ Positions must match migration signatures exactly
  // ═══════════════════════════════════════════════════════════════════════
  { type: "wall", x: 0, y: 560, w: 230, h: WALL_THICKNESS },
  { type: "wall", x: 220, y: 560, w: WALL_THICKNESS, h: 60 },
  { type: "door", x: 210, y: 630, w: DOOR_LENGTH, h: DOOR_THICKNESS, facing: 90 },
  { type: "wall", x: 220, y: 660, w: WALL_THICKNESS, h: 60 },
  { type: "server_rack", x: 42, y: 590, facing: 0 },
  { type: "server_rack", x: 102, y: 590, facing: 0 },

  // ═══════════════════════════════════════════════════════════════════════
  // 8. RECREATION  (bottom-center)
  // ═══════════════════════════════════════════════════════════════════════
  { type: "pingpong", x: PINGPONG_X, y: PINGPONG_Y, w: 108, h: 60 },

  // ═══════════════════════════════════════════════════════════════════════
  // 9. EAST WING – divider walls + doors (Gym top / QA Lab bottom)
  //    ⚠ Wall/door positions must stay stable for migration system
  // ═══════════════════════════════════════════════════════════════════════
  // Gym entrance wall
  { type: "wall", x: 1075, y: 0, w: 8, h: 150 },
  { type: "door", x: 1059, y: 166, w: 40, h: 8, facing: 90 },
  { type: "wall", x: 1075, y: 190, w: 8, h: 170 },
  // Divider between gym and QA lab
  { type: "wall", x: 1075, y: 352, w: 720, h: 8 },

  // ── Gym equipment (Zone A: Cardio | Zone B: Weights | Zone C: Combat | Zone D: Yoga) ──
  // Cardio row
  { type: "treadmill", x: 1135, y: 40, facing: 90 },
  { type: "treadmill", x: 1225, y: 40, facing: 90 },
  { type: "treadmill", x: 1315, y: 40, facing: 90 },
  { type: "exercise_bike", x: 1135, y: 110, facing: 90 },
  { type: "exercise_bike", x: 1225, y: 110, facing: 90 },
  { type: "rowing_machine", x: 1315, y: 110, facing: 90 },
  { type: "rowing_machine", x: 1415, y: 110, facing: 90 },
  // Weights area
  { type: "weight_bench", x: 1495, y: 40, facing: 90 },
  { type: "weight_bench", x: 1605, y: 40, facing: 90 },
  { type: "dumbbell_rack", x: 1495, y: 120, facing: 180 },
  { type: "dumbbell_rack", x: 1605, y: 120, facing: 180 },
  { type: "kettlebell_rack", x: 1715, y: 40, facing: 180 },
  { type: "kettlebell_rack", x: 1715, y: 120, facing: 180 },
  // Combat area
  { type: "punching_bag", x: 1605, y: 210, facing: 0 },
  { type: "punching_bag", x: 1695, y: 210, facing: 0 },
  // Yoga / flexibility
  { type: "yoga_mat", x: 1135, y: 250, facing: 0, color: "#0f766e" },
  { type: "yoga_mat", x: 1225, y: 250, facing: 0, color: "#7c3aed" },
  { type: "yoga_mat", x: 1315, y: 250, facing: 0, color: "#0891b2" },
  { type: "yoga_mat", x: 1405, y: 250, facing: 0, color: "#f59e0b" },

  // QA Lab entrance wall
  { type: "wall", x: 1075, y: 360, w: 8, h: 140 },
  { type: "door", x: 1059, y: 516, w: 40, h: 8, facing: 90 },
  { type: "wall", x: 1075, y: 540, w: 8, h: 180 },

  // ── QA Lab equipment (Zone A: Terminals | Zone B: Racks | Zone C: Benches) ──
  // Terminals (2 rows of 3)
  { type: "qa_terminal", x: 1135, y: 410, facing: 90 },
  { type: "qa_terminal", x: 1215, y: 410, facing: 90 },
  { type: "qa_terminal", x: 1295, y: 410, facing: 90 },
  { type: "qa_terminal", x: 1135, y: 490, facing: 90 },
  { type: "qa_terminal", x: 1215, y: 490, facing: 90 },
  { type: "qa_terminal", x: 1295, y: 490, facing: 90 },
  // Device racks (2 columns of 3)
  { type: "device_rack", x: 1575, y: 400, facing: 180 },
  { type: "device_rack", x: 1675, y: 400, facing: 180 },
  { type: "device_rack", x: 1575, y: 480, facing: 180 },
  { type: "device_rack", x: 1675, y: 480, facing: 180 },
  { type: "device_rack", x: 1575, y: 560, facing: 180 },
  { type: "device_rack", x: 1675, y: 560, facing: 180 },
  // Test benches (2 rows of 3)
  { type: "test_bench", x: 1135, y: 590, facing: 90 },
  { type: "test_bench", x: 1245, y: 590, facing: 90 },
  { type: "test_bench", x: 1355, y: 590, facing: 90 },
  { type: "test_bench", x: 1135, y: 650, facing: 90 },
  { type: "test_bench", x: 1245, y: 650, facing: 90 },
  { type: "test_bench", x: 1355, y: 650, facing: 90 },
];

const PREVIOUS_ART_ROOM_ITEMS: FurnitureSeed[] = [
  { type: "wall", x: 260, y: 40, w: 8, h: 230 },
  { type: "wall", x: 260, y: 40, w: 178, h: 8 },
  { type: "wall", x: 260, y: 262, w: 178, h: 8 },
  { type: "wall", x: 430, y: 40, w: 8, h: 90 },
  { type: "door", x: 420, y: 150, w: 40, h: 8, facing: 90 },
  { type: "wall", x: 430, y: 170, w: 8, h: 100 },
  { type: "easel", x: 278, y: 84, facing: 90 },
  { type: "easel", x: 278, y: 158, facing: 90 },
  { type: "couch", x: 270, y: 90, w: 40, h: 80, vertical: true, facing: 180 },
  { type: "lamp", x: 430, y: 100 },
];

export const materializeDefaults = (): FurnitureItem[] =>
  DEFAULT_FURNITURE.map((item, index) => ({
    ...item,
    _uid: `default_${index}`,
  }));

export const isRetiredPingPongLamp = (item: FurnitureItem) =>
  item.type === "lamp" &&
  ((item.x === 870 && item.y === 470) || (item.x === 900 && item.y === 580));

const createFurnitureSignature = (item: FurnitureSeed | FurnitureItem) =>
  [
    item.type,
    item.x,
    item.y,
    item.w ?? "",
    item.h ?? "",
    item.r ?? "",
    item.facing ?? "",
    item.vertical ? 1 : 0,
    item.elevation ?? "",
  ].join(":");

const PREVIOUS_SERVER_ROOM_SIGNATURES = new Set(
  [
    ...PREVIOUS_SERVER_ROOM_ITEMS_BOTTOM_RIGHT,
    ...PREVIOUS_SERVER_ROOM_ITEMS_TOP_RIGHT,
  ].map(createFurnitureSignature),
);

const SERVER_ROOM_SIGNATURES = new Set(
  DEFAULT_SERVER_ROOM_ITEMS.map(createFurnitureSignature),
);

const LEGACY_GYM_ROOM_SIGNATURES = new Set(
  LEGACY_GYM_ROOM_ITEMS.map(createFurnitureSignature),
);
const PREVIOUS_GYM_ROOM_SIGNATURES = new Set(
  PREVIOUS_GYM_ROOM_ITEMS.map(createFurnitureSignature),
);
const GYM_ROOM_SIGNATURES = new Set(
  DEFAULT_GYM_ITEMS.map(createFurnitureSignature),
);
const LEGACY_QA_LAB_SIGNATURES = new Set(
  LEGACY_QA_LAB_ITEMS.map(createFurnitureSignature),
);
const PREVIOUS_QA_LAB_SIGNATURES = new Set(
  PREVIOUS_QA_LAB_ITEMS.map(createFurnitureSignature),
);
const QA_LAB_SIGNATURES = new Set(
  DEFAULT_QA_LAB_ITEMS.map(createFurnitureSignature),
);
const PREVIOUS_ART_ROOM_SIGNATURES = new Set(
  PREVIOUS_ART_ROOM_ITEMS.map(createFurnitureSignature),
);

const hasSignature = (items: FurnitureItem[], signatures: Set<string>) =>
  items.some((item) => signatures.has(createFurnitureSignature(item)));

const hasAllSignatures = (items: FurnitureItem[], signatures: Set<string>) => {
  const itemSignatures = new Set(items.map(createFurnitureSignature));
  return [...signatures].every((signature) => itemSignatures.has(signature));
};

const replaceBySignatureSet = (
  items: FurnitureItem[],
  signatures: Set<string>,
) => items.filter((item) => !signatures.has(createFurnitureSignature(item)));


const intersectsRect = (
  item: FurnitureItem,
  left: number,
  top: number,
  right: number,
  bottom: number,
) => {
  const itemRight = item.x + (item.w ?? 0);
  const itemBottom = item.y + (item.h ?? 0);
  return item.x < right && itemRight > left && item.y < bottom && itemBottom > top;
};

const stripGymRoomItems = (items: FurnitureItem[]) =>
  items.filter((item) => {
    if (
      [
        "treadmill",
        "weight_bench",
        "dumbbell_rack",
        "exercise_bike",
        "punching_bag",
        "rowing_machine",
        "kettlebell_rack",
        "yoga_mat",
      ].includes(item.type)
    ) {
      return false;
    }
    if (item.type === "door" || item.type === "wall") {
      return !intersectsRect(
        item,
        GYM_ROOM_X - 24,
        EAST_WING_ROOM_TOP_Y - 8,
        GYM_ROOM_X + 32,
        GYM_ROOM_BOTTOM_Y + 8,
      ) && !intersectsRect(
        item,
        GYM_ROOM_X - 8,
        GYM_ROOM_BOTTOM_Y - 24,
        GYM_ROOM_END_X + 8,
        GYM_ROOM_BOTTOM_Y + 16,
      );
    }
    return true;
  });

const stripQaLabItems = (items: FurnitureItem[]) =>
  items.filter((item) => {
    if (["qa_terminal", "device_rack", "test_bench"].includes(item.type)) {
      return false;
    }
    if (item.type === "door" || item.type === "wall") {
      return !intersectsRect(
        item,
        QA_LAB_X - 24,
        QA_LAB_TOP_Y - 8,
        QA_LAB_X + 32,
        QA_LAB_BOTTOM_Y + 8,
      );
    }
    return true;
  });

const stripServerRoomItems = (items: FurnitureItem[]) =>
  items.filter((item) => {
    if (item.type === "server_rack" || item.type === "server_terminal") {
      return false;
    }
    if (PREVIOUS_SERVER_ROOM_SIGNATURES.has(createFurnitureSignature(item))) {
      return false;
    }
    if (item.type === "door" || item.type === "wall") {
      const insideDefaultServerRoom = intersectsRect(item, -8, 552, 238, 732);
      const insidePreviousBottomRight = intersectsRect(item, 812, 532, 1108, 728);
      const insidePreviousTopRight = intersectsRect(item, 812, -8, 1108, 238);
      return !insideDefaultServerRoom && !insidePreviousBottomRight && !insidePreviousTopRight;
    }
    return true;
  });

const stripOfficeArtRoomAndRepositionAtm = (items: FurnitureItem[]): FurnitureItem[] => {
  const stripped = items.filter((item) => {
    if (PREVIOUS_ART_ROOM_SIGNATURES.has(createFurnitureSignature(item))) return false;
    if (item.type === "wall" || item.type === "door") {
      return !intersectsRect(item, 252, 32, 446, 278);
    }
    if (["easel", "lamp", "couch"].includes(item.type)) {
      return !intersectsRect(item, 248, 32, 446, 278);
    }
    return true;
  });

  const withoutAtm = stripped.filter((item) => item.type !== "atm");
  return [...withoutAtm, { ...DEFAULT_ATM_MACHINE, _uid: nextUid() }];
};

export const ensureOfficeNoPlants = (items: FurnitureItem[]): FurnitureItem[] =>
  items.filter((item) => item.type !== "plant");

export const ensureOfficeNoLamps = (items: FurnitureItem[]): FurnitureItem[] =>
  items.filter((item) => item.type !== "lamp");

export const ensureOfficePingPongTable = (
  items: FurnitureItem[],
): FurnitureItem[] => {
  if (items.some((item) => item.type === "pingpong")) return items;
  return [...items, { ...DEFAULT_PINGPONG_TABLE, _uid: nextUid() }];
};

export const ensureOfficeArtRoomRemoved = (
  items: FurnitureItem[],
): FurnitureItem[] => {
  const hasLegacyArtRoom = items.some((item) =>
    PREVIOUS_ART_ROOM_SIGNATURES.has(createFurnitureSignature(item)),
  );
  const hasOldAtmPosition = items.some(
    (item) => item.type === "atm" && item.x === 430 && item.y === 210,
  );
  if (!hasLegacyArtRoom && !hasOldAtmPosition && hasArtRoomRemovalMigrationApplied()) {
    return items;
  }
  return stripOfficeArtRoomAndRepositionAtm(items);
};

export const ensureOfficeAtm = (items: FurnitureItem[]): FurnitureItem[] => {
  const existingAtm = items.find((item) => item.type === "atm");
  if (existingAtm) {
    if (existingAtm.x === DEFAULT_ATM_MACHINE.x && existingAtm.y === DEFAULT_ATM_MACHINE.y && existingAtm.facing === DEFAULT_ATM_MACHINE.facing) {
      return items;
    }
    const withoutAtm = items.filter((item) => item.type !== "atm");
    return [...withoutAtm, { ...DEFAULT_ATM_MACHINE, _uid: nextUid() }];
  }
  if (hasAtmMigrationApplied()) return items;
  return [...items, { ...DEFAULT_ATM_MACHINE, _uid: nextUid() }];
};

export const ensureOfficeJukebox = (items: FurnitureItem[]): FurnitureItem[] => {
  if (items.some((item) => item.type === "jukebox")) return items;
  return [...items, { ...DEFAULT_JUKEBOX, _uid: nextUid() }];
};

export const ensureOfficePhoneBooth = (
  items: FurnitureItem[],
): FurnitureItem[] => {
  // Remove phone booths - they are no longer used
  return items.filter((item) => item.type !== "phone_booth");
};

export const ensureOfficeSmsBooth = (
  items: FurnitureItem[],
): FurnitureItem[] => {
  // SMS booths were removed from the default office experience.
  // Keep existing layouts clean by stripping any legacy booth instances.
  return items.filter((item) => item.type !== "sms_booth");
};

export const ensureOfficeServerRoom = (
  items: FurnitureItem[],
): FurnitureItem[] => {
  const hasDesiredServerRoom = hasAllSignatures(items, SERVER_ROOM_SIGNATURES) &&
    !items.some((item) => item.type === "server_terminal");
  if (hasDesiredServerRoom && hasServerRoomMigrationApplied()) {
    return items;
  }

  const hasPreviousServerRoom = items.some((item) =>
    PREVIOUS_SERVER_ROOM_SIGNATURES.has(createFurnitureSignature(item)),
  );
  const hasAnyServerRoomContent = items.some(
    (item) =>
      item.type === "server_rack" ||
      item.type === "server_terminal" ||
      PREVIOUS_SERVER_ROOM_SIGNATURES.has(createFurnitureSignature(item)) ||
      SERVER_ROOM_SIGNATURES.has(createFurnitureSignature(item)) ||
      ((item.type === "wall" || item.type === "door") &&
        (intersectsRect(item, -8, 552, 238, 732) ||
          intersectsRect(item, 812, 532, 1108, 728) ||
          intersectsRect(item, 812, -8, 1108, 238))),
  );

  if (!hasAnyServerRoomContent && hasServerRoomMigrationApplied()) {
    return items;
  }

  const stripped = stripServerRoomItems(items);
  const nextItems = [...stripped];

  if (hasPreviousServerRoom) {
    for (const diningItem of DEFAULT_DINING_ITEMS) {
      const hasDiningItem = nextItems.some(
        (item) =>
          createFurnitureSignature(item) ===
          createFurnitureSignature(diningItem),
      );
      if (!hasDiningItem) {
        nextItems.push({ ...diningItem, _uid: nextUid() });
      }
    }
  }

  return [
    ...nextItems,
    ...DEFAULT_SERVER_ROOM_ITEMS.map((item) => ({
      ...item,
      _uid: nextUid(),
    })),
  ];
};

export const ensureOfficeGymRoom = (
  items: FurnitureItem[],
): FurnitureItem[] => {
  const hasCurrentGymRoom = hasAllSignatures(items, GYM_ROOM_SIGNATURES);
  if (hasCurrentGymRoom) return items;

  const hasAnyGymRoomContent = items.some(
    (item) =>
      [
        "treadmill",
        "weight_bench",
        "dumbbell_rack",
        "exercise_bike",
        "punching_bag",
        "rowing_machine",
        "kettlebell_rack",
        "yoga_mat",
      ].includes(item.type) ||
      ((item.type === "wall" || item.type === "door") &&
        (intersectsRect(
          item,
          GYM_ROOM_X - 24,
          EAST_WING_ROOM_TOP_Y - 8,
          GYM_ROOM_X + 32,
          GYM_ROOM_BOTTOM_Y + 8,
        ) ||
          intersectsRect(
            item,
            GYM_ROOM_X - 8,
            GYM_ROOM_BOTTOM_Y - 24,
            GYM_ROOM_END_X + 8,
            GYM_ROOM_BOTTOM_Y + 16,
          ))),
  );

  if (hasAnyGymRoomContent || hasGymRoomMigrationApplied()) {
    return [
      ...stripGymRoomItems(items),
      ...DEFAULT_GYM_ITEMS.map((item) => ({ ...item, _uid: nextUid() })),
    ];
  }

  return [
    ...items,
    ...DEFAULT_GYM_ITEMS.map((item) => ({ ...item, _uid: nextUid() })),
  ];
};

export const ensureOfficeQaLab = (items: FurnitureItem[]): FurnitureItem[] => {
  const hasCurrentQaLab = hasAllSignatures(items, QA_LAB_SIGNATURES);
  if (hasCurrentQaLab) return items;

  const hasAnyQaLabContent = items.some(
    (item) =>
      ["qa_terminal", "device_rack", "test_bench"].includes(item.type) ||
      ((item.type === "wall" || item.type === "door") &&
        intersectsRect(
          item,
          QA_LAB_X - 24,
          QA_LAB_TOP_Y - 8,
          QA_LAB_X + 32,
          QA_LAB_BOTTOM_Y + 8,
        )),
  );

  if (hasAnyQaLabContent || hasQaLabMigrationApplied()) {
    return [
      ...stripQaLabItems(items),
      ...DEFAULT_QA_LAB_ITEMS.map((item) => ({ ...item, _uid: nextUid() })),
    ];
  }

  return [
    ...items,
    ...DEFAULT_QA_LAB_ITEMS.map((item) => ({ ...item, _uid: nextUid() })),
  ];
};
