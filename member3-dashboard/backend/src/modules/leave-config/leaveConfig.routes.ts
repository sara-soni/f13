import { Router } from "express";
import { leaveConfigRepository } from "./leaveConfig.repository.js";
import { authenticateToken } from "../../common/middleware/authenticateToken.js";

export const leaveConfigRouter = Router();

leaveConfigRouter.get("/", authenticateToken, async (req, res, next) => {
  try {
    const configs = await leaveConfigRepository.getAll();

    res.status(200).json({
      success: true,
      data: configs,
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
});
