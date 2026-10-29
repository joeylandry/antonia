import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { parseHash, verifyPasscode } from "@/lib/passcode";
import { getProfile } from "@/lib/data/profile";

export type Trainer = {
  displayName: string;
  timezone: string;
};

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-antonia_session" : "antonia_session";
const SESSION_DAYS = 30;

/** Brute-force limits: failed attempts allowed per 15 minutes, per address and for the whole site. */
export const LOGIN_WINDOW_MS = 15 * 60_000;
export const MAX_FAILURES_PER_IP = 5;
export const MAX_FAILURES_TOTAL = 10;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** The configured passcode hash, or null when missing or malformed (sign-in then always fails closed). */
export function configuredHash(): string | null {
  const v = process.env.PASSCODE_HASH?.trim();
  return v && parseHash(v) ? v : null;
}

/** Changes whenever the passcode changes, so every existing session ends with it. */
const passcodeId = (hash: string) => sha256(hash).slice(0, 32);

/**
 * The address the request came from. The rightmost X-Forwarded-For entry is the
 * one added by the proxy in front of the app; entries to its left are client-supplied.
 * Spoofing it only dodges the per-address limit, never the site-wide one.
 */
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return (fwd?.at(-1) ?? h.get("x-real-ip") ?? "unknown").slice(0, 64);
}

export type SignInResult = "ok" | "wrong" | "locked" | "not_configured";

export async function signIn(passcode: string): Promise<SignInResult> {
  const hash = configuredHash();
  if (!hash) return "not_configured";
  const db = getDb();
  const ip = await clientIp();
  const now = Date.now();

  db.prepare("delete from login_failures where at < ?").run(now - LOGIN_WINDOW_MS);
  const counts = db
    .prepare("select count(*) as total, sum(ip = ?) as mine from login_failures")
    .get(ip) as { total: number; mine: number | null };
  if (counts.total >= MAX_FAILURES_TOTAL || (counts.mine ?? 0) >= MAX_FAILURES_PER_IP) return "locked";

  // Count the attempt before checking it, so parallel requests can't slip past the limit
  // while scrypt runs; it is removed again only if the passcode is right.
  const { lastInsertRowid } = db.prepare("insert into login_failures (ip, at) values (?, ?)").run(ip, now);
  if (!(await verifyPasscode(passcode, hash))) return "wrong";
  db.prepare("delete from login_failures where rowid = ?").run(lastInsertRowid);

  const token = randomBytes(32).toString("base64url");
  const expires = now + SESSION_DAYS * 86_400_000;
  db.prepare("delete from auth_sessions where expires_at < ?").run(now);
  db.prepare("insert into auth_sessions (token_hash, passcode_id, created_at, expires_at) values (?, ?, ?, ?)").run(
    sha256(token),
    passcodeId(hash),
    now,
    expires,
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
  return "ok";
}

export async function signOut() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) getDb().prepare("delete from auth_sessions where token_hash = ?").run(sha256(token));
  store.delete(SESSION_COOKIE);
}

/** True when the request carries a live session for the current passcode. */
async function hasValidSession(): Promise<boolean> {
  const hash = configuredHash();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hash || !token || token.length > 100) return false;
  const row = getDb()
    .prepare("select passcode_id, expires_at from auth_sessions where token_hash = ?")
    .get(sha256(token)) as { passcode_id: string; expires_at: number } | undefined;
  return Boolean(row && row.expires_at > Date.now() && row.passcode_id === passcodeId(hash));
}

/** The signed-in owner's profile, or null. Checked against the server-side session store. */
export const getTrainer = cache(async (): Promise<Trainer | null> => {
  if (!(await hasValidSession())) return null;
  return getProfile();
});

/** Use at the top of every page, layout, route and server action that touches client data. */
export async function requireTrainer(): Promise<Trainer> {
  const trainer = await getTrainer();
  if (!trainer) redirect("/login");
  return trainer;
}
