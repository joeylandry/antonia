export type ClientStatus = "active" | "on_hold" | "inactive";
export type ClientKind = "fitness_assessment" | "personal_training";

export const CLIENT_STATUSES: { value: ClientStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "inactive", label: "Inactive" },
];

export const CLIENT_KINDS: { value: ClientKind; label: string }[] = [
  { value: "personal_training", label: "Personal training" },
  { value: "fitness_assessment", label: "Fitness assessment" },
];

export const statusLabel = (s: ClientStatus) => CLIENT_STATUSES.find((x) => x.value === s)?.label ?? s;
export const kindLabel = (k: ClientKind) => CLIENT_KINDS.find((x) => x.value === k)?.label ?? k;

export type Client = {
  id: string;
  fullName: string;
  kind: ClientKind;
  status: ClientStatus;
  primaryGoal: string | null;
  healthNotes: string | null;
  email: string | null;
  phone: string | null;
  startDate: string | null;
  assessmentDate: string | null;
  nextReviewDate: string | null;
  lastReviewedOn: string | null;
  sessionLengthMin: number | null;
  sessionsPerWeek: number | null;
  archivedAt: Date | null;
  createdAt: Date;
};

export type ClientListItem = Client & {
  lastSessionDate: string | null;
  sessionCount: number;
  activeGoalCount: number;
};

/** One performed set. Every field is optional (timed, bodyweight and weighted work all occur). */
export type SetEntry = { reps?: number; weight?: number; seconds?: number };

export type SessionEntry = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  position: number;
  sets: SetEntry[];
  notes: string | null;
};

export type WorkoutSession = {
  id: string;
  clientId: string;
  sessionDate: string;
  focus: string | null;
  notes: string | null;
  entries: SessionEntry[];
};

export type GoalKind = "lift" | "general";
export type GoalStatus = "active" | "achieved" | "dropped";

export type Goal = {
  id: string;
  clientId: string;
  kind: GoalKind;
  title: string;
  exerciseId: string | null;
  exerciseName: string | null;
  targetValue: number | null;
  targetDate: string | null;
  status: GoalStatus;
  achievedOn: string | null;
};

export type Metric = {
  id: string;
  clientId: string;
  name: string;
  unit: string;
  direction: "up" | "down" | "neutral";
};

export type MetricEntry = { id: string; metricId: string; entryDate: string; value: number; note: string | null };

export type ClientNote = { id: string; clientId: string; body: string; createdAt: Date };

export type Exercise = { id: string; name: string };
