import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateWorkout, type Muscle } from "@/data/exercises";
import { handOffWorkout } from "@/lib/workout-storage";
import { WorkoutEditor } from "./workout-editor";

export function GeneratedWorkoutPreview({ muscles, count, seed }: { muscles: Muscle[]; count: number; seed: number }) {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(() => generateWorkout(muscles, count, seed));
  const [generation, setGeneration] = useState(seed);
  const startWorkout = () => { handOffWorkout({ exercises: workout }); void navigate({ to: "/workout" }); };

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Button asChild variant="surface" size="icon" className="size-10 shrink-0" aria-label="Edit workout selection">
          <Link to="/build" search={{ mode: "generate" }}><ArrowLeft /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold">{muscles.join(" + ")}</h1>
          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{workout.length} exercises</p>
        </div>
        <Button variant="ghost" size="sm" className="px-2 text-muted-foreground" onClick={() => { const next = generation + 1; setGeneration(next); setWorkout(generateWorkout(muscles, count, next)); }}>
          <RefreshCw /> Regenerate
        </Button>
      </div>
      <WorkoutEditor workout={workout} setWorkout={setWorkout} />
      <Button variant="primary" size="xl" className="mt-4 w-full" disabled={!workout.length} onClick={startWorkout}>Start workout</Button>
    </>
  );
}
