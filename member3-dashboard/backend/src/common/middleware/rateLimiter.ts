import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient, isRedisHealthy } from "../../config/redis.js";
import { env } from "../../config/env.js";
import type { Request, Response } from "express";

function createStore() {
  if (isRedisHealthy()) {
    try {
      return new RedisStore({
        // @ts-expect-error - ioredis client compatibility
        sendCommand: (...args: string[]) => redisClient.call(...args),
        prefix: `${env.REDIS_KEY_PREFIX}rl:`,
      });
    } catch {
      // Fallback to in-memory store
      return undefined;
    }
  }
  return undefined;
}

const standardErrorResponse = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Please retry after some time.",
    },
    correlationId: req.correlationId,
  });
};

export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_GENERAL,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  handler: standardErrorResponse,
  keyGenerator: (req) => {
    return req.user?.employeeId || req.ip || "unknown_client";
  },
});

export const submissionRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_SUBMISSIONS,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  handler: standardErrorResponse,
  keyGenerator: (req) => {
    return req.user?.employeeId ? `sub:${req.user.employeeId}` : (req.ip || "unknown_client");
  },
});
