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
  x: 720,
  y: 500,
  w: 120,
  h: 70,
};

const DEFAULT_ATM_MACHINE: FurnitureSeed = {
  type: "atm",
  x: 250,
  y: 8,
  facing: 180,
};



const DEFAULT_SMS_BOOTH: FurnitureSeed = {
  type: "sms_booth",
  x: 700,
  y: 72,
  facing: 0,
};

const DEFAULT_JUKEBOX: FurnitureSeed = {
  type: "jukebox",
  x: 880,
  y: 480,
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
  // Mesa de refeições na área da cozinha
  { type: "round_table", x: 920, y: 120, r: 50 },
  { type: "chair", x: 970, y: 100, facing: 0 },
  { type: "chair", x: 970, y: 150, facing: 180 },
  { type: "chair", x: 870, y: 100, facing: 90 },
  { type: "chair", x: 870, y: 150, facing: 270 },
];

const DEFAULT_SERVER_ROOM_ITEMS: FurnitureSeed[] = [
  // Paredes da sala de servidores (canto inferior esquerdo)
  { type: "wall", x: 0, y: 640, w: 200, h: WALL_THICKNESS },
  { type: "wall", x: 192, y: 640, w: WALL_THICKNESS, h: 50 },
  {
    type: "door",
    x: 182,
    y: 700,
    w: DOOR_LENGTH,
    h: DOOR_THICKNESS,
    facing: 90,
  },
  { type: "wall", x: 192, y: 730, w: WALL_THICKNESS, h: 70 },
  // Racks de servidor
  { type: "server_rack", x: 30, y: 680, facing: 0 },
  { type: "server_rack", x: 90, y: 680, facing: 0 },
  { type: "server_rack", x: 150, y: 680, facing: 0 },
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
  // === PAREDES DO GYM - Parede frontal com porta ===
  { type: "wall", x: GYM_ROOM_X, y: EAST_WING_ROOM_TOP_Y, w: WALL_THICKNESS, h: GYM_TOP_WALL_HEIGHT },
  createVerticalWallDoor(GYM_ROOM_X, EAST_WING_DOOR_Y),
  { type: "wall", x: GYM_ROOM_X, y: GYM_DOOR_BOTTOM_Y, w: WALL_THICKNESS, h: GYM_BOTTOM_WALL_HEIGHT },
  // Parede divisória entre Gym e QA Lab
  { type: "wall", x: GYM_ROOM_X, y: GYM_ROOM_BOTTOM_Y - WALL_THICKNESS, w: GYM_ROOM_WIDTH, h: WALL_THICKNESS },
  
  // === EQUIPAMENTOS DE CARDIO (Fileira superior) ===
  { type: "treadmill", x: GYM_ROOM_X + 80, y: EAST_WING_ROOM_TOP_Y + 40, facing: 90 },
  { type: "treadmill", x: GYM_ROOM_X + 180, y: EAST_WING_ROOM_TOP_Y + 40, facing: 90 },
  { type: "exercise_bike", x: GYM_ROOM_X + 280, y: EAST_WING_ROOM_TOP_Y + 40, facing: 90 },
  { type: "exercise_bike", x: GYM_ROOM_X + 380, y: EAST_WING_ROOM_TOP_Y + 40, facing: 90 },
  { type: "rowing_machine", x: GYM_ROOM_X + 500, y: EAST_WING_ROOM_TOP_Y + 40, facing: 90 },
  
  // === ÁREA DE MUSCULAÇÃO (Fileira central) ===
  { type: "weight_bench", x: GYM_ROOM_X + 80, y: EAST_WING_ROOM_TOP_Y + 140, facing: 90 },
  { type: "weight_bench", x: GYM_ROOM_X + 180, y: EAST_WING_ROOM_TOP_Y + 140, facing: 90 },
  { type: "dumbbell_rack", x: GYM_ROOM_X + 300, y: EAST_WING_ROOM_TOP_Y + 140, facing: 180 },
  { type: "kettlebell_rack", x: GYM_ROOM_X + 420, y: EAST_WING_ROOM_TOP_Y + 140, facing: 180 },
  { type: "punching_bag", x: GYM_ROOM_X + 550, y: EAST_WING_ROOM_TOP_Y + 120, facing: 0 },
  
  // === ÁREA DE FLEXIBILIDADE (Fileira inferior) ===
  { type: "yoga_mat", x: GYM_ROOM_X + 80, y: EAST_WING_ROOM_TOP_Y + 260, facing: 0, color: "#0f766e" },
  { type: "yoga_mat", x: GYM_ROOM_X + 180, y: EAST_WING_ROOM_TOP_Y + 260, facing: 0, color: "#7c3aed" },
  { type: "yoga_mat", x: GYM_ROOM_X + 280, y: EAST_WING_ROOM_TOP_Y + 260, facing: 0, color: "#0891b2" },
  { type: "yoga_mat", x: GYM_ROOM_X + 380, y: EAST_WING_ROOM_TOP_Y + 260, facing: 0, color: "#ec4899" },
];

