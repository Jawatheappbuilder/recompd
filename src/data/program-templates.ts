import { createNoteItem, exercises, toWorkoutExercise, type WorkoutExercise } from "@/data/exercises";
import { newId } from "@/lib/cloud-data";
import type { ProgramWorkout, TrainingProgram } from "@/lib/program-storage";

/**
 * Hand-authored starter programs. Every prescription is fixed (no generation or
 * randomness). Each call to build() returns a brand-new copy with fresh IDs so
 * the catalogue itself can never be mutated by editing a draft.
 */
type Row = [name: string, sets: number, reps: string, rest: number];
type Day = { name: string; weekday: number; rows: Row[]; warmup?: string };
export type ProgramTemplate = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  progression: string;
  goal: TrainingProgram["goal"];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  weeks: number;
  days: Day[];
};

function exercise(name: string, sets: number, reps: string, restSeconds: number): WorkoutExercise | null {
  const match = exercises.find((e) => e.name === name);
  if (!match || match.tracking === "cardio") {
    const message = "Program template references a missing strength exercise: " + name;
    if (import.meta.env.DEV) throw new Error(message);
    console.error(message);
    return null;
  }
  return { ...toWorkoutExercise(match), key: newId(), sets, reps, restSeconds };
}

export function buildProgramFromTemplate(template: ProgramTemplate): TrainingProgram {
  const now = Date.now();
  const d = new Date();
  const startDate = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  const workouts: ProgramWorkout[] = template.days.map((day) => {
    const items = day.rows.map(([n, s, r, rest]) => exercise(n, s, r, rest)).filter((e): e is WorkoutExercise => !!e);
    const warm = day.warmup ? [createNoteItem({ title: "Warm-up", body: day.warmup, checklist: [] })] : [];
    return { id: newId(), name: day.name, weekday: day.weekday, exercises: [...warm, ...items] };
  });
  return {
    id: newId(), name: template.name, goal: template.goal, weeks: template.weeks, mode: "flexible",
    startDate, weekdays: template.days.map((day) => day.weekday), status: "draft",
    workouts, createdAt: now, updatedAt: now,
  };
}

const warm5x5 = "Before each lift: empty bar ×5, then 2–3 lighter sets of 3–5 reps building towards your working weight. Warm-up sets are not logged as working sets.";

