import assert from "node:assert/strict";
import test from "node:test";
import { keyedCounter, createAuthRateLimiter } from "../../src/lib/auth-rate-limit.ts";

test("counter names use HMACs, never plaintext email or phone", () => {
  const name = keyedCounter("synthetic-secret-with-length", "email-request", "member@example.test");
  assert.ok(name.startsWith("clubkeep:auth:email-request:"));
  assert.equal(name.includes("member@example.test"), false);
  assert.equal(
    keyedCounter("synthetic-secret-with-length", "email-request", "member@example.test"),
    name
  );
  assert.notEqual(
    keyedCounter("another-fixture-secret", "email-request", "member@example.test"),
    name
  );
});

test("unavailable Redis refuses authentication attempts, never allows a fallback", async () => {
  const limiter = createAuthRateLimiter("redis://127.0.0.1:1", "synthetic-test-secret");
  try {
    const result = await limiter.consume("email-request", "member@example.test", 900, 3);
    assert.deepEqual(result, { allowed: false, retryAfter: 900 });
  } finally {
    limiter.close();
  }
});
