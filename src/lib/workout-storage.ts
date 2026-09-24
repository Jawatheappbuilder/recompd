import type { Exercise, WorkoutExercise } from "@/data/exercises";
import { ACTIVE_WORKOUT_KEY, type WorkoutHandoff } from "@/hooks/use-active-workout";

// Local storage for now; shapes mirror future cloud tables (custom_exercises, saved_workouts).
const CUSTOM_KEY = "recomp-custom-exercises-v1";
const SAVED_KEY = "recomp-saved-workouts-v1";

export type SavedWorkout = { id: string; name: string; exercises: WorkoutExercise[]; createdAt: number };

const read = <T,>(key: string): T[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as T[]; } catch { return []; }
};

export const loadCustomExercises = () => read<Exercise>(CUSTOM_KEY);
export const saveCustomExercise = (exercise: Exercise) => localStorage.setItem(CUSTOM_KEY, JSON.stringify([...loadCustomExercises(), exercise]));

export const loadSavedWorkouts = () => read<SavedWorkout>(SAVED_KEY);
export const saveWorkout = (workout: SavedWorkout) => {
  const others = loadSavedWorkouts().filter((item) => item.id !== workout.id);
  localStorage.setItem(SAVED_KEY, JSON.stringify([workout, ...others]));
};
export const deleteSavedWorkout = (id: string) => localStorage.setItem(SAVED_KEY, JSON.stringify(loadSavedWorkouts().filter((item) => item.id !== id)));

export const defaultWorkoutName = (exercises: WorkoutExercise[]) => {
  const muscles = [...new Set(exercises.flatMap((exercise) => exercise.muscles?.length ? exercise.muscles : [exercise.muscle]))];
  return muscles.length && muscles.length <= 3 ? muscles.join(" + ") : "Custom Workout";
};

/** Single handoff into the existing Active Workout experience. */
export function handOffWorkout(handoff: WorkoutHandoff) {
  localStorage.removeItem(ACTIVE_WORKOUT_KEY);
  sessionStorage.setItem("recomp-active-workout", JSON.stringify(handoff));
}
