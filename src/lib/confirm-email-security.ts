/**
 * Better Auth's direct server API bypasses handler-level CSRF/origin checks.
 * Validate the caller explicitly before consuming the one-time token.
 */
export function validateConfirmPayload(
  headers: Headers,
  body: unknown,
  expectedOrigin: string
): string | null {
  if (headers.get("origin") !== expectedOrigin) return null;
  const site = headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return null;
  if (!headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  if (!body || typeof body !== "object") return null;
  const candidate = (body as Record<string, unknown>).token;
  if (typeof candidate !== "string") return null;
  if (!/^[A-Za-z0-9._~-]{16,1024}$/.test(candidate)) return null;
  return candidate;
}
