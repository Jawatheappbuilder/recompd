import type { Exercise, WorkoutExercise } from "@/data/exercises";
import { ACTIVE_WORKOUT_KEY, type WorkoutHandoff } from "@/hooks/use-active-workout";

import { getCloudData, mutate, useCloudData, type SavedWorkout } from "./cloud-data";

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
