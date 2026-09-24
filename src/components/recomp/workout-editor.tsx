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
import { Check, GripVertical, Link2, Unlink, Minus, Plus, Search, Shuffle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  equipmentTypes,
  exercises as libraryExercises,
  muscleGroups,
  muscleLabel,
  isCardioExercise,
  toWorkoutExercise,
  type Equipment,
  type Exercise,
  type Muscle,
  type WorkoutExercise,
} from "@/data/exercises";
import { saveCustomExercise, useCustomExercises } from "@/lib/workout-storage";
import { newId } from "@/lib/cloud-data";
import { cn } from "@/lib/utils";

const repRanges = ["4–6", "6–8", "8–10", "10–12", "12–15", "15–20"];
const cardioDurations = [300, 600, 900, 1200, 1800, 2700, 3600];

type SheetState = { kind: "closed" } | { kind: "superset"; key: string } | { kind: "replace"; key: string } | { kind: "reps"; key: string } | { kind: "duration"; key: string } | { kind: "add" };

const matchesMuscle = (exercise: Exercise, muscle: Muscle) => exercise.muscle === muscle || !!exercise.muscles?.includes(muscle);

function useLibrary() {
  const custom = useCustomExercises();
  const all = useMemo(() => [...custom, ...libraryExercises].sort((a, b) => a.name.localeCompare(b.name)), [custom]);
  const addCustom = (exercise: Exercise) => saveCustomExercise(exercise);
  return { all, addCustom };
}

