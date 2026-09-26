import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock3,
  Ellipsis,
  Link2,
  Minus,
  Plus,
  Search,

  Shuffle,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { equipmentTypes, exercises, isCardioExercise, muscleGroups, toWorkoutExercise, type Equipment, type Exercise, type Muscle } from "@/data/exercises";
import { createActiveWorkout, type ActiveExercise, type ActiveSet, type ActiveWorkoutState } from "@/hooks/use-active-workout";
import { personalRecords, recordCompletedWorkout, toCompletedWorkout, useTrainingData } from "@/lib/training-data";
import { ShareWorkoutButton } from "./share-workout";
import { cn } from "@/lib/utils";

type Sheet =
  | { kind: "closed" }
  | { kind: "actions"; key: string }
  | { kind: "replace"; key: string }
  | { kind: "superset"; key: string }
  | { kind: "rest"; key: string }
  | { kind: "add" }
  | { kind: "addCardio" };

type FinishedWorkout = {
  workout: ActiveWorkoutState;
  duration: number;
  completedExercises: number;
  totalSets: number;
  volume: number;
};

const previousPerformance: Partial<Record<string, string>> = {
  "bench-press": "30kg × 10",
  "lat-pulldown": "55kg × 10",
  "back-squat": "90kg × 8",
  "barbell-row": "60kg × 8",
};

const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const formatDuration = (seconds: number) => seconds < 3600 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;

