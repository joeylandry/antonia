/**
 * Fills a LOCAL development database with fictional clients so the UI can be
 * exercised. Refuses to run against anything but localhost.
 *   DATABASE_URL=postgres://postgres@127.0.0.1:54329/antonia_dev \
 *     npm run db:seed:dev -- antonia@example.test
 * All people here are invented. Never run this against production.
 */
import postgres from "postgres";
import { addDays, todayIn } from "../lib/dates";

const url = process.env.DATABASE_URL ?? "";
const email = process.argv[2];
if (!/@(localhost|127\.0\.0\.1)(:|\/)/.test(url)) {
  console.error("Refusing to seed: DATABASE_URL is not a local database.");
  process.exit(1);
}
if (!email) {
  console.error("Usage: npm run db:seed:dev -- <trainer email>");
  process.exit(1);
}

const sql = postgres(url, { onnotice: () => {} });
const today = todayIn("America/New_York");

type S = { reps?: number; weight?: number; seconds?: number };
const rep = (n: number, reps: number, weight?: number): S[] => Array.from({ length: n }, () => ({ reps, ...(weight ? { weight } : {}) }));

async function main() {
  const [trainer] = await sql<{ id: string }[]>`select t.id from public.trainers t join auth.users u on u.id = t.id where u.email = ${email}`;
  if (!trainer) throw new Error(`No trainer for ${email}. Create the auth user first.`);
  const t = trainer.id;
  await sql`delete from public.clients where trainer_id = ${t}`;
  await sql`delete from public.exercises where trainer_id = ${t}`;

  const ex = new Map<string, string>();
  const exId = async (name: string) => {
    if (!ex.has(name)) {
      const [r] = await sql<{ id: string }[]>`insert into public.exercises (trainer_id, name) values (${t}, ${name}) returning id`;
      ex.set(name, r.id);
    }
    return ex.get(name)!;
  };

  const mk = async (c: Record<string, unknown>) => {
    const [r] = await sql<{ id: string }[]>`insert into public.clients ${sql({ trainer_id: t, ...c })} returning id`;
    return r.id;
  };
  const session = async (client: string, daysAgo: number, focus: string, entries: [string, S[], string?][], notes?: string) => {
    const [s] = await sql<{ id: string }[]>`
      insert into public.sessions (trainer_id, client_id, session_date, focus, notes)
      values (${t}, ${client}, ${addDays(today, -daysAgo)}, ${focus}, ${notes ?? null}) returning id`;
    let pos = 0;
    for (const [name, sets, n] of entries) {
      await sql`insert into public.session_entries (trainer_id, session_id, exercise_id, position, sets, notes)
                values (${t}, ${s.id}, ${await exId(name)}, ${pos++}, ${sql.json(sets)}, ${n ?? null})`;
    }
  };

  // A client modelled on the sample sheet: squat/bench targets and three varied sessions.
  const jordan = await mk({
    full_name: "Jordan Rivera", kind: "personal_training", primary_goal: "Squatting 180 by end of Oct, 250 by March; benching 130.",
    start_date: addDays(today, -21), assessment_date: addDays(today, -28), next_review_date: addDays(today, 9), session_length_min: 60, sessions_per_week: 2,
    health_notes: "Old left knee tweak; avoid deep lunges.",
  });
  await session(jordan, 21, "Lower Body", [["Goblet Squat", [{ reps: 12, weight: 24 }, { reps: 12, weight: 24 }], "Felt easy, focus on feet hips-width apart"], ["Dumbbell RDL", [{ reps: 12, weight: 15 }, { reps: 12, weight: 20 }], "Bending knees and letting gravity take you down"], ["Lateral Band Walk", [{ reps: 8 }, { reps: 8 }], "Orange band, steps farther with the right leg"]]);
  await session(jordan, 20, "Upper Body", [["Dumbbell Bench Press", [{ reps: 12, weight: 15 }, { reps: 14, weight: 15 }], "Good angles"], ["Seated Row", [{ reps: 12, weight: 25 }, { reps: 10, weight: 25 }, { reps: 5, weight: 55 }], "Shoulders rolled, good form"], ["High Plank", [{ seconds: 20 }, { seconds: 40 }], "20 seconds felt easy so we moved to 40s"]]);
  for (const [d, w] of [[14, 95], [10, 105], [7, 115], [3, 125]] as const) {
    await session(jordan, d, "Lower Body", [["Back Squat", [{ reps: 8, weight: w - 20 }, { reps: 5, weight: w }], "Depth improving"], ["Leg Press", rep(2, 12, 55 + (21 - d) * 2)]]);
  }
  await session(jordan, 5, "Upper Body", [["Dumbbell Bench Press", [{ reps: 10, weight: 25 }, { reps: 8, weight: 30 }]], ["Bench Press", [{ reps: 5, weight: 85 }, { reps: 5, weight: 95 }]]]);
  await session(jordan, 1, "Fundamentals / Full Body Day", [["Leg Press", [{ reps: 12, weight: 55 }, { reps: 12, weight: 70 }]], ["KB Deadlift", rep(2, 12, 32)], ["Heel Slides", rep(2, 10)], ["90/90s", rep(2, 10)], ["Cossack Squat", rep(2, 12)]]);
  const squat = await exId("Back Squat");
  await sql`insert into public.goals (trainer_id, client_id, kind, title, exercise_id, target_value, target_date) values
    (${t}, ${jordan}, 'lift', 'Squat 180 lb by end of October', ${squat}, 180, ${addDays(today, 4)}),
    (${t}, ${jordan}, 'lift', 'Squat 250 lb by March', ${squat}, 250, ${addDays(today, 130)}),
    (${t}, ${jordan}, 'lift', 'Bench 130 lb', ${await exId("Bench Press")}, 130, null)`;
  const [m] = await sql<{ id: string }[]>`insert into public.metrics (trainer_id, client_id, name, unit, direction) values (${t}, ${jordan}, 'Body weight', 'lb', 'neutral') returning id`;
  for (const [d, v] of [[21, 168.4], [14, 167.8], [7, 168.2], [1, 167.1]] as const) {
    await sql`insert into public.metric_entries (trainer_id, metric_id, entry_date, value) values (${t}, ${m.id}, ${addDays(today, -d)}, ${v})`;
  }
  await sql`insert into public.client_notes (trainer_id, client_id, body) values (${t}, ${jordan}, 'Prefers morning sessions. Training for a fall hiking trip.')`;

  const people: [string, string, string, string | null, number | null, number | null][] = [
    ["Casey Morgan", "personal_training", "active", "Building a shelf, losing weight, gaining strength.", 2, 8],
    ["Riley Chen", "personal_training", "active", "Getting stronger, getting back into lifting heavy.", -3, 30],
    ["Sam Okafor", "fitness_assessment", "active", "Preparing to hike the 4000 footers.", 6, null],
    ["Taylor Brooks", "personal_training", "on_hold", "Gaining strength, improving shoulder problems.", null, 40],
    ["Avery Nguyen", "fitness_assessment", "inactive", null, null, null],
    ["Morgan Delgado", "personal_training", "active", "Improving BMD, general strength.", 20, 3],
    ["Quinn Abernathy-Whitfield", "personal_training", "active", "A very long goal description to check how the layout handles a lot of text: build strength steadily, travel more, protect the lower back, and feel confident carrying groceries up three flights of stairs without stopping.", 12, 15],
  ];
  for (const [name, kind, status, goal, review, last] of people) {
    const id = await mk({ full_name: name, kind, status, primary_goal: goal, next_review_date: review == null ? null : addDays(today, review), assessment_date: addDays(today, -30) });
    if (last != null) {
      await session(id, last, "Full Body", [["Goblet Squat", rep(3, 10, 20)], ["Seated Row", rep(3, 10, 40)]]);
      await session(id, last + 7, "Full Body", [["Goblet Squat", rep(3, 10, 15)], ["Seated Row", rep(3, 10, 35)]]);
    }
  }
  console.log(`Seeded fictional data for ${email}.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => sql.end());
