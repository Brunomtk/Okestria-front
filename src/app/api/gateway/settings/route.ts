import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ACCESS_COOKIE = "okestria_access_token";

async function getGatewaySettings(token: string) {
  const apiUrl = process.env.NEXT_PUBLIC_OKESTRIA_API_URL || "https://localhost:44394";
  
  // Bypass SSL verification for localhost in development
  const response = await fetch(`${apiUrl}/api/Runtime/gateway-settings`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
    },
    cache: "no-store",
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch gateway settings: ${response.status} - ${text}`);
  }
  
  return response.json() as Promise<{
    configured: boolean;
    baseUrl: string;
    hasUpstreamToken?: boolean;
    upstreamToken?: string;
  }>;
}

export async function GET() {
  // Get auth token from cookies
  const cookieStore = await cookies();
  const authToken = cookieStore.get(ACCESS_COOKIE)?.value;
  
  if (!authToken) {
    return NextResponse.json(
      { error: "Unauthorized - no auth token" },
      { status: 401 }
    );
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

    return NextResponse.json({
      configured: settings.configured,
      gatewayUrl: settings.baseUrl,
      token: resolvedToken,
      hasToken: Boolean((settings.hasUpstreamToken ?? false) || resolvedToken),
    });
  } catch (error) {
    console.error("[gateway/settings] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
