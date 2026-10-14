import assert from "node:assert/strict";
import test from "node:test";
import {
  analyseTraining,
  contributionMuscles,
  coverageStatus,
  WEEKLY_MUSCLE_TARGETS,
} from "../src/lib/training-analysis.ts";
import type { CompletedExercise, CompletedSet, CompletedWorkout } from "../src/lib/training-data";
import type { Muscle } from "../src/data/exercises";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 14, 12);
const FROM = NOW - 28 * DAY;
const working: CompletedSet = { reps: 10, weight: 50 };
function exercise(
  id: string,
  muscles: Muscle[],
  sets = 4,
  patch: Partial<CompletedExercise> = {},
): CompletedExercise {
  return {
    key: id,
    exerciseId: id,
    name: id,
    muscles,
    equipment: "Barbell",
    sets: Array.from({ length: sets }, () => ({ ...working })),
    ...patch,
  };
}
function workout(
  exercises: CompletedExercise[],
  startedAt = NOW - DAY,
  id = "session-1",
): CompletedWorkout {
  return { id, name: "Workout", startedAt, durationSec: 1800, exercises };
}
const row = (result: ReturnType<typeof analyseTraining>, muscle: Muscle) =>
  result.coverage.find((item) => item.muscle === muscle)!;

test("compound sets give primary credit once and fractional supporting credit", () => {
  const result = analyseTraining(
    [workout([exercise("bench-press", ["Chest", "Chest", "Triceps", "Shoulders"])])],
    FROM,
    NOW,
  );
  assert.equal(row(result, "Chest").directSets, 4);
  assert.equal(row(result, "Chest").weeklySets, 1);
  assert.equal(row(result, "Triceps").indirectSets, 2);
  assert.equal(row(result, "Shoulders").effectiveSets, 2);
  assert.equal(result.workingSets, 4);
  assert.equal(result.pushPull.firstPercent, 100);
});

test("a calf target is independent of a heavily trained back", () => {
  const result = analyseTraining(
    [
      workout([
        exercise("standing-calf-raise", ["Calves"], 16),
        exercise("lat-pulldown", ["Back"], 120),
      ]),
    ],
    FROM,
    NOW,
  );
  assert.equal(row(result, "Calves").weeklySets, 4);
  assert.equal(row(result, "Calves").status, "Well trained");
  assert.equal(row(result, "Back").status, "Above target");
});

test("coverage boundaries use each muscle's range, including zero and above target", () => {
  const target = { min: 4, max: 10 };
  assert.equal(coverageStatus(0, target), "Not trained");
  assert.equal(coverageStatus(3.9, target), "Lightly trained");
  assert.equal(coverageStatus(4, target), "Well trained");
  assert.equal(coverageStatus(10, target), "Well trained");
  assert.equal(coverageStatus(10.1, target), "Above target");
});

test("all four periods divide by the full selected interval, including inactive weeks", () => {
  for (const days of [28, 91, 182, 365]) {
    const result = analyseTraining(
      [workout([exercise("cable-fly", ["Chest"], 8)])],
      NOW - days * DAY,
      NOW,
    );
    assert.equal(result.weeks, days / 7);
    assert.ok(Math.abs(row(result, "Chest").weeklySets - 8 / (days / 7)) < 1e-12);
    assert.equal(row(result, "Chest").recentSets, 8);
  }
});

test("period bounds exclude old and future sessions; recent credit uses last seven days", () => {
  const result = analyseTraining(
    [
      workout([exercise("cable-fly", ["Chest"], 2)], FROM - 1, "too-old"),
      workout([exercise("cable-fly", ["Chest"], 4)], FROM, "boundary"),
      workout([exercise("cable-fly", ["Chest"], 3)], NOW - 8 * DAY, "older"),
      workout([exercise("cable-fly", ["Chest"], 2)], NOW - 7 * DAY, "recent"),
      workout([exercise("cable-fly", ["Chest"], 1)], NOW, "now"),
      workout([exercise("cable-fly", ["Chest"], 5)], NOW + 1, "future"),
    ],
    FROM,
    NOW,
  );
  assert.equal(row(result, "Chest").effectiveSets, 10);
  assert.equal(row(result, "Chest").recentSets, 3);
});

