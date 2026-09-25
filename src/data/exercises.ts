export const muscleGroups = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"] as const;
export type Muscle = (typeof muscleGroups)[number];
export const equipmentTypes = ["Barbell", "Dumbbell", "Cable", "Machine", "Plate-loaded Machine", "Pin-loaded Machine", "Bodyweight", "Smith Machine", "Cardio Machine"] as const;
export type Equipment = (typeof equipmentTypes)[number];
export type ExerciseType = "Compound" | "Isolation" | "Cardio";
export type CardioMetric = "duration" | "distance" | "speed" | "pace" | "incline" | "level" | "floors" | "steps" | "pace500m";
export type Exercise = {
  id: string; name: string; muscle: Muscle; equipment: Equipment; type: ExerciseType;
  muscles?: Muscle[]; custom?: boolean; tracking?: "strength" | "cardio"; cardioMetrics?: CardioMetric[];
};
export const isCardioExercise = (exercise: Pick<Exercise, "tracking" | "type">) => exercise.tracking === "cardio" || exercise.type === "Cardio";
export const muscleLabel = (exercise: Pick<Exercise, "muscle" | "muscles" | "tracking">) => exercise.tracking === "cardio" ? "Cardio" : (exercise.muscles?.length ? exercise.muscles : [exercise.muscle]).join(" + ");
export const exerciseLabel = (exercise: Pick<Exercise, "muscle" | "muscles" | "tracking" | "equipment">) => `${muscleLabel(exercise)} · ${exercise.equipment}`;

export const quickSelects: { label: string; muscles: Muscle[] }[] = [
  { label: "Upper", muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] },
  { label: "Lower", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"] },
  { label: "Push", muscles: ["Chest", "Shoulders", "Triceps"] },
  { label: "Pull", muscles: ["Back", "Biceps"] },
  { label: "Core", muscles: ["Core"] },
];