const DEFAULT_QA_LAB_ITEMS: FurnitureSeed[] = [
  // === PAREDES DO QA LAB - Parede frontal com porta ===
  { type: "wall", x: QA_LAB_X, y: QA_LAB_TOP_Y, w: WALL_THICKNESS, h: QA_LAB_TOP_WALL_HEIGHT },
  createVerticalWallDoor(QA_LAB_X, QA_LAB_DOOR_Y),
  { type: "wall", x: QA_LAB_X, y: QA_LAB_DOOR_BOTTOM_Y, w: WALL_THICKNESS, h: QA_LAB_BOTTOM_WALL_HEIGHT_CALC },
  
  // === TERMINAIS DE QA (Fileira superior) ===
  { type: "qa_terminal", x: QA_LAB_X + 80, y: QA_LAB_TOP_Y + 40, facing: 90 },
  { type: "qa_terminal", x: QA_LAB_X + 180, y: QA_LAB_TOP_Y + 40, facing: 90 },
  { type: "qa_terminal", x: QA_LAB_X + 280, y: QA_LAB_TOP_Y + 40, facing: 90 },
  { type: "qa_terminal", x: QA_LAB_X + 380, y: QA_LAB_TOP_Y + 40, facing: 90 },
  
  // === RACKS DE DISPOSITIVOS (Lado direito) ===
  { type: "device_rack", x: QA_LAB_X + 520, y: QA_LAB_TOP_Y + 40, facing: 180 },
  { type: "device_rack", x: QA_LAB_X + 620, y: QA_LAB_TOP_Y + 40, facing: 180 },
  { type: "device_rack", x: QA_LAB_X + 520, y: QA_LAB_TOP_Y + 140, facing: 180 },
  { type: "device_rack", x: QA_LAB_X + 620, y: QA_LAB_TOP_Y + 140, facing: 180 },
  
  // === BANCADAS DE TESTE (Fileira inferior) ===
  { type: "test_bench", x: QA_LAB_X + 80, y: QA_LAB_TOP_Y + 150, facing: 90 },
  { type: "test_bench", x: QA_LAB_X + 180, y: QA_LAB_TOP_Y + 150, facing: 90 },
  { type: "test_bench", x: QA_LAB_X + 80, y: QA_LAB_TOP_Y + 260, facing: 90 },
  { type: "test_bench", x: QA_LAB_X + 180, y: QA_LAB_TOP_Y + 260, facing: 90 },
  { type: "test_bench", x: QA_LAB_X + 280, y: QA_LAB_TOP_Y + 260, facing: 90 },
];


