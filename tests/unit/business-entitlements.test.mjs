import assert from "node:assert/strict";
import test from "node:test";
import { MEMBER_LIMITS } from "../../src/lib/business-entitlements.ts";
test("approved Business member caps remain distinct from unapproved usage quotas", () => {
  assert.deepEqual(MEMBER_LIMITS, { FREE: 25, STARTER: 75, GROWTH: 300, PRO: null });
});
