import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_NAV,
  DEMO_VIEWS,
  DEMO_ROLES,
  initialDemo,
  demoRoute,
} from "../../src/lib/demo-fixtures.ts";

test("public demo routes are fixture-only and cover all shipped B1 through B6 modules", () => {
  assert.equal(DEMO_NAV.length, DEMO_VIEWS.length);
  assert.equal(new Set(DEMO_NAV.map((item) => item.key)).size, DEMO_VIEWS.length);
  for (const key of [
    "onboarding",
    "members",
    "plans",
    "attendance",
    "finance",
    "renewals",
    "competition",
    "leaderboard",
    "challenges",
    "member-card",
    "my-payments",
    "my-sessions",
    "admin-directory",
  ])
    assert.ok(DEMO_VIEWS.includes(key), key);
  assert.deepEqual(DEMO_ROLES, ["owner", "manager", "staff", "member", "admin"]);
  assert.equal(demoRoute("member", "leaderboard"), "/demo?role=member&view=leaderboard");
  assert.equal(initialDemo.members[0].due, 600);
  assert.ok(initialDemo.payments.every((p) => !("email" in p) && !("phone" in p)));
});
