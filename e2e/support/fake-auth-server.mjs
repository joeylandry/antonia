/**
 * TEST-ONLY stand-in for the small slice of Supabase Auth (GoTrue) that this app
 * calls: password sign-in, sign-out, session refresh, user lookup, password
 * recovery (token-hash flow) and password update. It lets the end-to-end suite run
 * without Docker or a hosted Supabase project. It is NOT a security component and is
 * never used outside tests; production uses real Supabase Auth.
 *
 *   FAKE_AUTH_DB=postgres://... FAKE_AUTH_PORT=54399 node e2e/support/fake-auth-server.mjs
 */
import { createServer } from "node:http";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import postgres from "postgres";

const PORT = Number(process.env.FAKE_AUTH_PORT ?? 54399);
const SECRET = process.env.FAKE_AUTH_JWT_SECRET ?? "test-only-secret-test-only-secret-00";
const sql = postgres(process.env.FAKE_AUTH_DB, { onnotice: () => {} });

const refreshTokens = new Map(); // token -> userId
const recoveryTokens = new Map(); // token_hash -> userId
const outbox = []; // [{ email, token_hash }]

const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
function sign(payload) {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  const sig = createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
function verify(token) {
  const [h, b, s] = (token ?? "").split(".");
  if (!h || !b || !s) return null;
  const expect = createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url");
  if (expect.length !== s.length || !timingSafeEqual(Buffer.from(expect), Buffer.from(s))) return null;
  const payload = JSON.parse(Buffer.from(b, "base64url").toString());
  return payload.exp * 1000 > Date.now() ? payload : null;
}
function hash(password) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 32).toString("hex")}`;
}
function check(password, stored) {
  const [salt, key] = stored.split(":");
  const test = scryptSync(password, Buffer.from(salt, "hex"), 32);
  return timingSafeEqual(test, Buffer.from(key, "hex"));
}
const userJson = (u) => ({
  id: u.id,
  aud: "authenticated",
  role: "authenticated",
  email: u.email,
  email_confirmed_at: u.email_confirmed_at,
  app_metadata: { provider: "email" },
  user_metadata: u.raw_user_meta_data ?? {},
  created_at: u.created_at,
});
function session(u) {
  const now = Math.floor(Date.now() / 1000);
  const refresh = randomBytes(16).toString("hex");
  refreshTokens.set(refresh, u.id);
  return {
    access_token: sign({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", iat: now, exp: now + 3600, session_id: randomUUID() }),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: refresh,
    user: userJson(u),
  };
}
async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch { return {}; }
}
const bearer = (req) => (req.headers.authorization ?? "").replace(/^Bearer /i, "");

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const send = (status, data) => {
    res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" });
    res.end(data === undefined ? "" : JSON.stringify(data));
  };
  if (req.method === "OPTIONS") return send(204);

  try {
    // ---- test hooks ----------------------------------------------------
    if (url.pathname === "/__test/users" && req.method === "POST") {
      const { email, password, displayName = "" } = await body(req);
      await sql`delete from auth.users where email = ${email}`;
      const [u] = await sql`insert into auth.users (email, encrypted_password, raw_user_meta_data)
        values (${email}, ${hash(password)}, ${sql.json({ display_name: displayName })}) returning id`;
      return send(200, { id: u.id });
    }
    if (url.pathname === "/__test/outbox") return send(200, outbox);

    // ---- auth API ---------------------------------------------------------
    if (url.pathname === "/auth/v1/token" && req.method === "POST") {
      const grant = url.searchParams.get("grant_type");
      const data = await body(req);
      if (grant === "password") {
        const [u] = await sql`select * from auth.users where email = ${String(data.email).toLowerCase()}`;
        if (!u || !u.encrypted_password || !check(String(data.password), u.encrypted_password)) {
          return send(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
        }
        return send(200, session(u));
      }
      if (grant === "refresh_token") {
        const userId = refreshTokens.get(data.refresh_token);
        if (!userId) return send(400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
        refreshTokens.delete(data.refresh_token);
        const [u] = await sql`select * from auth.users where id = ${userId}`;
        return send(200, session(u));
      }
    }
    if (url.pathname === "/auth/v1/user") {
      const claims = verify(bearer(req));
      if (!claims) return send(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
      const [u] = await sql`select * from auth.users where id = ${claims.sub}`;
      if (!u) return send(401, { code: 401, error_code: "user_not_found", msg: "User not found" });
      if (req.method === "GET") return send(200, userJson(u));
      if (req.method === "PUT") {
        const data = await body(req);
        if (data.password) await sql`update auth.users set encrypted_password = ${hash(data.password)} where id = ${u.id}`;
        return send(200, userJson(u));
      }
    }
    if (url.pathname === "/auth/v1/logout") return send(204);
    if (url.pathname === "/auth/v1/recover" && req.method === "POST") {
      const { email } = await body(req);
      const [u] = await sql`select id from auth.users where email = ${String(email).toLowerCase()}`;
      if (u) {
        const token_hash = randomBytes(16).toString("hex");
        recoveryTokens.set(token_hash, u.id);
        outbox.push({ email, token_hash });
      }
      return send(200, {});
    }
    if (url.pathname === "/auth/v1/verify" && req.method === "POST") {
      const { token_hash } = await body(req);
      const userId = recoveryTokens.get(token_hash);
      if (!userId) return send(403, { code: 403, error_code: "otp_expired", msg: "Email link is invalid or has expired" });
      recoveryTokens.delete(token_hash);
      const [u] = await sql`select * from auth.users where id = ${userId}`;
      return send(200, session(u));
    }
    send(404, { msg: "not found" });
  } catch (err) {
    console.error(err);
    send(500, { msg: String(err) });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`fake auth listening on ${PORT}`));
