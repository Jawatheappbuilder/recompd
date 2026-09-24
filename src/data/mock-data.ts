// Set to null to show the "Start a workout" state on Home.
export const plannedWorkout: { name: string } | null = null;

export const weekDays = [
  { label: "M", state: "complete" },
  { label: "T", state: "complete" },
  { label: "W", state: "rest" },
  { label: "T", state: "complete" },
  { label: "F", state: "scheduled" },
  { label: "S", state: "rest" },
  { label: "S", state: "rest" },
] as const;

export const priorities = [
  { name: "Chest", level: "High", value: 84 },
  { name: "Back", level: "Medium", value: 58 },
  { name: "Quads", level: "Low", value: 31 },
] as const;

export const recentWorkouts = [
  { name: "Upper Body", date: "Yesterday", duration: "52 min", sets: "18 sets" },
  { name: "Lower Strength", date: "Mon, 21 Sep", duration: "61 min", sets: "15 sets" },
  { name: "Push Focus", date: "Sat, 19 Sep", duration: "48 min", sets: "16 sets" },
] as const;

export const records = [
  { exercise: "Bench Press", value: "112.5 kg", date: "18 Sep" },
  { exercise: "Back Squat", value: "165 kg", date: "12 Sep" },
] as const;
