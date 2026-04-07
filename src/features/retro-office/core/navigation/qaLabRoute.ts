import type { FacingPoint, QaLabRoute, QaLabStationLocation } from "@/features/retro-office/core/types";
import {
  QA_LAB_BOTTOM_Y,
  QA_LAB_END_X,
  QA_LAB_TOP_Y,
  QA_LAB_X,
  QA_LAB_WIDTH,
} from "@/features/retro-office/core/constants";

// QA Lab door position (calculated)
const QA_LAB_DOOR_Y = QA_LAB_TOP_Y + 140;

export const QA_LAB_DEFAULT_TARGET: QaLabStationLocation = {
  x: QA_LAB_X + QA_LAB_WIDTH / 2,
  y: (QA_LAB_TOP_Y + QA_LAB_BOTTOM_Y) / 2,
  facing: -Math.PI / 2,
  stationType: "console",
};

// Door is on the left side (QA_LAB_X) - entrance from gym area
const QA_LAB_DOOR_OUTER_TARGET = {
  x: QA_LAB_X - 50,
  y: QA_LAB_DOOR_Y + 20,
  facing: -Math.PI / 2,
};

// Like the gym route, the first inner QA waypoint needs to be in the clear
// aisle inside the lab instead of on top of the benches by the door.
const QA_LAB_DOOR_INNER_TARGET = {
  x: QA_LAB_X + 320,
  y: QA_LAB_DOOR_Y + 20,
  facing: -Math.PI / 2,
};

const DOOR_APPROACH_RADIUS = 70;
const DOOR_INNER_SNAP_RADIUS = 18;

export const resolveQaLabRoute = (
  x: number,
  y: number,
  stationTarget: QaLabStationLocation = QA_LAB_DEFAULT_TARGET,
): QaLabRoute => {
  const insideLab =
    (x >= QA_LAB_X && x <= QA_LAB_END_X &&
      y >= QA_LAB_TOP_Y &&
      y <= QA_LAB_BOTTOM_Y) ||
    Math.hypot(
      x - QA_LAB_DOOR_INNER_TARGET.x,
      y - QA_LAB_DOOR_INNER_TARGET.y,
    ) < DOOR_INNER_SNAP_RADIUS;
  if (insideLab) {
    return {
      stage: "station",
      targetX: stationTarget.x,
      targetY: stationTarget.y,
      facing: stationTarget.facing,
    };
  }

  const withinDoorThreshold =
    Math.hypot(
      x - QA_LAB_DOOR_OUTER_TARGET.x,
      y - QA_LAB_DOOR_OUTER_TARGET.y,
    ) < DOOR_APPROACH_RADIUS;
  if (withinDoorThreshold) {
    return {
      stage: "door_inner",
      targetX: QA_LAB_DOOR_INNER_TARGET.x,
      targetY: QA_LAB_DOOR_INNER_TARGET.y,
      facing: QA_LAB_DOOR_INNER_TARGET.facing,
    };
  }

  return {
    stage: "door_outer",
    targetX: QA_LAB_DOOR_OUTER_TARGET.x,
    targetY: QA_LAB_DOOR_OUTER_TARGET.y,
    facing: QA_LAB_DOOR_OUTER_TARGET.facing,
  };
};