type RawStrength = [string, Muscle, Equipment, "C" | "I", Muscle[]?];
const strength: RawStrength[] = [
  // Chest
  ["Bench Press","Chest","Barbell","C",["Triceps","Shoulders"]], ["Incline Barbell Press","Chest","Barbell","C",["Shoulders","Triceps"]], ["Decline Barbell Press","Chest","Barbell","C",["Triceps"]],
  ["Dumbbell Bench Press","Chest","Dumbbell","C",["Triceps","Shoulders"]], ["Incline Dumbbell Press","Chest","Dumbbell","C",["Shoulders","Triceps"]], ["Decline Dumbbell Press","Chest","Dumbbell","C",["Triceps"]],
  ["Machine Chest Press","Chest","Machine","C",["Triceps","Shoulders"]], ["Plate-Loaded Chest Press","Chest","Plate-loaded Machine","C",["Triceps","Shoulders"]], ["Incline Plate-Loaded Press","Chest","Plate-loaded Machine","C",["Shoulders","Triceps"]],
  ["Pin-Loaded Chest Press","Chest","Pin-loaded Machine","C",["Triceps"]], ["Smith Machine Bench Press","Chest","Smith Machine","C",["Triceps","Shoulders"]], ["Smith Machine Incline Press","Chest","Smith Machine","C",["Shoulders","Triceps"]],
  ["Push-Up","Chest","Bodyweight","C",["Triceps","Shoulders","Core"]], ["Deficit Push-Up","Chest","Bodyweight","C",["Triceps","Shoulders","Core"]], ["Chest Dip","Chest","Bodyweight","C",["Triceps","Shoulders"]],
  ["Single-Arm Cable Chest Press","Chest","Cable","C",["Triceps","Shoulders"]],
  ["Cable Fly","Chest","Cable","I"], ["Low-to-High Cable Fly","Chest","Cable","I"], ["High-to-Low Cable Fly","Chest","Cable","I"], ["Pec Deck","Chest","Pin-loaded Machine","I"], ["Dumbbell Fly","Chest","Dumbbell","I"], ["Dumbbell Pullover","Chest","Dumbbell","C",["Back","Triceps"]],
  // Back
  ["Barbell Row","Back","Barbell","C",["Biceps","Shoulders","Core"]], ["Pendlay Row","Back","Barbell","C",["Biceps","Core"]], ["Underhand Barbell Row","Back","Barbell","C",["Biceps","Core"]], ["Meadows Row","Back","Barbell","C",["Biceps","Core"]],
  ["Single-Arm Dumbbell Row","Back","Dumbbell","C",["Biceps"]], ["Chest-Supported Dumbbell Row","Back","Dumbbell","C",["Biceps","Shoulders"]], ["Dumbbell Pullover","Back","Dumbbell","C",["Chest","Triceps"]],
  ["Pull-Up","Back","Bodyweight","C",["Biceps","Core"]], ["Chin-Up","Back","Bodyweight","C",["Biceps","Core"]], ["Neutral-Grip Pull-Up","Back","Bodyweight","C",["Biceps","Core"]], ["Inverted Row","Back","Bodyweight","C",["Biceps","Core"]],
  ["Lat Pulldown","Back","Cable","C",["Biceps"]], ["Neutral-Grip Lat Pulldown","Back","Cable","C",["Biceps"]], ["Single-Arm Lat Pulldown","Back","Cable","C",["Biceps"]], ["Seated Cable Row","Back","Cable","C",["Biceps","Shoulders"]], ["Wide Cable Row","Back","Cable","C",["Biceps","Shoulders"]], ["Single-Arm Cable Row","Back","Cable","C",["Biceps"]], ["Straight-Arm Pulldown","Back","Cable","I",["Triceps"]],
  ["Chest-Supported Row","Back","Machine","C",["Biceps","Shoulders"]], ["Machine Row","Back","Machine","C",["Biceps"]], ["Plate-Loaded High Row","Back","Plate-loaded Machine","C",["Biceps","Shoulders"]], ["Plate-Loaded Low Row","Back","Plate-loaded Machine","C",["Biceps"]], ["Pin-Loaded Pullover","Back","Pin-loaded Machine","I"], ["Deadlift","Back","Barbell","C",["Hamstrings","Glutes","Core"]], ["Rack Pull","Back","Barbell","C",["Glutes","Hamstrings"]],
  ["T-Bar Row","Back","Plate-loaded Machine","C",["Biceps","Shoulders"]],
  // Shoulders
  ["Overhead Press","Shoulders","Barbell","C",["Triceps","Core"]], ["Push Press","Shoulders","Barbell","C",["Triceps","Quads","Glutes","Core"]],
  ["Seated Dumbbell Press","Shoulders","Dumbbell","C",["Triceps"]], ["Standing Dumbbell Press","Shoulders","Dumbbell","C",["Triceps","Core"]], ["Arnold Press","Shoulders","Dumbbell","C",["Triceps"]],
  ["Machine Shoulder Press","Shoulders","Machine","C",["Triceps"]], ["Plate-Loaded Shoulder Press","Shoulders","Plate-loaded Machine","C",["Triceps"]], ["Pin-Loaded Shoulder Press","Shoulders","Pin-loaded Machine","C",["Triceps"]], ["Smith Machine Shoulder Press","Shoulders","Smith Machine","C",["Triceps"]],
  ["Lateral Raise","Shoulders","Dumbbell","I"], ["Lean-Away Lateral Raise","Shoulders","Dumbbell","I"], ["Cable Lateral Raise","Shoulders","Cable","I"], ["Behind-the-Back Cable Lateral Raise","Shoulders","Cable","I"], ["Machine Lateral Raise","Shoulders","Pin-loaded Machine","I"],
  ["Rear Delt Fly","Shoulders","Machine","I",["Back"]], ["Cable Rear Delt Fly","Shoulders","Cable","I",["Back"]], ["Face Pull","Shoulders","Cable","I",["Back"]], ["Dumbbell Front Raise","Shoulders","Dumbbell","I"], ["Cable Front Raise","Shoulders","Cable","I"], ["Handstand Push-Up","Shoulders","Bodyweight","C",["Triceps","Core"]],
  ["Landmine Press","Shoulders","Barbell","C",["Chest","Triceps","Core"]],
  // Biceps
  ["Barbell Curl","Biceps","Barbell","I"], ["EZ-Bar Curl","Biceps","Barbell","I"], ["Reverse Barbell Curl","Biceps","Barbell","I"],
  ["Dumbbell Curl","Biceps","Dumbbell","I"], ["Alternating Dumbbell Curl","Biceps","Dumbbell","I"], ["Hammer Curl","Biceps","Dumbbell","I"], ["Incline Dumbbell Curl","Biceps","Dumbbell","I"], ["Concentration Curl","Biceps","Dumbbell","I"], ["Spider Curl","Biceps","Dumbbell","I"],
  ["Cable Curl","Biceps","Cable","I"], ["Rope Hammer Curl","Biceps","Cable","I"], ["Bayesian Cable Curl","Biceps","Cable","I"], ["High Cable Curl","Biceps","Cable","I"], ["Single-Arm Cable Curl","Biceps","Cable","I"],
  ["Cross-Body Hammer Curl","Biceps","Dumbbell","I"],
  ["Preacher Curl","Biceps","Machine","I"], ["Plate-Loaded Preacher Curl","Biceps","Plate-loaded Machine","I"], ["Pin-Loaded Biceps Curl","Biceps","Pin-loaded Machine","I"], ["Machine Preacher Curl","Biceps","Machine","I"],
  // Triceps
  ["Close-Grip Bench Press","Triceps","Barbell","C",["Chest","Shoulders"]], ["JM Press","Triceps","Barbell","C",["Chest"]], ["Skull Crusher","Triceps","Barbell","I"], ["Barbell Overhead Extension","Triceps","Barbell","I"],
  ["Dumbbell Overhead Extension","Triceps","Dumbbell","I"], ["Single-Arm Dumbbell Extension","Triceps","Dumbbell","I"],
  ["Rope Pushdown","Triceps","Cable","I"], ["Straight-Bar Pushdown","Triceps","Cable","I"], ["Single-Arm Cable Pushdown","Triceps","Cable","I"], ["Reverse-Grip Pushdown","Triceps","Cable","I"], ["Overhead Cable Extension","Triceps","Cable","I"], ["Single-Arm Overhead Cable Extension","Triceps","Cable","I"], ["Cable Cross-Body Extension","Triceps","Cable","I"],
  ["Dip","Triceps","Bodyweight","C",["Chest","Shoulders"]], ["Bench Dip","Triceps","Bodyweight","C",["Chest","Shoulders"]], ["Diamond Push-Up","Triceps","Bodyweight","C",["Chest","Shoulders","Core"]],
  ["Machine Triceps Dip","Triceps","Pin-loaded Machine","C",["Chest"]], ["Plate-Loaded Dip Press","Triceps","Plate-loaded Machine","C",["Chest"]], ["Machine Triceps Extension","Triceps","Pin-loaded Machine","I"],
  ["Cable Skull Crusher","Triceps","Cable","I"],
  // Quads
  ["Back Squat","Quads","Barbell","C",["Glutes","Hamstrings","Core"]], ["Front Squat","Quads","Barbell","C",["Glutes","Core"]], ["High-Bar Squat","Quads","Barbell","C",["Glutes","Core"]],
  ["Goblet Squat","Quads","Dumbbell","C",["Glutes","Core"]], ["Bulgarian Split Squat","Quads","Dumbbell","C",["Glutes","Hamstrings"]], ["Dumbbell Step-Up","Quads","Dumbbell","C",["Glutes"]], ["Dumbbell Reverse Lunge","Quads","Dumbbell","C",["Glutes"]],
  ["Smith Machine Squat","Quads","Smith Machine","C",["Glutes"]], ["Smith Machine Front Squat","Quads","Smith Machine","C",["Glutes"]], ["Smith Machine Split Squat","Quads","Smith Machine","C",["Glutes"]],
  ["Leg Press","Quads","Plate-loaded Machine","C",["Glutes","Hamstrings"]], ["Single-Leg Press","Quads","Plate-loaded Machine","C",["Glutes"]], ["Hack Squat","Quads","Plate-loaded Machine","C",["Glutes"]], ["Pendulum Squat","Quads","Plate-loaded Machine","C",["Glutes"]], ["Belt Squat","Quads","Plate-loaded Machine","C",["Glutes"]],
  ["Leg Extension","Quads","Pin-loaded Machine","I"], ["Single-Leg Extension","Quads","Pin-loaded Machine","I"], ["Sissy Squat","Quads","Bodyweight","I"], ["Walking Lunge","Quads","Dumbbell","C",["Glutes","Hamstrings"]],
  ["Dumbbell Front-Foot Elevated Split Squat","Quads","Dumbbell","C",["Glutes"]],
  // Hamstrings
  ["Romanian Deadlift","Hamstrings","Barbell","C",["Glutes","Back","Core"]], ["Stiff-Leg Deadlift","Hamstrings","Barbell","C",["Glutes","Back"]], ["Good Morning","Hamstrings","Barbell","C",["Glutes","Back","Core"]],
  ["Dumbbell Romanian Deadlift","Hamstrings","Dumbbell","C",["Glutes","Back"]], ["Single-Leg Romanian Deadlift","Hamstrings","Dumbbell","C",["Glutes","Core"]],
  ["Lying Leg Curl","Hamstrings","Pin-loaded Machine","I"], ["Seated Leg Curl","Hamstrings","Pin-loaded Machine","I"], ["Standing Single-Leg Curl","Hamstrings","Pin-loaded Machine","I"], ["Plate-Loaded Leg Curl","Hamstrings","Plate-loaded Machine","I"],
  ["Nordic Curl","Hamstrings","Bodyweight","I",["Glutes"]], ["Sliding Leg Curl","Hamstrings","Bodyweight","I",["Glutes","Core"]], ["Swiss Ball Leg Curl","Hamstrings","Bodyweight","I",["Glutes","Core"]], ["Glute-Ham Raise","Hamstrings","Bodyweight","C",["Glutes","Back"]],
  ["Cable Pull-Through","Hamstrings","Cable","C",["Glutes"]], ["Cable Romanian Deadlift","Hamstrings","Cable","C",["Glutes"]], ["Smith Machine Romanian Deadlift","Hamstrings","Smith Machine","C",["Glutes","Back"]],
  ["Dumbbell Good Morning","Hamstrings","Dumbbell","C",["Glutes","Back"]],
  // Glutes
  ["Hip Thrust","Glutes","Barbell","C",["Hamstrings","Quads"]], ["Barbell Glute Bridge","Glutes","Barbell","C",["Hamstrings"]], ["Kas Glute Bridge","Glutes","Barbell","I",["Hamstrings"]],
  ["Dumbbell Hip Thrust","Glutes","Dumbbell","C",["Hamstrings"]], ["Walking Lunge","Glutes","Dumbbell","C",["Quads","Hamstrings"]], ["Dumbbell Curtsy Lunge","Glutes","Dumbbell","C",["Quads"]],
  ["Cable Kickback","Glutes","Cable","I"], ["Cable Hip Abduction","Glutes","Cable","I"], ["Cable Pull-Through","Glutes","Cable","C",["Hamstrings"]],
  ["Hip Abduction","Glutes","Pin-loaded Machine","I"], ["Glute Drive Machine","Glutes","Plate-loaded Machine","C",["Hamstrings"]], ["Reverse Hyperextension","Glutes","Machine","C",["Hamstrings","Back"]],
  ["Smith Machine Hip Thrust","Glutes","Smith Machine","C",["Hamstrings"]], ["Smith Machine Reverse Lunge","Glutes","Smith Machine","C",["Quads"]],
  ["Glute Bridge","Glutes","Bodyweight","I",["Hamstrings"]], ["Single-Leg Glute Bridge","Glutes","Bodyweight","I",["Hamstrings","Core"]], ["45-Degree Back Extension","Glutes","Bodyweight","C",["Hamstrings","Back"]],
  // Calves
  ["Standing Calf Raise","Calves","Machine","I"], ["Seated Calf Raise","Calves","Machine","I"], ["Donkey Calf Raise","Calves","Machine","I"], ["Leg Press Calf Raise","Calves","Plate-loaded Machine","I"],
  ["Plate-Loaded Standing Calf Raise","Calves","Plate-loaded Machine","I"], ["Pin-Loaded Calf Raise","Calves","Pin-loaded Machine","I"],
  ["Smith Machine Calf Raise","Calves","Smith Machine","I"], ["Barbell Calf Raise","Calves","Barbell","I"],
  ["Dumbbell Calf Raise","Calves","Dumbbell","I"], ["Single-Leg Dumbbell Calf Raise","Calves","Dumbbell","I"], ["Single-Leg Calf Raise","Calves","Bodyweight","I"], ["Tibialis Raise","Calves","Bodyweight","I"], ["Tibialis Machine Raise","Calves","Machine","I"],
  // Core
  ["Cable Crunch","Core","Cable","I"], ["Kneeling Cable Crunch","Core","Cable","I"], ["Cable Wood Chop","Core","Cable","C",["Shoulders"]], ["Pallof Press","Core","Cable","I"], ["Cable Side Bend","Core","Cable","I"],
  ["Hanging Leg Raise","Core","Bodyweight","I"], ["Hanging Knee Raise","Core","Bodyweight","I"], ["Captain's Chair Leg Raise","Core","Bodyweight","I"], ["Ab Wheel Rollout","Core","Bodyweight","C",["Shoulders"]], ["Plank","Core","Bodyweight","I"], ["Side Plank","Core","Bodyweight","I"], ["Dead Bug","Core","Bodyweight","I"], ["Bird Dog","Core","Bodyweight","I"], ["Reverse Crunch","Core","Bodyweight","I"], ["Bicycle Crunch","Core","Bodyweight","I"], ["V-Up","Core","Bodyweight","I"], ["Mountain Climber","Core","Bodyweight","C",["Shoulders"]],
  ["Weighted Crunch","Core","Dumbbell","I"], ["Dumbbell Side Bend","Core","Dumbbell","I"], ["Decline Sit-Up","Core","Bodyweight","I"], ["Rotary Torso Machine","Core","Pin-loaded Machine","I"],
  ["Suitcase Carry","Core","Dumbbell","C",["Shoulders"]],
];

