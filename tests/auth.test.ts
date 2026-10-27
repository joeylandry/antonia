import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/validation/auth";

describe("safeNext", () => {
  it("allows ordinary same-site paths", () => {
    expect(safeNext("/clients")).toBe("/clients");
    expect(safeNext("/clients/abc?x=1#top")).toBe("/clients/abc?x=1#top");
    expect(safeNext("/")).toBe("/");
  });
  it("falls back for empty or missing values", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext("")).toBe("/");
    expect(safeNext(undefined, "/home")).toBe("/home");
  });
  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "/%09/evil.com".replace("%09", "\t"),
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "/ /evil.com",
    "/\u0000x",
  ])("rejects %j", (bad) => {
    expect(safeNext(bad)).toBe("/");
  });
});
