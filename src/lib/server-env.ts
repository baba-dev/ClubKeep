import { z } from "zod";

export type EnvironmentSource = Record<string, string | undefined>;

const rawSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  EMAIL_PROVIDER: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_REQUIRE_TLS: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  PASSKEY_RP_ID: z.string().optional(),
  PASSKEY_EXPECTED_ORIGIN: z.string().optional(),
});

type ParsedEnvironment = z.infer<typeof rawSchema>;

function read(source: EnvironmentSource): ParsedEnvironment {
  const result = rawSchema.safeParse(source);
  if (!result.success) {
    // Report key names only. Never include values, URIs or secrets in config errors.
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error("Invalid server environment fields: " + fields);
  }
  return result.data;
}

function required(value: string | undefined, key: string): string {
  if (!value?.trim()) {
    throw new Error("Missing required server setting: " + key);
  }
  return value.trim();
}

function parsedUrl(value: string, key: string, protocols: string[]): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid URL for server setting: " + key);
  }
  if (!protocols.includes(url.protocol) || !url.hostname || url.hash) {
    throw new Error("Invalid URL for server setting: " + key);
  }
  return url;
}

export function requireDatabaseUrl(source: EnvironmentSource = process.env): string {
  const env = read(source);
  const value = required(env.DATABASE_URL, "DATABASE_URL");
  const url = parsedUrl(value, "DATABASE_URL", ["postgresql:", "postgres:"]);
  if (!url.pathname || url.pathname === "/") {
    throw new Error("DATABASE_URL must name a ClubKeep database");
  }
  if (env.NODE_ENV === "production") {
    const databaseName = decodeURIComponent(url.pathname.slice(1));
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    if (
      ["postgres", "template0", "template1", "clubkeep_dev"].includes(databaseName) ||
      user === "postgres" ||
      ["postgres", "password", "local-only-password", "change-me"].includes(password)
    ) {
      throw new Error("DATABASE_URL uses development or privileged credentials in production");
    }
  }
  return value;
}

export function requireRedisUrl(source: EnvironmentSource = process.env): string {
  const env = read(source);
  const value = required(env.REDIS_URL, "REDIS_URL");
  parsedUrl(value, "REDIS_URL", ["redis:", "rediss:"]);
  return value;
}

export function requireAuthConfig(source: EnvironmentSource = process.env): {
  secret: string;
  baseURL: string;
} {
  const env = read(source);
  const secret = required(env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET");
  if (secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }
  if (env.NODE_ENV === "production" && /change|local|example|development/i.test(secret)) {
    throw new Error("BETTER_AUTH_SECRET must be a production-specific secret");
  }
  const baseURL = required(env.BETTER_AUTH_URL, "BETTER_AUTH_URL");
  const url = parsedUrl(baseURL, "BETTER_AUTH_URL", ["http:", "https:"]);
  if (env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("Production BETTER_AUTH_URL must use HTTPS");
  }
  if (env.NEXT_PUBLIC_APP_URL) {
    const publicURL = parsedUrl(env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL", [
      "http:",
      "https:",
    ]);
    if (env.NODE_ENV === "production" && publicURL.protocol !== "https:") {
      throw new Error("Production NEXT_PUBLIC_APP_URL must use HTTPS");
    }
  }
  return { secret, baseURL };
}

/**
 * Only validate a future integration when it is explicitly configured.
 * Phase 0A prepares configuration; it does not activate OAuth, SMTP or passkeys.
 */
export function validateOptionalIntegrations(
  source: EnvironmentSource = process.env
): void {
  const env = read(source);
  if (env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_SECRET) {
    required(env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID");
    required(env.GOOGLE_CLIENT_SECRET, "GOOGLE_CLIENT_SECRET");
  }

  if (env.EMAIL_PROVIDER) {
    if (env.EMAIL_PROVIDER !== "smtp") {
      throw new Error("Only the owner-operated SMTP provider is approved");
    }
    if (env.SMTP_HOST !== "mx.bababuilds.com") {
      throw new Error("SMTP_HOST must use the approved Mail-in-a-Box host");
    }
    if (env.SMTP_PORT !== "587" || env.SMTP_SECURE !== "false" ||
      env.SMTP_REQUIRE_TLS !== "true") {
      throw new Error("SMTP must use port 587 with required STARTTLS");
    }
    required(env.SMTP_USER, "SMTP_USER");
    required(env.SMTP_PASSWORD, "SMTP_PASSWORD");
    const from = required(env.EMAIL_FROM, "EMAIL_FROM");
    if (!z.email().safeParse(from).success || !z.email().safeParse(env.SMTP_USER).success) {
      throw new Error("SMTP sender and username must be email addresses");
    }
  }

  if (env.PASSKEY_RP_ID || env.PASSKEY_EXPECTED_ORIGIN) {
    const rpId = required(env.PASSKEY_RP_ID, "PASSKEY_RP_ID");
    const origin = parsedUrl(
      required(env.PASSKEY_EXPECTED_ORIGIN, "PASSKEY_EXPECTED_ORIGIN"),
      "PASSKEY_EXPECTED_ORIGIN",
      ["http:", "https:"]
    );
    if (origin.hostname !== rpId && !origin.hostname.endsWith("." + rpId)) {
      throw new Error("Passkey origin does not match the relying-party domain");
    }
    if (env.NODE_ENV === "production" && origin.protocol !== "https:") {
      throw new Error("Production passkey origin must use HTTPS");
    }
  }
}
