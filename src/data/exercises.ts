export const muscleGroups = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"] as const;
export type Muscle = (typeof muscleGroups)[number];
export const equipmentTypes = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Smith Machine"] as const;
export type Equipment = (typeof equipmentTypes)[number];
export type Exercise = { id: string; name: string; muscle: Muscle; equipment: Equipment; type: "Compound" | "Isolation"; muscles?: Muscle[]; custom?: boolean };
export const muscleLabel = (e: Pick<Exercise, "muscle" | "muscles">) => (e.muscles?.length ? e.muscles : [e.muscle]).join(" + ");

export const quickSelects: { label: string; muscles: Muscle[] }[] = [
  { label: "Upper", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] },
  { label: "Lower", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"] },
  { label: "Push", muscles: ["Chest", "Shoulders", "Triceps"] },
  { label: "Pull", muscles: ["Back", "Biceps"] },
  { label: "Core", muscles: ["Core"] },
];

const raw: [string, Muscle, Equipment, "C" | "I"][] = [
  ["Bench Press", "Chest", "Barbell", "C"], ["Incline Dumbbell Press", "Chest", "Dumbbell", "C"], ["Machine Chest Press", "Chest", "Machine", "C"], ["Push-Up", "Chest", "Bodyweight", "C"], ["Cable Fly", "Chest", "Cable", "I"], ["Pec Deck", "Chest", "Machine", "I"],
  ["Barbell Row", "Back", "Barbell", "C"], ["Pull-Up", "Back", "Bodyweight", "C"], ["Lat Pulldown", "Back", "Cable", "C"], ["Chest-Supported Row", "Back", "Machine", "C"], ["Straight-Arm Pulldown", "Back", "Cable", "I"],
  ["Overhead Press", "Shoulders", "Barbell", "C"], ["Seated Dumbbell Press", "Shoulders", "Dumbbell", "C"], ["Lateral Raise", "Shoulders", "Dumbbell", "I"], ["Cable Lateral Raise", "Shoulders", "Cable", "I"], ["Rear Delt Fly", "Shoulders", "Machine", "I"],
  ["Chin-Up", "Biceps", "Bodyweight", "C"], ["Barbell Curl", "Biceps", "Barbell", "I"], ["Incline Dumbbell Curl", "Biceps", "Dumbbell", "I"], ["Cable Curl", "Biceps", "Cable", "I"],
  ["Close-Grip Bench Press", "Triceps", "Barbell", "C"], ["Dip", "Triceps", "Bodyweight", "C"], ["Rope Pushdown", "Triceps", "Cable", "I"], ["Overhead Cable Extension", "Triceps", "Cable", "I"],
  ["Back Squat", "Quads", "Barbell", "C"], ["Leg Press", "Quads", "Machine", "C"], ["Bulgarian Split Squat", "Quads", "Dumbbell", "C"], ["Leg Extension", "Quads", "Machine", "I"],
  ["Romanian Deadlift", "Hamstrings", "Barbell", "C"], ["Lying Leg Curl", "Hamstrings", "Machine", "I"], ["Seated Leg Curl", "Hamstrings", "Machine", "I"],
  ["Hip Thrust", "Glutes", "Barbell", "C"], ["Walking Lunge", "Glutes", "Dumbbell", "C"], ["Cable Kickback", "Glutes", "Cable", "I"],
  ["Standing Calf Raise", "Calves", "Machine", "I"], ["Seated Calf Raise", "Calves", "Machine", "I"],
  ["Smith Machine Bench Press", "Chest", "Smith Machine", "C"], ["Dumbbell Bench Press", "Chest", "Dumbbell", "C"], ["Incline Barbell Press", "Chest", "Barbell", "C"], ["Dumbbell Fly", "Chest", "Dumbbell", "I"],
  ["Seated Cable Row", "Back", "Cable", "C"], ["Single-Arm Dumbbell Row", "Back", "Dumbbell", "C"], ["Deadlift", "Back", "Barbell", "C"], ["Machine Row", "Back", "Machine", "C"],
  ["Smith Machine Shoulder Press", "Shoulders", "Smith Machine", "C"], ["Machine Shoulder Press", "Shoulders", "Machine", "C"], ["Face Pull", "Shoulders", "Cable", "I"],
  ["Hammer Curl", "Biceps", "Dumbbell", "I"], ["Preacher Curl", "Biceps", "Machine", "I"], ["Skull Crusher", "Triceps", "Barbell", "I"], ["Dumbbell Overhead Extension", "Triceps", "Dumbbell", "I"],
  ["Smith Machine Squat", "Quads", "Smith Machine", "C"], ["Hack Squat", "Quads", "Machine", "C"], ["Goblet Squat", "Quads", "Dumbbell", "C"],
  ["Dumbbell Romanian Deadlift", "Hamstrings", "Dumbbell", "C"], ["Nordic Curl", "Hamstrings", "Bodyweight", "I"], ["Glute Bridge", "Glutes", "Bodyweight", "I"], ["Hip Abduction", "Glutes", "Machine", "I"],
  ["Smith Machine Calf Raise", "Calves", "Smith Machine", "I"], ["Single-Leg Calf Raise", "Calves", "Bodyweight", "I"],
  ["Hanging Leg Raise", "Core", "Bodyweight", "I"], ["Cable Crunch", "Core", "Cable", "I"], ["Plank", "Core", "Bodyweight", "I"], ["Ab Wheel Rollout", "Core", "Bodyweight", "C"],
];

export const exercises: Exercise[] = raw.map(([name, muscle, equipment, t]) => ({ id: name.toLowerCase().replace(/[^a-z]+/g, "-"), name, muscle, equipment, type: t === "C" ? "Compound" : "Isolation" }));

export type WorkoutExercise = Exercise & { key: string; sets: number; reps: string; restSeconds?: number; supersetWith?: string };
let seq = 0;
export const toWorkoutExercise = (e: Exercise): WorkoutExercise => ({ ...e, key: `${e.id}-${seq++}`, sets: e.type === "Compound" ? 4 : 3, reps: e.type === "Compound" ? "6–8" : "10–12" });

const shuffle = <T,>(a: T[], random: () => number = Math.random) => {
  const result = [...a];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
};

function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateWorkout(muscles: Muscle[], count: number, seed = 1): WorkoutExercise[] {
  if (!muscles.length) return [];
  const random = seededRandom(seed);
  const pools = new Map(muscles.map((m) => {
    const list = exercises.filter((e) => e.muscle === m);
    return [m, [...shuffle(list.filter((e) => e.type === "Compound"), random), ...shuffle(list.filter((e) => e.type === "Isolation"), random)]];
  }));
  const picked: Exercise[] = [];
  let guard = 0;
  while (picked.length < count && guard++ < 100) {
    let added = false;
    for (const m of muscles) {
      if (picked.length >= count) break;
      const next = pools.get(m)!.shift();
      if (next) { picked.push(next); added = true; }
    }
    if (!added) break;
  }
  return picked.sort((a, b) => (a.type === b.type ? 0 : a.type === "Compound" ? -1 : 1)).map((exercise, index) => ({ ...toWorkoutExercise(exercise), key: `${exercise.id}-${seed}-${index}` }));
}

export function findReplacement(current: WorkoutExercise, workout: WorkoutExercise[]): Exercise | undefined {
  const used = new Set(workout.map((e) => e.id));
  const options = exercises.filter((e) => e.muscle === current.muscle && !used.has(e.id));
  const same = options.filter((e) => e.type === current.type);
  return shuffle(same.length ? same : options)[0];
}
