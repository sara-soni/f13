import { Redis } from "ioredis";
import { env } from "./env.js";

let redisConnected = false;

export const redisClient = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  retryStrategy(times) {
    // Exponential backoff with a cap of 3 seconds
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redisClient.on("connect", () => {
  redisConnected = true;
});

redisClient.on("ready", () => {
  redisConnected = true;
});

redisClient.on("error", (err) => {
  redisConnected = false;
  if (env.NODE_ENV !== "test") {
    console.warn("[Redis Warning] Connection error:", err.message);
  }
});

redisClient.on("close", () => {
  redisConnected = false;
});

export function isRedisHealthy(): boolean {
  return redisConnected && redisClient.status === "ready";
}

export async function initRedis(): Promise<void> {
  try {
    await redisClient.connect();
    redisConnected = true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Redis Notice] Could not connect to Redis at ${env.REDIS_URL} (${msg}). Running in resilient DB-fallback mode.`);
    redisConnected = false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient.status !== "end") {
    await redisClient.quit();
  }
}
