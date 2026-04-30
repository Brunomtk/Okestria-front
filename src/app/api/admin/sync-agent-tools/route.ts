import { NextResponse } from "next/server";
import WebSocket from "ws";
import { requireAdminSession } from "@/app/admin/_lib/admin";

/**
 * v156 — One-shot endpoint that re-syncs every agent's TOOLS.md
 * file in OpenClaw with the recipe-injected content from the
 * Okestria DB.
 *
 * Pipeline (all in one HTTP call):
 *   1. requireAdminSession() → confirms caller is admin + has token.
 *   2. List companies via Okestria back.
 *   3. For each company, list agents.
 *   4. For each agent:
 *      a. POST the agent's CURRENT profile back to itself
 *         (`/api/Agents/{id}/profile`). This triggers the back's
 *         v84 SyncProfileFiles → ComposeAutoInjectedToolsAsync,
 *         which rewrites the AgentFile "TOOLS" row in the DB
 *         with the operator content + auto-injected cortex/Apify
 *         recipes between markers.
 *      b. GET the agent details to read the freshly-composed
 *         TOOLS content.
 *      c. Open a server-side WebSocket to the gateway proxy at
 *         api.ptxgrowth.us/api/gateway/ws (same back the front
 *         uses) and call `agents.files.set` to push TOOLS.md
 *         straight into the OpenClaw filesystem.
 *   5. Return a JSON report with counts per agent + per company.
 *
 * Auth: requires an admin session (Type=1). The same admin who
 * pressed the button supplies the JWT we forward to both the back
 * and the gateway.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveBackendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_OKESTRIA_API_URL ||
    process.env.OKESTRIA_API_URL ||
    "http://localhost:5227"
  ).replace(/\/$/, "");
}

function resolveGatewayProxyUrl(): string {
  // The gateway proxy lives on the back's host (cf. proxy-url.ts).
  // Pulling from API base URL keeps dev (localhost) and prod
  // (api.ptxgrowth.us) on the same source.
  const api = resolveBackendBaseUrl();
  return api.replace(/^https?:\/\//, (match) =>
    match === "https://" ? "wss://" : "ws://",
  ) + "/api/gateway/ws";
}

type AgentRow = {
  id: number;
  slug?: string | null;
  name?: string | null;
};

type CompanyRow = {
  id: number;
  name?: string | null;
};

type AgentDetailsRow = {
  id: number;
  files?: Array<{ fileType?: string | null; content?: string | null }>;
  profile?: Record<string, unknown> | null;
};

type AgentReport = {
  companyId: number;
  companyName: string;
  agentId: number;
  agentName: string;
  agentSlug: string | null;
  step: "resave" | "fetch" | "push" | "done" | "skip";
  ok: boolean;
  error?: string;
  toolsChars?: number;
};

async function jsonFetch<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `${init.method ?? "GET"} ${url} → ${res.status} ${text.slice(0, 200)}`,
    );
  }
  return (await res.json()) as T;
}

/** Tiny JSON-RPC helper over the back's WS proxy. */
type Rpc = {
  call<T = unknown>(method: string, params: unknown): Promise<T>;
  close: () => void;
};

function openGatewayRpc(jwt: string): Promise<Rpc> {
  const url = `${resolveGatewayProxyUrl()}?access_token=${encodeURIComponent(jwt)}`;
  return new Promise((resolve, reject) => {
    const ws: WebSocket = new WebSocket(url);
    const pending = new Map<
      string,
      { res: (value: unknown) => void; rej: (err: Error) => void }
    >();
    let nextId = 1;
    let opened = false;

    const closeAll = (err?: Error) => {
      for (const { rej } of pending.values()) {
        rej(err ?? new Error("WS closed"));
      }
      pending.clear();
    };

    ws.on("open", () => {
      opened = true;
      resolve({
        call(method, params) {
          return new Promise<unknown>((res, rej) => {
            const id = String(nextId++);
            pending.set(id, { res, rej });
            ws.send(
              JSON.stringify({ jsonrpc: "2.0", id, method, params }),
            );
            setTimeout(() => {
              if (pending.has(id)) {
                pending.delete(id);
                rej(new Error(`gateway timeout · ${method}`));
              }
            }, 30_000);
          }) as Promise<never>;
        },
        close() {
          ws.close();
        },
      });
    });

    ws.on("error", (err) => {
      if (!opened) reject(err);
      closeAll(err as Error);
    });

    ws.on("close", () => closeAll());

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg && typeof msg === "object" && "id" in msg && msg.id != null) {
          const id = String(msg.id);
          const handler = pending.get(id);
          if (handler) {
            pending.delete(id);
            if (msg.error) {
              handler.rej(
                new Error(`${msg.error.code ?? "ERR"}: ${msg.error.message ?? "gateway error"}`),
              );
            } else {
              handler.res(msg.result);
            }
          }
        }
      } catch {
        /* ignore non-JSON frames */
      }
    });
  });
}

