import {
  QueryCommand,
  GetCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient } from "../../config/dynamodb.js";
import { env } from "../../config/env.js";
import type {
  LeaveRequestItem,
  LeaveTransactionItem,
} from "../../common/types/index.js";
import { leaveBalanceRepository } from "../leave-balances/leaveBalance.repository.js";
import crypto from "crypto";

export interface ILeaveRequestRepository {
  getByEmployee(
    employeeId: string,
    filters?: { status?: string; leaveType?: string; limit?: number; cursor?: string }
  ): Promise<{ items: LeaveRequestItem[]; nextCursor?: string }>;
  getById(requestId: string): Promise<LeaveRequestItem | null>;
  createWithTransaction(params: {
    request: LeaveRequestItem;
    year: number;
    leaveTypeKey: string;
    isPaid: boolean;
  }): Promise<LeaveRequestItem>;
  cancelWithTransaction(params: {
    request: LeaveRequestItem;
    year: number;
    leaveTypeKey: string;
    isPaid: boolean;
    cancelledBy: string;
  }): Promise<void>;
}

export class DynamoLeaveRequestRepository implements ILeaveRequestRepository {
  private readonly requestsTable = env.DYNAMODB_LEAVE_REQUESTS_TABLE;
  private readonly balancesTable = env.DYNAMODB_LEAVE_BALANCES_TABLE;
  private readonly transactionsTable = env.DYNAMODB_LEAVE_TRANSACTIONS_TABLE;

