import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
  type CreateTableCommandInput,
} from "@aws-sdk/client-dynamodb";
import { rawDynamoClient } from "../src/config/dynamodb.js";
import { env } from "../src/config/env.js";

interface TableDefinition {
  name: string;
  schema: CreateTableCommandInput;
}

const tableDefinitions: TableDefinition[] = [
  {
    name: env.DYNAMODB_LEAVE_CONFIG_TABLE,
    schema: {
      TableName: env.DYNAMODB_LEAVE_CONFIG_TABLE,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "leave_type", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "leave_type", KeyType: "HASH" },
      ],
    },
  },
  {
    name: env.DYNAMODB_LEAVE_BALANCES_TABLE,
    schema: {
      TableName: env.DYNAMODB_LEAVE_BALANCES_TABLE,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "employee_id", AttributeType: "S" },
        { AttributeName: "year_leave_type", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "employee_id", KeyType: "HASH" },
        { AttributeName: "year_leave_type", KeyType: "RANGE" },
      ],
    },
  },
  {
    name: env.DYNAMODB_LEAVE_REQUESTS_TABLE,
    schema: {
      TableName: env.DYNAMODB_LEAVE_REQUESTS_TABLE,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "request_id", AttributeType: "S" },
        { AttributeName: "employee_id", AttributeType: "S" },
        { AttributeName: "status", AttributeType: "S" },
        { AttributeName: "created_at", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "request_id", KeyType: "HASH" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "employee_id-created_at-index",
          KeySchema: [
            { AttributeName: "employee_id", KeyType: "HASH" },
            { AttributeName: "created_at", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "status-created_at-index",
          KeySchema: [
            { AttributeName: "status", KeyType: "HASH" },
            { AttributeName: "created_at", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    },
  },
  {
    name: env.DYNAMODB_LEAVE_TRANSACTIONS_TABLE,
    schema: {
      TableName: env.DYNAMODB_LEAVE_TRANSACTIONS_TABLE,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "employee_id", AttributeType: "S" },
        { AttributeName: "transaction_id", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "employee_id", KeyType: "HASH" },
        { AttributeName: "transaction_id", KeyType: "RANGE" },
      ],
    },
  },
];

async function ensureTable(def: TableDefinition) {
  try {
    const describe = await rawDynamoClient.send(
      new DescribeTableCommand({ TableName: def.name })
    );
    console.log(`[DynamoDB] Table "${def.name}" already exists (status: ${describe.Table?.TableStatus}).`);
  } catch (err: unknown) {
    if (err instanceof ResourceNotFoundException || (err as { name?: string }).name === "ResourceNotFoundException") {
      console.log(`[DynamoDB] Creating table "${def.name}"...`);
      await rawDynamoClient.send(new CreateTableCommand(def.schema));
      console.log(`[DynamoDB] Table "${def.name}" created successfully.`);
    } else {
      console.error(`[DynamoDB] Error checking/creating table "${def.name}":`, err);
      throw err;
    }
  }
}

async function main() {
  console.log(`[DynamoDB] Initializing DynamoDB tables in region "${env.AWS_REGION}"...`);
  if (env.DYNAMODB_ENDPOINT) {
    console.log(`[DynamoDB] Connecting to custom endpoint: ${env.DYNAMODB_ENDPOINT}`);
  }

  for (const def of tableDefinitions) {
    await ensureTable(def);
  }
  console.log("[DynamoDB] All tables initialized.");
}

main().catch((err) => {
  console.error("[DynamoDB] Initialization failed:", err);
  process.exit(1);
});
