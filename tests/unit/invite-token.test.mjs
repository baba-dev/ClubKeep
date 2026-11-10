import assert from "node:assert/strict";
import test from "node:test";
import {
  INVITE_LIFETIME_MS,
  inviteTokenHash,
  invitationUrl,
  isInviteToken,
  newInviteToken,
} from "../../src/lib/invite-token.ts";

const secret = "synthetic-test-only-secret-with-enough-entropy-not-real";
test("256-bit invitation tokens are URL-safe, unique and never stored as plaintext", () => {
  const tokens = new Set(Array.from({ length: 100 }, newInviteToken));
  assert.equal(tokens.size, 100);
  for (const token of tokens) {
    assert.equal(isInviteToken(token), true);
    const hashed = inviteTokenHash(token, secret);
    assert.match(hashed, /^[a-f0-9]{64}$/);
    assert.notEqual(hashed, token);
    assert.equal(inviteTokenHash(token, secret), hashed);
    assert.notEqual(inviteTokenHash(token, secret + "rotated"), hashed);
  }
  assert.equal(INVITE_LIFETIME_MS, 604800000);
});
test("bearer remains in URL fragment, never the query/path", () => {
  const token = newInviteToken();
  const url = new URL(invitationUrl("https://clubkeep.example.invalid", token));
  assert.equal(url.pathname, "/join");
  assert.equal(url.search, "");
  assert.equal(url.hash, "#invite=" + token);
  assert.equal(url.href.split("#")[0], "https://clubkeep.example.invalid/join");
  assert.throws(() => invitationUrl("http://public.example.invalid", token));
});
test("rejects short, malformed and non-string tokens before hashing", () => {
  for (const value of ["", "a".repeat(42), "a".repeat(44), "a".repeat(42) + "/", null, 123]) {
    assert.equal(isInviteToken(value), false);
    if (typeof value === "string") assert.throws(() => inviteTokenHash(value, secret));
  }
  assert.throws(() => inviteTokenHash(newInviteToken(), "short"));
});
