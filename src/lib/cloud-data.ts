import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Equipment, Exercise, Muscle, WorkoutExercise } from "@/data/exercises";
import type { BodyweightEntry, CompletedExercise, CompletedWorkout } from "./training-data";

/*
 * Account-backed store for fitness data. Reads come from an in-memory cache (hydrated
 * from a per-user device snapshot, then refreshed from the cloud). Writes update the cache
 * immediately and sync silently; failed writes are queued and retried so a brief
 * connection drop never loses a finished workout.
 */

export type SavedWorkout = { id: string; name: string; exercises: WorkoutExercise[]; createdAt: number };
export type CloudData = { workouts: CompletedWorkout[]; bodyweight: BodyweightEntry[]; saved: SavedWorkout[]; custom: Exercise[] };

type Op =
  | { kind: "upsertWorkout"; workout: CompletedWorkout }
  | { kind: "deleteWorkout"; id: string }
  | { kind: "upsertBodyweight"; entry: BodyweightEntry }
  | { kind: "deleteBodyweight"; id: string }
  | { kind: "upsertSaved"; workout: SavedWorkout }
  | { kind: "deleteSaved"; id: string }
  | { kind: "upsertCustom"; exercise: Exercise }
  | { kind: "deleteCustom"; id: string };

let userId: string | null = null;
let data: CloudData | null = null;
let flushing = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const snapshotKey = (id: string) => `recomp-cloud-snapshot-v1:${id}`;
const queueKey = (id: string) => `recomp-pending-sync-v1:${id}`;
const readJson = <T,>(key: string): T | null => { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; } };

const sortData = (d: CloudData): CloudData => ({
  workouts: [...d.workouts].sort((a, b) => b.startedAt - a.startedAt),
  bodyweight: [...d.bodyweight].sort((a, b) => a.loggedAt - b.loggedAt),
  saved: [...d.saved].sort((a, b) => b.createdAt - a.createdAt),
  custom: d.custom,
});

function commit(next: CloudData) {
  data = sortData(next);
  if (userId) { try { localStorage.setItem(snapshotKey(userId), JSON.stringify(data)); } catch { /* storage full */ } }
  notify();
}

// ---------- row mapping ----------
const toCustom = (row: { id: string; name: string; muscles: string[]; equipment: string }): Exercise => {
  const muscles = row.muscles as Muscle[];
  return { id: row.id, name: row.name, muscle: muscles[0] ?? "Chest", muscles, equipment: row.equipment as Equipment, type: muscles.length > 1 ? "Compound" : "Isolation", custom: true };
};

async function fetchAll(): Promise<CloudData> {
  const [w, e, b, s, c] = await Promise.all([
    supabase.from("workouts").select("*"),
    supabase.from("workout_exercises").select("*").order("position"),
    supabase.from("bodyweight_entries").select("*"),
    supabase.from("saved_workouts").select("*"),
    supabase.from("custom_exercises").select("*").order("created_at"),
  ]);
  const error = w.error ?? e.error ?? b.error ?? s.error ?? c.error;
  if (error) throw error;
  const byWorkout = new Map<string, CompletedExercise[]>();
  for (const row of e.data ?? []) {
    const sets = (row.sets as { weight: number; reps: number }[]).map((set) => ({ weight: Number(set.weight) || 0, reps: Number(set.reps) || 0 }));
    const exercise: CompletedExercise = { key: row.exercise_key, exerciseId: row.exercise_id, name: row.name, muscles: row.muscles as Muscle[], equipment: row.equipment as Equipment, sets, ...(row.superset_with ? { supersetWith: row.superset_with } : {}) };
    byWorkout.set(row.workout_id, [...(byWorkout.get(row.workout_id) ?? []), exercise]);
  }
  return {
    workouts: (w.data ?? []).map((row) => ({ id: row.id, name: row.name, startedAt: Date.parse(row.started_at), durationSec: row.duration_sec, exercises: byWorkout.get(row.id) ?? [] })),
    bodyweight: (b.data ?? []).map((row) => ({ id: row.id, kg: Number(row.kg), loggedAt: Date.parse(row.logged_at) })),
    saved: (s.data ?? []).map((row) => ({ id: row.id, name: row.name, exercises: row.exercises as unknown as WorkoutExercise[], createdAt: Date.parse(row.created_at) })),
    custom: (c.data ?? []).map(toCustom),
  };
}

