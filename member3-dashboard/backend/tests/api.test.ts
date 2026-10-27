import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("LeaveFlow Backend API Endpoints", () => {
  const app = createApp();

  it("GET /api/v1/health/live returns 200 with status live", async () => {
    const res = await request(app).get("/api/v1/health/live");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "healthy");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("GET /api/v1/employee/me without token returns 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/employee/me");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/v1/employee/me with Bearer dev-token returns user profile", async () => {
    const res = await request(app)
      .get("/api/v1/employee/me")
      .set("Authorization", "Bearer dev-token");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("employeeId", "EMP001");
  });

  it("returns 404 for undefined routes", async () => {
    const res = await request(app).get("/api/v1/non-existent-endpoint");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
