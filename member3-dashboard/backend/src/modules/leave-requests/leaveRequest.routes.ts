import { Router } from "express";
import { z } from "zod";
import { leaveRequestService } from "./leaveRequest.service.js";
import { authenticateToken } from "../../common/middleware/authenticateToken.js";
import { submissionRateLimiter } from "../../common/middleware/rateLimiter.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";

export const leaveRequestRouter = Router();

const createRequestSchema = z.object({
  leaveType: z.string().min(1, "Leave type is required."),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format."),
  reason: z.string().min(5, "Reason must be at least 5 characters.").max(500, "Reason cannot exceed 500 characters."),
});

// GET /api/v1/leave/requests
leaveRequestRouter.get("/", authenticateToken, async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();

    const { status, leaveType, limit, cursor } = req.query;

    const result = await leaveRequestService.getEmployeeRequests(req.user.employeeId, {
      status: typeof status === "string" ? status : undefined,
      leaveType: typeof leaveType === "string" ? leaveType : undefined,
      limit: limit ? Number(limit) : undefined,
      cursor: typeof cursor === "string" ? cursor : undefined,
    });

    // Adapt to frontend DTO envelope
    const formatted = result.items.map((item) => ({
      id: item.request_id,
      employeeId: item.employee_id,
      employeeName: item.employee_name,
      leaveType: item.leave_type,
      startDate: item.start_date,
      endDate: item.end_date,
      days: item.days,
      reason: item.reason,
      status: item.status === "PENDING_MANAGER" ? "Pending Manager"
        : item.status === "PENDING_HR" ? "Pending HR"
        : item.status === "APPROVED" ? "Approved"
        : item.status === "REJECTED" ? "Rejected"
        : "Cancelled",
      submittedAt: item.created_at,
      reviewStep: item.review_step || "Under Review",
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      pagination: {
        limit: limit ? Number(limit) : 50,
        nextCursor: result.nextCursor,
        hasMore: Boolean(result.nextCursor),
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/leave/requests
leaveRequestRouter.post("/", authenticateToken, submissionRateLimiter, async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();

    const validated = createRequestSchema.parse(req.body);

    const created = await leaveRequestService.submitLeaveRequest({
      employeeId: req.user.employeeId,
      employeeName: req.user.name,
      leaveType: validated.leaveType,
      startDate: validated.startDate,
      endDate: validated.endDate,
      reason: validated.reason,
    });

    res.status(201).json({
      success: true,
      data: {
        id: created.request_id,
        employeeId: created.employee_id,
        employeeName: created.employee_name,
        leaveType: created.leave_type,
        startDate: created.start_date,
        endDate: created.end_date,
        days: created.days,
        reason: created.reason,
        status: created.status === "PENDING_MANAGER" ? "Pending Manager" : "Pending HR",
        submittedAt: created.created_at,
        reviewStep: created.review_step,
      },
      message: "Leave request submitted successfully.",
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/leave/requests/:requestId
leaveRequestRouter.get("/:requestId", authenticateToken, async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();

    const requestId = String(req.params.requestId);
    const item = await leaveRequestService.getRequestById(requestId, req.user.employeeId);

    res.status(200).json({
      success: true,
      data: {
        id: item.request_id,
        employeeId: item.employee_id,
        employeeName: item.employee_name,
        leaveType: item.leave_type,
        startDate: item.start_date,
        endDate: item.end_date,
        days: item.days,
        reason: item.reason,
        status: item.status,
        submittedAt: item.created_at,
        reviewStep: item.review_step,
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/leave/requests/:requestId/cancel
leaveRequestRouter.post("/:requestId/cancel", authenticateToken, async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();

    const requestId = String(req.params.requestId);
    await leaveRequestService.cancelLeaveRequest(requestId, req.user.employeeId);

    res.status(200).json({
      success: true,
      data: {
        requestId,
        status: "Cancelled",
      },
      message: "Leave application was successfully cancelled and balance restored.",
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
});
