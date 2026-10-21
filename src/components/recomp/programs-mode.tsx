import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarDays, Check, Clock3, Cloud, Copy, Dumbbell, LockKeyholeOpen, Pencil, Plus, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateWorkout, muscleGroups, quickSelects, type Muscle, type WorkoutExercise } from "@/data/exercises";
import { newId, useCloudData } from "@/lib/cloud-data";
import { cloneExercises, useSavedWorkouts } from "@/lib/workout-storage";
import { workoutTimeEstimate } from "@/lib/workout-time";
import { completionStats, createOccurrences, isPending, occurrencesFor, replan, updateOccurrence } from "@/lib/program-schedule";
import { deleteProgramDraft, saveProgramDraft, useProgramDrafts, type ProgramWorkout, type TrainingProgram } from "@/lib/program-storage";
import { WorkoutEditor } from "./workout-editor";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
const today = () => {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};
const createDraft = (): TrainingProgram => ({
  id: newId(), name: "", goal: "Strength", weeks: 8, mode: "flexible",
  startDate: today(), weekdays: [], status: "draft",
  workouts: [], createdAt: Date.now(), updatedAt: Date.now(),
});
const hasExercise = (workout: ProgramWorkout) => workout.exercises.some((exercise) => !exercise.note);
const durationMinutes = (workouts: ProgramWorkout[]) => workouts.reduce((sum, workout) => {
  const estimate = workoutTimeEstimate(workout.exercises);
  return sum + (estimate ? Math.round((estimate.lower + estimate.upper) / 2) : 0);
}, 0);
const formatDuration = (minutes: number) => minutes >= 60 ? String(Math.floor(minutes / 60)) + "h " + String(minutes % 60).padStart(2, "0") + "m" : minutes + "m";
function duplicateExercises(items: WorkoutExercise[]): WorkoutExercise[] {
  const keys = new Map(items.map((item) => [item.key, newId()]));
  const groupIds = new Map<string, string>();
  const circuitIds = new Map<string, string>();
  const getGroup = (map: Map<string, string>, id: string) => {
    if (!map.has(id)) map.set(id, newId());
    return map.get(id)!;
  };
  return cloneExercises(items).map((item) => ({
    ...item, key: keys.get(item.key)!,
    ...(item.supersetWith ? { supersetWith: keys.get(item.supersetWith) } : {}),
    ...(item.groupId ? { groupId: getGroup(groupIds, item.groupId) } : {}),
    ...(item.circuitId ? { circuitId: getGroup(circuitIds, item.circuitId) } : {}),
  }));
}

function regenExercises(workout: WorkoutExercise[], selected: Muscle[], count: number, seed: number, locked: Set<string>, rejected: Set<string>) {
  const original = workout.filter((item) => !item.note);
  const notes = workout.filter((item) => item.note);
  const lastLockedIndex = original.reduce((max, item, index) => locked.has(item.key) ? Math.max(max, index) : max, -1);
  const target = Math.max(count, lastLockedIndex + 1);
  const reserved = new Set(original.filter((item) => locked.has(item.key)).map((item) => item.id));
  const next: WorkoutExercise[] = [];
  for (let index = 0; index < target; index++) {
    const previous = original[index];
    if (previous && locked.has(previous.key)) { next.push(previous); continue; }
    const muscles = selected.length ? selected : (previous ? [previous.muscle] : ["Chest" as Muscle]);
    let fallback: WorkoutExercise | undefined;
    let picked: WorkoutExercise | undefined;
    for (let attempt = 0; attempt < 24 && !picked; attempt++) {
      const group = muscles[(index + attempt) % muscles.length]!;
      const options = generateWorkout([group], 8, seed + index * 101 + attempt * 71);
      for (const option of options) {
        if (reserved.has(option.id)) continue;
        fallback ??= option;
        if (!rejected.has(option.id) && option.id !== previous?.id) { picked = option; break; }
      }
    }
    const result = picked ?? fallback ?? previous;
    if (result) {
      reserved.add(result.id);
      next.push(result === previous ? result : {
        ...result, key: previous?.key ?? newId(),
        ...(previous?.supersetWith ? { supersetWith: previous.supersetWith } : {}),
        ...(previous?.groupId ? { groupId: previous.groupId, groupRestSeconds: previous.groupRestSeconds } : {}),
        ...(previous?.circuitId ? { circuitId: previous.circuitId, circuitWorkSeconds: previous.circuitWorkSeconds, circuitRestSeconds: previous.circuitRestSeconds, circuitRounds: previous.circuitRounds, circuitReps: previous.circuitReps } : {}),
      });
    }
  }
  return [...next, ...notes];
}

