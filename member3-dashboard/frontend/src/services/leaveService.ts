import type {
  EmployeeProfile,
  LeaveBalances,
  LeaveApplication,
  LeaveApplicationDraft,
  LeaveFilterOptions,
  LeaveTypeName,
} from "../types/leave";
import { request, type ApiResponseEnvelope } from "./apiClient";

/**
 * Calculates number of working days between two date strings (inclusive),
 * skipping Saturdays and Sundays.
 */
export function calculateWorkingDays(startDateStr: string, endDateStr: string): number {
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

/**
 * Maps frontend display name or key to backend DynamoDB leave type code.
 */
function normalizeLeaveTypeForBackend(type: string): string {
  const lower = type.trim().toLowerCase();
  if (lower.includes("annual") || lower.includes("earned")) return "ANNUAL";
  if (lower.includes("sick")) return "SICK";
  if (lower.includes("casual")) return "CASUAL";
  if (lower.includes("unpaid")) return "UNPAID";
  return type.toUpperCase();
}

/**
 * Maps backend leave type code to frontend display name.
 */
function mapBackendTypeToDisplayName(type: string): LeaveTypeName {
  const upper = type.toUpperCase();
  if (upper === "ANNUAL" || upper === "EARNED") return "Earned Leave";
  if (upper === "SICK") return "Sick Leave";
  if (upper === "CASUAL") return "Casual Leave";
  return "Unpaid Leave";
}

export async function fetchEmployeeProfile(): Promise<EmployeeProfile> {
  const res = await request<ApiResponseEnvelope<EmployeeProfile>>("/employee/me");
  return res.data;
}

export async function fetchLeaveBalances(): Promise<LeaveBalances> {
  const res = await request<ApiResponseEnvelope<LeaveBalances>>("/leave/balances");
  return res.data;
}

export async function fetchLeaveApplications(
  filters?: Partial<LeaveFilterOptions>
): Promise<LeaveApplication[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "All statuses") {
    params.set("status", filters.status.toUpperCase().replace(/\s+/g, "_"));
  }
  if (filters?.leaveType && filters.leaveType !== "All leave types") {
    params.set("leaveType", normalizeLeaveTypeForBackend(filters.leaveType));
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";
  const res = await request<ApiResponseEnvelope<Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status: LeaveApplication["status"];
    submittedAt: string;
    reviewStep: string;
  }>>>(`/leave/requests${queryString}`);

  let applications: LeaveApplication[] = res.data.map((item) => ({
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    leaveType: mapBackendTypeToDisplayName(item.leaveType),
    startDate: item.startDate,
    endDate: item.endDate,
    days: item.days,
    reason: item.reason,
    status: item.status,
    submittedAt: item.submittedAt,
    reviewStep: item.reviewStep,
  }));

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    applications = applications.filter(
      (a) =>
        a.reason.toLowerCase().includes(q) ||
        a.leaveType.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
    );
  }

  return applications;
}

export async function submitLeaveApplication(
  draft: LeaveApplicationDraft
): Promise<{ application: LeaveApplication; updatedBalances: LeaveBalances }> {
  // Required validations
  if (!draft.leaveType) {
    throw new Error("Please select a valid leave category.");
  }
  if (!draft.startDate) {
    throw new Error("Start date is required.");
  }
  if (!draft.endDate) {
    throw new Error("End date is required.");
  }
  if (!draft.reason.trim()) {
    throw new Error("Please provide a reason or description for your leave.");
  }

  const start = new Date(`${draft.startDate}T00:00:00`);
  const end = new Date(`${draft.endDate}T00:00:00`);

  if (end < start) {
    throw new Error("End date cannot be earlier than start date.");
  }

  const days = calculateWorkingDays(draft.startDate, draft.endDate);
  if (days <= 0) {
    throw new Error("The selected date range contains no working business days.");
  }

  const backendLeaveType = normalizeLeaveTypeForBackend(draft.leaveType);

  const res = await request<ApiResponseEnvelope<{
    id: string;
    employeeId: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status: LeaveApplication["status"];
    submittedAt: string;
    reviewStep: string;
  }>>("/leave/requests", {
    method: "POST",
    body: JSON.stringify({
      leaveType: backendLeaveType,
      startDate: draft.startDate,
      endDate: draft.endDate,
      reason: draft.reason,
      attachmentUrl: draft.attachmentUrl,
    }),
  });

  const updatedBalances = await fetchLeaveBalances();

  const application: LeaveApplication = {
    id: res.data.id,
    employeeId: res.data.employeeId,
    employeeName: res.data.employeeName,
    leaveType: mapBackendTypeToDisplayName(res.data.leaveType),
    startDate: res.data.startDate,
    endDate: res.data.endDate,
    days: res.data.days,
    reason: res.data.reason,
    status: res.data.status,
    submittedAt: res.data.submittedAt,
    reviewStep: res.data.reviewStep,
    attachmentUrl: draft.attachmentUrl,
  };

  return { application, updatedBalances };
}

export async function cancelLeaveApplication(
  leaveId: string
): Promise<{ cancelledId: string; updatedBalances: LeaveBalances }> {
  await request<ApiResponseEnvelope<{
    requestId: string;
    status: string;
  }>>(`/leave/requests/${leaveId}/cancel`, {
    method: "POST",
  });

  const updatedBalances = await fetchLeaveBalances();

  return {
    cancelledId: leaveId,
    updatedBalances,
  };
}
