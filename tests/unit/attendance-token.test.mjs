import assert from "node:assert/strict";
import test from "node:test";
import {
  newAttendanceQr,
  verifyAttendanceQr,
  ATTENDANCE_QR_PERIOD_MS,
} from "../../src/lib/attendance-token.ts";

const key = "synthetic-unit-test-key-that-is-never-used-in-production";
const club = "cjn7r9xq00000testclub0001";
const otherClub = "cjn7r9xq00000testclub0002";
const member = "cjn7r9xq00000testmember01";

test("signed QR is bound to one tenant and linked roster member", () => {
  const now = Date.UTC(2026, 10, 11, 8, 4, 12);
  const { token, refreshAt } = newAttendanceQr(club, member, key, now);
  assert.deepEqual(verifyAttendanceQr(token, club, key, now), { memberRecordId: member });
  assert.ok(token.length < 154, "fits locally encoded version-7-L QR");
  assert.ok(refreshAt > now && refreshAt - now <= ATTENDANCE_QR_PERIOD_MS);
  assert.ok(!token.includes(key));
});

test("tampered, cross-club, future and stale QR signatures are invalid", () => {
  const now = Date.UTC(2026, 10, 11, 8, 4, 1);
  const token = newAttendanceQr(club, member, key, now).token;
  assert.equal(verifyAttendanceQr(token, otherClub, key, now), null);
  assert.equal(verifyAttendanceQr(token, club, key, now - ATTENDANCE_QR_PERIOD_MS), null);
  assert.equal(verifyAttendanceQr(token, club, key, now + ATTENDANCE_QR_PERIOD_MS * 2), null);
  assert.equal(verifyAttendanceQr(token.replace(member, otherClub), club, key, now), null);
  const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
  assert.equal(verifyAttendanceQr(tampered, club, key, now), null);
  assert.equal(verifyAttendanceQr("not-a-qr", club, key, now), null);
  assert.equal(verifyAttendanceQr("x".repeat(340), club, key, now), null);
  assert.deepEqual(verifyAttendanceQr(token, club, key, now + ATTENDANCE_QR_PERIOD_MS), {
    memberRecordId: member,
  });
});

test("short signing keys are rejected", () => {
  assert.throws(() => newAttendanceQr(club, member, "short"));
});
