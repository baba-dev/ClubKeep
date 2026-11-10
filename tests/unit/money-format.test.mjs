import assert from "node:assert/strict";
import test from "node:test";
import { currencyDigits, formatMinorMoney, parseMinorMoney } from "../../src/lib/money-format.ts";

test("money precision matches ISO currency rules", () => {
  assert.equal(currencyDigits("INR"), 2);
  assert.equal(currencyDigits("OMR"), 3);
  assert.equal(currencyDigits("JPY"), 0);
  assert.equal(parseMinorMoney("999.99", "INR"), 99999);
  assert.equal(parseMinorMoney("12.345", "OMR"), 12345);
  assert.equal(parseMinorMoney("1200", "JPY"), 1200);
  assert.equal(typeof formatMinorMoney(99999, "INR"), "string");
});
test("reject unsupported precision, negative, float drift and excessive prices", () => {
  for (const value of ["-1", "0.001", "10000000", "1e5", "oops", "1,000", "12.3456"])
    assert.equal(parseMinorMoney(value, "INR"), null);
});
