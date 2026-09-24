import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { WorkoutExercise } from "@/data/exercises";
import { WorkoutEditor } from "./workout-editor";

export const exerciseTarget = (exercise: WorkoutExercise) => exercise.tracking === "cardio"
  ? `${Math.round((exercise.targetDurationSeconds ?? 1200) / 60)} min`
  : `${exercise.sets} × ${exercise.reps}`;

export function PlanHeader({ back, title, subtitle }: { back: ReactNode; title: string; subtitle?: string }) {
  return <div className="mb-4 flex items-center gap-3">
    {back}
    <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-extrabold">{title}</h1>{subtitle && <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">{subtitle}</p>}</div>
  </div>;
}

export const BackLink = ({ to, label }: { to: "/saved" | "/" | "/workout"; label: string }) => <Button asChild variant="surface" size="icon" className="size-10 shrink-0" aria-label={label}><Link to={to}><ArrowLeft /></Link></Button>;

export function ExerciseList({ exercises }: { exercises: WorkoutExercise[] }) {
  const letter = (key: string) => exercises.find((e) => e.key === key)?.name;
  return <Card className="divide-y divide-border px-3">
    {exercises.map((exercise, index) => <div key={exercise.key} className="flex min-h-12 items-center gap-3 py-2">
      <span className="w-5 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{index + 1}</span>
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{exercise.name}</div>
        {exercise.supersetWith && <div className="mt-0.5 flex items-center gap-1 truncate text-[0.7rem] font-semibold text-primary"><Link2 className="size-3" />Superset with {letter(exercise.supersetWith)}</div>}</div>
      <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{exerciseTarget(exercise)}</span>
    </div>)}
  </Card>;
}

/** Edit mode reuses the existing Workout Editor. */
export function PlanEditor({ initial, onCancel, onSave }: { initial: WorkoutExercise[]; onCancel: () => void; onSave: (exercises: WorkoutExercise[]) => void }) {
  const [workout, setWorkout] = useState(() => initial.map((e) => structuredClone(e)));
  return <>
    <header className="mb-4 flex items-center justify-between gap-3 pt-1">
      <Button variant="ghost" onClick={onCancel} className="px-2 text-muted-foreground">Cancel</Button>
      <h1 className="text-base font-extrabold">Edit workout</h1>
      <Button variant="ghost" disabled={!workout.length} onClick={() => onSave(workout)} className="px-2 text-primary">Save</Button>
    </header>
    <WorkoutEditor supersets workout={workout} setWorkout={setWorkout} />
  </>;
}

export function ConfirmDelete({ open, onOpenChange, title, description, action, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; action: string; onConfirm: () => void }) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Keep</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onConfirm}>{action}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
