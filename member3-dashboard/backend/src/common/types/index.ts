export type LeaveTypeKey = "SICK" | "CASUAL" | "EARNED" | "UNPAID";

export type LeaveStatus =
  | "PENDING_MANAGER"
  | "PENDING_HR"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface AuthUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  roles: string[];
  department?: string;
  designation?: string;
  manager?: string;
  joiningDate?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    limit: number;
    nextCursor?: string;
    hasMore: boolean;
  };
  correlationId?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
  correlationId?: string;
}

// DynamoDB Table: leave_config
export interface LeaveConfigItem {
  leave_type: string; // Partition key
  display_name: string;
  annual_entitlement: number | null;
  unit: "days" | "hours";
  minimum_notice_days: number;
  max_consecutive_days?: number;
  multi_step_review_threshold?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// DynamoDB Table: leave_balances
export interface LeaveBalanceItem {
  employee_id: string; // Partition key
  year_leave_type: string; // Sort key (e.g. "2026#SICK")
  year: number;
  leave_type: string;
  available: number | null;
  total: number | null;
  allocated?: number | null;
  used: number;
  unit: "days" | "hours";
  updated_at: string;
}

// DynamoDB Table: leave_requests
export interface LeaveRequestItem {
  request_id: string; // Partition key
  employee_id: string; // GSI 1 PK
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveStatus; // GSI 2 PK
  created_at: string; // GSI SK
  updated_at: string;
  review_step?: string;
  reviewer_comments?: string;
}

// DynamoDB Table: leave_transactions
export interface LeaveTransactionItem {
  employee_id: string; // Partition key
  transaction_id: string; // Sort key
  request_id?: string;
  leave_type: string;
  amount: number;
  action: "DEDUCTION" | "REFUND" | "ACCRUAL" | "ADJUSTMENT";
  balance_before?: number | null;
  balance_after?: number | null;
  created_at: string;
  performed_by: string;
}