export function ActiveWorkout({ workout, onChange, onCancel }: { workout: ActiveWorkoutState; onChange: (workout: ActiveWorkoutState) => void; onCancel: () => void }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [expandedUpcoming, setExpandedUpcoming] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>({ kind: "closed" });
  const [removeKey, setRemoveKey] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finished, setFinished] = useState<FinishedWorkout | null>(null);
  const [rest, setRest] = useState<{ endsAt: number; expanded: boolean } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - workout.startedAt) / 1000));
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sessionSets.length, 0);
  const completedSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sessionSets.filter((set) => set.completed).length, 0);
  const strengthSets = workout.exercises.reduce((sum, exercise) => sum + (isCardioExercise(exercise) ? 0 : exercise.sessionSets.filter((set) => set.completed).length), 0);
  const progress = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;
  const restRemaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (rest && restRemaining === 0) setRest(null);
  }, [rest, restRemaining]);

  const updateExercise = (key: string, updater: (exercise: ActiveExercise) => ActiveExercise) => {
    onChange({ ...workout, exercises: workout.exercises.map((exercise) => exercise.key === key ? updater(exercise) : exercise) });
  };

  const updateSet = (exerciseKey: string, setId: string, patch: Partial<ActiveSet>, propagateWeight = false) => {
    updateExercise(exerciseKey, (exercise) => {
      const index = exercise.sessionSets.findIndex((set) => set.id === setId);
      const sessionSets = exercise.sessionSets.map((set, setIndex) => {
        if (set.id === setId) return { ...set, ...patch };
        if (propagateWeight && setIndex > index && !set.completed && !set.weightEdited) return { ...set, weight: String(patch.weight ?? set.weight) };
        return set;
      });
      return { ...exercise, sessionSets };
    });
  };

  const toggleSet = (exercise: ActiveExercise, set: ActiveSet) => {
    const nextCompleted = !set.completed;
    const nextExercises = workout.exercises.map((item) => item.key === exercise.key
      ? { ...item, sessionSets: item.sessionSets.map((row) => row.id === set.id ? { ...row, completed: nextCompleted } : row) }
      : item);
    const updatedExercise = nextExercises.find((item) => item.key === exercise.key);
    const completedExercise = updatedExercise?.sessionSets.every((row) => row.completed) ?? false;
    let currentKey = workout.currentKey;
    let shouldRest = nextCompleted && !isCardioExercise(exercise);
    const partner = exercise.supersetWith ? nextExercises.find((item) => item.key === exercise.supersetWith) : undefined;

    if (nextCompleted && updatedExercise && partner && !partner.sessionSets.every((row) => row.completed)) {
      const completedHere = updatedExercise.sessionSets.filter((row) => row.completed).length;
      const completedThere = partner.sessionSets.filter((row) => row.completed).length;
      if (completedThere < completedHere) {
        currentKey = partner.key;
        shouldRest = false;
      } else if (!completedExercise) {
        currentKey = partner.key;
      }
    }

    if (completedExercise && currentKey === exercise.key) {
      currentKey = partner && !partner.sessionSets.every((row) => row.completed)
        ? partner.key
        : nextExercises.find((item) => !item.sessionSets.every((row) => row.completed))?.key ?? exercise.key;
    }
    onChange({ ...workout, exercises: nextExercises, currentKey });
    setExpandedUpcoming(null);
    if (shouldRest) setRest({ endsAt: Date.now() + exercise.restSeconds * 1000, expanded: true });
  };

  const startExercise = (key: string) => {
    const completed = workout.exercises.filter((exercise) => exercise.sessionSets.every((set) => set.completed));
    const selected = workout.exercises.find((exercise) => exercise.key === key);
    if (!selected) return;
    const remaining = workout.exercises.filter((exercise) => exercise.key !== key && !exercise.sessionSets.every((set) => set.completed));
    onChange({ ...workout, currentKey: key, exercises: [...completed, selected, ...remaining] });
    setExpandedUpcoming(null);
  };

  const replaceExercise = (key: string, alternative: Exercise) => {
    updateExercise(key, (current) => ({ ...current, ...alternative, key: current.key }));
    setSheet({ kind: "closed" });
  };

  const pairSuperset = (key: string, partnerKey: string) => {
    onChange({
      ...workout,
      exercises: workout.exercises.map((exercise) => exercise.key === key
        ? { ...exercise, supersetWith: partnerKey }
        : exercise.key === partnerKey ? { ...exercise, supersetWith: key } : exercise),
    });
    setSheet({ kind: "closed" });
  };

  const removeSuperset = (key: string) => {
    const partner = workout.exercises.find((exercise) => exercise.key === key)?.supersetWith;
    onChange({ ...workout, exercises: workout.exercises.map((exercise) => {
      if (exercise.key !== key && exercise.key !== partner) return exercise;
      const { supersetWith: _supersetWith, ...unpaired } = exercise;
      return unpaired;
    }) });
    setSheet({ kind: "closed" });
  };

  const removeExercise = () => {
    if (!removeKey) return;
    const remaining = workout.exercises.filter((exercise) => exercise.key !== removeKey).map((exercise) => {
      if (exercise.supersetWith !== removeKey) return exercise;
      const { supersetWith: _supersetWith, ...unpaired } = exercise;
      return unpaired;
    });
    const currentKey = workout.currentKey === removeKey ? remaining.find((exercise) => !exercise.sessionSets.every((set) => set.completed))?.key ?? remaining[0]?.key ?? "" : workout.currentKey;
    onChange({ ...workout, currentKey, exercises: remaining });
    setRemoveKey(null);
  };

  const finishWorkout = () => {
    const result: FinishedWorkout = {
      workout,
      duration: elapsed,
      completedExercises: workout.exercises.filter((exercise) => exercise.sessionSets.every((set) => set.completed)).length,
      totalSets: strengthSets,
      volume: workout.exercises.reduce((total, exercise) => total + exercise.sessionSets.filter((set) => set.completed).reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0), 0),
    };
    localStorage.setItem("recomp-last-workout", JSON.stringify(result));
    recordCompletedWorkout(workout, elapsed);
    localStorage.removeItem("recomp-active-workout-v1");
    setFinished(result);
    setFinishOpen(false);
  };

  if (finished) return <WorkoutSummary result={finished} />;

  return (
    <>
      <WorkoutHeader name={workout.name} elapsed={elapsed} progress={progress} completedSets={completedSets} totalSets={totalSets} mixedTracking={workout.exercises.some(isCardioExercise)} onFinish={() => completedSets < totalSets ? setFinishOpen(true) : finishWorkout()} />
      {rest && !rest.expanded && restRemaining > 0 && <MinimizedRestTimer seconds={restRemaining} onExpand={() => setRest({ ...rest, expanded: true })} onAdjust={(amount) => setRest({ ...rest, endsAt: rest.endsAt + amount * 1000 })} onSkip={() => setRest(null)} />}
      <div className="mt-3 space-y-2">
        {workout.exercises.map((exercise, exerciseIndex) => {
          const completed = exercise.sessionSets.every((set) => set.completed);
          const current = exercise.key === workout.currentKey && !completed;
          const expanded = current || expandedUpcoming === exercise.key;
          return <div key={exercise.key} className="workout-card-enter" style={{ animationDelay: `${exerciseIndex * 120}ms` }}><ExerciseCard
            exercise={exercise}
            current={current}
            completed={completed}
            expanded={expanded}
            pairedName={workout.exercises.find((item) => item.key === exercise.supersetWith)?.name}
            onToggle={() => { if (!current && !completed) setExpandedUpcoming((value) => value === exercise.key ? null : exercise.key); }}
            onStart={() => startExercise(exercise.key)}
            onSetChange={(setId, patch, propagate) => updateSet(exercise.key, setId, patch, propagate)}
            onToggleSet={(set) => toggleSet(exercise, set)}
            onAddSet={() => updateExercise(exercise.key, (item) => ({ ...item, sessionSets: [...item.sessionSets, { id: `${item.key}-set-${Date.now()}`, weight: item.sessionSets.at(-1)?.weight ?? "", reps: item.sessionSets.at(-1)?.reps ?? "10", completed: false, weightEdited: false }] }))}
            onRemoveSet={(setId) => updateExercise(exercise.key, (item) => item.sessionSets.length <= 1 ? item : ({ ...item, sessionSets: item.sessionSets.filter((set) => set.id !== setId || set.completed) }))}
            onRest={() => setSheet({ kind: "rest", key: exercise.key })}
            onActions={() => setSheet({ kind: "actions", key: exercise.key })}
          /></div>;
        })}
      </div>
      <Button variant="surface" className="mt-3 w-full" onClick={() => setSheet({ kind: "add" })}><Plus /> Add exercise</Button>
      <Button variant="surface" className="mt-2 w-full" onClick={() => setSheet({ kind: "addCardio" })}><Plus /> Add cardio</Button>
      <Button variant="ghost" size="sm" className="mt-2 w-full text-muted-foreground hover:text-destructive" onClick={() => setCancelOpen(true)}>Cancel workout</Button>
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl bg-popover">
          <AlertDialogHeader><AlertDialogTitle>Cancel workout?</AlertDialogTitle><AlertDialogDescription>Your progress from this workout will be discarded.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep Workout</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setRest(null); setSheet({ kind: "closed" }); setCancelOpen(false); onCancel(); }}>Cancel Workout</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {rest && rest.expanded && restRemaining > 0 && <RestTimer seconds={restRemaining} onMinimize={() => setRest({ ...rest, expanded: false })} onAdjust={(amount) => setRest({ ...rest, endsAt: rest.endsAt + amount * 1000 })} onSkip={() => setRest(null)} />}
      <ExerciseActionsSheet sheet={sheet} workout={workout} onClose={() => setSheet({ kind: "closed" })} onShowReplace={(key) => setSheet({ kind: "replace", key })} onShowSuperset={(key) => setSheet({ kind: "superset", key })} onReplace={replaceExercise} onPair={pairSuperset} onRemovePair={removeSuperset} onRemove={(key) => { setSheet({ kind: "closed" }); setRemoveKey(key); }} onRest={(key, seconds) => { updateExercise(key, (exercise) => ({ ...exercise, restSeconds: seconds })); setSheet({ kind: "closed" }); }} onAdd={(exercise) => {
        const base = toWorkoutExercise(exercise);
        const active = createActiveWorkout([base])?.exercises[0];
        if (active) onChange({ ...workout, exercises: [...workout.exercises, active] });
        setSheet({ kind: "closed" });
      }} />
      <AlertDialog open={Boolean(removeKey)} onOpenChange={(open) => { if (!open) setRemoveKey(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl bg-popover">
          <AlertDialogHeader><AlertDialogTitle>Remove exercise?</AlertDialogTitle><AlertDialogDescription>Entered sets for this exercise will be removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={removeExercise}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={finishOpen} onOpenChange={setFinishOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl bg-popover">
          <AlertDialogHeader><AlertDialogTitle>Finish workout?</AlertDialogTitle><AlertDialogDescription>You still have {totalSets - completedSets} incomplete sets.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep training</AlertDialogCancel><AlertDialogAction onClick={finishWorkout}>Finish workout</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function WorkoutHeader({ name, elapsed, progress, completedSets, totalSets, mixedTracking, onFinish }: { name: string; elapsed: number; progress: number; completedSets: number; totalSets: number; mixedTracking: boolean; onFinish: () => void }) {
  return <header className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h1 className="text-lg font-extrabold leading-tight">{name}</h1><div className="mt-1 flex items-center gap-2 text-[0.7rem] font-semibold text-muted-foreground"><span className="flex items-center gap-1 tabular-nums"><Clock3 className="size-3.5" />{formatClock(elapsed)}</span><span>{completedSets}/{totalSets} {mixedTracking ? "completed" : "sets"}</span></div></div><Button variant="surface" size="sm" className="shrink-0 border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15" onClick={onFinish}>Finish workout</Button></div>
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-track"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div>
  </header>;
}

function ExerciseCard({ exercise, current, completed, expanded, pairedName, onToggle, onStart, onSetChange, onToggleSet, onAddSet, onRemoveSet, onRest, onActions }: {
  exercise: ActiveExercise; current: boolean; completed: boolean; expanded: boolean; pairedName: string | undefined;
  onToggle: () => void; onStart: () => void; onSetChange: (setId: string, patch: Partial<ActiveSet>, propagate?: boolean) => void; onToggleSet: (set: ActiveSet) => void; onAddSet: () => void; onRemoveSet: (setId: string) => void; onRest: () => void; onActions: () => void;
}) {
  const done = exercise.sessionSets.filter((set) => set.completed).length;
  return <Card className={cn("relative overflow-hidden border p-0 transition-colors", current && "border-primary/50 bg-primary/[0.04]", completed && "border-emerald-500/25 bg-emerald-500/[0.08] dark:border-emerald-400/20 dark:bg-emerald-400/[0.08]")}>{exercise.supersetWith && <div className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
    <button type="button" className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-3 text-left" onClick={onToggle}>
      <span className="min-w-0"><span className={cn("block text-sm font-extrabold leading-snug", completed && "text-emerald-700 dark:text-emerald-400")}>{exercise.name}</span><span className="mt-1 block text-[0.68rem] font-medium text-muted-foreground">{isCardioExercise(exercise) ? "Cardio" : exercise.muscle} · {exercise.equipment}</span>{pairedName && <span className="mt-1 flex items-center gap-1 text-[0.65rem] font-semibold text-primary"><Link2 className="size-3" />{pairedName}</span>}</span>
      <span className="flex items-center gap-2"><span className="text-xs font-bold tabular-nums text-muted-foreground">{done}/{exercise.sessionSets.length}</span>{!completed && (expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />)}</span>
    </button>
    {expanded && <div className="border-t border-border px-3 pb-3 pt-2">
      {isCardioExercise(exercise) ? <CardioFields exercise={exercise} set={exercise.sessionSets[0]} onChange={(patch) => { const first = exercise.sessionSets[0]; if (first) onSetChange(first.id, patch); }} onToggle={() => { const first = exercise.sessionSets[0]; if (first) onToggleSet(first); }} /> : <>
        {previousPerformance[exercise.id] && <p className="mb-2 text-[0.68rem] font-semibold text-muted-foreground">Last: {previousPerformance[exercise.id]}</p>}
        <div className="mb-1 grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2 px-1 text-[0.6rem] font-bold uppercase text-muted-foreground"><span>Set</span><span className="text-center">kg</span><span className="text-center">reps</span><span /></div>
        <div className="space-y-1">{exercise.sessionSets.map((set, index) => <SetRow key={set.id} set={set} number={index + 1} canRemove={exercise.sessionSets.length > 1} onChange={(patch, propagate) => onSetChange(set.id, patch, propagate)} onToggle={() => onToggleSet(set)} onRemove={() => onRemoveSet(set.id)} />)}</div>
        <div className="mt-2 flex items-center justify-between gap-2"><Button variant="ghost" size="sm" className="px-1.5 text-muted-foreground" onClick={onAddSet}><Plus /> Add set</Button><Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={`Actions for ${exercise.name}`} onClick={onActions}><Ellipsis /></Button></div>
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-2"><button type="button" onClick={onRest} className="flex min-h-9 items-center text-left text-[0.68rem] text-muted-foreground"><span className="font-semibold">Rest between sets</span><span className="ml-2 font-bold tabular-nums text-foreground">{exercise.restSeconds} sec</span><ChevronDown className="ml-1 size-3.5" aria-hidden="true" /></button>{!current && <Button variant="surface" size="sm" onClick={onStart}>Start this exercise</Button>}</div>
      </>}
      {isCardioExercise(exercise) && <div className="mt-2 flex justify-end"><Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={`Actions for ${exercise.name}`} onClick={onActions}><Ellipsis /></Button></div>}
    </div>}
  </Card>;
}

const cardioInput = "h-10 w-full min-w-0 max-w-full rounded-lg border border-border bg-secondary px-2 text-center text-sm font-bold tabular-nums outline-none focus:border-primary";
function CardioFields({ exercise, set: session, onChange, onToggle }: { exercise: ActiveExercise; set: ActiveSet | undefined; onChange: (patch: Partial<ActiveSet>) => void; onToggle: () => void }) {
  if (!session) return null;
  const metrics = new Set(exercise.cardioMetrics ?? ["duration"]);
  const field = (metric: string, label: string, key: keyof ActiveSet, mode: "numeric" | "decimal" = "decimal") => metrics.has(metric as never) ? <label className="block min-w-0 w-full text-[0.62rem] font-bold uppercase text-muted-foreground"><span className="mb-1 block">{label}</span><input inputMode={mode} value={String(session[key] ?? "")} onChange={(event) => onChange({ [key]: event.target.value })} className={cardioInput} /></label> : null;
  return <div><div className="grid min-w-0 grid-cols-1 gap-x-2 gap-y-2 min-[390px]:grid-cols-2"><label className="block min-w-0 w-full text-[0.62rem] font-bold uppercase text-muted-foreground"><span className="mb-1 block">Duration (min)</span><input inputMode="decimal" value={session.durationSeconds ? Math.round(Number(session.durationSeconds) / 60) : ""} onChange={(event) => onChange({ durationSeconds: String((Number(event.target.value) || 0) * 60) })} className={cardioInput} /></label>{field("distance", "Distance (km)", "distanceKm")}{field("speed", "Speed (km/h)", "speedKph")}{field("pace", "Pace (/km)", "pace")}{field("incline", "Incline (%)", "incline")}{field("level", "Level", "level", "numeric")}{field("floors", "Floors", "floors", "numeric")}{field("steps", "Steps", "steps", "numeric")}{field("pace500m", "Pace /500m", "pace500m")}</div><Button variant={session.completed ? "primary" : "surface"} className="mt-3 w-full" onClick={onToggle}><Check />{session.completed ? "Cardio completed" : "Complete cardio"}</Button></div>;
}

function SetRow({ set, number, canRemove, onChange, onToggle, onRemove }: { set: ActiveSet; number: number; canRemove: boolean; onChange: (patch: Partial<ActiveSet>, propagate?: boolean) => void; onToggle: () => void; onRemove: () => void }) {
  const [cleared, setCleared] = useState<{ field: "weight" | "reps"; previous: string } | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const deleteWidth = 72;
  const focusField = (field: "weight" | "reps") => {
    setSwipeX(0);
    const value = String(set[field] ?? "");
    setCleared(value ? { field, previous: value } : null);
  };
  const blurField = () => {
    if (!cleared) return;
    const field = cleared.field;
    const value = field === "weight" ? set.weight : set.reps;
    setCleared(null);
    if (!value) {
      if (field === "weight") onChange({ weight: cleared.previous, weightEdited: true }, true);
      else onChange({ reps: cleared.previous });
    }
  };
  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!canRemove || set.completed) return;
    const touch = event.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setDragging(false);
  };
  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart || !canRemove || set.completed) return;
    const touch = event.touches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    if (!dragging && Math.abs(dx) < 8) return;
    if (!dragging && Math.abs(dy) > Math.abs(dx)) { setTouchStart(null); return; }
    setDragging(true);
    setSwipeX(Math.max(-deleteWidth, Math.min(0, dx)));
  };
  const onTouchEnd = () => {
    if (!touchStart) return;
    setSwipeX(swipeX < -36 ? -deleteWidth : 0);
    setTouchStart(null);
    setDragging(false);
  };
  return <div className="relative overflow-hidden rounded-lg">
    {canRemove && !set.completed && <button type="button" aria-label={`Delete set ${number}`} onClick={() => { setSwipeX(0); onRemove(); }} className="absolute inset-y-0 right-0 flex w-[72px] items-center justify-center bg-destructive text-xs font-extrabold text-destructive-foreground"><Trash2 className="mr-1 size-4" />Delete</button>}
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { setTouchStart(null); setDragging(false); setSwipeX(0); }}
      className={cn("relative grid min-h-11 grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1.25fr)_2.5rem] items-center gap-2 rounded-lg bg-card px-1", set.completed && "bg-accent set-success-pulse", !dragging && "transition-transform duration-200 ease-out")}
      style={{ transform: `translateX(${swipeX}px)`, touchAction: "pan-y" }}
    >
      <span className="text-center text-xs font-bold text-muted-foreground">{number}</span>
      <input inputMode="decimal" aria-label={`Weight for set ${number}`} value={cleared?.field === "weight" ? "" : set.weight} placeholder="—" onFocus={() => focusField("weight")} onBlur={blurField} onChange={(event) => { setCleared(null); onChange({ weight: event.target.value, weightEdited: true }, true); }} className="h-9 min-w-0 rounded-lg border border-border bg-secondary px-2 text-center text-sm font-bold tabular-nums outline-none focus:border-primary" />
      <div className="grid grid-cols-[2rem_minmax(2rem,1fr)_2rem] items-center"><button type="button" aria-label={`Decrease reps for set ${number}`} onClick={() => onChange({ reps: String(Math.max(0, (Number(set.reps) || 0) - 1)) })} className="grid size-9 place-items-center text-muted-foreground"><Minus className="size-3.5" /></button><input inputMode="numeric" aria-label={`Reps for set ${number}`} value={cleared?.field === "reps" ? "" : set.reps} onFocus={() => focusField("reps")} onBlur={blurField} onChange={(event) => { setCleared(null); onChange({ reps: event.target.value }); }} className="h-9 min-w-0 bg-transparent text-center text-sm font-bold tabular-nums outline-none" /><button type="button" aria-label={`Increase reps for set ${number}`} onClick={() => onChange({ reps: String((Number(set.reps) || 0) + 1) })} className="grid size-9 place-items-center text-muted-foreground"><Plus className="size-3.5" /></button></div>
      <button type="button" aria-label={`${set.completed ? "Reopen" : "Complete"} set ${number}`} onClick={onToggle} className={cn("grid size-9 place-items-center rounded-full border transition-all duration-300", set.completed ? "border-primary bg-primary text-primary-foreground check-pop" : "border-border text-muted-foreground")}><span className={cn("block text-lg font-black leading-none transition-all duration-200", set.completed ? "scale-100 opacity-100" : "scale-75 opacity-25")} aria-hidden="true">✓</span></button>
    </div>
  </div>;
}

