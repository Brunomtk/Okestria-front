import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import next from "next";

import { createAccessGate } from "./access-gate.js";
import { createGatewayProxy } from "./gateway-proxy.js";
import { assertPublicHostAllowed, resolveHosts } from "./network-policy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolvePort = () => {
  const raw = process.env.PORT?.trim() || "3000";
  const port = Number(raw);
  if (!Number.isFinite(port) || port <= 0) return 3000;
  return port;
};

const resolvePathname = (url) => {
  const raw = typeof url === "string" ? url : "";
  const idx = raw.indexOf("?");
  return (idx === -1 ? raw : raw.slice(0, idx)) || "/";
};

const parseCookies = (cookieHeader) => {
  const raw = typeof cookieHeader === "string" ? cookieHeader : "";
  return raw.split(";").reduce((acc, chunk) => {
    const idx = chunk.indexOf("=");
    if (idx === -1) return acc;
    const key = chunk.slice(0, idx).trim();
    const value = chunk.slice(idx + 1).trim();
    if (key) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {});
};

const allowInsecureLocalTls = () => {
  const raw = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  if (raw == null || raw === "") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
};

const getOkestriaApiBaseUrl = () => {
  const raw =
    process.env.OKESTRIA_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_OKESTRIA_API_URL?.trim() ||
    "https://localhost:44394";
  return raw.replace(/\/$/, "");
};

const loadGatewaySettingsFromBackend = async (req) => {
  const cookies = parseCookies(req?.headers?.cookie || "");
  const accessToken = cookies.okestria_access_token;

  if (!accessToken) {
    throw new Error("Okestria access token cookie not found.");
  }

  const response = await fetch(`${getOkestriaApiBaseUrl()}/api/Runtime/gateway-settings`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      Cookie: req?.headers?.cookie || "",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to load gateway settings from backend (${response.status}): ${text}`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const text = await response.text();
    throw new Error(`Invalid gateway settings response from backend: ${text}`);
  }

  const data = await response.json();

  return {
    url: typeof data?.baseUrl === "string" ? data.baseUrl.trim() : "",
    token: typeof data?.upstreamToken === "string" ? data.upstreamToken.trim() : "",
  };
};

const CERT_DIR = path.join(__dirname, "..", ".certs");
const CERT_PATH = path.join(CERT_DIR, "localhost.crt");
const KEY_PATH = path.join(CERT_DIR, "localhost.key");

const generateHttpsCert = async () => {
  if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
    return {
      key: fs.readFileSync(KEY_PATH, "utf8"),
      cert: fs.readFileSync(CERT_PATH, "utf8"),
    };
  }

  const selfsigned = await import("selfsigned").then(m => m.default || m);
  const attrs = [{ name: "commonName", value: "localhost" }];
  const pems = await selfsigned.generate(attrs, {
    days: 825,
    keySize: 2048,
    algorithm: "sha256",
    extensions: [
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: "localhost" },
          { type: 7, ip: "127.0.0.1" },
        ],
      },
    ],
  });

  fs.mkdirSync(CERT_DIR, { recursive: true });
  fs.writeFileSync(CERT_PATH, pems.cert);
  fs.writeFileSync(KEY_PATH, pems.private);

  console.info(`\nCert saved to ${CERT_DIR}`);
  console.info("To make browsers trust it (macOS), run:");
  console.info(`  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${CERT_PATH}"\n`);

  return { key: pems.private, cert: pems.cert };
};

async function main() {
  allowInsecureLocalTls();
  console.info(`[Okestria] API base URL: ${getOkestriaApiBaseUrl()}`);
  const dev = process.argv.includes("--dev");
  const useHttps = process.argv.includes("--https") || process.env.HTTPS === "true";
  const hostnames = Array.from(new Set(resolveHosts(process.env)));
  const hostname = hostnames[0] ?? "127.0.0.1";
  const port = resolvePort();
  for (const host of hostnames) {
    assertPublicHostAllowed({
      host,
      studioAccessToken: process.env.STUDIO_ACCESS_TOKEN,
    });
  }

  const app = next({
    dev,
    hostname,
    port,
  });
  const handle = app.getRequestHandler();

  const accessGate = createAccessGate({
    token: process.env.STUDIO_ACCESS_TOKEN,
  });

  const proxy = createGatewayProxy({
    loadUpstreamSettings: async (req) => {
      const settings = await loadGatewaySettingsFromBackend(req);
      return { url: settings.url, token: settings.token };
    },
    allowWs: (req) => {
      if (resolvePathname(req.url) !== "/api/gateway/ws") return false;
      return true;
    },
    verifyClient: (info) => accessGate.allowUpgrade(info.req),
  });

  await app.prepare();
  const handleUpgrade = app.getUpgradeHandler();
  const handleServerUpgrade = (req, socket, head) => {
    if (resolvePathname(req.url) === "/api/gateway/ws") {
      proxy.handleUpgrade(req, socket, head);
      return;
    }
    handleUpgrade(req, socket, head);
  };

  const httpsCert = useHttps ? await generateHttpsCert() : null;

  const createServer = () =>
    useHttps
      ? https.createServer(httpsCert, (req, res) => {
          if (accessGate.handleHttp(req, res)) return;
          handle(req, res);
        })
      : http.createServer((req, res) => {
          if (accessGate.handleHttp(req, res)) return;
          handle(req, res);
        });

  const servers = hostnames.map(() => createServer());

  const attachUpgradeHandlers = (server) => {
    server.on("upgrade", handleServerUpgrade);
    server.on("newListener", (eventName, listener) => {
      if (eventName !== "upgrade") return;
      if (listener === handleServerUpgrade) return;
      process.nextTick(() => {
        server.removeListener("upgrade", listener);
      });
    });
  };

  for (const server of servers) {
    attachUpgradeHandlers(server);
  }

  const listenOnHost = (server, host) =>
    new Promise((resolve, reject) => {
      const onError = (err) => {
        server.off("error", onError);
        reject(err);
      };
      server.once("error", onError);
      server.listen(port, host, () => {
        server.off("error", onError);
        resolve();
      });
    });

  const closeServer = (server) =>
    new Promise((resolve) => {
      if (!server.listening) return resolve();
      server.close(() => resolve());
    });

  try {
    await Promise.all(servers.map((server, index) => listenOnHost(server, hostnames[index])));
  } catch (err) {
    await Promise.all(servers.map((server) => closeServer(server)));
    throw err;
  }

  const hostForBrowser = hostnames.some((value) => value === "127.0.0.1" || value === "::1")
    ? "localhost"
    : hostname === "0.0.0.0" || hostname === "::"
      ? "localhost"
      : hostname;

  const protocol = useHttps ? "https" : "http";
  const browserUrl = `${protocol}://${hostForBrowser}:${port}`;
  console.info(`Open in browser: ${browserUrl}`);
  if (useHttps) {
    console.info("HTTPS mode: self-signed cert in use. You may need to accept a browser security warning once.");
    console.info(`Spotify redirect URI: ${browserUrl}/office`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
