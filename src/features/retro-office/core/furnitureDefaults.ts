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
  x: 872,
  y: 598,
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
  // 2 squat racks (48x48 square, facing 270 as requested)
  { type: "squat_rack",     x: GYM_ROOM_X + 220, y: EAST_WING_ROOM_TOP_Y + 20, facing: 270 },
  { type: "squat_rack",     x: GYM_ROOM_X + 278, y: EAST_WING_ROOM_TOP_Y + 20, facing: 270 },
  // 2 weight benches — replacing the rowing machines (90x45 → flat bench for supino)
  // facing 90 so the bench runs perpendicular (user example: 1530, 20, 90°)
  { type: "weight_bench",   x: GYM_ROOM_X + 380, y: EAST_WING_ROOM_TOP_Y + 20, facing: 90 },
  { type: "weight_bench",   x: GYM_ROOM_X + 455, y: EAST_WING_ROOM_TOP_Y + 20, facing: 90 },

  // Corner floor speakers + wall clock (top wall decor)
  { type: "speaker", x: GYM_ROOM_X + 14,  y: EAST_WING_ROOM_TOP_Y + 14 },
  { type: "clock",   x: GYM_ROOM_X + 345, y: EAST_WING_ROOM_TOP_Y + 4 },
  { type: "speaker", x: GYM_ROOM_X + 686, y: EAST_WING_ROOM_TOP_Y + 14 },

  // === ROW 2 — FREE WEIGHTS + PLATE STORAGE (middle, shifted left & down per user request) ===
  // Dumbbells and kettlebells on the left half
  { type: "dumbbell_rack",  x: GYM_ROOM_X + 30,  y: EAST_WING_ROOM_TOP_Y + 130, facing: 0 },
  { type: "dumbbell_rack",  x: GYM_ROOM_X + 130, y: EAST_WING_ROOM_TOP_Y + 130, facing: 0 },
  { type: "kettlebell_rack",x: GYM_ROOM_X + 230, y: EAST_WING_ROOM_TOP_Y + 132, facing: 0 },
  // 2 plate racks — shifted LEFT and DOWN (off the door zone, closer to deadlift vertical strip)
  { type: "plate_rack",     x: GYM_ROOM_X + 310, y: EAST_WING_ROOM_TOP_Y + 155, facing: 0 },
  { type: "plate_rack",     x: GYM_ROOM_X + 380, y: EAST_WING_ROOM_TOP_Y + 155, facing: 0 },

  // === DEADLIFT PLATFORM (user-specified absolute 1640, 120, facing 270°) ===
  // 150×80 footprint — with facing 270 it visually spans 80 wide × 150 tall on the right side
  { type: "deadlift_platform", x: 1640, y: 120, facing: 270 },

  // === NEW: CABLE CROSSOVER (functional trainer — left of the deadlift platform) ===
  // Two-tower cable station with weight stacks — pairs with deadlift for a powerlifting corner
  { type: "cable_crossover", x: GYM_ROOM_X + 460, y: EAST_WING_ROOM_TOP_Y + 130, facing: 90 },

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
  { type: "bench_seat", x: 1090, y: 310, facing: 180 },
  // Second bench seat on the right side for symmetry, same rotation
  { type: "bench_seat", x: GYM_ROOM_X + 450, y: 310, facing: 180 },

  // Trash bin along bottom wall (water_cooler + first_aid removed per user request)
  { type: "trash",        x: GYM_ROOM_X + 566, y: EAST_WING_ROOM_TOP_Y + 330 },

  // === PLANTS (pushed against left wall, rotated toward yoga mats) ===
  // Left wall at x=GYM_ROOM_X..+8 → plants flush at x+12
  { type: "plant", x: GYM_ROOM_X + 12,  y: EAST_WING_ROOM_TOP_Y + 90,  facing: 90 },
  { type: "plant", x: GYM_ROOM_X + 12,  y: EAST_WING_ROOM_TOP_Y + 210, facing: 90 },
];

const DEFAULT_QA_LAB_ITEMS: FurnitureSeed[] = [
  // === QA LAB WALLS - Only front wall with door ===
  // Front wall (left side) - above door
  { type: "wall", x: QA_LAB_X, y: QA_LAB_TOP_Y, w: WALL_THICKNESS, h: QA_LAB_TOP_WALL_HEIGHT },
  // Door on front wall (facing: 90 for vertical wall)
  createVerticalWallDoor(QA_LAB_X, QA_LAB_DOOR_Y),
  // Front wall - below door
  { type: "wall", x: QA_LAB_X, y: QA_LAB_DOOR_BOTTOM_Y, w: WALL_THICKNESS, h: QA_LAB_BOTTOM_WALL_HEIGHT_CALC },
  
  // === QA EQUIPMENT - Spread across the room ===
  // Row 1 - QA Terminals (near top)
  { type: "qa_terminal", x: QA_LAB_X + 60, y: QA_LAB_TOP_Y + 50, facing: 90 },
  { type: "qa_terminal", x: QA_LAB_X + 160, y: QA_LAB_TOP_Y + 50, facing: 90 },
  { type: "qa_terminal", x: QA_LAB_X + 260, y: QA_LAB_TOP_Y + 50, facing: 90 },
  { type: "qa_terminal", x: QA_LAB_X + 360, y: QA_LAB_TOP_Y + 50, facing: 90 },
  
  // Row 2 - Device racks
  { type: "device_rack", x: QA_LAB_X + 500, y: QA_LAB_TOP_Y + 50, facing: 180 },
  { type: "device_rack", x: QA_LAB_X + 600, y: QA_LAB_TOP_Y + 50, facing: 180 },
  { type: "device_rack", x: QA_LAB_X + 500, y: QA_LAB_TOP_Y + 150, facing: 180 },
  { type: "device_rack", x: QA_LAB_X + 600, y: QA_LAB_TOP_Y + 150, facing: 180 },
  
  // Row 3 - Test benches (bottom)
  { type: "test_bench", x: QA_LAB_X + 60, y: QA_LAB_TOP_Y + 150, facing: 90 },
  { type: "test_bench", x: QA_LAB_X + 160, y: QA_LAB_TOP_Y + 150, facing: 90 },
  { type: "test_bench", x: QA_LAB_X + 60, y: QA_LAB_TOP_Y + 250, facing: 90 },
  { type: "test_bench", x: QA_LAB_X + 160, y: QA_LAB_TOP_Y + 250, facing: 90 },
  { type: "test_bench", x: QA_LAB_X + 260, y: QA_LAB_TOP_Y + 250, facing: 90 },
  
];