function RestTimer({ seconds, onMinimize, onAdjust, onSkip }: { seconds: number; onMinimize: () => void; onAdjust: (seconds: number) => void; onSkip: () => void }) {
  const total = 120;
  const stroke = 2 * Math.PI * 74;
  return <div role="dialog" aria-label="Rest timer" className="fixed inset-0 z-[60] mx-auto flex max-w-[430px] -translate-y-12 flex-col items-center justify-center bg-background/95 px-5 backdrop-blur-xl" onClick={onMinimize}>
    <button type="button" aria-label="Minimize rest timer" className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] grid size-11 place-items-center text-muted-foreground"><ChevronDown /></button>
    <div className="relative size-48" onClick={(event) => event.stopPropagation()}><svg viewBox="0 0 168 168" className="size-full -rotate-90"><circle cx="84" cy="84" r="74" fill="none" stroke="var(--color-track)" strokeWidth="7"/><circle cx="84" cy="84" r="74" fill="none" stroke="var(--color-primary)" strokeWidth="7" strokeLinecap="round" strokeDasharray={stroke} strokeDashoffset={stroke * (1 - Math.min(seconds / total, 1))}/></svg><div className="absolute inset-x-0 top-12 text-center text-[0.7rem] font-bold uppercase text-muted-foreground">Rest</div><div className="absolute inset-0 grid place-items-center text-5xl font-extrabold tabular-nums">{formatClock(seconds)}</div></div>
    <div className="mt-7 flex items-center gap-3" onClick={(event) => event.stopPropagation()}><Button variant="surface" onClick={() => onAdjust(-15)}>−15 sec</Button><Button variant="surface" onClick={onSkip}>Skip</Button><Button variant="surface" onClick={() => onAdjust(15)}>+15 sec</Button></div>
  </div>;
}

