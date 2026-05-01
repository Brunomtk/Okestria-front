import { NextResponse, type NextRequest } from "next/server";
import { NodeGatewayClient } from "@/lib/gateway/nodeGatewayClient";
import { requireAdminSession } from "@/app/admin/_lib/admin";

/**
 * v162 — Per-agent sync, with the proper gateway URL + handshake.
 *
 * Two bugs to unwind in sequence:
 *   v159  → talked to the gateway with bare jsonrpc 2.0 frames and
 *           skipped the device-signed `connect` handshake → gateway
 *           closed with `1008 connect required` / `1006`.
 *   v162a → switched to NodeGatewayClient (Ed25519 device key, nonce
 *           challenge, `{type:"req"}` framing) but pointed it at the
 *           NEXT proxy URL with the user's session JWT → underlying
 *           WS errored ("Remote gateway connection failed.") because
 *           the user JWT is not a gateway operator token.
 *
 * The fix that actually works: ask the back for the REAL gateway URL
 * and operator upstream token via /api/Runtime/gateway-settings (same
 * endpoint the in-app gateway settings UI uses), then connect there.
 *
 * Pipeline (one agent per HTTP call, browser loops these):
 *   1. PUT /api/Agents/{id}/profile (re-save → triggers v84
 *      ComposeAutoInjectedToolsAsync on the back).
 *   2. GET /api/Agents/{id} → read freshly-composed TOOLS file.
 *   3. GET /api/Runtime/gateway-settings → { baseUrl, upstreamToken }.
 *   4. NodeGatewayClient.connect(baseUrl, upstreamToken) → device handshake.
 *   5. client.request("agents.files.set", { agentId: slug, name, content }).
 *   6. Close, return JSON.
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

  // 4a. Resolve the REAL OpenClaw gateway URL + operator upstream token
  //     from the back. The user's session JWT is NOT a gateway operator
  //     token — the gateway would reject it (or simply error the WS,
  //     which is what we observed). The back exposes baseUrl + token via
  //     /api/Runtime/gateway-settings (admin-protected).
  type GatewaySettings = {
    configured?: boolean;
    baseUrl?: string;
    upstreamToken?: string;
  };
  let gatewayUrl = "";
  let upstreamToken = "";
  try {
    const settings = await jsonOrThrow<GatewaySettings>(
      await fetchWithTimeout(`${apiBase}/api/Runtime/gateway-settings`, {
        headers: auth,
        cache: "no-store",
      }),
    );
    if (!settings.configured || !settings.baseUrl) {
      throw new Error("gateway not configured on backend");
    }
    gatewayUrl = settings.baseUrl.trim();
    upstreamToken = (settings.upstreamToken ?? "").trim();
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        step: "push",
        agentId,
        agentSlug: slug,
        toolsChars: toolsContent.length,
        error: `gateway settings: ${err instanceof Error ? err.message : String(err)}`,
        ms: Date.now() - start,
      } satisfies Report,
      { status: 200 },
    );
  }

  // 4b. Open the gateway with the operator token + Ed25519 device handshake.
  const gateway = new NodeGatewayClient();
  try {
    const remainingForConnect = TOTAL_BUDGET_MS - (Date.now() - start);
    await withDeadline(
      gateway.connect({
        gatewayUrl,
        token: upstreamToken || null,
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
