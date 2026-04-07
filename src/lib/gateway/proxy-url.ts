import { getOkestriaApiBaseUrl } from "@/lib/auth/api";
import { getOkestriaAuthToken } from "@/lib/auth/session-client";

export const resolveStudioProxyGatewayUrl = (): string => {
  const url = new URL(getOkestriaApiBaseUrl());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/api/gateway/ws";
  url.search = "";

  const accessToken = getOkestriaAuthToken()?.trim() ?? "";
  if (accessToken) {
    url.searchParams.set("access_token", accessToken);
  }

  return url.toString();
};