test("warm-ups, unfinished and invalid sets, cardio and notes receive no strength credit", () => {
  const result = analyseTraining(
    [
      workout([
        exercise("cable-fly", ["Chest"], 0, {
          sets: [
            working,
            { ...working, kind: "warmup" },
            { ...working, completed: false },
            { ...working, kind: "cardio" },
            { ...working, durationSeconds: 60 },
            { ...working, reps: 0 },
            { ...working, reps: NaN },
          ],
        }),
        exercise("treadmill", ["Core"], 3), // legacy row without tracking
        exercise("custom-cardio", ["Quads"], 3, { tracking: "cardio" }),
        exercise("__note__", ["Core"], 3),
        exercise("plank", ["Core"], 1, { sets: [{ reps: 30, weight: 0 }] }), // timed strength hold
      ]),
    ],
    FROM,
    NOW,
  );
  assert.equal(result.workingSets, 2);
  assert.equal(row(result, "Chest").effectiveSets, 1);
  assert.equal(row(result, "Core").effectiveSets, 1);
  assert.equal(row(result, "Quads").effectiveSets, 0);
});

test("legacy primary-only and missing metadata are enriched; custom metadata wins", () => {
  assert.deepEqual(contributionMuscles(exercise("bench-press", ["Chest"])), [
    "Chest",
    "Triceps",
    "Shoulders",
  ]);
  assert.deepEqual(contributionMuscles(exercise("bench-press", [])), [
    "Chest",
    "Triceps",
    "Shoulders",
  ]);
  assert.deepEqual(contributionMuscles(exercise("custom-press", ["Triceps", "Chest", "Triceps"])), [
    "Triceps",
    "Chest",
  ]);
  assert.deepEqual(contributionMuscles(exercise("bench-press", ["Triceps"])), ["Triceps"]);
  assert.deepEqual(contributionMuscles(exercise("unknown", [])), []);
});

test("contribution totals reconcile, aggregate repeated/grouped exercises and deduplicate sessions", () => {
  const result = analyseTraining(
    [
      workout([
        exercise("bench-press", ["Chest"], 4, { groupId: "tri-1" }),
        exercise("rope-pushdown", ["Triceps"], 3, { groupId: "tri-1" }),
        exercise("bench-press", ["Chest"], 2, { circuitId: "circuit-1", circuitRounds: 3 }),
      ]),
      workout([exercise("bench-press", ["Chest"], 2)], NOW - 2 * DAY, "session-2"),
    ],
    FROM,
    NOW,
  );
  const triceps = row(result, "Triceps");
  assert.equal(triceps.directSets, 3);
  assert.equal(triceps.indirectSets, 4);
  assert.equal(triceps.effectiveSets, 7);
  assert.equal(
    triceps.contributions.reduce((total, item) => total + item.effectiveSets, 0),
    triceps.effectiveSets,
  );
  const bench = triceps.contributions.find((item) => item.exerciseId === "bench-press")!;
  assert.equal(bench.workingSets, 8); // circuit rounds are already logged as sets, never multiplied again
  assert.equal(bench.credit, 0.5);
  assert.equal(bench.sessions, 2);
  assert.equal(bench.weeklySets, 1);
});

test("goal targets match existing strength priority, with muscle defaults for no goal", () => {
  assert.deepEqual(row(analyseTraining([], FROM, NOW), "Back").target, { min: 10, max: 16 });
  assert.deepEqual(row(analyseTraining([], FROM, NOW, ["Build muscle"]), "Calves").target, {
    min: 4,
    max: 10,
  });
  assert.deepEqual(
    row(analyseTraining([], FROM, NOW, ["Get stronger", "Build muscle"]), "Chest").target,
    WEEKLY_MUSCLE_TARGETS.strength.Chest,
  );
  assert.deepEqual(
    row(analyseTraining([], FROM, NOW, ["Lose fat"]), "Chest").target,
    WEEKLY_MUSCLE_TARGETS.general.Chest,
  );
});

