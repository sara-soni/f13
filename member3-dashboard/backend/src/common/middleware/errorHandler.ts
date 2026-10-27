import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";
import type { ApiErrorResponse } from "../types/index.js";
import { env } from "../../config/env.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = req.correlationId;

  // 1. Handled AppError instances
  if (err instanceof AppError) {
    const responsePayload: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      correlationId,
    };
    res.status(err.statusCode).json(responsePayload);
    return;
  }

  // 2. Zod Request Validation Errors
  if (err instanceof ZodError) {
    const details: Record<string, string> = {};
    err.errors.forEach((issue) => {
      const field = issue.path.join(".");
      details[field || "request"] = issue.message;
    });

    const responsePayload: ApiErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "The submitted request failed validation.",
        details,
      },
      correlationId,
    };
    res.status(422).json(responsePayload);
    return;
  }

  // 3. AWS DynamoDB ConditionalCheckFailedException
  if (
    typeof err === "object" &&
    err !== null &&
    ("name" in err || "__type" in err)
  ) {
    const errObj = err as { name?: string; __type?: string; message?: string };
    if (
      errObj.name === "ConditionalCheckFailedException" ||
      errObj.__type?.includes("ConditionalCheckFailedException")
    ) {
      const responsePayload: ApiErrorResponse = {
        success: false,
        error: {
          code: "CONFLICT_STATE",
          message: "The requested balance update or status transition conflicted with the current database state.",
        },
        correlationId,
      };
      res.status(409).json(responsePayload);
      return;
    }
  }

  // 4. Uncaught Internal Server Errors (sanitized for client security)
  if (env.NODE_ENV !== "test") {
    console.error(`[Unhandled Error] [CorrelationId: ${correlationId}]:`, err);
  }

  const responsePayload: ApiErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An internal server error occurred. Please contact system support.",
    },
    correlationId,
  };

  res.status(500).json(responsePayload);
}
