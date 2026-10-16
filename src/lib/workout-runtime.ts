export type RestTimerState = { endsAt: number; expanded: boolean; duration: number };
export type CircuitRun = { id: string; phase: "countdown" | "work" | "rest"; round: number; endsAt: number };
export type CircuitTiming = { id: string; workSeconds: number; restSeconds: number; rounds: number };
export type WorkoutRuntime = {
  version: 1;
  workoutId: string;
  rest: RestTimerState | null;
  circuitRun: CircuitRun | null;
  circuitMinimized: boolean;
  completedCircuits: string[];
};
export const WORKOUT_RUNTIME_KEY = "recomp-workout-runtime-v1";
export const emptyRuntime = (workoutId: string): WorkoutRuntime => ({ version: 1, workoutId, rest: null, circuitRun: null, circuitMinimized: false, completedCircuits: [] });

/** Advance against the original deadlines, including time spent on another screen. */
export function advanceCircuit(run: CircuitRun, circuit: CircuitTiming, now: number): CircuitRun | null {
  if (!Number.isFinite(run.endsAt) || !Number.isInteger(run.round) || run.round < 1 ||
      !Number.isInteger(circuit.rounds) || circuit.rounds < 1 || circuit.rounds > 1000 ||
      !Number.isFinite(circuit.workSeconds) || circuit.workSeconds <= 0 ||
      !Number.isFinite(circuit.restSeconds) || circuit.restSeconds < 0) return null;
  let next = run;
  while (now >= next.endsAt) {
    if (next.phase === "countdown") next = { ...next, phase: "work", endsAt: next.endsAt + circuit.workSeconds * 1000 };
    else if (next.phase === "work") {
      if (next.round >= circuit.rounds) return null;
      next = { ...next, phase: "rest", endsAt: next.endsAt + circuit.restSeconds * 1000 };
    } else {
      if (next.round >= circuit.rounds) return null;
      next = { ...next, phase: "work", round: next.round + 1, endsAt: next.endsAt + circuit.workSeconds * 1000 };
    }
  }
  return next;
}

export function restoreRuntime(raw: string | null, workoutId: string): WorkoutRuntime {
  const fallback = emptyRuntime(workoutId);
  try {
    const value = JSON.parse(raw ?? "null");
    if (value?.version !== 1 || value.workoutId !== workoutId) return fallback;
    const rest = value.rest;
    const run = value.circuitRun;
    return { ...fallback,
      rest: rest && Number.isFinite(rest.endsAt) && Number.isFinite(rest.duration) && rest.duration > 0 ? { endsAt: rest.endsAt, duration: rest.duration, expanded: !!rest.expanded } : null,
      circuitRun: run && typeof run.id === "string" && ["countdown", "work", "rest"].includes(run.phase) && Number.isFinite(run.endsAt) && Number.isInteger(run.round) && run.round > 0 ? run : null,
      circuitMinimized: !!value.circuitMinimized,
      completedCircuits: Array.isArray(value.completedCircuits) ? value.completedCircuits.filter((id: unknown) => typeof id === "string") : [],
    };
  } catch { return fallback; }
}
