import type { ServerRoomRoute } from "@/features/retro-office/core/types";

export const SERVER_ROOM_TARGET = {
  x: 172,
  y: 622,
  facing: 270,
};

const SERVER_ROOM_DOOR_OUTER_TARGET = {
  x: 276,
  y: 628,
  facing: 180,
};

const SERVER_ROOM_DOOR_INNER_TARGET = {
  x: 198,
  y: 628,
  facing: 180,
};

export const resolveServerRoomRoute = (
  x: number,
  y: number,
): ServerRoomRoute => {
  const insideRoom =
    x <= SERVER_ROOM_DOOR_INNER_TARGET.x + 10 ||
    Math.hypot(
      x - SERVER_ROOM_DOOR_INNER_TARGET.x,
      y - SERVER_ROOM_DOOR_INNER_TARGET.y,
    ) < 22;
  if (insideRoom) {
    return {
      stage: "terminal",
      targetX: SERVER_ROOM_TARGET.x,
      targetY: SERVER_ROOM_TARGET.y,
      facing: SERVER_ROOM_TARGET.facing,
    };
  }

  const withinDoorThreshold =
    x <= SERVER_ROOM_DOOR_OUTER_TARGET.x - 10 ||
    Math.hypot(
      x - SERVER_ROOM_DOOR_OUTER_TARGET.x,
      y - SERVER_ROOM_DOOR_OUTER_TARGET.y,
    ) < 22;
  if (withinDoorThreshold) {
    return {
      stage: "door_inner",
      targetX: SERVER_ROOM_DOOR_INNER_TARGET.x,
      targetY: SERVER_ROOM_DOOR_INNER_TARGET.y,
      facing: SERVER_ROOM_DOOR_INNER_TARGET.facing,
    };
  }

  return {
    stage: "door_outer",
    targetX: SERVER_ROOM_DOOR_OUTER_TARGET.x,
    targetY: SERVER_ROOM_DOOR_OUTER_TARGET.y,
    facing: SERVER_ROOM_DOOR_OUTER_TARGET.facing,
  };
};
