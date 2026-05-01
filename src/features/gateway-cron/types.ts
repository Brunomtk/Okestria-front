/**
 * v167 — Shared types for the gateway-cron editor (admin + office).
 *
 * These mirror `lib/cron/types.ts`'s CronSchedule / CronPayload / etc.
 * but live alongside the editor so the form layer doesn't depend on
 * the gateway-RPC layer.
 */

export type Schedule =
  | { kind: "at"; at: string }
  | { kind: "every"; everyMs: number; anchorMs?: number }
  | { kind: "cron"; expr: string; tz?: string };

export type Payload =
  | { kind: "systemEvent"; text: string }
  | { kind: "agentTurn"; message: string; model?: string; thinking?: string };

export type Delivery = {
  mode: "none" | "announce";
  channel?: string;
  to?: string;
  bestEffort?: boolean;
};

export type CronJobState = {
  nextRunAtMs?: number;
  runningAtMs?: number;
  lastRunAtMs?: number;
  lastStatus?: "ok" | "error" | "skipped";
  lastError?: string;
  lastDurationMs?: number;
};

export type CronJob = {
  id: string;
  name: string;
  agentId?: string;
  sessionKey?: string;
  description?: string;
  enabled: boolean;
  deleteAfterRun?: boolean;
  updatedAtMs: number;
  schedule: Schedule;
  sessionTarget: "main" | "isolated";
  wakeMode: "next-heartbeat" | "now";
  payload: Payload;
  state?: CronJobState;
  delivery?: Delivery;
};

export type CronInput = {
  name: string;
  agentId: string;
  sessionKey?: string;
  description?: string;
  enabled: boolean;
  deleteAfterRun?: boolean;
  schedule: Schedule;
  sessionTarget: "main" | "isolated";
  wakeMode: "next-heartbeat" | "now";
  payload: Payload;
  delivery?: Delivery;
};
