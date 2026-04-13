"use client";

import {
  Pencil,
  Check,
  Map as MapIcon,
  Monitor,
  Armchair,
  Settings2,
  Camera,
  UserPlus,
  UserRound,
  LogOut,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { SettingsPanel } from "@/features/office/components/panels/SettingsPanel";
import { AtmImmersiveScreen } from "@/features/office/screens/AtmImmersiveScreen";
import { GithubImmersiveScreen } from "@/features/office/screens/GithubImmersiveScreen";
import {
  PhoneBoothImmersiveScreen,
  type PhoneCallStep,
} from "@/features/office/screens/PhoneBoothImmersiveScreen";
import {
  SmsBoothImmersiveScreen,
  type TextMessageStep,
} from "@/features/office/screens/SmsBoothImmersiveScreen";
import { StandupImmersiveScreen } from "@/features/office/screens/StandupImmersiveScreen";
import type { OfficeUsageAnalyticsParams } from "@/features/office/hooks/useOfficeUsageAnalyticsViewModel";
import { buildMockPhoneCallScenario } from "@/lib/office/call/mock";
import type { MockPhoneCallScenario } from "@/lib/office/call/types";
import { buildMockTextMessageScenario } from "@/lib/office/text/mock";
import type { MockTextMessageScenario } from "@/lib/office/text/types";
import type { OfficeDeskMonitor } from "@/lib/office/deskMonitor";
import type { OfficeAnimationState } from "@/lib/office/eventTriggers";
import type { StandupMeeting } from "@/lib/office/standup/types";
import type { SkillStatusEntry } from "@/lib/skills/types";
import type { SquadSummary } from "@/lib/squads/api";
import { extractSpeechImage } from "@/lib/text/speech-image";
import { MonitorImmersiveContent as MonitorImmersiveOverlay } from "@/features/retro-office/overlays/MonitorImmersiveContent";
import {
  AGENT_RADIUS,
  BUMP_FREEZE_MS,
  BUMP_RECOVERY_MS,
  CANVAS_H,
  CANVAS_W,
  DESK_STICKY_MS,
  DOOR_LENGTH,
  DOOR_THICKNESS,
  ELEVATION_STEP,
  PING_PONG_APPROACH_SPEED,
  PING_PONG_SESSION_MS,
  ROTATION_STEP_DEG,
  SCALE,
  SEPARATION_STRENGTH,
  SNAP_GRID,
  WALK_SPEED,
  WALL_THICKNESS,
  WORKING_WALK_SPEED_MULTIPLIER,
} from "@/features/retro-office/core/constants";
import {
  ensureOfficeArtRoomRemoved,
  ensureOfficeAtm,
  ensureOfficeGymRoom,
  ensureOfficeNoLamps,
  ensureOfficeNoPlants,
  ensureOfficePhoneBooth,
  ensureOfficePingPongTable,
  ensureOfficeQaLab,
  ensureOfficeSmsBooth,
  ensureOfficeJukebox,
  ensureOfficeServerRoom,
  isRetiredPingPongLamp,
  materializeDefaults,
} from "@/features/retro-office/core/furnitureDefaults";
import {
  clampPointToZone,
  DISTRICT_CAMERA_POSITION,
  DISTRICT_CAMERA_TARGET,
  DISTRICT_CAMERA_ZOOM,
  LOCAL_OFFICE_CANVAS_HEIGHT,
  isRemoteOfficeAgentId,
  LOCAL_OFFICE_CANVAS_WIDTH,
  projectFurnitureIntoRemoteOfficeZone,
  REMOTE_OFFICE_ZONE,
  REMOTE_ROAM_POINTS,
} from "@/features/retro-office/core/district";
import {
  buildJanitorActorsForCue,
  pruneExpiredJanitorActors,
} from "@/features/retro-office/core/janitors";
import {
  createWallItem,
  getItemBaseSize,
  getItemRotationRadians,
  nextUid,
  normalizeDegrees,
  resolveItemTypeKey,
  snap,
  toWorld,
} from "@/features/retro-office/core/geometry";
import {
  buildNavGrid,
  getDeskLocations,
  getGymWorkoutLocations,
  getJanitorCleaningStops,
  getMeetingSeatLocations,
  getQaLabStations,
  GYM_DEFAULT_TARGET,
  MEETING_OVERFLOW_LOCATIONS,
  planOfficePath,
  projectPointToNavigable,
  QA_LAB_DEFAULT_TARGET,
  resolveDeskIndexForItem,
  resolveGymRoute,
  resolvePhoneBoothRoute,
  resolvePingPongTargets,
  resolveQaLabRoute,
  resolveSmsBoothRoute,
  resolveServerRoomRoute,
  ROAM_POINTS,
  SERVER_ROOM_TARGET,
} from "@/features/retro-office/core/navigation";
import {
  loadFurniture,
  markArtRoomRemovalMigrationApplied,
  markAtmMigrationApplied,
  markGymRoomMigrationApplied,
  markPhoneBoothMigrationApplied,
  markQaLabMigrationApplied,
  markSmsBoothMigrationApplied,
  markServerRoomMigrationApplied,
  saveFurniture,
} from "@/features/retro-office/core/persistence";
import type {
  FurnitureItem,
  JanitorActor,
  OfficeAgent,
  QaLabStationLocation,
  RenderAgent,
  SceneActor,
} from "@/features/retro-office/core/types";
import type { NavGrid } from "@/features/retro-office/core/navigation";
import type { OfficeLayoutSnapshot } from "@/lib/office/layoutSnapshot";
import {
  parseCompanyOfficeLayoutJson,
  serializeCompanyOfficeLayout,
} from "@/lib/office/companyLayout";
import { AgentModel as AgentObjectModel } from "@/features/retro-office/objects/agents";
import { JukeboxModel as InteractiveJukeboxModel } from "@/features/retro-office/objects/Jukebox";
import {
  FurnitureModel as GenericFurnitureModel,
  InstancedFurnitureItems as InstancedFurnitureItemsModel,
  PlacementGhost as FurniturePlacementGhost,
} from "@/features/retro-office/objects/furniture";
import {
  DishwasherModel as KitchenDishwasherModel,
  MicrowaveModel as KitchenMicrowaveModel,
  SinkModel as KitchenSinkModel,
  StoveModel as KitchenStoveModel,
  VendingMachineModel as KitchenVendingMachineModel,
  WallCabinetModel as KitchenWallCabinetModel,
} from "@/features/retro-office/objects/kitchen";
import {
  AtmMachineModel as InteractiveAtmMachineModel,
  DeviceRackModel as InteractiveDeviceRackModel,
  DumbbellRackModel as InteractiveDumbbellRackModel,
  ExerciseBikeModel as InteractiveExerciseBikeModel,
  KettlebellRackModel as InteractiveKettlebellRackModel,
  PingPongTableModel as MachinePingPongTableModel,
  PhoneBoothModel as InteractivePhoneBoothModel,
  PunchingBagModel as InteractivePunchingBagModel,
  QaTerminalModel as InteractiveQaTerminalModel,
  RowingMachineModel as InteractiveRowingMachineModel,
  ServerRackModel as InteractiveServerRackModel,
  ServerTerminalModel as InteractiveServerTerminalModel,
  SmsBoothModel as InteractiveSmsBoothModel,
  TestBenchModel as InteractiveTestBenchModel,
  TreadmillModel as InteractiveTreadmillModel,
  WeightBenchModel as InteractiveWeightBenchModel,
  YogaMatModel as InteractiveYogaMatModel,
} from "@/features/retro-office/objects/machines";
import {
  ClockModel as PrimitiveClockModel,
  DoorModel as PrimitiveDoorModel,
  InstancedWallSegmentsModel as PrimitiveInstancedWallSegmentsModel,
  KeyboardModel as PrimitiveKeyboardModel,
  MouseModel as PrimitiveMouseModel,
  MugModel as PrimitiveMugModel,
  RoundTableModel as PrimitiveRoundTableModel,
  TrashCanModel as PrimitiveTrashCanModel,
  WallSegmentModel as PrimitiveWallSegmentModel,
} from "@/features/retro-office/objects/primitives";
import {
  FloorAndWalls as SceneFloorAndWalls,
  WallPictures as SceneWallPictures,
} from "@/features/retro-office/scene/environment";
import {
  CAMERA_PRESETS as CAMERA_PRESET_MAP,
  CameraAnimator as CameraPresetAnimator,
  FollowCamController as FollowCamSystem,
} from "@/features/retro-office/systems/cameraLighting";
import type { CameraPreset } from "@/features/retro-office/systems/cameraLighting";
import {
  FloorRaycaster as SceneFloorRaycaster,
  GameLoop as SceneGameLoop,
  PingPongBall as ScenePingPongBall,
  SpotlightEffect as SceneSpotlightEffect,
} from "@/features/retro-office/systems/sceneRuntime";
import {
  DeskNameplates as DeskNameplateOverlay,
  HeatmapSystem as AgentHeatmapSystem,
} from "@/features/retro-office/systems/visualSystems";
import type { OfficeCleaningCue } from "@/lib/office/janitorReset";
import { useRebuiltAgentTick } from "@/features/retro-office/core/agentMotion";

type OfficeDeskMonitorMap = Record<string, OfficeDeskMonitor>;
type RenderAgentUiSnapshot = Pick<RenderAgent, "state" | "status">;
type FeedEvent = {
  id: string;
  name: string;
  text: string;
  ts: number;
  kind?: "status" | "reply";
};

const EMPTY_STRING_RECORD: Record<string, string> = {};
const EMPTY_BOOLEAN_RECORD: Record<string, boolean> = {};
const EMPTY_NUMBER_RECORD: Record<string, number> = {};
const EMPTY_MONITOR_MAP: OfficeDeskMonitorMap = {};
const EMPTY_CLEANING_CUES: OfficeCleaningCue[] = [];
const EMPTY_FEED_EVENTS: FeedEvent[] = [];

type DragState =
  | { kind: "idle" }
  | { kind: "moving"; uid: string }
  | { kind: "placing"; itemType: string };

const SMS_CONTACT_SEED_NAMES = [
  "Avery",
  "Maya",
  "Theo",
  "Lena",
  "Miles",
  "Nina",
  "Owen",
  "Priya",
  "Marco",
  "Sofia",
  "Daniel",
  "Chloe",
  "Gabriel",
  "Zoe",
] as const;

const normalizeSmsContactName = (value: string): string =>
  value.replace(/\s+/g, " ").trim() || "Joseph";

const buildSmsContactList = (
  recipient: string,
): { contacts: string[]; targetIndex: number } => {
  const normalizedRecipient = normalizeSmsContactName(recipient);
  const availableNames = SMS_CONTACT_SEED_NAMES.filter(
    (name) => name.toLowerCase() !== normalizedRecipient.toLowerCase(),
  );
  const recipientHash = [...normalizedRecipient].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  const beforeCount = 2 + (recipientHash % 3);
  const afterCount = 4;
  const contacts = [
    ...availableNames.slice(0, beforeCount),
    normalizedRecipient,
    ...availableNames.slice(beforeCount, beforeCount + afterCount),
  ];

  return {
    contacts,
    targetIndex: beforeCount,
  };
};

type PaletteEntry = {
  type: string;
  label: string;
  icon: string;
  defaults: Partial<FurnitureItem>;
};

type PaletteCategory = {
  key: string;
  label: string;
  items: string[];
};

const PALETTE_CATEGORIES: PaletteCategory[] = [
  { key: "structure", label: "Structure", items: ["wall", "door"] },
  {
    key: "office",
    label: "Office",
    items: [
      "desk_cubicle",
      "executive_desk",
      "chair",
      "round_table",
      "table_rect",
      "bookshelf",
      "cabinet",
      "whiteboard",
      "printer",
      "computer",
      "keyboard",
      "mouse",
      "clock",
      "locker",
      "copier",
      "reception_desk",
      "side_table",
      "bench_seat",
      "coat_rack",
      "floor_sign",
      "router_station",
      "speaker",
      "projector",
      "tv_stand",
      "charging_station",
      "podium",
      "camera_tripod",
      "mail_cart",
      "first_aid",
    ],
  },
  {
    key: "lounge",
    label: "Lounge",
    items: ["couch", "couch_v", "beanbag", "ottoman", "jukebox", "arcade", "foosball", "air_hockey"],
  },
  {
    key: "kitchen",
    label: "Kitchen",
    items: ["coffee_machine", "fridge", "water_cooler", "dishwasher", "stove", "microwave", "wall_cabinet", "sink", "vending", "mug", "trash"],
  },
  {
    key: "tech",
    label: "Tech & Rooms",
    items: ["atm", "server_rack", "phone_booth", "qa_terminal", "device_rack", "test_bench"],
  },
  {
    key: "gym",
    label: "Gym",
    items: ["treadmill", "weight_bench", "dumbbell_rack", "exercise_bike", "rowing_machine", "kettlebell_rack", "punching_bag", "yoga_mat"],
  },
];

// ============================================================
// LAYOUT DATA
// ============================================================

const PALETTE: PaletteEntry[] = [
  {
    type: "wall",
    label: "Wall",
    icon: "🧱",
    defaults: { w: 80, h: WALL_THICKNESS },
  },
  {
    type: "door",
    label: "Door",
    icon: "🚪",
    defaults: { w: DOOR_LENGTH, h: DOOR_THICKNESS, facing: 0 },
  },
  {
    type: "desk_cubicle",
    label: "Desk",
    icon: "🖥️",
    defaults: { w: 100, h: 55 },
  },
  { type: "chair", label: "Chair", icon: "🪑", defaults: { facing: 0 } },
  {
    type: "round_table",
    label: "Round Table",
    icon: "⭕",
    defaults: { r: 60 },
  },
  {
    type: "executive_desk",
    label: "Exec Desk",
    icon: "📋",
    defaults: { w: 130, h: 65 },
  },
  { type: "couch", label: "Couch", icon: "🛋️", defaults: { w: 100, h: 40 } },
  {
    type: "couch_v",
    label: "Couch (V)",
    icon: "🛋️",
    defaults: { w: 40, h: 80, vertical: true },
  },
  {
    type: "bookshelf",
    label: "Bookshelf",
    icon: "📚",
    defaults: { w: 80, h: 120 },
  },
  {
    type: "beanbag",
    label: "Beanbag",
    icon: "🟠",
    defaults: { color: "#e65100" },
  },
  {
    type: "pingpong",
    label: "Ping Pong",
    icon: "🏓",
    defaults: { w: 100, h: 60 },
  },
  {
    type: "table_rect",
    label: "Table",
    icon: "🟫",
    defaults: { w: 80, h: 40 },
  },
  { type: "coffee_machine", label: "Coffee", icon: "☕", defaults: {} },
  { type: "fridge", label: "Fridge", icon: "🧊", defaults: { w: 40, h: 80 } },
  { type: "water_cooler", label: "Water", icon: "💧", defaults: {} },
  { type: "atm", label: "ATM", icon: "🏧", defaults: { facing: 270 } },
  { type: "jukebox", label: "Jukebox", icon: "🎵", defaults: { facing: 0 } },
  {
    type: "whiteboard",
    label: "Whiteboard",
    icon: "📝",
    defaults: { w: 10, h: 60 },
  },
  {
    type: "cabinet",
    label: "Cabinet",
    icon: "🗄️",
    defaults: { w: 200, h: 40 },
  },
  {
    type: "dishwasher",
    label: "Dishwasher",
    icon: "🧼",
    defaults: { w: 40, h: 40 },
  },
  {
    type: "stove",
    label: "Stove",
    icon: "🍳",
    defaults: { w: 40, h: 40 },
  },
  {
    type: "microwave",
    label: "Microwave",
    icon: "⏲️",
    defaults: { w: 30, h: 20 },
  },
  {
    type: "wall_cabinet",
    label: "Wall Cabinet",
    icon: "🗄️",
    defaults: { w: 80, h: 20, elevation: 0.9 },
  },
  { type: "computer", label: "Computer", icon: "🖥️", defaults: {} },
  { type: "printer", label: "Printer", icon: "🖨️", defaults: {} },
  { type: "keyboard", label: "Keyboard", icon: "⌨️", defaults: {} },
  { type: "mouse", label: "Mouse", icon: "🖱️", defaults: {} },
  { type: "mug", label: "Mug", icon: "☕", defaults: {} },
  { type: "trash", label: "Trash", icon: "🗑️", defaults: {} },
  { type: "clock", label: "Clock", icon: "🕒", defaults: {} },
  { type: "sink", label: "Sink", icon: "🚰", defaults: { w: 40, h: 40 } },
  { type: "vending", label: "Vending", icon: "🥤", defaults: { facing: 180 } },
  {
    type: "server_rack",
    label: "Server Rack",
    icon: "🗄️",
    defaults: { facing: 180 },
  },
  {
    type: "qa_terminal",
    label: "QA Terminal",
    icon: "🧪",
    defaults: { facing: 90 },
  },
  {
    type: "device_rack",
    label: "Device Rack",
    icon: "📡",
    defaults: { facing: 180 },
  },
  {
    type: "test_bench",
    label: "Test Bench",
    icon: "🛠️",
    defaults: { facing: 90 },
  },
  {
    type: "phone_booth",
    label: "Phone Booth",
    icon: "📞",
    defaults: { facing: 0 },
  },
  {
    type: "treadmill",
    label: "Treadmill",
    icon: "🏃",
    defaults: { facing: 90 },
  },
  {
    type: "weight_bench",
    label: "Weight Bench",
    icon: "🏋️",
    defaults: { facing: 90 },
  },
  {
    type: "dumbbell_rack",
    label: "Dumbbells",
    icon: "🏋️",
    defaults: { facing: 180 },
  },
  {
    type: "exercise_bike",
    label: "Bike",
    icon: "🚴",
    defaults: { facing: 90 },
  },
  {
    type: "rowing_machine",
    label: "Row Machine",
    icon: "🚣",
    defaults: { facing: 90 },
  },
  {
    type: "kettlebell_rack",
    label: "Kettlebells",
    icon: "��️",
    defaults: { facing: 180 },
  },
  {
    type: "punching_bag",
    label: "Punch Bag",
    icon: "🥊",
    defaults: { facing: 0 },
  },
  {
    type: "yoga_mat",
    label: "Yoga Mat",
    icon: "🧘",
    defaults: { facing: 0, color: "#0f766e" },
  },
  {
    type: "locker",
    label: "Locker",
    icon: "🧰",
    defaults: { w: 40, h: 40, facing: 180 },
  },
  {
    type: "copier",
    label: "Copier",
    icon: "🖨️",
    defaults: { w: 40, h: 30, facing: 180 },
  },
  {
    type: "reception_desk",
    label: "Reception",
    icon: "🛎️",
    defaults: { w: 120, h: 40, facing: 180 },
  },
  {
    type: "side_table",
    label: "Side Table",
    icon: "▫️",
    defaults: { w: 30, h: 30 },
  },
  {
    type: "ottoman",
    label: "Ottoman",
    icon: "🟪",
    defaults: { w: 28, h: 28, color: "#8b5cf6" },
  },
  {
    type: "bench_seat",
    label: "Bench",
    icon: "🪑",
    defaults: { w: 80, h: 24, facing: 0 },
  },
  {
    type: "coat_rack",
    label: "Coat Rack",
    icon: "🧥",
    defaults: { w: 18, h: 18 },
  },
  {
    type: "floor_sign",
    label: "Floor Sign",
    icon: "⚠️",
    defaults: { w: 18, h: 18, facing: 0 },
  },
  {
    type: "router_station",
    label: "Router",
    icon: "📶",
    defaults: { w: 24, h: 16, facing: 180 },
  },
  {
    type: "speaker",
    label: "Speaker",
    icon: "🔊",
    defaults: { w: 20, h: 20 },
  },
  {
    type: "projector",
    label: "Projector",
    icon: "📽️",
    defaults: { w: 24, h: 18, facing: 180 },
  },
  {
    type: "tv_stand",
    label: "TV Stand",
    icon: "📺",
    defaults: { w: 80, h: 24, facing: 180 },
  },
  {
    type: "charging_station",
    label: "Charging",
    icon: "🔋",
    defaults: { w: 24, h: 24, facing: 0 },
  },
  {
    type: "arcade",
    label: "Arcade",
    icon: "🕹️",
    defaults: { w: 30, h: 30, facing: 180 },
  },
  {
    type: "foosball",
    label: "Foosball",
    icon: "⚽",
    defaults: { w: 90, h: 50, facing: 90 },
  },
  {
    type: "air_hockey",
    label: "Air Hockey",
    icon: "🥅",
    defaults: { w: 100, h: 60, facing: 90 },
  },
  {
    type: "podium",
    label: "Podium",
    icon: "🎤",
    defaults: { w: 26, h: 20, facing: 0 },
  },
  {
    type: "camera_tripod",
    label: "Tripod",
    icon: "📷",
    defaults: { w: 18, h: 18, facing: 0 },
  },
  {
    type: "mail_cart",
    label: "Mail Cart",
    icon: "📬",
    defaults: { w: 36, h: 24, facing: 90 },
  },
  {
    type: "first_aid",
    label: "First Aid",
    icon: "🩹",
    defaults: { w: 20, h: 20 },
  },
];

const PALETTE_BY_TYPE = new Map(PALETTE.map((entry) => [entry.type, entry]));
const GROUPED_PALETTE = PALETTE_CATEGORIES.map((category) => ({
  ...category,
  entries: category.items
    .map((itemType) => PALETTE_BY_TYPE.get(itemType))
    .filter((entry): entry is PaletteEntry => Boolean(entry)),
})).filter((category) => category.entries.length > 0);

// ============================================================
// CAMERA SETUP — sets lookAt after mount
// ============================================================

function CameraRig({
  target,
  position,
  zoom,
}: {
  target: [number, number, number];
  position?: [number, number, number];
  zoom?: number;
}) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    if (position) {
      camera.position.set(...position);
    }
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera && typeof zoom === "number") {
      (camera as THREE.OrthographicCamera).zoom = zoom;
    }
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, position, target, zoom]);
  return null;
}

