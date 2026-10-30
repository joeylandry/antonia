import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, setupTestDatabase } from "./support/db";

const jar = new Map<string, string>();
let ip = "203.0.113.1";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ "x-forwarded-for": `198.51.100.9, ${ip}` }),
}));

const { getTrainer, signIn, signOut, MAX_FAILURES_PER_IP, MAX_FAILURES_TOTAL } = await import("@/lib/auth");
const { hashPasscode } = await import("@/lib/passcode");

const PASSCODE = "correct horse battery staple";
let hash: string;

const suite = describe.skipIf(!TEST_DATABASE_URL);
const sql = TEST_DATABASE_URL ? setupTestDatabase() : () => { throw new Error("no TEST_DATABASE_URL"); };

beforeAll(async () => {
  hash = await hashPasscode(PASSCODE);
});
beforeEach(() => {
  process.env.PASSCODE_HASH = hash;
  jar.clear();
  ip = "203.0.113.1";
});
afterEach(() => {
  vi.useRealTimers();
});

// getTrainer is wrapped in React's cache(), which is a no-op outside a request.
suite("sign-in", () => {
  it("issues a server-side session for the right passcode, and only stores its hash", async () => {
    expect(await signIn(PASSCODE)).toBe("ok");
    const token = [...jar.values()][0];
    expect(token).toMatch(/^[\w-]{43}$/);
    const stored = await sql()<{ token_hash: string }[]>`select token_hash from app.auth_sessions`;
    expect(stored).toHaveLength(1);
    expect(stored[0].token_hash).not.toContain(token);
    expect(await getTrainer()).not.toBeNull();
  });

  it("refuses a wrong passcode and a forged cookie", async () => {
    expect(await signIn("wrong passcode")).toBe("wrong");
    expect(jar.size).toBe(0);
    jar.set("antonia_session", "forged");
    expect(await getTrainer()).toBeNull();
  });

  it("fails closed when no passcode hash is configured", async () => {
    delete process.env.PASSCODE_HASH;
    expect(await signIn(PASSCODE)).toBe("not_configured");
    process.env.PASSCODE_HASH = "not-a-hash";
    expect(await signIn(PASSCODE)).toBe("not_configured");
  });

  it("sign-out deletes the session on the server", async () => {
    await signIn(PASSCODE);
    const token = [...jar.entries()][0];
    await signOut();
    expect(await getTrainer()).toBeNull();
    jar.set(token[0], token[1]);
    expect(await getTrainer()).toBeNull();
  });

  it("changing the passcode ends every existing session", async () => {
    await signIn(PASSCODE);
    expect(await getTrainer()).not.toBeNull();
    process.env.PASSCODE_HASH = await hashPasscode("a whole new passcode");
    expect(await getTrainer()).toBeNull();
  });

  it("sessions expire after 30 days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await signIn(PASSCODE);
    vi.setSystemTime(Date.now() + 31 * 86_400_000);
    expect(await getTrainer()).toBeNull();
  });
});

suite("brute-force protection", () => {
  it(`locks an address after ${MAX_FAILURES_PER_IP} wrong guesses, even for the right passcode`, async () => {
    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) expect(await signIn(`guess ${i}`)).toBe("wrong");
    expect(await signIn(PASSCODE)).toBe("locked");
    ip = "203.0.113.2";
    expect(await signIn(PASSCODE)).toBe("ok");
  });

  it(`locks the whole site after ${MAX_FAILURES_TOTAL} wrong guesses from any mix of addresses`, async () => {
    for (let i = 0; i < MAX_FAILURES_TOTAL; i++) {
      ip = `192.0.2.${i}`;
      expect(await signIn(`guess ${i}`)).toBe("wrong");
    }
    ip = "192.0.2.200";
    expect(await signIn(PASSCODE)).toBe("locked");
  });

  it("parallel guesses cannot slip past the limit", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => signIn(`guess ${i}`)));
    expect(results.filter((r) => r === "wrong")).toHaveLength(MAX_FAILURES_PER_IP);
  });

  it("the lock lifts after 15 minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) await signIn(`guess ${i}`);
    expect(await signIn(PASSCODE)).toBe("locked");
    vi.setSystemTime(Date.now() + 15 * 60_000 + 1);
    expect(await signIn(PASSCODE)).toBe("ok");
  });

  it("the per-address limit uses the address the proxy saw, not a spoofed leftmost entry", async () => {
    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) await signIn(`guess ${i}`);
    const rows = await sql()<{ ip: string }[]>`select distinct ip from app.login_failures`;
    expect([...rows]).toEqual([{ ip: "203.0.113.1" }]);
  });
});
