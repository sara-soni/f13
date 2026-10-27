import { Router } from "express";
import { authenticateToken } from "../../common/middleware/authenticateToken.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";

export const employeeRouter = Router();

employeeRouter.get("/me", authenticateToken, (req, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authenticated user context not found.");
    }

    res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        employeeId: req.user.employeeId,
        name: req.user.name,
        email: req.user.email,
        department: req.user.department || "—",
        designation: req.user.designation || "—",
        manager: req.user.manager || "—",
        joiningDate: req.user.joiningDate || "—",
        roles: req.user.roles,
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
});
