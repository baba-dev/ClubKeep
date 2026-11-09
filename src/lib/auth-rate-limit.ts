import { createHmac } from "node:crypto";
import Redis from "ioredis";
import type { AuthFeatureConfig } from "@/lib/auth-config";

const ATOMIC_LIMIT = `
local count=redis.call('INCR',KEYS[1])
if count == 1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end
local ttl=redis.call('TTL',KEYS[1])
return {count, ttl}
`;

export type LimitDecision = { allowed: boolean; retryAfter: number | null };

/**
 * All security counters are keyed HMAC digests, not email addresses, raw IPs
 * or bearer tokens. An isolated Redis instance must use noeviction.
 */
export function keyedCounter(secret: string, scope: string, value: string): string {
  const digest = createHmac("sha256", secret).update(scope).update(":").update(value).digest("hex");
  return "clubkeep:auth:" + scope + ":" + digest;
}

export function createAuthRateLimiter(redisUrl: string, secret: string) {
  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 2500,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
  });

  // Prevent ioredis from logging connection details; consume() still fails closed.
  redis.on("error", () => {});

  // Concurrent first requests must await the SAME connection handshake.
  // enableOfflineQueue=false still guarantees failure on outage.
  let connectionPromise: Promise<void> | undefined;
  async function ensureReady(): Promise<void> {
    if (redis.status === "ready") return;
    if (!connectionPromise) {
      connectionPromise = redis.connect().finally(() => {
        connectionPromise = undefined;
      });
    }
    await connectionPromise;
  }

  async function consume(
    scope: string,
    key: string,
    window: number,
    max: number
  ): Promise<LimitDecision> {
    const period = Math.max(1, Math.ceil(window));
    const ceiling = Math.max(1, Math.floor(max));
    try {
      await ensureReady();
      const response = await redis.eval(
        ATOMIC_LIMIT,
        1,
        keyedCounter(secret, scope, key),
        period.toString()
      );
      if (!Array.isArray(response) || response.length !== 2)
        throw new Error("Invalid limiter response");
      const count = Number(response[0]);
      const ttl = Number(response[1]);
      if (!Number.isFinite(count) || !Number.isFinite(ttl)) throw new Error("Invalid counter");
      return { allowed: count <= ceiling, retryAfter: count <= ceiling ? null : Math.max(1, ttl) };
    } catch {
      // If the security store is unavailable, never fall back to memory or
      // allow requests that bypass a distributed security boundary.
      return { allowed: false, retryAfter: period };
    }
  }
  return {
    consume,
    customStorage: {
      consume: async (key: string, rule: { window: number; max: number }) =>
        consume("better-auth", key, rule.window, rule.max),
    },
    close: () => redis.disconnect(),
  };
}

export function createConfiguredLimiter(config: AuthFeatureConfig, secret: string) {
  return config.rateLimitRedisUrl ? createAuthRateLimiter(config.rateLimitRedisUrl, secret) : null;
}
