# Discovery: what Antonia tracks today, and what the app does about it

Source: two phone photos of Antonia's Excel workbook (rotated, partly redacted). Everything under
**Shown** is read directly from the photos. Everything under **Inferred** is a judgement call and is
labelled as one. Client names were blacked out in the photos and nothing here reproduces them.

## The workbook

### Sheet 1: "Personal Training & Fitness Assessment Tracker" (one row per client)

**Shown**

| Column | What it holds |
| --- | --- |
| Client Name | (redacted) |
| Client Type | `Fitness Assessment` or `Personal Training` |
| Assessment Date | Dates between mid-Aug and mid-Oct 2026 |
| Review Date | A follow-up date; in several rows the cell also carries a short note such as `on hold`, `inactive`, `30min`, `30min 2x/week`, `wants to start PT in beginning of Nov` |
| Primary Goal / Focus | Free text in the client's own words, e.g. gaining strength, improving shoulder problems, preparing to hike the 4000 footers, improving BMD, losing weight |
| Client Tab | Pointer to that client's own tab (Client 1 to Client 10) |

The sheet's own subtitle says: "Track each client, assessment date, and review date. Use the Client 1-10 tabs for individual workout logs."

**Inferred**

- *Review date* is a "when do I next sit down with this client" date, not a measurement date. Several rows have it in the past, which suggests it is also how she notices overdue follow-ups.
- The short notes crammed into the review cell are really three separate facts: **status** (on hold / inactive), **session length and frequency** (30 min, 2x/week) and **a pipeline note** (wants to start PT in November). The app gives each its own place.
- One client carries a `Fitness Assessment` type with no sessions yet, which reads as a prospect or one-off assessment, so type is a property that can change.

### Sheet 2..N: "Client N: Workout & Session Log" (one tab per client)

**Shown**

- Header: Client Name, Start Date, Goal. Example goal: *squatting 180 by end of Oct, 250 by March; benching 130*.
- Instruction line: "Enter one exercise per row. Repeat the session date for each exercise in the same workout. Print setup is sized to fit on one landscape page."
- Columns: **Session Date, Workout / Focus, Exercise, Sets, Reps, Weight (lbs), Notes / Progress**.
- Example rows (three sessions on Oct 6, 7 and 9): *Lower Body* (Goblet Squat, Dumbbell RDL, Lateral Band Walk), *Upper Body* (Dumbbell Bench Press, Seated Row, Dumbbell Lat Raise, Pallof Press, Thread the Needle, High Plank), *Fundamental / Full Body Day* (Leg Press, KB Deadlift, Heel Slides, 90/90s, Cossack Squat).
- Weights are in **pounds**.
- Reps and weights are written loosely: `12 to 14`, `12 to 10 to 5`, `25 to 55`, `20s-40s`, `10 x`, and sometimes a band colour (`orange`) where a weight would go.
- Notes are rich and specific: "shoulders rolled, good form", "20 seconds felt easy so we moved to 40s", "bending knees and letting gravity take you down".

**Inferred**

- She is recording *progressive overload*: the point of repeating the log is to see whether weight, reps or hold time went up from one session to the next. Nothing in the sheets shows body measurements, so the app does **not** assume them (see below).
- "One exercise per row, repeat the date" is a workaround for a spreadsheet's lack of structure. A session with its exercises is the natural model, and it removes the repeated typing.
- The ranges ("12 to 10 to 5" with "25 to 55") are set-by-set ramps, so the app records sets individually.
- Timed holds (plank), bodyweight movements (heel slides) and banded work all appear in the same table, so every set field (reps, weight, seconds) is optional.
- The one-landscape-page print setup means she may print logs. The app has print styles and a per-client CSV export with the same columns.

## Pain points the app removes

| Today | In the app |
| --- | --- |
| Re-typing the date and focus on every row | One session, many exercises |
| Looking back through the tab to find last time's weight | "Last time (Oct 6): 12 → 10 @ 25 → 40 lb" appears the moment an exercise is chosen, with a one-click "use these sets"; or start a whole session from the previous one |
| Eyeballing whether a lift is going up | Per-exercise chart (top weight, volume, hold time, reps), range filter, first / best / latest / change |
| Goals buried in a header cell | Structured goals ("Squat 180 lb by Oct 31") whose progress updates from logged sessions |
| Spotting overdue reviews by scanning dates | Today screen lists overdue and upcoming reviews, goals coming due and clients who have not trained in 14+ days |
| One tab per client, capped at 10 | Unlimited clients, searchable, filterable, archivable |
| Status written into a date cell | Status, cadence and next review as separate fields |

## What was kept, what was redesigned

- **Kept:** the exact column set of the session log (date, focus, exercise, sets, reps, weight, notes), lbs, the client tracker's columns (type, assessment date, review date, primary goal), free-text goals and notes, and a CSV export that reproduces her sheet layout.
- **Redesigned:** one-row-per-exercise into sessions with sets; goals into structured targets; the review cell into status + cadence + next review.

## Assumptions to confirm with Antonia

1. **Weights are always pounds.** Stored as entered; there is no kg setting yet.
2. **Body measurements are optional.** The photos show none, but "losing weight", "toning" and "BMD" appear as goals, so each client can track any named measurement (body weight, waist, ...) with a unit of their choosing. It stays empty unless she uses it.
3. **"Review" means a periodic check-in with the client.** "Mark review done" records today and schedules the next one 4 to 12 weeks out.
4. **14 days without a session** is the threshold for "no recent session" on the Today screen. It is a constant, easy to change.
5. **Health notes / limitations** (e.g. a shoulder issue) is a private free-text field. The photos mention a shoulder problem as a goal, so a place for it seemed warranted; it is optional.
6. **No client portal.** Nothing in the photos suggests clients see the sheets.
7. **Importing the existing workbook** is not built. It would need the real file and is the most valuable next step.
