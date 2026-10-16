import { exercises, muscleGroups, type Muscle } from "../data/exercises.ts";
import type { CompletedExercise, CompletedSet, CompletedWorkout } from "./training-data";
import type { TrainingGoal } from "./user-preferences";

const WEEK = 7 * 86_400_000;
const library = new Map(exercises.map((exercise) => [exercise.id, exercise]));

/** An estimate of supporting-muscle work, not a measurement of effort or stimulus. */
export const DEFAULT_SECONDARY_CREDIT = 0.5;
export type CoverageStatus =
  "Well trained" | "Near target" | "Lightly trained" | "Not trained" | "Above target";
/** Avoid drawing attention to tiny gaps below an approximate reference range. */
export const NEAR_TARGET_RATIO = 0.95;
export type WeeklyTarget = { min: number; max: number };
type TargetProfile = "muscle" | "strength" | "general";

// Suggested app reference ranges, in effective sets/week. Keep these configurable in one place.
// Muscle-building ranges are the ranges agreed in the Progress redesign discussion.
export const WEEKLY_MUSCLE_TARGETS: Record<TargetProfile, Record<Muscle, WeeklyTarget>> = {
  muscle: {
    Chest: { min: 8, max: 14 },
    Back: { min: 10, max: 16 },
    Shoulders: { min: 8, max: 14 },
    Biceps: { min: 6, max: 12 },
    Triceps: { min: 6, max: 12 },
    Quads: { min: 8, max: 14 },
    Hamstrings: { min: 6, max: 12 },
    Glutes: { min: 6, max: 12 },
    Calves: { min: 4, max: 10 },
    Core: { min: 4, max: 10 },
  },
  strength: {
    Chest: { min: 6, max: 10 },
    Back: { min: 6, max: 12 },
    Shoulders: { min: 6, max: 10 },
    Biceps: { min: 4, max: 8 },
    Triceps: { min: 4, max: 8 },
    Quads: { min: 6, max: 10 },
    Hamstrings: { min: 4, max: 8 },
    Glutes: { min: 4, max: 8 },
    Calves: { min: 3, max: 6 },
    Core: { min: 3, max: 6 },
  },
  general: {
    Chest: { min: 4, max: 8 },
    Back: { min: 6, max: 10 },
    Shoulders: { min: 4, max: 8 },
    Biceps: { min: 3, max: 6 },
    Triceps: { min: 3, max: 6 },
    Quads: { min: 4, max: 8 },
    Hamstrings: { min: 3, max: 6 },
    Glutes: { min: 3, max: 6 },
    Calves: { min: 2, max: 6 },
    Core: { min: 2, max: 6 },
  },
};

// Preserve Progress's existing pastel muscle palette, including distinct arm colours.
export const MUSCLE_COLOURS: Record<Muscle, string> = {
  Chest: "#db666a",
  Back: "#688ec0",
  Shoulders: "#d8a54e",
  Biceps: "#9878c3",
  Triceps: "#75ac8e",
  Quads: "#87949c",
  Hamstrings: "#b18b6d",
  Glutes: "#dc8c9f",
  Calves: "#9b83c6",
  Core: "#64aeb8",
};

export function targetProfileForGoals(goals: readonly TrainingGoal[]) {
  // Match the app's existing rep/rest priority when both strength and muscle are selected.
  if (goals.includes("Get stronger")) return { key: "strength" as const, label: "Strength" };
  if (goals.length === 0 || goals.includes("Build muscle"))
    return { key: "muscle" as const, label: "Muscle building" };
  return { key: "general" as const, label: "General fitness" };
}

export function coverageStatus(weeklySets: number, target: WeeklyTarget): CoverageStatus {
  if (weeklySets <= 0) return "Not trained";
  if (weeklySets < target.min * NEAR_TARGET_RATIO) return "Lightly trained";
  if (weeklySets < target.min) return "Near target";
  if (weeklySets > target.max) return "Above target";
  return "Well trained";
}

/** Saved ordered muscle metadata wins. Enrich older primary-only records from the library. */
export function contributionMuscles(exercise: CompletedExercise): Muscle[] {
  const saved = [
    ...new Set((exercise.muscles ?? []).filter((muscle) => muscleGroups.includes(muscle))),
  ];
  const known = library.get(exercise.exerciseId);
  if (!saved.length) return known?.tracking === "cardio" ? [] : [...(known?.muscles ?? [])];
  if (saved.length === 1 && known && known.muscle === saved[0] && known.tracking !== "cardio") {
    return [...new Set(known.muscles ?? saved)];
  }
  return saved;
}