function CameraSnapshotTracker({
  snapshotRef,
  orbitRef,
}: {
  snapshotRef: MutableRefObject<CameraPreset | null>;
  orbitRef: RefObject<{ target: THREE.Vector3 } | null>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    const orbitTarget = orbitRef.current?.target;
    snapshotRef.current = {
      pos: [camera.position.x, camera.position.y, camera.position.z],
      target: orbitTarget
        ? [orbitTarget.x, orbitTarget.y, orbitTarget.z]
        : [0, 0, 0],
      zoom:
        camera instanceof THREE.OrthographicCamera ||
        camera instanceof THREE.PerspectiveCamera
          ? camera.zoom
          : undefined,
    };
  });

  return null;
}

const readPersistedCameraPreset = (storageKey: string): CameraPreset | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CameraPreset | null;
    if (!parsed) return null;
    const isTriplet = (value: unknown): value is [number, number, number] =>
      Array.isArray(value) &&
      value.length === 3 &&
      value.every((entry) => typeof entry === "number" && Number.isFinite(entry));
    if (!isTriplet(parsed.pos) || !isTriplet(parsed.target)) {
      return null;
    }
    if (typeof parsed.zoom === "number" && !Number.isFinite(parsed.zoom)) {
      return null;
    }
    return {
      pos: parsed.pos,
      target: parsed.target,
      zoom: typeof parsed.zoom === "number" ? parsed.zoom : undefined,
    };
  } catch {
    return null;
  }
};

const persistCameraPreset = (storageKey: string, preset: CameraPreset | null) => {
  if (typeof window === "undefined" || !preset) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(preset));
  } catch {
    // ignore storage failures
  }
};

const NOOP_FURNITURE_UID_HANDLER = () => {};
const NOOP_FURNITURE_HANDLER = () => {};
const EMPTY_FURNITURE_ITEMS: FurnitureItem[] = [];

