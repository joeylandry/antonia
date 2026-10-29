import { NextResponse } from "next/server";
import { getTrainer } from "@/lib/auth";
import { exportAll } from "@/lib/data/profile";

export async function GET() {
  const trainer = await getTrainer();
  if (!trainer) return new NextResponse("Unauthorized", { status: 401 });
  const data = await exportAll();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="antonia-export-${stamp}.json"`,
      "cache-control": "private, no-store",
    },
  });
}