function isWorkingSet(set: CompletedSet) {
  return (
    set.completed !== false &&
    set.kind !== "warmup" &&
    set.kind !== "cardio" &&
    set.durationSeconds === undefined &&
    Number.isFinite(set.reps) &&
    set.reps > 0
  );
}

export type ExerciseContribution = {
  exerciseId: string;
  name: string;
  role: "Direct" | "Indirect";
  credit: number;
  workingSets: number;
  effectiveSets: number;
  weeklySets: number;
  sessions: number;
  lastAt: number;
};
export type MuscleCoverage = {
  muscle: Muscle;
  directSets: number;
  indirectSets: number;
  effectiveSets: number;
  weeklySets: number;
  recentSets: number;
  lastAt: number | null;
  target: WeeklyTarget;
  status: CoverageStatus;
  contributions: ExerciseContribution[];
};
export type BalanceSplit = {
  firstLabel: string;
  secondLabel: string;
  firstSets: number;
  secondSets: number;
  firstPercent: number | null;
  secondPercent: number | null;
  description: string;
};

/** Plain-language description of the regional split, including an empty-data state. */
export function balanceSummary(split: BalanceSplit) {
  if (split.firstPercent === null)
    return "No upper- or lower-body training recorded in this period.";
  if (Math.abs(split.firstPercent - 50) <= 5)
    return "Your training has been shared evenly between upper and lower body.";
  return `Your training has focused mostly on ${split.firstPercent > 50 ? "upper" : "lower"} body.`;
}

function balanceSplit(
  firstLabel: string,
  secondLabel: string,
  firstSets: number,
  secondSets: number,
): BalanceSplit {
  const total = firstSets + secondSets;
  const firstPercent = total ? Math.round((firstSets / total) * 100) : null;
  const secondPercent = firstPercent === null ? null : 100 - firstPercent;
  return {
    firstLabel,
    secondLabel,
    firstSets,
    secondSets,
    firstPercent,
    secondPercent,
    description:
      firstPercent === null
        ? "No sets in this period"
        : Math.abs(firstPercent - 50) <= 5
          ? "Similar share"
          : `${firstPercent > 50 ? firstLabel : secondLabel} emphasis`,
  };
}

/** Push/pull is an upper-body movement split. Rear-delt exercises must not become pushes. */
function upperMovement(exercise: CompletedExercise, primary: Muscle): "push" | "pull" | null {
  if (primary === "Back" || primary === "Biceps") return "pull";
  if (primary === "Chest" || primary === "Triceps") return "push";
  if (primary === "Shoulders") {
    return /rear[- ]?delt|face[- ]?pull|reverse[- ]?fly|\brow\b|\bshrug\b/i.test(
      `${exercise.exerciseId} ${exercise.name}`,
    )
      ? "pull"
      : "push";
  }
  return null;
}

export type TrainingAnalysis = ReturnType<typeof analyseTraining>;