function MinimizedRestTimer({ seconds, onExpand, onAdjust, onSkip }: { seconds: number; onExpand: () => void; onAdjust: (seconds: number) => void; onSkip: () => void }) {
  return <div className="sticky top-[5.7rem] z-10 mt-2 flex h-12 items-center rounded-xl border border-primary/30 bg-elevated px-2 shadow-sm"><button type="button" className="flex min-w-0 flex-1 items-center gap-2 px-1 text-left" onClick={onExpand}><Clock3 className="size-4 text-primary" /><span className="text-xs font-bold">Rest</span><span className="text-sm font-extrabold tabular-nums text-primary">{formatClock(seconds)}</span></button><button type="button" onClick={() => onAdjust(-15)} className="grid size-9 place-items-center text-muted-foreground" aria-label="Subtract 15 seconds"><Minus className="size-4" /></button><button type="button" onClick={() => onAdjust(15)} className="grid size-9 place-items-center text-muted-foreground" aria-label="Add 15 seconds"><Plus className="size-4" /></button><button type="button" onClick={onSkip} className="grid size-9 place-items-center text-muted-foreground" aria-label="End rest"><X className="size-4" /></button></div>;
}

function ExerciseActionsSheet({ sheet, workout, onClose, onShowReplace, onShowSuperset, onReplace, onPair, onRemovePair, onRemove, onRest, onAdd }: { sheet: Sheet; workout: ActiveWorkoutState; onClose: () => void; onShowReplace: (key: string) => void; onShowSuperset: (key: string) => void; onReplace: (key: string, exercise: Exercise) => void; onPair: (key: string, partner: string) => void; onRemovePair: (key: string) => void; onRemove: (key: string) => void; onRest: (key: string, seconds: number) => void; onAdd: (exercise: Exercise) => void }) {
  const key = "key" in sheet ? sheet.key : undefined;
  const current = workout.exercises.find((exercise) => exercise.key === key);
  const used = new Set(workout.exercises.map((exercise) => exercise.id));
  const alternatives = current ? [...exercises.filter((exercise) => isCardioExercise(exercise) === isCardioExercise(current) && !used.has(exercise.id))].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10) : [];
  return <>
    <Drawer open={sheet.kind === "actions"} onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Exercise actions</DrawerTitle></DrawerHeader>{key && <div className="space-y-1 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"><Button variant="ghost" className="w-full justify-start" onClick={() => onShowReplace(key)}><Shuffle />Replace exercise</Button>{current && !isCardioExercise(current) && <Button variant="ghost" className="w-full justify-start" onClick={() => onShowSuperset(key)}><Link2 />Superset</Button>}{current?.supersetWith && <Button variant="ghost" className="w-full justify-start" onClick={() => onRemovePair(key)}><Unlink />Remove superset</Button>}<Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => onRemove(key)}><Trash2 />Remove exercise</Button></div>}</DrawerContent></Drawer>
    <Drawer open={sheet.kind === "replace"} onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className="mx-auto max-h-[72dvh] max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Replace exercise</DrawerTitle></DrawerHeader><div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{key && alternatives.map((exercise) => <ExerciseOption key={exercise.id} exercise={exercise} onSelect={(item) => onReplace(key, item)} />)}</div></DrawerContent></Drawer>
    <Drawer open={sheet.kind === "superset"} onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Choose exercise to superset with</DrawerTitle></DrawerHeader><div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{key && workout.exercises.filter((exercise) => exercise.key !== key && !isCardioExercise(exercise) && !exercise.supersetWith && !exercise.sessionSets.every((set) => set.completed)).map((exercise) => <DrawerClose key={exercise.key} asChild><button type="button" className="min-h-14 w-full border-b border-border text-left text-sm font-bold last:border-0" onClick={() => onPair(key, exercise.key)}>{exercise.name}</button></DrawerClose>)}</div></DrawerContent></Drawer>
    <Drawer open={sheet.kind === "rest"} onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Rest between sets</DrawerTitle></DrawerHeader><div className="grid grid-cols-4 gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{[30, 45, 60, 90, 120, 150, 180].map((seconds) => <Button key={seconds} variant={current?.restSeconds === seconds ? "choiceActive" : "choice"} onClick={() => key && onRest(key, seconds)}>{seconds} sec</Button>)}</div></DrawerContent></Drawer>
    <ExercisePicker open={sheet.kind === "add"} onClose={onClose} onSelect={onAdd} />
    <CardioPicker open={sheet.kind === "addCardio"} onClose={onClose} onSelect={onAdd} />
  </>;
}

function ExercisePicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (exercise: Exercise) => void }) {
  const [query, setQuery] = useState(""); const [muscle, setMuscle] = useState<Muscle | null>(null); const [equipment, setEquipment] = useState<Equipment | null>(null);
  const results = useMemo(() => [...exercises.filter((exercise) => (!muscle || exercise.muscle === muscle || exercise.muscles?.includes(muscle)) && (!equipment || exercise.equipment === equipment) && exercise.name.toLowerCase().includes(query.toLowerCase()))].sort((a, b) => a.name.localeCompare(b.name)), [query, muscle, equipment]);
  return <Drawer open={open} onOpenChange={(value) => { if (!value) onClose(); }}><DrawerContent className="mx-auto h-[82dvh] max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Add exercise</DrawerTitle></DrawerHeader><div className="flex min-h-0 flex-1 flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"><div className="relative mb-2"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises" className="h-11 w-full rounded-xl border border-border bg-secondary pl-9 pr-3 text-sm outline-none focus:border-primary"/></div><FilterRow items={muscleGroups} value={muscle} onSelect={(item) => setMuscle(item === muscle ? null : item)}/><FilterRow items={equipmentTypes} value={equipment} onSelect={(item) => setEquipment(item === equipment ? null : item)}/><div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card px-3">{results.map((exercise) => <ExerciseOption key={exercise.id} exercise={exercise} onSelect={onSelect}/>)}</div></div></DrawerContent></Drawer>;
}

function CardioPicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (exercise: Exercise) => void }) {
  const cardio = useMemo(() => exercises.filter(isCardioExercise).sort((a, b) => a.name.localeCompare(b.name)), []);
  return <Drawer open={open} onOpenChange={(value) => { if (!value) onClose(); }}><DrawerContent className="mx-auto max-h-[72dvh] max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Add cardio</DrawerTitle></DrawerHeader><div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"><div className="rounded-xl border border-border bg-card px-3">{cardio.map((exercise) => <ExerciseOption key={exercise.id} exercise={exercise} onSelect={onSelect}/>)}</div></div></DrawerContent></Drawer>;
}

function FilterRow<T extends string>({ items, value, onSelect }: { items: readonly T[]; value: T | null; onSelect: (item: T) => void }) { return <div className="-mx-4 flex shrink-0 gap-1.5 overflow-x-auto px-4 py-1">{items.map((item) => <Button key={item} variant={value === item ? "choiceActive" : "surface"} size="sm" className="shrink-0 rounded-full" onClick={() => onSelect(item)}>{item}</Button>)}</div>; }
function ExerciseOption({ exercise, onSelect }: { exercise: Exercise; onSelect: (exercise: Exercise) => void }) { return <DrawerClose asChild><button type="button" className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 text-left last:border-0" onClick={() => onSelect(exercise)}><span className="min-w-0"><span className="block text-sm font-bold">{exercise.name}</span><span className="mt-1 block text-[0.7rem] text-muted-foreground">{isCardioExercise(exercise) ? "Cardio" : exercise.muscle} · {exercise.equipment}</span></span><Plus className="size-4 text-primary"/></button></DrawerClose>; }

function WorkoutSummary({ result }: { result: FinishedWorkout }) {
  const [celebrating, setCelebrating] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const performed = result.workout.exercises.map((exercise) => ({
    exercise,
    sets: exercise.sessionSets.filter((set) => set.completed),
  })).filter(({ sets }) => sets.length > 0);
  const data = useTrainingData();
  const shareWorkout = useMemo(() => data?.workouts.find((w) => w.id === result.workout.id) ?? toCompletedWorkout(result.workout, result.duration), [data, result]);
  const sharePrs = useMemo(() => (data ? personalRecords(data.workouts).byWorkout.get(result.workout.id) : undefined) ?? [], [data, result.workout.id]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setCelebrating(false);
      setShowStats(true);
      return;
    }
    const statsTimer = window.setTimeout(() => setShowStats(true), 500);
    const finishTimer = window.setTimeout(() => setCelebrating(false), 1450);
    return () => { window.clearTimeout(statsTimer); window.clearTimeout(finishTimer); };
  }, []);

  if (celebrating) return <WorkoutCompleteCelebration result={result} showStats={showStats} prs={sharePrs.length} />;

  return <div className="animate-in fade-in slide-in-from-bottom-2 py-8 duration-500">
    <div className="flex items-center gap-3">
      <div className="grid size-11 place-items-center rounded-full bg-primary/10"><CircleCheck className="size-8 text-primary"/></div>
      <div><p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary">Workout complete</p><h1 className="mt-0.5 max-w-full text-3xl font-extrabold leading-tight [overflow-wrap:anywhere]">{result.workout.name}</h1></div>
    </div>
    {sharePrs.length > 0 && <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4"><p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-primary">New personal record{sharePrs.length > 1 ? "s" : ""}</p><p className="mt-1 text-sm font-bold">{sharePrs.length === 1 ? "A new best performance." : `${sharePrs.length} new best performances.`}</p></div>}
    <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border"><SummaryMetric label="Duration" value={formatDuration(result.duration)}/><SummaryMetric label="Exercises" value={`${result.completedExercises} of ${result.workout.exercises.length} completed`}/><SummaryMetric label="Sets" value={String(result.totalSets)}/><SummaryMetric label="Volume" value={result.volume ? `${Math.round(result.volume).toLocaleString()} kg` : "—"}/></div>
    {performed.length > 0 && <section className="mt-6"><h2 className="text-sm font-extrabold">Exercises performed</h2><div className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card px-3">{performed.map(({ exercise, sets }) => <div key={exercise.key} className="py-3"><h3 className="text-sm font-extrabold">{exercise.name}</h3><div className="mt-1.5 space-y-0.5">{sets.map((set) => <div key={set.id} className="text-xs font-semibold tabular-nums text-muted-foreground">{isCardioExercise(exercise) ? `${Math.round((Number(set.durationSeconds) || 0) / 60)} min${set.distanceKm ? ` · ${set.distanceKm} km` : ""}` : exercise.equipment === "Bodyweight" || !Number(set.weight) ? `${set.reps} reps` : `${set.weight} kg × ${set.reps}`}</div>)}</div></div>)}</div></section>}
    {shareWorkout.exercises.length > 0 && <ShareWorkoutButton workout={shareWorkout} prs={sharePrs} className="mt-5 w-full" />}
  </div>;
}

