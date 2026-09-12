/**
 * Derives the public base URL from the incoming request instead of a fixed
 * env var. This app is meant to be run behind a tunnel (ngrok/cloudflared)
 * whose public hostname isn't known until the tunnel starts, and can change
 * between runs - so every OAuth/webhook URL is built from the request that
 * actually arrived, which the tunnel forwards with the real public Host.
 */
export function getBaseUrl(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "localhost:3000";
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = forwardedProto || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