function Stat({ label, value }: {label: string; value: string}) {
  return <div className="rounded-xl bg-secondary/70 p-3 text-center"><div className="text-lg font-black text-foreground">{value}</div><div className="text-[0.64rem] font-semibold text-muted-foreground">{label}</div></div>;
}

export function ProgramsMode() {
  const saved = useSavedWorkouts();
  const cloud = useCloudData();
  const drafts = useProgramDrafts();
  const [current, setCurrent] = useState<TrainingProgram | null>(null);
  const [manageId, setManageId] = useState<string | null>(null);
  const currentRef = useRef<TrainingProgram | null>(null);
  currentRef.current = current;
  const [saveState, setSaveState] = useState<"saving" | "saved">("saved");
  const [step, setStep] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [adding, setAdding] = useState(false);
  const [muscles, setMuscles] = useState<Muscle[]>(["Chest"]);
  const [exerciseCount, setExerciseCount] = useState(5);
  const [locks, setLocks] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [regeneration, setRegeneration] = useState(0);

  // Even incomplete programs (including an empty name/workout list) are durable.
  useEffect(() => {
    if (!current) return;
    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      saveProgramDraft({ ...current, updatedAt: Date.now() });
      setSaveState("saved");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [current]);
  useEffect(() => () => {
    if (currentRef.current) saveProgramDraft({ ...currentRef.current, updatedAt: Date.now() });
  }, []);

  const update = (patch: Partial<TrainingProgram>) => setCurrent((previous) => previous ? { ...previous, ...patch } : previous);
  const updateWorkout = (id: string, patch: Partial<ProgramWorkout>) => setCurrent((previous) => previous ? {
    ...previous, workouts: previous.workouts.map((item) => item.id === id ? { ...item, ...patch } : item),
  } : previous);
  const close = () => {
    if (current) saveProgramDraft({ ...current, updatedAt: Date.now() });
    setCurrent(null); setEditing(null); setPickerOpen(false); setAdding(false); setStep(1);
  };
  const append = (workout: Omit<ProgramWorkout, "id"> & { id?: string }) => {
    setCurrent((previous) => {
      if (!previous) return previous;
      const day = weekdayOrder.find((d) => !previous.workouts.some((w) => w.weekday === d));
      return { ...previous, workouts: [...previous.workouts, { ...workout, id: workout.id ?? newId(), ...(day !== undefined ? { weekday: day } : {}) }] };
    });
    setAdding(false);
  };
  const duplicate = (workout: ProgramWorkout) => {
    if (!current || current.workouts.length >= 5) return;
    append({ name: workout.name + " Copy", exercises: duplicateExercises(workout.exercises) });
  };
  const finish = () => {
    if (!current) return;
    if (!current.name.trim()) { toast.error("Give your program a name."); setStep(1); return; }
    if (current.workouts.length < 2 || current.workouts.length > 5 || current.workouts.some((item) => !hasExercise(item))) {
      toast.error("Add 2–5 workouts with exercises."); setStep(2); return;
    }
    const days = current.workouts.map((w) => w.weekday);
    if (current.mode === "calendar" && (days.some((day) => day === undefined) || new Set(days).size !== days.length)) {
      toast.error("Assign a different weekday to each workout."); setStep(2); return;
    }
    saveProgramDraft({ ...current, name: current.name.trim(), weekdays: days.filter((day): day is number => day !== undefined), status: "draft", updatedAt: Date.now() });
    toast.success("Program saved to your account");
    setCurrent(null); setEditing(null); setStep(1);
  };

  const editTemplate = (id: string) => {
    const template = current?.workouts.find((workout) => workout.id === id);
    const strength = template?.exercises.filter((exercise) => !exercise.note) ?? [];
    const inferred = [...new Set(strength.map((exercise) => exercise.muscle))];
    setMuscles(inferred.length ? inferred : ["Chest"]);
    setExerciseCount(Math.max(3, Math.min(8, strength.length || 5)));
    setEditing(id); setPickerOpen(false); setShowGenerator(false); setLocks(new Set()); setRejected(new Set()); setRegeneration(0);
  };
  const generateIntoTemplate = (id: string, currentWorkout: WorkoutExercise[]) => {
    if (!muscles.length) { toast.error("Choose at least one muscle group."); return; }
    const nextSeed = Date.now() + regeneration;
    const skipped = new Set(rejected);
    for (const exercise of currentWorkout) if (!exercise.note && !locks.has(exercise.key)) skipped.add(exercise.id);
    const next = regenExercises(currentWorkout, muscles, exerciseCount, nextSeed, locks, skipped);
    setRejected(skipped); setRegeneration((value) => value + 1);
    updateWorkout(id, { exercises: next });
  };

  if (!cloud) return <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Loading your programs…</div>;

  const managed = drafts.find((p) => p.id === manageId && p.status !== "draft");
  if (managed) return <ProgramSchedule program={managed} all={drafts} onBack={() => setManageId(null)} />;

  if (!current) return <div className="space-y-4 pb-5">
    <div className="flex items-center justify-between gap-2">
      <div><h2 className="text-xl font-black">My Programs</h2><p className="text-xs text-muted-foreground">Build your training routine</p></div>
      <Button variant="primary" size="sm" onClick={() => { setCurrent(createDraft()); setStep(1); }}><Plus />Create</Button>
    </div>
    <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"><Cloud className="size-4 shrink-0" />Drafts sync with your RECOMP'D account</div>
    {!drafts.length && <div className="rounded-2xl border border-dashed border-primary/30 bg-card p-7 text-center">
      <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Dumbbell /></div>
      <h3 className="text-base font-black">Your training, your plan</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Create a program with 2–5 repeating workouts. Choose flexible or calendar scheduling and customise every exercise.</p>
      <Button variant="primary" className="mt-4" onClick={() => { setCurrent(createDraft()); setStep(1); }}><Plus />Build my first program</Button>
    </div>}
    {drafts.map((item) => {
      const total = item.workouts.length;
      const minutes = durationMinutes(item.workouts);
      return <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-1 bg-primary/70" />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="truncate text-base font-extrabold">{item.name.trim() || "Untitled program"}</p><p className="mt-1 text-xs text-muted-foreground">{item.goal} · {item.mode === "calendar" ? "Calendar" : "Flexible"} schedule</p></div><span className="rounded-lg bg-secondary px-2 py-1 text-[0.65rem] font-bold text-muted-foreground">{item.status === "draft" ? "Draft" : item.status === "active" ? "Active" : item.status === "paused" ? "Paused" : "Completed"}</span></div>
          <div className="mt-3 grid grid-cols-3 gap-2"><Stat label="Weeks" value={String(item.weeks)} /><Stat label="Workouts" value={String(total)} /><Stat label="Per cycle" value={minutes ? formatDuration(minutes) : "—"} /></div>
          <div className="mt-3 flex gap-2"><Button variant="surface" className="flex-1" onClick={() => { if (item.status === "draft") { setCurrent(structuredClone(item)); setStep(1); } else setManageId(item.id); }}>{item.status === "draft" ? <Pencil /> : <CalendarDays />}{item.status === "draft" ? "Continue editing" : "View program"}</Button>{item.status === "draft" && <Button variant="primary" size="sm" onClick={() => setManageId(item.id)}>Activate</Button>}<Button variant="ghost" size="icon" aria-label={"Delete " + item.name} onClick={() => { if (window.confirm("Delete this program draft?")) deleteProgramDraft(item.id); }}><Trash2 /></Button></div>
        </div>
      </div>;
    })}
  </div>;

  const editingWorkout = current.workouts.find((workout) => workout.id === editing);
  if (editingWorkout) {
    const setExercises: Dispatch<SetStateAction<WorkoutExercise[]>> = (value) => setCurrent((program) => program ? {
      ...program, workouts: program.workouts.map((item) => item.id === editingWorkout.id ? {
        ...item, exercises: typeof value === "function" ? value(item.exercises) : value,
      } : item),
    } : program);
    const unlocked = editingWorkout.exercises.filter((exercise) => !exercise.note && !locks.has(exercise.key)).length;
    return <div className="space-y-3 pb-8">
      <div className="flex items-center justify-between gap-2"><Button variant="ghost" size="sm" onClick={() => { setEditing(null); setPickerOpen(false); }}><ArrowLeft />Program</Button><span className="flex items-center gap-1 text-[0.68rem] font-semibold text-muted-foreground"><Cloud className="size-3" />Auto-saved</span></div>
      <div className="rounded-2xl border border-border bg-card p-3"><p className="mb-2 text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">Workout template</p><input aria-label="Workout name" className="h-11 w-full rounded-xl border border-border bg-secondary px-3 font-bold outline-none focus:border-primary" value={editingWorkout.name} onChange={(event) => updateWorkout(editingWorkout.id, { name: event.target.value })}/></div>
      <Button variant="surface" className="w-full" onClick={() => setPickerOpen(true)}><Plus />Add exercise manually</Button>
      <Button variant="ghost" className="w-full justify-between text-primary" onClick={() => setShowGenerator((value) => !value)}><Sparkles />{showGenerator ? "Hide generator" : "Generate exercises instead"}</Button>
      {showGenerator && <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
        <div className="flex items-center justify-between"><div><p className="font-extrabold">Generate exercises</p><p className="text-[0.68rem] text-muted-foreground">Lock favourites, regenerate the rest</p></div><Sparkles className="size-5 text-primary" /></div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1">{quickSelects.map((group) => <Button key={group.label} variant={group.muscles.every((muscle) => muscles.includes(muscle)) ? "choiceActive" : "surface"} size="sm" className="shrink-0" onClick={() => setMuscles(group.muscles)}>{group.label}</Button>)}</div>
        <div className="grid grid-cols-2 gap-1.5">{muscleGroups.map((muscle) => <Button key={muscle} size="sm" variant={muscles.includes(muscle) ? "choiceActive" : "choice"} onClick={() => setMuscles((list) => list.includes(muscle) ? list.filter((m) => m !== muscle) : [...list,muscle])}>{muscle}</Button>)}</div>
        <div className="flex items-center gap-2"><span className="shrink-0 text-xs font-bold text-muted-foreground">Exercises</span><div className="flex flex-1 gap-1">{[3,4,5,6,7,8].map((n) => <Button key={n} variant={exerciseCount===n ? "segmentActive" : "segment"} size="sm" className="h-9 min-w-0 flex-1 px-0" onClick={() => setExerciseCount(n)}>{n}</Button>)}</div></div>
        <Button variant="primary" className="w-full" disabled={!muscles.length || (editingWorkout.exercises.filter((exercise) => !exercise.note).length >= exerciseCount && !unlocked)} onClick={() => generateIntoTemplate(editingWorkout.id, editingWorkout.exercises)}><RefreshCw />{editingWorkout.exercises.length ? "Regenerate unlocked" : "Generate workout"}</Button>
        {locks.size > 0 && <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setLocks(new Set())}><LockKeyholeOpen />Unlock all ({locks.size})</Button>}
      </div>}
      <WorkoutEditor supersets workout={editingWorkout.exercises} setWorkout={setExercises} pickerOpen={pickerOpen} onPickerOpenChange={setPickerOpen} lockedKeys={locks} onToggleLock={(key) => setLocks((previous) => {
        const next = new Set(previous);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      })}/>
      <Button variant="primary" className="w-full" onClick={() => { setEditing(null); setPickerOpen(false); }}><Check />Done editing</Button>
    </div>;
  }

  const allDaysValid = current.workouts.every((workout) => workout.weekday !== undefined) &&
    new Set(current.workouts.map((workout) => workout.weekday)).size === current.workouts.length;
  const minutes = durationMinutes(current.workouts);
  const uniqueMuscles = Array.from(new Set(current.workouts.flatMap((workout) => workout.exercises.filter((exercise) => !exercise.note).flatMap((exercise) => exercise.muscles?.length ? [exercise.muscle,...exercise.muscles] : [exercise.muscle]))));
  return <div className="space-y-4 pb-8">
    <div className="flex items-center justify-between gap-2"><Button variant="ghost" size="sm" onClick={close}><ArrowLeft />Programs</Button><span className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-muted-foreground"><Cloud className="size-3.5"/>{saveState === "saving" ? "Saving…" : "Saved to account"}</span></div>
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">{["Details","Workouts","Review"].map((label,index) => <button key={label} type="button" onClick={() => setStep(index+1)} className={"rounded-lg py-2 text-xs font-bold transition-colors " + (step === index+1 ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}>{index+1}. {label}</button>)}</div>
    {step === 1 && <div className="space-y-3">
      <div><h2 className="text-xl font-black">Make it your own</h2><p className="mt-1 text-xs text-muted-foreground">The same workouts repeat every week.</p></div>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
        <label className="block text-xs font-bold">Program name<input className="mt-1 h-11 w-full rounded-xl border border-border bg-secondary px-3 text-base outline-none focus:border-primary" value={current.name} onChange={(event) => update({ name: event.target.value })} placeholder="e.g. Upper / Lower Strength" /></label>
        <label className="block text-xs font-bold">Training goal<select className="mt-1 h-11 w-full rounded-xl border border-border bg-secondary px-3" value={current.goal} onChange={(event) => update({ goal: event.target.value as TrainingProgram["goal"] })}>{["Strength","Hypertrophy","Fat loss","General fitness"].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="block text-xs font-bold">Duration<select className="mt-1 h-11 w-full rounded-xl border border-border bg-secondary px-3" value={current.weeks} onChange={(event) => update({ weeks: Number(event.target.value) })}>{[4,5,6,7,8,9,10,11,12].map((w) => <option key={w} value={w}>{w} weeks</option>)}</select></label>
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
        <p className="text-sm font-extrabold">How do you want to train?</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={current.mode==="flexible"?"choiceActive":"choice"} className="h-auto flex-col gap-1 py-3" onClick={() => update({mode:"flexible"})}><Dumbbell className="size-5"/>Flexible<span className="text-[0.64rem] font-normal opacity-75">Train in sequence</span></Button>
          <Button variant={current.mode==="calendar"?"choiceActive":"choice"} className="h-auto flex-col gap-1 py-3" onClick={() => update({mode:"calendar"})}><CalendarDays className="size-5"/>Calendar<span className="text-[0.64rem] font-normal opacity-75">Choose weekdays</span></Button>
        </div>
        {current.mode === "calendar" && <label className="block text-xs font-bold">Start date<input type="date" className="mt-1 h-11 w-full rounded-xl border border-border bg-secondary px-3" value={current.startDate} onChange={(event) => update({startDate:event.target.value})}/><span className="mt-1 block text-[0.65rem] font-normal text-muted-foreground">Defaults to today. Assign weekdays beside each workout on the next step.</span></label>}
      </div>
      <Button variant="primary" size="lg" className="w-full" onClick={() => setStep(2)}>Next: workouts <ArrowRight/></Button>
    </div>}
    {step === 2 && <div className="space-y-3">
      <div><h2 className="text-xl font-black">Your workout cycle</h2><p className="mt-1 text-xs text-muted-foreground">Add 2–5 workouts. They'll repeat throughout your {current.weeks}-week program.</p></div>
      {current.workouts.map((workout,index) => <div key={workout.id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-black text-primary">{String.fromCharCode(65+index)}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{workout.name || "Untitled workout"}</p><p className="text-[0.68rem] text-muted-foreground">{workout.exercises.filter((exercise) => !exercise.note).length} exercises · {workoutTimeEstimate(workout.exercises)?.label ?? "Not configured"}</p></div>
          <Button variant="ghost" size="icon" aria-label="Move workout up" disabled={index===0} onClick={()=>update({workouts:move(current.workouts,index,index-1)})}><ArrowUp /></Button>
          <Button variant="ghost" size="icon" aria-label="Move workout down" disabled={index===current.workouts.length-1} onClick={()=>update({workouts:move(current.workouts,index,index+1)})}><ArrowDown /></Button>
        </div>
        {current.mode==="calendar" && <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-2 py-1.5"><span className="text-[0.7rem] font-semibold text-muted-foreground">Training day</span><select aria-label={"Training day for "+workout.name} className="max-w-[55%] rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold" value={workout.weekday ?? ""} onChange={(event) => updateWorkout(workout.id,{weekday:event.target.value === "" ? undefined : Number(event.target.value)})}><option value="">Choose day</option>{weekdayOrder.map((day)=><option key={day} value={day}>{dayLabels[day]}</option>)}</select></div>}
        <div className="mt-3 grid grid-cols-3 gap-2"><Button variant="surface" size="sm" onClick={()=>editTemplate(workout.id)}><Pencil/>Edit</Button><Button variant="surface" size="sm" disabled={current.workouts.length>=5} onClick={()=>duplicate(workout)}><Copy/>Copy</Button><Button variant="ghost" size="sm" className="text-destructive" onClick={()=>update({workouts:current.workouts.filter((item)=>item.id!==workout.id)})}><Trash2/>Remove</Button></div>
      </div>)}
      {current.workouts.length<5 && <Button variant="surface" className="w-full" onClick={()=>setAdding((value)=>!value)}><Plus/>Add workout</Button>}
      {adding && <div className="space-y-3 rounded-2xl border border-primary/20 bg-card p-3 shadow-sm">
        <p className="text-sm font-extrabold">Add a workout</p>
        <Button variant="surface" className="w-full" onClick={()=>{ const id = newId(); append({name:"Workout "+(current.workouts.length+1),exercises:[], id}); editTemplate(id); setPickerOpen(true); }}>Build from scratch <Plus/></Button>
        <div className="border-t border-border pt-3"><p className="mb-2 text-xs font-bold text-muted-foreground">Generate a workout</p><div className="flex flex-wrap gap-1.5">{quickSelects.map((group)=><Button key={group.label} size="sm" variant={group.muscles.every((muscle)=>muscles.includes(muscle))?"choiceActive":"surface"} onClick={()=>setMuscles(group.muscles)}>{group.label}</Button>)}</div><Button variant="primary" className="mt-2 w-full" disabled={!muscles.length} onClick={()=>append({name:muscles.join(" + ")+" Day",exercises:generateWorkout(muscles,exerciseCount,Date.now())})}><Sparkles/>Generate {exerciseCount} exercises</Button></div>
        {saved.length>0 && <div className="border-t border-border pt-3"><p className="mb-2 text-xs font-bold text-muted-foreground">Import a saved workout</p><div className="max-h-44 space-y-1 overflow-y-auto">{saved.map((workout)=><Button key={workout.id} variant="ghost" className="w-full justify-start" onClick={()=>append({name:workout.name,exercises:duplicateExercises(workout.exercises)})}>{workout.name}</Button>)}</div></div>}
      </div>}
      {current.mode==="calendar" && current.workouts.length>0 && !allDaysValid && <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">Assign a different day to each workout before finishing.</p>}
      <div className="grid grid-cols-2 gap-2"><Button variant="surface" onClick={()=>setStep(1)}>Back</Button><Button variant="primary" onClick={()=>setStep(3)}>Review <ArrowRight/></Button></div>
    </div>}
    {step===3 && <div className="space-y-3">
      <div><h2 className="text-xl font-black">Your program at a glance</h2><p className="mt-1 text-xs text-muted-foreground">Review everything before saving your draft.</p></div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="h-1 bg-primary"/><div className="p-4"><p className="text-lg font-extrabold">{current.name || "Untitled program"}</p><p className="text-xs text-muted-foreground">{current.goal} · {current.mode==="calendar"?"Calendar":"Flexible"}</p><div className="mt-3 grid grid-cols-3 gap-2"><Stat label="Weeks" value={String(current.weeks)}/><Stat label="Sessions" value={String(current.workouts.length*current.weeks)}/><Stat label="Per cycle" value={minutes?formatDuration(minutes):"—"}/></div></div></div>
      <div className="rounded-2xl border border-border bg-card p-3"><p className="mb-2 text-sm font-extrabold">Workout rotation</p>{current.workouts.map((workout,index)=><div key={workout.id} className="flex items-center gap-2 border-b border-border py-2 last:border-0"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-black text-primary">{index+1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{workout.name}</p><p className="text-[0.65rem] text-muted-foreground">{workout.exercises.filter(ex=>!ex.note).length} exercises{current.mode==="calendar" && workout.weekday !== undefined ? " · "+dayLabels[workout.weekday] : ""}</p></div></div>)}</div>
      <div className="rounded-2xl border border-border bg-card p-3"><p className="text-sm font-extrabold">Muscle coverage</p><div className="mt-2 flex flex-wrap gap-1.5">{uniqueMuscles.length?uniqueMuscles.map((muscle)=><span key={muscle} className="rounded-full bg-primary/10 px-2.5 py-1 text-[0.68rem] font-bold text-primary">{muscle}</span>):<p className="text-xs text-muted-foreground">Add exercises to see muscle coverage</p>}</div><div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5"/>Estimated training: {minutes ? formatDuration(minutes) : "—"} per cycle</div></div>
      <p className="text-xs text-muted-foreground">Drafts auto-save to your account. Activating a program and tracking completed or pending sessions will come in Phase 2.</p>
      <div className="grid grid-cols-2 gap-2"><Button variant="surface" onClick={()=>setStep(2)}>Back</Button><Button variant="primary" onClick={finish}><Save/>Save program</Button></div>
    </div>}
  </div>;
}
function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

function ProgramSchedule({ program, all, onBack }: { program: TrainingProgram; all: TrainingProgram[]; onBack: () => void }) {
  const [switching, setSwitching] = useState(false);
  const [startDate, setStartDate] = useState(() => program.startDate || new Date().toLocaleDateString("en-CA"));
  const [newMode, setNewMode] = useState(program.mode);
  const todayKey = (() => { const d = new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"); })();
  const occurrences = occurrencesFor(program);
  const stats = completionStats(program);
  const next = occurrences.find((item) => item.status === "upcoming");
  const templateName = (id: string) => program.workouts.find((w) => w.id === id)?.name ?? "Workout";
  const commit = (nextProgram: TrainingProgram) => saveProgramDraft({ ...nextProgram, updatedAt: Date.now() });
  const activate = () => {
    if (all.some((p) => p.id !== program.id && p.status === "active")) { toast.error("Pause your existing active program first."); return; }
    if (program.workouts.length < 2 || program.workouts.length > 5 || program.workouts.some(w => !w.exercises.some(e => !e.note))) { toast.error("Finish all 2–5 workout templates first."); return; }
    const weekdays = program.workouts.map((w) => w.weekday);
    if (program.mode === "calendar" && (weekdays.some(d => d === undefined) || new Set(weekdays).size !== weekdays.length)) { toast.error("Every calendar workout needs its own weekday."); return; }
    commit({ ...program, startDate: todayKey, status: "active", activatedAt: Date.now(), occurrences: createOccurrences({ ...program, startDate: todayKey }) });
    toast.success("Program activated");
  };
  const changeMode = () => {
    if (newMode === "calendar" && (program.workouts.some(w=>w.weekday===undefined) || new Set(program.workouts.map(w=>w.weekday)).size !== program.workouts.length)) {
      toast.error("Assign distinct weekdays in the builder before using Calendar mode."); return;
    }
    commit(replan(program, newMode, startDate));
    setSwitching(false);
  };
  return <div className="space-y-4 pb-8">
    <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft />Programs</Button>
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between"><span className="text-[0.68rem] font-bold uppercase tracking-wide text-primary">Training program</span><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{program.status}</span></div>
      <h2 className="mt-2 text-xl font-black">{program.name}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{program.weeks} cycles · {program.workouts.length} workouts/cycle · {program.mode === "calendar" ? "Calendar" : "Flexible"}</p>
      <div className="mt-4 grid grid-cols-3 gap-2"><Stat label="Completed" value={String(stats.completed)} /><Stat label="Skipped" value={String(stats.skipped)} /><Stat label="Remaining" value={String(stats.remaining)} /></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: (stats.total ? stats.completed / stats.total * 100 : 0) + "%" }} /></div>
    </div>
    {program.status === "draft" ? <Button variant="primary" className="w-full" onClick={activate}>Activate program</Button> : <>
      <div className="flex gap-2">
        <Button variant="surface" className="flex-1" onClick={() => commit({ ...program, status: program.status === "active" ? "paused" : "active" })}>{program.status === "active" ? "Pause program" : "Resume program"}</Button>
        <Button variant="surface" className="flex-1" onClick={() => {setNewMode(program.mode);setSwitching(v=>!v);}}>Scheduling <Pencil /></Button>
      </div>
      {switching && <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-bold">Change future scheduling</p>
        <div className="grid grid-cols-2 gap-2">{(["flexible","calendar"] as const).map(mode=><Button key={mode} variant={newMode===mode?"choiceActive":"choice"} onClick={()=>setNewMode(mode)}>{mode==="flexible"?"Flexible":"Calendar"}</Button>)}</div>
        {newMode === "calendar" && <label className="block text-xs font-bold">Replan from<input type="date" className="mt-1 h-10 w-full rounded-lg border border-border bg-secondary px-2" value={startDate} min={todayKey} onChange={e=>setStartDate(e.target.value)}/></label>}
        <p className="text-xs text-muted-foreground">Completed and skipped sessions stay untouched. Only unresolved sessions get new dates.</p>
        <Button variant="primary" className="w-full" onClick={changeMode}>Apply schedule</Button>
      </div>}
    </>}
    {next && <div className="rounded-xl border border-primary/25 bg-primary/10 p-3"><p className="text-[0.65rem] font-bold text-primary">UP NEXT</p><p className="mt-1 font-extrabold">{templateName(next.templateId)}</p><p className="mt-1 text-xs text-muted-foreground">Cycle {next.cycle+1}{next.date ? " · "+next.date : ""} · Training launch arrives in Phase 3</p></div>}
    <div className="space-y-2">
      <h3 className="text-sm font-extrabold">Sessions</h3>
      {stats.pending>0 && <p className="text-xs font-bold text-primary">{stats.pending} pending workout{stats.pending===1?"":"s"} waiting for you</p>}
      {occurrences.map((occurrence,index)=><div key={occurrence.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-black">{index+1}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{templateName(occurrence.templateId)}</p><p className="text-[0.68rem] text-muted-foreground">Cycle {occurrence.cycle+1} · {occurrence.status==="skipped"?"Skipped":occurrence.status==="completed"?"Completed":isPending(occurrence,todayKey)?"Pending":occurrence.date??"Up next"}</p></div>
        {program.status === "active" && occurrence.status==="upcoming" && <div className="flex shrink-0 flex-col items-end gap-1">{program.mode==="calendar" && <input type="date" aria-label={"Reschedule "+templateName(occurrence.templateId)} className="h-8 max-w-32 rounded-lg border border-border bg-secondary px-1 text-[0.65rem]" value={occurrence.date ?? ""} onChange={e=>commit(updateOccurrence(program,occurrence.id,{date:e.target.value||undefined}))}/>}<Button variant="ghost" size="sm" className="text-destructive" onClick={()=>{if(window.confirm("Skip this workout? It will not count as completed."))commit(updateOccurrence(program,occurrence.id,{status:"skipped"}));}}>Skip</Button></div>}
      </div>)}
    </div>
  </div>;
}