function WorkoutCompleteCelebration({ result, showStats, prs }: { result: FinishedWorkout; showStats: boolean; prs: number }) {
  const circumference = 2 * Math.PI * 54;
  return <div className="relative -mx-4 flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center overflow-hidden bg-background px-5 py-8 text-center">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_55%)] opacity-[0.07]" />
    <div className="relative">
      {[0,1,2,3,4,5,6,7].map((i) => <span key={i} className="absolute left-1/2 top-1/2 h-1 w-8 origin-left rounded-full bg-primary/60 animate-in fade-in zoom-in duration-500" style={{ transform: `rotate(${i * 45}deg) translateX(76px)` }} />)}
      <svg viewBox="0 0 128 128" className="size-36 -rotate-90">
        <circle cx="64" cy="64" r="54" fill="none" stroke="var(--color-track)" strokeWidth="6"/>
        <circle cx="64" cy="64" r="54" fill="none" stroke="var(--color-primary)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset="0" className="transition-all duration-1000 ease-out"/>
      </svg>
      <div className="absolute inset-0 grid place-items-center"><div className="grid size-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg animate-in zoom-in duration-500"><Check className="size-10" strokeWidth={3}/></div></div>
    </div>
    <p className="mt-7 animate-in fade-in slide-in-from-bottom-2 text-[0.72rem] font-extrabold uppercase tracking-[0.24em] text-primary duration-500">Workout complete</p>
    <h1 className="mt-2 max-w-[22rem] animate-in fade-in slide-in-from-bottom-2 text-3xl font-black leading-tight duration-700 [overflow-wrap:anywhere]">{result.workout.name}</h1>
    <div className={cn("mt-7 grid w-full grid-cols-3 gap-2 transition-all duration-500", showStats ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")}>
      <CelebrationStat value={formatDuration(result.duration)} label="Time"/>
      <CelebrationStat value={String(result.totalSets)} label="Sets"/>
      <CelebrationStat value={result.volume ? Math.round(result.volume).toLocaleString() : "—"} label={result.volume ? "kg volume" : "Volume"}/>
    </div>
    {prs > 0 && <div className={cn("mt-4 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-primary transition-all delay-300 duration-500", showStats ? "scale-100 opacity-100" : "scale-90 opacity-0")}>New personal record{prs > 1 ? "s" : ""} · {prs}</div>}
  </div>;
}

function CelebrationStat({ value, label }: { value: string; label: string }) { return <div aria-label={`${label}: ${value}`} className="rounded-2xl border border-border bg-card/80 px-2 py-3 backdrop-blur"><div className="text-lg font-black tabular-nums">{value}</div><div className="mt-1 text-[0.62rem] font-bold uppercase tracking-wide text-muted-foreground">{label}</div></div>; }
function SummaryMetric({ label, value }: { label: string; value: string }) { return <div className="bg-card p-4"><div className="text-lg font-extrabold tabular-nums">{value}</div><div className="mt-1 text-[0.68rem] text-muted-foreground">{label}</div></div>; }


      <style>{`
        @keyframes workoutCardEnter { 0% { opacity: 0; transform: translateY(28px) scale(.97); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes checkPop { 0% { transform: scale(.45); } 55% { transform: scale(1.28); } 100% { transform: scale(1); } }
        @keyframes setSuccessPulse { 0% { background-color: var(--color-card); } 30% { background-color: rgba(34,197,94,.24); transform: scale(1.018); } 100% { background-color: var(--color-accent); transform: scale(1); } }
        .workout-card-enter { animation: workoutCardEnter 650ms cubic-bezier(.16,1,.3,1) both; }
        .check-pop { animation: checkPop 480ms cubic-bezier(.16,1,.3,1); }
        .set-success-pulse { animation: setSuccessPulse 760ms ease-out; }
        @media (prefers-reduced-motion: reduce) { .workout-card-enter, .check-pop, .set-success-pulse { animation: none !important; } }
      `}</style>
