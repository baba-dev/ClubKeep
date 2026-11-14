import { z } from "zod";

type Env = Record<string, string | undefined>;

export type AuthFeatures = Readonly<{
  google: boolean;
  emailLink: boolean;
  passkey: boolean;
  legacyPassword: boolean;
}>;

export type AuthFeatureConfig = Readonly<{
  features: AuthFeatures;
  origin: string;
  google?: { clientId: string; clientSecret: string };
  smtp?: { host: "mx.bababuilds.com"; port: 587; user: string; password: string; from: string };
  webauthn?: { rpID: string; origin: string };
  rateLimitRedisUrl?: string;
  trustedIpHeader?: string;
}>;

function flag(env: Env, key: string): boolean {
  const raw = env[key];
  if (raw == null || raw.trim() === "" || raw === "false") return false;
  if (raw === "true") return true;
  throw new Error("Invalid boolean auth feature flag: " + key);
}

function requireValue(env: Env, key: string): string {
  const v = env[key]?.trim();
  if (!v) throw new Error("Missing required auth configuration: " + key);
  return v;
}

function exactOrigin(value: string, key: string, production: boolean): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid URL in auth configuration: " + key);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid origin in auth configuration: " + key);
  }
  if (production && url.protocol !== "https:") {
    throw new Error("Production origin must use HTTPS: " + key);
  }
  if (
    !production &&
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  ) {
    throw new Error("Plain HTTP is allowed only on localhost: " + key);
  }
  return url;
}

export function resolveAuthConfig(env: Env = process.env): AuthFeatureConfig {
  const production = env.NODE_ENV === "production";
  const baseURL = requireValue(env, "BETTER_AUTH_URL");
  const origin = exactOrigin(baseURL, "BETTER_AUTH_URL", production);
  if (env.NEXT_PUBLIC_APP_URL) {
    const frontend = exactOrigin(env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL", production);
    if (frontend.origin !== origin.origin) {
      throw new Error("BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL must have identical origins");
    }
  } else if (production) {
    throw new Error("Production requires NEXT_PUBLIC_APP_URL");
  }

  const features: AuthFeatures = {
    google: flag(env, "GOOGLE_AUTH_ENABLED"),
    emailLink: flag(env, "EMAIL_LINK_AUTH_ENABLED"),
    passkey: flag(env, "PASSKEY_AUTH_ENABLED"),
    legacyPassword: true,
  };

  const result: {
    features: AuthFeatures;
    origin: string;
    google?: AuthFeatureConfig["google"];
    smtp?: AuthFeatureConfig["smtp"];
    webauthn?: AuthFeatureConfig["webauthn"];
    rateLimitRedisUrl?: string;
    trustedIpHeader?: string;
  } = { features, origin: origin.origin };

  if (features.google) {
    result.google = {
      clientId: requireValue(env, "GOOGLE_CLIENT_ID"),
      clientSecret: requireValue(env, "GOOGLE_CLIENT_SECRET"),
    };
  }

  if (features.emailLink) {
    if (
      requireValue(env, "EMAIL_PROVIDER") !== "smtp" ||
      requireValue(env, "SMTP_HOST") !== "mx.bababuilds.com" ||
      requireValue(env, "SMTP_PORT") !== "587" ||
      requireValue(env, "SMTP_SECURE") !== "false" ||
      requireValue(env, "SMTP_REQUIRE_TLS") !== "true"
    ) {
      throw new Error("Mail-in-a-Box requires port 587 with mandatory STARTTLS");
    }
    const from = requireValue(env, "EMAIL_FROM");
    const user = requireValue(env, "SMTP_USER");
    if (!z.email().safeParse(from).success || !z.email().safeParse(user).success) {
      throw new Error("Email sender and SMTP username must be valid mailbox addresses");
    }
    result.smtp = {
      host: "mx.bababuilds.com",
      port: 587,
      user,
      password: requireValue(env, "SMTP_PASSWORD"),
      from,
    };
  }

  if (features.passkey) {
    const rpID = requireValue(env, "PASSKEY_RP_ID");
    const rpOrigin = exactOrigin(
      requireValue(env, "PASSKEY_EXPECTED_ORIGIN"),
      "PASSKEY_EXPECTED_ORIGIN",
      production
    );
    if (
      rpOrigin.origin !== origin.origin ||
      (rpOrigin.hostname !== rpID && !rpOrigin.hostname.endsWith("." + rpID))
    ) {
      throw new Error("Passkey relying party and application origin mismatch");
    }
    result.webauthn = { rpID, origin: rpOrigin.origin };
  }

  // Club mutations require the same isolated, fail-closed security limiter as
  // modern authentication *even when all optional sign-in providers are off*.
  // Existing password-only production installs already have a ClubKeep-owned
  // REDIS_URL; use it only if no explicit auth limiter URL was configured.
  const providerEnabled = features.google || features.emailLink || features.passkey;
  const redis =
    env.AUTH_RATE_LIMIT_REDIS_URL?.trim() ||
    (!providerEnabled ? env.REDIS_URL?.trim() : undefined);
  if (providerEnabled && !env.AUTH_RATE_LIMIT_REDIS_URL?.trim()) {
    throw new Error("Missing required auth configuration: AUTH_RATE_LIMIT_REDIS_URL");
  }
  if (redis) {
    // Security state must never use MenuMinute's independently-owned Redis.

    let url: URL;
    try {
      url = new URL(redis);
    } catch {
      throw new Error("Invalid AUTH_RATE_LIMIT_REDIS_URL");
    }
    if (!["redis:", "rediss:"].includes(url.protocol) || !url.hostname) {
      throw new Error("Invalid AUTH_RATE_LIMIT_REDIS_URL");
    }
    result.rateLimitRedisUrl = redis;
    if (
      production &&
      ["127.0.0.1:6381", "127.0.0.1:6382", "localhost:6381", "localhost:6382"].includes(url.host)
    ) {
      throw new Error("ClubKeep auth must not use MenuMinute Redis instances");
    }
    const ipHeader = env.AUTH_TRUSTED_IP_HEADER?.toLowerCase();
    if (production && providerEnabled && !ipHeader)
      throw new Error("Missing AUTH_TRUSTED_IP_HEADER for trusted Nginx proxy");
    if (ipHeader && !["x-clubkeep-client-ip", "cf-connecting-ip"].includes(ipHeader)) {
      throw new Error("Unsupported trusted IP header");
    }
    result.trustedIpHeader = ipHeader;
  }

  return result;
}

/** Safe for public UI, never includes secrets or credentials. */
export function publicAuthFeatures(env: Env = process.env): AuthFeatures {
  return resolveAuthConfig(env).features;
}
