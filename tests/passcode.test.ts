import { describe, expect, it } from "vitest";
import { hashPasscode, parseHash, verifyPasscode } from "@/lib/passcode";

describe("passcode hashing", () => {
  it("verifies the right passcode and rejects others", async () => {
    const hash = await hashPasscode("correct horse battery staple");
    expect(hash).toMatch(/^scrypt:15:8:1:[\w-]+:[\w-]+$/);
    expect(hash).not.toContain("correct");
    expect(await verifyPasscode("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPasscode("correct horse battery stapl", hash)).toBe(false);
    expect(await verifyPasscode("", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPasscode("same passcode here")).not.toBe(await hashPasscode("same passcode here"));
  });

  it.each(["", "plain-text-passcode", "scrypt:15:8:1:abc", "scrypt:30:8:1:CmkhKipVWp4fy5AjW_9u0A:_24y7YUfXAEy2P6hn2MTfRL2EUXxG_-fH73o5704NZk", "bcrypt:15:8:1:a:b"])(
    "treats %j as not configured",
    async (bad) => {
      expect(parseHash(bad)).toBeNull();
      expect(await verifyPasscode("anything", bad)).toBe(false);
    },
  );
});
