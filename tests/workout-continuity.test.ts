import assert from "node:assert/strict";
import test from "node:test";
import { advanceCircuit, emptyRuntime, restoreRuntime } from "../src/lib/workout-runtime.ts";
import { encodeExerciseSets, decodeExerciseSets } from "../src/lib/workout-exercise-storage.ts";
import { applyPreviousSession } from "../src/lib/previous-session.ts";
import { analyseTraining, suggestedMuscles } from "../src/lib/training-analysis.ts";
import type { CompletedExercise } from "../src/lib/training-data";
import type { ActiveExercise } from "../src/hooks/use-active-workout";

const circuit = { id: "c1", workSeconds: 60, restSeconds: 15, rounds: 3 };
const start = { id: "c1", phase: "countdown" as const, round: 1, endsAt: 3000 };

test("rest deadline, minimised circuit and completion survive reload for the same workout only", () => {
  const state = { ...emptyRuntime("workout-a"), rest: { endsAt: 90000, duration: 90, expanded: false }, circuitRun: start, circuitMinimized: true, completedCircuits: ["previous-circuit"] };
  assert.deepEqual(restoreRuntime(JSON.stringify(state), "workout-a"), state);
  assert.deepEqual(restoreRuntime(JSON.stringify(state), "workout-b"), emptyRuntime("workout-b"));
  assert.deepEqual(restoreRuntime("corrupted", "workout-a"), emptyRuntime("workout-a"));
});

test("circuit catches up over multiple phases without restarting the clock", () => {
  assert.deepEqual(advanceCircuit(start, circuit, 4000), { ...start, phase: "work", endsAt: 63000 });
  assert.deepEqual(advanceCircuit(start, circuit, 70000), { ...start, phase: "rest", endsAt: 78000 });
  assert.deepEqual(advanceCircuit(start, circuit, 145000), { ...start, phase: "rest", round: 2, endsAt: 153000 });
  assert.deepEqual(advanceCircuit(start, circuit, 160000), { ...start, phase: "work", round: 3, endsAt: 213000 });
  assert.equal(advanceCircuit(start, circuit, 213000), null); // no final rest
  assert.equal(advanceCircuit(start, circuit, 999999), null);
});

test("zero-rest circuits advance without an endless loop", () => {
  assert.deepEqual(advanceCircuit(start, { ...circuit, restSeconds: 0 }, 64000), { ...start, phase: "work", round: 2, endsAt: 123000 });
  assert.equal(advanceCircuit(start, { ...circuit, workSeconds: 0 }, 64000), null);
});

const exercise: CompletedExercise = { key: "row-1", exerciseId: "bench-press", name: "Bench press", muscles: ["Chest"], equipment: "Barbell", sets: [{ weight: 80, reps: 10 }, { weight: 80, reps: 8 }] };

test("tri-set and circuit fields survive the exact JSON array stored in the cloud", () => {
  for (const metadata of [
    { groupId: "tri-1", groupRestSeconds: 90 },
    { circuitId: "c1", circuitWorkSeconds: 60, circuitRestSeconds: 0, circuitRounds: 3, circuitReps: 12 },
  ]) {
    const stored = JSON.parse(JSON.stringify(encodeExerciseSets({ ...exercise, ...metadata })));
    const decoded = decodeExerciseSets(stored);
    assert.deepEqual(decoded.metadata, metadata);
    assert.deepEqual(decoded.sets, exercise.sets.map((set) => ({ ...set, completed: true })));
    assert.equal(stored[0].weight, 80); // older readers still see normal sets
    assert.equal(stored[1]._recompExercise, undefined);
    assert.deepEqual(decodeExerciseSets(encodeExerciseSets({ ...exercise, ...decoded.metadata, sets: decoded.sets })), decoded);
  }
});

test("legacy numeric-string sets and cardio data remain readable", () => {
  assert.deepEqual(decodeExerciseSets([{ weight: "80", reps: "8" }]), { metadata: {}, sets: [{ weight: 80, reps: 8 }] });
  const cardio = { ...exercise, cardioMetrics: ["duration" as const], sets: [{ kind: "cardio" as const, weight: 0, reps: 0, durationSeconds: 600, distanceKm: 2 }] };
  assert.equal(decodeExerciseSets(encodeExerciseSets(cardio)).sets[0]?.durationSeconds, 600);
  assert.deepEqual(decodeExerciseSets(null), { sets: [], metadata: {} });
});

const active: ActiveExercise = {
  id: "bench-press", key: "bench", name: "Bench press", muscle: "Chest", equipment: "Barbell", type: "Compound", sets: 3, reps: "8–12", restSeconds: 90,
  sessionSets: [
    { id: "warm", kind: "warmup", weight: "20", reps: "15", completed: false, weightEdited: false },
    { id: "one", weight: "85", reps: "9", completed: true, weightEdited: true },
    { id: "two", weight: "", reps: "10", completed: false, weightEdited: false },
    { id: "extra", weight: "", reps: "10", completed: false, weightEdited: false },
  ],
};
test("use last session fills completed and unfinished working sets without changing completion status or warm-ups", () => {
  const next = applyPreviousSession(active, [{ weight: 10, reps: 20, kind: "warmup" }, ...exercise.sets]);
  assert.deepEqual(next.sessionSets[0], active.sessionSets[0]);
  assert.deepEqual(next.sessionSets[1], { ...active.sessionSets[1], weight: "80", reps: "10", weightEdited: true });
  assert.deepEqual(next.sessionSets[2], { ...active.sessionSets[2], weight: "80", reps: "8", weightEdited: true });
  assert.deepEqual(next.sessionSets[3], active.sessionSets[3]);
  assert.equal(active.sessionSets[2]?.weight, ""); // immutable
});

test("use last session keeps bodyweight zero and leaves cardio unchanged", () => {
  assert.equal(applyPreviousSession(active, [{ weight: 0, reps: 12 }, { weight: 0, reps: 10 }]).sessionSets[2]?.weight, "0");
  const cardio = { ...active, tracking: "cardio" as const };
  assert.equal(applyPreviousSession(cardio, exercise.sets), cardio);
});

test("suggestions use the same target statuses as Progress and are absent without training", () => {
  const now = Date.UTC(2026, 9, 16);
  const from = now - 28 * 86400000;
  const empty = analyseTraining([], from, now, []);
  assert.deepEqual(suggestedMuscles(empty), []);
  const analysis = analyseTraining([{ id: "w1", name: "Upper", startedAt: now - 86400000, durationSec: 100, exercises: [exercise] }], from, now, []);
  const suggestions = suggestedMuscles(analysis);
  assert.equal(suggestions.length, 3);
  assert.ok(suggestions.every((row) => analysis.coverage.includes(row) && ["Not trained", "Lightly trained"].includes(row.status)));
  const allCovered = { ...analysis, coverage: analysis.coverage.map((row) => ({ ...row, status: "Well trained" as const })) };
  assert.deepEqual(suggestedMuscles(allCovered), []);
});
