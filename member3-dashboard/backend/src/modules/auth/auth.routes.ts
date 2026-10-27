import { Router } from "express";
import { z } from "zod";
import { sessionService } from "./session.service.js";
import { authenticateToken } from "../../common/middleware/authenticateToken.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";
import type { AuthUser } from "../../common/types/index.js";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1, "Username or employee ID is required."),
  password: z.string().optional(),
});

// Seeded directory profiles for authenticating employees
const EMPLOYEE_DIRECTORY: Record<string, AuthUser> = {
  emp001: {
    id: "usr_emp001",
    employeeId: "EMP001",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@company.com",
    department: "Engineering",
    designation: "Senior Frontend Engineer",
    roles: ["EMPLOYEE"],
    joiningDate: "2022-03-15",
    manager: "Rajesh Kumar (Director of Engineering)",
  },
  emp002: {
    id: "usr_emp002",
    employeeId: "EMP002",
    name: "Michael Chen",
    email: "michael.chen@company.com",
    department: "Product",
    designation: "Lead Product Designer",
    roles: ["EMPLOYEE"],
    joiningDate: "2021-08-01",
    manager: "Priya Nair (VP Product)",
  },
};

// POST /api/v1/auth/login
authRouter.post("/login", async (req, res, next) => {
  try {
    const { username } = loginSchema.parse(req.body);
    const normalized = username.trim().toLowerCase();
    const empKey = normalized.includes("@") ? normalized.split("@")[0] : normalized;

    const matchedUser = EMPLOYEE_DIRECTORY[empKey] || {
      id: `usr_${empKey}`,
      employeeId: empKey.toUpperCase(),
      name: `${empKey.charAt(0).toUpperCase() + empKey.slice(1)} (Employee)`,
      email: normalized.includes("@") ? normalized : `${empKey}@company.com`,
      department: "Digital Platforms & Engineering",
      designation: "Software Engineer",
      roles: ["EMPLOYEE"],
      joiningDate: "2023-01-10",
      manager: "Rajesh Kumar (Director of Engineering)",
    };

    // Create server-side session in Redis
    const sessionId = await sessionService.createSession(matchedUser);

    // Set secure HttpOnly session cookie
    res.cookie("leaveflow_session", sessionId, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: {
        user: matchedUser,
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/session
authRouter.get("/session", authenticateToken, (req, res) => {
  if (!req.user) {
    throw new UnauthorizedError("No active session found.");
  }

  res.status(200).json({
    success: true,
    data: req.user,
    correlationId: req.correlationId,
  });
});

// POST /api/v1/auth/logout
authRouter.post("/logout", async (req, res, next) => {
  try {
    const sessionId = req.cookies?.leaveflow_session;
    if (sessionId) {
      await sessionService.destroySession(sessionId);
    }

    res.clearCookie("leaveflow_session", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(200).json({
      success: true,
      data: null,
      message: "Logged out successfully.",
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
});