async function run(op: Op) {
  const check = (result: { error: unknown }) => { if (result.error) throw result.error; };
  switch (op.kind) {
    case "upsertWorkout": {
      const w = op.workout;
      check(await supabase.from("workouts").upsert({ user_id: userId!, id: w.id, name: w.name.slice(0, 120), started_at: new Date(w.startedAt).toISOString(), ended_at: new Date(w.startedAt + w.durationSec * 1000).toISOString(), duration_sec: Math.round(w.durationSec) }));
      check(await supabase.from("workout_exercises").delete().eq("workout_id", w.id));
      if (w.exercises.length) check(await supabase.from("workout_exercises").insert(w.exercises.map((ex, position) => ({
        user_id: userId!, workout_id: w.id, position, exercise_key: ex.key, exercise_id: ex.exerciseId, name: ex.name.slice(0, 120), muscles: ex.muscles, equipment: ex.equipment,
        superset_with: ex.supersetWith ?? null, sets: ex.sets.map((set) => ({ weight: set.weight, reps: set.reps, completed: true })) as unknown as Json,
      }))));
      return;
    }
    case "deleteWorkout": return check(await supabase.from("workouts").delete().eq("id", op.id));
    case "upsertBodyweight": return check(await supabase.from("bodyweight_entries").upsert({ user_id: userId!, id: op.entry.id, kg: op.entry.kg, logged_at: new Date(op.entry.loggedAt).toISOString() }));
    case "deleteBodyweight": return check(await supabase.from("bodyweight_entries").delete().eq("id", op.id));
    case "upsertSaved": return check(await supabase.from("saved_workouts").upsert({ user_id: userId!, id: op.workout.id, name: op.workout.name.slice(0, 120), exercises: op.workout.exercises as unknown as Json, created_at: new Date(op.workout.createdAt).toISOString() }));
    case "deleteSaved": return check(await supabase.from("saved_workouts").delete().eq("id", op.id));
    case "upsertCustom": { const ex = op.exercise; return check(await supabase.from("custom_exercises").upsert({ user_id: userId!, id: ex.id, name: ex.name.slice(0, 120), muscles: ex.muscles?.length ? ex.muscles : [ex.muscle], equipment: ex.equipment })); }
    case "deleteCustom": return check(await supabase.from("custom_exercises").delete().eq("id", op.id));
  }
}

const readQueue = () => (userId ? readJson<Op[]>(queueKey(userId)) ?? [] : []);
const writeQueue = (ops: Op[]) => { if (userId) { if (ops.length) localStorage.setItem(queueKey(userId), JSON.stringify(ops)); else localStorage.removeItem(queueKey(userId)); } };

async function flush() {
  if (flushing || !userId) return;
  flushing = true;
  try {
    let queue = readQueue();
    while (queue.length) {
      await run(queue[0]!);
      queue = readQueue().slice(1);
      writeQueue(queue);
    }
  } catch { /* stay queued; retried on reconnect or next launch */ } finally { flushing = false; }
}

function enqueue(op: Op) {
  if (!userId) return;
  writeQueue([...readQueue(), op]);
  void flush();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flush());
  window.setInterval(() => { if (readQueue().length) void flush(); }, 30_000);
}

// ---------- lifecycle (called by auth) ----------
export async function loadCloudData(id: string) {
  if (userId !== id) { userId = id; data = readJson<CloudData>(snapshotKey(id)); notify(); }
  await flush();
  try {
    const fresh = await fetchAll();
    if (userId !== id) return;
    // Anything still queued locally is newer than the server copy.
    let merged = fresh;
    for (const op of readQueue()) merged = apply(merged, op);
    commit(merged);
  } catch {
    if (!data) commit({ workouts: [], bodyweight: [], saved: [], custom: [] });
  }
}

export function clearCloudData() {
  if (userId) localStorage.removeItem(snapshotKey(userId));
  userId = null; data = null; notify();
}

function apply(d: CloudData, op: Op): CloudData {
  switch (op.kind) {
    case "upsertWorkout": return { ...d, workouts: [op.workout, ...d.workouts.filter((w) => w.id !== op.workout.id)] };
    case "deleteWorkout": return { ...d, workouts: d.workouts.filter((w) => w.id !== op.id) };
    case "upsertBodyweight": return { ...d, bodyweight: [...d.bodyweight.filter((b) => b.id !== op.entry.id), op.entry] };
    case "deleteBodyweight": return { ...d, bodyweight: d.bodyweight.filter((b) => b.id !== op.id) };
    case "upsertSaved": return { ...d, saved: [op.workout, ...d.saved.filter((s) => s.id !== op.workout.id)] };
    case "deleteSaved": return { ...d, saved: d.saved.filter((s) => s.id !== op.id) };
    case "upsertCustom": return { ...d, custom: d.custom.some((c) => c.id === op.exercise.id) ? d.custom.map((c) => c.id === op.exercise.id ? op.exercise : c) : [...d.custom, op.exercise] };
    case "deleteCustom": return { ...d, custom: d.custom.filter((c) => c.id !== op.id) };
  }
}

/** Optimistically applies a change and syncs it to the account in the background. */
export function mutate(op: Op) {
  if (!data || !userId) return;
  commit(apply(data, op));
  enqueue(op);
}

export const getCloudData = () => data;

export function useCloudData(): CloudData | null {
  const [value, setValue] = useState<CloudData | null>(null);
  useEffect(() => {
    const load = () => setValue(data);
    load();
    listeners.add(load);
    return () => { listeners.delete(load); };
  }, []);
  return value;
}

export const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
