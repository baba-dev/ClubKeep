import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuthConfig } from "../../src/lib/auth-config.ts";

const base = {
  NODE_ENV: "test",
  BETTER_AUTH_URL: "https://clubkeep.example.test",
  NEXT_PUBLIC_APP_URL: "https://clubkeep.example.test",
};

test("disabled providers expose only existing password sign-in", () => {
  const result = resolveAuthConfig(base);
  assert.deepEqual(result.features, {
    google: false,
    emailLink: false,
    passkey: false,
    legacyPassword: true,
  });
  assert.equal(result.google, undefined);
  assert.equal(result.smtp, undefined);
  assert.equal(result.webauthn, undefined);
});

test("Google requires both credentials and isolated Redis", () => {
  assert.throws(
    () => resolveAuthConfig({ ...base, GOOGLE_AUTH_ENABLED: "true" }),
    /GOOGLE_CLIENT_ID/
  );
  const google = {
    ...base,
    GOOGLE_AUTH_ENABLED: "true",
    GOOGLE_CLIENT_ID: "test",
    GOOGLE_CLIENT_SECRET: "secret",
  };
  assert.throws(() => resolveAuthConfig(google), /AUTH_RATE_LIMIT_REDIS_URL/);
  assert.equal(
    resolveAuthConfig({ ...google, AUTH_RATE_LIMIT_REDIS_URL: "redis://127.0.0.1:6399" }).features
      .google,
    true
  );
});

test("invalid feature flag and URL fail closed without exposing values", () => {
  assert.throws(
    () => resolveAuthConfig({ ...base, GOOGLE_AUTH_ENABLED: "maybe" }),
    /GOOGLE_AUTH_ENABLED/
  );
  assert.throws(
    () =>
      resolveAuthConfig({ ...base, BETTER_AUTH_URL: "https://user:secret@clubkeep.example.test" }),
    (err) => !err.message.includes("secret")
  );
  assert.throws(
    () =>
      resolveAuthConfig({
        ...base,
        NODE_ENV: "production",
        BETTER_AUTH_URL: "http://localhost:3000",
      }),
    /HTTPS/
  );
  assert.throws(
    () => resolveAuthConfig({ ...base, NEXT_PUBLIC_APP_URL: "https://evil.example.test" }),
    /identical origins/
  );
});

test("Mail-in-a-Box cannot silently fall back to insecure SMTP", () => {
  const active = {
    ...base,
    EMAIL_LINK_AUTH_ENABLED: "true",
    EMAIL_PROVIDER: "smtp",
    SMTP_HOST: "mx.bababuilds.com",
    SMTP_PORT: "587",
    SMTP_SECURE: "false",
    SMTP_REQUIRE_TLS: "true",
    SMTP_USER: "clubkeep@example.test",
    SMTP_PASSWORD: "a-nonproduction-fixture",
    EMAIL_FROM: "clubkeep@example.test",
    AUTH_RATE_LIMIT_REDIS_URL: "redis://127.0.0.1:6399",
  };
  assert.equal(resolveAuthConfig(active).smtp?.host, "mx.bababuilds.com");
  assert.throws(() => resolveAuthConfig({ ...active, SMTP_REQUIRE_TLS: "false" }), /STARTTLS/);
  assert.throws(() => resolveAuthConfig({ ...active, SMTP_HOST: "smtp.other.test" }), /STARTTLS/);
  assert.throws(() => resolveAuthConfig({ ...active, SMTP_PASSWORD: undefined }), /SMTP_PASSWORD/);
});

test("passkey origin must match the current deployment", () => {
  const common = {
    ...base,
    PASSKEY_AUTH_ENABLED: "true",
    PASSKEY_RP_ID: "clubkeep.example.test",
    PASSKEY_EXPECTED_ORIGIN: "https://clubkeep.example.test",
    AUTH_RATE_LIMIT_REDIS_URL: "redis://127.0.0.1:6399",
  };
  assert.equal(resolveAuthConfig(common).webauthn?.rpID, "clubkeep.example.test");
  assert.throws(
    () => resolveAuthConfig({ ...common, PASSKEY_EXPECTED_ORIGIN: "https://evil.test" }),
    /mismatch/
  );
  assert.throws(() => resolveAuthConfig({ ...common, PASSKEY_RP_ID: "evil.test" }), /mismatch/);
});

test("production rejects MenuMinute auth Redis and absent Nginx header contract", () => {
  const prod = {
    ...base,
    NODE_ENV: "production",
    GOOGLE_AUTH_ENABLED: "true",
    GOOGLE_CLIENT_ID: "client",
    GOOGLE_CLIENT_SECRET: "secret",
    AUTH_RATE_LIMIT_REDIS_URL: "redis://127.0.0.1:6381",
  };
  assert.throws(() => resolveAuthConfig(prod), /MenuMinute/);
  assert.throws(
    () => resolveAuthConfig({ ...prod, AUTH_RATE_LIMIT_REDIS_URL: "redis://127.0.0.1:6399" }),
    /AUTH_TRUSTED_IP_HEADER/
  );
});
