import { describe, it, expect } from "vitest";
import { calculateBusinessDays } from "../src/modules/leave-requests/leaveRequest.service.js";

describe("Business Day Calculations", () => {
  it("calculates 1 day for a single weekday", () => {
    // 2026-11-10 is Tuesday
    const days = calculateBusinessDays("2026-11-10", "2026-11-10");
    expect(days).toBe(1);
  });

  it("calculates 5 days for a Monday-Friday week", () => {
    // 2026-11-09 (Mon) to 2026-11-13 (Fri)
    const days = calculateBusinessDays("2026-11-09", "2026-11-13");
    expect(days).toBe(5);
  });

  it("excludes weekends properly across multi-week span", () => {
    // 2026-11-06 (Fri) to 2026-11-16 (Mon) = 7 business days (Fri + 5 days next week + Mon)
    const days = calculateBusinessDays("2026-11-06", "2026-11-16");
    expect(days).toBe(7);
  });

  it("returns 0 days if span falls strictly on a Saturday and Sunday", () => {
    // 2026-11-14 (Sat) to 2026-11-15 (Sun)
    const days = calculateBusinessDays("2026-11-14", "2026-11-15");
    expect(days).toBe(0);
  });

  it("returns 0 days when start date is after end date", () => {
    const days = calculateBusinessDays("2026-11-15", "2026-11-10");
    expect(days).toBe(0);
  });
});
