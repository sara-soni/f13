import {
  BadRequestError,
  NotFoundError,
  UnprocessableEntityError,
} from "../../common/errors/AppError.js";
import type {
  LeaveRequestItem,
  LeaveStatus,
} from "../../common/types/index.js";
import { leaveRequestRepository } from "./leaveRequest.repository.js";
import { leaveBalanceRepository } from "../leave-balances/leaveBalance.repository.js";
import { leaveConfigRepository } from "../leave-config/leaveConfig.repository.js";
import crypto from "crypto";

export function calculateBusinessDays(startDateStr: string, endDateStr: string): number {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export class LeaveRequestService {
  async getEmployeeRequests(
    employeeId: string,
    filters?: { status?: string; leaveType?: string; limit?: number; cursor?: string }
  ) {
    return leaveRequestRepository.getByEmployee(employeeId, filters);
  }

  async getRequestById(requestId: string, employeeId: string): Promise<LeaveRequestItem> {
    const item = await leaveRequestRepository.getById(requestId);
    if (!item || item.employee_id !== employeeId) {
      throw new NotFoundError(`Leave request with ID "${requestId}" was not found.`);
    }
    return item;
  }

  async submitLeaveRequest(params: {
    employeeId: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<LeaveRequestItem> {
    const { employeeId, employeeName, leaveType, startDate, endDate, reason } = params;

    // 1. Date Validation
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (end < start) {
      throw new UnprocessableEntityError("End date cannot precede start date.", {
        endDate: "End date must be greater than or equal to start date.",
      });
    }

    const days = calculateBusinessDays(startDate, endDate);
    if (days <= 0) {
      throw new UnprocessableEntityError("The selected date range contains no working business days (weekends only).", {
        startDate: "Select a range with at least one weekday.",
      });
    }

    const year = start.getFullYear();

    // 2. Normalize leave type
    let leaveTypeKey = "SICK";
    if (leaveType.toLowerCase().includes("casual")) leaveTypeKey = "CASUAL";
    else if (leaveType.toLowerCase().includes("earned")) leaveTypeKey = "EARNED";
    else if (leaveType.toLowerCase().includes("unpaid")) leaveTypeKey = "UNPAID";

    const isPaid = leaveTypeKey !== "UNPAID";

    // 3. Balance verification for paid leave
    if (isPaid) {
      const balances = await leaveBalanceRepository.getBalancesByYear(employeeId, year);
      const balanceRecord = balances.find((b) => b.leave_type.toUpperCase() === leaveTypeKey);

      if (!balanceRecord) {
        throw new BadRequestError(`No balance record found for ${leaveType} in year ${year}.`);
      }

      if (balanceRecord.available !== null && balanceRecord.available < days) {
        throw new UnprocessableEntityError(
          `Insufficient ${leaveType} balance. Requested: ${days} days, Available: ${balanceRecord.available} days.`,
          {
            days: `Requested ${days} days exceeds available quota of ${balanceRecord.available} days.`,
          }
        );
      }
    }

    // 4. Policy thresholds check
    const config = await leaveConfigRepository.getByType(leaveTypeKey);
    const threshold = config?.multi_step_review_threshold ?? 5;
    const initialStatus: LeaveStatus = days > threshold ? "PENDING_HR" : "PENDING_MANAGER";
    const initialStep = days > threshold ? "HR Escalated Review" : "Manager Review";

    const requestId = `LV-${year}-${crypto.randomUUID().substring(0, 7).toUpperCase()}`;
    const now = new Date().toISOString();

    const requestItem: LeaveRequestItem = {
      request_id: requestId,
      employee_id: employeeId,
      employee_name: employeeName,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days,
      reason: reason.trim(),
      status: initialStatus,
      review_step: initialStep,
      created_at: now,
      updated_at: now,
    };

    return leaveRequestRepository.createWithTransaction({
      request: requestItem,
      year,
      leaveTypeKey,
      isPaid,
    });
  }

  async cancelLeaveRequest(requestId: string, employeeId: string): Promise<void> {
    const request = await this.getRequestById(requestId, employeeId);

    if (request.status !== "PENDING_MANAGER" && request.status !== "PENDING_HR") {
      throw new BadRequestError(
        `Cannot cancel request with status "${request.status}". Only pending applications can be cancelled.`
      );
    }

    const year = new Date(`${request.start_date}T00:00:00`).getFullYear();

    let leaveTypeKey = "SICK";
    if (request.leave_type.toLowerCase().includes("casual")) leaveTypeKey = "CASUAL";
    else if (request.leave_type.toLowerCase().includes("earned")) leaveTypeKey = "EARNED";
    else if (request.leave_type.toLowerCase().includes("unpaid")) leaveTypeKey = "UNPAID";

    const isPaid = leaveTypeKey !== "UNPAID";

    await leaveRequestRepository.cancelWithTransaction({
      request,
      year,
      leaveTypeKey,
      isPaid,
      cancelledBy: employeeId,
    });
  }
}

export const leaveRequestService = new LeaveRequestService();
