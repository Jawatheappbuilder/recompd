import { exercises as exerciseLibrary, type CardioMetric, type Equipment, type Muscle } from "@/data/exercises";
import { getCloudData, mutate, useCloudData } from "./cloud-data";
import type { ActiveWorkoutState } from "@/hooks/use-active-workout";

/*
 * Single source of truth for completed training + bodyweight.
 * Backed by the signed-in account (workouts, workout_exercises, bodyweight_entries).
 * Home and Progress should both derive their numbers from the selectors below.
 */

export type CompletedSet = {
  weight: number; reps: number; kind?: "strength" | "cardio";
  durationSeconds?: number; distanceKm?: number; speedKph?: number; pace?: string;
  incline?: number; level?: number; floors?: number; steps?: number; pace500m?: string;
};
export type CompletedExercise = { key: string; exerciseId: string; name: string; muscles: Muscle[]; equipment: Equipment; tracking?: "strength" | "cardio"; cardioMetrics?: CardioMetric[]; sets: CompletedSet[]; supersetWith?: string };
export type CompletedWorkout = { id: string; name: string; startedAt: number; durationSec: number; exercises: CompletedExercise[] };
export type BodyweightEntry = { id: string; kg: number; loggedAt: number };
export type TrainingData = { workouts: CompletedWorkout[]; bodyweight: BodyweightEntry[] };

const DAY = 86_400_000;

// ---------- storage (account-backed, see cloud-data.ts) ----------
export function useTrainingData(): TrainingData | null {
  const data = useCloudData();
  return data ? { workouts: data.workouts, bodyweight: data.bodyweight } : null;
}

export function toCompletedWorkout(active: ActiveWorkoutState, durationSec: number): CompletedWorkout {
  const exercises: CompletedExercise[] = active.exercises
    .map((exercise) => ({
      key: exercise.key,
      exerciseId: exercise.id,
      name: exercise.name,
      muscles: exercise.muscles?.length ? exercise.muscles : [exercise.muscle],
      equipment: exercise.equipment,
      tracking: exercise.tracking ?? "strength",
      ...(exercise.cardioMetrics ? { cardioMetrics: exercise.cardioMetrics } : {}),
      ...(exercise.supersetWith ? { supersetWith: exercise.supersetWith } : {}),
      sets: exercise.sessionSets.filter((set) => set.completed).map((set) => exercise.tracking === "cardio" ? {
        kind: "cardio" as const, weight: 0, reps: 0,
        durationSeconds: Number(set.durationSeconds) || 0,
        ...(Number(set.distanceKm) > 0 ? { distanceKm: Number(set.distanceKm) } : {}),
        ...(Number(set.speedKph) > 0 ? { speedKph: Number(set.speedKph) } : {}),
        ...(set.pace ? { pace: set.pace } : {}), ...(Number(set.incline) > 0 ? { incline: Number(set.incline) } : {}),
        ...(Number(set.level) > 0 ? { level: Number(set.level) } : {}), ...(Number(set.floors) > 0 ? { floors: Number(set.floors) } : {}),
        ...(Number(set.steps) > 0 ? { steps: Number(set.steps) } : {}), ...(set.pace500m ? { pace500m: set.pace500m } : {}),
      } : { weight: Number(set.weight) || 0, reps: Number(set.reps) || 0 }),
    }))
    .filter((exercise) => exercise.sets.length);
  return { id: active.id, name: active.name, startedAt: active.startedAt, durationSec, exercises };
}

export function recordCompletedWorkout(active: ActiveWorkoutState, durationSec: number) {
  const workout = toCompletedWorkout(active, durationSec);
  if (!workout.exercises.length) return;
  mutate({ kind: "upsertWorkout", workout });
  const scheduled = active.scheduledId ? getCloudData()?.scheduled.find((item) => item.id === active.scheduledId) : undefined;
  if (scheduled) mutate({ kind: "upsertScheduled", workout: { ...scheduled, completedAt: Date.now(), completedWorkoutId: workout.id, updatedAt: Date.now() } });
}
export const updateWorkout = (workout: CompletedWorkout) => mutate({ kind: "upsertWorkout", workout });
export const deleteWorkout = (id: string) => mutate({ kind: "deleteWorkout", id });

