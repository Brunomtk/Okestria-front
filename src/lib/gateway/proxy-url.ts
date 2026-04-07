const normalizeConfiguredProxyUrl = (value: string | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveDomainMappedProxyUrl = (): string | null => {
  const host = window.location.host.trim().toLowerCase();
  if (!host) return null;

  if (host === "www.ptxgrowth.us" || host === "ptxgrowth.us") {
    return "wss://api.ptxgrowth.us/api/gateway/ws";
  }

  return null;
};

export const resolveStudioProxyGatewayUrl = (): string => {
  const configured = normalizeConfiguredProxyUrl(
    process.env.NEXT_PUBLIC_GATEWAY_WS_PROXY_URL
  );
  if (configured) return configured;

  const mapped = resolveDomainMappedProxyUrl();
  if (mapped) return mapped;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  return `${protocol}://${host}/api/gateway/ws`;
};
