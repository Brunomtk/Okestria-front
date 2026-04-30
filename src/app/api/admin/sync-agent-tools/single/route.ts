import { NextResponse, type NextRequest } from "next/server";
import WebSocket from "ws";
import { requireAdminSession } from "@/app/admin/_lib/admin";

/**
 * v159 — Per-agent sync.
 *
 * One agent per HTTP call. The browser loops these. Hard timeouts
 * everywhere (WS open: 8s, WS call: 8s, total: 25s) so a hanging
 * gateway never holds the request hostage. Returns ALWAYS within
 * the budget, with the precise step that failed.
 *
 * Pipeline:
 *   1. PUT /api/Agents/{id}/profile (re-save → triggers v84
 *      ComposeAutoInjectedToolsAsync on the back).
 *   2. GET /api/Agents/{id} → read freshly-composed TOOLS file.
 *   3. Open WS to wss://api.ptxgrowth.us/api/gateway/ws (8s timeout).
 *   4. Call agents.files.set { agentId: slug, name: "TOOLS.md", content }.
 *   5. Close WS, return JSON.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // hard cap, covers all timeouts comfortably

const WS_OPEN_TIMEOUT_MS = 8_000;
const WS_CALL_TIMEOUT_MS = 8_000;
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

type RpcResult = unknown;

function callOnce(
  jwt: string,
  method: string,
  params: unknown,
  budgetMs: number,
): Promise<RpcResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err: Error | null, result?: RpcResult) => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      err ? reject(err) : resolve(result);
    };

    const url = `${resolveGatewayProxyUrl()}?access_token=${encodeURIComponent(jwt)}`;
    const ws = new WebSocket(url);

    const overall = setTimeout(
      () => finish(new Error(`overall WS budget exceeded (${budgetMs}ms)`)),
      budgetMs,
    );
    const open = setTimeout(
      () => finish(new Error(`WS connect timeout (${WS_OPEN_TIMEOUT_MS}ms)`)),
      WS_OPEN_TIMEOUT_MS,
    );
    let call: NodeJS.Timeout | null = null;

    ws.on("open", () => {
      clearTimeout(open);
      const id = "1";
      ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
      call = setTimeout(
        () => finish(new Error(`WS call timeout · ${method} (${WS_CALL_TIMEOUT_MS}ms)`)),
        WS_CALL_TIMEOUT_MS,
      );
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg && typeof msg === "object" && "id" in msg && msg.id === "1") {
          if (call) clearTimeout(call);
          if (msg.error) {
            finish(
              new Error(`gateway error ${msg.error.code ?? "?"}: ${msg.error.message ?? "unknown"}`),
            );
          } else {
            clearTimeout(overall);
            finish(null, msg.result);
          }
        }
      } catch {
        /* ignore non-JSON / hello / events */
      }
    });

    ws.on("error", (err) => finish(err as Error));
    ws.on("close", (code, reason) => {
      if (!settled)
        finish(
          new Error(
            `WS closed before response (code=${code} reason=${reason?.toString().slice(0, 80) ?? ""})`,
          ),
        );
    });
  });
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
      { ok: false, step: "auth", error: "missing or invalid agentId", agentId: 0, agentSlug: null } satisfies Report,
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

  // 4. Push to OpenClaw via WS — strict overall budget
  try {
    await callOnce(
      jwt,
      "agents.files.set",
      { agentId: slug, name: "TOOLS.md", content: toolsContent },
      TOTAL_BUDGET_MS - (Date.now() - start),
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
