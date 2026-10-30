import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Passcode hashing with scrypt (memory-hard, so guessing offline is expensive
 * even with GPUs). Stored format, with no `$` so .env files don't expand it:
 *   scrypt:<log2 N>:<r>:<p>:<salt base64url>:<hash base64url>
 */
const LOG_N = 15;
const R = 8;
const P = 1;
const KEY_LEN = 32;

export const MIN_PASSCODE_LENGTH = 10;

function derive(passcode: string, salt: Buffer, logN: number, r: number, p: number, keyLen: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(passcode.normalize("NFKC"), salt, keyLen, { N: 2 ** logN, r, p, maxmem: 256 * 2 ** logN * r }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(passcode, salt, LOG_N, R, P, KEY_LEN);
  return ["scrypt", LOG_N, R, P, salt.toString("base64url"), key.toString("base64url")].join(":");
}

type Parsed = { logN: number; r: number; p: number; salt: Buffer; key: Buffer };

export function parseHash(stored: string): Parsed | null {
  const parts = stored.trim().split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [logN, r, p] = parts.slice(1, 4).map(Number);
  const salt = Buffer.from(parts[4], "base64url");
  const key = Buffer.from(parts[5], "base64url");
  // Bounds keep a malformed value from asking for gigabytes of memory.
  if (![logN, r, p].every(Number.isInteger) || logN < 14 || logN > 20 || r < 1 || r > 32 || p < 1 || p > 4) return null;
  if (salt.length < 16 || key.length < 32) return null;
  return { logN, r, p, salt, key };
}

/** Constant-time comparison. False for a malformed stored hash. */
export async function verifyPasscode(passcode: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  const key = await derive(passcode, parsed.salt, parsed.logN, parsed.r, parsed.p, parsed.key.length);
  return timingSafeEqual(key, parsed.key);
}
