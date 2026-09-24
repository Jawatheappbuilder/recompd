import { useNavigate } from "@tanstack/react-router";
import { Minus, Pencil, Plus, Trash2, Trophy, X } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteWorkout, formatDuration, formatLongDay, formatPerformance, formatSet, isCardioSet, setCount, updateWorkout, volumeOf, type CompletedSet, type CompletedWorkout } from "@/lib/training-data";
import { ShareWorkoutButton } from "../share-workout";
import { SubHeader } from "./progress-widgets";

export function WorkoutDetail({ workout, prs }: { workout: CompletedWorkout; prs: { exerciseId: string; set: CompletedSet }[] }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (editing) return <WorkoutEditForm workout={workout} onDone={() => setEditing(false)} />;
  const volume = volumeOf(workout);

  return (
    <>
      <SubHeader title={workout.name} subtitle={formatLongDay(workout.startedAt)} action={<Button variant="surface" size="icon" className="size-10" aria-label="Edit workout" onClick={() => setEditing(true)}><Pencil /></Button>} />
      <Card className="grid grid-cols-3 divide-x divide-border p-4">
        {[[formatDuration(workout.durationSec), "duration"], [String(setCount(workout)), "sets"], [volume ? `${Math.round(volume).toLocaleString()}` : "—", volume ? "kg volume" : "volume"]].map(([value, label]) => (
          <div key={label} className="px-3 first:pl-0"><div className="font-display text-2xl font-extrabold tabular-nums">{value}</div><div className="text-[0.7rem] text-muted-foreground">{label}</div></div>
        ))}
      </Card>
      <div className="mt-3 space-y-2">
        {workout.exercises.map((exercise) => {
          const pr = prs.find((item) => item.exerciseId === exercise.exerciseId);
          return (
            <Card key={exercise.key} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h2 className="text-sm font-extrabold leading-snug">{exercise.name}</h2><p className="mt-0.5 text-[0.7rem] text-muted-foreground">{exercise.tracking === "cardio" ? "Cardio" : exercise.muscles.join(" + ")} · {exercise.equipment}</p></div>
                {pr && <span className="flex shrink-0 items-center gap-1 text-[0.68rem] font-bold text-primary"><Trophy className="size-3.5" />PR {formatSet(pr.set)}</span>}
              </div>
              <div className="mt-2 grid gap-1">
                {exercise.sets.map((set, index) => <div key={index} className="grid grid-cols-[1.5rem_minmax(0,1fr)] text-sm tabular-nums"><span className="text-muted-foreground">{exercise.tracking === "cardio" ? "" : index + 1}</span><span className="font-semibold">{formatPerformance(set)}</span></div>)}
              </div>
            </Card>
          );
        })}
      </div>
      <ShareWorkoutButton workout={workout} prs={prs} variant="surface" size="default" className="mt-4 w-full" />
      <Button variant="ghost" className="mt-2 w-full text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 />Delete workout</Button>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this workout?</AlertDialogTitle><AlertDialogDescription>{workout.name} will be removed from your history.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { deleteWorkout(workout.id); void navigate({ to: "/progress/history" }); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const numberInput = "h-10 w-full rounded-lg border border-border bg-secondary px-2 text-center text-sm font-bold tabular-nums outline-none focus:border-primary";

function WorkoutEditForm({ workout, onDone }: { workout: CompletedWorkout; onDone: () => void }) {
  const [draft, setDraft] = useState<CompletedWorkout>(() => structuredClone(workout));
  const totalMinutes = Math.round(draft.durationSec / 60);
  const setMinutes = (minutes: number) => setDraft((current) => ({ ...current, durationSec: Math.max(1, minutes) * 60 }));
  const updateSet = (exerciseKey: string, index: number, patch: Partial<CompletedSet>) => setDraft((current) => ({
    ...current,
    exercises: current.exercises.map((exercise) => exercise.key === exerciseKey ? { ...exercise, sets: exercise.sets.map((set, i) => i === index ? { ...set, ...patch } : set) } : exercise),
  }));
  const editSets = (exerciseKey: string, fn: (sets: CompletedSet[]) => CompletedSet[]) => setDraft((current) => ({ ...current, exercises: current.exercises.map((exercise) => exercise.key === exerciseKey ? { ...exercise, sets: fn(exercise.sets) } : exercise) }));
  const save = () => { updateWorkout({ ...draft, exercises: draft.exercises.filter((exercise) => exercise.sets.length) }); onDone(); };

  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-3 pt-1">
        <Button variant="ghost" onClick={onDone} className="px-2 text-muted-foreground">Cancel</Button>
        <h1 className="text-base font-extrabold">Edit workout</h1>
        <Button variant="ghost" onClick={save} className="px-2 text-primary">Save</Button>
      </header>
      <Card className="flex items-center justify-between gap-3 p-4">
        <div><div className="text-sm font-bold">Duration</div><div className="text-[0.7rem] text-muted-foreground">{formatDuration(draft.durationSec)}</div></div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label="5 minutes less" onClick={() => setMinutes(totalMinutes - 5)}><Minus /></Button>
          <label className="flex items-center gap-1"><input aria-label="Hours" inputMode="numeric" value={Math.floor(totalMinutes / 60)} onFocus={(event) => event.target.select()} onChange={(event) => setMinutes((Number(event.target.value) || 0) * 60 + (totalMinutes % 60))} className={`${numberInput} w-11`} /><span className="text-xs text-muted-foreground">h</span></label>
          <label className="flex items-center gap-1"><input aria-label="Minutes" inputMode="numeric" value={totalMinutes % 60} onFocus={(event) => event.target.select()} onChange={(event) => setMinutes(Math.floor(totalMinutes / 60) * 60 + Math.min(59, Number(event.target.value) || 0))} className={`${numberInput} w-11`} /><span className="text-xs text-muted-foreground">m</span></label>
          <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label="5 minutes more" onClick={() => setMinutes(totalMinutes + 5)}><Plus /></Button>
        </div>
      </Card>
      <div className="mt-3 space-y-2">
        {draft.exercises.map((exercise) => (
          <Card key={exercise.key} className="p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="text-sm font-extrabold leading-snug">{exercise.name}</h2>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-2 size-9 text-muted-foreground" aria-label={`Remove ${exercise.name}`} onClick={() => setDraft((current) => ({ ...current, exercises: current.exercises.filter((item) => item.key !== exercise.key) }))}><Trash2 /></Button>
            </div>
            {exercise.tracking === "cardio" || exercise.sets.some(isCardioSet) ? exercise.sets.map((set, index) => <CardioEditFields key={index} exerciseName={exercise.name} set={set} onChange={(patch) => updateSet(exercise.key, index, patch)} />) : <><div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-2 text-[0.62rem] font-bold uppercase tracking-wide text-muted-foreground"><span /><span className="text-center">kg</span><span className="text-center">Reps</span><span /></div>
            {exercise.sets.map((set, index) => (
              <div key={index} className="mt-1.5 grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                <input aria-label={`Set ${index + 1} weight`} inputMode="decimal" value={set.weight || ""} placeholder="0" onFocus={(event) => event.target.select()} onChange={(event) => updateSet(exercise.key, index, { weight: Number(event.target.value.replace(",", ".")) || 0 })} className={numberInput} />
                <input aria-label={`Set ${index + 1} reps`} inputMode="numeric" value={set.reps || ""} placeholder="0" onFocus={(event) => event.target.select()} onChange={(event) => updateSet(exercise.key, index, { reps: Number(event.target.value) || 0 })} className={numberInput} />
                <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={`Remove set ${index + 1}`} onClick={() => editSets(exercise.key, (sets) => sets.filter((_, i) => i !== index))}><X /></Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="mt-1.5 px-1 text-muted-foreground" onClick={() => editSets(exercise.key, (sets) => [...sets, { ...(sets.at(-1) ?? { weight: 0, reps: 8 }) }])}><Plus />Add set</Button></>}
          </Card>
        ))}
      </div>
      <Button variant="primary" size="lg" className="mt-4 w-full" onClick={save}>Save changes</Button>
    </>
  );
}

function CardioEditFields({ exerciseName, set, onChange }: { exerciseName: string; set: CompletedSet; onChange: (patch: Partial<CompletedSet>) => void }) {
  const field = (label: string, key: keyof CompletedSet, value: string | number | undefined) => value === undefined ? null : <label className="min-w-0 text-[0.62rem] font-bold uppercase text-muted-foreground"><span className="mb-1 block">{label}</span><input aria-label={`${exerciseName} ${label}`} inputMode="decimal" value={value} onChange={(event) => onChange({ [key]: key === "pace" || key === "pace500m" ? event.target.value : Number(event.target.value) || 0 })} className={numberInput} /></label>;
  return <div className="grid grid-cols-2 gap-2"><label className="min-w-0 text-[0.62rem] font-bold uppercase text-muted-foreground"><span className="mb-1 block">Duration (min)</span><input aria-label={`${exerciseName} duration`} inputMode="decimal" value={set.durationSeconds ? Math.round(set.durationSeconds / 60) : ""} onChange={(event) => onChange({ durationSeconds: (Number(event.target.value) || 0) * 60 })} className={numberInput} /></label>{field("Distance (km)", "distanceKm", set.distanceKm)}{field("Speed (km/h)", "speedKph", set.speedKph)}{field("Pace (/km)", "pace", set.pace)}{field("Incline (%)", "incline", set.incline)}{field("Level", "level", set.level)}{field("Floors", "floors", set.floors)}{field("Steps", "steps", set.steps)}{field("Pace /500m", "pace500m", set.pace500m)}</div>;
}
