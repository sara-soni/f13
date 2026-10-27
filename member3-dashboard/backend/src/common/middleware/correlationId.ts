import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers["x-correlation-id"];
  const correlationId = (Array.isArray(existingId) ? existingId[0] : existingId) || crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  next();
}

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
