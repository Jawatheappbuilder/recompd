import type { ActiveExercise } from "../hooks/use-active-workout";
import type { CompletedSet } from "./training-data";

/** Match working-set positions, including completed sets. Keep completion state, warm-ups and extra new sets. */
export function applyPreviousSession(exercise: ActiveExercise, previous: readonly CompletedSet[]): ActiveExercise {
  if (exercise.tracking === "cardio") return exercise;
  const working = previous.filter((set) => set.kind !== "warmup" && set.kind !== "cardio" && set.durationSeconds === undefined && set.completed !== false);
  let index = 0;
  return { ...exercise, sessionSets: exercise.sessionSets.map((set) => {
    if (set.kind === "warmup" || set.kind === "cardio") return set;
    const prior = working[index++];
    if (!prior || !Number.isFinite(prior.weight) || prior.weight < 0 || !Number.isFinite(prior.reps) || prior.reps <= 0) return set;
    return { ...set, weight: String(prior.weight), reps: String(prior.reps), weightEdited: true };
  }) };
}
