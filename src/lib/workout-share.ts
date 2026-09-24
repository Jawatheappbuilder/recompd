import { supabase } from "@/integrations/supabase/client";
import type { WorkoutExercise } from "@/data/exercises";

export const PENDING_SHARE_KEY = "recomp-pending-share";

/** Path used for share links; kept stable so native deep links can map to it later. */
export const sharePath = (token: string) => `/share/${token}`;

function makeToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Template-only copy: no performance data, no owner info. */
export function templateExercises(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return exercises.map((exercise) => structuredClone(exercise));
}

export async function createShareLink(name: string, exercises: WorkoutExercise[]) {
  const token = makeToken();
  const { error } = await supabase.from("shared_workouts").insert({ token, name: name.slice(0, 120) || "Workout", exercises: templateExercises(exercises) as never });
  if (error) throw error;
  return `${window.location.origin}${sharePath(token)}`;
}

export async function fetchSharedWorkout(token: string): Promise<{ name: string; exercises: WorkoutExercise[] } | null> {
  const { data, error } = await supabase.rpc("get_shared_workout", { _token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { name: row.name, exercises: (row.exercises ?? []) as unknown as WorkoutExercise[] };
}

export async function shareWorkoutLink(name: string, exercises: WorkoutExercise[]) {
  const url = await createShareLink(name, exercises);
  try {
    if (navigator.share) { await navigator.share({ title: name, url }); return "shared" as const; }
  } catch (error) { if ((error as Error)?.name === "AbortError") return "cancelled" as const; }
  await navigator.clipboard.writeText(url).catch(() => undefined);
  return "copied" as const;
}
