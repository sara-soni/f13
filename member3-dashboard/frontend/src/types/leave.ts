export type LeaveTypeKey = "sick" | "casual" | "earned" | "unpaid";

export type LeaveTypeName =
  | "Sick Leave"
  | "Casual Leave"
  | "Earned Leave"
  | "Unpaid Leave";

export type LeaveStatus =
  | "Pending Manager"
  | "Pending HR"
  | "Approved"
  | "Rejected"
  | "Cancelled";

export interface EmployeeProfile {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  joiningDate: string;
  avatarUrl?: string;
  manager: string;
}

export interface LeaveBalanceItem {
  leaveType: LeaveTypeName;
  available: number | null;
  total: number | null;
  used: number;
  unit: "days" | "hours";
  description?: string;
}

export interface LeaveBalances {
  sick: LeaveBalanceItem;
  casual: LeaveBalanceItem;
  earned: LeaveBalanceItem;
  unpaid: LeaveBalanceItem;
}

export interface LeaveApplication {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveTypeName;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  submittedAt: string;
  reviewStep?: string;
  attachmentUrl?: string;
}

export interface LeaveApplicationDraft {
  leaveType: LeaveTypeName;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
}

export interface LeaveFilterOptions {
  status: string;
  leaveType: string;
  search: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponseEnvelope<T> {
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}
