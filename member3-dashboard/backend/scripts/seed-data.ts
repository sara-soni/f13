import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../src/config/dynamodb.js";
import { env } from "../src/config/env.js";

async function seedLeaveConfig() {
  console.log(`[Seed] Seeding leave configurations into "${env.DYNAMODB_LEAVE_CONFIG_TABLE}"...`);
  const configs = [
    {
      leave_type: "ANNUAL",
      label: "Annual Leave",
      default_days_per_year: 20,
      min_notice_days: 2,
      max_consecutive_days: 15,
      requires_attachment: false,
      color: "#2563eb",
      description: "Paid annual time off for rest and personal relaxation.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      leave_type: "SICK",
      label: "Sick Leave",
      default_days_per_year: 10,
      min_notice_days: 0,
      max_consecutive_days: 5,
      requires_attachment: true,
      color: "#16a34a",
      description: "Paid leave for health recuperation and medical consultations.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      leave_type: "CASUAL",
      label: "Casual Leave",
      default_days_per_year: 5,
      min_notice_days: 1,
      max_consecutive_days: 3,
      requires_attachment: false,
      color: "#d97706",
      description: "Short notice leave for urgent personal matters.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      leave_type: "UNPAID",
      label: "Leave Without Pay",
      default_days_per_year: 0,
      min_notice_days: 3,
      max_consecutive_days: 30,
      requires_attachment: false,
      color: "#64748b",
      description: "Unpaid absence taken after exhausting statutory paid leave balances.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  for (const cfg of configs) {
    await docClient.send(
      new PutCommand({
        TableName: env.DYNAMODB_LEAVE_CONFIG_TABLE,
        Item: cfg,
      })
    );
  }
}

async function seedLeaveBalances(employeeId: string, year: number) {
  console.log(`[Seed] Seeding initial leave balances for ${employeeId} (${year}) into "${env.DYNAMODB_LEAVE_BALANCES_TABLE}"...`);
  const balances = [
    {
      employee_id: employeeId,
      year_leave_type: `${year}#ANNUAL`,
      leave_type: "ANNUAL",
      year,
      allocated: 20,
      used: 6,
      pending: 0,
      available: 14,
      updated_at: new Date().toISOString(),
    },
    {
      employee_id: employeeId,
      year_leave_type: `${year}#SICK`,
      leave_type: "SICK",
      year,
      allocated: 10,
      used: 2,
      pending: 0,
      available: 8,
      updated_at: new Date().toISOString(),
    },
    {
      employee_id: employeeId,
      year_leave_type: `${year}#CASUAL`,
      leave_type: "CASUAL",
      year,
      allocated: 5,
      used: 1,
      pending: 0,
      available: 4,
      updated_at: new Date().toISOString(),
    },
    {
      employee_id: employeeId,
      year_leave_type: `${year}#UNPAID`,
      leave_type: "UNPAID",
      year,
      allocated: 0,
      used: 0,
      pending: 0,
      available: 0,
      updated_at: new Date().toISOString(),
    },
  ];

  for (const bal of balances) {
    await docClient.send(
      new PutCommand({
        TableName: env.DYNAMODB_LEAVE_BALANCES_TABLE,
        Item: bal,
      })
    );
  }
}

async function seedLeaveRequests(employeeId: string) {
  console.log(`[Seed] Seeding sample leave history for ${employeeId} into "${env.DYNAMODB_LEAVE_REQUESTS_TABLE}"...`);
  const requests = [
    {
      request_id: "REQ-2026-001",
      employee_id: employeeId,
      leave_type: "ANNUAL",
      start_date: "2026-02-10",
      end_date: "2026-02-12",
      days_count: 3,
      reason: "Mid-quarter personal rest and relaxation.",
      status: "APPROVED",
      reviewed_by: "EMP-MGR-001",
      reviewed_at: "2026-02-08T10:00:00.000Z",
      reviewer_note: "Approved. Enjoy your time off.",
      created_at: "2026-02-07T09:30:00.000Z",
      updated_at: "2026-02-08T10:00:00.000Z",
    },
    {
      request_id: "REQ-2026-002",
      employee_id: employeeId,
      leave_type: "SICK",
      start_date: "2026-03-05",
      end_date: "2026-03-06",
      days_count: 2,
      reason: "Viral flu and recovery under medical advice.",
      status: "APPROVED",
      reviewed_by: "EMP-MGR-001",
      reviewed_at: "2026-03-05T11:00:00.000Z",
      reviewer_note: "Get well soon.",
      created_at: "2026-03-05T08:15:00.000Z",
      updated_at: "2026-03-05T11:00:00.000Z",
    },
    {
      request_id: "REQ-2026-003",
      employee_id: employeeId,
      leave_type: "CASUAL",
      start_date: "2026-04-17",
      end_date: "2026-04-17",
      days_count: 1,
      reason: "Urgent family administrative appointment.",
      status: "APPROVED",
      reviewed_by: "EMP-MGR-001",
      reviewed_at: "2026-04-16T14:20:00.000Z",
      reviewer_note: "Approved.",
      created_at: "2026-04-15T16:00:00.000Z",
      updated_at: "2026-04-16T14:20:00.000Z",
    },
  ];

  for (const req of requests) {
    await docClient.send(
      new PutCommand({
        TableName: env.DYNAMODB_LEAVE_REQUESTS_TABLE,
        Item: req,
      })
    );
  }
}

async function main() {
  const currentYear = new Date().getFullYear();
  await seedLeaveConfig();
  await seedLeaveBalances("EMP001", currentYear);
  await seedLeaveRequests("EMP001");
  console.log("[Seed] Seeding completed successfully.");
}

main().catch((err) => {
  console.error("[Seed] Seeding failed:", err);
  process.exit(1);
});
