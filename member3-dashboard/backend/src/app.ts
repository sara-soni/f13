import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { correlationIdMiddleware } from "./common/middleware/correlationId.js";
import { generalRateLimiter } from "./common/middleware/rateLimiter.js";
import { errorHandler } from "./common/middleware/errorHandler.js";
import { NotFoundError } from "./common/errors/AppError.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { employeeRouter } from "./modules/employees/employee.routes.js";
import { leaveConfigRouter } from "./modules/leave-config/leaveConfig.routes.js";
import { leaveBalanceRouter } from "./modules/leave-balances/leaveBalance.routes.js";
import { leaveRequestRouter } from "./modules/leave-requests/leaveRequest.routes.js";
import { createSwaggerRouter } from "./docs/swagger.js";

export function createApp(): Express {
  const app = express();

  // 1. Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // 2. Strict CORS configuration with credential support
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter((o) => o !== "*");
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-ID"],
      exposedHeaders: ["X-Correlation-ID"],
    })
  );

  // 3. Request parsing, cookies & limits
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  // 4. Traceability & Rate Limiting
  app.use(correlationIdMiddleware);
  app.use(generalRateLimiter);

  // 5. API Documentation
  app.use(`${env.API_PREFIX}/docs`, createSwaggerRouter());

  // 6. Routes
  app.use(`${env.API_PREFIX}/health`, healthRouter);
  app.use(`${env.API_PREFIX}/auth`, authRouter);
  app.use(`${env.API_PREFIX}/employee`, employeeRouter);
  app.use(`${env.API_PREFIX}/leave/config`, leaveConfigRouter);
  app.use(`${env.API_PREFIX}/leave/balances`, leaveBalanceRouter);
  app.use(`${env.API_PREFIX}/leave/requests`, leaveRequestRouter);

  // 7. 404 Handler for undefined API routes
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found.`));
  });

  // 8. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