export async function POST() {
  const session = await requireAdminSession();
  const jwt = session.token!;
  const apiBase = resolveBackendBaseUrl();
  const auth = { Authorization: `Bearer ${jwt}` };
  const jsonAuth = {
    ...auth,
    "Content-Type": "application/json",
  };

  // 1. Companies
  let companies: CompanyRow[] = [];
  try {
    const paged = await jsonFetch<{ result?: CompanyRow[] }>(
      `${apiBase}/api/Companies/paged?pageNumber=1&pageSize=200`,
      { headers: auth, cache: "no-store" },
    );
    companies = paged.result ?? [];
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        stage: "list-companies",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  // 2. Open the WS to the gateway proxy ONCE for the whole run.
  let rpc: Rpc;
  try {
    rpc = await openGatewayRpc(jwt);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        stage: "open-gateway",
        error: err instanceof Error ? err.message : String(err),
        gatewayUrl: resolveGatewayProxyUrl(),
      },
      { status: 502 },
    );
  }

  const reports: AgentReport[] = [];

  try {
    for (const company of companies) {
      // 3. List agents per company
      let agents: AgentRow[] = [];
      try {
        agents = await jsonFetch<AgentRow[]>(
          `${apiBase}/api/Agents/by-company/${company.id}`,
          { headers: auth, cache: "no-store" },
        );
      } catch (err) {
        reports.push({
          companyId: company.id,
          companyName: company.name ?? `Company #${company.id}`,
          agentId: 0,
          agentName: "(list failed)",
          agentSlug: null,
          step: "fetch",
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      for (const agent of agents) {
        const slug = agent.slug?.trim() ?? null;
        const baseReport = {
          companyId: company.id,
          companyName: company.name ?? `Company #${company.id}`,
          agentId: agent.id,
          agentName: agent.name ?? `Agent #${agent.id}`,
          agentSlug: slug,
        };

        if (!slug) {
          reports.push({
            ...baseReport,
            step: "skip",
            ok: false,
            error: "agent has no slug — cannot map to OpenClaw agentId",
          });
          continue;
        }

        // 3a. Re-save the profile to trigger SyncProfileFiles +
        //     ComposeAutoInjectedToolsAsync on the back. We just send
        //     the current profile back to its endpoint.
        let detailsRaw: AgentDetailsRow;
        try {
          detailsRaw = await jsonFetch<AgentDetailsRow>(
            `${apiBase}/api/Agents/${agent.id}`,
            { headers: auth, cache: "no-store" },
          );
        } catch (err) {
          reports.push({
            ...baseReport,
            step: "fetch",
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
          continue;
        }

        try {
          await jsonFetch<unknown>(
            `${apiBase}/api/Agents/${agent.id}/profile`,
            {
              method: "POST",
              headers: jsonAuth,
              body: JSON.stringify(detailsRaw.profile ?? {}),
              cache: "no-store",
            },
          );
        } catch (err) {
          reports.push({
            ...baseReport,
            step: "resave",
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
          continue;
        }

        // 3b. Fetch the freshly-composed TOOLS content from the back.
        let toolsContent = "";
        try {
          const fresh = await jsonFetch<AgentDetailsRow>(
            `${apiBase}/api/Agents/${agent.id}`,
            { headers: auth, cache: "no-store" },
          );
          const toolsFile = (fresh.files ?? []).find(
            (f) => (f.fileType ?? "").toUpperCase() === "TOOLS",
          );
          toolsContent = (toolsFile?.content ?? "").trim();
        } catch (err) {
          reports.push({
            ...baseReport,
            step: "fetch",
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
          continue;
        }

        // 3c. Push to OpenClaw via WS.
        try {
          await rpc.call("agents.files.set", {
            agentId: slug,
            name: "TOOLS.md",
            content: toolsContent,
          });
          reports.push({
            ...baseReport,
            step: "done",
            ok: true,
            toolsChars: toolsContent.length,
          });
        } catch (err) {
          reports.push({
            ...baseReport,
            step: "push",
            ok: false,
            error: err instanceof Error ? err.message : String(err),
            toolsChars: toolsContent.length,
          });
        }
      }
    }
  } finally {
    rpc.close();
  }

  const okCount = reports.filter((r) => r.ok).length;
  const failCount = reports.filter((r) => !r.ok && r.step !== "skip").length;
  const skipCount = reports.filter((r) => r.step === "skip").length;

  return NextResponse.json({
    ok: failCount === 0,
    summary: {
      companies: companies.length,
      agents: reports.length,
      pushed: okCount,
      failed: failCount,
      skipped: skipCount,
    },
    agents: reports,
    finishedAt: new Date().toISOString(),
  });
}