const DEFAULT_FURNITURE: FurnitureSeed[] = [
  { type: "round_table", x: 50, y: 40, r: 68 },
  { type: "chair", x: 110, y: 40, facing: 0, elevation: 0 },
  { type: "chair", x: 160, y: 90, facing: 270, elevation: 0 },
  { type: "chair", x: 100, y: 150, facing: 180, elevation: 0 },
  { type: "chair", x: 50, y: 100, facing: 90, elevation: 0 },
  { type: "atm", x: 330, y: 10, facing: 0 },
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
  { type: "round_table", x: 830, y: 140, r: 52 },
  { type: "chair", x: 875, y: 96, facing: 0 },
  { type: "chair", x: 875, y: 240, facing: 180 },
  { type: "chair", x: 803, y: 168, facing: 90 },
  { type: "chair", x: 947, y: 168, facing: 270 },
  { type: "desk_cubicle", x: 110, y: 310, id: "desk_0" },
  { type: "chair", x: 132, y: 298, facing: 180 },
  { type: "computer", x: 132, y: 295 },
  { type: "keyboard", x: 144, y: 302 },
  { type: "mouse", x: 165, y: 302 },
  { type: "trash", x: 184, y: 298 },
  { type: "desk_cubicle", x: 306, y: 310, id: "desk_1" },
  { type: "chair", x: 328, y: 298, facing: 180 },
  { type: "computer", x: 328, y: 295 },
  { type: "keyboard", x: 340, y: 302 },
  { type: "mouse", x: 361, y: 302 },
  { type: "trash", x: 380, y: 298 },
  { type: "desk_cubicle", x: 502, y: 310, id: "desk_2" },
  { type: "chair", x: 524, y: 298, facing: 180 },
  { type: "computer", x: 524, y: 295 },
  { type: "keyboard", x: 536, y: 302 },
  { type: "mouse", x: 557, y: 302 },
  { type: "trash", x: 576, y: 298 },
  { type: "desk_cubicle", x: 698, y: 310, id: "desk_3" },
  { type: "chair", x: 720, y: 298, facing: 180 },
  { type: "computer", x: 720, y: 295 },
  { type: "keyboard", x: 732, y: 302 },
  { type: "mouse", x: 753, y: 302 },
  { type: "trash", x: 772, y: 298 },
  { type: "desk_cubicle", x: 110, y: 500, id: "desk_4" },
  { type: "chair", x: 132, y: 488, facing: 180 },
  { type: "computer", x: 132, y: 485 },
  { type: "keyboard", x: 144, y: 492 },
  { type: "mouse", x: 165, y: 492 },
  { type: "trash", x: 184, y: 488 },
  { type: "desk_cubicle", x: 306, y: 500, id: "desk_5" },
  { type: "chair", x: 328, y: 488, facing: 180 },
  { type: "computer", x: 328, y: 485 },
  { type: "keyboard", x: 340, y: 492 },
  { type: "mouse", x: 361, y: 492 },
  { type: "trash", x: 380, y: 488 },
  { type: "desk_cubicle", x: 502, y: 500, id: "desk_6" },
  { type: "chair", x: 524, y: 488, facing: 180 },
  { type: "computer", x: 524, y: 485 },
  { type: "keyboard", x: 536, y: 492 },
  { type: "mouse", x: 557, y: 492 },
  { type: "trash", x: 576, y: 488 },
  { type: "desk_cubicle", x: 698, y: 500, id: "desk_7" },
  { type: "chair", x: 720, y: 488, facing: 180 },
  { type: "computer", x: 720, y: 485 },
  { type: "keyboard", x: 732, y: 492 },
  { type: "mouse", x: 753, y: 492 },
  { type: "trash", x: 772, y: 488 },
  { type: "wall", x: 0, y: 560, w: 230, h: 8 },
  { type: "wall", x: 220, y: 560, w: 8, h: 60 },
  { type: "door", x: 210, y: 630, w: 40, h: 8, facing: 90 },
  { type: "wall", x: 220, y: 660, w: 8, h: 60 },
  { type: "server_rack", x: 42, y: 590, facing: 0 },
  { type: "server_rack", x: 102, y: 590, facing: 0 },
  { type: "pingpong", x: 872, y: 598, w: 108, h: 60 },
  { type: "wall", x: 1075, y: 0, w: 8, h: 150 },
  { type: "door", x: 1059, y: 166, w: 40, h: 8, facing: 90 },
  { type: "wall", x: 1075, y: 190, w: 8, h: 170 },
  { type: "wall", x: 1075, y: 352, w: 720, h: 8 },
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
  { type: "wall", x: 1075, y: 360, w: 8, h: 140 },
  { type: "door", x: 1059, y: 516, w: 40, h: 8, facing: 90 },
  { type: "wall", x: 1075, y: 540, w: 8, h: 180 },
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
