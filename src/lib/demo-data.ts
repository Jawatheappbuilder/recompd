import type { CloudData } from "./cloud-data";
import { exercises, toWorkoutExercise, type Exercise } from "@/data/exercises";

const DAY = 86_400_000;
const byName = (name: string) => exercises.find((e) => e.name === name)!;
const completed = (exercise: Exercise, weight: number, reps: number, week: number) => ({
  key: `demo-${exercise.id}-${week}`, exerciseId: exercise.id, name: exercise.name,
  muscles: exercise.muscles?.length ? [exercise.muscle, ...exercise.muscles] : [exercise.muscle],
  equipment: exercise.equipment, tracking: "strength" as const,
  sets: Array.from({ length: 3 }, (_, set) => ({ weight: Math.max(0, weight + week * 1.25 - (2 - set) * 2.5), reps: reps + (set === 0 ? 1 : 0) })),
});
const templates = [
  { name: "Upper Strength", items: [["Bench Press", 62.5, 8], ["Lat Pulldown", 55, 10], ["Seated Dumbbell Press", 20, 9], ["Cable Curl", 20, 11], ["Rope Pushdown", 25, 11]] as const },
  { name: "Lower Strength", items: [["Back Squat", 80, 8], ["Romanian Deadlift", 70, 9], ["Leg Press", 120, 10], ["Seated Leg Curl", 42.5, 11], ["Standing Calf Raise", 60, 12]] as const },
  { name: "Push Focus", items: [["Incline Dumbbell Press", 22.5, 9], ["Machine Shoulder Press", 40, 10], ["Cable Fly", 15, 12], ["Lateral Raise", 8, 12], ["Overhead Cable Extension", 20, 11]] as const },
  { name: "Pull + Legs", items: [["Barbell Row", 55, 9], ["Neutral-Grip Lat Pulldown", 52.5, 10], ["Hack Squat", 80, 10], ["Lying Leg Curl", 40, 11], ["Hammer Curl", 12.5, 11]] as const },
];
export function createDemoData(now = Date.now()): CloudData {
  const workouts: CloudData["workouts"] = [];
  for (let week = 0; week < 12; week++) {
    const count = week === 5 ? 2 : week === 9 ? 3 : 4;
    for (let session = 0; session < count; session++) {
      const template = templates[(week + session) % templates.length]!;
      const daysAgo = (11 - week) * 7 + [5, 3, 1, 0][session]!;
      workouts.push({ id: `demo-w${week}-${session}`, name: template.name, startedAt: now - daysAgo * DAY, durationSec: 2700 + ((week + session) % 5) * 240, exercises: template.items.map(([name, weight, reps]) => completed(byName(name), weight, reps, week)) });
    }
  }
  const bodyweight = Array.from({ length: 13 }, (_, i) => ({ id: `demo-bw-${i}`, kg: Number((86.4 - i * .18 + (i % 3) * .08).toFixed(1)), loggedAt: now - (12 - i) * 7 * DAY }));
  const savedNames = [["Upper Builder", ["Bench Press","Lat Pulldown","Seated Dumbbell Press","Cable Curl","Rope Pushdown"]], ["Lower Strength", ["Back Squat","Romanian Deadlift","Leg Press","Seated Leg Curl"]]] as const;
  const saved = savedNames.map(([name,names],i)=>({ id:`demo-saved-${i}`, name, exercises:names.map(n=>toWorkoutExercise(byName(n))), createdAt:now-(20+i)*DAY }));
  const tomorrow = new Date(now + DAY); const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,"0")}-${String(tomorrow.getDate()).padStart(2,"0")}`;
  return { workouts, bodyweight, saved, custom: [], scheduled: [{ id:"demo-scheduled-1", name:"Upper Builder", date, time:"18:00", exercises:saved[0]!.exercises, createdAt:now, updatedAt:now }] };
}
