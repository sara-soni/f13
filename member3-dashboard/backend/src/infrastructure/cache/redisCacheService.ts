import { redisClient, isRedisHealthy } from "../../config/redis.js";
import { env } from "../../config/env.js";

export class RedisCacheService {
  private formatKey(key: string): string {
    return `${env.REDIS_KEY_PREFIX}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!isRedisHealthy()) {
      return null;
    }

    try {
      const fullKey = this.formatKey(key);
      const raw = await redisClient.get(fullKey);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Cache Warning] Failed to read key "${key}": ${msg}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!isRedisHealthy()) {
      return;
    }

    try {
      const fullKey = this.formatKey(key);
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds ?? env.REDIS_CACHE_TTL_CONFIG_SECONDS;

      if (ttl > 0) {
        await redisClient.set(fullKey, serialized, "EX", ttl);
      } else {
        await redisClient.set(fullKey, serialized);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Cache Warning] Failed to set key "${key}": ${msg}`);
    }
  }

  async delete(key: string): Promise<void> {
    if (!isRedisHealthy()) {
      return;
    }

    try {
      const fullKey = this.formatKey(key);
      await redisClient.del(fullKey);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Cache Warning] Failed to delete key "${key}": ${msg}`);
    }
  }

  async deletePrefix(prefix: string): Promise<void> {
    if (!isRedisHealthy()) {
      return;
    }

    try {
      const pattern = `${this.formatKey(prefix)}*`;
      const stream = redisClient.scanStream({ match: pattern, count: 50 });

      stream.on("data", (keys: string[]) => {
        if (keys.length > 0) {
          const pipeline = redisClient.pipeline();
          keys.forEach((k) => pipeline.del(k));
          pipeline.exec();
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Cache Warning] Failed to delete prefix "${prefix}": ${msg}`);
    }
  }
}

export const cacheService = new RedisCacheService();
