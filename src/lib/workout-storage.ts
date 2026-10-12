import type { Exercise, WorkoutExercise } from "@/data/exercises";
import { ACTIVE_WORKOUT_KEY, createActiveWorkout, type WorkoutHandoff } from "@/hooks/use-active-workout";

import { getCloudData, mutate, useCloudData, type SavedWorkout, type ScheduledWorkout } from "./cloud-data";

export type { SavedWorkout };

// Account-backed custom exercises and saved workouts.
export const loadCustomExercises = () => getCloudData()?.custom ?? [];
export const useCustomExercises = () => useCloudData()?.custom ?? [];
export const saveCustomExercise = (exercise: Exercise) => mutate({ kind: "upsertCustom", exercise });
export const updateCustomExercise = (exercise: Exercise) => mutate({ kind: "upsertCustom", exercise });
export const deleteCustomExercise = (id: string) => mutate({ kind: "deleteCustom", id });

export const loadSavedWorkouts = () => getCloudData()?.saved ?? [];
export const useSavedWorkouts = () => useCloudData()?.saved ?? [];
export const saveWorkout = (workout: SavedWorkout) => mutate({ kind: "upsertSaved", workout });
export const deleteSavedWorkout = (id: string) => mutate({ kind: "deleteSaved", id });

export const defaultWorkoutName = (exercises: WorkoutExercise[]) => {
  const counts = new Map<string, number>();
  for (const exercise of exercises) {
    if (exercise.note) continue;
    const muscles = exercise.muscles?.length ? exercise.muscles : [exercise.muscle];
    for (const muscle of muscles) counts.set(muscle, (counts.get(muscle) ?? 0) + 1);
  }
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([muscle]) => muscle);
  return ranked.length ? ranked.join(" + ") : "Workout";
};

/** Single handoff into the existing Active Workout experience. */
export function handOffWorkout(handoff: WorkoutHandoff) {
  // Persist the new workout before navigating. A staged sessionStorage handoff
  // could be missed when the workout route was already mounted.
  const active = createActiveWorkout(handoff.exercises, handoff.name);
  if (!active) return false;
  const next = {
    ...active,
    ...(handoff.scheduledId ? { scheduledId: handoff.scheduledId } : {}),
    ...(handoff.sourceSavedId ? { sourceSavedId: handoff.sourceSavedId } : {}),
  };
  localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(next));
  sessionStorage.removeItem("recomp-active-workout");
  window.dispatchEvent(new Event("recomp-active-workout-updated"));
  return true;
}

// ---------- scheduled workouts (planned instances; never modify saved templates) ----------
export type { ScheduledWorkout };
export const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const useScheduledWorkouts = () => useCloudData()?.scheduled ?? [];
/** Pending (not completed) schedules from today onwards, soonest first. */
export const useUpcomingWorkouts = () => { const today = localDateKey(); return useScheduledWorkouts().filter((item) => !item.completedAt && item.date >= today); };
export const saveScheduledWorkout = (workout: ScheduledWorkout) => mutate({ kind: "upsertScheduled", workout: { ...workout, updatedAt: Date.now() } });
export const deleteScheduledWorkout = (id: string) => mutate({ kind: "deleteScheduled", id });
export const cloneExercises = (exercises: WorkoutExercise[]) => exercises.map((exercise) => structuredClone(exercise));
export function formatScheduleDate(date: string, time?: string) {
  const today = localDateKey(); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const [y, m, d] = date.split("-").map(Number);
  const label = date === today ? "Today" : date === localDateKey(tomorrow) ? "Tomorrow" : new Date(y!, m! - 1, d!).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  if (!time) return label;
  const [h, min] = time.split(":").map(Number);
  return `${label} · ${new Date(2000, 0, 1, h, min).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}
export const hasActiveWorkout = () => { try { return !!localStorage.getItem(ACTIVE_WORKOUT_KEY); } catch { return false; } };
