/**
 * Shared AgentIntent enum used by the motion loop and the routine system.
 * Kept in its own module so `agentRoutines.ts` can import it without pulling
 * in the motion runtime.
 */
export type AgentIntent =
  | "desk"
  | "meeting_room"
  | "gym"
  | "qa_lab"
  | "server_room"
  | "sms_booth"
  | "phone_booth"
  | "lounge"
  | "kitchen"
  | "jukebox"
  | "roam"
  | "roam_remote";
