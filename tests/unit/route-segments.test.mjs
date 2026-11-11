import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { assertConsistentRouteParams } from "../../infra/deploy/check-route-segments.mjs";

test("existing ClubKeep Next.js routes have no conflicting dynamic slug names", () => {
  assert.doesNotThrow(() => assertConsistentRouteParams(resolve("src/app")));
});

test("sibling dynamic route segments with different names are rejected", () => {
  const root = mkdtempSync(join(tmpdir(), "clubkeep-routes-"));
  try {
    const base = join(root, "api", "clubs", "[clubId]", "members");
    mkdirSync(join(base, "[memberId]", "archive"), { recursive: true });
    mkdirSync(join(base, "[membershipId]", "revoke"), { recursive: true });
    assert.throws(() => assertConsistentRouteParams(root), /Conflicting dynamic Next.js URL segments/);
    rmSync(join(base, "[membershipId]"), { recursive: true });
    mkdirSync(join(base, "[memberId]", "revoke"), { recursive: true });
    assert.doesNotThrow(() => assertConsistentRouteParams(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
