import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import Redis from "ioredis";

test("native PostgreSQL is accessible using isolated ClubKeep CI credentials", async () => {
  const connectionString = process.env.DATABASE_URL;
  assert.ok(connectionString, "DATABASE_URL must be set for integration checks");
  const pool = new pg.Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
    max: 1,
  });
  try {
    const result = await pool.query("SELECT current_database() AS db, 1 AS ok");
    assert.equal(result.rows[0].ok, 1);
    assert.equal(result.rows[0].db, "clubkeep_ci");
  } finally {
    await pool.end();
  }
});

test("native Redis responds without relying on MenuMinute instances", async () => {
  assert.ok(process.env.REDIS_URL, "REDIS_URL must be set for integration checks");
  const client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  try {
    await client.connect();
    assert.equal(await client.ping(), "PONG");
  } finally {
    client.disconnect();
  }
});
