import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA } from "../../lib/db/schema";

/** Starts every run from an empty data file whose profile has a known name. */
export default async function globalSetup() {
  const dir = process.env.E2E_DATA_DIR!;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(join(dir, "antonia.db"));
  db.exec(SCHEMA);
  db.prepare("update profile set display_name = ? where id = 1").run("Antonia Test");
  db.close();
}
