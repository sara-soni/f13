import { Router } from "express";
import { rawDynamoClient } from "../../config/dynamodb.js";
import { isRedisHealthy } from "../../config/redis.js";
import { ListTablesCommand } from "@aws-sdk/client-dynamodb";

export const healthRouter = Router();

healthRouter.get("/live", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/ready", async (_req, res) => {
  let dynamoReady = false;
  let redisReady = isRedisHealthy();

  try {
    // Lightweight check against DynamoDB
    await rawDynamoClient.send(new ListTablesCommand({ Limit: 1 }));
    dynamoReady = true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Health Check] DynamoDB check failed:", msg);
    dynamoReady = false;
  }

  const isReady = dynamoReady; // Redis is resilient cache; DynamoDB is critical source of truth
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status: isReady ? "ready" : "degraded",
    dependencies: {
      dynamodb: dynamoReady ? "connected" : "unreachable",
      redis: redisReady ? "connected" : "fallback_mode",
    },
    timestamp: new Date().toISOString(),
  });
});
