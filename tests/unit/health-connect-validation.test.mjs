import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
register("../integration/helpers/src-alias-hook.mjs", import.meta.url);
const { healthBatchInput } = await import("../../src/lib/validations/health-connect-batch.ts");
const base = {
  requestId: "0a1f57e1-0e68-4a4a-823b-0e8110f6c866",
  grantedTypes: ["STEPS_DAILY"],
  deletions: [],
  records: [
    {
      recordType: "STEPS_DAILY",
      externalId: "2026-11-18",
      sourcePackage: "health-connect-aggregate",
      startedAt: "2026-11-18T00:00:00Z",
      endedAt: "2026-11-18T23:59:00Z",
      value: 4200,
    },
  ],
};
test("P1-C accepts only health fitness observations with explicit reported grants", () => {
  assert.equal(healthBatchInput.parse(base).records[0].value, 4200);
  assert.equal(
    healthBatchInput.safeParse({
      ...base,
      grantedTypes: [],
      records: base.records,
    }).success,
    false
  );
  assert.equal(
    healthBatchInput.safeParse({
      ...base,
      records: [{ ...base.records[0], diagnosis: "secret" }],
    }).success,
    false
  );
  assert.equal(
    healthBatchInput.safeParse({
      ...base,
      records: [{ ...base.records[0], recordType: "BLOOD_GLUCOSE" }],
    }).success,
    false
  );
  assert.equal(
    healthBatchInput.safeParse({
      ...base,
      records: [{ ...base.records[0], sourcePackage: "com.untrusted.steps" }],
    }).success,
    false
  );
});
test("rejects future times, duplicate provider IDs, oversized batches and invalid amounts", () => {
  assert.equal(
    healthBatchInput.safeParse({
      ...base,
      records: [base.records[0], base.records[0]],
    }).success,
    false
  );
  assert.equal(
    healthBatchInput.safeParse({
      ...base,
      records: Array.from({ length: 81 }, (_, i) => ({
        ...base.records[0],
        externalId: "2026-11-" + String((i % 30) + 1).padStart(2, "0"),
      })),
    }).success,
    false
  );
  assert.equal(
    healthBatchInput.safeParse({
      ...base,
      records: [
        { ...base.records[0], startedAt: "2027-01-01T00:00:00Z", endedAt: "2027-01-01T01:00:00Z" },
      ],
    }).success,
    false
  );
  assert.equal(
    healthBatchInput.safeParse({
      ...base,
      records: [{ ...base.records[0], value: -1 }],
    }).success,
    false
  );
});
test("a device may submit source tombstones but not silently add clinical data", () => {
  const value = healthBatchInput.safeParse({
    ...base,
    records: [],
    grantedTypes: [],
    deletions: [
      { recordType: "WORKOUT", externalId: "hc-unique-1", sourcePackage: "com.fitness.watch" },
    ],
  });
  assert.equal(value.success, true);
});
