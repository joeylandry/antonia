import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/demo/seed";
import { daysBetween } from "@/lib/dates";

const TODAY = "2026-10-27";

describe("demo sample data", () => {
  const a = buildSeed(TODAY);

  it("is deterministic, so every server instance shows the same people and numbers", () => {
    expect(JSON.stringify(buildSeed(TODAY))).toBe(JSON.stringify(a));
  });

  it("fills the roster: many clients, up to a year of history", () => {
    expect(a.clients.length).toBeGreaterThanOrEqual(12);
    expect(a.sessions.length).toBeGreaterThan(500);
    const first = a.sessions.map((s) => s.sessionDate).sort()[0];
    expect(daysBetween(first, TODAY)).toBeGreaterThan(330);
    const perClient = a.clients.map((c) => a.sessions.filter((s) => s.clientId === c.id).length);
    expect(perClient.filter((n) => n >= 60).length).toBeGreaterThanOrEqual(3); // year-long clients
    expect(perClient.filter((n) => n >= 18 && n <= 40).length).toBeGreaterThanOrEqual(2); // ~3-6 months
  });

  it("never invents sessions in the future or before a client's start", () => {
    for (const s of a.sessions) expect(s.sessionDate <= TODAY).toBe(true);
    for (const c of a.clients) {
      const mine = a.sessions.filter((s) => s.clientId === c.id);
      if (c.startDate) expect(mine.every((s) => s.sessionDate >= c.startDate!)).toBe(true);
    }
  });

  it("shows realistic progression: top weight rises over the history", () => {
    const jordan = a.clients.find((c) => c.fullName === "Jordan Rivera")!;
    const squats = a.sessions
      .filter((s) => s.clientId === jordan.id)
      .flatMap((s) => s.entries.filter((e) => e.exerciseName === "Back Squat").map((e) => Math.max(...e.sets.map((x) => x.weight ?? 0))));
    expect(squats.length).toBeGreaterThan(10);
    expect(squats.at(-1)!).toBeGreaterThan(squats[0] + 30);
    expect(squats.at(-1)!).toBeLessThan(180); // the 180 lb goal is still open
  });

  it("covers every state the UI has to show", () => {
    expect(a.clients.some((c) => c.status === "on_hold")).toBe(true);
    expect(a.clients.some((c) => c.status === "inactive")).toBe(true);
    expect(a.clients.some((c) => c.archivedAt)).toBe(true);
    expect(a.clients.some((c) => c.kind === "fitness_assessment" && !a.sessions.some((s) => s.clientId === c.id))).toBe(true);
    expect(a.goals.some((g) => g.status === "achieved")).toBe(true);
    expect(a.goals.some((g) => g.status === "active" && g.targetDate! < TODAY)).toBe(true);
    expect(a.goals.some((g) => g.status === "active" && g.targetDate! >= TODAY && daysBetween(TODAY, g.targetDate!) <= 21)).toBe(true);
    expect(a.clients.some((c) => c.nextReviewDate && c.nextReviewDate < TODAY)).toBe(true);
    expect(a.metrics.length).toBeGreaterThanOrEqual(6);
    expect(a.notes.length).toBeGreaterThanOrEqual(15);
  });

  it("uses valid UUIDs everywhere (the app rejects anything else)", () => {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const ids = [...a.clients, ...a.exercises, ...a.sessions, ...a.goals, ...a.notes, ...a.metrics.map((m) => m.metric), ...a.sessions.flatMap((s) => s.entries)].map((x) => x.id);
    expect(ids.every((id) => uuidRe.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is internally consistent", () => {
    const clientIds = new Set(a.clients.map((c) => c.id));
    const exIds = new Set(a.exercises.map((e) => e.id));
    expect(new Set(a.clients.map((c) => c.id)).size).toBe(a.clients.length);
    expect(new Set(a.sessions.map((s) => s.id)).size).toBe(a.sessions.length);
    for (const s of a.sessions) {
      expect(clientIds.has(s.clientId)).toBe(true);
      for (const e of s.entries) expect(exIds.has(e.exerciseId)).toBe(true);
    }
    for (const g of a.goals) {
      expect(clientIds.has(g.clientId)).toBe(true);
      if (g.kind === "lift") expect(exIds.has(g.exerciseId!)).toBe(true);
    }
  });
});