type RawCardio = [string, CardioMetric[]];
const cardio: RawCardio[] = [
  ["Treadmill", ["duration", "distance", "speed", "pace", "incline"]],
  ["Incline Treadmill", ["duration", "distance", "speed", "pace", "incline"]],
  ["Stair Climber / StairMaster", ["duration", "level", "floors", "steps"]],
  ["Rower", ["duration", "distance", "pace500m", "level"]],
  ["Elliptical", ["duration", "distance", "level"]],
  ["SkiErg", ["duration", "distance", "pace500m", "level"]],
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
const byId = new Map<string, Exercise>();
for (const [name, muscle, equipment, type, secondary = []] of strength) {
  const muscles = [muscle, ...secondary.filter((item) => item !== muscle)];
  const exercise: Exercise = { id: slug(name), name, muscle, muscles, equipment, type: type === "C" ? "Compound" : "Isolation", tracking: "strength" };
  if (!byId.has(exercise.id)) byId.set(exercise.id, exercise);
}
for (const [name, cardioMetrics] of cardio) {
  byId.set(slug(name), { id: slug(name), name, muscle: "Core", muscles: [], equipment: "Cardio Machine", type: "Cardio", tracking: "cardio", cardioMetrics });
}
export const exercises = [...byId.values()];

export type WorkoutExercise = Exercise & { key: string; sets: number; reps: string; restSeconds?: number; supersetWith?: string; targetDurationSeconds?: number };
let seq = 0;
const preferredDefaults = () => {
  if (typeof window === "undefined") return { restSeconds: 90, reps: "8–12" };
  try {
    const preferences = JSON.parse(localStorage.getItem("recomp-user-preferences-v1") ?? "null") as { defaultRestSeconds?: number; defaultRepRange?: string } | null;
    return { restSeconds: Number(preferences?.defaultRestSeconds ?? 90), reps: preferences?.defaultRepRange ?? "8–12" };
  } catch { return { restSeconds: 90, reps: "8–12" }; }
};
const preferredRestSeconds = () => {
  if (typeof window === "undefined") return 90;
  try { return Number((JSON.parse(localStorage.getItem("recomp-user-preferences-v1") ?? "null") as { defaultRestSeconds?: number } | null)?.defaultRestSeconds ?? 90); } catch { return 90; }
};
export const toWorkoutExercise = (exercise: Exercise): WorkoutExercise => isCardioExercise(exercise)
  ? { ...exercise, key: `${exercise.id}-${seq++}`, sets: 1, reps: "", targetDurationSeconds: 1200, restSeconds: 0 }
  : { ...exercise, key: `${exercise.id}-${seq++}`, sets: exercise.type === "Compound" ? 4 : 3, reps: preferredDefaults().reps, restSeconds: preferredRestSeconds() };

const shuffle = <T,>(items: T[], random: () => number = Math.random) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index]; const swap = result[swapIndex];
    if (current === undefined || swap === undefined) continue;
    result[index] = swap; result[swapIndex] = current;
  }
  return result;
};
function seededRandom(seed: number) { let state = seed || 1; return () => { state = Math.imul(state ^ (state >>> 15), 1 | state); state ^= state + Math.imul(state ^ (state >>> 7), 61 | state); return ((state ^ (state >>> 14)) >>> 0) / 4294967296; }; }
const matchesMuscle = (exercise: Exercise, muscle: Muscle) => exercise.muscle === muscle || exercise.muscles?.includes(muscle);
const movementFamily = (exercise: Exercise) => {
  const name = exercise.name.toLowerCase();
  if (/(incline).*press/.test(name)) return "incline-press";
  if (/(decline).*press/.test(name)) return "decline-press";
  if (/(bench press|chest press|cable chest press)/.test(name) && !name.includes("close-grip")) return "flat-press";
  if (/(push-up|push up)/.test(name)) return "push-up";
  if (/\bdip\b/.test(name)) return exercise.muscle === "Triceps" ? "triceps-dip" : "chest-dip";
  if (/(fly|pec deck)/.test(name)) return "chest-fly";
  if (/pullover/.test(name)) return "pullover";
  if (/(lat pulldown|pull-up|chin-up)/.test(name)) return "vertical-pull";
  if (/row/.test(name)) return "row";
  if (/(deadlift|rack pull)/.test(name) && exercise.muscle === "Back") return "back-hinge";
  if (/(shoulder press|overhead press|push press|arnold press|handstand push-up)/.test(name)) return "shoulder-press";
  if (/lateral raise/.test(name)) return "lateral-raise";
  if (/(rear delt fly|face pull)/.test(name)) return "rear-delt";
  if (/front raise/.test(name)) return "front-raise";
  if (/(hammer curl|cross-body hammer)/.test(name)) return "hammer-curl";
  if (/(preacher curl)/.test(name)) return "preacher-curl";
  if (/curl/.test(name) && exercise.muscle === "Biceps") return "biceps-curl";
  if (/(pushdown)/.test(name)) return "triceps-pushdown";
  if (/(overhead.*extension)/.test(name)) return "overhead-triceps-extension";
  if (/(skull crusher)/.test(name)) return "skull-crusher";
  if (/(squat|leg press)/.test(name) && !/(split|sissy)/.test(name)) return "squat-press";
  if (/(split squat|lunge|step-up)/.test(name)) return "single-leg-knee-dominant";
  if (/leg extension/.test(name)) return "leg-extension";
  if (/(romanian deadlift|stiff-leg deadlift|good morning|pull-through)/.test(name)) return "hip-hinge";
  if (/(leg curl|nordic curl|glute-ham raise)/.test(name)) return "leg-curl";
  if (/(hip thrust|glute bridge|glute drive)/.test(name)) return "hip-thrust";
  if (/(kickback|hip abduction)/.test(name)) return "glute-isolation";
  if (/calf raise/.test(name)) return "calf-raise";
  if (/tibialis/.test(name)) return "tibialis";
  if (/(crunch|sit-up)/.test(name)) return "core-flexion";
  if (/(leg raise|knee raise|reverse crunch)/.test(name)) return "core-leg-raise";
  if (/(wood chop|pallof|rotary torso)/.test(name)) return "core-rotation";
  if (/(plank|dead bug|bird dog|ab wheel)/.test(name)) return "core-stability";
  return exercise.id;
};

