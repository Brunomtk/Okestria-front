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
  x: 40,
  y: 50,
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
  y: 380,
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

// Kitchen dining table was removed from the office layout. Keeping the name
// empty preserves the legacy server-room migration path without re-adding it.
const DEFAULT_DINING_ITEMS: FurnitureSeed[] = [];

// SERVER ROOM v36 — east wall ALIGNED with the meeting room east wall (cx=315 · cy=560..720).
// Still only 2 server racks (kept compact), but the east wall now continues in the same
// vertical line as the meeting room's east wall for a clean, unified partition.
const DEFAULT_SERVER_ROOM_ITEMS: FurnitureSeed[] = [
  // North wall (full width of the server room, reaching the east wall at cx=315)
  { type: "wall", x: 0, y: 560, w: 323, h: WALL_THICKNESS },
  // East wall (top half + bottom half with door gap between) — aligned with meeting room
  { type: "wall", x: 315, y: 560, w: WALL_THICKNESS, h: 60 },
  {
    type: "door",
    x: 299,
    y: 630,
    w: DOOR_LENGTH,
    h: DOOR_THICKNESS,
    facing: 90,
  },
  { type: "wall", x: 315, y: 660, w: WALL_THICKNESS, h: 60 },
  // 2 server racks tight to the north wall, spaced further apart now that the room is wider
  { type: "server_rack", x: 80, y: 580, facing: 0 },
  { type: "server_rack", x: 200, y: 580, facing: 0 },
  // Single admin terminal along the south wall (walkable aisle)
  { type: "server_terminal", x: 140, y: 685, facing: 0 },
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

const DEFAULT_GYM_ITEMS: FurnitureSeed[] = [
  // === GYM WALLS ===
  { type: "wall", x: GYM_ROOM_X, y: EAST_WING_ROOM_TOP_Y, w: WALL_THICKNESS, h: GYM_TOP_WALL_HEIGHT },
  createVerticalWallDoor(GYM_ROOM_X, EAST_WING_DOOR_Y),
  { type: "wall", x: GYM_ROOM_X, y: GYM_DOOR_BOTTOM_Y, w: WALL_THICKNESS, h: GYM_BOTTOM_WALL_HEIGHT },
  { type: "wall", x: GYM_ROOM_X, y: GYM_ROOM_BOTTOM_Y - WALL_THICKNESS, w: GYM_ROOM_WIDTH, h: WALL_THICKNESS },

  // === ROW 1 — CARDIO + LIFTING (top, y≈20) ===
  // 3 treadmills (58x30, facing 90 → visual 30×58)
  { type: "treadmill",      x: GYM_ROOM_X + 30,  y: EAST_WING_ROOM_TOP_Y + 34, facing: 90 },
  { type: "treadmill",      x: GYM_ROOM_X + 90,  y: EAST_WING_ROOM_TOP_Y + 34, facing: 90 },
  { type: "treadmill",      x: GYM_ROOM_X + 150, y: EAST_WING_ROOM_TOP_Y + 34, facing: 90 },
  // 1 squat rack (user-specified absolute position: 1380, 20, facing 270°)
  { type: "squat_rack",     x: 1380, y: 20, facing: 270 },
  // 2 weight benches — replacing the rowing machines (90x45 → flat bench for supino)
  // facing 90 so the bench runs perpendicular (user example: 1530, 20, 90°)
  { type: "weight_bench",   x: GYM_ROOM_X + 380, y: EAST_WING_ROOM_TOP_Y + 20, facing: 90 },
  { type: "weight_bench",   x: GYM_ROOM_X + 455, y: EAST_WING_ROOM_TOP_Y + 20, facing: 90 },

  // Corner floor speakers + wall clock (top wall decor)
  { type: "speaker", x: GYM_ROOM_X + 14,  y: EAST_WING_ROOM_TOP_Y + 14 },
  { type: "clock",   x: GYM_ROOM_X + 345, y: EAST_WING_ROOM_TOP_Y + 4 },
  { type: "speaker", x: GYM_ROOM_X + 686, y: EAST_WING_ROOM_TOP_Y + 14 },

  // === ROW 2 — FREE WEIGHTS + PLATE STORAGE (user-specified absolute positions) ===
  // Dumbbells (two racks) – evenly spaced on the left half, facing 0°
  { type: "dumbbell_rack",   x: 1160, y: 130, facing: 0 },
  { type: "dumbbell_rack",   x: 1260, y: 130, facing: 0 },
  // Kettlebells – next in the row
  { type: "kettlebell_rack", x: 1360, y: 130, facing: 0 },
  // Plate racks – rotated 270° to form a vertical weight-storage strip
  { type: "plate_rack",      x: 1460, y: 140, facing: 270 },
  { type: "plate_rack",      x: 1520, y: 140, facing: 270 },

  // === DEADLIFT PLATFORM (user-specified absolute 1640, 90, facing 270°) ===
  // 150×80 footprint — with facing 270 it visually spans 80 wide × 150 tall on the right side
  { type: "deadlift_platform", x: 1640, y: 90, facing: 270 },

  // === CABLE CROSSOVERS — two functional trainers along the south strip ===
  // User-specified absolute positions: 1510,260 and 1620,260 (both facing 0°)
  { type: "cable_crossover", x: 1510, y: 260, facing: 0 },
  { type: "cable_crossover", x: 1620, y: 260, facing: 0 },

  // === ROW 3 — STRETCHING / YOGA (shifted LEFT & DOWN per user request) ===
  { type: "yoga_mat", x: GYM_ROOM_X + 15,  y: EAST_WING_ROOM_TOP_Y + 235, facing: 0, color: "#0f766e" },
  { type: "yoga_mat", x: GYM_ROOM_X + 100, y: EAST_WING_ROOM_TOP_Y + 235, facing: 0, color: "#7c3aed" },
  { type: "yoga_mat", x: GYM_ROOM_X + 185, y: EAST_WING_ROOM_TOP_Y + 235, facing: 0, color: "#0891b2" },
  { type: "yoga_mat", x: GYM_ROOM_X + 270, y: EAST_WING_ROOM_TOP_Y + 235, facing: 0, color: "#dc2626" },

  // === ROW 5 — AMENITIES (bottom wall, flush, facing 180 = toward yoga area) ===
  // Bottom wall: y = 352..360. Items flush: item_top = 352 - item_height
  // Left bench at 1090 (GYM_ROOM_X+15) ends at 1170 (GYM_ROOM_X+95)
  // Right bench at GYM_ROOM_X+450 starts at 1525
  // Fill with 8 lockers at 42-spacing, covering GYM_ROOM_X+110..404 (absolute 1185..1544)
  { type: "locker", x: GYM_ROOM_X + 110, y: EAST_WING_ROOM_TOP_Y + 300, facing: 180 },
  { type: "locker", x: GYM_ROOM_X + 152, y: EAST_WING_ROOM_TOP_Y + 300, facing: 180 },
  { type: "locker", x: GYM_ROOM_X + 194, y: EAST_WING_ROOM_TOP_Y + 300, facing: 180 },
  { type: "locker", x: GYM_ROOM_X + 236, y: EAST_WING_ROOM_TOP_Y + 300, facing: 180 },
  { type: "locker", x: GYM_ROOM_X + 278, y: EAST_WING_ROOM_TOP_Y + 300, facing: 180 },
  { type: "locker", x: GYM_ROOM_X + 320, y: EAST_WING_ROOM_TOP_Y + 300, facing: 180 },
  { type: "locker", x: GYM_ROOM_X + 362, y: EAST_WING_ROOM_TOP_Y + 300, facing: 180 },
  { type: "locker", x: GYM_ROOM_X + 404, y: EAST_WING_ROOM_TOP_Y + 300, facing: 180 },

  // Bench seat at user-specified absolute 1090, 310, facing 180
  // (right-side bench removed per user request)
  { type: "bench_seat", x: 1090, y: 310, facing: 180 },

  // Trash bin along bottom wall (water_cooler + first_aid removed per user request)
  { type: "trash",        x: GYM_ROOM_X + 566, y: EAST_WING_ROOM_TOP_Y + 330 },

  // === PLANTS (pushed against left wall, rotated toward yoga mats) ===
  // Left wall at x=GYM_ROOM_X..+8 → plants flush at x+12
  { type: "plant", x: GYM_ROOM_X + 12,  y: EAST_WING_ROOM_TOP_Y + 90,  facing: 90 },
  { type: "plant", x: GYM_ROOM_X + 12,  y: EAST_WING_ROOM_TOP_Y + 210, facing: 90 },
];

const DEFAULT_QA_LAB_ITEMS: FurnitureSeed[] = [
  // === QA LAB WALLS — Front (left) wall with door. Right side meets canvas edge. ===
  { type: "wall", x: QA_LAB_X, y: QA_LAB_TOP_Y, w: WALL_THICKNESS, h: QA_LAB_TOP_WALL_HEIGHT },
  createVerticalWallDoor(QA_LAB_X, QA_LAB_DOOR_Y),
  { type: "wall", x: QA_LAB_X, y: QA_LAB_DOOR_BOTTOM_Y, w: WALL_THICKNESS, h: QA_LAB_BOTTOM_WALL_HEIGHT_CALC },
  { type: "wall", x: QA_LAB_X, y: QA_LAB_BOTTOM_Y - WALL_THICKNESS, w: QA_LAB_END_X - QA_LAB_X, h: WALL_THICKNESS },

  // === ROW 1 — QA TERMINALS (top row, 4 workstations evenly spaced) ===
  // qa_terminal footprint 54×38 • facing 180° so monitors face south into the room
  { type: "qa_terminal", x: 1110, y: QA_LAB_TOP_Y + 30, facing: 180 },
  { type: "qa_terminal", x: 1270, y: QA_LAB_TOP_Y + 30, facing: 180 },
  { type: "qa_terminal", x: 1430, y: QA_LAB_TOP_Y + 30, facing: 180 },
  { type: "qa_terminal", x: 1590, y: QA_LAB_TOP_Y + 30, facing: 180 },

  // === ROW 2 — TEST BENCHES (middle row, 3 benches evenly spaced) ===
  // test_bench footprint 90×42 • facing 0° • clear of the entry door on the left wall
  { type: "test_bench", x: 1180, y: QA_LAB_TOP_Y + 130, facing: 0 },
  { type: "test_bench", x: 1370, y: QA_LAB_TOP_Y + 130, facing: 0 },
  { type: "test_bench", x: 1560, y: QA_LAB_TOP_Y + 130, facing: 0 },

  // === ROW 3 — DEVICE RACKS (along the bottom wall, 4 racks evenly spaced) ===
  // device_rack footprint 70×36 • facing 180° (back to south wall)
  { type: "device_rack", x: 1130, y: QA_LAB_TOP_Y + 260, facing: 180 },
  { type: "device_rack", x: 1290, y: QA_LAB_TOP_Y + 260, facing: 180 },
  { type: "device_rack", x: 1470, y: QA_LAB_TOP_Y + 260, facing: 180 },
  { type: "device_rack", x: 1630, y: QA_LAB_TOP_Y + 260, facing: 180 },

  // === PLANTS — corner accents ===
  { type: "plant", x: QA_LAB_X + 14, y: QA_LAB_TOP_Y + 90,  facing: 90 },
  { type: "plant", x: QA_LAB_X + 14, y: QA_LAB_TOP_Y + 210, facing: 90 },
  { type: "plant", x: 1770,          y: QA_LAB_TOP_Y + 10 },
  { type: "plant", x: 1770,          y: QA_LAB_TOP_Y + 320 },
];


const DEFAULT_FURNITURE: FurnitureSeed[] = [
  // === TOP-CENTER: ATM ===
  { type: "atm", x: 330, y: 10, facing: 0 },

  // === KITCHEN COUNTER (top-right) ===
  { type: "vending", x: 790, y: 12 },
  { type: "trash", x: 828, y: 26 },
  { type: "cabinet", x: 836, y: 28, w: 80, h: 40, elevation: 0 },
  { type: "coffee_machine", x: 884, y: 30, elevation: 0.56 },
  { type: "stove", x: 922, y: 20 },
  { type: "dishwasher", x: 952, y: 20, w: 40, h: 40 },
  { type: "sink", x: 974, y: 20 },
  { type: "cabinet", x: 988, y: 30, w: 40, h: 40, elevation: 0 },
  { type: "microwave", x: 1034, y: 10, facing: 0 },
  { type: "fridge", x: 1052, y: 18, w: 40, h: 80 },
  { type: "wall_cabinet", x: 878, y: 10, w: 80, h: 20, elevation: 0.9 },
  { type: "wall_cabinet", x: 960, y: 10, w: 80, h: 20, elevation: 0.9 },

  // === MEETING ROOM (expanded — cx=0..315 · cy=0..560, nearly touching ATM at cx=330) ===
  // East wall at cx=315 separates room from open office, with a centered door at cy=280.
  // North/west edges are canvas boundary; south edge shares server's north wall at cy=560.
  { type: "wall", x: 315, y: 0, w: 8, h: 260 },
  { type: "door", x: 299, y: 276, w: 40, h: 8, facing: 90 },
  { type: "wall", x: 315, y: 300, w: 8, h: 260 },
  // Rectangular conference table — shortened so the two end chairs at y=60 and y=430 (user-specified) fit cleanly.
  // Table footprint: cx=77..237 (w=160) · cy=100..418 (h=318); 16px clearance from each end chair.
  { type: "conference_table", x: 77, y: 100, w: 160, h: 318 },
  // 2 end chairs — flipped so they face INTO the table (was facing away before).
  // North end chair faces south (180°) into the table; south end chair faces north (0°).
  { type: "chair", x: 150, y: 60,  facing: 180 },
  { type: "chair", x: 150, y: 430, facing: 0 },
  // 10 side chairs — 5 west facing east, 5 east facing west — centered along the shorter table.
  // Table center y = 259. Chair centers offset ±0, ±60, ±120 → top-left y = 127, 187, 247, 307, 367.
  { type: "chair", x: 53,  y: 127, facing: 90 },
  { type: "chair", x: 53,  y: 187, facing: 90 },
  { type: "chair", x: 53,  y: 247, facing: 90 },
  { type: "chair", x: 53,  y: 307, facing: 90 },
  { type: "chair", x: 53,  y: 367, facing: 90 },
  { type: "chair", x: 237, y: 127, facing: 270 },
  { type: "chair", x: 237, y: 187, facing: 270 },
  { type: "chair", x: 237, y: 247, facing: 270 },
  { type: "chair", x: 237, y: 307, facing: 270 },
  { type: "chair", x: 237, y: 367, facing: 270 },

  // === OPEN-OFFICE DESKS — 3 rows × 4 desks, all facing the meeting room (chair on south, worker looks north) ===
  // Row 1 (desks at y=150, chairs at y=193) — ATM clears at cx=372 so desks start at cx=400
  { type: "desk_cubicle", x: 400, y: 150, id: "desk_0", facing: 180 },
  { type: "chair", x: 454, y: 193, facing: 0 },
  { type: "computer", x: 448, y: 200 },
  { type: "keyboard", x: 436, y: 199 },
  { type: "mouse", x: 429, y: 203 },
  { type: "trash", x: 406, y: 197 },
  { type: "desk_cubicle", x: 560, y: 150, id: "desk_1", facing: 180 },
  { type: "chair", x: 614, y: 193, facing: 0 },
  { type: "computer", x: 608, y: 200 },
  { type: "keyboard", x: 596, y: 199 },
  { type: "mouse", x: 589, y: 203 },
  { type: "trash", x: 566, y: 197 },
  { type: "desk_cubicle", x: 720, y: 150, id: "desk_2", facing: 180 },
  { type: "chair", x: 774, y: 193, facing: 0 },
  { type: "computer", x: 768, y: 200 },
  { type: "keyboard", x: 756, y: 199 },
  { type: "mouse", x: 749, y: 203 },
  { type: "trash", x: 726, y: 197 },
  { type: "desk_cubicle", x: 880, y: 150, id: "desk_3", facing: 180 },
  { type: "chair", x: 934, y: 193, facing: 0 },
  { type: "computer", x: 928, y: 200 },
  { type: "keyboard", x: 916, y: 199 },
  { type: "mouse", x: 909, y: 203 },
  { type: "trash", x: 886, y: 197 },

  // Row 2 (desks at y=310, chairs at y=353)
  { type: "desk_cubicle", x: 400, y: 310, id: "desk_4", facing: 180 },
  { type: "chair", x: 454, y: 353, facing: 0 },
  { type: "computer", x: 448, y: 360 },
  { type: "keyboard", x: 436, y: 359 },
  { type: "mouse", x: 429, y: 363 },
  { type: "trash", x: 406, y: 357 },
  { type: "desk_cubicle", x: 560, y: 310, id: "desk_5", facing: 180 },
  { type: "chair", x: 614, y: 353, facing: 0 },
  { type: "computer", x: 608, y: 360 },
  { type: "keyboard", x: 596, y: 359 },
  { type: "mouse", x: 589, y: 363 },
  { type: "trash", x: 566, y: 357 },
  { type: "desk_cubicle", x: 720, y: 310, id: "desk_6", facing: 180 },
  { type: "chair", x: 774, y: 353, facing: 0 },
  { type: "computer", x: 768, y: 360 },
  { type: "keyboard", x: 756, y: 359 },
  { type: "mouse", x: 749, y: 363 },
  { type: "trash", x: 726, y: 357 },
  { type: "desk_cubicle", x: 880, y: 310, id: "desk_7", facing: 180 },
  { type: "chair", x: 934, y: 353, facing: 0 },
  { type: "computer", x: 928, y: 360 },
  { type: "keyboard", x: 916, y: 359 },
  { type: "mouse", x: 909, y: 363 },
  { type: "trash", x: 886, y: 357 },

  // Row 3 (desks at y=470, chairs at y=513)
  { type: "desk_cubicle", x: 400, y: 470, id: "desk_8", facing: 180 },
  { type: "chair", x: 454, y: 513, facing: 0 },
  { type: "computer", x: 448, y: 520 },
  { type: "keyboard", x: 436, y: 519 },
  { type: "mouse", x: 429, y: 523 },
  { type: "trash", x: 406, y: 517 },
  { type: "desk_cubicle", x: 560, y: 470, id: "desk_9", facing: 180 },
  { type: "chair", x: 614, y: 513, facing: 0 },
  { type: "computer", x: 608, y: 520 },
  { type: "keyboard", x: 596, y: 519 },
  { type: "mouse", x: 589, y: 523 },
  { type: "trash", x: 566, y: 517 },
  { type: "desk_cubicle", x: 720, y: 470, id: "desk_10", facing: 180 },
  { type: "chair", x: 774, y: 513, facing: 0 },
  { type: "computer", x: 768, y: 520 },
  { type: "keyboard", x: 756, y: 519 },
  { type: "mouse", x: 749, y: 523 },
  { type: "trash", x: 726, y: 517 },
  { type: "desk_cubicle", x: 880, y: 470, id: "desk_11", facing: 180 },
  { type: "chair", x: 934, y: 513, facing: 0 },
  { type: "computer", x: 928, y: 520 },
  { type: "keyboard", x: 916, y: 519 },
  { type: "mouse", x: 909, y: 523 },
  { type: "trash", x: 886, y: 517 },

  // === SERVER ROOM v36 (aligned with meeting room east wall — cx=0..315 · cy=560..720) ===
  // East wall runs in the same vertical line as the meeting room east wall (cx=315).
  // Still only 2 server racks (compact) + 1 admin terminal, plenty of walking room.
  { type: "wall", x: 0, y: 560, w: 323, h: 8 },
  { type: "wall", x: 315, y: 560, w: 8, h: 60 },
  { type: "door", x: 299, y: 630, w: 40, h: 8, facing: 90 },
  { type: "wall", x: 315, y: 660, w: 8, h: 60 },
  { type: "server_rack", x: 80, y: 580, facing: 0 },
  { type: "server_rack", x: 200, y: 580, facing: 0 },
  { type: "server_terminal", x: 140, y: 685, facing: 0 },

  // === EAST-WING ENTRANCE WALLS (preserved) ===
  { type: "wall", x: 1075, y: 0, w: 8, h: 150 },
  { type: "door", x: 1059, y: 166, w: 40, h: 8, facing: 90 },
  { type: "wall", x: 1075, y: 190, w: 8, h: 170 },
  { type: "wall", x: 1075, y: 352, w: 720, h: 8 },
  { type: "wall", x: 1075, y: 360, w: 8, h: 140 },
  { type: "door", x: 1059, y: 516, w: 40, h: 8, facing: 90 },
  { type: "wall", x: 1075, y: 540, w: 8, h: 180 },

  // === GYM + QA LAB legacy seeds (overridden by ensureOfficeGymRoom / ensureOfficeQaLab) ===
  { type: "treadmill", x: 1120, y: 30, facing: 180 },
  { type: "treadmill", x: 1220, y: 30, facing: 0 },
  { type: "weight_bench", x: 1325, y: 44, facing: 90 },
  { type: "weight_bench", x: 1390, y: 44, facing: 90 },
  { type: "rowing_machine", x: 1510, y: 30, facing: 180 },
  { type: "rowing_machine", x: 1610, y: 30, facing: 0 },
  { type: "yoga_mat", x: 1135, y: 250, facing: 0, color: "#0f766e" },
  { type: "yoga_mat", x: 1235, y: 250, facing: 0, color: "#7c3aed" },
  { type: "yoga_mat", x: 1335, y: 250, facing: 0, color: "#0891b2" },
  { type: "exercise_bike", x: 1548, y: 248, facing: 90 },
  { type: "kettlebell_rack", x: 1450, y: 300, facing: 180 },
  { type: "dumbbell_rack", x: 1600, y: 300, facing: 180 },
  { type: "punching_bag", x: 1690, y: 110, facing: 0 },
  { type: "punching_bag", x: 1690, y: 242, facing: 0 },
  { type: "device_rack", x: 1588, y: 418, facing: 180 },
  { type: "device_rack", x: 1676, y: 418, facing: 180 },
  { type: "qa_terminal", x: 1580, y: 528, facing: 90 },
  { type: "qa_terminal", x: 1640, y: 528, facing: 90 },
  { type: "qa_terminal", x: 1700, y: 528, facing: 90 },
  { type: "device_rack", x: 1592, y: 620, facing: 180 },
  { type: "device_rack", x: 1680, y: 620, facing: 180 },
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
  // Ping pong table was removed from the default office layout.
  // Strip any legacy instances so existing sessions clean up on next load.
  return items.filter((item) => item.type !== "pingpong");
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
  // Jukebox removed from the default office layout — strip any legacy instances
  return items.filter((item) => item.type !== "jukebox");
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
