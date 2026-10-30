import { beforeAll, beforeEach, afterAll } from "vitest";
import { connect, ensureSchema, setSqlForTests } from "@/lib/db/client";
import { DATA_TABLES } from "@/lib/db/schema";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/** Points the data layer at TEST_DATABASE_URL and empties every table before each test. */
export function setupTestDatabase() {
  const sql = TEST_DATABASE_URL ? connect(TEST_DATABASE_URL) : undefined;
  beforeAll(async () => {
    await ensureSchema(sql!);
    setSqlForTests(sql);
  });
  beforeEach(async () => {
    await sql!.unsafe(`truncate ${DATA_TABLES.join(", ")} cascade`);
    await sql!`update app.profile set display_name = '', timezone = 'America/New_York'`;
  });
  afterAll(async () => {
    setSqlForTests(undefined);
    await sql!.end();
  });
  return () => sql!;
}
