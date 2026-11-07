import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      // Exponential backoff with a cap of 2 seconds
      return Math.min(times * 100, 2000);
    },
    lazyConnect: true,
  });

  client.on("error", (err) => {
    // Prevent unhandled errors from crashing the dev server if Redis is offline
    if (process.env.NODE_ENV === "development") {
      console.warn("[Redis] Connection error:", err.message);
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export default redis;