export const saveBodyweight = (entry: BodyweightEntry) => mutate({ kind: "upsertBodyweight", entry });
export const deleteBodyweight = (id: string) => mutate({ kind: "deleteBodyweight", id });

// ---------- formatting ----------
export function formatDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const formatDay = (ts: number) => { const d = new Date(ts); return `${d.getDate()} ${months[d.getMonth()]}`; };
export const formatLongDay = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
export const formatTime = (ts: number) => new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const formatKg = (kg: number) => `${Number.isInteger(kg) ? kg : kg.toFixed(1).replace(/\.0$/, "")} kg`;
export const formatSet = (set: CompletedSet) => set.weight > 0 ? `${formatKg(set.weight)} × ${set.reps}` : `${set.reps} reps`;
export const isCardioSet = (set: CompletedSet) => set.kind === "cardio" || set.durationSeconds !== undefined;
export function formatCardioSet(set: CompletedSet) {
  const values: string[] = [];
  if (set.durationSeconds) values.push(formatDuration(set.durationSeconds));
  if (set.distanceKm) values.push(`${set.distanceKm.toLocaleString()} km`);
  if (set.speedKph) values.push(`${set.speedKph.toLocaleString()} km/h`);
  if (set.pace) values.push(`${set.pace} /km`);
  if (set.incline) values.push(`${set.incline}% incline`);
  if (set.level) values.push(`Level ${set.level}`);
  if (set.floors) values.push(`${set.floors} floors`);
  if (set.steps) values.push(`${set.steps.toLocaleString()} steps`);
  if (set.pace500m) values.push(`${set.pace500m} /500m`);
  return values.join(" · ") || "Cardio completed";
}
export const formatPerformance = (set: CompletedSet) => isCardioSet(set) ? formatCardioSet(set) : formatSet(set);
export const dayKey = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

// ---------- selectors ----------
export type Period = "4W" | "3M" | "6M" | "1Y" | "ALL";
export const periodDays: Record<Period, number> = { "4W": 28, "3M": 91, "6M": 182, "1Y": 365, ALL: 100_000 };
export const periodLabel: Record<Period, string> = { "4W": "Last 4 weeks", "3M": "Last 3 months", "6M": "Last 6 months", "1Y": "Last year", ALL: "All time" };
export const since = (period: Period, now = Date.now()) => now - periodDays[period] * DAY;

export const setCount = (workout: CompletedWorkout) => workout.exercises.reduce((total, exercise) => total + (exercise.tracking === "cardio" || exercise.sets.some(isCardioSet) ? 0 : exercise.sets.length), 0);
export const volumeOf = (workout: CompletedWorkout) => workout.exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + set.weight * set.reps, 0), 0);

export function trainingSummary(workouts: CompletedWorkout[], from: number) {
  const inRange = workouts.filter((workout) => workout.startedAt >= from);
  return { workouts: inRange.length, sets: inRange.reduce((t, w) => t + setCount(w), 0), durationSec: inRange.reduce((t, w) => t + w.durationSec, 0) };
}

export type WorkloadLevel = "High workload" | "Moderate workload" | "Low workload";
export const priorityMuscles: Muscle[] = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"];
const libraryMuscles = new Map(exerciseLibrary.map((exercise) => [exercise.id, exercise.muscles?.length ? exercise.muscles : [exercise.muscle]]));