  async getByEmployee(
    employeeId: string,
    filters?: { status?: string; leaveType?: string; limit?: number; cursor?: string }
  ): Promise<{ items: LeaveRequestItem[]; nextCursor?: string }> {
    const limit = filters?.limit || 50;

    let exclusiveStartKey: Record<string, unknown> | undefined;
    if (filters?.cursor) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(filters.cursor, "base64").toString("utf8"));
      } catch {
        exclusiveStartKey = undefined;
      }
    }

    const queryInput: ConstructorParameters<typeof QueryCommand>[0] = {
      TableName: this.requestsTable,
      IndexName: "employee_id-created_at-index",
      KeyConditionExpression: "employee_id = :empId",
      ExpressionAttributeValues: {
        ":empId": employeeId,
      },
      ScanIndexForward: false, // Descending order (latest first)
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    };

    // Apply FilterExpression if status or leaveType filter specified
    const filterParts: string[] = [];
    if (filters?.status && filters.status !== "All statuses") {
      filterParts.push("#st = :st");
      queryInput.ExpressionAttributeNames = {
        ...(queryInput.ExpressionAttributeNames || {}),
        "#st": "status",
      };
      queryInput.ExpressionAttributeValues![":st"] = filters.status;
    }

    if (filters?.leaveType && filters.leaveType !== "All leave types") {
      filterParts.push("#lt = :lt");
      queryInput.ExpressionAttributeNames = {
        ...(queryInput.ExpressionAttributeNames || {}),
        "#lt": "leave_type",
      };
      queryInput.ExpressionAttributeValues![":lt"] = filters.leaveType;
    }

    if (filterParts.length > 0) {
      queryInput.FilterExpression = filterParts.join(" AND ");
    }

    const result = await docClient.send(new QueryCommand(queryInput));
    const items = (result.Items as LeaveRequestItem[]) || [];

    let nextCursor: string | undefined;
    if (result.LastEvaluatedKey) {
      nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64");
    }

    return { items, nextCursor };
  }

  async getById(requestId: string): Promise<LeaveRequestItem | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: this.requestsTable,
        Key: { request_id: requestId },
      })
    );

    return (result.Item as LeaveRequestItem) || null;
  }

  async createWithTransaction(params: {
    request: LeaveRequestItem;
    year: number;
    leaveTypeKey: string;
    isPaid: boolean;
  }): Promise<LeaveRequestItem> {
    const { request, year, leaveTypeKey, isPaid } = params;
    const now = new Date().toISOString();
    const transactionId = `TXN-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;

    const transactionItem: LeaveTransactionItem = {
      employee_id: request.employee_id,
      transaction_id: transactionId,
      request_id: request.request_id,
      leave_type: request.leave_type,
      amount: request.days,
      action: "DEDUCTION",
      created_at: now,
      performed_by: request.employee_id,
    };

    const transactItems: ConstructorParameters<typeof TransactWriteCommand>[0]["TransactItems"] = [
      // 1. Put Leave Request
      {
        Put: {
          TableName: this.requestsTable,
          Item: request,
          ConditionExpression: "attribute_not_exists(request_id)",
        },
      },
      // 2. Put Audit Transaction Record
      {
        Put: {
          TableName: this.transactionsTable,
          Item: transactionItem,
        },
      },
    ];

    // 3. Conditional Update on Leave Balance if Paid Leave
    if (isPaid) {
      transactItems.push({
        Update: {
          TableName: this.balancesTable,
          Key: {
            employee_id: request.employee_id,
            year_leave_type: `${year}#${leaveTypeKey.toUpperCase()}`,
          },
          UpdateExpression: "SET available = available - :days, used = used + :days, updated_at = :now",
          ConditionExpression: "attribute_exists(employee_id) AND available >= :days",
          ExpressionAttributeValues: {
            ":days": request.days,
            ":now": now,
          },
        },
      });
    }

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      })
    );

    // Invalidate Redis balance cache immediately
    await leaveBalanceRepository.invalidateBalanceCache(request.employee_id, year);

    return request;
  }

  async cancelWithTransaction(params: {
    request: LeaveRequestItem;
    year: number;
    leaveTypeKey: string;
    isPaid: boolean;
    cancelledBy: string;
  }): Promise<void> {
    const { request, year, leaveTypeKey, isPaid, cancelledBy } = params;
    const now = new Date().toISOString();
    const transactionId = `TXN-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;

    const transactionItem: LeaveTransactionItem = {
      employee_id: request.employee_id,
      transaction_id: transactionId,
      request_id: request.request_id,
      leave_type: request.leave_type,
      amount: request.days,
      action: "REFUND",
      created_at: now,
      performed_by: cancelledBy,
    };

    const transactItems: ConstructorParameters<typeof TransactWriteCommand>[0]["TransactItems"] = [
      // 1. Update Request Status to CANCELLED with Condition
      {
        Update: {
          TableName: this.requestsTable,
          Key: { request_id: request.request_id },
          UpdateExpression: "SET #st = :cancelled, review_step = :step, updated_at = :now",
          ConditionExpression: "attribute_exists(request_id) AND (#st = :p1 OR #st = :p2)",
          ExpressionAttributeNames: {
            "#st": "status",
          },
          ExpressionAttributeValues: {
            ":cancelled": "CANCELLED",
            ":step": "Cancelled by Employee",
            ":now": now,
            ":p1": "PENDING_MANAGER",
            ":p2": "PENDING_HR",
          },
        },
      },
      // 2. Put Refund Transaction Record
      {
        Put: {
          TableName: this.transactionsTable,
          Item: transactionItem,
        },
      },
    ];

    // 3. Restore balance in leave_balances if Paid Leave
    if (isPaid) {
      transactItems.push({
        Update: {
          TableName: this.balancesTable,
          Key: {
            employee_id: request.employee_id,
            year_leave_type: `${year}#${leaveTypeKey.toUpperCase()}`,
          },
          UpdateExpression: "SET available = available + :days, used = used - :days, updated_at = :now",
          ConditionExpression: "attribute_exists(employee_id)",
          ExpressionAttributeValues: {
            ":days": request.days,
            ":now": now,
          },
        },
      });
    }

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      })
    );

    // Invalidate Redis balance cache immediately
    await leaveBalanceRepository.invalidateBalanceCache(request.employee_id, year);
  }
}

export const leaveRequestRepository = new DynamoLeaveRequestRepository();
