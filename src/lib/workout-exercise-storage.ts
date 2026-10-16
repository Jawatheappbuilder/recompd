import type { CompletedExercise, CompletedSet } from "./training-data";

type Metadata = Pick<CompletedExercise, "groupId" | "groupRestSeconds" | "circuitId" | "circuitWorkSeconds" | "circuitRestSeconds" | "circuitRounds" | "circuitReps" | "cardioMetrics">;
type StoredSet = CompletedSet & { _recompExercise?: Metadata & { version: 1 } };

/** Keep the existing JSON set array readable by older clients; metadata rides on its first set. */
export function encodeExerciseSets(exercise: CompletedExercise): StoredSet[] {
  const metadata = readMetadata({ ...exercise, version: 1 });
  return exercise.sets.map((set, index) => ({ ...set, completed: true,
    ...(index === 0 && Object.keys(metadata).length ? { _recompExercise: { version: 1 as const, ...metadata } } : {}),
  }));
}

function readMetadata(value: unknown): Metadata {
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1) return {};
  const raw = value as Record<string, unknown>;
  const result: Metadata = {};
  for (const key of ["groupId", "circuitId"] as const) {
    if (typeof raw[key] === "string" && raw[key]) result[key] = raw[key];
  }
  for (const key of ["groupRestSeconds", "circuitWorkSeconds", "circuitRestSeconds", "circuitRounds", "circuitReps"] as const) {
    const number = raw[key];
    if (typeof number === "number" && Number.isFinite(number) && number >= 0) result[key] = number;
  }
  const metrics = raw["cardioMetrics"];
  if (Array.isArray(metrics) && metrics.every((metric) => typeof metric === "string")) result.cardioMetrics = metrics as NonNullable<CompletedExercise["cardioMetrics"]>;
  return result;
}

export function decodeExerciseSets(value: unknown): { sets: CompletedSet[]; metadata: Metadata } {
  if (!Array.isArray(value)) return { sets: [], metadata: {} };
  const rows = value.filter((set) => set && typeof set === "object") as StoredSet[];
  return {
    metadata: readMetadata(rows[0]?._recompExercise),
    sets: rows.map(({ _recompExercise: _metadata, ...set }) => ({ ...set, weight: Number(set.weight) || 0, reps: Number(set.reps) || 0 })),
  };
}
