import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { initRedis, closeRedis } from "./config/redis.js";

async function bootstrap() {
  // Initialize Redis cache connection
  try {
    await initRedis();
    console.info("[Server] Redis client initialized.");
  } catch (err) {
    console.warn("[Server] Redis init encountered an issue, proceeding in degraded mode:", err);
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.info(`[Server] LeaveFlow backend running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
    console.info(`[Server] Health check: http://localhost:${env.PORT}${env.API_PREFIX}/health/live`);
    console.info(`[Server] API Docs: http://localhost:${env.PORT}${env.API_PREFIX}/docs`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.info(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.info("[Server] HTTP server closed.");
      try {
        await closeRedis();
        console.info("[Server] Redis connection closed.");
      } catch (err) {
        console.error("[Server] Error closing Redis:", err);
      }
      process.exit(0);
    });

    // Force close if graceful termination hangs
    setTimeout(() => {
      console.error("[Server] Forceful shutdown initiated after timeout.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("[Server] Fatal error during server bootstrap:", err);
  process.exit(1);
});
