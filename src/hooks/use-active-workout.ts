import { useCallback, useEffect, useState } from "react";
import type { WorkoutExercise } from "@/data/exercises";

export const ACTIVE_WORKOUT_KEY = "recomp-active-workout-v1";
const LEGACY_WORKOUT_KEY = "recomp-active-workout";

export type ActiveSet = {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
  weightEdited: boolean;
};

export type ActiveExercise = WorkoutExercise & {
  sessionSets: ActiveSet[];
  restSeconds: number;
  supersetWith?: string;
};

export type ActiveWorkoutState = {
  version: 1;
  id: string;
  name: string;
  startedAt: number;
  currentKey: string;
  exercises: ActiveExercise[];
};

const repsFromTarget = (target: string) => target.match(/\d+/)?.[0] ?? "10";

export type WorkoutHandoff = { name?: string; exercises: WorkoutExercise[] };

export function createActiveWorkout(exercises: WorkoutExercise[], customName?: string): ActiveWorkoutState | null {
  const first = exercises[0];
  if (!first) return null;
  const muscles = [...new Set(exercises.map((exercise) => exercise.muscle))];
  const name = customName?.trim() || (muscles.length <= 3 ? muscles.join(" + ") : "Custom Workout");
  return {
    version: 1,
    id: `workout-${Date.now()}`,
    name,
    startedAt: Date.now(),
    currentKey: first.key,
    exercises: exercises.map((exercise) => ({
      ...exercise,
      restSeconds: exercise.restSeconds ?? (exercise.type === "Compound" ? 120 : 90),
      sessionSets: Array.from({ length: exercise.sets }, (_, index) => ({
        id: `${exercise.key}-set-${index}-${Date.now()}`,
        weight: "",
        reps: repsFromTarget(exercise.reps),
        completed: false,
        weightEdited: false,
      })),
    })),
  };
}

export function saveActiveWorkout(workout: ActiveWorkoutState) {
  localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(workout));
}

export function useActiveWorkout() {
  const [workout, setWorkoutState] = useState<ActiveWorkoutState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_WORKOUT_KEY);
      if (saved) {
        setWorkoutState(JSON.parse(saved) as ActiveWorkoutState);
      } else {
        const legacy = sessionStorage.getItem(LEGACY_WORKOUT_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy) as WorkoutExercise[] | WorkoutHandoff;
          const created = Array.isArray(parsed) ? createActiveWorkout(parsed) : createActiveWorkout(parsed.exercises, parsed.name);
          if (created) {
            localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(created));
            sessionStorage.removeItem(LEGACY_WORKOUT_KEY);
            setWorkoutState(created);
          }
        }
      }
    } catch {
      localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    }
    setHydrated(true);
  }, []);

  const setWorkout = useCallback((next: ActiveWorkoutState | null | ((current: ActiveWorkoutState | null) => ActiveWorkoutState | null)) => {
    setWorkoutState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      if (value) localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(value));
      else localStorage.removeItem(ACTIVE_WORKOUT_KEY);
      return value;
    });
  }, []);

  return { workout, setWorkout, hydrated };
}