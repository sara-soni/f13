import { Router } from "express";
import { leaveBalanceRepository } from "./leaveBalance.repository.js";
import { authenticateToken } from "../../common/middleware/authenticateToken.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";

export const leaveBalanceRouter = Router();

leaveBalanceRouter.get("/", authenticateToken, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const year = Number(req.query.year) || new Date().getFullYear();
    const records = await leaveBalanceRepository.getBalancesByYear(req.user.employeeId, year);

    // Normalize into structured object for frontend
    const defaultItem = (type: string, name: string) => ({
      leaveType: name,
      available: 0,
      total: 0,
      used: 0,
      unit: "days" as const,
      description: "",
    });

    const responseMap: Record<string, unknown> = {
      sick: defaultItem("SICK", "Sick Leave"),
      casual: defaultItem("CASUAL", "Casual Leave"),
      earned: defaultItem("EARNED", "Earned Leave"),
      unpaid: {
        leaveType: "Unpaid Leave",
        available: null,
        total: null,
        used: 0,
        unit: "days" as const,
        description: "Subject to approval",
      },
    };

    records.forEach((rec) => {
      let typeKey = rec.leave_type.toLowerCase();
      if (typeKey === "annual") typeKey = "earned";

      if (responseMap[typeKey]) {
        responseMap[typeKey] = {
          leaveType: `${typeKey.charAt(0).toUpperCase() + typeKey.slice(1)} Leave`,
          available: rec.available,
          total: rec.allocated ?? rec.total ?? 0,
          used: rec.used,
          unit: rec.unit || "days",
          description: typeKey === "unpaid" ? "Subject to approval" : undefined,
        };
      }
    });

    res.status(200).json({
      success: true,
      data: responseMap,
      year,
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
});
