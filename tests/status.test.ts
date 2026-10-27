import { describe, expect, it } from "vitest";
import { clientHealth } from "@/lib/domain/status";

const T = "2026-10-27";
const base = { status: "active" as const, archivedAt: null, lastSessionDate: "2026-10-25", nextReviewDate: "2026-12-01" };

describe("clientHealth", () => {
  it("is green when training recently with no review due", () => {
    expect(clientHealth(base, T)).toBe("on_track");
    expect(clientHealth({ ...base, nextReviewDate: null }, T)).toBe("on_track");
  });
  it("turns amber for a review within a week or 10+ quiet days", () => {
    expect(clientHealth({ ...base, nextReviewDate: "2026-11-03" }, T)).toBe("watch");
    expect(clientHealth({ ...base, lastSessionDate: "2026-10-17" }, T)).toBe("watch");
    expect(clientHealth({ ...base, lastSessionDate: "2026-10-18" }, T)).toBe("on_track");
  });
  it("turns red for an overdue review or 21+ quiet days", () => {
    expect(clientHealth({ ...base, nextReviewDate: "2026-10-26" }, T)).toBe("overdue");
    expect(clientHealth({ ...base, lastSessionDate: "2026-10-06" }, T)).toBe("overdue");
    expect(clientHealth({ ...base, nextReviewDate: "2026-10-27" }, T)).toBe("watch"); // due today is not overdue yet
  });
  it("is grey when paused, archived or brand new", () => {
    expect(clientHealth({ ...base, status: "on_hold" }, T)).toBe("paused");
    expect(clientHealth({ ...base, status: "inactive" }, T)).toBe("paused");
    expect(clientHealth({ ...base, archivedAt: new Date() }, T)).toBe("paused");
    expect(clientHealth({ ...base, lastSessionDate: null }, T)).toBe("new");
  });
});
