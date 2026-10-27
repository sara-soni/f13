# LeaveFlow Backend Service

Production-ready REST API for the LeaveFlow Employee Leave Management System built with **Express**, **TypeScript**, **Amazon DynamoDB**, **Redis**, and **AWS Cognito**.

---

## 1. Architecture & Tech Stack

- **Framework:** Express 4.21 with Node.js 20+
- **Language:** TypeScript 5.7 with native ES Modules (`type: "module"`)
- **Database:** Amazon DynamoDB via AWS SDK v3 (`@aws-sdk/client-dynamodb` & `@aws-sdk/lib-dynamodb`)
- **Cache:** Redis 7 via `ioredis`
- **Security:** `helmet`, `cors`, `express-rate-limit`, `rate-limit-redis`, `aws-jwt-verify`
- **Validation:** Zod
- **Documentation:** OpenAPI 3.0 via `swagger-ui-express` & `yamljs`
- **Testing:** Vitest 3.0 & Supertest 7.0

---

## 2. Directory Structure

```
backend/
├── scripts/
│   ├── init-tables.ts       # Idempotent table & GSI creation for DynamoDB
│   └── seed-data.ts         # Seeds leave rules and initial employee records
├── src/
│   ├── common/
│   │   ├── errors/          # Typed AppErrors (BadRequest, Unauthorized, NotFound, etc.)
│   │   ├── middleware/      # Auth guard, correlation ID, rate limiters, error handler
│   │   └── types/           # Domain entities, DTOs, API envelopes
│   ├── config/
│   │   ├── dynamodb.ts      # AWS SDK v3 client configuration
│   │   ├── env.ts           # Zod-validated environment configuration
│   │   └── redis.ts         # Resilient ioredis client with retry logic
│   ├── docs/
│   │   ├── openapi.yaml     # OpenAPI 3.0 specification
│   │   └── swagger.ts       # Swagger UI router mounted at /api/v1/docs
│   ├── infrastructure/
│   │   └── cache/           # RedisCacheService with fail-safe fallback
│   ├── modules/
│   │   ├── employees/       # Employee profile endpoints (/me)
│   │   ├── health/          # Liveness & readiness probes (/live, /ready)
│   │   ├── leave-balances/  # Repository and routes for balances
│   │   ├── leave-config/    # Leave entitlement policies & rules
│   │   └── leave-requests/  # Leave request engine, transactions & GSIs
│   ├── app.ts               # Express application builder
│   └── server.ts            # HTTP bootstrap & graceful shutdown handler
├── tests/
│   ├── api.test.ts          # Endpoint security and routing tests
│   ├── integration.test.ts  # End-to-end DynamoDB transactions & Redis tests
│   └── leaveCalculation.test.ts # Business days calculation unit tests
├── package.json
└── tsconfig.json
```

---

## 3. Environment Configuration

Create a `.env` file in the `backend/` folder based on `.env.example`:

```env
PORT=3001
NODE_ENV=development
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:5173,http://localhost:4173

# AWS & DynamoDB
AWS_REGION=us-east-1
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_LEAVE_CONFIG_TABLE=leave_config
DYNAMODB_LEAVE_BALANCES_TABLE=leave_balances
DYNAMODB_LEAVE_REQUESTS_TABLE=leave_requests
DYNAMODB_LEAVE_TRANSACTIONS_TABLE=leave_transactions

# Redis
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=leaveflow:
REDIS_CACHE_TTL_CONFIG_SECONDS=3600
REDIS_CACHE_TTL_BALANCES_SECONDS=300

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_GENERAL=120
RATE_LIMIT_MAX_SUBMISSIONS=10

# Cognito (optional in dev mode, required in production)
COGNITO_USER_POOL_ID=us-east-1_examplePoolId
COGNITO_CLIENT_ID=exampleClientId1234567890
COGNITO_REGION=us-east-1
```

---

## 4. Setup and Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize DynamoDB Tables and Seed Data
```bash
npm run init:db
npm run seed
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 5. API Testing & cURL Examples

### Liveness & Readiness Probes
```bash
# Check service liveness
curl http://localhost:3001/api/v1/health/live

# Check DynamoDB & Redis readiness
curl http://localhost:3001/api/v1/health/ready
```

### Authenticated Employee Profile
```bash
curl -H "Authorization: Bearer dev-token" \
  http://localhost:3001/api/v1/employee/me
```

### Fetch Leave Balances
```bash
curl -H "Authorization: Bearer dev-token" \
  "http://localhost:3001/api/v1/leave/balances?year=2026"
```

### Submit Leave Application (Atomic Transaction)
```bash
curl -X POST http://localhost:3001/api/v1/leave/requests \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "leaveType": "ANNUAL",
    "startDate": "2026-11-09",
    "endDate": "2026-11-10",
    "reason": "Family commitment and rest."
  }'
```

### Cancel Leave Request
```bash
curl -X POST http://localhost:3001/api/v1/leave/requests/REQ-2026-001/cancel \
  -H "Authorization: Bearer dev-token"
```

---

## 6. Testing

Run the full test suite with Vitest:
```bash
npm test
```
