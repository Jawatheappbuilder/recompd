import { useEffect, useState } from "react";
import { exercises as library, type Equipment, type Muscle } from "@/data/exercises";
import type { ActiveWorkoutState } from "@/hooks/use-active-workout";

/*
 * Single source of truth for completed training + bodyweight.
 * Shapes mirror future cloud tables (workouts, workout_exercises, workout_sets, bodyweight_entries).
 * Home and Progress should both derive their numbers from the selectors below.
 */

export type CompletedSet = { weight: number; reps: number };
export type CompletedExercise = { key: string; exerciseId: string; name: string; muscles: Muscle[]; equipment: Equipment; sets: CompletedSet[] };
export type CompletedWorkout = { id: string; name: string; startedAt: number; durationSec: number; exercises: CompletedExercise[] };
export type BodyweightEntry = { id: string; kg: number; loggedAt: number };
export type TrainingData = { workouts: CompletedWorkout[]; bodyweight: BodyweightEntry[] };

const WORKOUTS_KEY = "recomp-workout-history-v2";
const BODYWEIGHT_KEY = "recomp-bodyweight-v1";
const DAY = 86_400_000;

// ---------- storage ----------
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function readData(): TrainingData {
  let workouts = parse<CompletedWorkout[]>(WORKOUTS_KEY);
  let bodyweight = parse<BodyweightEntry[]>(BODYWEIGHT_KEY);
  if (!workouts) { workouts = mockWorkouts(); localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts)); }
  if (!bodyweight) { bodyweight = mockBodyweight(); localStorage.setItem(BODYWEIGHT_KEY, JSON.stringify(bodyweight)); }
  return { workouts: [...workouts].sort((a, b) => b.startedAt - a.startedAt), bodyweight: [...bodyweight].sort((a, b) => a.loggedAt - b.loggedAt) };
}
function parse<T>(key: string): T | null {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}
const writeWorkouts = (workouts: CompletedWorkout[]) => { localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts)); notify(); };
const writeBodyweight = (entries: BodyweightEntry[]) => { localStorage.setItem(BODYWEIGHT_KEY, JSON.stringify(entries)); notify(); };

export function useTrainingData(): TrainingData | null {
  const [data, setData] = useState<TrainingData | null>(null);
  useEffect(() => {
    const load = () => setData(readData());
    load();
    listeners.add(load);
    return () => { listeners.delete(load); };
  }, []);
  return data;
}

export function recordCompletedWorkout(active: ActiveWorkoutState, durationSec: number) {
  const exercises: CompletedExercise[] = active.exercises
    .map((exercise) => ({
      key: exercise.key,
      exerciseId: exercise.id,
      name: exercise.name,
      muscles: exercise.muscles?.length ? exercise.muscles : [exercise.muscle],
      equipment: exercise.equipment,
      sets: exercise.sessionSets.filter((set) => set.completed).map((set) => ({ weight: Number(set.weight) || 0, reps: Number(set.reps) || 0 })),
    }))
    .filter((exercise) => exercise.sets.length);
  if (!exercises.length) return;
  const workouts = readData().workouts.filter((workout) => workout.id !== active.id);
  writeWorkouts([{ id: active.id, name: active.name, startedAt: active.startedAt, durationSec, exercises }, ...workouts]);
}
export const updateWorkout = (workout: CompletedWorkout) => writeWorkouts(readData().workouts.map((item) => item.id === workout.id ? workout : item));
export const deleteWorkout = (id: string) => writeWorkouts(readData().workouts.filter((item) => item.id !== id));

export const saveBodyweight = (entry: BodyweightEntry) => {
  const others = readData().bodyweight.filter((item) => item.id !== entry.id);
  writeBodyweight([...others, entry]);
};
export const deleteBodyweight = (id: string) => writeBodyweight(readData().bodyweight.filter((item) => item.id !== id));

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
export const dayKey = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

// ---------- selectors ----------
export type Period = "4W" | "3M" | "6M" | "1Y" | "ALL";
export const periodDays: Record<Period, number> = { "4W": 28, "3M": 91, "6M": 182, "1Y": 365, ALL: 100_000 };
export const periodLabel: Record<Period, string> = { "4W": "Last 4 weeks", "3M": "Last 3 months", "6M": "Last 6 months", "1Y": "Last year", ALL: "All time" };
export const since = (period: Period, now = Date.now()) => now - periodDays[period] * DAY;

export const setCount = (workout: CompletedWorkout) => workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
export const volumeOf = (workout: CompletedWorkout) => workout.exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + set.weight * set.reps, 0), 0);

export function trainingSummary(workouts: CompletedWorkout[], from: number) {
  const inRange = workouts.filter((workout) => workout.startedAt >= from);
  return { workouts: inRange.length, sets: inRange.reduce((t, w) => t + setCount(w), 0), durationSec: inRange.reduce((t, w) => t + w.durationSec, 0) };
}

export type PriorityLevel = "High" | "Medium" | "Low";
export const priorityMuscles: Muscle[] = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"];

