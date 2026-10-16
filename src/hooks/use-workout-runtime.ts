import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { advanceCircuit, emptyRuntime, restoreRuntime, WORKOUT_RUNTIME_KEY, type CircuitTiming, type WorkoutRuntime } from "../lib/workout-runtime";

export function useWorkoutRuntime(workoutId: string, circuits: readonly CircuitTiming[], now: number) {
  const [runtime, setRuntime] = useState(() => {
    try { return restoreRuntime(localStorage.getItem(WORKOUT_RUNTIME_KEY), workoutId); }
    catch { return emptyRuntime(workoutId); }
  });
  const current = useRef(runtime);
  const cleared = useRef(false);
  const update = useCallback(<K extends keyof WorkoutRuntime>(key: K, action: SetStateAction<WorkoutRuntime[K]>) => {
    if (cleared.current) return;
    const value = typeof action === "function" ? (action as (value: WorkoutRuntime[K]) => WorkoutRuntime[K])(current.current[key]) : action;
    const next = { ...current.current, [key]: value };
    current.current = next;
    // Write immediately, so a navigation in the same event cannot lose this change.
    try { localStorage.setItem(WORKOUT_RUNTIME_KEY, JSON.stringify(next)); } catch { /* session still works when storage is unavailable */ }
    setRuntime(next);
  }, []);
  const clear = useCallback(() => {
    cleared.current = true;
    try { localStorage.removeItem(WORKOUT_RUNTIME_KEY); } catch { /* no stored runtime */ }
  }, []);
  useEffect(() => {
    const run = runtime.circuitRun;
    if (!run) return;
    const circuit = circuits.find((item) => item.id === run.id);
    if (!circuit) { update("circuitRun", null); return; }
    const next = advanceCircuit(run, circuit, now);
    if (next === run) return;
    update("circuitRun", next);
    if (!next) {
      update("completedCircuits", (ids) => ids.includes(run.id) ? ids : [...ids, run.id]);
      update("circuitMinimized", false);
    }
  }, [runtime.circuitRun, circuits, now, update]);
  return { runtime, update, clear };
}
