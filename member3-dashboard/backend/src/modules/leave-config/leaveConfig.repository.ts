import { ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../../config/dynamodb.js";
import { env } from "../../config/env.js";
import type { LeaveConfigItem } from "../../common/types/index.js";
import { cacheService } from "../../infrastructure/cache/redisCacheService.js";

export interface ILeaveConfigRepository {
  getAll(): Promise<LeaveConfigItem[]>;
  getByType(leaveType: string): Promise<LeaveConfigItem | null>;
}

export class DynamoLeaveConfigRepository implements ILeaveConfigRepository {
  private readonly tableName = env.DYNAMODB_LEAVE_CONFIG_TABLE;
  private readonly cacheKey = "config:leave_types";

  async getAll(): Promise<LeaveConfigItem[]> {
    // 1. Try Redis cache
    const cached = await cacheService.get<LeaveConfigItem[]>(this.cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Query DynamoDB table
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.tableName,
      })
    );

    const items = (result.Items as LeaveConfigItem[]) || [];

    // 3. Cache for 1 hour
    if (items.length > 0) {
      await cacheService.set(this.cacheKey, items, env.REDIS_CACHE_TTL_CONFIG_SECONDS);
    }

    return items;
  }

  async getByType(leaveType: string): Promise<LeaveConfigItem | null> {
    const all = await this.getAll();
    const found = all.find((item) => item.leave_type === leaveType);
    if (found) return found;

    // Fallback to direct GetCommand
    const result = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { leave_type: leaveType },
      })
    );

    return (result.Item as LeaveConfigItem) || null;
  }
}

export const leaveConfigRepository = new DynamoLeaveConfigRepository();
