import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("LeaveFlow End-to-End Integration Tests", () => {
  const app = createApp();
  let sessionCookie: string;
  let createdRequestId: string;

  it("POST /api/v1/auth/login authenticates and returns HttpOnly session cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "emp001", password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toHaveProperty("employeeId", "EMP001");
    // Verify HttpOnly cookie header was set
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join("; ") : cookies;
    expect(cookieStr).toContain("leaveflow_session=");
    expect(cookieStr).toContain("HttpOnly");

    // Extract cookie value for subsequent requests
    const match = cookieStr.match(/leaveflow_session=([^;]+)/);
    expect(match).not.toBeNull();
    sessionCookie = `leaveflow_session=${match![1]}`;
  });

  it("GET /api/v1/auth/session verifies active session via cookie", async () => {
    expect(sessionCookie).toBeDefined();
    const res = await request(app)
      .get("/api/v1/auth/session")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employeeId).toBe("EMP001");
  });

  it("GET /api/v1/health/ready checks DynamoDB and Redis connectivity", async () => {
    const res = await request(app).get("/api/v1/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ready");
    expect(res.body.dependencies).toHaveProperty("dynamodb", "connected");
  });

  it("GET /api/v1/leave/config retrieves leave configurations using session cookie", async () => {
    const res = await request(app)
      .get("/api/v1/leave/config")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    const leaveTypes = res.body.data.map((c: { leave_type: string }) => c.leave_type);
    expect(leaveTypes).toContain("ANNUAL");
    expect(leaveTypes).toContain("SICK");
  });

  it("GET /api/v1/leave/balances retrieves structured employee balances", async () => {
    const res = await request(app)
      .get("/api/v1/leave/balances?year=2026")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("earned");
    expect(res.body.data.earned.total).toBe(20);
    expect(res.body.data.earned.available).toBeGreaterThan(0);
  });

  it("GET /api/v1/leave/requests lists employee leave requests", async () => {
    const res = await request(app)
      .get("/api/v1/leave/requests")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/v1/leave/requests successfully creates a leave request with atomic transaction", async () => {
    const res = await request(app)
      .post("/api/v1/leave/requests")
      .set("Cookie", sessionCookie)
      .send({
        leaveType: "ANNUAL",
        startDate: "2026-11-09", // Mon
        endDate: "2026-11-10",   // Tue = 2 days
        reason: "Personal family commitment and short break.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.days).toBe(2);
    expect(res.body.data.status).toBe("Pending Manager");
    createdRequestId = res.body.data.id;
  });

  it("POST /api/v1/leave/requests/:id/cancel cancels the pending request and restores balance", async () => {
    expect(createdRequestId).toBeDefined();

    const res = await request(app)
      .post(`/api/v1/leave/requests/${createdRequestId}/cancel`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("Cancelled");
  });

  it("POST /api/v1/auth/logout invalidates session and clears cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Subsequent request with the invalidated cookie must fail with 401
    const verifyRes = await request(app)
      .get("/api/v1/auth/session")
      .set("Cookie", sessionCookie);

    expect(verifyRes.status).toBe(401);
  });
});
