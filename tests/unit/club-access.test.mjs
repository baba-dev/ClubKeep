import assert from "node:assert/strict";
import test from "node:test";
import {
  AccessDeniedError,
  requireActiveClubMembership,
  requireClubRole,
  requirePersonalOwner,
} from "../../src/lib/club-access.ts";

function fakeDb(records) {
  const calls = [];
  return {
    calls,
    db: {
      clubMembership: {
        async findUnique(query) {
          calls.push(query);
          const { clubId, userId } = query.where.clubId_userId;
          const record = records.find((x) => x.clubId === clubId && x.userId === userId);
          return record ? { id: record.id, role: record.role, status: record.status } : null;
        },
      },
    },
  };
}
const records = [
  { id: "membership-a", clubId: "club-a", userId: "person-1", role: "OWNER", status: "ACTIVE" },
  { id: "membership-b", clubId: "club-b", userId: "person-1", role: "MEMBER", status: "ACTIVE" },
  { id: "membership-c", clubId: "club-c", userId: "person-2", role: "STAFF", status: "SUSPENDED" },
  { id: "membership-d", clubId: "club-d", userId: "person-2", role: "OWNER", status: "LEFT" },
];

test("rejects absent identity before database access", async () => {
  const client = fakeDb(records);
  await assert.rejects(
    () => requireActiveClubMembership(client.db, "", "club-a"),
    AccessDeniedError
  );
  await assert.rejects(
    () => requireActiveClubMembership(client.db, null, "club-a"),
    AccessDeniedError
  );
  await assert.rejects(
    () => requireActiveClubMembership(client.db, "person-1", ""),
    AccessDeniedError
  );
  assert.equal(client.calls.length, 0);
});

test("same global user has different roles in independent clubs", async () => {
  const client = fakeDb(records);
  const a = await requireActiveClubMembership(client.db, "person-1", "club-a");
  const b = await requireActiveClubMembership(client.db, "person-1", "club-b");
  assert.equal(a.role, "OWNER");
  assert.equal(b.role, "MEMBER");
  assert.equal(a.clubId, "club-a");
  assert.equal(b.clubId, "club-b");
  assert.deepEqual(client.calls[0].where.clubId_userId, { clubId: "club-a", userId: "person-1" });
});

test("cannot use ownership of Club A to access Club B", async () => {
  const client = fakeDb(records);
  await assert.rejects(
    () => requireClubRole(client.db, "person-1", "club-b", ["OWNER", "MANAGER"]),
    AccessDeniedError
  );
  await assert.rejects(
    () => requireActiveClubMembership(client.db, "person-2", "club-a"),
    AccessDeniedError
  );
});

test("suspended and left memberships cannot authorize reads", async () => {
  const client = fakeDb(records);
  await assert.rejects(
    () => requireActiveClubMembership(client.db, "person-2", "club-c"),
    AccessDeniedError
  );
  await assert.rejects(
    () => requireActiveClubMembership(client.db, "person-2", "club-d"),
    AccessDeniedError
  );
});

test("role permissions always default to deny, including empty allowlist", async () => {
  const client = fakeDb(records);
  await assert.rejects(
    () => requireClubRole(client.db, "person-1", "club-a", []),
    AccessDeniedError
  );
  await assert.rejects(
    () => requireClubRole(client.db, "person-1", "club-b", ["OWNER"]),
    AccessDeniedError
  );
  const owner = await requireClubRole(client.db, "person-1", "club-a", ["OWNER"]);
  assert.equal(owner.membershipId, "membership-a");
});

test("Personal ownership never inherits club staff/owner privileges", () => {
  assert.equal(requirePersonalOwner("person-1", "person-1"), "person-1");
  assert.throws(() => requirePersonalOwner("person-1", "person-2"), AccessDeniedError);
  assert.throws(() => requirePersonalOwner(null, "person-1"), AccessDeniedError);
});