test("secondary credit is configurable and constrained; supporting credit can be disabled", () => {
  const history = [workout([exercise("bench-press", ["Chest"], 4)])];
  assert.equal(
    row(analyseTraining(history, FROM, NOW, [], { secondaryCredit: 0.25 }), "Triceps")
      .effectiveSets,
    1,
  );
  assert.equal(
    row(analyseTraining(history, FROM, NOW, [], { secondaryCredit: 0 }), "Triceps").effectiveSets,
    0,
  );
  assert.equal(analyseTraining(history, FROM, NOW, [], { secondaryCredit: 2 }).secondaryCredit, 1);
  assert.equal(
    analyseTraining(history, FROM, NOW, [], { secondaryCredit: NaN }).secondaryCredit,
    0.5,
  );
});

test("balance excludes core, lower-body push/pull, and classifies rear-delt pulls correctly", () => {
  const result = analyseTraining(
    [
      workout([
        exercise("cable-fly", ["Chest"], 4),
        exercise("face-pull", ["Shoulders"], 4),
        exercise("leg-extension", ["Quads"], 4),
        exercise("plank", ["Core"], 12),
      ]),
    ],
    FROM,
    NOW,
  );
  assert.equal(result.upperLower.firstSets, 10); // chest 4 + shoulders 4 + supporting back 2
  assert.equal(result.upperLower.secondSets, 4);
  assert.equal(result.pushPull.firstPercent, 50);
  assert.equal(result.pushPull.secondPercent, 50);
  assert.equal(result.upperLower.firstPercent! + result.upperLower.secondPercent!, 100);
});

test("empty and core-only histories keep ten zero/appropriate rows, with no invented percentages", () => {
  const empty = analyseTraining([], FROM, NOW);
  assert.equal(empty.coverage.length, 10);
  assert.ok(empty.coverage.every((item) => item.status === "Not trained"));
  assert.equal(empty.pushPull.firstPercent, null);
  assert.equal(empty.upperLower.firstPercent, null);
  assert.equal(empty.insight.title, "Your coverage starts here");
  const core = analyseTraining([workout([exercise("plank", ["Core"], 4)])], FROM, NOW);
  assert.equal(core.upperLower.firstPercent, null);
  assert.equal(core.pushPull.firstPercent, null);
});

test("insight reflects below-target coverage, above-target volume and full coverage", () => {
  const all = Object.entries(WEEKLY_MUSCLE_TARGETS.muscle).map(([muscle, target]) =>
    exercise(`custom-${muscle}`, [muscle as Muscle], target.min * 4),
  );
  assert.equal(
    analyseTraining([workout(all)], FROM, NOW).insight.title,
    "Coverage across every muscle",
  );
  const high = all.map((item) =>
    item.muscles[0] === "Chest"
      ? { ...item, sets: Array.from({ length: 60 }, () => working) }
      : item,
  );
  assert.equal(analyseTraining([workout(high)], FROM, NOW).insight.title, "Chest above range");
  const missingLegs = all.filter((item) => !["Hamstrings", "Glutes"].includes(item.muscles[0]!));
  assert.equal(
    analyseTraining([workout(missingLegs)], FROM, NOW).insight.title,
    "Hamstrings and Glutes could use more attention",
  );
});

test("analysis never mutates completed history or configured targets", () => {
  const history = [workout([exercise("bench-press", ["Chest", "Chest", "Triceps"])])];
  const before = JSON.stringify(history);
  const result = analyseTraining(history, FROM, NOW);
  result.coverage[0]!.target.min = 99;
  assert.equal(JSON.stringify(history), before);
  assert.equal(WEEKLY_MUSCLE_TARGETS.muscle.Chest.min, 8);
});
