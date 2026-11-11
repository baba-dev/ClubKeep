import assert from "node:assert/strict";
import test from "node:test";
import { requirePlatformAdmin } from "../../src/lib/platform-access.ts";

test("platform operations require verified session user and database role", async () => {
  const makeDb = (platformRole, emailVerified) => ({
    user: {
      findUnique: async (query) => {
        assert.deepEqual(query.where, { id: "operator-id" });
        return { platformRole, emailVerified };
      },
    },
  });
  await assert.rejects(() => requirePlatformAdmin(makeDb("PLATFORM_ADMIN", true), null));
  await assert.rejects(() => requirePlatformAdmin(makeDb("USER", true), "operator-id"));
  await assert.rejects(() => requirePlatformAdmin(makeDb("PLATFORM_ADMIN", false), "operator-id"));
  assert.equal(
    await requirePlatformAdmin(makeDb("PLATFORM_ADMIN", true), "operator-id"),
    "operator-id"
  );
});
