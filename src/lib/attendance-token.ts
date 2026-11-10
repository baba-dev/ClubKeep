import { createHmac, timingSafeEqual } from "node:crypto";

const QR_PERIOD_MS = 30_000;
const TOKEN_VERSION = "ck1";
const ID = /^[A-Za-z0-9_-]{10,128}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{43}$/;

/** Separate key namespace from Better Auth and Phase 0D invitation hashes. */
function signature(clubId: string, memberId: string, window: number, secret: string): Buffer {
  if (secret.length < 32) throw new Error("QR signing key is not configured");
  return createHmac("sha256", secret)
    .update("clubkeep:attendance:qr:v1\0")
    .update(clubId).update("\0").update(memberId).update("\0").update(String(window))
    .digest();
}

export function newAttendanceQr(clubId: string, memberId: string, secret: string, now = Date.now()) {
  if (!ID.test(clubId) || !ID.test(memberId)) throw new Error("Invalid QR identity");
  const window = Math.floor(now / QR_PERIOD_MS);
  const proof = signature(clubId, memberId, window, secret).toString("base64url");
  return {
    token: [TOKEN_VERSION, clubId, memberId, String(window), proof].join("."),
    refreshAt: (window + 1) * QR_PERIOD_MS,
  };
}

/**
 * Staff-only redemption; accept current or immediately prior time slot to
 * tolerate camera delay. No future slot or replay across club/day is accepted.
 * Return only signed identifiers, never trust a client-supplied role.
 */
export function verifyAttendanceQr(raw: string, clubId: string, secret: string, now = Date.now()):
  | { memberRecordId: string }
  | null {
  if (raw.length > 320 || !ID.test(clubId)) return null;
  const parts = raw.split(".");
  if (parts.length !== 5 || parts[0] !== TOKEN_VERSION || parts[1] !== clubId) return null;
  const [, , memberRecordId, rawWindow, proof] = parts;
  if (!ID.test(memberRecordId) || !/^\d{9,11}$/.test(rawWindow) || !SIGNATURE.test(proof))
    return null;
  const window = Number(rawWindow);
  const current = Math.floor(now / QR_PERIOD_MS);
  if (!Number.isSafeInteger(window) || (window !== current && window !== current - 1))
    return null;
  const expected = signature(clubId, memberRecordId, window, secret);
  const supplied = Buffer.from(proof, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
    return null;
  return { memberRecordId };
}

export const ATTENDANCE_QR_PERIOD_MS = QR_PERIOD_MS;
