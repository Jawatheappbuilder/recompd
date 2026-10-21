import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarPlus, RefreshCw, LockKeyholeOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateWorkout, type Muscle, type WorkoutExercise } from "@/data/exercises";
import { defaultWorkoutName, handOffWorkout } from "@/lib/workout-storage";
import { workoutTimeEstimate } from "@/lib/workout-time";
import { ScheduleSheet, scheduleNewWorkout } from "./schedule-sheet";
import { ShareLinkButton } from "./share-link-button";
import { WorkoutEditor } from "./workout-editor";

export function GeneratedWorkoutPreview({ muscles, count, seed }: { muscles: Muscle[]; count: number; seed: number }) {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(() => generateWorkout(muscles, count, seed));
  const [generation, setGeneration] = useState(seed);
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(() => new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => new Set());
  const lockedCount = workout.filter((item) => !item.note && lockedKeys.has(item.key)).length;
  const unlockedCount = workout.filter((item) => !item.note && !lockedKeys.has(item.key)).length;
  const toggleLock = (key: string) => setLockedKeys((previous) => {
    const next = new Set(previous);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const regenerateUnlocked = () => {
    if (!unlockedCount) return;
    const nextSeed = generation + 1;
    const previouslySkipped = new Set(skippedIds);
    for (const item of workout) if (!item.note && !lockedKeys.has(item.key)) previouslySkipped.add(item.id);

    const reserved = new Set(workout.filter((item) => item.note || lockedKeys.has(item.key)).map((item) => item.id));
    const next: WorkoutExercise[] = workout.map((item, index) => {
      if (item.note || lockedKeys.has(item.key)) return item;
      // Select for the existing muscle slot, retaining the original exercise count and order.
      // Avoid locked exercises, duplicates, and recently rejected options wherever possible.
      let fallback: WorkoutExercise | undefined;
      let replacement: WorkoutExercise | undefined;
      for (let attempt = 0; attempt < 35 && !replacement; attempt++) {
        const options = generateWorkout([item.muscle], Math.min(12, Math.max(count, 6)), nextSeed + index * 997 + attempt * 31);
        for (const option of options) {
          if (reserved.has(option.id)) continue;
          fallback ??= option;
          if (!previouslySkipped.has(option.id) && option.id !== item.id) {
            replacement = option;
            break;
          }
        }
      }
      const chosen = replacement ?? fallback ?? item;
      reserved.add(chosen.id);
      return chosen.id === item.id ? item : { ...chosen, key: item.key, sets: item.sets, reps: item.reps };
    });
    setSkippedIds(previouslySkipped);
    setGeneration(nextSeed);
    setWorkout(next);
  };
  const [scheduling, setScheduling] = useState(false);
  const startWorkout = () => { handOffWorkout({ exercises: workout }); void navigate({ to: "/workout" }); };
  const estimate = workoutTimeEstimate(workout);

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Button asChild variant="surface" size="icon" className="size-10 shrink-0" aria-label="Edit workout selection">
          <Link to="/build" search={{ mode: "generate" }}><ArrowLeft /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold">{muscles.join(" + ")}</h1>
          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{workout.filter((e) => !e.note).length} exercises{estimate && <> · <span className="text-primary">Est. {estimate.label}</span></>}</p>
        </div>
        <Button variant="ghost" size="sm" className="px-2 text-muted-foreground" onClick={regenerateUnlocked} disabled={!unlockedCount}>
          <RefreshCw /> {lockedCount ? `Regenerate ${unlockedCount}` : "Regenerate"}
        </Button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Lock the exercises you want to keep, then regenerate the rest.{lockedCount > 0 ? ` ${lockedCount} locked.` : ""}</p>
      <WorkoutEditor workout={workout} setWorkout={setWorkout} lockedKeys={lockedKeys} onToggleLock={toggleLock} />
      {lockedCount > 0 && <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground" onClick={() => setLockedKeys(new Set())}><LockKeyholeOpen /> Unlock all</Button>}
      <Button variant="primary" size="xl" className="mt-4 w-full" disabled={!workout.length} onClick={startWorkout}>Start workout</Button>
      <Button variant="surface" className="mt-2 w-full" disabled={!workout.length} onClick={() => setScheduling(true)}><CalendarPlus />Schedule</Button>
      <ShareLinkButton name={defaultWorkoutName(workout)} exercises={workout} className="mt-2 w-full" />
      <ScheduleSheet open={scheduling} onOpenChange={setScheduling} defaultName={defaultWorkoutName(workout)} onConfirm={(value) => { scheduleNewWorkout(value, workout); void navigate({ to: "/" }); }} />
    </>
  );
}
