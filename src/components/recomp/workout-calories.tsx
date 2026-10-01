import { Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { readWorkoutCalories, type WorkoutCaloriesResult } from "@/lib/health-connect";

export function WorkoutCalories({ startedAt, durationSec }: { startedAt: number; durationSec: number }) {
  const [result, setResult] = useState<WorkoutCaloriesResult | null>(null);
  const load = () => void readWorkoutCalories(startedAt, durationSec).then(setResult);
  useEffect(load, [startedAt, durationSec]);

  if (!result || result.status === "web" || result.status === "unavailable" || result.status === "no-match" || result.status === "error") return null;
  if (result.status === "disconnected") return null;
  if (!result.calories) return null;
  return <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary/[0.07] px-3 py-2.5"><Flame className="size-4 text-primary" /><span className="text-sm font-extrabold tabular-nums">{result.calories.toLocaleString()} calories</span></div>;
}