const ReadOnlyFurnitureClone = memo(function ReadOnlyFurnitureClone({
  furniture,
}: {
  furniture: FurnitureItem[];
}) {
  const deskItems = useMemo(
    () => furniture.filter((item) => item.type === "desk_cubicle"),
    [furniture],
  );
  const chairItems = useMemo(
    () => furniture.filter((item) => item.type === "chair"),
    [furniture],
  );
  const wallItems = useMemo(
    () => furniture.filter((item) => item.type === "wall"),
    [furniture],
  );

  return (
    <Suspense fallback={null}>
      <PrimitiveInstancedWallSegmentsModel items={wallItems} />
      <InstancedFurnitureItemsModel itemType="desk_cubicle" items={deskItems} />
      <InstancedFurnitureItemsModel itemType="chair" items={chairItems} />
      {furniture.map((item) =>
        item.type === "wall" ||
        item.type === "desk_cubicle" ||
        item.type === "chair" ? null : item.type === "door" ? (
          <PrimitiveDoorModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "round_table" ? (
          <PrimitiveRoundTableModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "keyboard" ? (
          <PrimitiveKeyboardModel
            key={item._uid}
            item={item}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "mouse" ? (
          <PrimitiveMouseModel
            key={item._uid}
            item={item}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "trash" ? (
          <PrimitiveTrashCanModel
            key={item._uid}
            item={item}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "mug" ? (
          <PrimitiveMugModel
            key={item._uid}
            item={item}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "clock" ? (
          <PrimitiveClockModel
            key={item._uid}
            item={item}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "atm" ? (
          <InteractiveAtmMachineModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "sms_booth" ? (
          <InteractiveSmsBoothModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            doorOpen={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "phone_booth" ? (
          <InteractivePhoneBoothModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            doorOpen={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "server_rack" ? (
          <InteractiveServerRackModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "server_terminal" ? (
          <InteractiveServerTerminalModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "vending" ? (
          <KitchenVendingMachineModel
            key={item._uid}
            item={item}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "sink" ? (
          <KitchenSinkModel
            key={item._uid}
            item={item}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "dishwasher" ? (
          <KitchenDishwasherModel
            key={item._uid}
            item={item}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "pingpong" ? (
          <MachinePingPongTableModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "qa_terminal" ? (
          <InteractiveQaTerminalModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "device_rack" ? (
          <InteractiveDeviceRackModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "test_bench" ? (
          <InteractiveTestBenchModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "treadmill" ? (
          <InteractiveTreadmillModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "weight_bench" ? (
          <InteractiveWeightBenchModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "dumbbell_rack" ? (
          <InteractiveDumbbellRackModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "exercise_bike" ? (
          <InteractiveExerciseBikeModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "rowing_machine" ? (
          <InteractiveRowingMachineModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "kettlebell_rack" ? (
          <InteractiveKettlebellRackModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "punching_bag" ? (
          <InteractivePunchingBagModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "yoga_mat" ? (
          <InteractiveYogaMatModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "stove" ? (
          <KitchenStoveModel
            key={item._uid}
            item={item}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "microwave" ? (
          <KitchenMicrowaveModel
            key={item._uid}
            item={item}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : item.type === "wall_cabinet" ? (
          <KitchenWallCabinetModel
            key={item._uid}
            item={item}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ) : (
          <GenericFurnitureModel
            key={item._uid}
            item={item}
            isSelected={false}
            isHovered={false}
            editMode={false}
            onPointerDown={NOOP_FURNITURE_UID_HANDLER}
            onPointerOver={NOOP_FURNITURE_UID_HANDLER}
            onPointerOut={NOOP_FURNITURE_HANDLER}
          />
        ),
      )}
    </Suspense>
  );
});

function AdaptiveDprController() {
  const { gl, setDpr } = useThree();
  const currentDprRef = useRef(1);
  const frameCounterRef = useRef(0);
  const avgDeltaRef = useRef(1 / 60);

  useEffect(() => {
    const initialDpr = Math.min(window.devicePixelRatio || 1, 0.95);
    currentDprRef.current = initialDpr;
    setDpr(initialDpr);
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        currentDprRef.current = 0.72;
        setDpr(0.72);
        return;
      }
      const restoredDpr = Math.min(window.devicePixelRatio || 1, 0.95);
      currentDprRef.current = restoredDpr;
      setDpr(restoredDpr);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [setDpr]);

  useFrame((_, delta) => {
    if (document.visibilityState !== "visible") return;
    avgDeltaRef.current = avgDeltaRef.current * 0.92 + delta * 0.08;
    frameCounterRef.current += 1;
    if (frameCounterRef.current < 24) return;
    frameCounterRef.current = 0;

    const maxDpr = Math.min(window.devicePixelRatio || 1, 0.95);
    const minDpr = 0.55;
    let nextDpr = currentDprRef.current;
    if (avgDeltaRef.current > 1 / 50) {
      nextDpr = Math.max(minDpr, currentDprRef.current - 0.1);
    } else if (avgDeltaRef.current < 1 / 64) {
      nextDpr = Math.min(maxDpr, currentDprRef.current + 0.03);
    }
    if (Math.abs(nextDpr - currentDprRef.current) < 0.025) return;
    currentDprRef.current = nextDpr;
    setDpr(Number(nextDpr.toFixed(2)));
    gl.info.reset();
  });

  return null;
}

// Asset model definitions live in `src/features/retro-office/objects`.

// ============================================================
// AGENT TICK HOOK — rebuilt movement engine
// ============================================================

function useAgentTick(
  agents: SceneActor[],
  deskLocations: { x: number; y: number }[],
  assignedDeskIndexByAgentId: Record<string, number> = {},
  gymWorkoutLocations: {
    x: number;
    y: number;
    facing: number;
    workoutStyle: "run" | "lift" | "bike" | "box" | "row" | "stretch";
  }[],
  qaLabStations: QaLabStationLocation[],
  meetingSeatLocations: { x: number; y: number; facing: number }[],
  furnitureRef: RefObject<FurnitureItem[]>,
  lastSeenByAgentId: Record<string, number> = {},
  deskHoldByAgentId: Record<string, boolean> = {},
  danceUntilByAgentId: Record<string, number> = {},
  gymHoldByAgentId: Record<string, boolean> = {},
  smsBoothHoldByAgentId: Record<string, boolean> = {},
  phoneBoothHoldByAgentId: Record<string, boolean> = {},
  qaHoldByAgentId: Record<string, boolean> = {},
  githubReviewByAgentId: Record<string, boolean> = {},
  standupMeeting: StandupMeeting | null = null,
) {
  return useRebuiltAgentTick(
    agents,
    deskLocations,
    assignedDeskIndexByAgentId,
    gymWorkoutLocations,
    qaLabStations,
    meetingSeatLocations,
    furnitureRef,
    lastSeenByAgentId,
    deskHoldByAgentId,
    danceUntilByAgentId,
    gymHoldByAgentId,
    smsBoothHoldByAgentId,
    phoneBoothHoldByAgentId,
    qaHoldByAgentId,
    githubReviewByAgentId,
    standupMeeting,
  );
}

// ============================================================
// NEW IDEA 2 — CAMERA PRESETS
// ============================================================

const AWAY_THRESHOLD_MS = 15 * 60 * 1000;
const COMPACT_AGENT_BADGE_LIMIT = 6;

const estimatePhoneSpeechDurationMs = (
  text: string | null | undefined,
): number => {
  const normalized = text?.trim() ?? "";
  if (!normalized) return 5_000;
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  return Math.max(5_000, Math.min(12_000, 1_800 + wordCount * 380));
};

const getAgentInitials = (name: string | null | undefined): string => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

const clampFurnitureItemToCanvas = (item: FurnitureItem): FurnitureItem => {
  const { width, height } = getItemBaseSize(item);
  const maxX = Math.max(0, CANVAS_W - width);
  const maxY = Math.max(0, CANVAS_H - height);
  const nextX = snap(Math.min(maxX, Math.max(0, item.x)));
  const nextY = snap(Math.min(maxY, Math.max(0, item.y)));
  if (nextX === item.x && nextY === item.y) {
    return item;
  }
  return {
    ...item,
    x: nextX,
    y: nextY,
  };
};

const sanitizeFurnitureLayout = (items: FurnitureItem[]) =>
  items.map(clampFurnitureItemToCanvas);

const REQUIRED_EAST_WING_WALLS: FurnitureItem[] = [
  { type: "wall", x: 1075, y: 0, w: 8, h: 150, _uid: "required_wall_gym_left_top" },
  { type: "wall", x: 1075, y: 190, w: 8, h: 170, _uid: "required_wall_gym_left_bottom" },
  { type: "wall", x: 1075, y: 352, w: 720, h: 8, _uid: "required_wall_gym_qa_divider" },
];

const hasSameRect = (item: FurnitureItem, required: FurnitureItem) =>
  item.type === required.type &&
  item.x === required.x &&
  item.y === required.y &&
  ((item as { w?: number }).w ?? null) === (((required as { w?: number }).w) ?? null) &&
  ((item as { h?: number }).h ?? null) === (((required as { h?: number }).h) ?? null);

const ensureOfficeEastWingWalls = (items: FurnitureItem[]) => {
  const next = [...items];
  for (const required of REQUIRED_EAST_WING_WALLS) {
    if (!next.some((item) => hasSameRect(item, required))) {
      next.push(required);
    }
  }
  return next;
};

const buildCanonicalOfficeLayout = (items: FurnitureItem[]) =>
  sanitizeFurnitureLayout(
    ensureOfficeNoPlants(
      ensureOfficeEastWingWalls(
        ensureOfficeNoLamps(
          ensureOfficeArtRoomRemoved(
            ensureOfficeJukebox(
              ensureOfficeQaLab(
                ensureOfficeGymRoom(
                  ensureOfficeServerRoom(
                    ensureOfficePhoneBooth(
                      ensureOfficeSmsBooth(
                        ensureOfficeAtm(
                          ensureOfficePingPongTable(
                            items.filter((item) => !isRetiredPingPongLamp(item)),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );

export function RetroOffice3D({
  agents,
  companyId = null,
  workspaceId = null,
  initialFurniture = null,
  animationState = null,
  readOnly = false,
  storageNamespace = "default",
  deskAssignmentByDeskUid = EMPTY_STRING_RECORD,
  cleaningCues = EMPTY_CLEANING_CUES,
  deskHoldByAgentId = EMPTY_BOOLEAN_RECORD,
  gymHoldByAgentId = EMPTY_BOOLEAN_RECORD,
  githubReviewAgentId = null,
  phoneBoothAgentId = null,
  phoneCallScenario = null,
  smsBoothAgentId = null,
  textMessageScenario = null,
  qaHoldByAgentId = EMPTY_BOOLEAN_RECORD,
  qaTestingAgentId = null,
  standupMeeting = null,
  standupAutoOpenBoard = true,
  monitorAgentId = null,
  monitorByAgentId = EMPTY_MONITOR_MAP,
  githubSkill = null,
  soundclawEnabled = false,
  officeTitle = "Luke Headquarters",
  officeTitleLoaded = false,
  remoteOfficeEnabled = false,
  remoteOfficeSourceKind = "presence_endpoint",
  remoteOfficeLabel = "Remote Office",
  remoteOfficePresenceUrl = "",
  remoteOfficeGatewayUrl = "",
  remoteOfficeStatusText = "Remote office disabled.",
  remoteLayoutSnapshot = null,
  remoteOfficeTokenConfigured = false,
  voiceRepliesEnabled = false,
  voiceRepliesVoiceId = null,
  voiceRepliesSpeed = 1,
  voiceRepliesLoaded = false,
  onOfficeTitleChange,
  onRemoteOfficeEnabledChange,
  onRemoteOfficeSourceKindChange,
  onRemoteOfficeLabelChange,
  onRemoteOfficePresenceUrlChange,
  onRemoteOfficeGatewayUrlChange,
  onRemoteOfficeTokenChange,
  onVoiceRepliesToggle,
  onVoiceRepliesVoiceChange,
  onVoiceRepliesSpeedChange,
  onVoiceRepliesPreview,
  onGatewayDisconnect,
  onOpenOnboarding,
  atmAnalytics = null,
  feedEvents = EMPTY_FEED_EVENTS,
  gatewayStatus = "disconnected",
  runCountByAgentId = EMPTY_NUMBER_RECORD,
  lastSeenByAgentId = EMPTY_NUMBER_RECORD,
  onStandupArrivalsChange,
  onStandupStartRequested,
  onMonitorSelect,
  onAgentChatSelect,
  squads = [],
  onSquadOps,
  onAddAgent,
  profileButtonActive = false,
  onOpenProfile,
  onLogout,
  onAgentEdit,
  onAgentDelete,
  onDeskAssignmentChange,
  onDeskAssignmentsReset,
  onGithubReviewDismiss,
  onPhoneCallComplete,
  onPhoneCallSpeak,
  onTextMessageComplete,
  onTextMessageClose,
  onTextMessageDismiss,
  onQaLabDismiss,
  onOpenGithubSkillSetup,
  onJukeboxInteract,
}: {
  agents: OfficeAgent[];
  companyId?: number | null;
  workspaceId?: number | null;
  initialFurniture?: FurnitureItem[] | null;
  animationState?: Pick<
    OfficeAnimationState,
    | "cleaningCues"
    | "danceUntilByAgentId"
    | "deskHoldByAgentId"
    | "githubHoldByAgentId"
    | "gymHoldByAgentId"
    | "phoneBoothHoldByAgentId"
    | "smsBoothHoldByAgentId"
    | "qaHoldByAgentId"
    | "jukeboxHoldByAgentId"
  > | null;
  readOnly?: boolean;
  storageNamespace?: string;
  deskAssignmentByDeskUid?: Record<string, string>;
  cleaningCues?: OfficeCleaningCue[];
  deskHoldByAgentId?: Record<string, boolean>;
  gymHoldByAgentId?: Record<string, boolean>;
  githubReviewAgentId?: string | null;
  phoneBoothAgentId?: string | null;
  phoneCallScenario?: MockPhoneCallScenario | null;
  smsBoothAgentId?: string | null;
  textMessageScenario?: MockTextMessageScenario | null;
  qaHoldByAgentId?: Record<string, boolean>;
  qaTestingAgentId?: string | null;
  standupMeeting?: StandupMeeting | null;
  standupAutoOpenBoard?: boolean;
  monitorAgentId?: string | null;
  monitorByAgentId?: OfficeDeskMonitorMap;
  githubSkill?: SkillStatusEntry | null;
  soundclawEnabled?: boolean;
  officeTitle?: string;
  officeTitleLoaded?: boolean;
  remoteOfficeEnabled?: boolean;
  remoteOfficeSourceKind?: "presence_endpoint" | "openclaw_gateway";
  remoteOfficeLabel?: string;
  remoteOfficePresenceUrl?: string;
  remoteOfficeGatewayUrl?: string;
  remoteOfficeStatusText?: string;
  remoteLayoutSnapshot?: OfficeLayoutSnapshot | null;
  remoteOfficeTokenConfigured?: boolean;
  voiceRepliesEnabled?: boolean;
  voiceRepliesVoiceId?: string | null;
  voiceRepliesSpeed?: number;
  voiceRepliesLoaded?: boolean;
  onOfficeTitleChange?: (title: string) => void;
  onRemoteOfficeEnabledChange?: (enabled: boolean) => void;
  onRemoteOfficeSourceKindChange?: (
    kind: "presence_endpoint" | "openclaw_gateway",
  ) => void;
  onRemoteOfficeLabelChange?: (label: string) => void;
  onRemoteOfficePresenceUrlChange?: (url: string) => void;
  onRemoteOfficeGatewayUrlChange?: (url: string) => void;
  onRemoteOfficeTokenChange?: (token: string) => void;
  onVoiceRepliesToggle?: (enabled: boolean) => void;
  onVoiceRepliesVoiceChange?: (voiceId: string | null) => void;
  onVoiceRepliesSpeedChange?: (speed: number) => void;
  onVoiceRepliesPreview?: (voiceId: string | null, voiceName: string) => void;
  onGatewayDisconnect?: () => void;
  onOpenOnboarding?: () => void;
  atmAnalytics?: OfficeUsageAnalyticsParams | null;
  feedEvents?: FeedEvent[];
  gatewayStatus?: string;
  runCountByAgentId?: Record<string, number>;
  lastSeenByAgentId?: Record<string, number>;
  onStandupArrivalsChange?: (arrivedAgentIds: string[]) => void;
  onStandupStartRequested?: () => void;
  onMonitorSelect?: (agentId: string | null) => void;
  onAgentChatSelect?: (agentId: string) => void;
  squads?: SquadSummary[];
  onSquadOps?: (squadId: string) => void;
  onAddAgent?: () => void;
  profileButtonActive?: boolean;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  onAgentEdit?: (agentId: string) => void;
  onAgentDelete?: (agentId: string) => void;
  onDeskAssignmentChange?: (deskUid: string, agentId: string | null) => void;
  onDeskAssignmentsReset?: (deskUids: string[]) => void;
  onGithubReviewDismiss?: () => void;
  onPhoneCallComplete?: (agentId: string) => void;
  onPhoneCallSpeak?: (payload: {
    agentId: string;
    requestKey: string;
    scenario: MockPhoneCallScenario;
  }) => void;
  onTextMessageComplete?: (agentId: string) => void;
  onTextMessageClose?: (agentId: string) => void;
  onTextMessageDismiss?: (agentId: string) => void;
  onQaLabDismiss?: () => void;
  onOpenGithubSkillSetup?: () => void;
  onJukeboxInteract?: () => void;
}) {
  const resolvedCleaningCues = animationState?.cleaningCues ?? cleaningCues;
  const resolvedDanceUntilByAgentId =
    animationState?.danceUntilByAgentId ?? EMPTY_NUMBER_RECORD;
  const resolvedDeskHoldByAgentId =
    animationState?.deskHoldByAgentId ?? deskHoldByAgentId;
  const resolvedGymHoldByAgentId =
    animationState?.gymHoldByAgentId ?? gymHoldByAgentId;
  const resolvedSmsBoothHoldByAgentId =
    animationState?.smsBoothHoldByAgentId ?? EMPTY_BOOLEAN_RECORD;
  const resolvedPhoneBoothHoldByAgentId =
    animationState?.phoneBoothHoldByAgentId ?? EMPTY_BOOLEAN_RECORD;
  const resolvedQaHoldByAgentId =
    animationState?.qaHoldByAgentId ?? qaHoldByAgentId;
  const resolvedGithubReviewByAgentId =
    animationState?.githubHoldByAgentId ??
    (githubReviewAgentId
      ? { [githubReviewAgentId]: true }
      : EMPTY_BOOLEAN_RECORD);
  const resolvedJukeboxHoldByAgentId =
    animationState?.jukeboxHoldByAgentId ?? EMPTY_BOOLEAN_RECORD;
  const isJukeboxActive = Object.values(resolvedJukeboxHoldByAgentId).some(Boolean);

  // Keep follow camera state declared early so later memos/effects never hit TDZ during render.
  const [followAgentId, setFollowAgentId] = useState<string | null>(null);
  const followAgentIdRef = useRef<string | null>(null);

  const resolvedInitialFurniture = useMemo(
    () =>
      buildCanonicalOfficeLayout(
        initialFurniture ??
          (companyId ? materializeDefaults() : loadFurniture(storageNamespace)) ??
          materializeDefaults(),
      ),
    [companyId, initialFurniture, storageNamespace],
  );
  const [furniture, setFurniture] = useState<FurnitureItem[]>(resolvedInitialFurniture);

  useEffect(() => {
    if (!companyId || storageNamespace !== "default" || readOnly) return;
    setFurniture(resolvedInitialFurniture);
  }, [companyId, readOnly, resolvedInitialFurniture, storageNamespace]);
  useEffect(() => {
    setFurniture((prev) => sanitizeFurnitureLayout(prev));
  }, []);


  useEffect(() => {
    if (!companyId || storageNamespace !== "default" || readOnly) return;

    let cancelled = false;

    const loadCompanyOfficeLayout = async () => {
      try {
        const response = await fetch("/api/office/company-layout", {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          layout?: { layoutJson?: string | null } | null;
        };
        const parsed = parseCompanyOfficeLayoutJson(payload.layout?.layoutJson);
        if (!parsed?.furniture?.length || cancelled) return;

        setFurniture(buildCanonicalOfficeLayout(parsed.furniture));
      } catch (error) {
        console.error("Failed to load office layout from backend.", error);
      }
    };

    void loadCompanyOfficeLayout();

    return () => {
      cancelled = true;
    };
  }, [companyId, readOnly, storageNamespace]);

  const defaultRemoteLayoutFurniture = useMemo(
    () =>
      remoteOfficeEnabled
        ? projectFurnitureIntoRemoteOfficeZone({
            furniture: furniture.filter((item) => !isRetiredPingPongLamp(item)),
            sourceWidth: LOCAL_OFFICE_CANVAS_WIDTH,
            sourceHeight: LOCAL_OFFICE_CANVAS_HEIGHT,
          })
        : EMPTY_FURNITURE_ITEMS,
    [furniture, remoteOfficeEnabled],
  );
  const remoteLayoutFurniture = useMemo(
    () =>
      !remoteOfficeEnabled
        ? EMPTY_FURNITURE_ITEMS
        : remoteLayoutSnapshot
          ? projectFurnitureIntoRemoteOfficeZone({
              furniture: remoteLayoutSnapshot.furniture,
              sourceWidth: remoteLayoutSnapshot.width,
              sourceHeight: remoteLayoutSnapshot.height,
            })
          : defaultRemoteLayoutFurniture,
    [defaultRemoteLayoutFurniture, remoteLayoutSnapshot, remoteOfficeEnabled],
  );
  const [editMode, setEditMode] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [hoverUid, setHoverUid] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>({ kind: "idle" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePaletteCategory, setActivePaletteCategory] = useState<string>("office");
  const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(
    null,
  );
  const [wallDrawStart, setWallDrawStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [spaceDragging, setSpaceDragging] = useState(false);
  const [standupBoardOpen, setStandupBoardOpen] = useState(false);
  const [agentRosterOpen, setAgentRosterOpen] = useState(false);
  const [rosterTab, setRosterTab] = useState<"agents" | "squads">("agents");
  const autoOpenedStandupIdRef = useRef<string | null>(null);
  // Idea 1 (original): hovered agent for tooltip overlay.
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [renderAgentUiById, setRenderAgentUiById] = useState<
    Record<string, RenderAgentUiSnapshot>
  >({});
  // New Idea 1: right-click context menu.
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  // New Idea 3: speech bubble agent IDs.
  const [speechAgentIds, setSpeechAgentIds] = useState<Set<string>>(new Set());
  const statusFeedEvents = useMemo(
    () => feedEvents.filter((event) => event.kind !== "reply"),
    [feedEvents],
  );
  const { speechTextByAgentId, speechImageUrlByAgentId } = useMemo(() => {
    const texts: Record<string, string> = {};
    const images: Record<string, string> = {};
    for (const event of feedEvents) {
      const text = event.text.trim();
      if (event.kind !== "reply" || !text || texts[event.id]) continue;
      const { cleanText, imageUrl } = extractSpeechImage(text, event.id);
      texts[event.id] = cleanText;
      if (imageUrl) images[event.id] = imageUrl;
    }
    return { speechTextByAgentId: texts, speechImageUrlByAgentId: images };
  }, [feedEvents]);
  const standupSpeechTextByAgentId = useMemo(() => {
    if (!standupMeeting || standupMeeting.phase !== "in_progress") return {};
    const currentCard =
      standupMeeting.cards.find(
        (card) => card.agentId === standupMeeting.currentSpeakerAgentId,
      ) ?? null;
    if (!currentCard) return {};
    return { [currentCard.agentId]: currentCard.speech };
  }, [standupMeeting]);
  const suppressSceneSpeechBubbles =
    standupMeeting?.phase === "gathering" ||
    standupMeeting?.phase === "in_progress";
  // New Idea 2: camera preset target ref (shared into Canvas).
  const cameraPresetRef = useRef<{
    pos: [number, number, number];
    target: [number, number, number];
    zoom?: number;
  } | null>(null);
  // New Idea 7: heatmap mode.
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [activeCameraPresetKey, setActiveCameraPresetKey] = useState<
    "overview" | "frontDesk" | "lounge"
  >("overview");
  const heatGridRef = useRef<Uint16Array | null>(null);
  // E3 Idea 1: mood emoji reactions above agent chips.
  const [moodByAgentId, setMoodByAgentId] = useState<
    Record<string, { emoji: string; ts: number }>
  >({});
  const [janitorActors, setJanitorActors] = useState<JanitorActor[]>([]);
  const seenCleaningCueIdsRef = useRef<Set<string>>(new Set());
  // E3 Idea 3: spotlight.
  const [spotlightAgentId, setSpotlightAgentId] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null);
  // Follow cam: which agent to trail with a third-person perspective camera.
  const prevMonitorAgentIdRef = useRef<string | null>(null);
  const prevAtmUidRef = useRef<string | null>(null);
  const prevSmsBoothViewRef = useRef<string | null>(null);
  const prevPhoneBoothViewRef = useRef<string | null>(null);
  const prevGithubViewRef = useRef<string | null>(null);
  const prevQaViewRef = useRef<string | null>(null);
  const currentCameraSnapshotRef = useRef<CameraPreset | null>(null);
  const preservedOfficeCameraRef = useRef<CameraPreset | null>(null);
  const previousFocusedViewActiveRef = useRef(false);
  const initialCameraStorageKeyRef = useRef<string | null>(null);
  const initialPersistedCameraRef = useRef<CameraPreset | null>(null);
  const lastPersistedCameraJsonRef = useRef<string | null>(null);
  const initializedCameraForKeyRef = useRef<string | null>(null);
  const [monitorImmersiveReady, setMonitorImmersiveReady] = useState(false);
  const [activeAtmUid, setActiveAtmUid] = useState<string | null>(null);
  const [atmImmersiveReady, setAtmImmersiveReady] = useState(false);
  const [phoneBoothCommandArrived, setPhoneBoothCommandArrived] =
    useState(false);
  const [phoneBoothImmersiveReady, setPhoneBoothImmersiveReady] =
    useState(false);
  const [phoneBoothDoorOpen, setPhoneBoothDoorOpen] = useState(false);
  const [phoneCallStep, setPhoneCallStep] = useState<PhoneCallStep>("dialing");
  const [dialedDigits, setDialedDigits] = useState("");
  const [smsBoothCommandArrived, setSmsBoothCommandArrived] = useState(false);
  const [smsBoothImmersiveReady, setSmsBoothImmersiveReady] = useState(false);
  const [smsBoothDoorOpen, setSmsBoothDoorOpen] = useState(false);
  const [textMessageStep, setTextMessageStep] =
    useState<TextMessageStep>("selecting_contact");
  const [typedMessageText, setTypedMessageText] = useState("");
  const [activeTextKey, setActiveTextKey] = useState<string | null>(null);
  const [textContacts, setTextContacts] = useState<string[]>([]);
  const [activeTextContactIndex, setActiveTextContactIndex] = useState<
    number | null
  >(null);
  const [manualPhoneBoothOpen, setManualPhoneBoothOpen] = useState(false);
  const [manualPhoneCallScenario, setManualPhoneCallScenario] =
    useState<MockPhoneCallScenario | null>(null);
  const [manualSmsBoothOpen, setManualSmsBoothOpen] = useState(false);
  const [manualTextMessageScenario, setManualTextMessageScenario] =
    useState<MockTextMessageScenario | null>(null);
  const activePhoneCallFlowKeyRef = useRef<string | null>(null);
  const activeTextMessageFlowKeyRef = useRef<string | null>(null);
  const boothAudioCtxRef = useRef<AudioContext | null>(null);
  const effectivePhoneBoothAgentIdRef = useRef<string | null>(null);
  const effectivePhoneCallScenarioRef = useRef<MockPhoneCallScenario | null>(
    null,
  );
  const phoneBoothAgentIdRef = useRef<string | null>(null);
  const onPhoneCallSpeakRef = useRef(onPhoneCallSpeak);
  const onPhoneCallCompleteRef = useRef(onPhoneCallComplete);
  const onStandupArrivalsChangeRef = useRef(onStandupArrivalsChange);
  const cameraPersistenceKey = `retro-office-camera:${storageNamespace}:${remoteOfficeEnabled ? "remote" : "local"}`;

  const restorePreservedOfficeCamera = useCallback(() => {
    const preservedCamera = preservedOfficeCameraRef.current;
    if (preservedCamera) {
      cameraPresetRef.current = preservedCamera;
      persistCameraPreset(cameraPersistenceKey, preservedCamera);
      initialPersistedCameraRef.current = preservedCamera;
      lastPersistedCameraJsonRef.current = JSON.stringify(preservedCamera);
      return;
    }
    if (currentCameraSnapshotRef.current) {
      cameraPresetRef.current = currentCameraSnapshotRef.current;
      persistCameraPreset(cameraPersistenceKey, currentCameraSnapshotRef.current);
      initialPersistedCameraRef.current = currentCameraSnapshotRef.current;
      lastPersistedCameraJsonRef.current = JSON.stringify(currentCameraSnapshotRef.current);
    }
  }, [cameraPersistenceKey]);
  const lastStandupArrivalKeyRef = useRef<string | null>(null);
  const effectiveSmsBoothAgentIdRef = useRef<string | null>(null);
  const effectiveTextMessageScenarioRef =
    useRef<MockTextMessageScenario | null>(null);
  const smsBoothAgentIdRef = useRef<string | null>(null);
  const onTextMessageCompleteRef = useRef(onTextMessageComplete);
  if (initialCameraStorageKeyRef.current !== cameraPersistenceKey) {
    initialCameraStorageKeyRef.current = cameraPersistenceKey;
    initialPersistedCameraRef.current = readPersistedCameraPreset(cameraPersistenceKey);
    lastPersistedCameraJsonRef.current = initialPersistedCameraRef.current
      ? JSON.stringify(initialPersistedCameraRef.current)
      : null;
  }

  const [activeGithubTerminalUid, setActiveGithubTerminalUid] = useState<
    string | null
  >(null);
  const [activeQaTerminalUid, setActiveQaTerminalUid] = useState<string | null>(
    null,
  );
  const [githubImmersiveReady, setGithubImmersiveReady] = useState(false);
  const [qaImmersiveReady, setQaImmersiveReady] = useState(false);

  useEffect(() => {
    markArtRoomRemovalMigrationApplied(storageNamespace);
  }, [storageNamespace]);

  useEffect(() => {
    markAtmMigrationApplied(storageNamespace);
  }, [storageNamespace]);

  useEffect(() => {
    markPhoneBoothMigrationApplied(storageNamespace);
  }, [storageNamespace]);

  useEffect(() => {
    markSmsBoothMigrationApplied(storageNamespace);
  }, [storageNamespace]);

  useEffect(() => {
    markServerRoomMigrationApplied(storageNamespace);
  }, [storageNamespace]);

  useEffect(() => {
    markGymRoomMigrationApplied(storageNamespace);
  }, [storageNamespace]);

  useEffect(() => {
    markQaLabMigrationApplied(storageNamespace);
  }, [storageNamespace]);

  useEffect(() => {
    followAgentIdRef.current = followAgentId;
  }, [followAgentId]);

  // Derive per-agent colors from the agents prop (stable, no state needed).
  const agentColorMap = useMemo(
    () =>
      new Map(
        [...agents, ...janitorActors].map((actor) => [actor.id, actor.color]),
      ),
    [agents, janitorActors],
  );

  const deskItems = useMemo(
    () => furniture.filter((item) => item.type === "desk_cubicle"),
    [furniture],
  );
  const deskLocations = useMemo(() => getDeskLocations(furniture), [furniture]);
  const assignedDeskIndexByAgentId = useMemo(() => {
    const next: Record<string, number> = {};
    deskItems.forEach((item, index) => {
      const agentId = deskAssignmentByDeskUid[item._uid];
      if (!agentId) return;
      next[agentId] = index;
    });
    return next;
  }, [deskAssignmentByDeskUid, deskItems]);
  const janitorCleaningStops = useMemo(
    () => getJanitorCleaningStops(furniture),
    [furniture],
  );
  const gymWorkoutLocations = useMemo(
    () => getGymWorkoutLocations(furniture),
    [furniture],
  );
  const qaLabStations = useMemo(() => getQaLabStations(furniture), [furniture]);
  const meetingSeatLocations = useMemo(
    () => getMeetingSeatLocations(furniture),
    [furniture],
  );

  // Keep a stable ref to furniture so the tick callback can read it without
  // being recreated every time furniture changes.
  const furnitureRef = useRef<FurnitureItem[]>(furniture);
  useEffect(() => {
    furnitureRef.current = furniture;
  }, [furniture]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now();
      setJanitorActors((previous) => {
        const next = pruneExpiredJanitorActors(previous, now);
        return next.length === previous.length ? previous : next;
      });
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (resolvedCleaningCues.length === 0) return;
    const unseenCues = resolvedCleaningCues.filter(
      (cue) => !seenCleaningCueIdsRef.current.has(cue.id),
    );
    if (unseenCues.length === 0) return;
    for (const cue of unseenCues) {
      seenCleaningCueIdsRef.current.add(cue.id);
    }
    const maxSeenCueIds = Math.max(resolvedCleaningCues.length * 4, 24);
    while (seenCleaningCueIdsRef.current.size > maxSeenCueIds) {
      const oldestCueId = seenCleaningCueIdsRef.current.values().next().value;
      if (!oldestCueId) break;
      seenCleaningCueIdsRef.current.delete(oldestCueId);
    }
    const spawnedActors = unseenCues.flatMap((cue) =>
      buildJanitorActorsForCue(cue, janitorCleaningStops),
    );
    if (spawnedActors.length === 0) return;
    setJanitorActors((previous) => {
      const now = Date.now();
      return [...pruneExpiredJanitorActors(previous, now), ...spawnedActors];
    });
  }, [janitorCleaningStops, resolvedCleaningCues]);

  const sceneAgents = useMemo<SceneActor[]>(
    () => [...agents, ...janitorActors],
    [agents, janitorActors],
  );

  const {
    renderAgentsRef,
    renderAgentLookupRef,
    tick,
    deskByAgentRef,
    planPath,
  } = useAgentTick(
    sceneAgents,
    deskLocations,
    assignedDeskIndexByAgentId,
    gymWorkoutLocations,
    qaLabStations,
    meetingSeatLocations,
    furnitureRef,
    lastSeenByAgentId,
    resolvedDeskHoldByAgentId,
    resolvedDanceUntilByAgentId,
    resolvedGymHoldByAgentId,
    resolvedSmsBoothHoldByAgentId,
    resolvedPhoneBoothHoldByAgentId,
    resolvedQaHoldByAgentId,
    resolvedGithubReviewByAgentId,
    standupMeeting,
  );
  useEffect(() => {
    const syncRenderAgentUi = () => {
      const next: Record<string, RenderAgentUiSnapshot> = {};
      for (const agent of renderAgentsRef.current) {
        next[agent.id] = {
          state: agent.state,
          status: agent.status,
        };
      }
      setRenderAgentUiById(next);
    };

    syncRenderAgentUi();
    const timer = window.setInterval(syncRenderAgentUi, 250);
    return () => {
      window.clearInterval(timer);
    };
  }, [renderAgentsRef]);
  const activeMonitor = monitorAgentId
    ? (monitorByAgentId[monitorAgentId] ?? null)
    : null;
  const agentStatusLookup = useMemo(
    () =>
      agents.reduce<Record<string, { isError: boolean; working: boolean }>>(
        (acc, agent) => {
          const renderAgent = renderAgentUiById[agent.id];
          acc[agent.id] = {
            isError:
              renderAgent?.status === "error" || agent.status === "error",
            working:
              renderAgent?.state === "sitting" ||
              renderAgent?.state === "dancing" ||
              renderAgent?.status === "working" ||
              agent.status === "working",
          };
          return acc;
        },
        {},
      ),
    [agents, renderAgentUiById],
  );
  const hoveredAgent = useMemo(
    () =>
      hoveredAgentId
        ? (agents.find((agent) => agent.id === hoveredAgentId) ?? null)
        : null,
    [agents, hoveredAgentId],
  );
  const hoveredAgentStatus = hoveredAgentId
    ? (agentStatusLookup[hoveredAgentId] ?? null)
    : null;
  const handleAgentHover = useCallback((agentId: string) => {
    setHoveredAgentId(agentId);
  }, []);
  const handleAgentUnhover = useCallback(() => {
    setHoveredAgentId(null);
  }, []);
  const handleAgentClick = useCallback(
    (agentId: string) => {
      const agent = renderAgentLookupRef.current.get(agentId);
      if (!agent || !orbitRef.current) return;
      const [wx, , wz] = toWorld(agent.x, agent.y);
      orbitRef.current.target.set(wx, 0, wz);
      orbitRef.current.update();
      if (isRemoteOfficeAgentId(agentId)) {
        onAgentChatSelect?.(agentId);
      }
    },
    [onAgentChatSelect, renderAgentLookupRef],
  );
  const handleAgentContextMenu = useCallback(
    (agentId: string, x: number, y: number) => {
      if (isRemoteOfficeAgentId(agentId)) return;
      setContextMenu({ id: agentId, x, y });
    },
    [],
  );
  const monitorImmersive = Boolean(activeMonitor && monitorImmersiveReady);
  const serverTerminal = useMemo(
    () => furniture.find((item) => item.type === "server_terminal") ?? null,
    [furniture],
  );
  const qaTerminal = useMemo(
    () => furniture.find((item) => item.type === "qa_terminal") ?? null,
    [furniture],
  );
  const wallItems = useMemo(
    () => furniture.filter((item) => item.type === "wall"),
    [furniture],
  );
  const chairItems = useMemo(
    () => furniture.filter((item) => item.type === "chair"),
    [furniture],
  );
  const activeAtm = useMemo(
    () =>
      activeAtmUid
        ? (furniture.find(
            (item) => item._uid === activeAtmUid && item.type === "atm",
          ) ?? null)
        : null,
    [activeAtmUid, furniture],
  );
  const atmImmersive = Boolean(activeAtm && atmImmersiveReady);
  const activeSmsBooth = useMemo(
    () => furniture.find((item) => item.type === "sms_booth") ?? null,
    [furniture],
  );
  const activePhoneBooth = useMemo(
    () => furniture.find((item) => item.type === "phone_booth") ?? null,
    [furniture],
  );
  const effectivePhoneCallScenario =
    phoneCallScenario ??
    (manualPhoneBoothOpen ? manualPhoneCallScenario : null);
  const effectivePhoneBoothAgentId =
    phoneBoothAgentId ??
    (manualPhoneBoothOpen ? "__manual_phone_booth__" : null);
  const phoneBoothViewActive =
    manualPhoneBoothOpen ||
    Boolean(phoneBoothAgentId && phoneBoothCommandArrived);
  const activePhoneCallFlowKey = useMemo(() => {
    if (!effectivePhoneBoothAgentId || !effectivePhoneCallScenario) return null;
    return [
      effectivePhoneBoothAgentId,
      effectivePhoneCallScenario.dialNumber,
      effectivePhoneCallScenario.spokenText ?? "",
      effectivePhoneCallScenario.recipientReply ?? "",
    ].join("|");
  }, [effectivePhoneBoothAgentId, effectivePhoneCallScenario]);
  const phoneBoothImmersive = Boolean(
    activePhoneBooth &&
    effectivePhoneBoothAgentId &&
    effectivePhoneCallScenario &&
    phoneBoothViewActive &&
    phoneBoothImmersiveReady,
  );
  const effectiveTextMessageScenario =
    textMessageScenario ??
    (manualSmsBoothOpen ? manualTextMessageScenario : null);
  const effectiveSmsBoothAgentId =
    smsBoothAgentId ?? (manualSmsBoothOpen ? "__manual_sms_booth__" : null);
  const smsBoothViewActive =
    manualSmsBoothOpen || Boolean(smsBoothAgentId && smsBoothCommandArrived);
  const activeTextMessageFlowKey = useMemo(() => {
    if (!effectiveSmsBoothAgentId || !effectiveTextMessageScenario) return null;
    return [
      effectiveSmsBoothAgentId,
      effectiveTextMessageScenario.recipient,
      effectiveTextMessageScenario.messageText ?? "",
      effectiveTextMessageScenario.confirmationText ?? "",
    ].join("|");
  }, [effectiveSmsBoothAgentId, effectiveTextMessageScenario]);
  const smsBoothImmersive = Boolean(
    activeSmsBooth &&
    effectiveSmsBoothAgentId &&
    effectiveTextMessageScenario &&
    smsBoothViewActive &&
    smsBoothImmersiveReady,
  );
  const meetingTable = useMemo(
    () =>
      furniture.find(
        (item) =>
          item.type === "round_table" &&
          item.x >= 0 &&
          item.x <= 290 &&
          item.y >= 0 &&
          item.y <= 235,
      ) ?? null,
    [furniture],
  );
  const activeGithubTerminal = useMemo(
    () =>
      activeGithubTerminalUid
        ? (furniture.find(
            (item) =>
              item._uid === activeGithubTerminalUid &&
              (item.type === "server_terminal" || item.type === "server_rack"),
          ) ?? null)
        : (serverTerminal ??
            furniture.find((item) => item.type === "server_rack") ??
            null),
    [activeGithubTerminalUid, furniture, serverTerminal],
  );
  const activeQaTerminal = useMemo(
    () =>
      activeQaTerminalUid
        ? (furniture.find(
            (item) =>
              item._uid === activeQaTerminalUid && item.type === "qa_terminal",
          ) ?? null)
        : qaTerminal,
    [activeQaTerminalUid, furniture, qaTerminal],
  );
  const [githubCommandArrived, setGithubCommandArrived] = useState(false);
  const [qaCommandArrived, setQaCommandArrived] = useState(false);
  const githubImmersive =
    Boolean(
      activeGithubTerminal &&
      (activeGithubTerminalUid ||
        (githubReviewAgentId && githubCommandArrived)),
    ) && githubImmersiveReady;
  const qaImmersive =
    Boolean(
      activeQaTerminal &&
      (activeQaTerminalUid || (qaTestingAgentId && qaCommandArrived)),
    ) && qaImmersiveReady;
  const standupImmersive = Boolean(standupBoardOpen && standupMeeting);
  const immersiveOverlayActive =
    monitorImmersive ||
    atmImmersive ||
    smsBoothImmersive ||
    phoneBoothImmersive ||
    githubImmersive ||
    qaImmersive ||
    standupImmersive;

  // Camera constants.
  const LOCAL_CAMERA_TARGET = useMemo(
    () =>
      // Wider HQ overview: center a touch lower/right so the full office reads
      // like the classic overview composition instead of starting too close.
      toWorld(LOCAL_OFFICE_CANVAS_WIDTH / 2 + 20, LOCAL_OFFICE_CANVAS_HEIGHT / 2 + 34),
    [],
  );
  const LOCAL_CAMERA_POSITION = useMemo<[
    number,
    number,
    number,
  ]>(
    () => [
      LOCAL_CAMERA_TARGET[0] + 28,
      52,
      LOCAL_CAMERA_TARGET[2] + 28,
    ],
    [LOCAL_CAMERA_TARGET],
  );
  const LOCAL_FOCUSED_CAMERA_PRESETS = useMemo(
    () => ({
      overview: { pos: LOCAL_CAMERA_POSITION, target: LOCAL_CAMERA_TARGET, zoom: 31 },
      frontDesk: {
        pos: [LOCAL_CAMERA_TARGET[0] + 8, 20, LOCAL_CAMERA_TARGET[2] + 6] as [number, number, number],
        target: [LOCAL_CAMERA_TARGET[0] - 2.5, 0, LOCAL_CAMERA_TARGET[2] - 3] as [number, number, number],
        zoom: 66,
      },
      lounge: {
        pos: [LOCAL_CAMERA_TARGET[0] - 8, 18, LOCAL_CAMERA_TARGET[2] + 4] as [number, number, number],
        target: [LOCAL_CAMERA_TARGET[0] + 2, 0, LOCAL_CAMERA_TARGET[2] - 1] as [number, number, number],
        zoom: 62,
      },
    }),
    [LOCAL_CAMERA_POSITION, LOCAL_CAMERA_TARGET],
  );
  const cameraPresetMap = useMemo(
    () =>
      remoteOfficeEnabled
        ? CAMERA_PRESET_MAP
        : LOCAL_FOCUSED_CAMERA_PRESETS,
    [LOCAL_FOCUSED_CAMERA_PRESETS, remoteOfficeEnabled],
  );
  const defaultCameraTarget = remoteOfficeEnabled
    ? DISTRICT_CAMERA_TARGET
    : LOCAL_FOCUSED_CAMERA_PRESETS.overview.target;
  const defaultCameraPosition = remoteOfficeEnabled
    ? DISTRICT_CAMERA_POSITION
    : LOCAL_FOCUSED_CAMERA_PRESETS.overview.pos;
  const defaultCameraZoom = remoteOfficeEnabled ? DISTRICT_CAMERA_ZOOM : LOCAL_FOCUSED_CAMERA_PRESETS.overview.zoom;
  const overviewCameraPreset = useMemo(
    () => ({ pos: defaultCameraPosition, target: defaultCameraTarget, zoom: defaultCameraZoom }),
    [defaultCameraPosition, defaultCameraTarget, defaultCameraZoom],
  );
  const persistedCameraPreset = initialPersistedCameraRef.current;
  const initialOfficeCameraPreset = persistedCameraPreset ?? overviewCameraPreset;
  const cameraTarget = initialOfficeCameraPreset.target;
  const cameraPosition = initialOfficeCameraPreset.pos;
  const cameraZoom = initialOfficeCameraPreset.zoom;
  const compactRosterAgents = useMemo(
    () => agents.slice(0, COMPACT_AGENT_BADGE_LIMIT),
    [agents],
  );
  const hiddenAgentCount = Math.max(
    0,
    agents.length - compactRosterAgents.length,
  );
  const standupActive =
    standupMeeting?.phase === "gathering" ||
    standupMeeting?.phase === "in_progress";
  const standupSpeakerCard =
    standupMeeting?.cards.find(
      (card) => card.agentId === standupMeeting.currentSpeakerAgentId,
    ) ?? null;
  const activeMonitorComputer = useMemo(() => {
    if (!monitorAgentId) return null;
    const deskIdx = assignedDeskIndexByAgentId[monitorAgentId];
    if (typeof deskIdx !== "number") return null;
    const computerItems = furniture.filter((item) => item.type === "computer");
    return (
      computerItems.find(
        (item) => resolveDeskIndexForItem(item, deskLocations) === deskIdx,
      ) ?? null
    );
  }, [assignedDeskIndexByAgentId, deskLocations, furniture, monitorAgentId]);
  const agentRosterVisible = agentRosterOpen && !immersiveOverlayActive;
  const selectedItem = useMemo(
    () => furniture.find((item) => item._uid === selectedUid) ?? null,
    [furniture, selectedUid],
  );
  const selectedDeskAssignmentAgentId =
    selectedItem?.type === "desk_cubicle"
      ? (deskAssignmentByDeskUid[selectedItem._uid] ?? "")
      : "";
  const selectedPaletteEntry = useMemo(
    () => (selectedItem ? PALETTE_BY_TYPE.get(selectedItem.type) ?? null : null),
    [selectedItem],
  );
  const visiblePaletteCategories = useMemo(
    () =>
      GROUPED_PALETTE.filter((category) =>
        activePaletteCategory === "all" ? true : category.key === activePaletteCategory,
      ),
    [activePaletteCategory],
  );
  const [isSavingOfficeLayout, setIsSavingOfficeLayout] = useState(false);

  const persistOfficeLayout = useCallback(async () => {
    if (readOnly) return;

    if (companyId && storageNamespace === "default") {
      const response = await fetch("/api/office/company-layout", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Company office layout",
          workspaceId,
          version: 1,
          layoutJson: serializeCompanyOfficeLayout({
            width: LOCAL_OFFICE_CANVAS_WIDTH,
            height: LOCAL_OFFICE_CANVAS_HEIGHT,
            furniture,
            savedAt: new Date().toISOString(),
            storageNamespace,
          }),
        }),
      });

      if (!response.ok) {
        let message = "Failed to persist office layout in backend.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error?.trim()) message = payload.error.trim();
        } catch {}
        throw new Error(message);
      }
      return;
    }

    saveFurniture(furniture, storageNamespace);
  }, [companyId, furniture, readOnly, storageNamespace, workspaceId]);

  useEffect(() => {
    if (readOnly || !editMode) return;

    const timeoutId = window.setTimeout(() => {
      void persistOfficeLayout().catch((error) => {
        console.error("Failed to persist office layout.", error);
      });
    }, 450);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [editMode, persistOfficeLayout, readOnly]);

  useEffect(() => {
    if (readOnly || storageNamespace !== "default") return;
    const gatewayUrl = atmAnalytics?.gatewayUrl?.trim() ?? "";
    if (!gatewayUrl) return;
    const timeoutId = window.setTimeout(() => {
      void fetch("/api/office/layout", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snapshot: {
            gatewayUrl,
            timestamp: new Date().toISOString(),
            width: LOCAL_OFFICE_CANVAS_WIDTH,
            height: LOCAL_OFFICE_CANVAS_HEIGHT,
            furniture,
          },
        }),
      }).catch((error) => {
        console.error("Failed to sync office layout snapshot.", error);
      });
    }, 500);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [atmAnalytics?.gatewayUrl, furniture, readOnly, storageNamespace]);

  useEffect(() => {
    if (followAgentId && monitorAgentId) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [followAgentId, monitorAgentId]);

  useEffect(() => {
    if (followAgentId && activeAtmUid) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeAtmUid, followAgentId]);

  useEffect(() => {
    if (followAgentId && smsBoothAgentId) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [followAgentId, smsBoothAgentId]);

  useEffect(() => {
    if (followAgentId && phoneBoothAgentId) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [followAgentId, phoneBoothAgentId]);

  useEffect(() => {
    if (manualSmsBoothOpen && smsBoothAgentId) {
      const timer = window.setTimeout(() => {
        setManualSmsBoothOpen(false);
        setManualTextMessageScenario(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [manualSmsBoothOpen, smsBoothAgentId]);

  useEffect(() => {
    if (manualPhoneBoothOpen && phoneBoothAgentId) {
      const timer = window.setTimeout(() => {
        setManualPhoneBoothOpen(false);
        setManualPhoneCallScenario(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [manualPhoneBoothOpen, phoneBoothAgentId]);

  useEffect(() => {
    effectiveSmsBoothAgentIdRef.current = effectiveSmsBoothAgentId;
    effectiveTextMessageScenarioRef.current = effectiveTextMessageScenario;
    smsBoothAgentIdRef.current = smsBoothAgentId;
    onTextMessageCompleteRef.current = onTextMessageComplete;
    effectivePhoneBoothAgentIdRef.current = effectivePhoneBoothAgentId;
    effectivePhoneCallScenarioRef.current = effectivePhoneCallScenario;
    phoneBoothAgentIdRef.current = phoneBoothAgentId;
    onPhoneCallSpeakRef.current = onPhoneCallSpeak;
    onPhoneCallCompleteRef.current = onPhoneCallComplete;
    onStandupArrivalsChangeRef.current = onStandupArrivalsChange;
  }, [
    effectiveSmsBoothAgentId,
    effectiveTextMessageScenario,
    onTextMessageComplete,
    smsBoothAgentId,
    effectivePhoneBoothAgentId,
    effectivePhoneCallScenario,
    onPhoneCallComplete,
    onPhoneCallSpeak,
    onStandupArrivalsChange,
    phoneBoothAgentId,
  ]);

  const focusedOverlayViewActive =
    manualPhoneBoothOpen ||
    manualSmsBoothOpen ||
    Boolean(activeAtmUid) ||
    Boolean(activeGithubTerminalUid) ||
    Boolean(activeQaTerminalUid) ||
    Boolean(monitorAgentId) ||
    Boolean(followAgentId) ||
    standupBoardOpen;

  useEffect(() => {
    if (focusedOverlayViewActive && !previousFocusedViewActiveRef.current) {
      if (currentCameraSnapshotRef.current) {
        preservedOfficeCameraRef.current = currentCameraSnapshotRef.current;
        persistCameraPreset(cameraPersistenceKey, currentCameraSnapshotRef.current);
        initialPersistedCameraRef.current = currentCameraSnapshotRef.current;
        lastPersistedCameraJsonRef.current = JSON.stringify(currentCameraSnapshotRef.current);
      }
    }
    previousFocusedViewActiveRef.current = focusedOverlayViewActive;
  }, [cameraPersistenceKey, focusedOverlayViewActive]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (followAgentId || focusedOverlayViewActive) return;
      const snapshot = currentCameraSnapshotRef.current;
      if (!snapshot) return;
      const nextJson = JSON.stringify(snapshot);
      if (nextJson === lastPersistedCameraJsonRef.current) return;
      persistCameraPreset(cameraPersistenceKey, snapshot);
      initialPersistedCameraRef.current = snapshot;
      lastPersistedCameraJsonRef.current = nextJson;
    }, 700);
    return () => {
      window.clearInterval(interval);
    };
  }, [cameraPersistenceKey, focusedOverlayViewActive, followAgentId]);

  const closeManualPhoneBoothView = useCallback(() => {
    activePhoneCallFlowKeyRef.current = null;
    setManualPhoneBoothOpen(false);
    setManualPhoneCallScenario(null);
    setPhoneBoothImmersiveReady(false);
    setPhoneBoothDoorOpen(false);
    setPhoneBoothCommandArrived(false);
    setPhoneCallStep("dialing");
    setDialedDigits("");
    if (
      !followAgentId &&
      !monitorAgentId &&
      !activeAtmUid &&
      !activeGithubTerminalUid &&
      !activeQaTerminalUid
    ) {
      restorePreservedOfficeCamera();
    }
  }, [
    activeAtmUid,
    activeGithubTerminalUid,
    activeQaTerminalUid,
    followAgentId,
    monitorAgentId,
    restorePreservedOfficeCamera,
  ]);

  const closeManualSmsBoothView = useCallback(() => {
    activeTextMessageFlowKeyRef.current = null;
    setManualSmsBoothOpen(false);
    setManualTextMessageScenario(null);
    setSmsBoothImmersiveReady(false);
    setSmsBoothDoorOpen(false);
    setSmsBoothCommandArrived(false);
    setTextMessageStep("selecting_contact");
    setTypedMessageText("");
    setActiveTextKey(null);
    setTextContacts([]);
    setActiveTextContactIndex(null);
    if (
      !followAgentId &&
      !monitorAgentId &&
      !activeAtmUid &&
      !activeGithubTerminalUid &&
      !activeQaTerminalUid
    ) {
      restorePreservedOfficeCamera();
    }
  }, [
    activeAtmUid,
    activeGithubTerminalUid,
    activeQaTerminalUid,
    followAgentId,
    monitorAgentId,
    restorePreservedOfficeCamera,
  ]);

  const getBoothAudioContext = useCallback(async () => {
    if (typeof window === "undefined") return null;
    const AudioContextCtor =
      window.AudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).webkitAudioContext as typeof AudioContext | undefined);
    if (!AudioContextCtor) return null;
    if (!boothAudioCtxRef.current) {
      boothAudioCtxRef.current = new AudioContextCtor();
    }
    if (boothAudioCtxRef.current.state === "suspended") {
      await boothAudioCtxRef.current.resume();
    }
    return boothAudioCtxRef.current;
  }, []);

  const playPhoneKeyTone = useCallback(async () => {
    const audioContext = await getBoothAudioContext();
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(1320, now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.028, now + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
  }, [getBoothAudioContext]);

  const playTextKeyTone = useCallback(
    async (options?: {
      frequency?: number;
      durationMs?: number;
      gain?: number;
    }) => {
      const audioContext = await getBoothAudioContext();
      if (!audioContext) return;
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const frequency = options?.frequency ?? 920;
      const duration = (options?.durationMs ?? 58) / 1000;
      const peakGain = options?.gain ?? 0.018;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, now);
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, now + 0.004);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.01);
    },
    [getBoothAudioContext],
  );

  const playPhoneRingTone = useCallback(async () => {
    const audioContext = await getBoothAudioContext();
    if (!audioContext) return 1400;
    const now = audioContext.currentTime;
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.connect(audioContext.destination);

    const oscillatorA = audioContext.createOscillator();
    oscillatorA.type = "sine";
    oscillatorA.frequency.setValueAtTime(440, now);
    oscillatorA.connect(gainNode);

    const oscillatorB = audioContext.createOscillator();
    oscillatorB.type = "sine";
    oscillatorB.frequency.setValueAtTime(480, now);
    oscillatorB.connect(gainNode);

    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.44);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.64);
    gainNode.gain.setValueAtTime(0.0001, now + 0.86);
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.9);
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + 1.24);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.36);

    oscillatorA.start(now);
    oscillatorB.start(now);
    oscillatorA.stop(now + 1.38);
    oscillatorB.stop(now + 1.38);
    return 1400;
  }, [getBoothAudioContext]);

  const playBoothVoice = useCallback(
    async (text: string): Promise<void> => {
      try {
        const response = await fetch("/api/office/voice/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voiceId: voiceRepliesVoiceId ?? undefined,
            speed: voiceRepliesSpeed ?? 1,
          }),
        });
        if (!response.ok) return;
        const blob = await response.blob();
        const audioContext = await getBoothAudioContext();
        if (!audioContext) return;
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
        const arrayBuffer = await blob.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(
          arrayBuffer.slice(0),
        );
        const source = audioContext.createBufferSource();
        source.buffer = decoded;
        source.connect(audioContext.destination);
        source.start();
      } catch (error) {
        console.warn("Booth voice playback failed.", error);
      }
    },
    [getBoothAudioContext, voiceRepliesSpeed, voiceRepliesVoiceId],
  );

  useEffect(() => {
    if (followAgentId && (activeGithubTerminalUid || githubReviewAgentId)) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeGithubTerminalUid, followAgentId, githubReviewAgentId]);

  useEffect(() => {
    if (followAgentId && (activeQaTerminalUid || qaTestingAgentId)) {
      const timer = window.setTimeout(() => {
        setFollowAgentId(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeQaTerminalUid, followAgentId, qaTestingAgentId]);

  useEffect(() => {
    if (monitorAgentId && activeAtmUid) {
      const timer = window.setTimeout(() => {
        setActiveAtmUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeAtmUid, monitorAgentId]);

  useEffect(() => {
    if (monitorAgentId && activeGithubTerminalUid) {
      const timer = window.setTimeout(() => {
        setActiveGithubTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeGithubTerminalUid, monitorAgentId]);

  useEffect(() => {
    if (monitorAgentId && activeQaTerminalUid) {
      const timer = window.setTimeout(() => {
        setActiveQaTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeQaTerminalUid, monitorAgentId]);

  useEffect(() => {
    if (activeAtmUid && activeGithubTerminalUid) {
      const timer = window.setTimeout(() => {
        setActiveGithubTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeAtmUid, activeGithubTerminalUid]);

  useEffect(() => {
    if (activeAtmUid && activeQaTerminalUid) {
      const timer = window.setTimeout(() => {
        setActiveQaTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeAtmUid, activeQaTerminalUid]);

  useEffect(() => {
    if (!smsBoothAgentId) return;
    const timer = window.setTimeout(() => {
      if (activeAtmUid) {
        setActiveAtmUid(null);
      }
      if (activeGithubTerminalUid) {
        setActiveGithubTerminalUid(null);
      }
      if (activeQaTerminalUid) {
        setActiveQaTerminalUid(null);
      }
      if (monitorAgentId) {
        onMonitorSelect?.(null);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeAtmUid,
    activeGithubTerminalUid,
    activeQaTerminalUid,
    monitorAgentId,
    onMonitorSelect,
    smsBoothAgentId,
  ]);

  useEffect(() => {
    if (!phoneBoothAgentId) return;
    const timer = window.setTimeout(() => {
      if (activeAtmUid) {
        setActiveAtmUid(null);
      }
      if (activeGithubTerminalUid) {
        setActiveGithubTerminalUid(null);
      }
      if (activeQaTerminalUid) {
        setActiveQaTerminalUid(null);
      }
      if (monitorAgentId) {
        onMonitorSelect?.(null);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeAtmUid,
    activeGithubTerminalUid,
    activeQaTerminalUid,
    monitorAgentId,
    onMonitorSelect,
    phoneBoothAgentId,
  ]);

  useEffect(() => {
    if (activeGithubTerminalUid && activeQaTerminalUid) {
      const timer = window.setTimeout(() => {
        setActiveQaTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeGithubTerminalUid, activeQaTerminalUid]);

  useEffect(() => {
    const syncArrivalState = () => {
      const agentLookup = renderAgentLookupRef.current;

      if (!githubReviewAgentId) {
        setGithubCommandArrived(false);
      } else {
        const agent = agentLookup.get(githubReviewAgentId);
        const arrived = Boolean(
          agent &&
          Math.hypot(
            agent.x - SERVER_ROOM_TARGET.x,
            agent.y - SERVER_ROOM_TARGET.y,
          ) < 16,
        );
        setGithubCommandArrived((current) =>
          current === arrived ? current : arrived,
        );
      }

      if (!qaTestingAgentId) {
        setQaCommandArrived(false);
      } else {
        const agent = agentLookup.get(qaTestingAgentId);
        const arrived = Boolean(
          agent &&
          agent.interactionTarget === "qa_lab" &&
          agent.qaLabStage === "station" &&
          Math.hypot(agent.x - agent.targetX, agent.y - agent.targetY) < 16,
        );
        setQaCommandArrived((current) =>
          current === arrived ? current : arrived,
        );
      }

      if (!phoneBoothAgentId) {
        setPhoneBoothCommandArrived(false);
        if (!manualPhoneBoothOpen) {
          setPhoneBoothDoorOpen(false);
        }
      } else {
        const agent = agentLookup.get(phoneBoothAgentId);
        const arrived = Boolean(
          agent &&
          agent.interactionTarget === "phone_booth" &&
          agent.phoneBoothStage === "receiver" &&
          Math.hypot(agent.x - agent.targetX, agent.y - agent.targetY) < 16,
        );
        const doorOpen = Boolean(
          agent &&
          agent.interactionTarget === "phone_booth" &&
          agent.phoneBoothStage !== undefined &&
          agent.phoneBoothStage !== "door_outer",
        );
        setPhoneBoothCommandArrived((current) =>
          current === arrived ? current : arrived,
        );
        setPhoneBoothDoorOpen((current) =>
          current === doorOpen ? current : doorOpen,
        );
      }

      if (!smsBoothAgentId) {
        setSmsBoothCommandArrived(false);
        if (!manualSmsBoothOpen) {
          setSmsBoothDoorOpen(false);
        }
      } else {
        const agent = agentLookup.get(smsBoothAgentId);
        const arrived = Boolean(
          agent &&
          agent.interactionTarget === "sms_booth" &&
          agent.smsBoothStage === "typing" &&
          Math.hypot(agent.x - agent.targetX, agent.y - agent.targetY) < 16,
        );
        const doorOpen = Boolean(
          agent &&
          agent.interactionTarget === "sms_booth" &&
          agent.smsBoothStage !== undefined &&
          agent.smsBoothStage !== "door_outer",
        );
        setSmsBoothCommandArrived((current) =>
          current === arrived ? current : arrived,
        );
        setSmsBoothDoorOpen((current) =>
          current === doorOpen ? current : doorOpen,
        );
      }

      if (!standupActive || !standupMeeting) {
        const nextArrivalsKey = "";
        if (lastStandupArrivalKeyRef.current === nextArrivalsKey) return;
        lastStandupArrivalKeyRef.current = nextArrivalsKey;
        onStandupArrivalsChangeRef.current?.([]);
        return;
      }

      const arrivedParticipants = standupMeeting.participantOrder.filter(
        (agentId) => {
          const agent = agentLookup.get(agentId);
          if (!agent || agent.interactionTarget !== "meeting_room")
            return false;
          return (
            Math.hypot(agent.x - agent.targetX, agent.y - agent.targetY) < 18
          );
        },
      );
      const nextArrivalsKey = arrivedParticipants.join("|");
      if (lastStandupArrivalKeyRef.current === nextArrivalsKey) return;
      lastStandupArrivalKeyRef.current = nextArrivalsKey;
      onStandupArrivalsChangeRef.current?.(arrivedParticipants);
    };

    syncArrivalState();
    const intervalId = window.setInterval(syncArrivalState, 150);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    githubReviewAgentId,
    manualSmsBoothOpen,
    manualPhoneBoothOpen,
    phoneBoothAgentId,
    qaTestingAgentId,
    renderAgentLookupRef,
    smsBoothAgentId,
    standupActive,
    standupMeeting,
  ]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setSmsBoothImmersiveReady(false);
    }, 0);
    if (!smsBoothViewActive || !effectiveTextMessageScenario) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setSmsBoothImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [effectiveTextMessageScenario, smsBoothViewActive]);

  useEffect(() => {
    if (!smsBoothImmersive || !activeTextMessageFlowKey) {
      activeTextMessageFlowKeyRef.current = null;
      const timer = window.setTimeout(() => {
        setTextMessageStep("selecting_contact");
        setTypedMessageText("");
        setActiveTextKey(null);
        setTextContacts([]);
        setActiveTextContactIndex(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
    if (activeTextMessageFlowKeyRef.current === activeTextMessageFlowKey) {
      return;
    }
    activeTextMessageFlowKeyRef.current = activeTextMessageFlowKey;
    const scenario = effectiveTextMessageScenarioRef.current;
    if (!scenario?.messageText?.trim()) {
      return;
    }
    const { contacts, targetIndex } = buildSmsContactList(scenario.recipient);
    const initTimer = window.setTimeout(() => {
      setTextMessageStep("selecting_contact");
      setTypedMessageText("");
      setActiveTextKey(null);
      setTextContacts(contacts);
      setActiveTextContactIndex(0);
    }, 0);
    let index = 0;
    let contactIndex = 0;
    let contactTimer: number | null = null;
    let typingTimer: number | null = null;
    let stageTimer: number | null = null;
    let keyResetTimer: number | null = null;

    const resolveKeyboardKey = (character: string): string | null => {
      if (!character) return null;
      if (character === " ") return "space";
      if (character === "\n") return "return";
      const normalized = character.toLowerCase();
      if (/^[a-z]$/.test(normalized)) return normalized;
      if ([",", ".", "?", "!"].includes(normalized)) return normalized;
      if (normalized === "'") return "'";
      return null;
    };

    const clearActiveKey = () => {
      if (keyResetTimer !== null) {
        window.clearTimeout(keyResetTimer);
        keyResetTimer = null;
      }
      setActiveTextKey(null);
    };

    const pulseKeyboardKey = (
      key: string,
      options?: { frequency?: number; durationMs?: number; gain?: number },
    ) => {
      setActiveTextKey(key);
      void playTextKeyTone(options);
      if (keyResetTimer !== null) {
        window.clearTimeout(keyResetTimer);
      }
      keyResetTimer = window.setTimeout(() => {
        setActiveTextKey(null);
        keyResetTimer = null;
      }, 110);
    };

    const finishTextFlow = () => {
      stageTimer = window.setTimeout(() => {
        setTextMessageStep("delivered");
        stageTimer = window.setTimeout(() => {
          setTextMessageStep("reply");
          stageTimer = window.setTimeout(() => {
            setTextMessageStep("complete");
            stageTimer = window.setTimeout(() => {
              if (effectiveSmsBoothAgentIdRef.current) {
                onTextMessageCompleteRef.current?.(effectiveSmsBoothAgentIdRef.current);
              } else {
                closeManualSmsBoothView();
              }
            }, 1800);
          }, 1400);
        }, 1200);
      }, 700);
    };

    const startTyping = () => {
      setTextMessageStep("composing");
      typingTimer = window.setInterval(() => {
        index += 1;
        const nextChunk = scenario.messageText?.slice(0, index) ?? "";
        const typedCharacter = scenario.messageText?.charAt(index - 1) ?? "";
        setTypedMessageText(nextChunk);
        const pressedKey = resolveKeyboardKey(typedCharacter);
        if (pressedKey) {
          pulseKeyboardKey(pressedKey);
        }
        if (
          index >= (scenario.messageText?.length ?? 0) &&
          typingTimer !== null
        ) {
          window.clearInterval(typingTimer);
          typingTimer = null;
          clearActiveKey();
          pulseKeyboardKey("return", {
            frequency: 760,
            durationMs: 84,
            gain: 0.022,
          });
          setTextMessageStep("sending");
          finishTextFlow();
        }
      }, 80);
    };

    const openConversation = () => {
      void playTextKeyTone({
        frequency: 1020,
        durationMs: 70,
        gain: 0.02,
      });
      stageTimer = window.setTimeout(() => {
        startTyping();
      }, 280);
    };

    if (targetIndex <= 0) {
      openConversation();
    } else {
      contactTimer = window.setInterval(() => {
        contactIndex = Math.min(contactIndex + 1, targetIndex);
        setActiveTextContactIndex(contactIndex);
        void playTextKeyTone({
          frequency: 840,
          durationMs: 42,
          gain: 0.012,
        });
        if (contactIndex >= targetIndex && contactTimer !== null) {
          window.clearInterval(contactTimer);
          contactTimer = null;
          stageTimer = window.setTimeout(() => {
            openConversation();
          }, 260);
        }
      }, 180);
    }

    return () => {
      window.clearTimeout(initTimer);
      if (contactTimer !== null) {
        window.clearInterval(contactTimer);
      }
      if (typingTimer !== null) {
        window.clearInterval(typingTimer);
      }
      clearActiveKey();
      if (stageTimer !== null) {
        window.clearTimeout(stageTimer);
      }
    };
  }, [
    activeTextMessageFlowKey,
    closeManualSmsBoothView,
    playTextKeyTone,
    smsBoothImmersive,
  ]);

  useEffect(() => {
    const activeViewKey = manualSmsBoothOpen
      ? "manual"
      : smsBoothAgentId && smsBoothCommandArrived
        ? `agent:${smsBoothAgentId}`
        : null;
    if (!activeViewKey && prevSmsBoothViewRef.current) {
      restorePreservedOfficeCamera();
    }
    if (!activeViewKey || !activeSmsBooth) {
      prevSmsBoothViewRef.current = activeViewKey;
      return;
    }
    prevSmsBoothViewRef.current = activeViewKey;
  }, [
    activeSmsBooth,
    manualSmsBoothOpen,
    smsBoothAgentId,
    smsBoothCommandArrived,
  ]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setPhoneBoothImmersiveReady(false);
    }, 0);
    if (!phoneBoothViewActive || !effectivePhoneCallScenario) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setPhoneBoothImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [effectivePhoneCallScenario, phoneBoothViewActive]);

  useEffect(() => {
    if (!phoneBoothImmersive || !activePhoneCallFlowKey) {
      activePhoneCallFlowKeyRef.current = null;
      const timer = window.setTimeout(() => {
        setPhoneCallStep("dialing");
        setDialedDigits("");
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
    if (activePhoneCallFlowKeyRef.current === activePhoneCallFlowKey) {
      return;
    }
    activePhoneCallFlowKeyRef.current = activePhoneCallFlowKey;
    const scenario = effectivePhoneCallScenarioRef.current;
    const boothAgentId = effectivePhoneBoothAgentIdRef.current;
    if (!scenario || !boothAgentId) {
      return;
    }
    const digits = scenario.dialNumber.replace(/\s+/g, "");
    const initTimer = window.setTimeout(() => {
      setPhoneCallStep("dialing");
      setDialedDigits("");
    }, 0);
    let digitIndex = 0;
    let digitTimer: number | null = null;
    let stageTimer: number | null = null;
    let cancelled = false;

    const advanceDigits = () => {
      digitTimer = window.setInterval(() => {
        digitIndex += 1;
        const nextChunk = digits.slice(0, digitIndex);
        const nextCharacter = digits[digitIndex - 1] ?? "";
        setDialedDigits(nextChunk);
        if (/\d/.test(nextCharacter)) {
          void playPhoneKeyTone();
        }
        if (digitIndex >= digits.length && digitTimer !== null) {
          window.clearInterval(digitTimer);
          digitTimer = null;
          setPhoneCallStep("ringing");
          void playPhoneRingTone().then((ringDurationMs) => {
            if (cancelled) return;
            stageTimer = window.setTimeout(() => {
              if (cancelled) return;
              setPhoneCallStep("speaking");
              if (scenario.spokenText?.trim()) {
                void playBoothVoice(scenario.spokenText);
              }
              onPhoneCallSpeakRef.current?.({
                agentId: boothAgentId,
                requestKey: `${boothAgentId}:${scenario.dialNumber}:${scenario.spokenText ?? ""}`,
                scenario,
              });
              const speechDurationMs =
                estimatePhoneSpeechDurationMs(scenario.spokenText) + 2_500;
              stageTimer = window.setTimeout(() => {
                setPhoneCallStep("reply");
                stageTimer = window.setTimeout(() => {
                  setPhoneCallStep("complete");
                  stageTimer = window.setTimeout(() => {
                    if (phoneBoothAgentIdRef.current) {
                      onPhoneCallCompleteRef.current?.(
                        phoneBoothAgentIdRef.current,
                      );
                    } else {
                      closeManualPhoneBoothView();
                    }
                  }, 2000);
                }, 1600);
              }, speechDurationMs);
            }, ringDurationMs);
          });
        }
      }, 170);
    };

    advanceDigits();
    return () => {
      window.clearTimeout(initTimer);
      cancelled = true;
      if (digitTimer !== null) {
        window.clearInterval(digitTimer);
      }
      if (stageTimer !== null) {
        window.clearTimeout(stageTimer);
      }
    };
  }, [
    activePhoneCallFlowKey,
    closeManualPhoneBoothView,
    phoneBoothImmersive,
    playBoothVoice,
    playPhoneKeyTone,
    playPhoneRingTone,
  ]);

  useEffect(() => {
    const activeViewKey = manualPhoneBoothOpen
      ? "manual"
      : phoneBoothAgentId && phoneBoothCommandArrived
        ? `agent:${phoneBoothAgentId}`
        : null;
    if (!activeViewKey && prevPhoneBoothViewRef.current) {
      restorePreservedOfficeCamera();
    }
    if (!activeViewKey || !activePhoneBooth) {
      prevPhoneBoothViewRef.current = activeViewKey;
      return;
    }
    prevPhoneBoothViewRef.current = activeViewKey;
  }, [
    activePhoneBooth,
    manualPhoneBoothOpen,
    phoneBoothAgentId,
    phoneBoothCommandArrived,
  ]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setMonitorImmersiveReady(false);
    }, 0);
    if (!monitorAgentId) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setMonitorImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [monitorAgentId]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setAtmImmersiveReady(false);
    }, 0);
    if (!activeAtmUid) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setAtmImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [activeAtmUid]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setGithubImmersiveReady(false);
    }, 0);
    const githubViewActive =
      Boolean(activeGithubTerminalUid) ||
      Boolean(githubReviewAgentId && githubCommandArrived);
    if (!githubViewActive) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setGithubImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [activeGithubTerminalUid, githubCommandArrived, githubReviewAgentId]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setQaImmersiveReady(false);
    }, 0);
    const qaViewActive =
      Boolean(activeQaTerminalUid) ||
      Boolean(qaTestingAgentId && qaCommandArrived);
    if (!qaViewActive) {
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    const timer = window.setTimeout(() => {
      setQaImmersiveReady(true);
    }, 900);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [activeQaTerminalUid, qaCommandArrived, qaTestingAgentId]);

  useEffect(() => {
    if (!standupMeeting) {
      const timer = window.setTimeout(() => {
        setStandupBoardOpen(false);
      }, 0);
      autoOpenedStandupIdRef.current = null;
      return () => {
        window.clearTimeout(timer);
      };
    }
    const everyoneArrived =
      standupMeeting.participantOrder.length > 0 &&
      standupMeeting.participantOrder.every((agentId) =>
        standupMeeting.arrivedAgentIds.includes(agentId),
      );
    if (
      !standupAutoOpenBoard ||
      standupMeeting.phase !== "in_progress" ||
      !everyoneArrived ||
      autoOpenedStandupIdRef.current === standupMeeting.id
    ) {
      return;
    }
    autoOpenedStandupIdRef.current = standupMeeting.id;
    const timer = window.setTimeout(() => {
      setStandupBoardOpen(true);
    }, 900);
    return () => {
      window.clearTimeout(timer);
    };
  }, [meetingTable, restorePreservedOfficeCamera, standupAutoOpenBoard, standupMeeting]);

  useEffect(() => {
    if (!monitorAgentId && prevMonitorAgentIdRef.current) {
      restorePreservedOfficeCamera();
    }
    if (!monitorAgentId || !activeMonitorComputer) {
      prevMonitorAgentIdRef.current = monitorAgentId;
      return;
    }
    prevMonitorAgentIdRef.current = monitorAgentId;
  }, [activeMonitorComputer, monitorAgentId, restorePreservedOfficeCamera]);

  useEffect(() => {
    if (activeAtmUid && !activeAtm) {
      const timer = window.setTimeout(() => {
        setActiveAtmUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeAtm, activeAtmUid, restorePreservedOfficeCamera]);

  useEffect(() => {
    if (activeGithubTerminalUid && !activeGithubTerminal) {
      const timer = window.setTimeout(() => {
        setActiveGithubTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeGithubTerminal, activeGithubTerminalUid]);

  useEffect(() => {
    if (activeQaTerminalUid && !activeQaTerminal) {
      const timer = window.setTimeout(() => {
        setActiveQaTerminalUid(null);
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [activeQaTerminal, activeQaTerminalUid]);

  useEffect(() => {
    if (!activeAtmUid && prevAtmUidRef.current) {
      restorePreservedOfficeCamera();
    }
    if (!activeAtmUid || !activeAtm) {
      prevAtmUidRef.current = activeAtmUid;
      return;
    }
    prevAtmUidRef.current = activeAtmUid;
  }, [activeAtm, activeAtmUid, restorePreservedOfficeCamera]);

  useEffect(() => {
    const activeViewKey = activeGithubTerminalUid
      ? `manual:${activeGithubTerminalUid}`
      : githubReviewAgentId && githubCommandArrived
        ? `agent:${githubReviewAgentId}`
        : null;
    if (!activeViewKey && prevGithubViewRef.current) {
      restorePreservedOfficeCamera();
    }
    if (!activeViewKey || !activeGithubTerminal) {
      prevGithubViewRef.current = activeViewKey;
      return;
    }
    prevGithubViewRef.current = activeViewKey;
  }, [
    activeGithubTerminal,
    activeGithubTerminalUid,
    githubCommandArrived,
    githubReviewAgentId,
  ]);

  useEffect(() => {
    const activeViewKey = activeQaTerminalUid
      ? `manual:${activeQaTerminalUid}`
      : qaTestingAgentId && qaCommandArrived
        ? `agent:${qaTestingAgentId}`
        : null;
    if (!activeViewKey && prevQaViewRef.current) {
      restorePreservedOfficeCamera();
    }
    if (!activeViewKey || !activeQaTerminal) {
      prevQaViewRef.current = activeViewKey;
      return;
    }
    prevQaViewRef.current = activeViewKey;
  }, [
    activeQaTerminal,
    activeQaTerminalUid,
    qaCommandArrived,
    qaTestingAgentId,
  ]);

  // --- Interaction ---
  const handleFurniturePointerDown = useCallback(
    (uid: string) => {
      if (!editMode) return;
      if (drag.kind === "placing") return;
      setSelectedUid(uid);
      setDrawerOpen(false);
      setDrag({ kind: "moving", uid });
    },
    [drag.kind, editMode],
  );

  const resolveAgentIdForDeskItem = useCallback(
    (uid: string) => {
      const item = furniture.find((entry) => entry._uid === uid);
      if (!item) return null;
      const deskIdx = resolveDeskIndexForItem(
        item,
        getDeskLocations(furniture),
      );
      if (deskIdx < 0) return null;
      for (const [id, index] of deskByAgentRef.current) {
        if (index === deskIdx) return id;
      }
      return null;
    },
    [deskByAgentRef, furniture],
  );

  // E3 Idea 2: click a desk to send its assigned agent to walk and sit there.
  const handleDeskClick = useCallback(
    (uid: string) => {
      if (editMode) return;
      const item = furniture.find((f) => f._uid === uid);
      if (!item) return;
      if (item.type !== "sms_booth" && manualSmsBoothOpen) {
        closeManualSmsBoothView();
      }
      if (item.type !== "phone_booth" && manualPhoneBoothOpen) {
        closeManualPhoneBoothView();
      }
      if (item.type === "pingpong") {
        const now = Date.now();
        const [tableWx, , tableWz] = toWorld(
          item.x + (item.w ?? 100) / 2,
          item.y + (item.h ?? 60) / 2,
        );
        setFollowAgentId(null);
        setActiveAtmUid(null);
        onMonitorSelect?.(null);
        cameraPresetRef.current = {
          pos: [tableWx + 2.4, 2.8, tableWz + 2.1],
          target: [tableWx, 0.45, tableWz],
          zoom: 105,
        };
        const targets = resolvePingPongTargets(item);
        const activePlayers = [...renderAgentsRef.current]
          .filter((agent) => agent.pingPongTableUid === item._uid)
          .sort(
            (left, right) =>
              (left.pingPongSide ?? 0) - (right.pingPongSide ?? 0),
          );
        const availableAgents =
          activePlayers.length === 2
            ? activePlayers
            : [...renderAgentsRef.current]
                .filter(
                  (agent) =>
                    agent.status === "idle" &&
                    agent.state !== "walking" &&
                    agent.pingPongUntil === undefined,
                )
                .sort((left, right) => {
                  const leftDistance = Math.hypot(
                    left.x - (item.x + (item.w ?? 100) / 2),
                    left.y - (item.y + (item.h ?? 60) / 2),
                  );
                  const rightDistance = Math.hypot(
                    right.x - (item.x + (item.w ?? 100) / 2),
                    right.y - (item.y + (item.h ?? 60) / 2),
                  );
                  return leftDistance - rightDistance;
                })
                .slice(0, 2);
        if (availableAgents.length < 2) return;
        availableAgents.forEach((agent, index) => {
          const target = targets[index];
          if (!target) return;
          Object.assign(agent, {
            targetX: target.x,
            targetY: target.y,
            path: planPath(agent.x, agent.y, target.x, target.y),
            facing: target.facing,
            state: "walking" as const,
            walkSpeed: Math.max(agent.walkSpeed, PING_PONG_APPROACH_SPEED),
            pingPongUntil: now + PING_PONG_SESSION_MS,
            pingPongTargetX: target.x,
            pingPongTargetY: target.y,
            pingPongFacing: target.facing,
            pingPongPartnerId: availableAgents[1 - index]?.id,
            pingPongTableUid: item._uid,
            pingPongSide: index as 0 | 1,
            pingPongPreviousWalkSpeed:
              agent.pingPongPreviousWalkSpeed ?? agent.walkSpeed,
          } satisfies Partial<RenderAgent>);
        });
        setMoodByAgentId((prev) => {
          const next = { ...prev };
          for (const agent of availableAgents) {
            next[agent.id] = { emoji: "🏓", ts: now };
          }
          return next;
        });
        window.setTimeout(() => {
          setMoodByAgentId((prev) => {
            const next = { ...prev };
            for (const agent of availableAgents) {
              if (next[agent.id]?.emoji === "🏓") delete next[agent.id];
            }
            return next;
          });
        }, 3_500);
        return;
      }
      if (item.type === "atm") {
        setFollowAgentId(null);
        setActiveGithubTerminalUid(null);
        setActiveQaTerminalUid(null);
        onMonitorSelect?.(null);
        setActiveAtmUid(uid);
        return;
      }
      if (item.type === "sms_booth") {
        setFollowAgentId(null);
        setActiveAtmUid(null);
        setActiveGithubTerminalUid(null);
        setActiveQaTerminalUid(null);
        onMonitorSelect?.(null);
        setSmsBoothCommandArrived(true);
        setSmsBoothDoorOpen(true);
        setManualTextMessageScenario(
          buildMockTextMessageScenario({
            recipient: "Joseph",
            message: "I will be late for the soccer game.",
          }),
        );
        setManualSmsBoothOpen(true);
        return;
      }
      if (item.type === "phone_booth") {
        setFollowAgentId(null);
        setActiveAtmUid(null);
        setActiveGithubTerminalUid(null);
        setActiveQaTerminalUid(null);
        onMonitorSelect?.(null);
        setPhoneBoothCommandArrived(true);
        setPhoneBoothDoorOpen(true);
        setManualPhoneCallScenario(
          buildMockPhoneCallScenario({
            callee: "my contact",
            message: "This is a demo call from the OpenClaw phone booth.",
            voiceAvailable:
              voiceRepliesLoaded &&
              Boolean(voiceRepliesVoiceId) &&
              voiceRepliesEnabled,
          }),
        );
        setManualPhoneBoothOpen(true);
        return;
      }
      if (item.type === "server_terminal") {
        setFollowAgentId(null);
        setActiveAtmUid(null);
        setActiveQaTerminalUid(null);
        onMonitorSelect?.(null);
        setActiveGithubTerminalUid(uid);
        return;
      }
      if (item.type === "server_rack") {
        setFollowAgentId(null);
        setActiveAtmUid(null);
        setActiveQaTerminalUid(null);
        onMonitorSelect?.(null);
        setActiveGithubTerminalUid(serverTerminal?._uid ?? uid);
        return;
      }
      if (
        item.type === "qa_terminal" ||
        item.type === "device_rack" ||
        item.type === "test_bench"
      ) {
        setFollowAgentId(null);
        setActiveAtmUid(null);
        setActiveGithubTerminalUid(null);
        onMonitorSelect?.(null);
        setActiveQaTerminalUid(
          item.type === "qa_terminal" ? uid : (qaTerminal?._uid ?? uid),
        );
        return;
      }
      if (
        item.type === "round_table" &&
        item.x >= 0 &&
        item.x <= 290 &&
        item.y >= 0 &&
        item.y <= 235
      ) {
        onStandupStartRequested?.();
        return;
      }
      const agentId = resolveAgentIdForDeskItem(uid);
      if (!agentId) return;
      if (item.type === "computer") {
        setActiveGithubTerminalUid(null);
        setActiveQaTerminalUid(null);
        setActiveAtmUid(null);
        onMonitorSelect?.(agentId);
        return;
      }
      if (item.type !== "desk_cubicle") return;
      setActiveGithubTerminalUid(null);
      setActiveQaTerminalUid(null);
      setActiveAtmUid(null);
      const agent = renderAgentLookupRef.current.get(agentId);
      if (!agent) return;
      const tx = item.x + 40;
      const ty = item.y + 40;
      const path = planPath(agent.x, agent.y, tx, ty);
      // Mutate the render agent ref directly so the tick loop picks it up.
      Object.assign(agent, {
        targetX: tx,
        targetY: ty,
        path,
        state: "walking" as const,
      });
    },
    [
      closeManualSmsBoothView,
      closeManualPhoneBoothView,
      editMode,
      furniture,
      manualSmsBoothOpen,
      manualPhoneBoothOpen,
      onMonitorSelect,
      onStandupStartRequested,
      planPath,
      qaTerminal,
      renderAgentsRef,
      renderAgentLookupRef,
      resolveAgentIdForDeskItem,
      serverTerminal,
      voiceRepliesEnabled,
      voiceRepliesLoaded,
      voiceRepliesVoiceId,
    ],
  );

  const handleFurniturePointerOver = useCallback(
    (uid: string) => setHoverUid(uid),
    [],
  );
  const handleFurniturePointerOut = useCallback(() => setHoverUid(null), []);
  const closeStandupBoard = useCallback(() => {
    setStandupBoardOpen(false);
    setHoverUid(null);
    setSelectedUid(null);
    restorePreservedOfficeCamera();
  }, [restorePreservedOfficeCamera]);

  useEffect(() => {
    const hoveredItem = hoverUid
      ? (furniture.find((item) => item._uid === hoverUid) ?? null)
      : null;
    const hoveredMeetingTable =
      hoveredItem?.type === "round_table" &&
      hoveredItem.x >= 0 &&
      hoveredItem.x <= 290 &&
      hoveredItem.y >= 0 &&
      hoveredItem.y <= 235;
    document.body.style.cursor =
      hoveredItem?.type === "pingpong" ||
      hoveredItem?.type === "atm" ||
      hoveredItem?.type === "sms_booth" ||
      hoveredItem?.type === "phone_booth" ||
      hoveredItem?.type === "server_rack" ||
      hoveredItem?.type === "qa_terminal" ||
      hoveredItem?.type === "device_rack" ||
      hoveredItem?.type === "test_bench" ||
      hoveredItem?.type === "server_terminal" ||
      hoveredMeetingTable
        ? "pointer"
        : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [furniture, hoverUid]);

  const worldToCanvas = useCallback(
    (wx: number, wz: number) => ({
      cx: snap(Math.round((wx + CANVAS_W * SCALE * 0.5) / SCALE)),
      cy: snap(Math.round((wz + CANVAS_H * SCALE * 0.5) / SCALE)),
    }),
    [],
  );

  const wallGhostItem = useMemo(() => {
    if (drag.kind !== "placing" || drag.itemType !== "wall" || !ghostPos) {
      return null;
    }
    const { cx, cy } = worldToCanvas(ghostPos[0], ghostPos[2]);
    const start = wallDrawStart ?? { x: cx, y: cy };
    return createWallItem(start, { x: cx, y: cy }, "__wall_ghost__");
  }, [drag, ghostPos, wallDrawStart, worldToCanvas]);

  const handleFloorMove = useCallback(
    (wx: number, wz: number) => {
      if (drag.kind === "placing") setGhostPos([wx, 0, wz]);
      if (drag.kind === "moving") {
        const { cx, cy } = worldToCanvas(wx, wz);
        setFurniture((prev) =>
          prev.map((item) =>
            item._uid === drag.uid ? { ...item, x: cx, y: cy } : item,
          ),
        );
      }
    },
    [drag, worldToCanvas],
  );

  const handleFloorClick = useCallback(
    (wx: number, wz: number) => {
      if (drag.kind === "placing") {
        const { cx, cy } = worldToCanvas(wx, wz);
        if (drag.itemType === "wall") {
          if (!wallDrawStart) {
            setWallDrawStart({ x: cx, y: cy });
            setGhostPos([wx, 0, wz]);
            return;
          }
          const newWall = createWallItem(
            wallDrawStart,
            { x: cx, y: cy },
            nextUid(),
          );
          setFurniture((prev) => [...prev, newWall]);
          setSelectedUid(newWall._uid);
          setDrawerOpen(false);
          setDrag({ kind: "idle" });
          setGhostPos(null);
          setWallDrawStart(null);
          return;
        }
        const palEntry = PALETTE.find((p) => p.type === drag.itemType);
        const isCouch = drag.itemType === "couch_v";
        const newItem: FurnitureItem = {
          _uid: nextUid(),
          type: isCouch ? "couch" : drag.itemType,
          x: cx,
          y: cy,
          ...palEntry?.defaults,
          ...(isCouch ? { vertical: true, w: 40, h: 80 } : {}),
        };
        if (drag.itemType === "desk_cubicle") {
          newItem.id = `desk_${furniture.filter((i) => i.type === "desk_cubicle").length}`;
        }
        setFurniture((prev) => [...prev, newItem]);
        setSelectedUid(newItem._uid);
        setDrawerOpen(false);
        setDrag({ kind: "idle" });
        setGhostPos(null);
        setWallDrawStart(null);
      }
      if (drag.kind === "moving") setDrag({ kind: "idle" });
    },
    [drag, furniture, wallDrawStart, worldToCanvas],
  );

  const startPlacing = useCallback((type: string) => {
    setDrag({ kind: "placing", itemType: type });
    setSelectedUid(null);
    setDrawerOpen(true);
    setWallDrawStart(null);
    setGhostPos(null);
  }, []);

  const closeSelectedEditor = useCallback(() => {
    setSelectedUid(null);
    setDrag({ kind: "idle" });
    setDrawerOpen(true);
  }, []);

  const updateSelectedItem = useCallback(
    (updater: (item: FurnitureItem) => FurnitureItem) => {
      if (!selectedUid) return;
      setFurniture((prev) =>
        prev.map((item) =>
          item._uid === selectedUid ? clampFurnitureItemToCanvas(updater(item)) : item,
        ),
      );
    },
    [selectedUid],
  );

  const moveSelectedItem = useCallback(
    (deltaX: number, deltaY: number, deltaElevation = 0) => {
      updateSelectedItem((item) => ({
        ...item,
        x: snap(item.x + deltaX),
        y: snap(item.y + deltaY),
        elevation: Math.max(
          -0.4,
          Math.min(2.5, (item.elevation ?? 0) + deltaElevation),
        ),
      }));
    },
    [updateSelectedItem],
  );

  const rotateSelectedItem = useCallback(
    (deltaDegrees: number) => {
      updateSelectedItem((item) => ({
        ...item,
        facing: normalizeDegrees((item.facing ?? 0) + deltaDegrees),
      }));
    },
    [updateSelectedItem],
  );

  const handleDelete = useCallback(() => {
    if (!selectedUid) return;
    const selectedDeskUid =
      selectedItem?.type === "desk_cubicle" ? selectedItem._uid : null;
    if (selectedDeskUid) {
      onDeskAssignmentChange?.(selectedDeskUid, null);
    }
    setFurniture((prev) => prev.filter((i) => i._uid !== selectedUid));
    setSelectedUid(null);
    setDrawerOpen(false);
  }, [onDeskAssignmentChange, selectedItem, selectedUid]);

  const handleReset = async () => {
    if (!window.confirm("Reset the office to the default layout?")) return;

    const nextFurniture = buildCanonicalOfficeLayout(materializeDefaults());

    onDeskAssignmentsReset?.(
      nextFurniture
        .filter((item) => item.type === "desk_cubicle")
        .map((item) => item._uid),
    );
    setFurniture(nextFurniture);
    setSelectedUid(null);
    setDrawerOpen(false);
    setDrag({ kind: "idle" });
    setGhostPos(null);
    setWallDrawStart(null);

    if (readOnly) return;

    try {
      if (companyId && storageNamespace === "default") {
        await fetch("/api/office/company-layout", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Company office layout",
            workspaceId,
            version: 1,
            layoutJson: serializeCompanyOfficeLayout({
              width: LOCAL_OFFICE_CANVAS_WIDTH,
              height: LOCAL_OFFICE_CANVAS_HEIGHT,
              furniture: nextFurniture,
              savedAt: new Date().toISOString(),
              storageNamespace,
            }),
          }),
        });
      } else {
        saveFurniture(nextFurniture, storageNamespace);
      }
    } catch (error) {
      console.error("Failed to persist reset office layout.", error);
    }
  };

  const closeEditMode = useCallback(() => {
    setSelectedUid(null);
    setDrag({ kind: "idle" });
    setDrawerOpen(false);
    setHoverUid(null);
    setGhostPos(null);
    setWallDrawStart(null);
    setEditMode(false);
  }, []);

  const toggleEdit = useCallback(async () => {
    if (!editMode) {
      setDrawerOpen(true);
      setEditMode(true);
      return;
    }

    try {
      setIsSavingOfficeLayout(true);
      await persistOfficeLayout();
      closeEditMode();
    } catch (error) {
      console.error("Failed to save office layout before leaving edit mode.", error);
      const message = error instanceof Error ? error.message : "Failed to save office layout.";
      window.alert(message);
    } finally {
      setIsSavingOfficeLayout(false);
    }
  }, [closeEditMode, editMode, persistOfficeLayout]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (githubImmersive) {
          e.preventDefault();
          if (activeGithubTerminalUid) {
            setActiveGithubTerminalUid(null);
          } else {
            onGithubReviewDismiss?.();
          }
          return;
        }
        if (qaImmersive) {
          e.preventDefault();
          if (activeQaTerminalUid) {
            setActiveQaTerminalUid(null);
          } else {
            onQaLabDismiss?.();
          }
          return;
        }
        if (monitorImmersive) {
          e.preventDefault();
          onMonitorSelect?.(null);
          return;
        }
        if (atmImmersive) {
          e.preventDefault();
          setActiveAtmUid(null);
          return;
        }
      }
      if (!editMode) return;
      if (e.key === "Escape") {
        if (drag.kind === "placing") {
          setDrag({ kind: "idle" });
          setGhostPos(null);
          setWallDrawStart(null);
          setDrawerOpen(true);
        } else {
          setSelectedUid(null);
          setDrawerOpen(true);
        }
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedUid) {
        if (document.activeElement?.tagName === "INPUT") return;
        e.preventDefault();
        handleDelete();
      }
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (selectedUid) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          moveSelectedItem(-SNAP_GRID, 0);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          moveSelectedItem(SNAP_GRID, 0);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          moveSelectedItem(0, -SNAP_GRID);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          moveSelectedItem(0, SNAP_GRID);
        } else if (e.key === "PageUp") {
          e.preventDefault();
          moveSelectedItem(0, 0, ELEVATION_STEP);
        } else if (e.key === "PageDown") {
          e.preventDefault();
          moveSelectedItem(0, 0, -ELEVATION_STEP);
        } else if (e.key === "[") {
          e.preventDefault();
          rotateSelectedItem(-ROTATION_STEP_DEG);
        } else if (e.key === "]") {
          e.preventDefault();
          rotateSelectedItem(ROTATION_STEP_DEG);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeQaTerminalUid,
    activeGithubTerminalUid,
    atmImmersive,
    editMode,
    drag,
    githubImmersive,
    handleDelete,
    monitorImmersive,
    moveSelectedItem,
    onGithubReviewDismiss,
    onMonitorSelect,
    onQaLabDismiss,
    qaImmersive,
    rotateSelectedItem,
    selectedUid,
  ]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      e.preventDefault();
      setSpaceDown(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      setSpaceDown(false);
      setSpaceDragging(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // New Idea 1: dismiss context menu on outside click.
  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    window.addEventListener("pointerdown", dismiss);
    return () => window.removeEventListener("pointerdown", dismiss);
  }, [contextMenu]);

  // New Idea 3: show speech bubble based on reply length.
  useEffect(() => {
    if (feedEvents.length === 0) return;
    const latest = feedEvents[0];
    if (!latest) return;
    if (latest.kind !== "reply") return;
    const speechBubbleDurationMs = Math.min(
      12_000,
      Math.max(5_500, 2_500 + latest.text.trim().length * 42),
    );
    const addTimer = window.setTimeout(() => {
      setSpeechAgentIds((prev) => new Set([...prev, latest.id]));
    }, 0);
    const timer = window.setTimeout(() => {
      setSpeechAgentIds((prev) => {
        const next = new Set(prev);
        next.delete(latest.id);
        return next;
      });
    }, speechBubbleDurationMs);
    return () => {
      window.clearTimeout(addTimer);
      window.clearTimeout(timer);
    };
  }, [feedEvents]);

  // E3 Idea 1: emoji mood reactions on feed events.
  useEffect(() => {
    if (feedEvents.length === 0) return;
    const latest = feedEvents[0];
    if (!latest) return;
    const emoji =
      latest.kind === "reply"
        ? "💬"
        : latest.text.includes("started")
          ? "💻"
          : "☕";
    const addTimer = window.setTimeout(() => {
      setMoodByAgentId((prev) => ({
        ...prev,
        [latest.id]: { emoji, ts: Date.now() },
      }));
    }, 0);
    const timer = window.setTimeout(() => {
      setMoodByAgentId((prev) => {
        const next = { ...prev };
        delete next[latest.id];
        return next;
      });
    }, 2500);
    return () => {
      window.clearTimeout(addTimer);
      window.clearTimeout(timer);
    };
  }, [feedEvents]);

  // E3 Idea 3: auto-clear spotlight after 2s.
  useEffect(() => {
    if (!spotlightAgentId) return;
    const timer = setTimeout(() => setSpotlightAgentId(null), 2000);
    return () => clearTimeout(timer);
  }, [spotlightAgentId]);


  useEffect(() => {
    if (initializedCameraForKeyRef.current === cameraPersistenceKey) {
      return;
    }
    initializedCameraForKeyRef.current = cameraPersistenceKey;
    const initialPreset = initialPersistedCameraRef.current ?? overviewCameraPreset;
    cameraPresetRef.current = initialPreset;
    orbitRef.current?.target?.set(...initialPreset.target);
    orbitRef.current?.update?.();
  }, [cameraPersistenceKey, overviewCameraPreset]);

  return (
    <div className="relative w-full h-full bg-[#1a1008] font-mono text-white overflow-hidden">
      {/* 3D Canvas — fills everything. */}
      <div
        className="absolute inset-0"
        style={{
          cursor: spaceDown ? (spaceDragging ? "grabbing" : "grab") : undefined,
        }}
        onMouseDown={() => {
          if (spaceDown) setSpaceDragging(true);
        }}
        onMouseUp={() => setSpaceDragging(false)}
        onDoubleClick={() => orbitRef.current?.reset()}
      >
        {/*
          Key fixes vs previous version:
          1. `orthographic` prop + `camera` prop on Canvas → R3F creates the camera
             and it defaults to looking at origin, fixing the black screen.
          2. `CameraRig` explicitly calls camera.lookAt(0,0,0) after mount for safety.
          3. `GameLoop` only calls tick() with no setState → zero React re-renders per frame.
          4. Agent components read from `renderAgentsRef` via useFrame → pure Three.js mutations.
          5. Floor/walls render immediately (no Suspense). Only GLB models are suspended.
        */}
        {!immersiveOverlayActive ? (
          <Canvas
            orthographic
            dpr={[0.5, 0.95]}
            performance={{ min: 0.45 }}
            frameloop="always"
            camera={{
              position: cameraPosition,
              zoom: cameraZoom,
              near: 0.1,
              far: 100,
            }}
            shadows={false}
            gl={{
              antialias: false,
              alpha: false,
              powerPreference: "high-performance",
              stencil: false,
              depth: true,
              preserveDrawingBuffer: false,
            }}
            style={{ width: "100%", height: "100%" }}
            onPointerUp={() => {
              if (drag.kind === "moving") setDrag({ kind: "idle" });
            }}
          >
            {/* Ensure camera looks at origin after mount. */}
            <CameraRig
              target={cameraTarget}
              position={cameraPosition}
              zoom={cameraZoom}
            />
            <AdaptiveDprController />

            {/* Orbit / pan / zoom controls — disabled while follow cam is active or while editing furniture. */}
            <OrbitControls
              ref={orbitRef}
              enabled={followAgentId === null && (!editMode || spaceDown)}
              enableDamping
              dampingFactor={0.06}
              rotateSpeed={0.8}
              zoomSpeed={1.05}
              panSpeed={0.85}
              minZoom={25}
              maxZoom={120}
              maxPolarAngle={Math.PI / 2.2}
              enableRotate={!spaceDown}
              mouseButtons={{
                LEFT: spaceDown ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN,
              }}
            />

            {/* Game loop — no React state, pure ref mutations. */}
            <SceneGameLoop tick={tick} />

            {/* New Idea 2: Camera preset animator. */}
            <CameraPresetAnimator
              presetRef={cameraPresetRef}
              orbitRef={orbitRef}
            />

            {/* Follow cam: third-person perspective camera trailing the selected agent. */}
            <FollowCamSystem
              followRef={followAgentIdRef}
              agentsRef={renderAgentsRef}
              agentLookupRef={renderAgentLookupRef}
            />

            {/* E3 Idea 3: Spotlight effect on agent chip click. */}
            <SceneSpotlightEffect
              agentId={spotlightAgentId}
              agentsRef={renderAgentsRef}
              agentLookupRef={renderAgentLookupRef}
            />

            {/* Keep office lighting static to avoid extra scene churn from ambience effects. */}
            <ambientLight intensity={0.72} color="#d8d4c8" />
            <directionalLight
              position={[8, 14, 6]}
              intensity={1.1}
              color="#f6f1e6"
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-bias={-0.0002}
              shadow-normalBias={0.02}
            />
            <directionalLight
              position={[-5, 8, -4]}
              intensity={0.4}
              color="#7090ff"
            />

            {/* Floor + walls — always visible, no async loading. */}
            <SceneFloorAndWalls showRemoteOffice={remoteOfficeEnabled} />

            {/* Wall pictures — procedural, no async loading. */}
            <SceneWallPictures showRemoteOffice={remoteOfficeEnabled} />

            {/* Environment lighting — async, wrapped in its own Suspense so floor stays visible. */}
            <Suspense fallback={null}>
              <Environment preset="city" />
            </Suspense>

            {/* Furniture models — each loads its GLB asynchronously. */}
            <Suspense fallback={null}>
              {!editMode ? (
                <PrimitiveInstancedWallSegmentsModel items={wallItems} />
              ) : null}
              {!editMode ? (
                <InstancedFurnitureItemsModel
                  itemType="desk_cubicle"
                  items={deskItems}
                  onItemClick={handleDeskClick}
                />
              ) : null}
              {!editMode ? (
                <InstancedFurnitureItemsModel
                  itemType="chair"
                  items={chairItems}
                />
              ) : null}
              {furniture.map((item) =>
                item.type === "wall" ? (
                  editMode ? (
                    <PrimitiveWallSegmentModel
                      key={item._uid}
                      item={item}
                      isSelected={item._uid === selectedUid}
                      isHovered={item._uid === hoverUid}
                      editMode={editMode}
                      onPointerDown={handleFurniturePointerDown}
                      onPointerOver={handleFurniturePointerOver}
                      onPointerOut={handleFurniturePointerOut}
                    />
                  ) : null
                ) : item.type === "desk_cubicle" ? (
                  editMode ? (
                    <GenericFurnitureModel
                      key={item._uid}
                      item={item}
                      isSelected={item._uid === selectedUid}
                      isHovered={item._uid === hoverUid}
                      editMode={editMode}
                      onPointerDown={handleFurniturePointerDown}
                      onPointerOver={handleFurniturePointerOver}
                      onPointerOut={handleFurniturePointerOut}
                      onClick={handleDeskClick}
                    />
                  ) : null
                ) : item.type === "chair" ? (
                  editMode ? (
                    <GenericFurnitureModel
                      key={item._uid}
                      item={item}
                      isSelected={item._uid === selectedUid}
                      isHovered={item._uid === hoverUid}
                      editMode={editMode}
                      onPointerDown={handleFurniturePointerDown}
                      onPointerOver={handleFurniturePointerOver}
                      onPointerOut={handleFurniturePointerOut}
                      onClick={handleDeskClick}
                    />
                  ) : null
                ) : item.type === "door" ? (
                  <PrimitiveDoorModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    agentsRef={renderAgentsRef}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : item.type === "round_table" ? (
                  <PrimitiveRoundTableModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "keyboard" ? (
                  <PrimitiveKeyboardModel
                    key={item._uid}
                    item={item}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : item.type === "mouse" ? (
                  <PrimitiveMouseModel
                    key={item._uid}
                    item={item}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : item.type === "trash" ? (
                  <PrimitiveTrashCanModel
                    key={item._uid}
                    item={item}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : item.type === "mug" ? (
                  <PrimitiveMugModel
                    key={item._uid}
                    item={item}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : item.type === "clock" ? (
                  <PrimitiveClockModel
                    key={item._uid}
                    item={item}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : item.type === "atm" ? (
                  <InteractiveAtmMachineModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "jukebox" ? (
                  <InteractiveJukeboxModel
                    key={item._uid}
                    item={item}
                    active={isJukeboxActive}
                    enabled={soundclawEnabled}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={editMode ? handleDeskClick : () => onJukeboxInteract?.()}
                  />
                ) : item.type === "sms_booth" ? (
                  <InteractiveSmsBoothModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    doorOpen={smsBoothDoorOpen}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "phone_booth" ? (
                  <InteractivePhoneBoothModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    doorOpen={phoneBoothDoorOpen}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "server_rack" ? (
                  <InteractiveServerRackModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "server_terminal" ? (
                  <InteractiveServerTerminalModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "vending" ? (
                  <KitchenVendingMachineModel
                    key={item._uid}
                    item={item}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : item.type === "sink" ? (
                  <KitchenSinkModel
                    key={item._uid}
                    item={item}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : item.type === "dishwasher" ? (
                  <KitchenDishwasherModel
                    key={item._uid}
                    item={item}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : item.type === "pingpong" ? (
                  <MachinePingPongTableModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "qa_terminal" ? (
                  <InteractiveQaTerminalModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "device_rack" ? (
                  <InteractiveDeviceRackModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "test_bench" ? (
                  <InteractiveTestBenchModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "treadmill" ? (
                  <InteractiveTreadmillModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "weight_bench" ? (
                  <InteractiveWeightBenchModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "dumbbell_rack" ? (
                  <InteractiveDumbbellRackModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "exercise_bike" ? (
                  <InteractiveExerciseBikeModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "rowing_machine" ? (
                  <InteractiveRowingMachineModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "kettlebell_rack" ? (
                  <InteractiveKettlebellRackModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "punching_bag" ? (
                  <InteractivePunchingBagModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "yoga_mat" ? (
                  <InteractiveYogaMatModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ) : item.type === "stove" ? (
                  <KitchenStoveModel
                    key={item._uid}
                    item={item}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : item.type === "microwave" ? (
                  <KitchenMicrowaveModel
                    key={item._uid}
                    item={item}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : item.type === "wall_cabinet" ? (
                  <KitchenWallCabinetModel
                    key={item._uid}
                    item={item}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                  />
                ) : (
                  <GenericFurnitureModel
                    key={item._uid}
                    item={item}
                    isSelected={item._uid === selectedUid}
                    isHovered={item._uid === hoverUid}
                    editMode={editMode}
                    onPointerDown={handleFurniturePointerDown}
                    onPointerOver={handleFurniturePointerOver}
                    onPointerOut={handleFurniturePointerOut}
                    onClick={handleDeskClick}
                  />
                ),
              )}
            </Suspense>

            {remoteLayoutFurniture.length > 0 ? (
              <ReadOnlyFurnitureClone furniture={remoteLayoutFurniture} />
            ) : null}

          {/* Removed standalone Jukebox as it's now in the furniture loop */}

            {/* Agents — purely imperative, driven by renderAgentsRef inside useFrame. */}
            {sceneAgents.map((agent) => {
              const isJanitor = "role" in agent && agent.role === "janitor";
              return (
                <AgentObjectModel
                  key={agent.id}
                  agentId={agent.id}
                  name={agent.name}
                  status={agent.status}
                  color={agentColorMap.get(agent.id) ?? "#888"}
                  appearance={
                    "avatarProfile" in agent
                      ? (agent.avatarProfile ?? null)
                      : null
                  }
                  agentsRef={renderAgentsRef}
                  agentLookupRef={renderAgentLookupRef}
                  onHover={isJanitor ? undefined : handleAgentHover}
                  onUnhover={isJanitor ? undefined : handleAgentUnhover}
                  onClick={isJanitor ? undefined : handleAgentClick}
                  onContextMenu={isJanitor ? undefined : handleAgentContextMenu}
                  showSpeech={
                    isJanitor
                      ? false
                      : standupMeeting?.phase === "in_progress"
                        ? Boolean(standupSpeechTextByAgentId[agent.id])
                        : speechAgentIds.has(agent.id)
                  }
                  speechText={
                    isJanitor
                      ? null
                      : standupMeeting?.phase === "in_progress"
                        ? (standupSpeechTextByAgentId[agent.id] ?? null)
                        : (speechTextByAgentId[agent.id] ?? null)
                  }
                  suppressSpeechBubble={
                    suppressSceneSpeechBubbles &&
                    standupMeeting?.currentSpeakerAgentId !== agent.id
                  }
                />
              );
            })}

            <ScenePingPongBall agentsRef={renderAgentsRef} />

            {/* Idea 7: Desk nameplates — small labels showing assigned agent above each desk. */}
            <DeskNameplateOverlay
              deskLocations={deskLocations}
              agents={agents}
              deskByAgentRef={deskByAgentRef}
            />

            {/* New Idea 7: Heatmap overlay when heatmap mode is active. */}
            {heatmapMode ? (
              <AgentHeatmapSystem
                agentsRef={renderAgentsRef}
                heatmapMode={heatmapMode}
                heatGridRef={heatGridRef}
              />
            ) : null}

            {/* Placement ghost. */}
            {editMode &&
              drag.kind === "placing" &&
              drag.itemType !== "wall" &&
              ghostPos && (
                <Suspense fallback={null}>
                  <FurniturePlacementGhost
                    itemType={drag.itemType}
                    position={ghostPos}
                  />
                </Suspense>
              )}
            {editMode &&
            drag.kind === "placing" &&
            drag.itemType === "wall" &&
            wallGhostItem ? (
              <PrimitiveWallSegmentModel
                item={wallGhostItem}
                isSelected={false}
                isHovered={false}
                editMode={false}
                onPointerDown={() => {}}
                onPointerOver={() => {}}
                onPointerOut={() => {}}
              />
            ) : null}
            {editMode &&
            drag.kind === "placing" &&
            drag.itemType === "door" &&
            ghostPos ? (
              <PrimitiveDoorModel
                item={{
                  _uid: "__door_ghost__",
                  type: "door",
                  x: worldToCanvas(ghostPos[0], ghostPos[2]).cx,
                  y: worldToCanvas(ghostPos[0], ghostPos[2]).cy,
                  w: DOOR_LENGTH,
                  h: DOOR_THICKNESS,
                }}
                isSelected={false}
                isHovered={false}
                editMode={false}
                onPointerDown={() => {}}
                onPointerOver={() => {}}
                onPointerOut={() => {}}
              />
            ) : null}

            {/* Floor raycaster for edit-mode interaction. */}
            <SceneFloorRaycaster
              enabled={editMode}
              onMove={handleFloorMove}
              onClick={handleFloorClick}
            />
          </Canvas>
        ) : null}
      </div>

      {!readOnly && editMode && drawerOpen && !immersiveOverlayActive ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[3px]">
          <div className="flex h-[min(82vh,760px)] w-[min(1120px,96vw)] overflow-hidden rounded-[26px] border border-amber-500/20 bg-[#120e08]/96 shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="flex min-w-0 flex-1 flex-col border-r border-amber-700/15">
            <div className="border-b border-amber-700/15 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-500/70">
                    Layout editor
                  </div>
                  <div className="mt-1 text-sm font-semibold text-amber-100">
                    Organize the office with a cleaner, faster builder.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-700/20 bg-black/20 text-amber-200/75 transition hover:border-amber-400/35 hover:text-amber-50"
                  aria-label="Close layout drawer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActivePaletteCategory("all")}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${activePaletteCategory === "all" ? "border-amber-400/40 bg-amber-300/12 text-amber-50" : "border-amber-900/25 bg-[#1b150f]/80 text-amber-500/65 hover:border-amber-500/35 hover:text-amber-200"}`}
                >
                  All
                </button>
                {GROUPED_PALETTE.map((category) => {
                  const active = activePaletteCategory === category.key;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => setActivePaletteCategory(category.key)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${active ? "border-amber-400/40 bg-amber-300/12 text-amber-50" : "border-amber-900/25 bg-[#1b150f]/80 text-amber-500/65 hover:border-amber-500/35 hover:text-amber-200"}`}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {selectedItem ? (
                <div className="mb-4 rounded-2xl border border-cyan-500/18 bg-[#071018]/80 p-3 shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300/70">
                        Selected item
                      </div>
                      <div className="mt-1 text-sm font-semibold text-cyan-50">
                        {selectedPaletteEntry?.label ?? selectedItem.type}
                      </div>
                      <div className="mt-1 text-[11px] text-cyan-100/55">
                        Position {selectedItem.x}, {selectedItem.y}
                        {typeof selectedItem.facing === "number" ? ` • ${selectedItem.facing}°` : ""}
                        {typeof selectedItem.elevation === "number" && selectedItem.elevation !== 0
                          ? ` • z ${selectedItem.elevation.toFixed(1)}`
                          : ""}
                      </div>
                      {selectedDeskAssignmentAgentId ? (
                        <div className="mt-1 text-[11px] text-emerald-300/80">
                          Assigned desk: {selectedDeskAssignmentAgentId}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/18 bg-red-950/35 text-red-200 transition hover:border-red-400/45 hover:text-red-50"
                      title="Delete selected item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => moveSelectedItem(-SNAP_GRID, 0)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">← Move</button>
                    <button type="button" onClick={() => moveSelectedItem(SNAP_GRID, 0)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Move →</button>
                    <button type="button" onClick={() => moveSelectedItem(0, -SNAP_GRID)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">�� Forward</button>
                    <button type="button" onClick={() => moveSelectedItem(0, SNAP_GRID)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Back ↓</button>
                    <button type="button" onClick={() => rotateSelectedItem(-ROTATION_STEP_DEG)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Rotate -</button>
                    <button type="button" onClick={() => rotateSelectedItem(ROTATION_STEP_DEG)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Rotate +</button>
                    <button type="button" onClick={() => moveSelectedItem(0, 0, ELEVATION_STEP)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Raise</button>
                    <button type="button" onClick={() => moveSelectedItem(0, 0, -ELEVATION_STEP)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Lower</button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                {visiblePaletteCategories.map((category) => (
                  <section key={category.key}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200/85">
                        {category.label}
                      </div>
                      <div className="text-[10px] text-amber-500/55">
                        {category.entries.length} items
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {category.entries.map((entry) => {
                        const placing = drag.kind === "placing" && drag.itemType === entry.type;
                        return (
                          <button
                            key={entry.type}
                            type="button"
                            onClick={() => startPlacing(entry.type)}
                            className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition active:scale-[0.99] ${placing ? "border-amber-400/45 bg-amber-300/10 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]" : "border-amber-900/25 bg-[#1b150f]/80 text-amber-100/80 hover:border-amber-500/35 hover:bg-[#241b13]"}`}
                          >
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg ${placing ? "border-amber-300/35 bg-amber-300/10" : "border-amber-900/25 bg-black/20"}`}>
                              {entry.icon}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">{entry.label}</span>
                              <span className="block text-[10px] uppercase tracking-[0.14em] text-white/40">
                                {placing ? "Click on the floor to place" : "Add to layout"}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="border-t border-amber-700/15 bg-black/10 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-amber-100/55">
                <span className="rounded-full border border-amber-900/25 bg-[#1b150f]/80 px-2.5 py-1">Esc clears selection</span>
                <span className="rounded-full border border-amber-900/25 bg-[#1b150f]/80 px-2.5 py-1">Delete removes item</span>
                <span className="rounded-full border border-amber-900/25 bg-[#1b150f]/80 px-2.5 py-1">Arrows move the selected item</span>
                <span className="rounded-full border border-amber-900/25 bg-[#1b150f]/80 px-2.5 py-1">Click floor to place</span>
              </div>
            </div>
            </div>

            <aside className="hidden w-[320px] shrink-0 flex-col bg-[#0f0b08]/92 xl:flex">
              <div className="border-b border-amber-700/15 px-5 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-500/70">
                  Builder overview
                </div>
                <div className="mt-1 text-sm font-semibold text-amber-100">
                  Layout controls and selection details in one place.
                </div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-amber-700/15 bg-black/20 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-amber-500/55">Mode</div>
                    <div className="mt-1 text-sm font-semibold text-amber-100">Editing</div>
                  </div>
                  <div className="rounded-2xl border border-amber-700/15 bg-black/20 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-amber-500/55">Category</div>
                    <div className="mt-1 text-sm font-semibold text-amber-100">{activePaletteCategory === "all" ? "All items" : visiblePaletteCategories[0]?.label ?? "Filtered"}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-500/15 bg-[#081018]/80 p-4">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-cyan-300/70">Selection</div>
                  {selectedItem ? (
                    <>
                      <div className="mt-2 text-sm font-semibold text-cyan-50">{selectedPaletteEntry?.label ?? selectedItem.type}</div>
                      <div className="mt-1 text-[11px] leading-5 text-cyan-100/60">
                        Position {selectedItem.x}, {selectedItem.y}
                        {typeof selectedItem.facing === "number" ? ` • ${selectedItem.facing}°` : ""}
                        {typeof selectedItem.elevation === "number" && selectedItem.elevation !== 0
                          ? ` • z ${selectedItem.elevation.toFixed(1)}`
                          : ""}
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 text-sm text-cyan-100/60">Select an item in the office to inspect and adjust it here.</div>
                  )}
                </div>

                <div className="rounded-2xl border border-amber-700/15 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-amber-500/60">Tips</div>
                  <div className="mt-2 space-y-2 text-xs leading-5 text-amber-100/65">
                    <p>Use the camera presets to frame each area before placing furniture.</p>
                    <p>Keep desks aligned with clear walking paths for better agent routes.</p>
                    <p>Close the builder after placing items to review the office cleanly.</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : null}

      {!readOnly && !immersiveOverlayActive ? (
        <div className={`absolute top-3 left-3 ${editMode && drawerOpen ? "z-10 opacity-35 pointer-events-none" : "z-20"} flex max-w-[calc(100vw-1.5rem)] flex-col items-start gap-2`}>
          {/* Main HQ Panel - Redesigned */}
          <div className="flex items-stretch gap-0 rounded-xl border border-white/[0.08] bg-[#0a0a0a]/95 shadow-2xl backdrop-blur-xl">
            {/* Company Info Section */}
            <div className="flex items-center gap-3 border-r border-white/[0.06] px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[11px] font-medium text-white/90">
                    {officeTitleLoaded ? officeTitle : "Office HQ"}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-white/40">
                  {agents.length} agents • {squads.length} squads
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="flex items-center border-r border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setAgentRosterOpen(true);
                  setRosterTab("agents");
                }}
                className={`group relative flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-all ${
                  rosterTab === "agents"
                    ? "bg-white/[0.04] text-white"
                    : "text-white/50 hover:bg-white/[0.02] hover:text-white/80"
                }`}
              >
                <Users size={12} className={rosterTab === "agents" ? "text-cyan-400" : "text-white/40 group-hover:text-white/60"} />
                <span>Agents</span>
                <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  rosterTab === "agents"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "bg-white/[0.06] text-white/50"
                }`}>
                  {agents.length}
                </span>
                {rosterTab === "agents" && (
                  <span className="absolute bottom-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-t-full bg-cyan-400" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgentRosterOpen(true);
                  setRosterTab("squads");
                }}
                className={`group relative flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-all ${
                  rosterTab === "squads"
                    ? "bg-white/[0.04] text-white"
                    : "text-white/50 hover:bg-white/[0.02] hover:text-white/80"
                }`}
              >
                <span>Squads</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  rosterTab === "squads"
                    ? "bg-violet-500/20 text-violet-300"
                    : "bg-white/[0.06] text-white/50"
                }`}>
                  {squads.length}
                </span>
                {rosterTab === "squads" && (
                  <span className="absolute bottom-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-t-full bg-violet-400" />
                )}
              </button>
            </div>

            {/* Agent Avatars */}
            <div className="flex items-center gap-0.5 px-2">
              {compactRosterAgents.slice(0, 4).map((agent, index) => {
                const initials = agent.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? "")
                  .join("") || "A";
                const colors = ["bg-cyan-500/80", "bg-amber-500/80", "bg-emerald-500/80", "bg-violet-500/80"];
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => onAgentChatSelect?.(agent.id)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-lg ring-2 ring-[#0a0a0a] transition-all hover:scale-110 hover:ring-cyan-500/50 ${colors[index % colors.length]}`}
                    title={agent.name}
                    style={{ marginLeft: index === 0 ? 0 : -8, zIndex: 10 - index }}
                  >
                    {initials}
                  </button>
                );
              })}
              {hiddenAgentCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAgentRosterOpen(true);
                    setRosterTab("agents");
                  }}
                  className="ml-1 flex h-6 items-center justify-center rounded-full bg-white/[0.08] px-2 text-[10px] font-medium text-white/60 transition-all hover:bg-white/[0.12] hover:text-white/80"
                >
                  +{hiddenAgentCount}
                </button>
              )}
            </div>
          </div>

          {/* Camera Controls - Redesigned */}
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#0a0a0a]/95 p-1 shadow-2xl backdrop-blur-xl">
            {(
              [
                { key: "overview", icon: <Camera size={14} />, title: "Overview" },
                { key: "frontDesk", icon: <Monitor size={14} />, title: "Front desk" },
                { key: "lounge", icon: <Armchair size={14} />, title: "Lounge" },
              ] as const
            ).map(({ key, icon, title }) => {
              const active = activeCameraPresetKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  title={title}
                  onClick={() => {
                    setActiveCameraPresetKey(key);
                    cameraPresetRef.current = cameraPresetMap[key];
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                    active
                      ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                      : "text-white/40 hover:bg-white/[0.06] hover:text-white/70"
                  }`}
                  style={{ touchAction: "manipulation" }}
                >
                  {icon}
                </button>
              );
            })}
            {editMode && (
              <span className="ml-1 flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1.5 text-[10px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Editing
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* Toolbar — top right - Redesigned */}
      {!readOnly && !immersiveOverlayActive ? (
        <div className={`absolute top-3 right-3 ${editMode && drawerOpen ? "z-10 opacity-35 pointer-events-none" : "z-20"} flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-end gap-2`}>
          {/* Remote Office Badge */}
          {remoteOfficeEnabled &&
          (remoteOfficeSourceKind === "presence_endpoint"
            ? remoteOfficePresenceUrl.trim().length > 0
            : remoteOfficeGatewayUrl.trim().length > 0) && (
            <button
              onClick={() => setSettingsModalOpen(true)}
              title={remoteOfficeStatusText}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0a0a0a]/95 px-3 text-[11px] font-medium text-white/70 shadow-xl backdrop-blur-xl transition-all hover:border-cyan-500/30 hover:text-cyan-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{remoteOfficeLabel}</span>
            </button>
          )}

          {/* Primary Action - Add Agent */}
          {onAddAgent && (
            <button
              onClick={onAddAgent}
              title="Add agent"
              className="group flex h-8 items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 px-3.5 text-[11px] font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-500 hover:to-cyan-400 hover:shadow-cyan-500/40 active:scale-[0.98]"
            >
              <UserPlus size={14} className="transition-transform group-hover:scale-110" />
              <span>Add Agent</span>
            </button>
          )}

          {/* Icon Actions Group */}
          <div className="flex items-center gap-0.5 rounded-xl border border-white/[0.08] bg-[#0a0a0a]/95 p-1 shadow-xl backdrop-blur-xl">
            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                title="Open profile"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  profileButtonActive
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-white/40 hover:bg-white/[0.06] hover:text-white/70"
                }`}
              >
                <UserRound size={14} />
              </button>
            )}
            <button
              onClick={() => setHeatmapMode((p) => !p)}
              title="Toggle heatmap"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                heatmapMode
                  ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/30"
                  : "text-white/40 hover:bg-white/[0.06] hover:text-white/70"
              }`}
            >
              <MapIcon size={14} />
            </button>
            <button
              onClick={() => {
                void toggleEdit();
              }}
              disabled={isSavingOfficeLayout}
              title={editMode ? (isSavingOfficeLayout ? "Saving office layout..." : "Save office layout") : "Edit office"}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                editMode
                  ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                  : "text-white/40 hover:bg-white/[0.06] hover:text-white/70"
              } ${isSavingOfficeLayout ? "cursor-wait opacity-50" : ""}`}
            >
              {editMode ? <Check size={14} strokeWidth={2.5} /> : <Pencil size={14} strokeWidth={2} />}
            </button>
            <button
              onClick={() => setSettingsModalOpen(true)}
              title="Settings"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                settingsModalOpen
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-white/40 hover:bg-white/[0.06] hover:text-white/70"
              }`}
            >
              <Settings2 size={14} />
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Logout"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-red-500/15 hover:text-red-400"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>

          {/* Edit Mode Actions */}
          {editMode && (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0a0a0a]/95 p-1.5 shadow-xl backdrop-blur-xl">
              {drag.kind === "placing" && (
                <span className="px-2 text-[10px] text-amber-400/80">
                  {drag.itemType === "wall"
                    ? wallDrawStart
                      ? "Click end point"
                      : "Click start point"
                    : "Click to place"}
                </span>
              )}
              <button
                onClick={handleReset}
                className="flex h-7 items-center rounded-lg bg-white/[0.04] px-2.5 text-[10px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80"
              >
                Reset
              </button>
              {selectedUid && (
                <button
                  onClick={handleDelete}
                  className="flex h-7 items-center rounded-lg bg-red-500/15 px-2.5 text-[10px] font-medium text-red-400 transition-all hover:bg-red-500/25"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setDrawerOpen((p) => !p)}
                className="flex h-7 items-center rounded-lg bg-amber-500/15 px-2.5 text-[10px] font-medium text-amber-300 transition-all hover:bg-amber-500/25"
              >
                {drawerOpen ? "Hide" : "Builder"}
              </button>
            </div>
          )}
        </div>
      ) : null}
      {!readOnly && !immersiveOverlayActive && editMode && !drawerOpen && selectedItem ? (
        <div className="absolute top-[4.6rem] right-3 z-20 w-[min(92vw,340px)]">
          <div className="rounded-2xl border border-cyan-500/18 bg-[#071018]/92 p-3 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300/70">
                  Selected item
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-cyan-50">
                  {selectedPaletteEntry?.label ?? selectedItem.type}
                </div>
                <div className="mt-1 text-[11px] leading-5 text-cyan-100/55">
                  Position {selectedItem.x}, {selectedItem.y}
                  {typeof selectedItem.facing === "number" ? ` • ${selectedItem.facing}°` : ""}
                  {typeof selectedItem.elevation === "number" && selectedItem.elevation !== 0
                    ? ` • z ${selectedItem.elevation.toFixed(1)}`
                    : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/18 bg-red-950/35 text-red-200 transition hover:border-red-400/45 hover:text-red-50"
                title="Delete selected item"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => moveSelectedItem(-SNAP_GRID, 0)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">← Move</button>
              <button type="button" onClick={() => moveSelectedItem(SNAP_GRID, 0)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Move →</button>
              <button type="button" onClick={() => moveSelectedItem(0, -SNAP_GRID)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">↑ Forward</button>
              <button type="button" onClick={() => moveSelectedItem(0, SNAP_GRID)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Back ↓</button>
              <button type="button" onClick={() => rotateSelectedItem(-ROTATION_STEP_DEG)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Rotate -</button>
              <button type="button" onClick={() => rotateSelectedItem(ROTATION_STEP_DEG)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Rotate +</button>
              <button type="button" onClick={() => moveSelectedItem(0, 0, ELEVATION_STEP)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Raise</button>
              <button type="button" onClick={() => moveSelectedItem(0, 0, -ELEVATION_STEP)} className="rounded-xl border border-cyan-500/18 bg-black/20 px-3 py-2 text-xs font-semibold text-cyan-100/80 transition hover:border-cyan-400/35 hover:text-cyan-50">Lower</button>
            </div>
          </div>
        </div>
      ) : null}
      {agentRosterVisible ? (
        <div className="absolute inset-x-0 top-16 z-20 flex justify-center px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-cyan-500/18 bg-[#0b0f14]/96 p-3 shadow-2xl backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300/70">Company overview</div>
                <div className="mt-1 text-sm font-semibold text-white">{officeTitleLoaded ? officeTitle : "Office HQ"}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRosterTab("agents")}
                  className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] transition-all ${rosterTab === "agents" ? "border-cyan-400/45 bg-cyan-500/14 text-cyan-100" : "border-cyan-500/18 bg-[#0e141b]/90 text-cyan-100/60 hover:border-cyan-400/35 hover:text-cyan-100"}`}
                >
                  Agents
                </button>
                <button
                  type="button"
                  onClick={() => setRosterTab("squads")}
                  className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] transition-all ${rosterTab === "squads" ? "border-amber-400/45 bg-amber-500/14 text-amber-100" : "border-amber-500/18 bg-[#17120a]/90 text-amber-100/60 hover:border-amber-400/35 hover:text-amber-100"}`}
                >
                  Squads
                </button>
                <button
                  type="button"
                  onClick={() => setAgentRosterOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-all hover:border-white/20 hover:text-white"
                  aria-label="Close company overview"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            {rosterTab === "agents" ? (
              <div className="mt-3 grid max-h-[40vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      onAgentChatSelect?.(agent.id);
                      setAgentRosterOpen(false);
                    }}
                    className="rounded-xl border border-cyan-500/18 bg-[#0e141b]/90 p-3 text-left transition-all hover:border-cyan-400/35 hover:bg-[#111b24]"
                  >
                    <div className="truncate text-sm font-semibold text-cyan-50">{agent.name}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-cyan-100/45">{agent.status ?? "online"}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 grid max-h-[40vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {squads.map((squad) => (
                  <button
                    key={String(squad.id)}
                    type="button"
                    onClick={() => {
                      onSquadOps?.(String(squad.id));
                      setAgentRosterOpen(false);
                    }}
                    className="rounded-xl border border-amber-500/18 bg-[#17120a]/90 p-3 text-left transition-all hover:border-amber-400/35 hover:bg-[#21190d]"
                  >
                    <div className="truncate text-sm font-semibold text-amber-50">{squad.name}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-amber-100/45">{squad.members?.length ?? 0} members</div>
                  </button>
                ))}
                {squads.length === 0 ? <div className="rounded-xl border border-amber-500/18 bg-[#17120a]/70 p-3 text-sm text-amber-100/60">No squads created yet.</div> : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {!readOnly && settingsModalOpen ? (
        <div className="absolute inset-0 z-30 flex items-start justify-end overflow-y-auto bg-black/35 p-4 backdrop-blur-[1px]">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-cyan-500/20 bg-[#05090d]/95 shadow-2xl">
            <div className="flex items-start justify-between border-b border-cyan-500/10 px-4 py-3">
              <div>
                <div className="font-mono text-[10px] font-semibold tracking-[0.28em] text-cyan-300/75">
                  STUDIO SETTINGS
                </div>
                <div className="mt-1 text-[11px] text-white/45">
                  Customize the office banner and spoken replies across the app.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-500/10 bg-black/20 text-cyan-100/70 transition-colors hover:border-cyan-400/30 hover:text-cyan-100"
                aria-label="Close studio settings"
              >
                <X size={12} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SettingsPanel
                gatewayStatus={gatewayStatus}
                gatewayUrl={atmAnalytics?.gatewayUrl}
                onGatewayDisconnect={() => {
                  onGatewayDisconnect?.();
                  setSettingsModalOpen(false);
                }}
                onOpenOnboarding={() => {
                  onOpenOnboarding?.();
                  setSettingsModalOpen(false);
                }}
                officeTitle={officeTitle}
                officeTitleLoaded={officeTitleLoaded}
                onOfficeTitleChange={(title) => onOfficeTitleChange?.(title)}
                remoteOfficeEnabled={remoteOfficeEnabled}
                remoteOfficeSourceKind={remoteOfficeSourceKind}
                remoteOfficeLabel={remoteOfficeLabel}
                remoteOfficePresenceUrl={remoteOfficePresenceUrl}
                remoteOfficeGatewayUrl={remoteOfficeGatewayUrl}
                remoteOfficeTokenConfigured={remoteOfficeTokenConfigured}
                onRemoteOfficeEnabledChange={(enabled) =>
                  onRemoteOfficeEnabledChange?.(enabled)
                }
                onRemoteOfficeSourceKindChange={(kind) =>
                  onRemoteOfficeSourceKindChange?.(kind)
                }
                onRemoteOfficeLabelChange={(label) =>
                  onRemoteOfficeLabelChange?.(label)
                }
                onRemoteOfficePresenceUrlChange={(url) =>
                  onRemoteOfficePresenceUrlChange?.(url)
                }
                onRemoteOfficeGatewayUrlChange={(url) =>
                  onRemoteOfficeGatewayUrlChange?.(url)
                }
                onRemoteOfficeTokenChange={(token) =>
                  onRemoteOfficeTokenChange?.(token)
                }
                voiceRepliesEnabled={voiceRepliesEnabled}
                voiceRepliesVoiceId={voiceRepliesVoiceId}
                voiceRepliesSpeed={voiceRepliesSpeed}
                voiceRepliesLoaded={voiceRepliesLoaded}
                onVoiceRepliesToggle={(enabled) =>
                  onVoiceRepliesToggle?.(enabled)
                }
                onVoiceRepliesVoiceChange={(voiceId) =>
                  onVoiceRepliesVoiceChange?.(voiceId)
                }
                onVoiceRepliesSpeedChange={(speed) =>
                  onVoiceRepliesSpeedChange?.(speed)
                }
                onVoiceRepliesPreview={(voiceId, voiceName) =>
                  onVoiceRepliesPreview?.(voiceId, voiceName)
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Ideas 3 + 6 + 8: Mini status bar — bottom left. */}
      <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1.5 z-10 pointer-events-none select-none">
        {/* Idea 3: Activity feed entries — newest on bottom. */}
        {statusFeedEvents
          .slice(0, 4)
          .reverse()
          .map((ev) => (
            <div
              key={`${ev.id}-${ev.ts}`}
              className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-mono"
            >
              <span className="text-amber-400/80 font-semibold">{ev.name}</span>
              <span className="text-amber-600/70">{ev.text}</span>
            </div>
          ))}
      </div>
      <style>{`
        @keyframes eq-bar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
        @keyframes mood-float {
          0%   { transform: translateX(-50%) translateY(0px); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-28px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
