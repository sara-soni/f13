import crypto from "node:crypto";
import { redisClient, isRedisHealthy } from "../../config/redis.js";
import { env } from "../../config/env.js";
import type { AuthUser } from "../../common/types/index.js";

const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const inMemorySessions = new Map<string, { user: AuthUser; expiresAt: number }>();

export class SessionService {
  private getSessionKey(sessionId: string): string {
    return `${env.REDIS_KEY_PREFIX}session:${sessionId}`;
  }

  async createSession(user: AuthUser): Promise<string> {
    const sessionId = crypto.randomBytes(32).toString("hex");

    if (isRedisHealthy()) {
      try {
        await redisClient.set(
          this.getSessionKey(sessionId),
          JSON.stringify(user),
          "EX",
          SESSION_TTL_SECONDS
        );
        return sessionId;
      } catch (err) {
        console.warn("[Session] Failed to store session in Redis, using in-memory store:", err);
      }
    }

    // In-memory fallback
    inMemorySessions.set(sessionId, {
      user,
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
    });
    return sessionId;
  }

  async getSession(sessionId: string): Promise<AuthUser | null> {
    if (!sessionId) return null;

    if (isRedisHealthy()) {
      try {
        const raw = await redisClient.get(this.getSessionKey(sessionId));
        if (raw) {
          return JSON.parse(raw) as AuthUser;
        }
      } catch (err) {
        console.warn("[Session] Failed to read session from Redis, checking in-memory:", err);
      }
    }

    // Check in-memory fallback
    const memoryRecord = inMemorySessions.get(sessionId);
    if (memoryRecord) {
      if (memoryRecord.expiresAt > Date.now()) {
        return memoryRecord.user;
      }
      inMemorySessions.delete(sessionId);
    }

    return null;
  }

  async destroySession(sessionId: string): Promise<void> {
    if (!sessionId) return;

    if (isRedisHealthy()) {
      try {
        await redisClient.del(this.getSessionKey(sessionId));
      } catch (err) {
        console.warn("[Session] Failed to delete session from Redis:", err);
      }
    }

    inMemorySessions.delete(sessionId);
  }
}

export const sessionService = new SessionService();
