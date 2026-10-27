import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatDate, relativeDay, todayIn } from "@/lib/dates";

describe("dates", () => {
  it("computes today in a given time zone", () => {
    const now = new Date("2026-10-27T02:30:00Z");
    expect(todayIn("America/New_York", now)).toBe("2026-10-26");
    expect(todayIn("UTC", now)).toBe("2026-10-27");
    expect(todayIn("Pacific/Auckland", now)).toBe("2026-10-27");
  });
  it("does arithmetic on calendar dates without timezone drift", () => {
    expect(daysBetween("2026-10-06", "2026-10-31")).toBe(25);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2); // across US DST change
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("formats", () => {
    expect(formatDate("2026-10-06")).toBe("Oct 6, 2026");
    expect(formatDate("2026-10-06", 2026)).toBe("Oct 6");
    expect(formatDate(null)).toBe("—");
    expect(relativeDay("2026-10-26", "2026-10-27")).toBe("yesterday");
    expect(relativeDay("2026-10-20", "2026-10-27")).toBe("7 days ago");
    expect(relativeDay("2026-10-29", "2026-10-27")).toBe("in 2 days");
  });
});
