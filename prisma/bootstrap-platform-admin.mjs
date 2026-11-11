#!/usr/bin/env node
// Offline, one-time production bootstrap. NOT an HTTP endpoint or public signup.
// The operator pipes a password through stdin; never put it in argv, env or GitHub.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { parseBootstrapArgs, readPasswordFromStdin } from "./bootstrap-admin-helpers.mjs";

const { Client } = pg;

export async function bootstrapAdmin({ connectionString, email, name, expectedDb, password }) {
  if (!connectionString) throw new Error("DATABASE_URL must be provided by the protected ClubKeep environment");
  const client = new Client({ connectionString, application_name: "clubkeep-admin-bootstrap" });
  let inTransaction = false;
  try {
    await client.connect();
    const { rows } = await client.query("SELECT current_database() AS name");
    if (rows[0]?.name !== expectedDb) {
      throw new Error("Wrong database selected; no account was created");
    }
    await client.query("BEGIN");
    inTransaction = true;
    // Serialize simultaneous bootstrap attempts, in addition to the user email constraint.
    await client.query("SELECT pg_advisory_xact_lock(639210311)");
    const existing = await client.query(
      'SELECT "id" FROM "user" WHERE lower("email") = $1 LIMIT 1',
      [email],
    );
    if (existing.rowCount) {
      throw new Error("Account already exists; bootstrap will not change its password or role");
    }
    const admins = await client.query(
      'SELECT 1 FROM "user" WHERE "platformRole" = $1 LIMIT 1',
      ["PLATFORM_ADMIN"],
    );
    if (admins.rowCount) {
      throw new Error("Platform admin already exists; refuse a second bootstrap");
    }

    // The pinned Better Auth implementation uses scrypt for credential accounts.
    const passwordHash = await hashPassword(password);
    const userId = randomUUID();
    const accountId = randomUUID();
    await client.query(
      'INSERT INTO "user" ("id", "name", "email", "emailVerified", "platformRole", "updatedAt") VALUES ($1, $2, $3, TRUE, $4, NOW())',
      [userId, name, email, "PLATFORM_ADMIN"],
    );
    await client.query(
      'INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
      [accountId, userId, "credential", userId, passwordHash],
    );
    await client.query(
      'INSERT INTO "PersonalProfile" ("userId", "updatedAt") VALUES ($1, NOW())',
      [userId],
    );
    await client.query("COMMIT");
    inTransaction = false;
    return { email, userId };
  } catch (error) {
    if (inTransaction) {
      try { await client.query("ROLLBACK"); } catch { /* Original failure wins. */ }
    }
    if (error?.code === "23505") {
      throw new Error("Identity conflict; no account was created");
    }
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  try {
    const options = parseBootstrapArgs(process.argv.slice(2));
    const password = await readPasswordFromStdin(process.stdin, process.stdin.isTTY);
    const result = await bootstrapAdmin({
      ...options,
      password,
      connectionString: process.env.DATABASE_URL,
    });
    console.log("Created ClubKeep platform administrator:", result.email);
    console.log("Sign in with the email address (username sign-in is not supported).");
  } catch (error) {
    // Avoid printing stack traces, SQL parameters, connection strings, or hashes.
    console.error("Bootstrap failed:", error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
