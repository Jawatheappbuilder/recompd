import {
  Check,
  GripVertical,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock3,
  Ellipsis,
  Link2,
  Minus,
  Plus,
  Search,
  History,

  Shuffle,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { equipmentTypes, exercises, isCardioExercise, isTimedHold, muscleGroups, toWorkoutExercise, type Equipment, type Exercise, type Muscle } from "@/data/exercises";
import { createActiveWorkout, type ActiveExercise, type ActiveSet, type ActiveWorkoutState } from "@/hooks/use-active-workout";
import { personalRecords, recordCompletedWorkout, toCompletedWorkout, useTrainingData } from "@/lib/training-data";
import { ShareWorkoutButton } from "./share-workout";
import { useAuth } from "./auth-context";
import { getMySharedWorkoutIds, shareWorkoutToSocial, unshareWorkoutFromSocial } from "@/lib/social";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Sheet =
  | { kind: "closed" }
  | { kind: "actions"; key: string }
  | { kind: "replace"; key: string }
  | { kind: "superset"; key: string }
  | { kind: "group"; key: string }
  | { kind: "circuit"; key: string }
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

// Previous performance comes from account history, not sample exercise values.

const cssEscape = (value: string) => (CSS as unknown as { escape: (v: string) => string }).escape(value);
const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const formatDuration = (seconds: number) => seconds < 3600 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;

export function ActiveWorkout({ workout, onChange, onCancel }: { workout: ActiveWorkoutState; onChange: (workout: ActiveWorkoutState) => void; onCancel: () => void }) {
  const trainingData = useTrainingData();
  const previousPerformance = useMemo(() => {
    const history: Record<string, string> = {};
    const workouts = [...(trainingData?.workouts ?? [])].filter((w) => w.startedAt < workout.startedAt).sort((a, b) => b.startedAt - a.startedAt);
    for (const previous of workouts) {
      for (const exercise of previous.exercises) {
        if (history[exercise.exerciseId]) continue;
        const working = exercise.sets.filter((set) => set.kind !== "cardio");
        const best = working.reduce<(typeof working)[number] | undefined>((current, set) => !current || (set.weight * set.reps) > (current.weight * current.reps) ? set : current, undefined);
        if (best) history[exercise.exerciseId] = best.weight > 0 ? `${best.weight} kg × ${best.reps}` : `${best.reps} ${isTimedHold(exercise) ? "sec" : "reps"}`;
      }
    }
    return history;
  }, [trainingData, workout.startedAt]);
  const exerciseHistory = useMemo(() => {
    const history: Record<string, Array<{ date: number; sets: Array<{ weight: number; reps: number }> }>> = {};
    const workouts = [...(trainingData?.workouts ?? [])]
      .filter((w) => w.startedAt < workout.startedAt)
      .sort((a, b) => b.startedAt - a.startedAt);
    for (const previous of workouts) {
      for (const exercise of previous.exercises) {
        if ((history[exercise.exerciseId]?.length ?? 0) >= 5) continue;
        const sets = exercise.sets
          .filter((set) => set.kind !== "cardio")
          .map((set) => ({ weight: Number(set.weight) || 0, reps: Number(set.reps) || 0 }));
        if (!sets.length) continue;
        (history[exercise.exerciseId] ??= []).push({ date: previous.startedAt, sets });
      }
    }
    return history;
  }, [trainingData, workout.startedAt]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [expandedUpcoming, setExpandedUpcoming] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>({ kind: "closed" });
  const [removeKey, setRemoveKey] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [restApply, setRestApply] = useState<{ key: string; seconds: number } | null>(null);
  const [finished, setFinished] = useState<FinishedWorkout | null>(null);
  const [rest, setRest] = useState<{ endsAt: number; expanded: boolean; duration: number } | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [circuitRun, setCircuitRun] = useState<{ id: string; phase: "countdown" | "work" | "rest"; round: number; endsAt: number } | null>(null);
  const [circuitMinimized, setCircuitMinimized] = useState(false);
  const [expandedCircuit, setExpandedCircuit] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [completedCircuits, setCompletedCircuits] = useState<string[]>([]);
  const restAudioRef = useRef<AudioContext | null>(null);
  const previousCurrentKeyRef = useRef(workout.currentKey);
  const restWasActiveRef = useRef(false);
  const reorderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (previousCurrentKeyRef.current === workout.currentKey) return;
    previousCurrentKeyRef.current = workout.currentKey;
    window.setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-workout-group-member-key="${cssEscape(workout.currentKey)}"], [data-workout-exercise-key="${cssEscape(workout.currentKey)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }, [workout.currentKey]);

  useEffect(() => {
    if (!expandedGroup) return;
    const group = workout.exerciseGroups?.find((item) => item.id === expandedGroup);
    if (!group || group.memberKeys.length !== 3) return;
    const complete = group.memberKeys.every((key) => {
      const exercise = workout.exercises.find((item) => item.key === key);
      const workingSets = exercise?.sessionSets.filter((set) => set.kind !== "warmup") ?? [];
      return workingSets.length > 0 && workingSets.every((set) => set.completed);
    });
    if (complete) setExpandedGroup(null);
  }, [expandedGroup, workout.exerciseGroups, workout.exercises]);

  const elapsed = Math.max(0, Math.floor((now - workout.startedAt) / 1000));
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sessionSets.filter((set) => set.kind !== "warmup").length, 0);
  const completedSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sessionSets.filter((set) => set.completed && set.kind !== "warmup").length, 0);
  const strengthSets = workout.exercises.reduce((sum, exercise) => sum + (isCardioExercise(exercise) ? 0 : exercise.sessionSets.filter((set) => set.completed && set.kind !== "warmup").length), 0);
  const progress = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;
  const allExercisesCompleted = workout.exercises.length > 0 && workout.exercises.every((exercise) => exercise.sessionSets.length > 0 && exercise.sessionSets.filter((set) => set.kind !== "warmup").every((set) => set.completed));
  const restRemaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (rest && restRemaining > 0) restWasActiveRef.current = true;
    if (rest && restRemaining === 0) {
      if (restWasActiveRef.current) {
        const audio = restAudioRef.current;
        if (audio && audio.state === "running") {
          // Loud double boxing-bell strike with metallic overtones and a natural ring-out.
          [0, 0.48].forEach((delay) => {
            const start = audio.currentTime + delay;
            const master = audio.createGain();
            master.gain.setValueAtTime(0.0001, start);
            master.gain.exponentialRampToValueAtTime(0.42, start + 0.008);
            master.gain.exponentialRampToValueAtTime(0.0001, start + 0.82);
            master.connect(audio.destination);
            [720, 1080, 1510, 2160].forEach((frequency, index) => {
              const oscillator = audio.createOscillator();
              const partial = audio.createGain();
              oscillator.type = index < 2 ? "triangle" : "sine";
              oscillator.frequency.setValueAtTime(frequency, start);
              oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.94, start + 0.7);
              partial.gain.value = [0.7, 0.42, 0.24, 0.12][index] ?? 0.1;
              oscillator.connect(partial);
              partial.connect(master);
              oscillator.start(start);
              oscillator.stop(start + 0.84);
            });
          });
          navigator.vibrate?.([150, 90, 150]);
        }
      }
      restWasActiveRef.current = false;
      setRest(null);
    }
  }, [rest, restRemaining]);

  const updateExercise = (key: string, updater: (exercise: ActiveExercise) => ActiveExercise) => {
    onChange({ ...workout, exercises: workout.exercises.map((exercise) => exercise.key === key ? updater(exercise) : exercise) });
  };

  const updateSet = (exerciseKey: string, setId: string, patch: Partial<ActiveSet>, propagateWeight = false, propagateReps = false) => {
    updateExercise(exerciseKey, (exercise) => {
      const index = exercise.sessionSets.findIndex((set) => set.id === setId);
      const editedSet = exercise.sessionSets[index];
      const allowRepPropagation = editedSet?.kind !== "warmup";
      const sessionSets = exercise.sessionSets.map((set, setIndex) => {
        if (set.id === setId) return { ...set, ...patch };
        if (propagateWeight && setIndex > index && !set.completed && !set.weightEdited) return { ...set, weight: String(patch.weight ?? set.weight) };
        if (propagateReps && allowRepPropagation && setIndex > index && !set.completed && set.kind !== "warmup") return { ...set, reps: String(patch.reps ?? set.reps) };
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
    const completedExercise = updatedExercise?.sessionSets.filter((row) => row.kind !== "warmup").every((row) => row.completed) ?? false;
    let currentKey = workout.currentKey;
    const hasMoreSetsHere = updatedExercise ? !updatedExercise.sessionSets.filter((row) => row.kind !== "warmup").every((row) => row.completed) : false;
    let shouldRest = nextCompleted && !isCardioExercise(exercise) && hasMoreSetsHere;
    const exerciseGroup = exercise.groupId ? workout.exerciseGroups?.find((group) => group.id === exercise.groupId) : undefined;
    if (exerciseGroup && nextCompleted) {
      shouldRest = false;
      const members = exerciseGroup.memberKeys.map((key) => nextExercises.find((item) => item.key === key)).filter(Boolean) as ActiveExercise[];
      const memberIndex = members.findIndex((item) => item.key === exercise.key);
      const completedHere = updatedExercise?.sessionSets.filter((row) => row.completed && row.kind !== "warmup").length ?? 0;
      const nextMember = members.slice(memberIndex + 1).find((item) => item.sessionSets.filter((row) => row.completed && row.kind !== "warmup").length < completedHere);
      if (nextMember) currentKey = nextMember.key;
      else if (memberIndex === members.length - 1) {
        const groupComplete = members.every((item) => item.sessionSets.filter((row) => row.kind !== "warmup").every((row) => row.completed));
        shouldRest = !groupComplete;
        const firstPending = members.find((item) => !item.sessionSets.filter((row) => row.kind !== "warmup").every((row) => row.completed));
        if (firstPending) currentKey = firstPending.key;
      }
    }
    const partner = exercise.supersetWith ? nextExercises.find((item) => item.key === exercise.supersetWith) : undefined;

    if (nextCompleted && updatedExercise && partner && !partner.sessionSets.filter((row) => row.kind !== "warmup").every((row) => row.completed)) {
      const completedHere = updatedExercise.sessionSets.filter((row) => row.completed && row.kind !== "warmup").length;
      const completedThere = partner.sessionSets.filter((row) => row.completed && row.kind !== "warmup").length;
      if (completedThere < completedHere) {
        currentKey = partner.key;
        shouldRest = false;
      } else if (!completedExercise) {
        currentKey = partner.key;
      }
    }

    if (completedExercise && currentKey === exercise.key) {
      currentKey = partner && !partner.sessionSets.filter((row) => row.kind !== "warmup").every((row) => row.completed)
        ? partner.key
        : [...nextExercises.slice(nextExercises.findIndex((item) => item.key === exercise.key) + 1), ...nextExercises.slice(0, nextExercises.findIndex((item) => item.key === exercise.key))].find((item) => !item.sessionSets.filter((row) => row.kind !== "warmup").every((row) => row.completed))?.key ?? exercise.key;
    }
    onChange({ ...workout, exercises: nextExercises, currentKey });
    setExpandedUpcoming(null);
    if (shouldRest) {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const audio = restAudioRef.current ?? new AudioContextClass();
        restAudioRef.current = audio;
        if (audio.state === "suspended") void audio.resume();
      }
      window.setTimeout(() => setRest({ endsAt: Date.now() + (exerciseGroup?.restSeconds ?? exercise.restSeconds) * 1000, expanded: true, duration: exerciseGroup?.restSeconds ?? exercise.restSeconds }), 650);
    }
  };

  const startExercise = (key: string) => {
    const completed = workout.exercises.filter((exercise) => exercise.sessionSets.filter((set) => set.kind !== "warmup").every((set) => set.completed));
    const selected = workout.exercises.find((exercise) => exercise.key === key);
    if (!selected) return;
    const remaining = workout.exercises.filter((exercise) => exercise.key !== key && !exercise.sessionSets.filter((set) => set.kind !== "warmup").every((set) => set.completed));
    onChange({ ...workout, currentKey: key, exercises: [...completed, selected, ...remaining] });
    setExpandedUpcoming(null);
  };

  const replaceExercise = (key: string, alternative: Exercise) => {
    const current = workout.exercises.find((exercise) => exercise.key === key);
    if (current) rememberReplacement(current.id, alternative.id);
    updateExercise(key, (exercise) => ({ ...exercise, ...alternative, key: exercise.key }));
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
    const currentKey = workout.currentKey === removeKey ? remaining.find((exercise) => !exercise.sessionSets.filter((set) => set.kind !== "warmup").every((set) => set.completed))?.key ?? remaining[0]?.key ?? "" : workout.currentKey;
    onChange({ ...workout, currentKey, exercises: remaining });
    setRemoveKey(null);
  };

  const reorderExercises = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = workout.exercises.findIndex((exercise) => exercise.key === active.id);
    const to = workout.exercises.findIndex((exercise) => exercise.key === over.id);
    if (from < 0 || to < 0) return;
    const currentIndex = workout.exercises.findIndex((exercise) => exercise.key === workout.currentKey);
    const moved = arrayMove(workout.exercises, from, to);
    // Only switch focus when the dragged exercise takes the current exercise's slot.
    // Reordering future exercises must not interrupt the set in progress.
    const replacingCurrent = to === currentIndex && from !== currentIndex;
    onChange({ ...workout, exercises: moved, currentKey: replacingCurrent ? String(active.id) : workout.currentKey });
    setExpandedUpcoming(null);
  };

  const finishWorkout = () => {
    const result: FinishedWorkout = {
      workout,
      duration: elapsed,
      completedExercises: workout.exercises.filter((exercise) => exercise.sessionSets.filter((set) => set.kind !== "warmup").every((set) => set.completed)).length,
      totalSets: strengthSets,
      volume: workout.exercises.reduce((total, exercise) => total + exercise.sessionSets.filter((set) => set.completed && set.kind !== "warmup").reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0), 0),
    };
    localStorage.setItem("recomp-last-workout", JSON.stringify(result));
    recordCompletedWorkout(workout, elapsed);
    localStorage.removeItem("recomp-active-workout-v1");
    setFinished(result);
    setFinishOpen(false);
  };

  if (finished) return <WorkoutSummary result={finished} />;

  if (circuitRun && !circuitMinimized) {
    const circuit = workout.circuits?.find((item) => item.id === circuitRun.id);
    const members = workout.exercises.filter((exercise) => exercise.circuitId === circuitRun.id);
    if (circuit) return <CircuitMode circuit={circuit} members={members} run={circuitRun} now={now} onRun={setCircuitRun} onExit={() => { setCircuitRun(null); setCircuitMinimized(false); }} onComplete={() => { setCompletedCircuits((ids) => ids.includes(circuit.id) ? ids : [...ids, circuit.id]); setCircuitRun(null); setCircuitMinimized(false); }} onMinimize={() => setCircuitMinimized(true)} />;
  }

  return (
    <>
      <WorkoutHeader name={workout.name} elapsed={elapsed} progress={progress} completedSets={completedSets} totalSets={totalSets} mixedTracking={workout.exercises.some(isCardioExercise)} onFinish={() => completedSets < totalSets ? setFinishOpen(true) : finishWorkout()} />
      {circuitRun && circuitMinimized && (() => { const circuit = workout.circuits?.find((item) => item.id === circuitRun.id); const remaining = Math.max(0, Math.ceil((circuitRun.endsAt - now) / 1000)); return circuit ? <button type="button" onClick={() => setCircuitMinimized(false)} className="sticky top-0 z-40 mt-2 w-full rounded-xl border border-primary/20 bg-card px-3 py-2 text-left shadow-sm"><span className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10"><Clock3 className="size-4 text-primary"/></span><span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-3"><span className="text-[0.68rem] font-black uppercase tracking-wider text-primary">{circuitRun.phase === "rest" ? "Rest" : "Circuit"}</span><span className="text-lg font-black tabular-nums">{formatClock(remaining)}</span></span><span className="mt-0.5 flex justify-between text-[0.68rem] font-semibold text-muted-foreground"><span>Round {circuitRun.round} of {circuit.rounds}</span><span>Tap to resume</span></span></span></span></button> : null; })()}
      {rest && !rest.expanded && restRemaining > 0 && <MinimizedRestTimer seconds={restRemaining} onExpand={() => setRest({ ...rest, expanded: true })} onAdjust={(amount) => setRest({ ...rest, endsAt: rest.endsAt + amount * 1000, duration: Math.max(1, rest.duration + amount) })} onSkip={() => setRest(null)} />}
      <DndContext sensors={reorderSensors} collisionDetection={closestCenter} onDragStart={({ active }) => setDraggingKey(String(active.id))} onDragCancel={() => setDraggingKey(null)} onDragEnd={(event) => { reorderExercises(event); setDraggingKey(null); }}>
        <SortableContext items={workout.exercises.map((exercise) => exercise.key)} strategy={verticalListSortingStrategy}>
          <div className="mt-3 space-y-2">
            {workout.exercises.map((exercise, exerciseIndex) => {
              if (exercise.groupId) {
                const group = workout.exerciseGroups?.find((item) => item.id === exercise.groupId);
                const firstMember = group ? workout.exercises.find((item) => group.memberKeys.includes(item.key)) : undefined;
                if (group && firstMember?.key !== exercise.key) return null;
                if (group) {
                  const members = group.memberKeys.map((key) => workout.exercises.find((item) => item.key === key)).filter(Boolean) as ActiveExercise[];
                  return <div key={group.id}><SortableActiveExercise exercise={exercise} index={exerciseIndex}><ExerciseGroupCard group={group} members={members} expanded={expandedGroup === group.id} onToggle={() => setExpandedGroup((id) => id === group.id ? null : group.id)} onSetChange={updateSet} onToggleSet={toggleSet} onActions={() => setSheet({ kind:"actions", key:exercise.key })}/></SortableActiveExercise></div>;
                }
              }
              if (exercise.circuitId) {
                const firstMember = workout.exercises.find((item) => item.circuitId === exercise.circuitId);
                if (firstMember?.key !== exercise.key) return null;
                const circuit = workout.circuits?.find((item) => item.id === exercise.circuitId);
                const members = workout.exercises.filter((item) => item.circuitId === exercise.circuitId);
                if (circuit) return <SortableActiveExercise key={circuit.id} exercise={exercise} index={exerciseIndex}><CircuitWorkoutCard circuit={circuit} members={members} expanded={expandedCircuit === circuit.id} run={circuitRun?.id === circuit.id ? circuitRun : null} now={now} onToggle={() => setExpandedCircuit((id) => id === circuit.id ? null : circuit.id)} onStart={() => { setCircuitRun({ id:circuit.id, phase:"countdown", round:1, endsAt:Date.now()+3000 }); setCircuitMinimized(false); }} onResume={() => setCircuitMinimized(false)} onActions={() => setSheet({ kind:"actions", key:exercise.key })} completed={completedCircuits.includes(circuit.id)}/></SortableActiveExercise>;
              }
              const completed = exercise.sessionSets.filter((set) => set.kind !== "warmup").every((set) => set.completed);
              const current = exercise.key === workout.currentKey && !completed;
              const expanded = current || expandedUpcoming === exercise.key;
              return <div key={exercise.key} data-workout-exercise-key={exercise.key}><SortableActiveExercise exercise={exercise} index={exerciseIndex}><ExerciseCard
                exercise={exercise}
                current={current}
                completed={completed}
                expanded={expanded}
                pairedName={workout.exercises.find((item) => item.key === exercise.supersetWith)?.name}
                previous={previousPerformance[exercise.id]}
                recentHistory={exerciseHistory[exercise.id] ?? []}
                onToggle={() => { if (!current) setExpandedUpcoming((value) => value === exercise.key ? null : exercise.key); }}
                onStart={() => startExercise(exercise.key)}
                onSetChange={(setId, patch, propagate, propagateReps) => updateSet(exercise.key, setId, patch, propagate, propagateReps)}
                onToggleSet={(set) => toggleSet(exercise, set)}
                onAddSet={() => updateExercise(exercise.key, (item) => ({ ...item, sessionSets: [...item.sessionSets, { id: `${item.key}-set-${Date.now()}`, weight: item.sessionSets.filter((set) => set.kind !== "warmup").at(-1)?.weight ?? "", reps: item.sessionSets.filter((set) => set.kind !== "warmup").at(-1)?.reps ?? "10", completed: false, weightEdited: false }] }))}
                onAddWarmup={() => updateExercise(exercise.key, (item) => { const firstWorking = item.sessionSets.findIndex((set) => set.kind !== "warmup"); const insertAt = firstWorking < 0 ? item.sessionSets.length : firstWorking; const warmups = item.sessionSets.filter((set) => set.kind === "warmup"); const next: ActiveSet = { id: `${item.key}-warmup-${Date.now()}`, weight: warmups.at(-1)?.weight ?? "", reps: warmups.at(-1)?.reps ?? "10", completed: false, weightEdited: false, kind: "warmup" }; return { ...item, sessionSets: [...item.sessionSets.slice(0, insertAt), next, ...item.sessionSets.slice(insertAt)] }; })}
                onRemoveSet={(setId) => updateExercise(exercise.key, (item) => item.sessionSets.length <= 1 ? item : ({ ...item, sessionSets: item.sessionSets.filter((set) => set.id !== setId || set.completed) }))}
                onRest={() => setSheet({ kind: "rest", key: exercise.key })}
                onActions={() => setSheet({ kind: "actions", key: exercise.key })}
                circuit={workout.circuits?.find((item) => item.id === exercise.circuitId)}
                onStartCircuit={exercise.circuitId ? () => setCircuitRun({ id: exercise.circuitId!, phase: "countdown", round: 1, endsAt: Date.now() + 3000 }) : undefined}
              /></SortableActiveExercise></div>;
            })}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
          {draggingKey && (() => {
            const dragged = workout.exercises.find((exercise) => exercise.key === draggingKey);
            if (!dragged) return null;
            const draggedWorking = dragged.sessionSets.filter((set) => set.kind !== "warmup");
            const done = draggedWorking.filter((set) => set.completed).length;
            return <Card className="w-[calc(100vw-2rem)] max-w-[398px] border-primary/35 bg-card px-3 py-3 shadow-xl">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
                <GripVertical className="size-4 text-muted-foreground" />
                <div className="min-w-0"><div className="truncate text-sm font-extrabold">{dragged.name}</div><div className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">{dragged.muscle} · {dragged.equipment}</div></div>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">{done}/{draggedWorking.length}</span>
              </div>
            </Card>;
          })()}
        </DragOverlay>
      </DndContext>
      {allExercisesCompleted && <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/[0.08] p-3">
        <div className="mb-2 px-1"><p className="text-sm font-extrabold">Workout complete</p><p className="mt-0.5 text-[0.7rem] text-muted-foreground">All exercises are done. Finish to save your workout.</p></div>
        <Button className="h-14 w-full bg-primary text-base font-extrabold text-primary-foreground shadow-sm hover:bg-primary/90" onClick={finishWorkout}><CircleCheck className="size-5" /> Finish workout</Button>
      </div>}
      <Button variant="surface" className="mt-3 w-full" onClick={() => setSheet({ kind: "add" })}><Plus /> Add exercise</Button>
      <Button variant="surface" className="mt-2 w-full" onClick={() => setSheet({ kind: "addCardio" })}><Plus /> Add cardio</Button>
      <Button variant="ghost" size="sm" className="mt-2 w-full text-muted-foreground hover:text-destructive" onClick={() => setCancelOpen(true)}>Cancel workout</Button>
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl bg-popover">
          <AlertDialogHeader><AlertDialogTitle>Cancel workout?</AlertDialogTitle><AlertDialogDescription>Your progress from this workout will be discarded.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep Workout</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setRest(null); setSheet({ kind: "closed" }); setCancelOpen(false); onCancel(); }}>Cancel Workout</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {rest && rest.expanded && restRemaining > 0 && <RestTimer seconds={restRemaining} duration={rest.duration} onMinimize={() => setRest({ ...rest, expanded: false })} onAdjust={(amount) => setRest({ ...rest, endsAt: rest.endsAt + amount * 1000 })} onSkip={() => setRest(null)} />}
      <ExerciseActionsSheet sheet={sheet} workout={workout} onClose={() => setSheet({ kind: "closed" })} onShowReplace={(key) => setSheet({ kind: "replace", key })} onShowSuperset={(key) => setSheet({ kind: "superset", key })} onShowGroup={(key) => setSheet({ kind: "group", key })} onShowCircuit={(key) => setSheet({ kind: "circuit", key })} onReplace={replaceExercise} onPair={pairSuperset} onCreateGroup={(memberKeys, restSeconds) => { const id=`group-${Date.now()}`; onChange({ ...workout, exerciseGroups:[...(workout.exerciseGroups ?? []),{id,memberKeys,restSeconds}], exercises:workout.exercises.map((e)=>memberKeys.includes(e.key)?{...e,groupId:id,supersetWith:undefined}:e) }); setSheet({kind:"closed"}); }} onCreateCircuit={(key, memberKeys, workSeconds, restSeconds, rounds, reps) => { const id = `circuit-${Date.now()}`; onChange({ ...workout, circuits: [...(workout.circuits ?? []), { id, workSeconds, restSeconds, rounds, reps }], exercises: workout.exercises.map((exercise) => memberKeys.includes(exercise.key) ? { ...exercise, circuitId: id } : exercise) }); setSheet({ kind: "closed" }); }} onRemoveGroup={(key) => { const groupId=workout.exercises.find((exercise)=>exercise.key===key)?.groupId; if(!groupId)return; onChange({ ...workout, exerciseGroups:(workout.exerciseGroups??[]).filter((g)=>g.id!==groupId), exercises:workout.exercises.map((e)=>e.groupId===groupId?{...e,groupId:undefined}:e) }); setSheet({kind:"closed"}); }} onRemoveCircuit={(key) => { const circuitId = workout.exercises.find((exercise) => exercise.key === key)?.circuitId; if (!circuitId) return; onChange({ ...workout, circuits: (workout.circuits ?? []).filter((item) => item.id !== circuitId), exercises: workout.exercises.map((exercise) => exercise.circuitId === circuitId ? { ...exercise, circuitId: undefined } : exercise) }); setSheet({ kind: "closed" }); }} onRemovePair={removeSuperset} onRemove={(key) => { setSheet({ kind: "closed" }); setRemoveKey(key); }} onRest={(key, seconds) => { updateExercise(key, (exercise) => ({ ...exercise, restSeconds: seconds })); setSheet({ kind: "closed" }); setRestApply({ key, seconds }); }} onAdd={(exercise) => {
        const base = toWorkoutExercise(exercise);
        const active = createActiveWorkout([base])?.exercises[0];
        if (active) onChange({ ...workout, exercises: [...workout.exercises, active] });
        setSheet({ kind: "closed" });
      }} />
      <AlertDialog open={Boolean(restApply)} onOpenChange={(open) => { if (!open) setRestApply(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl bg-popover">
          <AlertDialogHeader><AlertDialogTitle>Use this rest time for all exercises?</AlertDialogTitle><AlertDialogDescription>Apply {restApply?.seconds ?? 0} seconds to the other strength exercises in this workout?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setRestApply(null)}>Just this exercise</AlertDialogCancel><AlertDialogAction onClick={() => { if (!restApply) return; onChange({ ...workout, exercises: workout.exercises.map((exercise) => isCardioExercise(exercise) ? exercise : { ...exercise, restSeconds: restApply.seconds }) }); setRestApply(null); }}>Apply to all</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
            <AlertDialog open={Boolean(removeKey)} onOpenChange={(open) => { if (!open) setRemoveKey(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl bg-popover">
          <AlertDialogHeader><AlertDialogTitle>Remove exercise?</AlertDialogTitle><AlertDialogDescription>Entered sets for this exercise will be removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={removeExercise}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <style>{`
        @keyframes workoutCardEnter { 0% { opacity: 0; transform: translateY(28px) scale(.97); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes nextSetAttention { 0% { transform: scale(1); } 35% { transform: scale(1.025); box-shadow: 0 0 0 5px hsl(var(--primary) / .12); } 100% { transform: scale(1); box-shadow: 0 0 0 0 hsl(var(--primary) / 0); } }\n        .next-set-attention { animation: nextSetAttention 650ms cubic-bezier(.16,1,.3,1); }\n        @keyframes checkPop { 0% { transform: scale(.45); } 55% { transform: scale(1.28); } 100% { transform: scale(1); } }
        @keyframes setSuccessPulse { 0% { background-color: var(--color-card); } 30% { background-color: rgba(34,197,94,.24); transform: scale(1.018); } 100% { background-color: var(--color-accent); transform: scale(1); } }
        .workout-card-enter { animation: workoutCardEnter 650ms cubic-bezier(.16,1,.3,1) both; }
        .check-pop { animation: checkPop 480ms cubic-bezier(.16,1,.3,1); }
        .set-success-pulse { animation: setSuccessPulse 760ms ease-out; }
        @media (prefers-reduced-motion: reduce) { .workout-card-enter, .next-set-attention, .check-pop, .set-success-pulse { animation: none !important; } }
      `}</style>
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
  return <header className="sticky top-0 z-20 -mx-4 bg-primary px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-primary-foreground">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h1 className="text-lg font-extrabold leading-tight">{name}</h1><div className="mt-1 flex items-center gap-2 text-[0.7rem] font-semibold text-primary-foreground/80"><span className="flex items-center gap-1 tabular-nums"><Clock3 className="size-3.5" />{formatClock(elapsed)}</span><span>{completedSets}/{totalSets} {mixedTracking ? "completed" : "sets"}</span></div></div><Button variant="surface" size="sm" className="shrink-0 border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15" onClick={onFinish}>Finish workout</Button></div>
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-primary-foreground/25"><div className="h-full bg-primary-foreground transition-[width]" style={{ width: `${progress}%` }} /></div>
  </header>;
}

function SortableActiveExercise({ exercise, index, children }: { exercise: ActiveExercise; index: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.key });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("relative", isDragging && "opacity-25")} >
    <button type="button" aria-label={`Reorder ${exercise.name}, position ${index + 1}`} className="absolute left-1 top-2 z-10 grid size-10 touch-none place-items-center rounded-lg text-muted-foreground/70 focus-visible:outline-none focus-visible:text-primary" {...attributes} {...listeners}>
      <GripVertical className="size-4" />
    </button>
    {children}
  </div>;
}

function ExerciseCard({ exercise, current, completed, expanded, pairedName, previous, recentHistory, onToggle, onStart, onSetChange, onToggleSet, onAddSet, onAddWarmup, onRemoveSet, onRest, onActions, circuit, onStartCircuit }: {
  exercise: ActiveExercise; current: boolean; completed: boolean; expanded: boolean; pairedName: string | undefined; previous?: string | undefined; recentHistory: Array<{ date: number; sets: Array<{ weight: number; reps: number }> }>;
  onToggle: () => void; onStart: () => void; onSetChange: (setId: string, patch: Partial<ActiveSet>, propagateWeight?: boolean, propagateReps?: boolean) => void; onToggleSet: (set: ActiveSet) => void; onAddSet: () => void; onAddWarmup: () => void; onRemoveSet: (setId: string) => void; onRest: () => void; onActions: () => void; circuit?: { id: string; workSeconds: number; restSeconds: number; rounds: number; reps?: Record<string, number> } | undefined; onStartCircuit?: (() => void) | undefined;
}) {
  const workingSets = exercise.sessionSets.filter((set) => set.kind !== "warmup");
  const warmupSets = exercise.sessionSets.filter((set) => set.kind === "warmup");
  const done = workingSets.filter((set) => set.completed).length;
  const workingStarted = workingSets.some((set) => set.completed);
  const [historyOpen, setHistoryOpen] = useState(false);
  const activeWorkingIndex = workingSets.findIndex((set) => !set.completed);
  const allHistoricalSets = recentHistory.flatMap((session) => session.sets);
  const bestHistorical = allHistoricalSets.reduce<{ weight: number; reps: number } | null>((best, set) => {
    if (!best) return set;
    const score = set.weight > 0 ? set.weight * set.reps : set.reps;
    const bestScore = best.weight > 0 ? best.weight * best.reps : best.reps;
    return score > bestScore ? set : best;
  }, null);
  const formatHistoricalSet = (set: { weight: number; reps: number }) => set.weight > 0 ? `${set.weight} kg × ${set.reps}` : `${set.reps} reps`;
  return <Card className={cn("relative overflow-hidden border p-0 transition-colors", current && "border-primary/35", completed && "border-emerald-500/25 bg-emerald-500/[0.08] dark:border-emerald-400/20 dark:bg-emerald-400/[0.08]")}>{exercise.supersetWith && <div className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
    <button type="button" className={cn("grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3 pl-11 pr-3 text-left transition-colors", current && "bg-primary/[0.16] dark:bg-primary/[0.20]")} onClick={onToggle}>
      <span className="min-w-0"><span className={cn("block text-sm font-extrabold leading-snug", completed && "text-emerald-700 dark:text-emerald-400")}>{exercise.name}</span><span className="mt-1 block text-[0.68rem] font-medium text-muted-foreground">{isCardioExercise(exercise) ? "Cardio" : exercise.muscle} · {exercise.equipment}</span>{pairedName && <span className="mt-1 flex items-center gap-1 text-[0.65rem] font-semibold text-primary"><Link2 className="size-3" />{pairedName}</span>}</span>
      <span className="flex items-center gap-2"><span className="text-xs font-bold tabular-nums text-muted-foreground">{done}/{workingSets.length}</span>{!current && (expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />)}</span>
    </button>
    {circuit && <div className="flex items-center justify-between border-t border-primary/20 bg-primary/[0.06] px-3 py-2 text-xs"><span className="font-bold">Circuit · {formatClock(circuit.workSeconds)} × {circuit.rounds} rounds</span>{onStartCircuit && <Button size="sm" onClick={onStartCircuit}>Start circuit</Button>}</div>}
    {expanded && <div className="border-t border-border px-3 pb-3 pt-2">
      {isCardioExercise(exercise) ? <CardioFields exercise={exercise} set={exercise.sessionSets[0]} onChange={(patch) => { const first = exercise.sessionSets[0]; if (first) onSetChange(first.id, patch); }} onToggle={() => { const first = exercise.sessionSets[0]; if (first) onToggleSet(first); }} /> : <>
        <div className="mb-2 flex items-center justify-between gap-2">
          {previous ? <p className="rounded-full border border-primary/10 bg-primary/[0.07] px-2.5 py-1.5 text-[0.68rem] font-semibold text-muted-foreground dark:bg-primary/[0.10]">Last best: <span className="font-extrabold text-foreground">{previous}</span></p> : <span />}
          {recentHistory.length > 0 && <button type="button" onClick={() => setHistoryOpen((open) => !open)} className="flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[0.68rem] font-extrabold text-primary hover:bg-primary/[0.08]" aria-expanded={historyOpen}><History className="size-3.5" />{historyOpen ? "Hide history" : "History"}</button>}
        </div>
        {historyOpen && recentHistory.length > 0 && <div className="mb-3 overflow-hidden rounded-xl border border-border bg-secondary/35">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[0.65rem] font-black uppercase tracking-wide text-muted-foreground">Recent sessions</span>
            {bestHistorical && <span className="text-[0.65rem] font-bold text-primary">Best · {formatHistoricalSet(bestHistorical)}</span>}
          </div>
          <div className="divide-y divide-border">
            {recentHistory.map((session, sessionIndex) => {
              const matchingSet = activeWorkingIndex >= 0 ? session.sets[activeWorkingIndex] : undefined;
              const date = new Date(session.date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
              return <div key={session.date} className="px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[0.68rem] font-bold text-muted-foreground">{sessionIndex === 0 ? "Last time" : date}</span>
                  {matchingSet && <span className="rounded-md bg-primary/[0.10] px-2 py-1 text-[0.68rem] font-extrabold tabular-nums text-primary">Set {activeWorkingIndex + 1} · {formatHistoricalSet(matchingSet)}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.65rem] font-semibold text-muted-foreground">
                  <span className="font-bold">All sets:</span>
                  {session.sets.map((set, index) => <span key={index} className="inline-flex items-center gap-1.5"><span>{formatHistoricalSet(set)}</span>{index < session.sets.length - 1 && <span aria-hidden="true" className="text-muted-foreground/50">·</span>}</span>)}
                </div>
              </div>;
            })}
          </div>
        </div>}
        <div className="mb-1 grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2 px-1 text-[0.6rem] font-bold uppercase text-muted-foreground"><span>Set</span><span className="text-center">kg</span><span className="text-center">{isTimedHold(exercise) ? "sec" : "reps"}</span><span /></div>
        <div className="space-y-1">{warmupSets.length > 0 && workingStarted && <div className="mb-1 rounded-lg bg-secondary/60 px-2 py-2 text-[0.68rem] font-bold text-muted-foreground">✓ {warmupSets.filter((set) => set.completed).length} of {warmupSets.length} warm-up sets</div>}{exercise.sessionSets.map((set) => { const isWarmup = set.kind === "warmup"; const warmupIndex = warmupSets.findIndex((row) => row.id === set.id); const workingIndex = workingSets.findIndex((row) => row.id === set.id); if (isWarmup && workingStarted) return null; return <SetRow key={set.id} set={set} number={isWarmup ? `W${warmupIndex + 1}` : workingIndex + 1} active={current && set.id === exercise.sessionSets.find((row) => !row.completed)?.id} timed={isTimedHold(exercise)} canRemove={!isWarmup && workingSets.length > 1} onChange={(patch, propagateWeight, propagateReps) => onSetChange(set.id, patch, propagateWeight, propagateReps)} onToggle={() => onToggleSet(set)} onRemove={() => onRemoveSet(set.id)} />; })}</div>
        <div className="mt-2 flex items-center justify-between gap-2"><div className="flex items-center gap-1"><Button variant="ghost" size="sm" className="px-1.5 text-muted-foreground" onClick={onAddSet}><Plus /> Add set</Button><Button variant="ghost" size="sm" className="px-1.5 text-muted-foreground" onClick={onAddWarmup}><Plus /> Warm-up</Button></div><Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={`Actions for ${exercise.name}`} onClick={onActions}><Ellipsis /></Button></div>
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

function SetRow({ set, number, active, timed = false, attention = false, canRemove, onChange, onToggle, onRemove }: { set: ActiveSet; number: number | string; active: boolean; timed?: boolean; attention?: boolean; canRemove: boolean; onChange: (patch: Partial<ActiveSet>, propagate?: boolean, propagateReps?: boolean) => void; onToggle: () => void; onRemove: () => void }) {
  const [cleared, setCleared] = useState<{ field: "weight" | "reps"; previous: string } | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const attentionSeen = useRef(false);
  const deleteWidth = 72;
  useEffect(() => { if (attention && !attentionSeen.current) { attentionSeen.current = true; window.setTimeout(() => rowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80); } if (!attention) attentionSeen.current = false; }, [attention]);
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
      else onChange({ reps: cleared.previous }, false, true);
    }
  };
  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!canRemove || set.completed) return;
    const touch = event.touches[0]; if (!touch) return;
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setDragging(false);
  };
  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart || !canRemove || set.completed) return;
    const touch = event.touches[0]; if (!touch) return;
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
  return <div ref={rowRef} className={cn("relative overflow-hidden rounded-lg", attention && "next-set-attention")}>
    {canRemove && !set.completed && swipeX < -8 && <button type="button" aria-label={`Delete set ${number}`} onClick={() => { setSwipeX(0); onRemove(); }} className="absolute inset-y-0 right-0 flex w-[72px] items-center justify-center bg-destructive text-xs font-extrabold text-destructive-foreground"><Trash2 className="mr-1 size-4" />Delete</button>}
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { setTouchStart(null); setDragging(false); setSwipeX(0); }}
      className={cn("relative grid min-h-11 grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1.25fr)_2.5rem] items-center gap-2 rounded-lg bg-card px-1 transition-[transform,box-shadow,background-color,border-color] duration-300 ease-out", active && !dragging && "z-[1] border border-primary/30 bg-primary/[0.07] shadow-[0_8px_22px_rgba(0,0,0,0.12)] dark:bg-primary/[0.10] dark:shadow-[0_10px_24px_rgba(0,0,0,0.28)]", set.completed && "border border-emerald-500/25 bg-emerald-500/[0.12] set-success-pulse dark:border-emerald-400/20 dark:bg-emerald-400/[0.12]", set.kind === "warmup" && !set.completed && "bg-secondary/45 opacity-90", !dragging && "duration-200 ease-out")}
      style={{ transform: `translateX(${swipeX}px)`, touchAction: "pan-y" }}
    >
      <span className={cn("text-center text-xs font-bold transition-colors", active ? "text-primary" : "text-muted-foreground")}>{number}</span>
      <input inputMode="decimal" aria-label={`Weight for set ${number}`} value={cleared?.field === "weight" ? "" : set.weight} placeholder="—" onFocus={() => focusField("weight")} onBlur={blurField} onChange={(event) => { setCleared(null); onChange({ weight: event.target.value, weightEdited: true }, true); }} className="h-9 min-w-0 rounded-lg border border-border bg-secondary px-2 text-center text-sm font-bold tabular-nums outline-none focus:border-primary" />
      <div className="grid grid-cols-[2rem_minmax(2rem,1fr)_2rem] items-center"><button type="button" aria-label={`Decrease ${timed ? "seconds" : "reps"} for set ${number}`} onClick={() => onChange({ reps: String(Math.max(0, (Number(set.reps) || 0) - 1)) }, false, true)} className="grid size-9 place-items-center text-muted-foreground"><Minus className="size-3.5" /></button><input inputMode="numeric" aria-label={`${timed ? "Seconds" : "Reps"} for set ${number}`} value={cleared?.field === "reps" ? "" : set.reps} onFocus={() => focusField("reps")} onBlur={blurField} onChange={(event) => { setCleared(null); onChange({ reps: event.target.value }, false, true); }} className="h-9 min-w-0 bg-transparent text-center text-sm font-bold tabular-nums outline-none" /><button type="button" aria-label={`Increase ${timed ? "seconds" : "reps"} for set ${number}`} onClick={() => onChange({ reps: String((Number(set.reps) || 0) + 1) }, false, true)} className="grid size-9 place-items-center text-muted-foreground"><Plus className="size-3.5" /></button></div>
      <button type="button" aria-label={`${set.completed ? "Reopen" : "Complete"} set ${number}`} onClick={onToggle} className={cn("grid size-9 place-items-center rounded-full border transition-all duration-300", set.completed ? "border-emerald-600 bg-emerald-600 text-white check-pop dark:border-emerald-500 dark:bg-emerald-500" : "border-border text-muted-foreground")}><span className={cn("block text-lg font-black leading-none transition-all duration-200", set.completed ? "scale-100 opacity-100" : "scale-75 opacity-25")} aria-hidden="true">✓</span></button>
    </div>
  </div>;
}

function RestTimer({ seconds, duration, onMinimize, onAdjust, onSkip }: { seconds: number; duration: number; onMinimize: () => void; onAdjust: (seconds: number) => void; onSkip: () => void }) {
  const segments = 60;
  const active = Math.ceil(segments * Math.min(1, seconds / Math.max(1, duration)));
  return <div role="dialog" aria-label="Rest timer" className="fixed inset-0 z-[60] mx-auto flex max-w-[430px] -translate-y-12 flex-col items-center justify-center bg-background/95 px-5 backdrop-blur-xl" onClick={onMinimize}>
    <button type="button" aria-label="Minimize rest timer" className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] grid size-11 place-items-center text-muted-foreground"><ChevronDown /></button>
    <div className="relative size-64" onClick={(event) => event.stopPropagation()}>
      <div aria-hidden className="pointer-events-none absolute inset-6 rounded-full bg-primary/[0.06] blur-2xl" />
      <svg viewBox="0 0 200 200" aria-hidden="true" className={cn("relative size-full", seconds <= 10 && "motion-safe:animate-pulse")}>
        {Array.from({ length: segments }, (_, i) => <line key={i} x1="100" y1="9" x2="100" y2="21" transform={`rotate(${i * 360 / segments} 100 100)`} stroke={i < active ? "var(--color-primary)" : "var(--color-track)"} strokeWidth="5.5" strokeLinecap="round" className="transition-colors duration-300 motion-reduce:transition-none" />)}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Rest</span>
        <span className="text-6xl font-extrabold tabular-nums">{formatClock(seconds)}</span>
      </div>
    </div>
    <div className="mt-7 flex items-center gap-3" onClick={(event) => event.stopPropagation()}><Button variant="surface" onClick={() => onAdjust(-15)}>−15 sec</Button><Button variant="primary" className="px-6" onClick={onSkip}>Skip</Button><Button variant="surface" onClick={() => onAdjust(15)}>+15 sec</Button></div>
  </div>;
}

