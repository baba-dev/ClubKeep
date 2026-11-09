import assert from "node:assert/strict";
import test from "node:test";
import { getGoogleProvider, GOOGLE_ACCOUNT_LINK_POLICY } from "../../src/lib/oauth-policy.ts";

test("Google asks only for OpenID, profile and email, never Google People phone scope", () => {
  const f = {
    features: { google: true, emailLink: false, passkey: false, legacyPassword: true },
    origin: "https://clubkeep.example.test",
    google: { clientId: "fixture-client", clientSecret: "fixture-secret" },
  };
  const providers = getGoogleProvider(f);
  assert.deepEqual(providers.google.scope, ["openid", "email", "profile"]);
  assert.equal(providers.google.clientId, "fixture-client");
  assert.equal(JSON.stringify(providers).includes("phonenumbers"), false);
});
test("disabled Google provider has no OAuth credentials or endpoints", () => {
  const providers = getGoogleProvider({
    features: { google: false, emailLink: false, passkey: false, legacyPassword: true },
    origin: "https://clubkeep.example.test",
  });
  assert.deepEqual(providers, {});
});
test("identical emails never silently merge Google and password accounts", () => {
  assert.equal(GOOGLE_ACCOUNT_LINK_POLICY.disableImplicitLinking, true);
  assert.equal(GOOGLE_ACCOUNT_LINK_POLICY.allowDifferentEmails, false);
  assert.equal(GOOGLE_ACCOUNT_LINK_POLICY.allowUnlinkingAll, false);
});