/** Completed sets per muscle; the first listed muscle gets full credit, supporting muscles get half. */
export function trainingPriority(workouts: CompletedWorkout[], from: number) {
  const scores = new Map<Muscle, number>(priorityMuscles.map((muscle) => [muscle, 0]));
  for (const workout of workouts) {
    if (workout.startedAt < from) continue;
    for (const exercise of workout.exercises) {
      exercise.muscles.forEach((muscle, index) => scores.set(muscle, (scores.get(muscle) ?? 0) + exercise.sets.length * (index === 0 ? 1 : 0.5)));
    }
  }
  const max = Math.max(...scores.values());
  return priorityMuscles
    .map((muscle) => {
      const score = scores.get(muscle) ?? 0;
      const ratio = max ? score / max : 0;
      const level: PriorityLevel = ratio >= 0.66 ? "High" : ratio >= 0.33 ? "Medium" : "Low";
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
    .flatMap((workout) => workout.exercises.filter((exercise) => exercise.exerciseId === exerciseId).map((exercise) => ({ workoutId: workout.id, at: workout.startedAt, name: exercise.name, sets: exercise.sets })))
    .sort((a, b) => b.at - a.at);
}

export function bodyweightChange(entries: BodyweightEntry[], from: number) {
  const latest = entries.at(-1);
  const inRange = entries.filter((entry) => entry.loggedAt >= from);
  const first = inRange[0];
  if (!latest || !first || first === latest) return null;
  return { delta: latest.kg - first.kg, days: Math.max(1, Math.round((latest.loggedAt - first.loggedAt) / DAY)) };
}

// ---------- mock seed (replaced by cloud data later) ----------
const templates: { name: string; items: [string, number, number, number][] }[] = [
  { name: "Upper Body", items: [["bench-press", 70, 8, 4], ["lat-pulldown", 50, 10, 3], ["seated-dumbbell-press", 24, 8, 3], ["seated-cable-row", 55, 10, 3], ["cable-fly", 15, 12, 3], ["rope-pushdown", 20, 12, 2]] },
  { name: "Lower Body", items: [["back-squat", 110, 6, 4], ["romanian-deadlift", 90, 8, 3], ["leg-press", 180, 10, 3], ["lying-leg-curl", 40, 12, 3], ["standing-calf-raise", 60, 12, 3]] },
  { name: "Push", items: [["incline-barbell-press", 60, 8, 4], ["incline-dumbbell-press", 28, 10, 3], ["overhead-press", 45, 8, 3], ["lateral-raise", 10, 15, 3], ["dip", 0, 10, 3]] },
  { name: "Pull", items: [["pull-up", 0, 8, 4], ["barbell-row", 70, 8, 3], ["chest-supported-row", 50, 10, 3], ["barbell-curl", 30, 10, 3], ["hanging-leg-raise", 0, 12, 3]] },
];

function mockWorkouts(): CompletedWorkout[] {
  const today = new Date(); today.setHours(18, 10, 0, 0);
  const offsets: number[] = [];
  for (let day = 1; day < 182; day += 1) { const weekday = new Date(today.getTime() - day * DAY).getDay(); if ([1, 2, 4, 6].includes(weekday) && day % 17 !== 0) offsets.push(day); }
  return offsets.map((offset, index) => {
    const template = templates[index % templates.length]!;
    const progress = (182 - offset) / 182;
    const startedAt = today.getTime() - offset * DAY - (index % 3) * 3_600_000;
    const exercises = template.items.map(([id, base, reps, sets], exerciseIndex): CompletedExercise => {
      const info = library.find((item) => item.id === id)!;
      const weight = base ? Math.round((base * (0.88 + progress * 0.18)) / 2.5) * 2.5 : 0;
      return {
        key: `${id}-${index}-${exerciseIndex}`, exerciseId: id, name: info.name, muscles: [info.muscle], equipment: info.equipment,
        sets: Array.from({ length: sets }, (_, setIndex) => ({ weight, reps: Math.max(1, reps + (base ? 0 : Math.round(progress * 3)) - Math.floor(setIndex / 2) + ((offset + setIndex) % 3 === 0 ? 1 : 0)) })),
      };
    });
    return { id: `mock-${offset}`, name: template.name, startedAt, durationSec: (44 + ((offset * 7) % 22)) * 60, exercises };
  });
}

function mockBodyweight(): BodyweightEntry[] {
  const now = new Date(); now.setHours(7, 42, 0, 0);
  const entries: BodyweightEntry[] = [];
  for (let day = 364; day >= 0; day -= day > 60 ? 4 : 2) {
    const trend = 101.2 + (day / 364) * 5.4;
    const noise = Math.sin(day * 1.7) * 0.35;
    entries.push({ id: `bw-${day}`, kg: Math.round((day === 0 ? 101.2 : trend + noise) * 10) / 10, loggedAt: now.getTime() - day * DAY + (day % 3) * 600_000 });
  }
  return entries;
}