function MinimizedRestTimer({ seconds, onExpand, onAdjust, onSkip }: { seconds: number; onExpand: () => void; onAdjust: (seconds: number) => void; onSkip: () => void }) {
  return <div className="sticky top-[5.7rem] z-10 mt-2 flex h-12 items-center rounded-xl border border-primary/30 bg-elevated px-2 shadow-sm"><button type="button" className="flex min-w-0 flex-1 items-center gap-2 px-1 text-left" onClick={onExpand}><Clock3 className="size-4 text-primary" /><span className="text-xs font-bold">Rest</span><span className="text-sm font-extrabold tabular-nums text-primary">{formatClock(seconds)}</span></button><button type="button" onClick={() => onAdjust(-15)} className="grid size-9 place-items-center text-muted-foreground" aria-label="Subtract 15 seconds"><Minus className="size-4" /></button><button type="button" onClick={() => onAdjust(15)} className="grid size-9 place-items-center text-muted-foreground" aria-label="Add 15 seconds"><Plus className="size-4" /></button><button type="button" onClick={onSkip} className="grid size-9 place-items-center text-muted-foreground" aria-label="End rest"><X className="size-4" /></button></div>;
}

function ExerciseActionsSheet({ sheet, workout, onClose, onShowReplace, onShowSuperset, onShowGroup, onShowCircuit, onReplace, onPair, onCreateCircuit, onCreateGroup, onRemoveGroup, onRemoveCircuit, onRemovePair, onRemove, onRest, onAdd }: { sheet: Sheet; workout: ActiveWorkoutState; onClose: () => void; onShowReplace: (key: string) => void; onShowSuperset: (key: string) => void; onShowGroup: (key: string) => void; onShowCircuit: (key: string) => void; onReplace: (key: string, exercise: Exercise) => void; onPair: (key: string, partner: string) => void; onCreateGroup: (memberKeys: string[], restSeconds: number) => void; onCreateCircuit: (key: string, memberKeys: string[], workSeconds: number, restSeconds: number, rounds: number, reps: Record<string, number>) => void; onRemoveGroup: (key:string)=>void; onRemoveCircuit: (key: string) => void; onRemovePair: (key: string) => void; onRemove: (key: string) => void; onRest: (key: string, seconds: number) => void; onAdd: (exercise: Exercise) => void }) {
  const key = "key" in sheet ? sheet.key : undefined;
  const current = workout.exercises.find((exercise) => exercise.key === key);
  const used = new Set(workout.exercises.map((exercise) => exercise.id));
  const [replaceQuery, setReplaceQuery] = useState("");
  useEffect(() => { if (sheet.kind !== "replace") setReplaceQuery(""); }, [sheet.kind]);
  const recalledIds = current ? recalledReplacements(current.id) : [];
  const alternatives = current ? [...exercises.filter((exercise) => isCardioExercise(exercise) === isCardioExercise(current) && !used.has(exercise.id) && (!replaceQuery.trim() || exercise.name.toLowerCase().includes(replaceQuery.trim().toLowerCase())))].sort((a, b) => {
    const aRecalled = recalledIds.indexOf(a.id); const bRecalled = recalledIds.indexOf(b.id);
    if (aRecalled >= 0 || bRecalled >= 0) return aRecalled < 0 ? 1 : bRecalled < 0 ? -1 : aRecalled - bRecalled;
    const aSameMuscle = a.muscle === current.muscle || a.muscles?.includes(current.muscle) ? 0 : 1;
    const bSameMuscle = b.muscle === current.muscle || b.muscles?.includes(current.muscle) ? 0 : 1;
    return aSameMuscle - bSameMuscle || a.name.localeCompare(b.name);
  }) : [];
  return <>
    <Drawer open={sheet.kind === "actions"} onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Exercise actions</DrawerTitle></DrawerHeader>{key && <div className="space-y-1 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"><Button variant="ghost" className="w-full justify-start" onClick={() => onShowReplace(key)}><Shuffle />Replace exercise</Button>{current && !isCardioExercise(current) && <><Button variant="ghost" className="w-full justify-start" onClick={() => onShowGroup(key)}><Link2 />Group exercises</Button><Button variant="ghost" className="w-full justify-start" onClick={() => onShowCircuit(key)}><Clock3 />Create timed circuit</Button></>}{current?.groupId && <Button variant="ghost" className="w-full justify-start" onClick={() => onRemoveGroup(key)}><Unlink />Unlink group</Button>}{current?.circuitId && <Button variant="ghost" className="w-full justify-start" onClick={() => onRemoveCircuit(key)}><Unlink />Unlink circuit</Button>}{current?.supersetWith && <Button variant="ghost" className="w-full justify-start" onClick={() => onRemovePair(key)}><Unlink />Remove superset</Button>}<Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => onRemove(key)}><Trash2 />Remove exercise</Button></div>}</DrawerContent></Drawer>
    <Drawer open={sheet.kind === "replace"} onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className="mx-auto h-[72dvh] max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Replace exercise</DrawerTitle></DrawerHeader><div className="flex min-h-0 flex-1 flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"><div className="relative mb-2"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input type="search" value={replaceQuery} onChange={(event) => setReplaceQuery(event.target.value)} placeholder="Search exercises" className="h-11 w-full rounded-xl border border-border bg-secondary pl-9 pr-3 text-sm outline-none focus:border-primary"/></div><div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card px-3">{key && alternatives.map((exercise, index) => <div key={exercise.id}>{index === 0 && recalledIds.includes(exercise.id) && !replaceQuery.trim() && <p className="pb-1 pt-3 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-primary">Previously used</p>}<ExerciseOption exercise={exercise} badge={recalledIds.includes(exercise.id) ? "Used before" : undefined} onSelect={(item) => { if (current) rememberReplacement(current.id, item.id); onReplace(key, item); }} /></div>)}{key && alternatives.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No exercises found</p>}</div></div></DrawerContent></Drawer>
    <Drawer open={sheet.kind === "group"} onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Create superset or tri-set</DrawerTitle></DrawerHeader>{key && <ExerciseGroupSetup workout={workout} anchorKey={key} onCreate={onCreateGroup}/>}</DrawerContent></Drawer>
    <Drawer open={sheet.kind === "superset"} onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Choose exercise to superset with</DrawerTitle></DrawerHeader><div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{key && workout.exercises.filter((exercise) => exercise.key !== key && !isCardioExercise(exercise) && !exercise.supersetWith && !exercise.sessionSets.filter((set) => set.kind !== "warmup").every((set) => set.completed)).map((exercise) => <DrawerClose key={exercise.key} asChild><button type="button" className="min-h-14 w-full border-b border-border text-left text-sm font-bold last:border-0" onClick={() => onPair(key, exercise.key)}>{exercise.name}</button></DrawerClose>)}</div></DrawerContent></Drawer>

    <Drawer open={sheet.kind === "circuit"} onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Create timed circuit</DrawerTitle></DrawerHeader>{key && <CircuitSetup workout={workout} anchorKey={key} onCreate={(members, work, rest, rounds, reps) => onCreateCircuit(key, members, work, rest, rounds, reps)} />}</DrawerContent></Drawer>
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
function ExerciseOption({ exercise, onSelect, badge }: { exercise: Exercise; onSelect: (exercise: Exercise) => void; badge?: string | undefined }) { return <DrawerClose asChild><button type="button" className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 text-left last:border-0" onClick={() => onSelect(exercise)}><span className="min-w-0"><span className="flex items-center gap-2"><span className="block truncate text-sm font-bold">{exercise.name}</span>{badge && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[0.56rem] font-extrabold uppercase tracking-wide text-primary">{badge}</span>}</span><span className="mt-1 block text-[0.7rem] text-muted-foreground">{isCardioExercise(exercise) ? "Cardio" : exercise.muscle} · {exercise.equipment}</span></span><Plus className="size-4 text-primary"/></button></DrawerClose>; }

