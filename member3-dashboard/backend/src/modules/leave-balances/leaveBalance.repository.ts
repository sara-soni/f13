import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../../config/dynamodb.js";
import { env } from "../../config/env.js";
import type { LeaveBalanceItem } from "../../common/types/index.js";
import { cacheService } from "../../infrastructure/cache/redisCacheService.js";

export interface ILeaveBalanceRepository {
  getBalancesByYear(employeeId: string, year: number): Promise<LeaveBalanceItem[]>;
  invalidateBalanceCache(employeeId: string, year: number): Promise<void>;
}

export class DynamoLeaveBalanceRepository implements ILeaveBalanceRepository {
  private readonly tableName = env.DYNAMODB_LEAVE_BALANCES_TABLE;

  private getCacheKey(employeeId: string, year: number): string {
    return `balances:${employeeId}:${year}`;
  }

  async getBalancesByYear(employeeId: string, year: number): Promise<LeaveBalanceItem[]> {
    const cacheKey = this.getCacheKey(employeeId, year);

    // 1. Try Redis cache
    const cached = await cacheService.get<LeaveBalanceItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Query DynamoDB by PK and prefix of SK
    const result = await docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "employee_id = :empId AND begins_with(year_leave_type, :yearPrefix)",
        ExpressionAttributeValues: {
          ":empId": employeeId,
          ":yearPrefix": `${year}#`,
        },
      })
    );

    const items = (result.Items as LeaveBalanceItem[]) || [];

    // 3. Cache results
    if (items.length > 0) {
      await cacheService.set(cacheKey, items, env.REDIS_CACHE_TTL_BALANCES_SECONDS);
    }

    return items;
  }

  async invalidateBalanceCache(employeeId: string, year: number): Promise<void> {
    const cacheKey = this.getCacheKey(employeeId, year);
    await cacheService.delete(cacheKey);
  }
}

export const leaveBalanceRepository = new DynamoLeaveBalanceRepository();
