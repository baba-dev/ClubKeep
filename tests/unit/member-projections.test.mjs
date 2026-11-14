import test from "node:test";
import assert from "node:assert/strict";
import { memberAttendancePage, memberPaymentPage, memberReceipt } from "../../src/lib/member-projections.ts";

function fake(model) {
  const calls = [];
  const client = {
    clubAttendance: { findMany: async (q) => { calls.push(q); return []; } },
    clubPayment: {
      findMany: async (q) => { calls.push(q); return []; },
      findFirst: async (q) => { calls.push(q); return null; },
    },
  };
  return { client, calls };
}

test("Member pages always constrain by club and linked roster, with bounded pagination", async () => {
  const { client, calls } = fake();
  await memberAttendancePage(client, "club-a", "roster-a", "visit-a");
  await memberPaymentPage(client, "club-b", "roster-b", "payment-b");
  assert.deepEqual(calls[0].where, { clubId: "club-a", memberRecordId: "roster-a" });
  assert.deepEqual(calls[1].where, { clubId: "club-b", memberRecordId: "roster-b" });
  assert.equal(calls[0].take, 21);
  assert.equal(calls[1].take, 21);
  assert.equal(calls[0].skip, 1);
  assert.deepEqual(calls[0].cursor, { id: "visit-a" });
  for (const c of calls) assert.equal(c.select.note, undefined);
});

test("Receipt lookup is scoped to exact club/roster/payment and excludes staff-only fields", async () => {
  const { client, calls } = fake();
  await memberReceipt(client, "club-a", "roster-a", "receipt-a");
  assert.deepEqual(calls[0].where, { clubId: "club-a", memberRecordId: "roster-a", id: "receipt-a" });
  for (const key of ["note", "externalReference", "recorder", "recordedByUserId", "actor", "reason"]) {
    assert.equal(calls[0].select[key], undefined);
  }
});