type ReplacementMemory = Record<string, Record<string, number>>;
const REPLACEMENT_MEMORY_KEY = "recomp-replacement-memory-v1";
function replacementMemory(): ReplacementMemory { try { return JSON.parse(localStorage.getItem(REPLACEMENT_MEMORY_KEY) ?? "{}") as ReplacementMemory; } catch { return {}; } }
function rememberReplacement(fromId: string, toId: string) { try { const memory = replacementMemory(); const choices = memory[fromId] ?? {}; choices[toId] = (choices[toId] ?? 0) + 1; memory[fromId] = choices; localStorage.setItem(REPLACEMENT_MEMORY_KEY, JSON.stringify(memory)); } catch { /* optional preference only */ } }
function recalledReplacements(fromId: string) { const choices = replacementMemory()[fromId] ?? {}; return Object.entries(choices).sort((a,b) => b[1]-a[1]).map(([id]) => id); }

function WorkoutSummary({ result }: { result: FinishedWorkout }) {
  const [celebrating, setCelebrating] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const { user } = useAuth();
  const [sharedToFeed, setSharedToFeed] = useState(false);
  const [sharingToFeed, setSharingToFeed] = useState(false);
  const performed = result.workout.exercises.map((exercise) => ({
    exercise,
    sets: exercise.sessionSets.filter((set) => set.completed),
  })).filter(({ sets }) => sets.length > 0);
  const data = useTrainingData();
  const shareWorkout = useMemo(() => data?.workouts.find((w) => w.id === result.workout.id) ?? toCompletedWorkout(result.workout, result.duration), [data, result]);
  const sharePrs = useMemo(() => (data ? personalRecords(data.workouts).byWorkout.get(result.workout.id) : undefined) ?? [], [data, result.workout.id]);
  const prExerciseIds = useMemo(() => new Set(sharePrs.map((pr) => pr.exerciseId)), [sharePrs]);
  const previousComparable = useMemo(() => data?.workouts
    .filter((workout) => workout.id !== result.workout.id && workout.startedAt < result.workout.startedAt && workout.name === result.workout.name)
    .sort((a, b) => b.startedAt - a.startedAt)[0], [data, result.workout.id, result.workout.name, result.workout.startedAt]);
  const previousVolume = previousComparable?.exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + set.weight * set.reps, 0), 0) ?? 0;
  const volumeDelta = previousComparable && previousVolume > 0 && result.volume > 0 ? Math.round(((result.volume - previousVolume) / previousVolume) * 100) : null;
  const weekStart = new Date(result.workout.startedAt); weekStart.setHours(0,0,0,0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const workoutsThisWeek = data?.workouts.filter((item) => item.startedAt >= weekStart.getTime() && item.startedAt <= result.workout.startedAt).length ?? 1;

  useEffect(() => {
    if (!user) return;
    void getMySharedWorkoutIds(user.id).then((ids) => setSharedToFeed(ids.has(shareWorkout.id))).catch(() => undefined);
  }, [user, shareWorkout.id]);

  async function toggleFeedShare() {
    if (!user || sharingToFeed) return;
    setSharingToFeed(true);
    try {
      if (sharedToFeed) { await unshareWorkoutFromSocial(user.id, shareWorkout.id); setSharedToFeed(false); toast.success("Removed from your feed"); }
      else { await shareWorkoutToSocial(user.id, shareWorkout, sharePrs.length); setSharedToFeed(true); toast.success("Shared to your feed"); }
    } catch { toast.error("Couldn't update Social sharing"); }
    finally { setSharingToFeed(false); }
  }

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

  return <div className="animate-in fade-in pb-8 duration-500">
    <section className="-mx-4 bg-primary px-5 pb-6 pt-7 text-primary-foreground">
      <div className="grid size-12 place-items-center rounded-full bg-primary-foreground/15"><CircleCheck className="size-8" /></div>
      <p className="mt-5 text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-primary-foreground/80">Workout complete</p>
      <h1 className="mt-1 max-w-full text-3xl font-black leading-tight [overflow-wrap:anywhere]">{result.workout.name}</h1>

    </section>

    <div className="mt-4 grid grid-cols-2 gap-2">
      <SummaryMetric label="Duration" value={formatDuration(result.duration)} />
      <SummaryMetric label="Exercises" value={`${result.completedExercises} of ${result.workout.exercises.length}`} />
      <SummaryMetric label="Sets" value={String(result.totalSets)} />
      <SummaryMetric label="Volume" value={result.volume ? `${Math.round(result.volume).toLocaleString()} kg` : "—"} />
    </div>

    <div className="mt-3 rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">What you achieved</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div><div className="text-lg font-black tabular-nums">{workoutsThisWeek}</div><div className="text-[0.65rem] font-bold text-muted-foreground">workout{workoutsThisWeek === 1 ? "" : "s"} this week</div></div>
        <div><div className="text-lg font-black tabular-nums">{sharePrs.length}</div><div className="text-[0.65rem] font-bold text-muted-foreground">new PR{sharePrs.length === 1 ? "" : "s"}</div></div>
      </div>
      {volumeDelta !== null && <div className="mt-3 border-t border-border pt-3 text-sm"><span className="font-extrabold">{volumeDelta > 0 ? "+" : ""}{volumeDelta}% volume</span><span className="text-muted-foreground"> vs last {result.workout.name}</span></div>}
    </div>
    {sharePrs.length > 0 && <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/[0.08] px-4 py-3"><p className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-primary">New personal record{sharePrs.length > 1 ? "s" : ""}</p><div className="mt-1 space-y-1">{sharePrs.map((pr) => <p key={pr.exerciseId} className="text-sm font-bold">{pr.name} <span className="font-semibold text-muted-foreground">· {pr.set.weight > 0 ? `${pr.set.weight} kg × ${pr.set.reps}` : `${pr.set.reps} reps`}</span></p>)}</div></div>}

    {user && <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-3.5">
      <div className="min-w-0"><div className="text-sm font-extrabold">Share to your feed</div><div className="mt-0.5 text-[0.68rem] leading-snug text-muted-foreground">Let your RECOMP'D friends see this workout.</div></div>
      <button type="button" role="switch" aria-checked={sharedToFeed} disabled={sharingToFeed} onClick={() => void toggleFeedShare()} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${sharedToFeed ? "bg-primary" : "bg-muted-foreground/25"}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all ${sharedToFeed ? "left-6" : "left-1"}`} /></button>
    </div>}

    {performed.length > 0 && <section className="mt-6">
      <h2 className="text-base font-black">Exercises performed</h2>
      <div className="mt-2 space-y-2">
        {performed.map(({ exercise, sets }) => {
          const hasPr = prExerciseIds.has(exercise.id);
          let bestIndex = -1;
          if (!isCardioExercise(exercise)) {
            let bestScore = -1;
            sets.forEach((set, index) => {
              const score = (Number(set.weight) || 0) * (Number(set.reps) || 0);
              if (score > bestScore) { bestScore = score; bestIndex = index; }
            });
          }
          return <Card key={exercise.key} className="overflow-hidden p-0">
            <div className="flex items-start justify-between gap-3 bg-primary/[0.10] px-4 py-3">
              <div className="min-w-0"><h3 className="truncate text-sm font-extrabold">{exercise.name}</h3><p className="mt-0.5 truncate text-[0.68rem] font-medium text-muted-foreground">{isCardioExercise(exercise) ? "Cardio" : exercise.muscle} · {exercise.equipment}</p></div>
              <span className="shrink-0 text-[0.65rem] font-bold text-primary">{sets.length} set{sets.length === 1 ? "" : "s"}</span>
            </div>
            <div className="px-4 py-2">
              {sets.map((set, index) => <div key={set.id} className="grid min-h-9 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                <span className="text-center font-bold tabular-nums text-muted-foreground">{index + 1}</span>
                <span className="font-semibold tabular-nums">{isCardioExercise(exercise) ? `${Math.round((Number(set.durationSeconds) || 0) / 60)} min${set.distanceKm ? ` · ${set.distanceKm} km` : ""}` : exercise.equipment === "Bodyweight" || !Number(set.weight) ? `${set.reps} ${isTimedHold(exercise) ? "sec" : "reps"}` : `${set.weight} kg × ${set.reps}${isTimedHold(exercise) ? " sec" : ""}`}</span>
                <span className="flex items-center gap-1">{index === bestIndex && sets.length > 1 && <span className="rounded-full bg-primary/10 px-2 py-1 text-[0.58rem] font-extrabold uppercase tracking-wide text-primary">Best set</span>}{hasPr && index === bestIndex && <span className="rounded-full bg-primary px-2 py-1 text-[0.58rem] font-extrabold uppercase tracking-wide text-amber-950" style={{ backgroundColor: "#F4C542" }}>PR</span>}</span>
              </div>)}
            </div>
          </Card>;
        })}
      </div>
    </section>}
    {shareWorkout.exercises.length > 0 && <ShareWorkoutButton workout={shareWorkout} prs={sharePrs} className="mt-5 w-full" />}
  </div>;
}

function SummaryMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xl font-black tabular-nums">{value}</div><div className="mt-1 text-[0.68rem] font-medium text-muted-foreground">{label}</div></div>; }

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



function CircuitSetup({ workout, anchorKey, onCreate }: { workout: ActiveWorkoutState; anchorKey: string; onCreate: (members: string[], work: number, rest: number, rounds: number, reps: Record<string, number>) => void }) {
  const [members, setMembers] = useState<string[]>([anchorKey]); const [work, setWork] = useState(300); const [rest, setRest] = useState(90); const [rounds, setRounds] = useState(3);
  const [reps, setReps] = useState<Record<string, number>>(() => Object.fromEntries(workout.exercises.map((e) => [e.key, Number(e.reps.match(/\\d+/)?.[0]) || 10])));
  const eligible = workout.exercises.filter((e) => !isCardioExercise(e) && !e.circuitId);
  return <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"><div className="mb-3 space-y-1">{eligible.map((e) => { const selected = members.includes(e.key); return <div key={e.key} className="flex min-h-14 items-center gap-2 rounded-xl bg-secondary px-3"><button type="button" onClick={() => e.key !== anchorKey && setMembers((v) => v.includes(e.key) ? v.filter((k) => k !== e.key) : [...v,e.key])} className="flex min-w-0 flex-1 items-center justify-between text-left text-sm font-bold"><span className="truncate">{e.name}</span><span className="ml-2">{selected ? "✓" : "○"}</span></button>{selected && <div className="flex shrink-0 items-center gap-1 rounded-lg bg-background/70 px-1"><button type="button" className="grid size-9 place-items-center text-lg" onClick={() => setReps((v) => ({...v,[e.key]:Math.max(1,(v[e.key] ?? 10)-1)}))}>−</button><span className="min-w-12 text-center text-xs font-extrabold tabular-nums">{reps[e.key] ?? 10} reps</span><button type="button" className="grid size-9 place-items-center text-lg" onClick={() => setReps((v) => ({...v,[e.key]:Math.min(99,(v[e.key] ?? 10)+1)}))}>+</button></div>}</div>})}</div><div className="grid grid-cols-3 gap-2">{[["Work",work,setWork,60],["Rest",rest,setRest,15],["Rounds",rounds,setRounds,1]].map(([label,value,setter,step]: any) => <div key={label} className="rounded-xl bg-secondary p-2 text-center"><div className="text-[0.62rem] font-bold uppercase text-muted-foreground">{label}</div><div className="my-1 font-extrabold">{label === "Rounds" ? value : formatClock(value)}</div><div className="flex items-center justify-between px-2"><button type="button" className="grid size-9 place-items-center text-lg" onClick={() => setter(Math.max(step, value-step))}>−</button><button type="button" className="grid size-9 place-items-center text-lg" onClick={() => setter(value+step)}>+</button></div></div>)}</div><Button className="mt-4 w-full" disabled={members.length < 2} onClick={() => onCreate(members,work,rest,rounds,Object.fromEntries(members.map((key) => [key,reps[key] ?? 10])))}>Create circuit</Button></div>;
}

function CircuitMode({ circuit, members, run, now, onRun, onExit, onComplete, onMinimize }: { circuit: { id: string; workSeconds: number; restSeconds: number; rounds: number; reps?: Record<string, number> }; members: ActiveExercise[]; run: { id: string; phase: "countdown" | "work" | "rest"; round: number; endsAt: number }; now: number; onRun: (run: { id: string; phase: "countdown" | "work" | "rest"; round: number; endsAt: number } | null) => void; onExit: () => void; onComplete: () => void; onMinimize: () => void }) {
  const remaining = Math.max(0, Math.ceil((run.endsAt-now)/1000));
  useEffect(() => { if (remaining > 0) return; if (run.phase === "countdown") onRun({ ...run, phase:"work", endsAt:Date.now()+circuit.workSeconds*1000 }); else if (run.phase === "work") { if (run.round >= circuit.rounds) onComplete(); else onRun({ ...run, phase:"rest", endsAt:Date.now()+circuit.restSeconds*1000 }); } else if (run.round >= circuit.rounds) onComplete(); else onRun({ ...run, phase:"work", round:run.round+1, endsAt:Date.now()+circuit.workSeconds*1000 }); }, [remaining, run.phase, run.round]);
  const countdown = run.phase === "countdown" ? remaining : run.phase === "rest" && remaining <= 3 ? remaining : null;
  if (countdown !== null) return createPortal(<div className="fixed inset-0 z-[9999] bg-background"><button className="absolute right-5 top-5 z-10 text-muted-foreground" onClick={onExit}><X /></button><div className="fixed inset-0 grid h-[100dvh] w-screen place-items-center pointer-events-none"><div key={countdown} className="circuit-count-pop text-[10rem] font-black leading-none text-primary">{countdown || "GO"}</div></div><style>{`@keyframes circuitCountPop{0%{opacity:0;transform:scale(.45)}35%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}.circuit-count-pop{animation:circuitCountPop .75s cubic-bezier(.16,1,.3,1)}`}</style></div>, document.body);
  return <div className="fixed inset-0 z-[100] flex flex-col bg-background px-5 pb-8 pt-[calc(1rem+env(safe-area-inset-top))]"><div className="flex justify-between"><button onClick={onExit}><X /></button><button type="button" onClick={onMinimize} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-extrabold">Minimise</button><span className="text-xs font-extrabold">ROUND {run.round}/{circuit.rounds}</span></div><div className="flex flex-1 flex-col items-center justify-center translate-y-[6dvh]"><div className="text-xs font-black uppercase tracking-[.25em] text-muted-foreground">{run.phase === "rest" ? "Rest" : "Circuit"}</div><div className="mt-3 text-7xl font-black tabular-nums text-primary">{formatClock(remaining)}</div>{run.phase === "work" ? <div className="mt-10 w-full max-w-sm space-y-3">{members.map((e,i) => <div key={e.key} className="text-center"><div className="text-xl font-extrabold">{e.name}</div><div className="mt-1 text-sm font-bold text-muted-foreground">{circuit.reps?.[e.key] ?? 10} reps</div>{i < members.length-1 && <div className="mt-2 text-muted-foreground">↓</div>}</div>)}<p className="pt-4 text-center text-xs font-semibold text-muted-foreground">Keep cycling until time</p></div> : <div className="mt-10 flex flex-col items-center gap-5 text-center"><div className="text-sm font-bold text-muted-foreground">Next · Round {Math.min(run.round+1,circuit.rounds)}</div><Button variant="surface" className="w-full max-w-sm" onClick={() => onRun({ ...run, phase:"work", round:Math.min(run.round+1,circuit.rounds), endsAt:Date.now()+circuit.workSeconds*1000 })}>Skip rest</Button></div>}</div></div>;
}


function CircuitWorkoutCard({ circuit, members, expanded, run, now, onToggle, onStart, onResume, onActions, completed }: { circuit: { id:string; workSeconds:number; restSeconds:number; rounds:number; reps?:Record<string,number> }; members:ActiveExercise[]; expanded:boolean; run:{ id:string; phase:"countdown"|"work"|"rest"; round:number; endsAt:number }|null; now:number; onToggle:()=>void; onStart:()=>void; onResume:()=>void; onActions:()=>void; completed:boolean }) {
  const remaining = run ? Math.max(0,Math.ceil((run.endsAt-now)/1000)) : 0;
  return <Card className={cn("relative overflow-hidden border-2 p-0", completed ? "border-emerald-500/30 bg-emerald-500/[0.08] dark:border-emerald-400/25 dark:bg-emerald-400/[0.08]" : "border-primary/55 bg-gradient-to-br from-primary/[0.08] via-card to-card shadow-[0_0_0_1px_hsl(var(--primary)/0.06)]")}><button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 py-3 pl-11 pr-3 text-left"><div className="min-w-0"><div className={cn("flex items-center gap-1.5 text-sm font-black", completed && "text-emerald-700 dark:text-emerald-400")}>{completed && <Check className="size-4"/>}Circuit</div><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] font-semibold text-muted-foreground"><span>{members.length} exercises</span><span>{formatClock(circuit.workSeconds)} work</span><span>{circuit.rounds} rounds</span><span>{formatClock(circuit.restSeconds)} rest</span></div>{completed && !run && <div className="mt-1 text-[0.68rem] font-extrabold text-emerald-700 dark:text-emerald-400">Completed</div>}{run && <div className="mt-1 text-[0.68rem] font-extrabold text-primary">{run.phase === "rest" ? "REST" : "LIVE"} · {formatClock(remaining)} · Round {run.round}/{circuit.rounds}</div>}</div>{expanded ? <ChevronUp className="size-4"/> : <ChevronDown className="size-4"/>}</button>{expanded && <div className="border-t border-border px-3 pb-3 pt-2"><div className="space-y-1.5">{members.map((e) => <div key={e.key} className="flex justify-between text-xs"><span className="font-bold">{e.name}</span><span className="font-bold text-muted-foreground">{circuit.reps?.[e.key] ?? 10} reps</span></div>)}</div><div className="mt-3 flex gap-2"><Button className="flex-1" onClick={run ? onResume : onStart}>{run ? "Resume circuit" : "Start circuit"}</Button><Button variant="surface" size="icon" onClick={onActions}><Ellipsis className="size-4"/></Button></div></div>}</Card>;
}


function ExerciseGroupSetup({ workout, anchorKey, onCreate }: { workout:ActiveWorkoutState; anchorKey:string; onCreate:(keys:string[],rest:number)=>void }) { const [keys,setKeys]=useState<string[]>([anchorKey]); const [rest,setRest]=useState(90); const eligible=workout.exercises.filter(e=>!isCardioExercise(e)&&!e.circuitId&&!e.groupId); return <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"><div className="space-y-1">{eligible.map(e=><button key={e.key} type="button" className="flex min-h-12 w-full items-center justify-between rounded-xl bg-secondary px-3 text-sm font-bold" onClick={()=>e.key!==anchorKey&&setKeys(v=>v.includes(e.key)?v.filter(k=>k!==e.key):v.length<3?[...v,e.key]:v)}><span>{e.name}</span><span>{keys.includes(e.key)?"✓":"○"}</span></button>)}</div><div className="mt-3 flex items-center justify-between rounded-xl bg-secondary px-3 py-2"><span className="text-xs font-bold">Rest after round</span><div className="flex items-center gap-4"><button className="size-9 text-lg" onClick={()=>setRest(v=>Math.max(15,v-15))}>−</button><span className="min-w-12 text-center text-sm font-black">{rest}s</span><button className="size-9 text-lg" onClick={()=>setRest(v=>v+15)}>+</button></div></div><Button className="mt-4 w-full" disabled={keys.length<2} onClick={()=>onCreate(keys,rest)}>Create {keys.length===3?"tri-set":"superset"}</Button></div> }

function ExerciseGroupCard({ group,members,expanded,onToggle,onSetChange,onToggleSet,onActions }: { group:{id:string;memberKeys:string[];restSeconds:number}; members:ActiveExercise[]; expanded:boolean; onToggle:()=>void; onSetChange:(exerciseKey:string,setId:string,patch:Partial<ActiveSet>,propagateWeight?:boolean,propagateReps?:boolean)=>void; onToggleSet:(exercise:ActiveExercise,set:ActiveSet)=>void; onActions:()=>void }) { const total=members.reduce((n,e)=>n+e.sessionSets.filter(s=>s.kind!=="warmup").length,0); const done=members.reduce((n,e)=>n+e.sessionSets.filter(s=>s.kind!=="warmup"&&s.completed).length,0); const complete=total>0&&done===total; const label=members.length===3?"TRI-SET":"SUPERSET"; return <Card className={cn("overflow-hidden border p-0",complete&&"border-emerald-500/25 bg-emerald-500/[0.08]")}><button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 py-3 pl-11 pr-3 text-left"><span className="min-w-0"><span className={cn("text-xs font-black tracking-wide",complete&&"text-emerald-600")}>{complete&&"✓ "}{label}</span><span className="mt-2 block space-y-1">{members.map(e=><span key={e.key} className="block truncate text-sm font-bold">{e.name}</span>)}</span><span className="mt-2 block text-[0.68rem] text-muted-foreground">{Math.max(...members.map(e=>e.sessionSets.filter(s=>s.kind!=="warmup").length))} rounds · {group.restSeconds}s rest</span></span><span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">{done}/{total}{expanded?<ChevronUp className="size-4"/>:<ChevronDown className="size-4"/>}</span></button>{expanded&&<div className="border-t border-border px-3 pb-3 pt-2"><div className="space-y-4">{members.map(e=><div key={e.key} data-workout-group-member-key={e.key}><div className="mb-1 text-sm font-extrabold">{e.name}</div><div className="space-y-1">{e.sessionSets.filter(s=>s.kind!=="warmup").map((s,i)=>{ const completedBefore=members.slice(0,members.indexOf(e)).reduce((n,m)=>n+(m.sessionSets.filter(x=>x.kind!=="warmup")[i]?.completed?1:0),0); const priorRounds=members.every(m=>m.sessionSets.filter(x=>x.kind!=="warmup").slice(0,i).every(x=>x.completed)); const isNext=!s.completed&&priorRounds&&completedBefore===members.indexOf(e)&&members.slice(0,members.indexOf(e)).every(m=>m.sessionSets.filter(x=>x.kind!=="warmup")[i]?.completed); return <div key={s.id} data-workout-group-set-id={s.id}><SetRow set={s} number={i+1} active={isNext} attention={isNext} canRemove={false} onChange={(patch,propagate,propagateReps)=>onSetChange(e.key,s.id,patch,propagate,propagateReps)} onToggle={()=>{ if (!s.completed) { const memberIndex=members.findIndex(m=>m.key===e.key); const next=members[memberIndex+1]; if(next) window.setTimeout(()=>{ const nextSets=next.sessionSets.filter(x=>x.kind!=="warmup"); const targetSet=nextSets[i]; const target=document.querySelector<HTMLElement>(`[data-workout-group-set-id="${cssEscape(targetSet?.id ?? "")}"]`); if(target){ const top=target.getBoundingClientRect().top+window.scrollY-220; window.scrollTo({top:Math.max(0,top),behavior:"smooth"}); } },180); } onToggleSet(e,s); }} onRemove={()=>{}}/></div>; })}</div></div>)}</div><Button variant="ghost" size="sm" className="mt-2 w-full" onClick={onActions}><Ellipsis className="size-4"/> Group actions</Button></div>}</Card> }