/** Pure selector: only completed history enters; planned/active workouts are never inputs. */
export function analyseTraining(
  workouts: readonly CompletedWorkout[],
  from: number,
  to: number,
  goals: readonly TrainingGoal[] = [],
  options: { secondaryCredit?: number } = {},
) {
  const profile = targetProfileForGoals(goals);
  const weeks = Math.max((to - from) / WEEK, 1 / 7);
  const requestedCredit = options.secondaryCredit ?? DEFAULT_SECONDARY_CREDIT;
  const secondaryCredit = Number.isFinite(requestedCredit)
    ? Math.min(1, Math.max(0, requestedCredit))
    : DEFAULT_SECONDARY_CREDIT;
  const coverage: MuscleCoverage[] = muscleGroups.map((muscle) => ({
    muscle,
    directSets: 0,
    indirectSets: 0,
    effectiveSets: 0,
    weeklySets: 0,
    recentSets: 0,
    lastAt: null,
    target: { ...WEEKLY_MUSCLE_TARGETS[profile.key][muscle] },
    status: "Not trained",
    contributions: [],
  }));
  const byMuscle = new Map(coverage.map((row) => [row.muscle, row]));
  const contributionMaps = new Map<Muscle, Map<string, ExerciseContribution>>();
  const sessionIds = new Map<ExerciseContribution, Set<string>>();
  let push = 0;
  let pull = 0;
  let workingSets = 0;
  for (const workout of workouts) {
    if (!Number.isFinite(workout.startedAt) || workout.startedAt < from || workout.startedAt > to)
      continue;
    for (const exercise of workout.exercises) {
      // Older cardio rows may lack a tracking flag; library metadata still identifies them.
      if (
        exercise.exerciseId === "__note__" ||
        exercise.tracking === "cardio" ||
        library.get(exercise.exerciseId)?.tracking === "cardio"
      )
        continue;
      const count = exercise.sets.filter(isWorkingSet).length;
      const muscles = contributionMuscles(exercise);
      const primary = muscles[0];
      if (!count || !primary) continue;
      workingSets += count;
      const movement = upperMovement(exercise, primary);
      if (movement === "push") push += count;
      if (movement === "pull") pull += count;
      muscles.forEach((muscle, index) => {
        const row = byMuscle.get(muscle)!;
        const direct = index === 0;
        const credit = direct ? 1 : secondaryCredit;
        if (!credit) return;
        const effective = count * credit;
        if (direct) row.directSets += effective;
        else row.indirectSets += effective;
        if (workout.startedAt >= to - WEEK) row.recentSets += effective;
        row.lastAt = Math.max(row.lastAt ?? 0, workout.startedAt);
        let map = contributionMaps.get(muscle);
        if (!map) {
          map = new Map();
          contributionMaps.set(muscle, map);
        }
        const key = `${exercise.exerciseId}:${direct ? "direct" : "indirect"}`;
        let contribution = map.get(key);
        if (!contribution) {
          contribution = {
            exerciseId: exercise.exerciseId,
            name: exercise.name,
            role: direct ? "Direct" : "Indirect",
            credit,
            workingSets: 0,
            effectiveSets: 0,
            weeklySets: 0,
            sessions: 0,
            lastAt: workout.startedAt,
          };
          map.set(key, contribution);
          sessionIds.set(contribution, new Set());
        }
        if (workout.startedAt >= contribution.lastAt) contribution.name = exercise.name;
        contribution.lastAt = Math.max(contribution.lastAt, workout.startedAt);
        contribution.workingSets += count;
        contribution.effectiveSets += effective;
        contribution.weeklySets = contribution.effectiveSets / weeks;
        sessionIds.get(contribution)!.add(workout.id);
        contribution.sessions = sessionIds.get(contribution)!.size;
      });
    }
  }
  for (const row of coverage) {
    row.effectiveSets = row.directSets + row.indirectSets;
    row.weeklySets = row.effectiveSets / weeks;
    row.status = coverageStatus(row.weeklySets, row.target);
    row.contributions = [...(contributionMaps.get(row.muscle)?.values() ?? [])].sort(
      (a, b) => b.effectiveSets - a.effectiveSets || a.name.localeCompare(b.name),
    );
  }
  const sum = (muscles: readonly Muscle[]) =>
    muscles.reduce((total, muscle) => total + byMuscle.get(muscle)!.effectiveSets, 0);
  return {
    coverage,
    weeks,
    from,
    to,
    secondaryCredit,
    workingSets,
    targetLabel: profile.label,
    upperLower: balanceSplit(
      "Upper",
      "Lower",
      sum(["Chest", "Back", "Shoulders", "Biceps", "Triceps"]),
      sum(["Quads", "Hamstrings", "Glutes", "Calves"]),
    ),
    pushPull: balanceSplit("Push", "Pull", push, pull),
    insight: trainingInsight(coverage, workingSets),
  };
}

function joinMuscles(rows: MuscleCoverage[]) {
  return rows.map((row) => row.muscle).join(" and ");
}
function trainingInsight(coverage: MuscleCoverage[], workingSets: number) {
  if (!workingSets)
    return {
      focusMuscles: [] as Muscle[],
      message: "Complete a strength workout to see which muscles you’ve worked.",
    };
  const below = coverage
    .filter((row) => row.status === "Lightly trained" || row.status === "Not trained")
    .sort((a, b) => a.weeklySets / a.target.min - b.weeklySets / b.target.min);
  if (below.length) {
    const focus = below.slice(0, 2);
    return {
      focusMuscles: focus.map((row) => row.muscle),
      message: `Give ${joinMuscles(focus).toLowerCase()} a little more attention next time.`,
    };
  }
  return {
    focusMuscles: [] as Muscle[],
    message: "You’ve given every muscle group attention in this period.",
  };
}

export const formatEffectiveSets = (sets: number) =>
  Number(sets.toFixed(1)).toLocaleString("en-AU", { maximumFractionDigits: 1 });

/** Rank shortfalls against each muscle's own target, never against another muscle. */
export function suggestedMuscles(analysis: TrainingAnalysis) {
  if (!analysis.workingSets) return [];
  return analysis.coverage
    .filter((row) => row.status === "Not trained" || row.status === "Lightly trained")
    .sort((a, b) => a.weeklySets / a.target.min - b.weeklySets / b.target.min || (a.lastAt ?? 0) - (b.lastAt ?? 0))
    .slice(0, 3);
}
