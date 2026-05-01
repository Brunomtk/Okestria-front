import type { NextRequest } from "next/server";
import { NodeGatewayClient } from "@/lib/gateway/nodeGatewayClient";
import { requireAdminSession } from "@/app/admin/_lib/admin";

/**
 * v165 — Shared boilerplate for the four admin gateway-cron routes.
 *
 * Every route does the same five things in sequence:
 *   1. Auth (admin session required).
 *   2. Pull the upstream gateway URL + operator token from the back.
 *   3. Resolve a Control-UI Origin (mirror of v164 logic).
 *   4. Open a NodeGatewayClient (Ed25519 device handshake).
 *   5. Run the caller's RPC, then close the WS no matter what.
 *
 * The four routes only differ in step 5 — so they all funnel through
 * `withGatewayClient` and pass a tiny callback that does the actual
 * cron.list / cron.run / cron.remove / cron.add call.
 */

const HTTP_TIMEOUT_MS = 12_000;
const TOTAL_BUDGET_MS = 25_000;

export type WithGatewayResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

function resolveBackendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_OKESTRIA_API_URL ||
    process.env.OKESTRIA_API_URL ||
    "http://localhost:5227"
  ).replace(/\/$/, "");
}

function deriveOriginFromGatewayUrl(gatewayUrl: string): string {
  try {
    const u = new URL(gatewayUrl);
    if (u.protocol === "ws:") u.protocol = "http:";
    if (u.protocol === "wss:") u.protocol = "https:";
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

function resolveControlUiOrigin(request: NextRequest, gatewayUrl: string): string {
  const envOrigin =
    process.env.GATEWAY_CONTROL_UI_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "";
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  const fromGateway = deriveOriginFromGatewayUrl(gatewayUrl);
  if (fromGateway) return fromGateway;
  try {
    const u = new URL(request.url);
    const host = request.headers.get("x-forwarded-host") ?? u.host;
    const proto = request.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
    return `${proto}://${host}`;
  } catch {
    return "";
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function withDeadline<T>(p: Promise<T>, msLeft: number, label: string): Promise<T> {
  if (msLeft <= 0) throw new Error(`${label}: total budget exhausted`);
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label}: timed out after ${msLeft}ms`)),
          msLeft,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type GatewaySettings = {
  configured?: boolean;
  baseUrl?: string;
  upstreamToken?: string;
};

export async function withGatewayClient<T>(
  request: NextRequest,
  callback: (client: NodeGatewayClient) => Promise<T>,
): Promise<WithGatewayResult<T>> {
  const start = Date.now();

  // 1. Admin session
  let jwt: string;
  try {
    const session = await requireAdminSession();
    jwt = session.token!;
  } catch (err) {
    return {
      ok: false,
      status: 401,
      error: err instanceof Error ? err.message : "unauthorized",
    };
  }

  const apiBase = resolveBackendBaseUrl();

  // 2. Gateway settings (real URL + operator token)
  let gatewayUrl = "";
  let upstreamToken = "";
  try {
    const res = await fetchWithTimeout(`${apiBase}/api/Runtime/gateway-settings`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const settings = (await res.json()) as GatewaySettings;
    if (!settings.configured || !settings.baseUrl) {
      throw new Error("gateway not configured on backend");
    }
    gatewayUrl = settings.baseUrl.trim();
    upstreamToken = (settings.upstreamToken ?? "").trim();
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: `gateway settings: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 3 + 4. Connect + run
  const gateway = new NodeGatewayClient();
  try {
    const origin = resolveControlUiOrigin(request, gatewayUrl);
    const remainingForConnect = TOTAL_BUDGET_MS - (Date.now() - start);
    await withDeadline(
      gateway.connect({
        gatewayUrl,
        token: upstreamToken || null,
        origin: origin || null,
      }),
      remainingForConnect,
      "gateway connect",
    );
    const remainingForCallback = TOTAL_BUDGET_MS - (Date.now() - start);
    const data = await withDeadline(callback(gateway), remainingForCallback, "gateway rpc");
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    try {
      gateway.close();
    } catch {
      /* ignore */
    }
  }
}
