import assert from "node:assert/strict";
import test from "node:test";
import { createAuthRateLimiter } from "../../src/lib/auth-rate-limit.ts";

test("atomic Redis limiter allows only three concurrent requests in one window", async () => {
  const url = process.env.REDIS_URL;
  assert.ok(url, "REDIS_URL required for native integration test");
  const limiter = createAuthRateLimiter(url, "synthetic-fixture-secret-" + process.pid);
  try {
    const key = "test-" + process.pid + "-" + Date.now();
    const results = await Promise.all(
      Array.from({ length: 20 }, () => limiter.consume("integration", key, 120, 3))
    );
    assert.equal(results.filter((x) => x.allowed).length, 3);
    assert.equal(results.filter((x) => !x.allowed).length, 17);
    assert.ok(results.every((x) => x.allowed || x.retryAfter >= 1));
  } finally {
    limiter.close();
  }
});
