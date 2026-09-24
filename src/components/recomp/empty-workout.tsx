import { Link } from "@tanstack/react-router";
import { Bookmark, Dumbbell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpcomingWorkouts } from "@/lib/workout-storage";
import { UpcomingWorkoutCard } from "./scheduled-cards";

export function EmptyWorkout() {
  const next = useUpcomingWorkouts()[0];
  return <div className="flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center text-center">
    <div className="mb-5 grid size-16 place-items-center rounded-2xl border border-border bg-card text-muted-foreground"><Dumbbell className="size-7"/></div>
    <h1 className="text-xl font-bold">No active workout</h1>
    <Button asChild variant="primary" size="xl" className="mt-6 min-w-56"><Link to="/build"><Plus/>Start workout</Link></Button>
    <Button asChild variant="surface" className="mt-2 min-w-56"><Link to="/saved"><Bookmark/>Saved workouts</Link></Button>
    {next && <UpcomingWorkoutCard workout={next} className="mt-6 block w-full max-w-sm text-left" />}
  </div>;
}