/** Completed sets per muscle; the first listed muscle gets full credit, supporting muscles get half. */
export function trainingPriority(workouts: CompletedWorkout[], from: number) {
  const scores = new Map<Muscle, number>(priorityMuscles.map((muscle) => [muscle, 0]));
  for (const workout of workouts) {
    if (workout.startedAt < from) continue;
    for (const exercise of workout.exercises) {
      if (exercise.tracking === "cardio" || exercise.sets.some(isCardioSet)) continue;
      const muscles = exercise.muscles.length > 1 ? exercise.muscles : libraryMuscles.get(exercise.exerciseId) ?? exercise.muscles;
      muscles.forEach((muscle, index) => scores.set(muscle, (scores.get(muscle) ?? 0) + exercise.sets.length * (index === 0 ? 1 : 0.5)));
    }
  }
  const max = Math.max(...scores.values());
  return priorityMuscles
    .map((muscle) => {
      const score = scores.get(muscle) ?? 0;
      const ratio = max ? score / max : 0;
      const level: WorkloadLevel = ratio >= 0.66 ? "High workload" : ratio >= 0.33 ? "Moderate workload" : "Low workload";
      return { muscle, score, ratio, level };
    })
    .sort((a, b) => b.score - a.score);
}

export const estimate1RM = (set: CompletedSet) => set.weight > 0 && set.reps > 0 && set.reps <= 12 ? set.weight * (1 + set.reps / 30) : 0;
const setBeats = (a: CompletedSet, b: CompletedSet | undefined) => !b || a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps);

export type ExerciseRecord = {
  exerciseId: string; name: string; bodyweight: boolean;
  heaviest: CompletedSet & { at: number }; best1RM: number; lastPrAt: number;
};

/** Records computed chronologically from real history. A first-ever session establishes a baseline, not a PR. */
export function personalRecords(workouts: CompletedWorkout[]) {
  const records = new Map<string, ExerciseRecord>();
  const prsByWorkout = new Map<string, { exerciseId: string; name: string; set: CompletedSet }[]>();
  for (const workout of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    for (const exercise of workout.exercises) {
      if (exercise.tracking === "cardio" || exercise.sets.some(isCardioSet)) continue;
      const top = exercise.sets.reduce<CompletedSet | undefined>((best, set) => setBeats(set, best) ? set : best, undefined);
      if (!top) continue;
      const bodyweight = exercise.sets.every((set) => set.weight === 0);
      const e1rm = Math.max(0, ...exercise.sets.map(estimate1RM));
      const current = records.get(exercise.exerciseId);
      if (!current) {
        records.set(exercise.exerciseId, { exerciseId: exercise.exerciseId, name: exercise.name, bodyweight, heaviest: { ...top, at: workout.startedAt }, best1RM: e1rm, lastPrAt: 0 });
        continue;
      }
      if (setBeats(top, current.heaviest)) {
        current.heaviest = { ...top, at: workout.startedAt };
        current.lastPrAt = workout.startedAt;
        prsByWorkout.set(workout.id, [...(prsByWorkout.get(workout.id) ?? []), { exerciseId: exercise.exerciseId, name: exercise.name, set: top }]);
      }
      current.best1RM = Math.max(current.best1RM, e1rm);
      current.bodyweight = current.bodyweight && bodyweight;
      current.name = exercise.name;
    }
  }
  const all = [...records.values()];
  return {
    all: all.sort((a, b) => a.name.localeCompare(b.name)),
    recent: all.filter((record) => record.lastPrAt).sort((a, b) => b.lastPrAt - a.lastPrAt),
    byWorkout: prsByWorkout,
  };
}

export function exerciseHistory(workouts: CompletedWorkout[], exerciseId: string) {
  return workouts
    .flatMap((workout) => workout.exercises.filter((exercise) => exercise.exerciseId === exerciseId).map((exercise) => ({ workoutId: workout.id, at: workout.startedAt, name: exercise.name, tracking: exercise.tracking ?? (exercise.sets.some(isCardioSet) ? "cardio" : "strength"), sets: exercise.sets })))
    .sort((a, b) => b.at - a.at);
}

export function bodyweightChange(entries: BodyweightEntry[], from: number) {
  const latest = entries.at(-1);
  const inRange = entries.filter((entry) => entry.loggedAt >= from);
  const first = inRange[0];
  if (!latest || !first || first === latest) return null;
  return { delta: latest.kg - first.kg, days: Math.max(1, Math.round((latest.loggedAt - first.loggedAt) / DAY)) };
}

