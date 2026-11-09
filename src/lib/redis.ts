import Redis from "ioredis";
import { requireRedisUrl } from "@/lib/server-env";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  // This must reference a dedicated ClubKeep Redis security domain, never
  // MenuMinute's queue/cache; see docs/BAREMETAL_DEPLOYMENT.md.
  const client = new Redis(requireRedisUrl(), {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      return Math.min(times * 100, 2000);
    },
    lazyConnect: true,
  });

  client.on("error", () => {
    if (process.env.NODE_ENV === "development") {
      // Don't log Redis connection strings, usernames or credentials.
      console.warn("[Redis] Unable to connect; check local Redis configuration.");
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export default redis;
