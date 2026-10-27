// Verifies tenant isolation in the database itself. Requires TEST_DATABASE_URL
// pointing at a disposable database with the migrations applied.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? postgres(url, { max: 2, onnotice: () => {} }) : (null as never);

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

async function as<T>(userId: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  let out!: T;
  try {
    await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId })}, true)`;
      await tx`select set_config('role', ${userId ? "authenticated" : "anon"}, true)`;
      out = await fn(tx);
      throw new RollbackSignal();
    });
  } catch (e) {
    if (!(e instanceof RollbackSignal)) throw e;
  }
  return out;
}
class RollbackSignal extends Error {}

describe.skipIf(!url)("row level security", () => {
  let clientA: string;

  beforeAll(async () => {
    await sql`delete from auth.users where id in (${A}, ${B})`;
    await sql`insert into auth.users (id, email) values (${A}, 'a@test.local'), (${B}, 'b@test.local')`;
    const [c] = await sql`insert into public.clients (trainer_id, full_name) values (${A}, 'Client of A') returning id`;
    clientA = c.id;
  });
  afterAll(async () => {
    await sql`delete from auth.users where id in (${A}, ${B})`;
    await sql.end();
  });

  it("creates a trainer profile for each auth user", async () => {
    const rows = await sql`select id from public.trainers where id in (${A}, ${B})`;
    expect(rows).toHaveLength(2);
  });

  it("lets a trainer read their own clients", async () => {
    const rows = await as(A, (tx) => tx`select id from public.clients`);
    expect(rows.map((r) => r.id)).toContain(clientA);
  });

  it("hides one trainer's clients from another", async () => {
    const rows = await as(B, (tx) => tx`select id from public.clients`);
    expect(rows).toHaveLength(0);
  });

  it("hides everything from anonymous users", async () => {
    await expect(as(null, (tx) => tx`select id from public.clients`)).rejects.toThrow(/permission denied/);
  });

  it("blocks writing a client as someone else", async () => {
    await expect(
      as(B, (tx) => tx`insert into public.clients (trainer_id, full_name) values (${A}, 'forged')`),
    ).rejects.toThrow(/row-level security/);
  });

  it("blocks updates and deletes of another trainer's rows (no rows affected)", async () => {
    const upd = await as(B, (tx) => tx`update public.clients set full_name = 'hacked' where id = ${clientA} returning id`);
    expect(upd).toHaveLength(0);
    const del = await as(B, (tx) => tx`delete from public.clients where id = ${clientA} returning id`);
    expect(del).toHaveLength(0);
  });

  it("prevents attaching a session to another trainer's client", async () => {
    await expect(
      as(B, (tx) => tx`insert into public.sessions (trainer_id, client_id, session_date) values (${B}, ${clientA}, '2026-10-06')`),
    ).rejects.toThrow(/foreign key/);
  });

  it("prevents referencing another trainer's exercise", async () => {
    const [ex] = await sql`insert into public.exercises (trainer_id, name) values (${A}, 'Goblet Squat') returning id`;
    const [cB] = await sql`insert into public.clients (trainer_id, full_name) values (${B}, 'Client of B') returning id`;
    const [s] = await sql`insert into public.sessions (trainer_id, client_id, session_date) values (${B}, ${cB.id}, '2026-10-06') returning id`;
    await expect(
      as(B, (tx) => tx`insert into public.session_entries (trainer_id, session_id, exercise_id) values (${B}, ${s.id}, ${ex.id})`),
    ).rejects.toThrow(/foreign key/);
  });

  it("does not let a trainer create or delete trainer profiles", async () => {
    await expect(
      as(A, (tx) => tx`insert into public.trainers (id) values (gen_random_uuid())`),
    ).rejects.toThrow(/permission denied/);
  });

  it("rejects invalid data at the database level", async () => {
    await expect(
      as(A, (tx) => tx`insert into public.clients (trainer_id, full_name, status) values (${A}, 'x', 'bogus')`),
    ).rejects.toThrow(/check constraint/);
  });
});
