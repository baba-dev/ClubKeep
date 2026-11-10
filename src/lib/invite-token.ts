import { createHmac, randomBytes } from "node:crypto";

const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITE_KEY_VERSION = 1;

export function isInviteToken(value: unknown): value is string {
  return typeof value === "string" && INVITE_TOKEN_PATTERN.test(value);
}

export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Domain-separated HMAC; never persist or log the original bearer token. */
export function inviteTokenHash(token: string, secret: string): string {
  if (!isInviteToken(token) || secret.length < 32) throw new Error("Invalid invitation");
  return createHmac("sha256", secret).update("clubkeep:invite:v1:").update(token).digest("hex");
}

/** URL fragments do not reach Nginx, analytics or server access logs. */
export function invitationUrl(origin: string, token: string): string {
  if (!isInviteToken(token)) throw new Error("Invalid invitation");
  const url = new URL("/join", origin);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("Invalid invitation origin");
  }
  return url.toString() + "#invite=" + token;
}
