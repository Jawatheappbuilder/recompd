import type { Exercise, WorkoutExercise } from "@/data/exercises";
import { ACTIVE_WORKOUT_KEY, type WorkoutHandoff } from "@/hooks/use-active-workout";

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
  const muscles = [...new Set(exercises.flatMap((exercise) => exercise.muscles?.length ? exercise.muscles : [exercise.muscle]))];
  return muscles.length && muscles.length <= 3 ? muscles.join(" + ") : "Custom Workout";
};

/** Single handoff into the existing Active Workout experience. */
export function handOffWorkout(handoff: WorkoutHandoff) {
  localStorage.removeItem(ACTIVE_WORKOUT_KEY);
  sessionStorage.setItem("recomp-active-workout", JSON.stringify(handoff));
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
