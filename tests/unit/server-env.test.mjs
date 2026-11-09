import assert from "node:assert/strict";
import test from "node:test";
import {
  requireAuthConfig,
  requireDatabaseUrl,
  requireRedisUrl,
  validateOptionalIntegrations,
} from "../../src/lib/server-env.ts";

const db = "postgresql://clubkeep_app:safe-unique-pass@127.0.0.1:5432/clubkeep";
const redis = "redis://127.0.0.1:6379";

test("database URL is mandatory and never defaults to the MenuMinute database", () => {
  assert.throws(() => requireDatabaseUrl({}), /DATABASE_URL/);
  assert.throws(() => requireDatabaseUrl({ DATABASE_URL: "mysql://host/test" }), /DATABASE_URL/);
  assert.throws(() => requireDatabaseUrl({ DATABASE_URL: "postgresql://host" }), /DATABASE_URL/);
  assert.equal(requireDatabaseUrl({ DATABASE_URL: db }), db);
});

test("production refuses privileged or development database credentials", () => {
  assert.throws(
    () =>
      requireDatabaseUrl({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/clubkeep_dev",
      }),
    /DATABASE_URL/
  );
  assert.equal(requireDatabaseUrl({ NODE_ENV: "production", DATABASE_URL: db }), db);
});

test("Redis connection is required and protocol restricted", () => {
  assert.throws(() => requireRedisUrl({}), /REDIS_URL/);
  assert.throws(() => requireRedisUrl({ REDIS_URL: "https://example.com/" }), /REDIS_URL/);
  assert.equal(requireRedisUrl({ REDIS_URL: redis }), redis);
});

test("auth configuration must have a non-placeholder secret and public HTTPS origin", () => {
  assert.throws(() => requireAuthConfig({}), /BETTER_AUTH_SECRET/);
  assert.throws(
    () =>
      requireAuthConfig({ BETTER_AUTH_SECRET: "123", BETTER_AUTH_URL: "http://localhost:3000" }),
    /32 characters/
  );
  assert.throws(
    () =>
      requireAuthConfig({
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: "random-string-with-at-least-thirty-two-characters",
        BETTER_AUTH_URL: "http://example.org",
      }),
    /HTTPS/
  );
  assert.deepEqual(
    requireAuthConfig({
      NODE_ENV: "production",
      BETTER_AUTH_SECRET: "properly-randomized-value-no-template-pattern",
      BETTER_AUTH_URL: "https://clubkeep.example.com",
    }),
    {
      secret: "properly-randomized-value-no-template-pattern",
      baseURL: "https://clubkeep.example.com",
    }
  );
});

test("optional providers are not mandatory during a CI build", () => {
  assert.doesNotThrow(() => validateOptionalIntegrations({}));
  assert.throws(
    () => validateOptionalIntegrations({ GOOGLE_CLIENT_ID: "a-client" }),
    /GOOGLE_CLIENT_SECRET/
  );
});

test("owner SMTP is limited to Mail-in-a-Box with required STARTTLS", () => {
  const valid = {
    EMAIL_PROVIDER: "smtp",
    SMTP_HOST: "mx.bababuilds.com",
    SMTP_PORT: "587",
    SMTP_SECURE: "false",
    SMTP_REQUIRE_TLS: "true",
    SMTP_USER: "no-reply@example.com",
    SMTP_PASSWORD: "synthetic-only-test-credential",
    EMAIL_FROM: "no-reply@example.com",
  };
  assert.doesNotThrow(() => validateOptionalIntegrations(valid));
  assert.throws(
    () => validateOptionalIntegrations({ ...valid, SMTP_REQUIRE_TLS: "false" }),
    /STARTTLS/
  );
  assert.throws(
    () => validateOptionalIntegrations({ ...valid, SMTP_HOST: "other.example.com" }),
    /SMTP_HOST/
  );
  assert.throws(
    () => validateOptionalIntegrations({ ...valid, SMTP_PASSWORD: undefined }),
    /SMTP_PASSWORD/
  );
});

test("passkey origins must match the relying-party domain", () => {
  const passkey = {
    NODE_ENV: "production",
    PASSKEY_RP_ID: "clubkeep.example.com",
    PASSKEY_EXPECTED_ORIGIN: "https://clubkeep.example.com",
  };
  assert.doesNotThrow(() => validateOptionalIntegrations(passkey));
  assert.throws(
    () =>
      validateOptionalIntegrations({ ...passkey, PASSKEY_EXPECTED_ORIGIN: "https://evil.test" }),
    /Passkey origin/
  );
  assert.throws(
    () =>
      validateOptionalIntegrations({
        ...passkey,
        PASSKEY_EXPECTED_ORIGIN: "http://clubkeep.example.com",
      }),
    /HTTPS/
  );
});

test("validation errors never print supplied database or SMTP credentials", () => {
  const secret = "do-not-log-this-user-supplied-secret";
  assert.throws(
    () => requireDatabaseUrl({ DATABASE_URL: "postgresql://" + secret + ":s@/" }),
    (error) => {
      assert.equal(error.message.includes(secret), false);
      return true;
    }
  );
});
