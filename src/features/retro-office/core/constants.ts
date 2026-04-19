export const DESK_STICKY_MS = 10_000;
export const SNAP_GRID = 10;
export const STORAGE_KEY = "openclaw-office-furniture-v13";
export const ATM_MIGRATION_KEY = "openclaw-office-atm-migration-v2";
export const ART_ROOM_REMOVAL_MIGRATION_KEY =
  "openclaw-office-art-room-removal-migration-v1";
export const SERVER_ROOM_MIGRATION_KEY =
  "openclaw-office-server-room-migration-v4";
export const GYM_ROOM_MIGRATION_KEY = "openclaw-office-gym-room-migration-v23";
export const QA_LAB_MIGRATION_KEY = "openclaw-office-qa-lab-migration-v15";
export const PHONE_BOOTH_MIGRATION_KEY_V2 = "openclaw-office-phone-booth-migration-v3";
export const PHONE_BOOTH_MIGRATION_KEY = "openclaw-office-phone-booth-migration-v1";
export const SMS_BOOTH_MIGRATION_KEY = "openclaw-office-sms-booth-migration-v1";
export const ROTATION_STEP_DEG = 15;
export const WALL_THICKNESS = 8;
export const DOOR_THICKNESS = 8;
export const DOOR_LENGTH = 40;
export const MIN_WALL_LENGTH = SNAP_GRID * 2;
export const ELEVATION_STEP = 0.08;
export const WALK_SPEED = 0.9;
export const WORKING_WALK_SPEED_MULTIPLIER = 3;
export const WALK_ANIM_SPEED = 0.45;
export const AGENT_SCALE = 1.75;
export const BUMP_FREEZE_MS = 1500;
export const BUMP_RECOVERY_MS = 1200;
export const AGENT_RADIUS = 20;
export const SEPARATION_STRENGTH = 3;
export const CANVAS_W = 1800;
export const CANVAS_H = 1800;
// East wing rooms - Gym and QA Lab
// Rooms stacked vertically, touching canvas edges (right and bottom)
export const EAST_WING_START_X = 1075; // Left edge of rooms (entrance wall)
export const EAST_WING_SIDE_MARGIN = 0;
export const EAST_WING_ROOM_TOP_Y = 0; // Gym starts at top (aligned with office)
export const EAST_WING_ROOM_HEIGHT = 360; // Each room height
export const EAST_HALL_WIDTH = 0; // No hall - rooms stacked
export const EAST_WING_SPECIALTY_ROOM_WIDTH = 720; // Width to canvas edge (1080 + 720 = 1800)
export const GYM_ROOM_X = EAST_WING_START_X + EAST_WING_SIDE_MARGIN;
export const GYM_ROOM_WIDTH = EAST_WING_SPECIALTY_ROOM_WIDTH;
export const GYM_ROOM_END_X = GYM_ROOM_X + GYM_ROOM_WIDTH; // = 1800 (canvas edge)
// QA Lab is below Gym
export const QA_LAB_X = GYM_ROOM_X; // Same X as Gym
export const QA_LAB_WIDTH = GYM_ROOM_WIDTH; // Same width as Gym
export const QA_LAB_END_X = QA_LAB_X + QA_LAB_WIDTH ; // = 1800 (canvas edge)
export const QA_LAB_TOP_Y = EAST_WING_ROOM_TOP_Y + EAST_WING_ROOM_HEIGHT ; // Directly below gym (40+345=385)
export const QA_LAB_BOTTOM_Y = QA_LAB_TOP_Y + EAST_WING_ROOM_HEIGHT; // = 730 (near canvas bottom 720)
export const EAST_WING_DOOR_Y = EAST_WING_ROOM_TOP_Y + 150; // Door position for gym (y=180)
export const QA_LAB_DOOR_Y = QA_LAB_TOP_Y + 140; // Door position for QA lab
export const SCALE = 0.018;
export const WORLD_W = CANVAS_W * SCALE;
export const WORLD_H = CANVAS_H * SCALE;
export const PING_PONG_SESSION_MS = 60_000;
export const PING_PONG_APPROACH_SPEED = WALK_SPEED * 1.8;
export const PING_PONG_BALL_RADIUS = 0.055;
export const PING_PONG_TABLE_SURFACE_Y = 0.465;
