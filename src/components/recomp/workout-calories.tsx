import { Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { readWorkoutCalories, requestWorkoutCaloriesAccess, type WorkoutCaloriesResult } from "@/lib/health-connect";

export function WorkoutCalories({ startedAt, durationSec }: { startedAt: number; durationSec: number }) {
  const [result, setResult] = useState<WorkoutCaloriesResult | null>(null);
  const load = () => void readWorkoutCalories(startedAt, durationSec).then(setResult);
  useEffect(load, [startedAt, durationSec]);

  if (!result || result.status === "web" || result.status === "unavailable" || result.status === "no-match" || result.status === "error") return null;
  if (result.status === "disconnected") return <Button variant="ghost" size="sm" className="mt-3 px-1 text-muted-foreground" onClick={() => void requestWorkoutCaloriesAccess().then((ok) => ok && load())}><Flame />Add calories</Button>;
  if (!result.calories) return null;
  return <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary/[0.07] px-3 py-2.5"><Flame className="size-4 text-primary" /><span className="text-sm font-extrabold tabular-nums">{result.calories.toLocaleString()} calories</span></div>;
}
