import assert from "node:assert/strict";
import test from "node:test";
import { maySendLoginLink } from "../../src/lib/magic-link-policy.ts";

function fake(emailUser, passwordAccount) {
  const calls = [];
  return {
    calls,
    db: {
      user: {
        findUnique: async (q) => {
          calls.push(q);
          return emailUser;
        },
      },
      account: {
        findFirst: async (q) => {
          calls.push(q);
          return passwordAccount;
        },
      },
    },
  };
}
test("new email identities can receive a verified mailbox link", async () => {
  const f = fake(null, null);
  assert.equal(await maySendLoginLink(f.db, "new@example.test"), true);
  assert.equal(f.calls.length, 1);
});
test("verified legacy users can receive a link without losing trusted password state", async () => {
  const f = fake({ id: "user-1", emailVerified: true }, { id: "password-1" });
  assert.equal(await maySendLoginLink(f.db, "verified@example.test"), true);
  assert.equal(f.calls.length, 1);
});
test("unverified password users keep their old credential until a safe migration", async () => {
  const f = fake({ id: "user-2", emailVerified: false }, { id: "password-2" });
  assert.equal(await maySendLoginLink(f.db, "legacy@example.test"), false);
  assert.deepEqual(f.calls[1].where, { userId: "user-2", providerId: "credential" });
});
test("unverified accounts with no passwords remain eligible for verification", async () => {
  const f = fake({ id: "user-3", emailVerified: false }, null);
  assert.equal(await maySendLoginLink(f.db, "email@example.test"), true);
});
