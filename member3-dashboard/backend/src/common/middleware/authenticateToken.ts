import type { Request, Response, NextFunction } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { UnauthorizedError } from "../errors/AppError.js";
import type { AuthUser } from "../types/index.js";
import { env } from "../../config/env.js";
import { sessionService } from "../../modules/auth/session.service.js";

// Initialize Cognito Verifier if pool ID and client ID are configured
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

if (
  env.COGNITO_USER_POOL_ID &&
  env.COGNITO_CLIENT_ID &&
  !env.COGNITO_USER_POOL_ID.includes("example")
) {
  try {
    verifier = CognitoJwtVerifier.create({
      userPoolId: env.COGNITO_USER_POOL_ID,
      tokenUse: "access",
      clientId: env.COGNITO_CLIENT_ID,
    });
  } catch (err) {
    console.warn("Could not initialize Cognito JWT verifier:", err);
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

export async function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // 1. Primary path: Server-managed HttpOnly session cookie
  const sessionCookie = req.cookies?.leaveflow_session;
  if (sessionCookie) {
    const sessionUser = await sessionService.getSession(sessionCookie);
    if (sessionUser) {
      req.user = sessionUser;
      req.sessionId = sessionCookie;
      return next();
    }
  }

  // 2. Secondary path: Bearer token in Authorization header (for OpenAPI docs, curl, tests)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();

    if (token) {
      // Live AWS Cognito verification
      if (verifier) {
        try {
          const payload = await verifier.verify(token);
          req.user = {
            id: payload.sub,
            employeeId: (payload["custom:employee_id"] as string) || (payload.username ? String(payload.username) : "EMP001"),
            email: (payload.email as string) || `${String(payload.username || "employee")}@company.com`,
            name: (payload.name as string) || (payload.username ? String(payload.username) : "Employee"),
            roles: (payload["cognito:groups"] as string[]) || ["EMPLOYEE"],
            department: (payload["custom:department"] as string) || "Engineering",
          };
          return next();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Cognito token verification failed";
          return next(new UnauthorizedError(`Invalid Cognito session token: ${msg}`));
        }
      }

      // Development & Test verification path
      if (env.NODE_ENV !== "production") {
        if (token === "dev-token" || token.startsWith("session_") || token.startsWith("cognito_id_")) {
          const parts = token.split("_");
          let empId = "EMP001";
          try {
            if (parts.length >= 3) {
              const decoded = Buffer.from(parts[1], "base64").toString("utf8");
              if (decoded && decoded.trim()) {
                empId = decoded.trim();
              }
            }
          } catch {
            empId = "EMP001";
          }

          req.user = {
            id: `usr_${empId.toLowerCase()}`,
            employeeId: empId,
            name: empId === "EMP001" ? "Sarah Jenkins" : empId,
            email: `${empId.toLowerCase()}@company.com`,
            roles: ["EMPLOYEE"],
            department: "Engineering",
            designation: "Senior Frontend Engineer",
            joiningDate: "2022-03-15",
            manager: "Rajesh Kumar (Director of Engineering)",
          };
          return next();
        }
      }
    }
  }

  return next(new UnauthorizedError("Authentication required. Please sign in to continue."));
}
