import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

// business-entitlements reads the billing policy through the "@/" alias.
register("../integration/helpers/src-alias-hook.mjs", import.meta.url);
const { MEMBER_LIMITS } = await import("../../src/lib/business-entitlements.ts");
test("approved Business member caps remain distinct from unapproved usage quotas", () => {
  assert.deepEqual(MEMBER_LIMITS, { FREE: 25, STARTER: 75, GROWTH: 300, PRO: null });
});
