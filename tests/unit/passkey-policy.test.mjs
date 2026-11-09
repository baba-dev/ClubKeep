import assert from "node:assert/strict";
import test from "node:test";
import { mayRemovePasskey } from "../../src/lib/passkey-policy.ts";
const now = 1_800_000_000_000;
function opts(overrides = {}) {
  return {
    passkeys: 1,
    providerIds: [],
    verifiedEmailRecovery: false,
    sessionCreatedAt: now - 20_000,
    now,
    ...overrides,
  };
}
test("a sole passkey cannot be deleted without independent recovery", () => {
  assert.equal(mayRemovePasskey(opts()), false);
});
test("a signed-in user with backup passkey can remove one credential", () => {
  assert.equal(mayRemovePasskey(opts({ passkeys: 2 })), true);
});
test("independently linked Google or existing password supports recovery", () => {
  assert.equal(mayRemovePasskey(opts({ providerIds: ["google"] })), true);
  assert.equal(mayRemovePasskey(opts({ providerIds: ["credential"] })), true);
  assert.equal(mayRemovePasskey(opts({ verifiedEmailRecovery: true })), true);
});
test("a session older than ten minutes needs step-up before passkey removal", () => {
  assert.equal(mayRemovePasskey(opts({ passkeys: 2, sessionCreatedAt: now - 720_000 })), false);
  assert.equal(mayRemovePasskey(opts({ passkeys: 2, sessionCreatedAt: now + 1000 })), false);
});
test("unknown passkey counts never authorize deletion", () => {
  assert.equal(mayRemovePasskey(opts({ passkeys: 0 })), false);
});
