import { NextResponse } from "next/server";
import { getTrainer } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { listSessions } from "@/lib/data/sessions";
import { csvRow } from "@/lib/export";

/** A client's session log as CSV, one row per set, matching the paper/spreadsheet layout. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const trainer = await getTrainer();
  if (!trainer) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const client = await getClient(trainer.id, id);
  if (!client) return new NextResponse("Not found", { status: 404 });
  const sessions = (await listSessions(trainer.id, id)).reverse();

  const lines = [csvRow(["Session date", "Workout / focus", "Exercise", "Set", "Reps", "Weight (lb)", "Seconds", "Notes / progress"])];
  for (const s of sessions) {
    for (const e of s.entries) {
      const sets = e.sets.length ? e.sets : [{}];
      sets.forEach((set, i) =>
        lines.push(csvRow([s.sessionDate, s.focus, e.exerciseName, i + 1, (set as { reps?: number }).reps, (set as { weight?: number }).weight, (set as { seconds?: number }).seconds, i === 0 ? e.notes : ""])),
      );
    }
  }
  const safeName = client.fullName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "client";
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${safeName}-sessions.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
