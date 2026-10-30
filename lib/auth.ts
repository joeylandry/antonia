import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { withDb } from "@/lib/db/client";
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
  const ip = await clientIp();
  const now = new Date();
  const windowStart = new Date(now.getTime() - LOGIN_WINDOW_MS);

  // Count the attempt before checking it, so parallel requests (even on other
  // server instances) can't slip past the limit while scrypt runs. The advisory
  // lock makes check-and-record one step; the row is removed only if the passcode is right.
  const attemptId = await withDb(async (tx) => {
    await tx`select pg_advisory_xact_lock(7366160502)`;
    await tx`delete from app.login_failures where at < ${windowStart}`;
    const [c] = await tx<{ total: number; mine: number }[]>`
      select count(*)::int as total, count(*) filter (where ip = ${ip})::int as mine from app.login_failures`;
    if (c.total >= MAX_FAILURES_TOTAL || c.mine >= MAX_FAILURES_PER_IP) return null;
    const [row] = await tx<{ id: string }[]>`insert into app.login_failures (ip, at) values (${ip}, ${now}) returning id`;
    return row.id;
  });
  if (attemptId == null) return "locked";
  if (!(await verifyPasscode(passcode, hash))) return "wrong";

  const token = randomBytes(32).toString("base64url");
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await withDb(async (tx) => {
    await tx`delete from app.login_failures where id = ${attemptId}`;
    await tx`delete from app.auth_sessions where expires_at < ${now}`;
    await tx`insert into app.auth_sessions (token_hash, passcode_id, expires_at) values (${sha256(token)}, ${passcodeId(hash)}, ${expires})`;
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return "ok";
}

export async function signOut() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await withDb((tx) => tx`delete from app.auth_sessions where token_hash = ${sha256(token)}`);
  store.delete(SESSION_COOKIE);
}

/** True when the request carries a live session for the current passcode. */
async function hasValidSession(): Promise<boolean> {
  const hash = configuredHash();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hash || !token || token.length > 100) return false;
  const [row] = await withDb(
    (tx) => tx<{ passcode_id: string; expires_at: Date }[]>`
      select passcode_id, expires_at from app.auth_sessions where token_hash = ${sha256(token)}`,
  );
  return Boolean(row && row.expires_at.getTime() > Date.now() && row.passcode_id === passcodeId(hash));
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
