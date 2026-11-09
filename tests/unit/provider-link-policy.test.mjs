import assert from "node:assert/strict";
import test from "node:test";
import { isRecentProviderLinkSession } from "../../src/lib/provider-link-policy.ts";

const now = 1_800_000_000_000;
test("Google account linking requires a recent authenticated session", () => {
  assert.equal(isRecentProviderLinkSession(now - 30_000, now), true);
  assert.equal(isRecentProviderLinkSession(now - 600_001, now), false);
  assert.equal(isRecentProviderLinkSession(now + 100, now), false);
  assert.equal(isRecentProviderLinkSession(Number.NaN, now), false);
});
