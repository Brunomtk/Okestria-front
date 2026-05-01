import { NextResponse, type NextRequest } from "next/server";
import { withGatewayClient } from "@/app/api/admin/gateway-crons/_lib/withGatewayClient";

/**
 * v165 — POST to save (create OR edit) an OpenClaw cron job.
 *
 * Body shape mirrors `CronJobCreateInput` (lib/cron/types.ts) plus an
 * optional `existingId` field. The gateway has no `cron.update` RPC, so
 * an "edit" is implemented as `cron.remove(existingId)` followed by
 * `cron.add(input)`. The new job comes back with a fresh id — the UI
 * refreshes the list and shows the renamed job in place.
 *
 *   Create flow: { existingId: undefined, ...newInput } → cron.add
 *   Edit flow:   { existingId: "xyz",     ...newInput } → cron.remove + cron.add
 *
 * If the second call (cron.add) fails after we've already removed the
 * old one, we surface the error to the operator with a clear hint that
 * the original is gone — best-effort restore is risky because we don't
 * own the original input, so we'd rather be loud than silently double.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Schedule =
  | { kind: "at"; at: string }
  | { kind: "every"; everyMs: number; anchorMs?: number }
  | { kind: "cron"; expr: string; tz?: string };

type Payload =
  | { kind: "systemEvent"; text: string }
  | {
      kind: "agentTurn";
      message: string;
      model?: string;
      thinking?: string;
      timeoutSeconds?: number;
      allowUnsafeExternalContent?: boolean;
      deliver?: boolean;
      channel?: string;
      to?: string;
      bestEffortDeliver?: boolean;
    };

type Delivery = {
  mode: "none" | "announce";
  channel?: string;
  to?: string;
  bestEffort?: boolean;
};

type CronInput = {
  name: string;
  agentId: string;
  sessionKey?: string;
  description?: string;
  enabled?: boolean;
  deleteAfterRun?: boolean;
  schedule: Schedule;
  sessionTarget: "main" | "isolated";
  wakeMode: "next-heartbeat" | "now";
  payload: Payload;
  delivery?: Delivery;
};

type SaveBody = CronInput & { existingId?: string };

const isString = (v: unknown): v is string => typeof v === "string";
const isObject = (v: unknown): v is Record<string, unknown> =>
  Boolean(v && typeof v === "object" && !Array.isArray(v));

function validateBody(raw: unknown): { ok: true; body: SaveBody } | { ok: false; error: string } {
  if (!isObject(raw)) return { ok: false, error: "body must be an object" };
  const r = raw;
  const name = isString(r.name) ? r.name.trim() : "";
  const agentId = isString(r.agentId) ? r.agentId.trim() : "";
  if (!name) return { ok: false, error: "name is required" };
  if (!agentId) return { ok: false, error: "agentId is required" };
  if (!isObject(r.schedule)) return { ok: false, error: "schedule is required" };
  if (!isObject(r.payload)) return { ok: false, error: "payload is required" };
  if (r.sessionTarget !== "main" && r.sessionTarget !== "isolated") {
    return { ok: false, error: "sessionTarget must be 'main' or 'isolated'" };
  }
  if (r.wakeMode !== "next-heartbeat" && r.wakeMode !== "now") {
    return { ok: false, error: "wakeMode must be 'next-heartbeat' or 'now'" };
  }
  return { ok: true, body: r as unknown as SaveBody };
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  const validation = validateBody(raw);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }
  const { existingId, ...input } = validation.body;
  const trimmedExisting = existingId?.trim() ?? "";

  const result = await withGatewayClient(request, async (client) => {
    if (trimmedExisting) {
      // Edit path — remove then add. If add fails, surface clearly.
      try {
        await client.request<unknown>("cron.remove", { id: trimmedExisting });
      } catch (err) {
        throw new Error(
          `cron.remove(${trimmedExisting}) failed before recreate — original kept: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      try {
        const created = await client.request<{ id?: string }>("cron.add", input);
        return { mode: "edit" as const, created };
      } catch (err) {
        throw new Error(
          `cron.add failed after removing original ${trimmedExisting} — the cron was DELETED and could not be recreated. Edit input: ${JSON.stringify(
            input,
          ).slice(0, 200)}. Cause: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    const created = await client.request<{ id?: string }>("cron.add", input);
    return { mode: "create" as const, created };
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.data });
}
