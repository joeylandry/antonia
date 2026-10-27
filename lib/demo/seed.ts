/**
 * Deterministic sample data for demo mode: a trainer's roster with 3 to 12 months of
 * believable progress. Pure and seeded, so every server instance (and every test run)
 * produces exactly the same people and numbers, shifted to end at "today".
 * Everyone here is invented.
 */
import { addDays, daysBetween } from "@/lib/dates";
import { topWeight } from "@/lib/domain/progress";
import type { Client, ClientNote, Exercise, Goal, Metric, MetricEntry, SetEntry, WorkoutSession } from "@/lib/domain/types";

export type SeedData = {
  clients: Client[];
  exercises: Exercise[];
  sessions: WorkoutSession[];
  goals: Goal[];
  metrics: { metric: Metric; entries: MetricEntry[] }[];
  notes: ClientNote[];
};

/* ---- tiny seeded PRNG ------------------------------------------------------ */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
/** A valid RFC 4122 version-4 UUID drawn from the seeded generator. */
const uuid = (rnd: () => number) => {
  const hex = Array.from({ length: 4 }, () => Math.floor(rnd() * 0x100000000).toString(16).padStart(8, "0")).join("");
  const variant = "89ab"[parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

/* ---- program definitions --------------------------------------------------- */
type Lift = { kind: "lift"; name: string; start: number; perWeek: number; step?: number; reps?: number[] };
type Hold = { kind: "hold"; name: string; start: number; perWeek: number; cap: number };
type Body = { kind: "body"; name: string; reps: number; sets: number };
type Item = Lift | Hold | Body;
type Program = { focus: string; items: Item[] };

const lift = (name: string, start: number, perWeek: number, reps?: number[], step = 5): Lift => ({ kind: "lift", name, start, perWeek, reps, step });
const hold = (name: string, start: number, perWeek: number, cap = 90): Hold => ({ kind: "hold", name, start, perWeek, cap });
const body = (name: string, reps: number, sets = 2): Body => ({ kind: "body", name, reps, sets });

type MetricSpec = { name: string; unit: string; direction: Metric["direction"]; start: number; perWeek: number; noise: number; everyDays: number; decimals?: number };
type GoalSpec =
  | { type: "achieved"; exercise: string; fraction?: number }
  | { type: "active"; exercise: string; target?: number; dueIn: number; fraction?: number }
  | { type: "general"; title: string; dueIn?: number; status?: "active" | "achieved" };

type Profile = {
  name: string;
  kind?: Client["kind"];
  status?: Client["status"];
  archived?: boolean;
  goal: string | null;
  health?: string;
  email?: string;
  weeks: number; // length of history in weeks
  endAgo: number; // days since last session
  perWeek: number; // sessions per week (1, 1.5, 2, 3)
  adherence: number;
  length: number; // minutes
  programs: Program[];
  metrics?: MetricSpec[];
  goals?: GoalSpec[];
  review: number | null; // next review, days from today
  notes?: string[];
  vacation?: boolean;
};

const lowerA: Program = {
  focus: "Lower Body",
  items: [lift("Back Squat", 95, 1.6, [8, 8, 6]), lift("Romanian Deadlift", 75, 1.3, [10, 10, 8]), lift("Leg Press", 140, 3, [12, 12, 10], 10), body("Lateral Band Walk", 12), hold("Side Plank", 20, 0.8, 60)],
};
const upperA: Program = {
  focus: "Upper Body",
  items: [lift("Bench Press", 75, 1.2, [8, 8, 6]), lift("Seated Row", 70, 1.4, [10, 10, 8]), lift("Dumbbell Shoulder Press", 20, 0.35, [10, 10, 8], 2.5), lift("Lat Pulldown", 80, 1.5, [10, 10, 8]), hold("High Plank", 25, 1, 90)],
};
const fullA: Program = {
  focus: "Full Body",
  items: [lift("Goblet Squat", 25, 0.45, [12, 12, 10], 2.5), lift("Dumbbell Bench Press", 20, 0.4, [10, 10, 8], 2.5), lift("Seated Row", 60, 1.2, [12, 10, 10]), body("Dead Bug", 10), hold("High Plank", 20, 1, 75)],
};
const fullB: Program = {
  focus: "Fundamentals / Full Body Day",
  items: [lift("Leg Press", 120, 3, [12, 12, 10], 10), lift("KB Deadlift", 30, 0.6, [12, 12, 10], 2.5), lift("Lat Pulldown", 65, 1.2, [10, 10, 10]), body("Heel Slides", 10), body("90/90s", 10), body("Cossack Squat", 10)],
};
// Jordan's squat and bench climb faster so the 180 lb / 130 lb goals look close.
const lowerJ: Program = { ...lowerA, items: lowerA.items.map((i) => (i.name === "Back Squat" ? lift("Back Squat", 95, 3.1, [8, 8, 6]) : i)) };
const upperJ: Program = { ...upperA, items: upperA.items.map((i) => (i.name === "Bench Press" ? lift("Bench Press", 75, 2, [8, 8, 6]) : i)) };

const strengthLower: Program = {
  focus: "Lower Body",
  items: [lift("Back Squat", 135, 2, [5, 5, 5]), lift("Trap Bar Deadlift", 155, 2.4, [5, 5, 3]), lift("Hip Thrust", 135, 2.6, [10, 10, 8]), lift("Split Squat", 25, 0.6, [10, 10, 8], 2.5)],
};
const strengthUpper: Program = {
  focus: "Upper Body",
  items: [lift("Bench Press", 105, 1.5, [5, 5, 5]), lift("Barbell Row", 95, 1.6, [8, 8, 8]), lift("Overhead Press", 65, 0.9, [6, 6, 5]), lift("Dumbbell Lat Raise", 10, 0.2, [12, 12, 10], 2.5), body("Thread the Needle", 8)],
};
const rehab: Program = {
  focus: "Rehab Strength",
  items: [lift("Leg Press", 60, 2.2, [12, 12, 12], 5), lift("Step Up", 10, 0.5, [10, 10, 10], 2.5), body("Heel Slides", 12), body("Glute Bridge", 12, 3), hold("Single Leg Balance", 15, 1, 60)],
};
const boneLoad: Program = {
  focus: "Bone Loading",
  items: [lift("Goblet Squat", 20, 0.5, [10, 10, 8], 2.5), lift("Dumbbell Deadlift", 25, 0.7, [8, 8, 8], 2.5), lift("Overhead Press", 25, 0.3, [8, 8, 6], 2.5), lift("Farmer Carry", 40, 0.8, [3, 3, 3], 5), body("Heel Drops", 15)],
};

const PROFILES: Profile[] = [
  {
    name: "Jordan Rivera", goal: "Squatting 180 by end of Oct, 250 by March; benching 130.", health: "Old left knee tweak; avoid deep lunges.", email: "jordan.rivera@example.com",
    weeks: 26, endAgo: 1, perWeek: 2, adherence: 0.92, length: 60, programs: [lowerJ, upperJ, fullB], review: 9, vacation: true,
    goals: [{ type: "active", exercise: "Back Squat", target: 180, dueIn: 4 }, { type: "active", exercise: "Back Squat", target: 250, dueIn: 130 }, { type: "active", exercise: "Bench Press", target: 130, dueIn: 60 }, { type: "achieved", exercise: "Leg Press", fraction: 0.8 }],
    metrics: [{ name: "Body weight", unit: "lb", direction: "neutral", start: 171, perWeek: -0.15, noise: 1.2, everyDays: 7, decimals: 1 }],
    notes: ["Prefers morning sessions. Training for a fall hiking trip.", "Knee felt good on step-downs. Add more single-leg work.", "Asked about nutrition basics. Sent the protein guide."],
  },
  {
    name: "Casey Morgan", goal: "Building a shelf, losing weight, gaining strength.", health: "Lower back stiffness after long desk days.", email: "casey.morgan@example.com",
    weeks: 52, endAgo: 8, perWeek: 2, adherence: 0.88, length: 45, programs: [fullA, fullB], review: 2, vacation: true,
    goals: [{ type: "achieved", exercise: "Goblet Squat", fraction: 0.85 }, { type: "active", exercise: "Seated Row", dueIn: 40 }, { type: "general", title: "Lose 15 lb", dueIn: 70 }],
    metrics: [{ name: "Body weight", unit: "lb", direction: "down", start: 198, perWeek: -0.38, noise: 1.5, everyDays: 7, decimals: 1 }, { name: "Waist", unit: "in", direction: "down", start: 40, perWeek: -0.06, noise: 0.25, everyDays: 28, decimals: 1 }],
    notes: ["Wants to hit 15 lb down by the new year.", "Great month: only missed one session.", "Back felt much better after adding dead bugs.", "Travelling for work next week; sent a hotel-room routine."],
  },
  {
    name: "Riley Chen", goal: "Getting stronger, getting back into lifting heavy. Bench press and squat.", weeks: 40, endAgo: 31, perWeek: 2, adherence: 0.8, length: 60, programs: [strengthLower, strengthUpper], review: -3,
    goals: [{ type: "achieved", exercise: "Back Squat", fraction: 0.8 }, { type: "active", exercise: "Bench Press", dueIn: -10 }], notes: ["Busy season at work, sessions have dropped off. Check in.", "Hit a bench PR and was thrilled."], vacation: true,
    metrics: [{ name: "Body weight", unit: "lb", direction: "up", start: 154, perWeek: 0.07, noise: 1, everyDays: 14, decimals: 1 }],
  },
  {
    name: "Morgan Delgado", goal: "Improving BMD, general strength.", health: "Osteopenia in the hip. Avoid heavy spinal flexion.", weeks: 52, endAgo: 3, perWeek: 1, adherence: 0.93, length: 45, programs: [boneLoad, fullA], review: 20,
    goals: [{ type: "achieved", exercise: "Dumbbell Deadlift", fraction: 0.85 }, { type: "active", exercise: "Farmer Carry", dueIn: 45 }],
    metrics: [{ name: "Resting heart rate", unit: "bpm", direction: "down", start: 74, perWeek: -0.1, noise: 2, everyDays: 14, decimals: 0 }],
    notes: ["DEXA scan scheduled for March. Keep loading progressive.", "Loves the farmer carries."],
  },
  {
    name: "Quinn Abernathy-Whitfield", goal: "Build strength steadily, travel more, protect the lower back, and feel confident carrying groceries up three flights of stairs without stopping.", weeks: 36, endAgo: 16, perWeek: 2, adherence: 0.84, length: 45, programs: [fullA, lowerA, upperA], review: 12,
    goals: [{ type: "achieved", exercise: "Seated Row", fraction: 0.85 }, { type: "active", exercise: "Back Squat", dueIn: 30 }], notes: ["Away for two weeks in September, eased back in well."], vacation: true,
  },
  { name: "Sam Okafor", kind: "fitness_assessment", goal: "Preparing to hike the 4000 footers.", weeks: 0, endAgo: 0, perWeek: 0, adherence: 0, length: 60, programs: [], review: 6, notes: ["Assessment done; wants to start PT in the beginning of November."] },
  {
    name: "Taylor Brooks", status: "on_hold", goal: "Gaining strength, improving shoulder problems.", health: "Right shoulder impingement; no overhead pressing for now.", weeks: 30, endAgo: 42, perWeek: 2, adherence: 0.82, length: 45,
    programs: [strengthLower, { ...strengthUpper, items: strengthUpper.items.filter((i) => i.name !== "Overhead Press") }], review: null, notes: ["On hold while travelling for work; back in December."],
  },
  { name: "Avery Nguyen", kind: "fitness_assessment", status: "inactive", goal: null, weeks: 14, endAgo: 71, perWeek: 1, adherence: 0.8, length: 30, programs: [fullA], review: null, notes: ["Stopped after the trial block; not interested for now."] },
  {
    name: "Priya Raman", goal: "Strength base for marathon training: single-leg strength and core.", weeks: 20, endAgo: 2, perWeek: 2, adherence: 0.95, length: 45, programs: [strengthLower, fullA], review: 15,
    goals: [{ type: "achieved", exercise: "Hip Thrust", fraction: 0.8 }, { type: "active", exercise: "Split Squat", dueIn: 25 }],
    metrics: [{ name: "Body weight", unit: "lb", direction: "neutral", start: 133, perWeek: 0, noise: 1, everyDays: 14, decimals: 1 }], notes: ["Marathon is in April; keep volume moderate in the last 3 weeks."],
  },
  {
    name: "Devon Park", goal: "Gain muscle, bench 185.", weeks: 13, endAgo: 1, perWeek: 3, adherence: 0.94, length: 60, programs: [strengthUpper, strengthLower, fullA], review: 25,
    goals: [{ type: "active", exercise: "Bench Press", target: 185, dueIn: 70 }, { type: "achieved", exercise: "Barbell Row", fraction: 0.85 }],
    metrics: [{ name: "Body weight", unit: "lb", direction: "up", start: 158, perWeek: 0.45, noise: 1.2, everyDays: 7, decimals: 1 }], notes: ["Eating in a surplus; weight trending up nicely."],
  },
  {
    name: "Elena Rossi", goal: "Rebuild leg strength after knee surgery and get back to hiking.", health: "ACL reconstruction (left), 9 months post-op. Cleared for loaded squats to 90 degrees.", weeks: 48, endAgo: 5, perWeek: 1.5, adherence: 0.92, length: 45,
    programs: [rehab, { ...lowerA, items: lowerA.items.map((i) => (i.name === "Back Squat" ? lift("Box Squat", 55, 1.9, [8, 8, 6]) : i)) }, upperA], review: 4,
    goals: [{ type: "achieved", exercise: "Leg Press", fraction: 0.7 }, { type: "active", exercise: "Box Squat", dueIn: 50 }, { type: "general", title: "Hike Mount Monadnock", dueIn: 120 }],
    metrics: [{ name: "Thigh circumference (L)", unit: "in", direction: "up", start: 18.5, perWeek: 0.03, noise: 0.15, everyDays: 28, decimals: 1 }], notes: ["PT cleared her for box squats. Go slowly on depth.", "Walked 5 miles over the weekend with no swelling."],
  },
  {
    name: "Marcus Bell", archived: true, goal: "Deadlift 315 lb.", weeks: 52, endAgo: 60, perWeek: 2, adherence: 0.86, length: 60, programs: [strengthLower, strengthUpper], review: null,
    goals: [{ type: "achieved", exercise: "Trap Bar Deadlift", fraction: 0.9 }], notes: ["Moved out of state. Archived with full history; welcome back any time."], vacation: true,
  },
  {
    name: "Hannah Weiss", goal: "Feel stronger and more confident in the gym.", weeks: 12, endAgo: 4, perWeek: 2, adherence: 0.9, length: 45, programs: [fullA, fullB], review: 30,
    goals: [{ type: "active", exercise: "Goblet Squat", dueIn: 35 }], metrics: [{ name: "Body weight", unit: "lb", direction: "neutral", start: 142, perWeek: -0.1, noise: 0.8, everyDays: 14, decimals: 1 }], notes: ["New to lifting; focus on confidence and form."],
  },
];

const EX_NOTES = ["Form looked great.", "Moved up in weight.", "Felt easy, bump up next time.", "Slow tempo on the way down.", "Struggled on the last rep.", "Great depth today.", "Keep chest up.", "Added a pause at the bottom.", "Felt strong, clean reps.", "Slight discomfort, kept the range shorter."];
const SESSION_NOTES = ["Low energy today, kept it lighter.", "Great session, in a good mood.", "Eased back in after a few days off.", "Short on time, trimmed accessories.", "Hit a new best on the main lift!", "Sore from the weekend, warmed up longer."];

const round = (n: number, step: number) => Math.round(n / step) * step;
const clean = (n: number) => Math.round(n * 100) / 100;

export function buildSeed(today: string): SeedData {
  const out: SeedData = { clients: [], exercises: [], sessions: [], goals: [], metrics: [], notes: [] };
  const exId = new Map<string, Exercise>();
  const idRnd = mulberry32(20261027);
  const ex = (name: string) => {
    let e = exId.get(name.toLowerCase());
    if (!e) {
      e = { id: uuid(idRnd), name };
      exId.set(name.toLowerCase(), e);
      out.exercises.push(e);
    }
    return e;
  };

  for (const p of PROFILES) {
    const rnd = mulberry32(hash(p.name));
    const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
    const lastDay = addDays(today, -p.endAgo);
    const startDay = p.weeks ? addDays(lastDay, -p.weeks * 7 + 3) : null;
    const clientId = uuid(idRnd);
    const sessions: WorkoutSession[] = [];
    const bestSoFar = new Map<string, number>();

    // vacation window (2 weeks) somewhere in the middle of long histories
    const vac = p.vacation && p.weeks >= 20 ? { from: Math.floor(p.weeks * (0.35 + rnd() * 0.3)), len: 2 } : null;

    if (startDay) {
      let n = 0;
      for (let w = 0; w < p.weeks; w++) {
        if (vac && w >= vac.from && w < vac.from + vac.len) continue;
        const perThisWeek = p.perWeek === 1.5 ? (w % 2 === 0 ? 2 : 1) : Math.round(p.perWeek);
        const offsets = perThisWeek === 1 ? [2] : perThisWeek === 2 ? [0, 3] : [0, 2, 4];
        for (const off of offsets) {
          if (rnd() > p.adherence) continue;
          const date = addDays(startDay, w * 7 + off + (rnd() < 0.3 ? 1 : 0));
          if (date > lastDay) continue;
          const program = p.programs[n % p.programs.length];
          n++;
          const deload = (w + 1) % 8 === 0 ? 0.9 : 1;
          const items = program.items.filter((_, i) => i === 0 || rnd() > 0.12);
          const entries = items.map((it, position) => {
            let sets: SetEntry[];
            let note: string | null = rnd() < 0.12 ? pick(EX_NOTES) : null;
            if (it.kind === "lift") {
              const step = it.step ?? 5;
              const raw = (it.start + it.perWeek * Math.pow(w + 1, 0.92)) * deload + (rnd() < 0.25 ? (rnd() < 0.5 ? -step : step) : 0);
              const top = Math.max(step, round(raw, step));
              const reps = it.reps ?? [10, 10, 8];
              sets = reps.map((r, i) => ({ reps: r, weight: i === reps.length - 1 ? top : Math.max(step, round(top * (0.82 + 0.09 * i), step)) }));
              const prev = bestSoFar.get(it.name) ?? 0;
              if (top > prev) {
                if (prev > 0 && rnd() < 0.3) note = "New best, nice work.";
                bestSoFar.set(it.name, top);
              }
            } else if (it.kind === "hold") {
              const s = Math.min(it.cap, Math.round(it.start + it.perWeek * (w + 1) + (rnd() < 0.3 ? -3 : 0)));
              sets = [{ seconds: s }, { seconds: s }];
            } else {
              sets = Array.from({ length: it.sets }, () => ({ reps: it.reps }));
            }
            return { id: uuid(idRnd), exerciseId: ex(it.name).id, exerciseName: it.name, position, sets, notes: note };
          });
          sessions.push({ id: uuid(idRnd), clientId, sessionDate: date, focus: program.focus, notes: rnd() < 0.08 ? pick(SESSION_NOTES) : null, entries });
        }
      }
    }
    sessions.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
    out.sessions.push(...sessions);

    const created = new Date(`${addDays(startDay ?? addDays(today, -6), -7)}T15:00:00Z`);
    const client: Client = {
      id: clientId,
      fullName: p.name,
      kind: p.kind ?? "personal_training",
      status: p.status ?? "active",
      primaryGoal: p.goal,
      healthNotes: p.health ?? null,
      email: p.email ?? null,
      phone: null,
      startDate: startDay ? sessions[0]?.sessionDate ?? startDay : null,
      assessmentDate: addDays(startDay ?? addDays(today, -6), -7),
      nextReviewDate: p.review == null ? null : addDays(today, p.review),
      lastReviewedOn: p.weeks >= 12 ? addDays(today, -Math.min(60, 20 + Math.floor(rnd() * 30))) : null,
      sessionLengthMin: p.length,
      sessionsPerWeek: p.perWeek || null,
      archivedAt: p.archived ? new Date(`${addDays(today, -45)}T15:00:00Z`) : null,
      createdAt: created,
    };
    out.clients.push(client);

    // goals ------------------------------------------------------------------
    const topSeries = (name: string) =>
      sessions.flatMap((s) => s.entries.filter((e) => e.exerciseName === name).map((e) => ({ date: s.sessionDate, top: topWeight(e.sets) ?? 0 })));
    for (const g of p.goals ?? []) {
      if (g.type === "general") {
        out.goals.push({ id: uuid(idRnd), clientId, kind: "general", title: g.title, exerciseId: null, exerciseName: null, targetValue: null, targetDate: g.dueIn != null ? addDays(today, g.dueIn) : null, status: g.status ?? "active", achievedOn: null });
        continue;
      }
      const series = topSeries(g.exercise);
      const best = series.length ? Math.max(...series.map((s) => s.top)) : 0;
      if (!best) continue;
      const exercise = ex(g.exercise);
      if (g.type === "achieved") {
        const target = Math.max(5, Math.floor((best * (g.fraction ?? 0.85)) / 5) * 5);
        const hit = series.find((s) => s.top >= target)!;
        out.goals.push({ id: uuid(idRnd), clientId, kind: "lift", title: `${g.exercise} ${target} lb`, exerciseId: exercise.id, exerciseName: exercise.name, targetValue: target, targetDate: addDays(hit.date, 10), status: "achieved", achievedOn: hit.date });
      } else {
        const target = g.target ?? Math.ceil((best * (g.fraction ?? 1.1)) / 5) * 5;
        out.goals.push({ id: uuid(idRnd), clientId, kind: "lift", title: `${g.exercise} ${target} lb`, exerciseId: exercise.id, exerciseName: exercise.name, targetValue: target, targetDate: addDays(today, g.dueIn), status: "active", achievedOn: null });
      }
    }

    // measurements -----------------------------------------------------------
    for (const m of p.metrics ?? []) {
      const metric: Metric = { id: uuid(idRnd), clientId, name: m.name, unit: m.unit, direction: m.direction };
      const entries: MetricEntry[] = [];
      const first = startDay ?? addDays(today, -28);
      const total = daysBetween(first, lastDay);
      for (let d = 0; d <= total; d += m.everyDays) {
        const value = m.start + (m.perWeek * d) / 7 + (rnd() - 0.5) * 2 * m.noise;
        const dp = m.decimals ?? 1;
        entries.push({ id: uuid(idRnd), metricId: metric.id, entryDate: addDays(first, d), value: Number(value.toFixed(dp)), note: null });
      }
      out.metrics.push({ metric, entries });
    }

    // notes spread across the history ------------------------------------------
    (p.notes ?? []).forEach((body, i, arr) => {
      const span = startDay ? daysBetween(startDay, lastDay) : 5;
      const day = addDays(startDay ?? addDays(today, -5), Math.round((span * (i + 0.5)) / arr.length));
      out.notes.push({ id: uuid(idRnd), clientId, body, createdAt: new Date(`${day}T14:${String(10 + i * 7).padStart(2, "0")}:00Z`) });
    });
    void clean;
  }
  return out;
}