export const programTemplates: ProgramTemplate[] = [
  {
    id: "ppl", name: "Push / Pull / Legs", tagline: "Classic gym split",
    description: "Pressing, pulling and leg work on separate days, with compound lifts first and accessories after.",
    progression: "When you reach the top of a rep range on every set, add a small amount of weight next session.",
    goal: "Hypertrophy", difficulty: "Intermediate", weeks: 8,
    days: [
      { name: "Push Day", weekday: 1, rows: [["Bench Press",3,"6–10",150],["Incline Dumbbell Press",3,"8–12",90],["Machine Shoulder Press",3,"8–12",90],["Lateral Raise",3,"12–15",60],["Rope Pushdown",3,"10–15",60]] },
      { name: "Pull Day", weekday: 3, rows: [["Lat Pulldown",3,"8–12",120],["Seated Cable Row",3,"8–12",120],["Face Pull",3,"12–15",60],["Dumbbell Curl",3,"10–12",60],["Hammer Curl",3,"10–12",60]] },
      { name: "Legs Day", weekday: 5, rows: [["Back Squat",3,"6–10",150],["Romanian Deadlift",3,"8–10",120],["Leg Press",3,"10–12",120],["Seated Leg Curl",3,"10–15",75],["Standing Calf Raise",3,"12–15",60]] },
    ],
  },
  {
    id: "upper-lower", name: "Upper / Lower Split", tagline: "Each muscle twice a week",
    description: "Two upper and two lower days hit every muscle twice weekly with moderate volume and room to recover.",
    progression: "Use double progression: once every set hits the top of the range, add 2.5–5 kg and work back up.",
    goal: "Hypertrophy", difficulty: "Intermediate", weeks: 8,
    days: [
      { name: "Upper A", weekday: 1, rows: [["Bench Press",3,"6–10",150],["Lat Pulldown",3,"8–12",120],["Incline Dumbbell Press",3,"8–12",90],["Seated Cable Row",3,"8–12",90],["Lateral Raise",3,"12–20",60],["Rope Pushdown",2,"10–15",60]] },
      { name: "Lower A", weekday: 2, rows: [["Back Squat",3,"6–10",180],["Romanian Deadlift",3,"8–10",150],["Leg Press",3,"10–12",120],["Seated Leg Curl",3,"10–15",75],["Standing Calf Raise",3,"12–20",60]] },
      { name: "Upper B", weekday: 4, rows: [["Overhead Press",3,"6–10",150],["Chest-Supported Row",3,"8–12",120],["Incline Dumbbell Press",3,"8–12",90],["Lat Pulldown",3,"8–12",90],["Dumbbell Curl",3,"10–15",60],["Face Pull",2,"12–20",60]] },
      { name: "Lower B", weekday: 5, rows: [["Romanian Deadlift",3,"6–10",150],["Bulgarian Split Squat",3,"8–12",120],["Leg Extension",3,"10–15",75],["Seated Leg Curl",3,"10–15",75],["Standing Calf Raise",3,"12–20",60]] },
    ],
  },
  {
    id: "full-body", name: "Full Body Fundamentals", tagline: "Simple start for new lifters",
    description: "Three short full-body sessions built around squat, hinge, press and row patterns to learn the main lifts.",
    progression: "Leave 1–2 reps in reserve. Add weight when all sets reach the top of the range with good form.",
    goal: "General fitness", difficulty: "Beginner", weeks: 8,
    days: [
      { name: "Full Body A", weekday: 1, rows: [["Back Squat",3,"6–10",150],["Bench Press",3,"8–10",120],["Seated Cable Row",3,"8–12",90],["Plank",3,"30–45s",60]] },
      { name: "Full Body B", weekday: 3, rows: [["Romanian Deadlift",3,"8–10",150],["Lat Pulldown",3,"8–12",90],["Seated Dumbbell Press",3,"8–12",90],["Walking Lunge",2,"10–12",90]] },
      { name: "Full Body C", weekday: 5, rows: [["Leg Press",3,"10–12",120],["Incline Dumbbell Press",3,"8–12",90],["Chest-Supported Row",3,"8–12",90],["Seated Leg Curl",2,"10–15",75],["Standing Calf Raise",2,"12–15",60]] },
    ],
  },
  {
    id: "strength-5x5", name: "5×5-inspired 3-day", tagline: "Heavy barbell basics",
    description: "Squat every session with bench, rows, overhead press and deadlifts. Inspired by classic 5×5 training, not an official StrongLifts program.",
    progression: "Add 2.5 kg to upper lifts and 2.5–5 kg to squat and deadlift each time you complete all 5×5. Stall three times? Drop 10% and build back. Workouts repeat A–B–C every week rather than alternating A/B across weeks.",
    goal: "Strength", difficulty: "Intermediate", weeks: 12,
    days: [
      { name: "Workout A", weekday: 1, warmup: warm5x5, rows: [["Back Squat",5,"5",180],["Bench Press",5,"5",180],["Barbell Row",5,"5",180]] },
      { name: "Workout B", weekday: 3, warmup: warm5x5, rows: [["Back Squat",5,"5",180],["Overhead Press",5,"5",180],["Deadlift",1,"5",240]] },
      { name: "Workout C", weekday: 5, warmup: warm5x5, rows: [["Back Squat",5,"5",180],["Bench Press",5,"5",180],["Barbell Row",5,"5",180]] },
    ],
  },
  {
    id: "bro-split", name: "Classic Bodybuilding Split", tagline: "One focus per day",
    description: "Five sessions each dedicated to one area, so every muscle is trained hard about once a week.",
    progression: "Push close to failure on the last set of each exercise. Add reps first, then weight.",
    goal: "Hypertrophy", difficulty: "Intermediate", weeks: 8,
    days: [
      { name: "Chest", weekday: 1, rows: [["Bench Press",3,"6–10",150],["Incline Dumbbell Press",3,"8–12",120],["Cable Fly",3,"12–15",75],["Rope Pushdown",2,"10–15",60]] },
      { name: "Back", weekday: 2, rows: [["Lat Pulldown",3,"8–12",120],["Chest-Supported Row",3,"8–12",120],["Seated Cable Row",3,"10–12",90],["Face Pull",3,"12–20",60]] },
      { name: "Shoulders", weekday: 3, rows: [["Seated Dumbbell Press",3,"6–10",120],["Lateral Raise",4,"12–20",60],["Rear Delt Fly",3,"12–20",60]] },
      { name: "Legs", weekday: 4, rows: [["Back Squat",3,"6–10",180],["Romanian Deadlift",3,"8–10",150],["Leg Press",3,"10–12",120],["Seated Leg Curl",3,"10–15",75],["Standing Calf Raise",3,"12–20",60]] },
      { name: "Arms", weekday: 5, rows: [["Barbell Curl",3,"8–12",75],["Rope Pushdown",3,"10–15",75],["Incline Dumbbell Curl",3,"10–15",60],["Overhead Cable Extension",3,"10–15",60]] },
    ],
  },
  {
    id: "athletic", name: "Athletic Performance", tagline: "Athletic strength base",
    description: "Heavy bilateral lifts plus single-leg and core work to build a balanced strength base. Not speed or power training.",
    progression: "Keep heavy sets crisp with 1–2 reps in reserve. Add weight when every set hits the top of the range.",
    goal: "Strength", difficulty: "Intermediate", weeks: 8,
    days: [
      { name: "Lower Strength", weekday: 1, rows: [["Back Squat",4,"4–6",180],["Romanian Deadlift",3,"6–8",150],["Bulgarian Split Squat",3,"8 each",120],["Pallof Press",3,"10–12",60]] },
      { name: "Upper Strength", weekday: 2, rows: [["Bench Press",4,"4–6",180],["Pull-Up",3,"6–10",150],["Barbell Row",3,"6–10",120],["Overhead Press",2,"8–10",120]] },
      { name: "Lower Unilateral", weekday: 4, rows: [["Leg Press",3,"8–12",120],["Dumbbell Step-Up",3,"8–10",90],["Seated Leg Curl",3,"10–12",75],["Standing Calf Raise",3,"12–15",60]] },
      { name: "Upper Balance", weekday: 5, rows: [["Incline Dumbbell Press",3,"8–12",120],["Lat Pulldown",3,"8–12",120],["Single-Arm Dumbbell Row",3,"8–12",90],["Face Pull",3,"12–20",60],["Plank",3,"30–45s",60]] },
    ],
  },
  {
    id: "minimalist", name: "Minimalist Muscle", tagline: "35–45 min sessions",
    description: "Four efficient lifts per session cover the whole body three times a week when time is tight.",
    progression: "Work every set hard. Add weight once all sets reach the top of the range.",
    goal: "Hypertrophy", difficulty: "Beginner", weeks: 6,
    days: [
      { name: "Session A", weekday: 1, rows: [["Back Squat",3,"6–10",120],["Bench Press",3,"6–10",120],["Lat Pulldown",3,"8–12",75],["Lateral Raise",2,"12–20",60]] },
      { name: "Session B", weekday: 3, rows: [["Romanian Deadlift",3,"8–10",120],["Overhead Press",3,"6–10",120],["Seated Cable Row",3,"8–12",75],["Dumbbell Curl",2,"10–15",60]] },
      { name: "Session C", weekday: 5, rows: [["Leg Press",3,"10–12",120],["Incline Dumbbell Press",3,"8–12",90],["Chest-Supported Row",3,"8–12",90],["Seated Leg Curl",2,"10–15",60]] },
    ],
  },
];
