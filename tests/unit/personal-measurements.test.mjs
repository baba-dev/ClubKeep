import assert from "node:assert/strict";
import test from "node:test";
import {
  MEASUREMENT_KINDS,
  STORED_RANGE,
  canLogBodyMeasurements,
  displayUnit,
  fromStored,
  toStored,
} from "../../src/lib/personal/measurements.ts";

test("every kind has a range and a unit", () => {
  for (const k of MEASUREMENT_KINDS) {
    assert.ok(STORED_RANGE[k].min < STORED_RANGE[k].max);
    assert.ok(displayUnit(k, "METRIC").length > 0);
  }
});

test("metric and imperial entries are stored as integers", () => {
  assert.equal(toStored("WEIGHT", 72.5, "METRIC"), 72500);
  assert.equal(toStored("WEIGHT", 160, "IMPERIAL"), 72575);
  assert.equal(toStored("WAIST", 82, "METRIC"), 820);
  assert.equal(toStored("WAIST", 32, "IMPERIAL"), 813);
  assert.equal(toStored("BODY_FAT", 18.5, "METRIC"), 1850);
  for (const v of [toStored("WEIGHT", 160, "IMPERIAL"), toStored("WAIST", 32, "IMPERIAL")]) {
    assert.ok(Number.isInteger(v));
  }
});

test("implausible or non-numeric values are rejected", () => {
  assert.equal(toStored("WEIGHT", 720, "METRIC"), null);
  assert.equal(toStored("WAIST", 3, "METRIC"), null);
  assert.equal(toStored("BODY_FAT", 90, "METRIC"), null);
  assert.equal(toStored("CHEST", Number.NaN, "METRIC"), null);
  assert.equal(toStored("CHEST", -4, "METRIC"), null);
});

test("round trip stays within display precision", () => {
  assert.equal(fromStored("WEIGHT", 72500, "METRIC"), 72.5);
  assert.equal(fromStored("WAIST", 813, "IMPERIAL"), 32);
  assert.equal(fromStored("BODY_FAT", 1850, "METRIC"), 18.5);
});

test("measurements require a known birth year and a clear adult", () => {
  const now = new Date("2026-11-18T00:00:00Z");
  assert.equal(canLogBodyMeasurements(null, now), false);
  assert.equal(canLogBodyMeasurements(2010, now), false);
  assert.equal(canLogBodyMeasurements(2008, now), false);
  assert.equal(canLogBodyMeasurements(2007, now), true);
  assert.equal(canLogBodyMeasurements(1990, now), true);
});
