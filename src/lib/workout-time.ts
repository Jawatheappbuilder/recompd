import { isCardioExercise, type WorkoutExercise } from "@/data/exercises";

const WORK_SECONDS_PER_SET = 45;
const TRANSITION_SECONDS = 75;

/**
 * Estimates elapsed workout time from planned work, configured rest periods,
 * cardio duration, and a small allowance for moving between exercises.
 */
export function workoutTimeEstimate(workout: WorkoutExercise[]) {
  if (!workout.length) return null;

  let seconds = 0;
  for (const exercise of workout) {
    if (isCardioExercise(exercise)) {
      seconds += exercise.targetDurationSeconds ?? 1200;
      continue;
    }
    const sets = Math.max(1, exercise.sets || 1);
    seconds += sets * WORK_SECONDS_PER_SET;
    seconds += Math.max(0, sets - 1) * (exercise.restSeconds ?? 90);
  }
  seconds += Math.max(0, workout.length - 1) * TRANSITION_SECONDS;

  const minutes = seconds / 60;
  const lower = Math.max(5, Math.floor(minutes / 5) * 5);
  const upper = Math.max(lower + 5, Math.ceil(minutes / 5) * 5);
  return { lower, upper, label: `${lower}–${upper} min` };
}
