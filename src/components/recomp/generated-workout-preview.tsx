import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, GripVertical, Minus, Plus, RefreshCw, Search, Shuffle, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
  equipmentTypes,
  exercises,
  findReplacement,
  generateWorkout,
  muscleGroups,
  toWorkoutExercise,
  type Equipment,
  type Exercise,
  type Muscle,
  type WorkoutExercise,
} from "@/data/exercises";
import { cn } from "@/lib/utils";

const repRanges = ["4–6", "6–8", "8–10", "10–12", "12–15", "15–20"];

type SheetState =
  | { kind: "closed" }
  | { kind: "replace"; key: string }
  | { kind: "reps"; key: string }
  | { kind: "add" };

export function GeneratedWorkoutPreview({ muscles, count }: { muscles: Muscle[]; count: number }) {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(() => generateWorkout(muscles, count));
  const [sheet, setSheet] = useState<SheetState>({ kind: "closed" });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const update = (key: string, patch: Partial<WorkoutExercise>) => {
    setWorkout((current) => current.map((exercise) => exercise.key === key ? { ...exercise, ...patch } : exercise));
  };

  const replace = (key: string, alternative: Exercise) => {
    setWorkout((current) => current.map((exercise) => exercise.key === key
      ? { ...toWorkoutExercise(alternative), sets: exercise.sets, reps: exercise.reps }
      : exercise));
    setSheet({ kind: "closed" });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setWorkout((current) => {
      const from = current.findIndex((exercise) => exercise.key === active.id);
      const to = current.findIndex((exercise) => exercise.key === over.id);
      return from < 0 || to < 0 ? current : arrayMove(current, from, to);
    });
  };

  const startWorkout = () => {
    sessionStorage.setItem("recomp-active-workout", JSON.stringify(workout));
    void navigate({ to: "/workout" });
  };

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
        <Button variant="ghost" size="sm" className="px-2 text-muted-foreground" onClick={() => setWorkout(generateWorkout(muscles, count))}>
          <RefreshCw /> Regenerate
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={workout.map((exercise) => exercise.key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {workout.map((exercise, index) => (
              <SortableExercise
                key={exercise.key}
                exercise={exercise}
                index={index}
                onSets={(sets) => update(exercise.key, { sets })}
                onReplace={() => setSheet({ kind: "replace", key: exercise.key })}
                onReps={() => setSheet({ kind: "reps", key: exercise.key })}
                onRemove={() => setWorkout((current) => current.filter((item) => item.key !== exercise.key))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button variant="surface" className="mt-3 w-full" onClick={() => setSheet({ kind: "add" })}><Plus /> Add exercise</Button>
      <Button variant="primary" size="xl" className="mt-4 w-full" disabled={!workout.length} onClick={startWorkout}>Start workout</Button>

      <ReplaceDrawer
        open={sheet.kind === "replace"}
        exercise={sheet.kind === "replace" ? workout.find((item) => item.key === sheet.key) : undefined}
        workout={workout}
        onOpenChange={(open) => !open && setSheet({ kind: "closed" })}
        onSelect={(exercise) => sheet.kind === "replace" && replace(sheet.key, exercise)}
      />
      <RepDrawer
        open={sheet.kind === "reps"}
        value={sheet.kind === "reps" ? workout.find((item) => item.key === sheet.key)?.reps : undefined}
        onOpenChange={(open) => !open && setSheet({ kind: "closed" })}
        onSelect={(reps) => {
          if (sheet.kind === "reps") update(sheet.key, { reps });
          setSheet({ kind: "closed" });
        }}
      />
      <ExerciseLibraryDrawer
        open={sheet.kind === "add"}
        onOpenChange={(open) => !open && setSheet({ kind: "closed" })}
        onSelect={(exercise) => {
          setWorkout((current) => [...current, toWorkoutExercise(exercise)]);
          setSheet({ kind: "closed" });
        }}
      />
    </>
  );
}

function SortableExercise({ exercise, index, onSets, onReplace, onReps, onRemove }: {
  exercise: WorkoutExercise;
  index: number;
  onSets: (sets: number) => void;
  onReplace: () => void;
  onReps: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.key });
  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 p-3", isDragging && "relative z-10 border-primary opacity-90")}
    >
      <button
        type="button"
        aria-label={`Reorder ${exercise.name}, position ${index + 1}`}
        className="-ml-1 grid min-h-11 w-7 touch-none place-items-center text-muted-foreground focus-visible:outline-none focus-visible:text-primary"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-extrabold">{exercise.name}</h2>
            <p className="mt-0.5 text-[0.7rem] font-medium text-muted-foreground">{exercise.muscle} · {exercise.equipment}</p>
          </div>
          <Button variant="ghost" size="icon" className="-mr-2 -mt-2 size-9 text-muted-foreground" aria-label={`Remove ${exercise.name}`} onClick={onRemove}><Trash2 /></Button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex h-9 items-center rounded-lg border border-border bg-secondary">
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Fewer sets for ${exercise.name}`} onClick={() => onSets(Math.max(1, exercise.sets - 1))}><Minus /></Button>
            <span className="w-12 text-center text-[0.7rem] font-bold tabular-nums">{exercise.sets} sets</span>
            <Button variant="ghost" size="icon" className="size-8" aria-label={`More sets for ${exercise.name}`} onClick={() => onSets(Math.min(10, exercise.sets + 1))}><Plus /></Button>
          </div>
          <Button variant="surface" size="sm" className="h-9 px-2.5 text-[0.7rem] tabular-nums" onClick={onReps}>{exercise.reps} reps</Button>
          <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={`Replace ${exercise.name}`} onClick={onReplace}><Shuffle /></Button>
        </div>
      </div>
    </Card>
  );
}

function ReplaceDrawer({ open, exercise, workout, onOpenChange, onSelect }: {
  open: boolean;
  exercise?: WorkoutExercise;
  workout: WorkoutExercise[];
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: Exercise) => void;
}) {
  const alternatives = useMemo(() => exercise
    ? [
        ...exercises.filter((item) => item.muscle === exercise.muscle && item.id !== exercise.id && !workout.some((current) => current.id === item.id)),
        ...exercises.filter((item) => item.muscle !== exercise.muscle && !workout.some((current) => current.id === item.id)),
      ].slice(0, 8)
    : [], [exercise, workout]);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[72dvh] max-w-[430px] rounded-t-2xl bg-popover">
        <DrawerHeader className="pb-2 text-left"><DrawerTitle>Replace exercise</DrawerTitle></DrawerHeader>
        <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {alternatives.map((alternative) => <ExerciseOption key={alternative.id} exercise={alternative} onSelect={onSelect} />)}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function RepDrawer({ open, value, onOpenChange, onSelect }: { open: boolean; value?: string; onOpenChange: (open: boolean) => void; onSelect: (reps: string) => void }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover">
        <DrawerHeader className="pb-2 text-left"><DrawerTitle>Target reps</DrawerTitle></DrawerHeader>
        <div className="grid grid-cols-2 gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {repRanges.map((range) => <Button key={range} variant={value === range ? "choiceActive" : "choice"} className="h-11 tabular-nums" onClick={() => onSelect(range)}>{range} reps</Button>)}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ExerciseLibraryDrawer({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; onSelect: (exercise: Exercise) => void }) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const results = exercises.filter((exercise) => (!muscle || exercise.muscle === muscle) && (!equipment || exercise.equipment === equipment) && exercise.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto h-[82dvh] max-w-[430px] rounded-t-2xl bg-popover">
        <DrawerHeader className="pb-2 text-left"><DrawerTitle>Add exercise</DrawerTitle></DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="relative mb-2"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises" className="h-11 w-full rounded-xl border border-border bg-secondary pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
          <FilterRow items={muscleGroups} value={muscle} onSelect={(item) => setMuscle(item === muscle ? null : item)} />
          <FilterRow items={equipmentTypes} value={equipment} onSelect={(item) => setEquipment(item === equipment ? null : item)} />
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card px-3">
            {results.map((exercise) => <ExerciseOption key={exercise.id} exercise={exercise} onSelect={onSelect} />)}
            {!results.length && <p className="py-8 text-center text-sm text-muted-foreground">No matches</p>}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function FilterRow<T extends string>({ items, value, onSelect }: { items: readonly T[]; value: T | null; onSelect: (item: T) => void }) {
  return <div className="-mx-4 flex shrink-0 gap-1.5 overflow-x-auto px-4 py-1">{items.map((item) => <Button key={item} variant={value === item ? "choiceActive" : "surface"} size="sm" className="shrink-0 rounded-full" onClick={() => onSelect(item)}>{item}</Button>)}</div>;
}

function ExerciseOption({ exercise, onSelect }: { exercise: Exercise; onSelect: (exercise: Exercise) => void }) {
  return (
    <DrawerClose asChild>
      <button type="button" className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 text-left last:border-0" onClick={() => onSelect(exercise)}>
        <span className="min-w-0"><span className="block truncate text-sm font-bold">{exercise.name}</span><span className="mt-1 block text-[0.7rem] text-muted-foreground">{exercise.muscle} · {exercise.equipment}</span></span>
        <Plus className="size-4 text-primary" />
      </button>
    </DrawerClose>
  );
}