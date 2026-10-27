import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  API_PREFIX: z.string().default("/api/v1"),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:4173"),

  // AWS & DynamoDB
  AWS_REGION: z.string().default("us-east-1"),
  DYNAMODB_ENDPOINT: z.string().optional(),
  DYNAMODB_LEAVE_CONFIG_TABLE: z.string().default("leave_config"),
  DYNAMODB_LEAVE_BALANCES_TABLE: z.string().default("leave_balances"),
  DYNAMODB_LEAVE_REQUESTS_TABLE: z.string().default("leave_requests"),
  DYNAMODB_LEAVE_TRANSACTIONS_TABLE: z.string().default("leave_transactions"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_KEY_PREFIX: z.string().default("leaveflow:"),
  REDIS_CACHE_TTL_CONFIG_SECONDS: z.coerce.number().default(3600),
  REDIS_CACHE_TTL_BALANCES_SECONDS: z.coerce.number().default(300),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_GENERAL: z.coerce.number().default(120),
  RATE_LIMIT_MAX_SUBMISSIONS: z.coerce.number().default(10),

  // Cognito
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  COGNITO_REGION: z.string().default("us-east-1"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
