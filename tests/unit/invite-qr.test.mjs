import assert from "node:assert/strict";
import test from "node:test";
import { inviteQrMatrix } from "../../src/lib/invite-qr.ts";

test("offline invitation QR is a consistent Model 2 matrix with finder patterns", () => {
  const url = "https://clubkeep.bababuilds.com/join#invite=" + "1".repeat(43);
  const matrix = inviteQrMatrix(url);
  assert.equal(matrix.length, 45);
  assert.ok(matrix.every((row) => row.length === 45));
  assert.equal(matrix[0].slice(0, 7).every(Boolean), true);
  assert.equal(matrix[3][3], true);
  assert.equal(matrix[3][1], false);
  assert.equal(matrix[41][3], true);
  assert.deepEqual(inviteQrMatrix(url), matrix);
  assert.notDeepEqual(inviteQrMatrix(url.replace("1111", "1112")), matrix);
});
test("fixed version rejects over-capacity input instead of producing an invalid QR", () => {
  assert.throws(() => inviteQrMatrix("a".repeat(155)), /capacity/);
  assert.equal(inviteQrMatrix("a".repeat(154)).length, 45);
});