const DEFAULT_FURNITURE: FurnitureSeed[] = [
  // ============================================================
  // ZONA DE RECEPÇÃO E ENTRADA (Canto superior esquerdo)
  // ============================================================
  // Mesa de reunião redonda com cadeiras
  { type: "round_table", x: 120, y: 100, r: 70 },
  { type: "chair", x: 190, y: 100, facing: 0 },
  { type: "chair", x: 120, y: 170, facing: 180 },
  { type: "chair", x: 50, y: 100, facing: 90 },
  { type: "chair", x: 120, y: 30, facing: 270 },
  // Quadro branco para brainstorming
  { type: "whiteboard", x: 10, y: 180, w: 10, h: 80 },

  // ============================================================
  // ESCRITÓRIO EXECUTIVO (Área central superior)
  // ============================================================
  { type: "executive_desk", x: 320, y: 50, w: 140, h: 70 },
  { type: "chair", x: 460, y: 60, facing: 0 },
  { type: "bookshelf", x: 480, y: 10, w: 80, h: 100 },
  { type: "clock", x: 540, y: 8 },
  { type: "trash", x: 300, y: 40 },

  // ============================================================
  // ATM (Acesso rápido)
  // ============================================================
  { type: "atm", x: 250, y: 8, facing: 180 },

  // ============================================================
  // COZINHA E REFEITÓRIO (Canto superior direito)
  // ============================================================
  // Bancada de cozinha
  { type: "cabinet", x: 780, y: 10, w: 100, h: 40, elevation: 0 },
  { type: "coffee_machine", x: 790, y: 15, elevation: 0.56 },
  { type: "stove", x: 830, y: 15 },
  { type: "sink", x: 870, y: 15 },
  { type: "dishwasher", x: 910, y: 15, w: 40, h: 40 },
  { type: "microwave", x: 960, y: 10, facing: 0 },
  { type: "fridge", x: 1000, y: 10, w: 40, h: 80 },
  { type: "wall_cabinet", x: 780, y: 5, w: 100, h: 20, elevation: 0.9 },
  { type: "wall_cabinet", x: 900, y: 5, w: 80, h: 20, elevation: 0.9 },
  // Máquina de venda
  { type: "vending", x: 720, y: 12 },
  { type: "trash", x: 760, y: 50 },
  // Mesa de refeições
  ...DEFAULT_DINING_ITEMS,

  // ============================================================
  // ÁREA DE TRABALHO - FILEIRA 1 (4 estações)
  // ============================================================
  { type: "desk_cubicle", x: 60, y: 280, id: "desk_0" },
  { type: "chair", x: 82, y: 268, facing: 180 },
  { type: "computer", x: 82, y: 265 },
  { type: "keyboard", x: 94, y: 272 },
  { type: "mouse", x: 115, y: 272 },

  { type: "desk_cubicle", x: 220, y: 280, id: "desk_1" },
  { type: "chair", x: 242, y: 268, facing: 180 },
  { type: "computer", x: 242, y: 265 },
  { type: "keyboard", x: 254, y: 272 },
  { type: "mouse", x: 275, y: 272 },

  { type: "desk_cubicle", x: 380, y: 280, id: "desk_2" },
  { type: "chair", x: 402, y: 268, facing: 180 },
  { type: "computer", x: 402, y: 265 },
  { type: "keyboard", x: 414, y: 272 },
  { type: "mouse", x: 435, y: 272 },

  { type: "desk_cubicle", x: 540, y: 280, id: "desk_3" },
  { type: "chair", x: 562, y: 268, facing: 180 },
  { type: "computer", x: 562, y: 265 },
  { type: "keyboard", x: 574, y: 272 },
  { type: "mouse", x: 595, y: 272 },

  // ============================================================
  // ÁREA DE TRABALHO - FILEIRA 2 (4 estações)
  // ============================================================
  { type: "desk_cubicle", x: 60, y: 420, id: "desk_4" },
  { type: "chair", x: 82, y: 408, facing: 180 },
  { type: "computer", x: 82, y: 405 },
  { type: "keyboard", x: 94, y: 412 },
  { type: "mouse", x: 115, y: 412 },

  { type: "desk_cubicle", x: 220, y: 420, id: "desk_5" },
  { type: "chair", x: 242, y: 408, facing: 180 },
  { type: "computer", x: 242, y: 405 },
  { type: "keyboard", x: 254, y: 412 },
  { type: "mouse", x: 275, y: 412 },

  { type: "desk_cubicle", x: 380, y: 420, id: "desk_6" },
  { type: "chair", x: 402, y: 408, facing: 180 },
  { type: "computer", x: 402, y: 405 },
  { type: "keyboard", x: 414, y: 412 },
  { type: "mouse", x: 435, y: 412 },

  { type: "desk_cubicle", x: 540, y: 420, id: "desk_7" },
  { type: "chair", x: 562, y: 408, facing: 180 },
  { type: "computer", x: 562, y: 405 },
  { type: "keyboard", x: 574, y: 412 },
  { type: "mouse", x: 595, y: 412 },

  // ============================================================
  // ÁREA DE TRABALHO - FILEIRA 3 (4 estações)
  // ============================================================
  { type: "desk_cubicle", x: 60, y: 560, id: "desk_8" },
  { type: "chair", x: 82, y: 548, facing: 180 },
  { type: "computer", x: 82, y: 545 },
  { type: "keyboard", x: 94, y: 552 },
  { type: "mouse", x: 115, y: 552 },

  { type: "desk_cubicle", x: 220, y: 560, id: "desk_9" },
  { type: "chair", x: 242, y: 548, facing: 180 },
  { type: "computer", x: 242, y: 545 },
  { type: "keyboard", x: 254, y: 552 },
  { type: "mouse", x: 275, y: 552 },

  { type: "desk_cubicle", x: 380, y: 560, id: "desk_10" },
  { type: "chair", x: 402, y: 548, facing: 180 },
  { type: "computer", x: 402, y: 545 },
  { type: "keyboard", x: 414, y: 552 },
  { type: "mouse", x: 435, y: 552 },

  { type: "desk_cubicle", x: 540, y: 560, id: "desk_11" },
  { type: "chair", x: 562, y: 548, facing: 180 },
  { type: "computer", x: 562, y: 545 },
  { type: "keyboard", x: 574, y: 552 },
  { type: "mouse", x: 595, y: 552 },

  // ============================================================
  // ÁREA DE DESCANSO E LAZER (Lado direito central)
  // ============================================================
  // Lounge com sofás
  { type: "couch", x: 720, y: 280, w: 120, h: 45 },
  { type: "couch", x: 720, y: 380, w: 120, h: 45 },
  { type: "table_rect", x: 750, y: 330, w: 60, h: 40, facing: 0 },
  // Puffs coloridos
  { type: "beanbag", x: 870, y: 290, color: "#e65100", facing: 90 },
  { type: "beanbag", x: 870, y: 370, color: "#1565c0", facing: 90 },
  { type: "beanbag", x: 930, y: 330, color: "#7c3aed", facing: 0 },

  // ============================================================
  // ÁREA DE JOGOS (Parte inferior direita)
  // ============================================================
  // Mesa de ping pong
  { type: "pingpong", x: 720, y: 500, w: 120, h: 70 },
  // Jukebox para música
  { type: "jukebox", x: 880, y: 480, facing: 90 },

  // ============================================================
  // SERVER ROOM (Canto inferior esquerdo)
  // ============================================================
  ...DEFAULT_SERVER_ROOM_ITEMS,

  // ============================================================
  // GYM ROOM (Ala leste - parte superior)
  // ============================================================
  ...DEFAULT_GYM_ITEMS,

  // ============================================================
  // QA LAB (Ala leste - parte inferior)
  // ============================================================
  ...DEFAULT_QA_LAB_ITEMS,
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
      // Nova posição da server room (canto inferior esquerdo): y: 632-800, x: -8-208
      const insideDefaultServerRoom = intersectsRect(item, -8, 632, 208, 808);
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
        (intersectsRect(item, -8, 632, 208, 808) ||
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