/** Shared editor used by both generated and manually built workouts. */
export function WorkoutEditor({ workout, setWorkout, pickerOpen, onPickerOpenChange, supersets = false }: {
  supersets?: boolean | undefined;
  workout: WorkoutExercise[];
  setWorkout: Dispatch<SetStateAction<WorkoutExercise[]>>;
  pickerOpen?: boolean | undefined;
  onPickerOpenChange?: ((open: boolean) => void) | undefined;
}) {
  const [sheet, setSheet] = useState<SheetState>({ kind: "closed" });
  const library = useLibrary();
  const addOpen = pickerOpen ?? sheet.kind === "add";
  const setAddOpen = (open: boolean) => { if (onPickerOpenChange) onPickerOpenChange(open); else setSheet(open ? { kind: "add" } : { kind: "closed" }); };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const update = (key: string, patch: Partial<WorkoutExercise>) => setWorkout((current) => current.map((exercise) => exercise.key === key ? { ...exercise, ...patch } : exercise));
  const replace = (key: string, alternative: Exercise) => {
    setWorkout((current) => current.map((exercise) => exercise.key === key ? { ...toWorkoutExercise(alternative), key: exercise.key, sets: exercise.sets, reps: exercise.reps, ...(exercise.supersetWith ? { supersetWith: exercise.supersetWith } : {}) } : exercise));
    setSheet({ kind: "closed" });
  };
  const unlink = (key: string) => setWorkout((current) => {
    const partner = current.find((exercise) => exercise.key === key)?.supersetWith;
    return current.map(({ supersetWith, ...exercise }) => exercise.key === key || exercise.key === partner || !supersetWith ? exercise : { ...exercise, supersetWith });
  });
  const pair = (key: string, partnerKey: string) => {
    setWorkout((current) => {
      const linked = current.map((exercise) => exercise.key === key ? { ...exercise, supersetWith: partnerKey } : exercise.key === partnerKey ? { ...exercise, supersetWith: key } : exercise);
      const partner = linked.find((exercise) => exercise.key === partnerKey)!;
      const rest = linked.filter((exercise) => exercise.key !== partnerKey);
      rest.splice(rest.findIndex((exercise) => exercise.key === key) + 1, 0, partner);
      return rest;
    });
    setSheet({ kind: "closed" });
  };
  const remove = (key: string) => setWorkout((current) => current.filter((item) => item.key !== key).map(({ supersetWith, ...item }) => supersetWith && supersetWith !== key ? { ...item, supersetWith } : item));
  const partnerOf = (exercise: WorkoutExercise) => exercise.supersetWith ? workout.find((item) => item.key === exercise.supersetWith) : undefined;
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setWorkout((current) => {
      const from = current.findIndex((exercise) => exercise.key === active.id);
      const to = current.findIndex((exercise) => exercise.key === over.id);
      return from < 0 || to < 0 ? current : arrayMove(current, from, to);
    });
  };

  return (
    <>
      {workout.length > 0 && (
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
                  onDuration={() => setSheet({ kind: "duration", key: exercise.key })}
                  onRemove={() => remove(exercise.key)}
                  onSuperset={supersets ? () => setSheet({ kind: "superset", key: exercise.key }) : undefined}
                  partnerName={partnerOf(exercise)?.name}
                  linkedAbove={!!partnerOf(exercise) && workout[index - 1]?.key === exercise.supersetWith}
                  linkedBelow={!!partnerOf(exercise) && workout[index + 1]?.key === exercise.supersetWith}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {workout.length > 0 && <Button variant="surface" className="mt-3 w-full" onClick={() => setAddOpen(true)}><Plus /> Add exercise</Button>}

      <ReplaceDrawer
        open={sheet.kind === "replace"}
        exercise={sheet.kind === "replace" ? workout.find((item) => item.key === sheet.key) : undefined}
        workout={workout}
        library={library.all}
        onOpenChange={(open) => { if (!open) setSheet({ kind: "closed" }); }}
        onSelect={(exercise) => { if (sheet.kind === "replace") replace(sheet.key, exercise); }}
      />
      {supersets && <SupersetDrawer
        exercise={sheet.kind === "superset" ? workout.find((item) => item.key === sheet.key) : undefined}
        workout={workout}
        onClose={() => setSheet({ kind: "closed" })}
        onPair={pair}
        onUnlink={(key) => { unlink(key); setSheet({ kind: "closed" }); }}
      />}
      <RepDrawer
        open={sheet.kind === "reps"}
        value={sheet.kind === "reps" ? workout.find((item) => item.key === sheet.key)?.reps : undefined}
        onOpenChange={(open) => { if (!open) setSheet({ kind: "closed" }); }}
        onSelect={(reps) => { if (sheet.kind === "reps") update(sheet.key, { reps }); setSheet({ kind: "closed" }); }}
      />
      <DurationDrawer
        open={sheet.kind === "duration"}
        value={sheet.kind === "duration" ? workout.find((item) => item.key === sheet.key)?.targetDurationSeconds : undefined}
        onOpenChange={(open) => { if (!open) setSheet({ kind: "closed" }); }}
        onSelect={(seconds) => { if (sheet.kind === "duration") update(sheet.key, { targetDurationSeconds: seconds }); setSheet({ kind: "closed" }); }}
      />
      <ExercisePicker
        open={addOpen}
        library={library.all}
        onCreateCustom={library.addCustom}
        onOpenChange={setAddOpen}
        onAdd={(picked) => { setWorkout((current) => [...current, ...picked.map(toWorkoutExercise)]); setAddOpen(false); }}
      />
    </>
  );
}

function SortableExercise({ exercise, index, onSets, onReplace, onReps, onDuration, onRemove, onSuperset, partnerName, linkedAbove, linkedBelow }: {
  onSuperset: (() => void) | undefined;
  partnerName: string | undefined;
  linkedAbove: boolean;
  linkedBelow: boolean;
  exercise: WorkoutExercise;
  index: number;
  onSets: (sets: number) => void;
  onReplace: () => void;
  onReps: () => void;
  onDuration: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.key });
  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 p-3", partnerName && "border-primary/30", isDragging && "z-10 border-primary opacity-90")}
    >
      {partnerName && <span aria-hidden className={cn("absolute left-0 w-0.5 bg-primary", linkedAbove ? "-top-2.5" : "top-3", linkedBelow ? "-bottom-2.5" : "bottom-3")} />}
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
            <p className="mt-0.5 text-[0.7rem] font-medium text-muted-foreground">{muscleLabel(exercise)} · {exercise.equipment}</p>
            {partnerName && <p className="mt-1 flex items-center gap-1 truncate text-[0.65rem] font-semibold text-primary"><Link2 className="size-3 shrink-0" />{partnerName}</p>}
          </div>
          <Button variant="ghost" size="icon" className="-mr-2 -mt-2 size-9 text-muted-foreground" aria-label={`Remove ${exercise.name}`} onClick={onRemove}><Trash2 /></Button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {!isCardioExercise(exercise) && <div className="flex h-9 items-center rounded-lg border border-border bg-secondary">
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Fewer sets for ${exercise.name}`} onClick={() => onSets(Math.max(1, exercise.sets - 1))}><Minus /></Button>
            <span className="w-12 text-center text-[0.7rem] font-bold tabular-nums">{exercise.sets} sets</span>
            <Button variant="ghost" size="icon" className="size-8" aria-label={`More sets for ${exercise.name}`} onClick={() => onSets(Math.min(10, exercise.sets + 1))}><Plus /></Button>
          </div>}
          {isCardioExercise(exercise) ? <Button variant="surface" size="sm" className="h-9 px-3 text-[0.7rem] tabular-nums" onClick={onDuration}>{Math.round((exercise.targetDurationSeconds ?? 1200) / 60)} min target</Button> : <Button variant="surface" size="sm" className="h-9 px-2.5 text-[0.7rem] tabular-nums" onClick={onReps}>{exercise.reps} reps</Button>}
          <div className="flex items-center">
            {onSuperset && <Button variant="ghost" size="icon" className={cn("size-9 text-muted-foreground", partnerName && "text-primary")} aria-label={`Superset ${exercise.name}`} onClick={onSuperset}><Link2 /></Button>}
            <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={`Replace ${exercise.name}`} onClick={onReplace}><Shuffle /></Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReplaceDrawer({ open, exercise, workout, library, onOpenChange, onSelect }: {
  open: boolean;
  exercise: WorkoutExercise | undefined;
  workout: WorkoutExercise[];
  library: Exercise[];
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: Exercise) => void;
}) {
  const alternatives = useMemo(() => {
    if (!exercise) return [];
    const unused = library.filter((item) => isCardioExercise(item) === isCardioExercise(exercise) && !workout.some((current) => current.id === item.id));
    return [...unused].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8);
  }, [exercise, workout, library]);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[72dvh] max-w-[430px] rounded-t-2xl bg-popover">
        <DrawerHeader className="pb-2 text-left"><DrawerTitle>Replace exercise</DrawerTitle></DrawerHeader>
        <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {alternatives.map((alternative) => (
            <DrawerClose asChild key={alternative.id}>
              <button type="button" className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 text-left last:border-0" onClick={() => onSelect(alternative)}>
                <ExerciseText exercise={alternative} />
                <Plus className="size-4 text-primary" />
              </button>
            </DrawerClose>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SupersetDrawer({ exercise, workout, onClose, onPair, onUnlink }: {
  exercise: WorkoutExercise | undefined;
  workout: WorkoutExercise[];
  onClose: () => void;
  onPair: (key: string, partnerKey: string) => void;
  onUnlink: (key: string) => void;
}) {
  const partner = exercise?.supersetWith ? workout.find((item) => item.key === exercise.supersetWith) : undefined;
    const options = exercise ? workout.filter((item) => item.key !== exercise.key && !item.supersetWith && !isCardioExercise(item) && !isCardioExercise(exercise)) : [];
  return (
    <Drawer open={!!exercise} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DrawerContent className="mx-auto max-h-[72dvh] max-w-[430px] rounded-t-2xl bg-popover">
        <DrawerHeader className="pb-2 text-left"><DrawerTitle>{partner ? "Superset" : "Superset with"}</DrawerTitle></DrawerHeader>
        <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {partner && exercise ? (
            <>
              <div className="flex items-center gap-2 border-b border-border py-3 text-sm font-bold"><Link2 className="size-4 shrink-0 text-primary" /><span className="min-w-0">{exercise.name} + {partner.name}</span></div>
              <Button variant="surface" className="mt-3 w-full" onClick={() => onUnlink(exercise.key)}><Unlink />Remove superset</Button>
            </>
          ) : options.length ? options.map((item) => (
            <button key={item.key} type="button" className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 text-left last:border-0" onClick={() => exercise && onPair(exercise.key, item.key)}>
              <ExerciseText exercise={item} />
              <Link2 className="size-4 text-primary" />
            </button>
          )) : <p className="py-6 text-center text-sm text-muted-foreground">No available exercises</p>}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function RepDrawer({ open, value, onOpenChange, onSelect }: { open: boolean; value: string | undefined; onOpenChange: (open: boolean) => void; onSelect: (value: string) => void }) {
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

function DurationDrawer({ open, value, onOpenChange, onSelect }: { open: boolean; value: number | undefined; onOpenChange: (open: boolean) => void; onSelect: (value: number) => void }) {
  return <Drawer open={open} onOpenChange={onOpenChange}><DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Target duration</DrawerTitle></DrawerHeader><div className="grid grid-cols-2 gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{cardioDurations.map((seconds) => <Button key={seconds} variant={value === seconds ? "choiceActive" : "choice"} className="h-11 tabular-nums" onClick={() => onSelect(seconds)}>{seconds / 60} min</Button>)}</div></DrawerContent></Drawer>;
}

function ExerciseText({ exercise, active }: { exercise: Exercise; active?: boolean }) {
  return <span className="min-w-0"><span className={cn("block truncate text-sm font-bold", active && "text-primary")}>{exercise.name}</span><span className="mt-1 block text-[0.7rem] text-muted-foreground">{muscleLabel(exercise)} · {exercise.equipment}</span></span>;
}

/** Shared multi-select exercise library with custom exercise creation. */
export function ExercisePicker({ open, library, onOpenChange, onAdd, onCreateCustom }: {
  open: boolean;
  library: Exercise[];
  onOpenChange: (open: boolean) => void;
  onAdd: (exercises: Exercise[]) => void;
  onCreateCustom: (exercise: Exercise) => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [picked, setPicked] = useState<Exercise[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [customMuscles, setCustomMuscles] = useState<Muscle[]>([]);
  const [customEquipment, setCustomEquipment] = useState<Equipment>("Dumbbell");

  useEffect(() => { if (!open) { setPicked([]); setCreating(false); setQuery(""); } }, [open]);

  const results = [...library.filter((exercise) => (!muscle || matchesMuscle(exercise, muscle)) && (!equipment || exercise.equipment === equipment) && exercise.name.toLowerCase().includes(query.toLowerCase()))].sort((a, b) => a.name.localeCompare(b.name));
  const toggle = (exercise: Exercise) => setPicked((current) => current.some((item) => item.id === exercise.id) ? current.filter((item) => item.id !== exercise.id) : [...current, exercise]);
  const createCustom = () => {
    const first = customMuscles[0];
    if (!name.trim() || !first) return;
    const exercise: Exercise = { id: `custom-${newId()}`, name: name.trim(), muscle: first, muscles: customMuscles, equipment: customEquipment, type: customMuscles.length > 1 ? "Compound" : "Isolation", custom: true };
    onCreateCustom(exercise);
    onAdd([...picked, exercise]);
    setName(""); setCustomMuscles([]);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto h-[86dvh] max-w-[430px] rounded-t-2xl bg-popover">
        <DrawerHeader className="flex-row items-center justify-between pb-2 text-left">
          <DrawerTitle>{creating ? "Custom exercise" : "Add exercise"}</DrawerTitle>
          <Button variant="ghost" size="sm" className="-mr-2 px-2 text-primary" onClick={() => setCreating((value) => !value)}>
            {creating ? "Library" : <><Plus /> Create custom exercise</>}
          </Button>
        </DrawerHeader>
        {creating ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Exercise name" enterKeyHint="done" className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary" />
            <div className="grid grid-cols-2 gap-1.5">
              {muscleGroups.map((item) => { const active = customMuscles.includes(item); return <Button key={item} variant={active ? "choiceActive" : "choice"} className="h-9 justify-between px-3" onClick={() => setCustomMuscles((current) => active ? current.filter((value) => value !== item) : [...current, item])}>{item}{active && <Check />}</Button>; })}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {equipmentTypes.map((item) => <Button key={item} variant={customEquipment === item ? "choiceActive" : "choice"} className="h-9 px-2 text-xs" onClick={() => setCustomEquipment(item)}>{item}</Button>)}
            </div>
            <Button variant="primary" size="lg" className="mt-auto w-full" disabled={!name.trim() || !customMuscles.length} onClick={createCustom}>Add to workout</Button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="relative mb-2"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises" className="h-11 w-full rounded-xl border border-border bg-secondary pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
            <FilterRow items={muscleGroups} value={muscle} onSelect={(item) => setMuscle(item === muscle ? null : item)} />
            <FilterRow items={equipmentTypes} value={equipment} onSelect={(item) => setEquipment(item === equipment ? null : item)} />
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card px-3">
              {results.map((exercise) => {
                const active = picked.some((item) => item.id === exercise.id);
                return (
                  <button key={exercise.id} type="button" aria-pressed={active} onClick={() => toggle(exercise)} className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 text-left last:border-0">
                    <ExerciseText exercise={exercise} active={active} />
                    <span className={cn("grid size-7 place-items-center rounded-full border", active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{active ? <Check className="size-3.5" strokeWidth={3} /> : <Plus className="size-3.5" />}</span>
                  </button>
                );
              })}
              {!results.length && <p className="py-8 text-center text-sm text-muted-foreground">No matches</p>}
            </div>
            <Button variant="primary" size="lg" className="mt-3 w-full" disabled={!picked.length} onClick={() => onAdd(picked)}>
              {picked.length ? `Add ${picked.length} exercise${picked.length === 1 ? "" : "s"}` : "Select exercises"}
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function FilterRow<T extends string>({ items, value, onSelect }: { items: readonly T[]; value: T | null; onSelect: (item: T) => void }) {
  return <div className="-mx-4 flex shrink-0 gap-1.5 overflow-x-auto px-4 py-1">{items.map((item) => <Button key={item} variant={value === item ? "choiceActive" : "surface"} size="sm" className="shrink-0 rounded-full" onClick={() => onSelect(item)}>{item}</Button>)}</div>;
}