export function generateWorkout(muscles: Muscle[], count: number, seed = 1): WorkoutExercise[] {
  if (!muscles.length) return [];
  const random = seededRandom(seed);
  const pools = new Map<Muscle, Exercise[]>(muscles.map((muscle) => {
    const list = exercises.filter((exercise) => !isCardioExercise(exercise) && matchesMuscle(exercise, muscle));
    const primary = list.filter((exercise) => exercise.muscle === muscle);
    const secondary = list.filter((exercise) => exercise.muscle !== muscle);
    return [muscle, [...shuffle(primary.filter((exercise) => exercise.type === "Compound"), random), ...shuffle(primary.filter((exercise) => exercise.type === "Isolation"), random), ...shuffle(secondary, random)]];
  }));
  const picked: Exercise[] = []; const used = new Set<string>(); const usedFamilies = new Set<string>(); let guard = 0;
  while (picked.length < count && guard++ < 100) {
    let added = false;
    for (const muscle of muscles) {
      if (picked.length >= count) break;
      const pool = pools.get(muscle) ?? [];
      const unused = pool.filter((exercise) => !used.has(exercise.id));
      const next = unused.find((exercise) => !usedFamilies.has(movementFamily(exercise))) ?? unused[0];
      if (next) { picked.push(next); used.add(next.id); usedFamilies.add(movementFamily(next)); pools.set(muscle, pool.filter((exercise) => exercise.id !== next.id)); added = true; }
    }
    if (!added) break;
  }
  return picked.sort((a, b) => (a.type === b.type ? 0 : a.type === "Compound" ? -1 : 1)).map((exercise, index) => ({ ...toWorkoutExercise(exercise), key: `${exercise.id}-${seed}-${index}` }));
}

export function findReplacement(current: WorkoutExercise, workout: WorkoutExercise[]): Exercise | undefined {
  const used = new Set(workout.map((exercise) => exercise.id));
  const options = exercises.filter((exercise) => isCardioExercise(exercise) === isCardioExercise(current) && matchesMuscle(exercise, current.muscle) && !used.has(exercise.id));
  const same = options.filter((exercise) => exercise.type === current.type);
  return shuffle(same.length ? same : options)[0];
}
