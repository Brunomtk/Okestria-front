import { NextResponse, type NextRequest } from "next/server";
import { NodeGatewayClient } from "@/lib/gateway/nodeGatewayClient";
import { requireAdminSession } from "@/app/admin/_lib/admin";

/**
 * v162 — Per-agent sync, now using the proper gateway handshake.
 *
 * v159 talked to the gateway with bare jsonrpc 2.0 frames and skipped
 * the device-signed `connect` handshake — the gateway answered with
 * `code=1008 reason="connect required"` and the rest of the requests
 * came back as 1006 (connection torn down). NodeGatewayClient already
 * implements the full handshake (Ed25519 device key, nonce challenge,
 * `{type:"req"}` framing) and is what the office/remote-message route
 * uses — we reuse it here.
 *
 * Pipeline (one agent per HTTP call, browser loops these):
 *   1. PUT /api/Agents/{id}/profile (re-save → triggers v84
 *      ComposeAutoInjectedToolsAsync on the back).
 *   2. GET /api/Agents/{id} → read freshly-composed TOOLS file.
 *   3. NodeGatewayClient.connect(wss://api.ptxgrowth.us/api/gateway/ws,
 *      jwt) → device handshake completes.
 *   4. client.request("agents.files.set", { agentId: slug, name, content })
 *   5. Close, return JSON.
 *
 * Hard timeouts everywhere so a hung gateway never holds the request
 * hostage; total budget per agent stays at 25s.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HTTP_TIMEOUT_MS = 12_000;
const TOTAL_BUDGET_MS = 25_000;

function resolveBackendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_OKESTRIA_API_URL ||
    process.env.OKESTRIA_API_URL ||
    "http://localhost:5227"
  ).replace(/\/$/, "");
}

function resolveGatewayProxyUrl(): string {
  const api = resolveBackendBaseUrl();
  return (
    api.replace(/^https?:\/\//, (m) => (m === "https://" ? "wss://" : "ws://")) +
    "/api/gateway/ws"
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms = HTTP_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

async function withDeadline<T>(
  promise: Promise<T>,
  remainingMs: number,
  label: string,
): Promise<T> {
  if (remainingMs <= 0) {
    throw new Error(`${label}: total budget exhausted`);
  }
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label}: timed out after ${remainingMs}ms`)),
          remainingMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type Step = "auth" | "fetch" | "resave" | "compose" | "push" | "done";

type Report = {
  ok: boolean;
  step: Step;
  agentId: number;
  agentSlug: string | null;
  toolsChars?: number;
  error?: string;
  ms?: number;
};

export async function POST(request: NextRequest) {
  const start = Date.now();
  const url = new URL(request.url);
  const agentIdRaw = url.searchParams.get("agentId");
  const agentId = Number(agentIdRaw);

  if (!Number.isFinite(agentId) || agentId <= 0) {
    return NextResponse.json(
      {
        ok: false,
        step: "auth",
        error: "missing or invalid agentId",
        agentId: 0,
        agentSlug: null,
      } satisfies Report,
      { status: 400 },
    );
  }

  let jwt: string;
  try {
    const session = await requireAdminSession();
    jwt = session.token!;
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        step: "auth",
        error: err instanceof Error ? err.message : String(err),
        agentId,
        agentSlug: null,
      } satisfies Report,
      { status: 401 },
    );
  }

  const apiBase = resolveBackendBaseUrl();
  const auth = { Authorization: `Bearer ${jwt}` };
  const jsonAuth = { ...auth, "Content-Type": "application/json" };

  type AgentDetailsRow = {
    id: number;
    slug?: string | null;
    files?: Array<{ fileType?: string | null; content?: string | null }>;
    profile?: Record<string, unknown> | null;
  };

  // 1. Fetch the current agent details
  let details: AgentDetailsRow;
  try {
    details = await jsonOrThrow<AgentDetailsRow>(
      await fetchWithTimeout(`${apiBase}/api/Agents/${agentId}`, {
        headers: auth,
        cache: "no-store",
      }),
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        step: "fetch",
        agentId,
        agentSlug: null,
        error: err instanceof Error ? err.message : String(err),
        ms: Date.now() - start,
      } satisfies Report,
      { status: 200 },
    );
  }

  const slug = (details.slug ?? "").trim() || null;
  if (!slug) {
    return NextResponse.json(
      {
        ok: false,
        step: "compose",
        agentId,
        agentSlug: null,
        error: "agent has no slug — cannot map to OpenClaw agentId",
        ms: Date.now() - start,
      } satisfies Report,
      { status: 200 },
    );
  }

  // 2. PUT profile back → triggers v84 SyncProfileFiles → ComposeAutoInjectedTools
  try {
    await jsonOrThrow<unknown>(
      await fetchWithTimeout(`${apiBase}/api/Agents/${agentId}/profile`, {
        method: "PUT",
        headers: jsonAuth,
        body: JSON.stringify(details.profile ?? {}),
        cache: "no-store",
      }),
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        step: "resave",
        agentId,
        agentSlug: slug,
        error: err instanceof Error ? err.message : String(err),
        ms: Date.now() - start,
      } satisfies Report,
      { status: 200 },
    );
  }

  // 3. Read freshly-composed TOOLS content from the back
  let toolsContent = "";
  try {
    const fresh = await jsonOrThrow<AgentDetailsRow>(
      await fetchWithTimeout(`${apiBase}/api/Agents/${agentId}`, {
        headers: auth,
        cache: "no-store",
      }),
    );
    const toolsFile = (fresh.files ?? []).find(
      (f) => (f.fileType ?? "").toUpperCase() === "TOOLS",
    );
    toolsContent = (toolsFile?.content ?? "").trim();
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        step: "compose",
        agentId,
        agentSlug: slug,
        error: err instanceof Error ? err.message : String(err),
        ms: Date.now() - start,
      } satisfies Report,
      { status: 200 },
    );
  }

  // 4. Push to OpenClaw via the proper device handshake.
  // NodeGatewayClient handles the connect.challenge / Ed25519 signature
  // dance; without it the gateway closes with 1008 "connect required".
  const gateway = new NodeGatewayClient();
  try {
    const remainingForConnect = TOTAL_BUDGET_MS - (Date.now() - start);
    await withDeadline(
      gateway.connect({
        gatewayUrl: resolveGatewayProxyUrl(),
        token: jwt,
      }),
      remainingForConnect,
      "gateway connect",
    );

    const remainingForCall = TOTAL_BUDGET_MS - (Date.now() - start);
    await withDeadline(
      gateway.request("agents.files.set", {
        agentId: slug,
        name: "TOOLS.md",
        content: toolsContent,
      }),
      remainingForCall,
      "agents.files.set",
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        step: "push",
        agentId,
        agentSlug: slug,
        toolsChars: toolsContent.length,
        error: err instanceof Error ? err.message : String(err),
        ms: Date.now() - start,
      } satisfies Report,
      { status: 200 },
    );
  } finally {
    try {
      gateway.close();
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json(
    {
      ok: true,
      step: "done",
      agentId,
      agentSlug: slug,
      toolsChars: toolsContent.length,
      ms: Date.now() - start,
    } satisfies Report,
    { status: 200 },
  );
}
