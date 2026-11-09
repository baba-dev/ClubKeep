import assert from "node:assert/strict";
import test from "node:test";
import { validateConfirmPayload } from "../../src/lib/confirm-email-security.ts";

const origin = "https://clubkeep.example.test";
const token = "fixture-opaque-url-safe-token-0123456789";
const headers = (values = {}) =>
  new Headers({
    origin,
    "content-type": "application/json",
    "sec-fetch-site": "same-origin",
    ...values,
  });

test("same-origin JSON body contains a valid opaque confirmation token", () => {
  assert.equal(validateConfirmPayload(headers(), { token }, origin), token);
});
test("direct server API wrapper denies cross-origin or site-forged confirmation", () => {
  assert.equal(
    validateConfirmPayload(headers({ origin: "https://evil.test" }), { token }, origin),
    null
  );
  assert.equal(
    validateConfirmPayload(headers({ "sec-fetch-site": "cross-site" }), { token }, origin),
    null
  );
  assert.equal(validateConfirmPayload(headers({ origin: "" }), { token }, origin), null);
});
test("only JSON bearer tokens of expected shape are admitted", () => {
  assert.equal(
    validateConfirmPayload(headers({ "content-type": "text/plain" }), { token }, origin),
    null
  );
  assert.equal(validateConfirmPayload(headers(), { token: "<script>" }, origin), null);
  assert.equal(validateConfirmPayload(headers(), { token: 12345 }, origin), null);
  assert.equal(validateConfirmPayload(headers(), {}, origin), null);
});
