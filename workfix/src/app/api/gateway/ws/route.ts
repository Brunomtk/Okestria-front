import { cookies } from "next/headers";

// This route handles WebSocket upgrade requests and proxies them to the upstream gateway
// It fetches gateway settings from the backend and establishes a connection

const ACCESS_COOKIE = "okestria_access_token";

async function getGatewaySettings(token: string) {
  const apiUrl = process.env.NEXT_PUBLIC_OKESTRIA_API_URL || "https://api.ptxgrowth.us";
  const response = await fetch(`${apiUrl}/api/Runtime/gateway-settings`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
    },
    cache: "no-store",
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch gateway settings: ${response.status}`);
  }
  
  return response.json() as Promise<{
    configured: boolean;
    baseUrl: string;
    hasUpstreamToken?: boolean;
    upstreamToken?: string;
  }>;
}

export async function GET(request: Request) {
  // Check for WebSocket upgrade
  const upgradeHeader = request.headers.get("upgrade");
  if (upgradeHeader?.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  // Get auth token from cookies
  const cookieStore = await cookies();
  const authToken = cookieStore.get(ACCESS_COOKIE)?.value;
  
  if (!authToken) {
    return new Response("Unauthorized - no auth token", { status: 401 });
  }

  try {
    // Fetch gateway settings from backend
    const settings = await getGatewaySettings(authToken);
    
    const fallbackToken =
      process.env.GATEWAY_TOKEN?.trim() ||
      process.env.OKESTRIA_GATEWAY_TOKEN?.trim() ||
      process.env.NEXT_PUBLIC_GATEWAY_TOKEN?.trim() ||
      "";
    const resolvedToken = (settings.upstreamToken ?? "").trim() || fallbackToken;

    if (!settings.configured || !settings.baseUrl) {
      return new Response("Gateway not configured", { status: 503 });
    }

    return new Response(JSON.stringify({
      gatewayUrl: settings.baseUrl,
      token: resolvedToken,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Url": settings.baseUrl,
        "X-Gateway-Token": resolvedToken,
      },
    });
  } catch (error) {
    console.error("[gateway/ws] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500 }
    );
  }
}
