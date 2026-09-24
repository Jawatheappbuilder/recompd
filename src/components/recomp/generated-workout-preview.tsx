import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarPlus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateWorkout, type Muscle } from "@/data/exercises";
import { defaultWorkoutName, handOffWorkout } from "@/lib/workout-storage";
import { ScheduleSheet, scheduleNewWorkout } from "./schedule-sheet";
import { ShareLinkButton } from "./share-link-button";
import { WorkoutEditor } from "./workout-editor";

export function GeneratedWorkoutPreview({ muscles, count, seed }: { muscles: Muscle[]; count: number; seed: number }) {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(() => generateWorkout(muscles, count, seed));
  const [generation, setGeneration] = useState(seed);
  const [scheduling, setScheduling] = useState(false);
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
      <Button variant="surface" className="mt-2 w-full" disabled={!workout.length} onClick={() => setScheduling(true)}><CalendarPlus />Schedule</Button>
      <ShareLinkButton name={defaultWorkoutName(workout)} exercises={workout} className="mt-2 w-full" />
      <ScheduleSheet open={scheduling} onOpenChange={setScheduling} defaultName={defaultWorkoutName(workout)} onConfirm={(value) => { scheduleNewWorkout(value, workout); void navigate({ to: "/" }); }} />
    </>
  );
}
