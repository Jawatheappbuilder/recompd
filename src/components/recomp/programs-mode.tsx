import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTrainingData } from "@/lib/training-data";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Clock3, Cloud, Copy, Dumbbell, LockKeyholeOpen, MoreHorizontal, Pencil, Plus, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exercises, toWorkoutExercise, generateWorkout, muscleGroups, quickSelects, type Muscle, type WorkoutExercise } from "@/data/exercises";
import { newId, useCloudData } from "@/lib/cloud-data";
import { cloneExercises, useSavedWorkouts, handOffWorkout, hasActiveWorkout } from "@/lib/workout-storage";
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
/** Starter routine inspired by standard gym PPL templates; copied into an editable account draft. */
function makePushPullLegs(): TrainingProgram {
  const exercise = (name:string,sets:number,reps:string,restSeconds:number):WorkoutExercise => {
    const match=exercises.find(e=>e.name===name);
    if (!match) throw new Error("Missing exercise: "+name);
    return {...toWorkoutExercise(match),key:newId(),sets,reps,restSeconds};
  };
  const day=(name:string,weekday:number,rows:[string,number,string,number][]):ProgramWorkout=>({
    id:newId(),name,weekday,exercises:rows.map(([n,s,r,rest])=>exercise(n,s,r,rest)),
  });
  const program=createDraft();
  return {...program,name:"Push / Pull / Legs",goal:"Hypertrophy",weeks:8,mode:"flexible",workouts:[
    day("Push Day",1,[["Bench Press",3,"6–10",150],["Incline Dumbbell Press",3,"8–12",90],["Machine Shoulder Press",3,"8–12",90],["Lateral Raise",3,"12–15",60],["Triceps Rope Pushdown",3,"10–15",60]]),
    day("Pull Day",3,[["Lat Pulldown",3,"8–12",120],["Seated Cable Row",3,"8–12",120],["Face Pull",3,"12–15",60],["Dumbbell Curl",3,"10–12",60],["Hammer Curl",3,"10–12",60]]),
    day("Legs Day",5,[["Back Squat",3,"6–10",150],["Romanian Deadlift",3,"8–10",120],["Leg Press",3,"10–12",120],["Seated Leg Curl",3,"10–15",75],["Standing Calf Raise",3,"12–15",60]]),
  ]};
}
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

export function ProgramsMode({ focusProgramId }: { focusProgramId?: string }) {
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

  useEffect(() => { if (focusProgramId && drafts.some(p => p.id === focusProgramId)) setManageId(focusProgramId); }, [focusProgramId, drafts]);

  if (!cloud) return <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Loading your programs…</div>;
  const managed = drafts.find((p) => p.id === manageId);
  if (managed) return <ProgramSchedule program={managed} all={drafts} onBack={() => setManageId(null)} />;

  if (!current) return <div className="space-y-4 pb-5">
    <div className="flex items-center justify-between gap-2">
      <div><h2 className="text-xl font-black">My Programs</h2><p className="text-xs text-muted-foreground">Build your training routine</p></div>
      <Button variant="primary" size="sm" onClick={() => { setCurrent(createDraft()); setStep(1); }}><Plus />Create</Button>
    </div>
    <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"><Cloud className="size-4 shrink-0" />Drafts sync with your RECOMP'D account</div>
    <section className="overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-sm">
      <div className="bg-primary/[0.08] px-4 py-3"><span className="text-[0.65rem] font-black uppercase tracking-widest text-primary">STARTER PROGRAM</span><h3 className="mt-1 text-lg font-black">Push / Pull / Legs</h3><p className="mt-1 text-xs text-muted-foreground">Classic gym split · 3 workouts · Flexible schedule · 8 weeks</p></div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2 text-center text-[0.7rem] font-bold"><span className="rounded-xl bg-secondary p-2">Push<br/><span className="font-normal text-muted-foreground">Chest / Tris</span></span><span className="rounded-xl bg-secondary p-2">Pull<br/><span className="font-normal text-muted-foreground">Back / Bis</span></span><span className="rounded-xl bg-secondary p-2">Legs<br/><span className="font-normal text-muted-foreground">Lower body</span></span></div>
        <p className="text-xs text-muted-foreground">A balanced starting point with compound lifts and accessories. Adjust exercises, sets and training days to suit you.</p>
        <Button variant="primary" className="w-full" onClick={()=>{setCurrent(makePushPullLegs());setStep(1);toast.success("Starter program ready — customise before saving");}}><Plus/>Use this program <ArrowRight/></Button>
      </div>
    </section>
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
          <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="truncate text-base font-extrabold">{item.name.trim() || "Untitled program"}</p><p className="mt-1 text-xs text-muted-foreground">{item.goal} · {item.mode === "calendar" ? "Calendar" : "Flexible"} schedule</p></div><span className={"rounded-full px-2.5 py-1 text-[0.65rem] font-extrabold "+(item.status==="active"?"bg-emerald-500/15 text-emerald-600 dark:text-emerald-400":"bg-secondary text-muted-foreground")}>{item.status==="active"?"● Active":item.status==="draft"?"Draft":item.status==="paused"?"Paused":"Completed"}</span></div>
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
      <p className="text-xs text-muted-foreground">Drafts auto-save to your account. Activate your program after reviewing to start following it.</p>
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


function displayWorkoutName(name: string, position: number, workout: ProgramWorkout | undefined): string {
  if (!name.includes(" + ") || !name.endsWith(" Day")) return name;
  const groups = new Set((workout?.exercises ?? []).filter(e => !e.note).map(e => e.muscle));
  if (groups.size===1 && groups.has("Core")) return "Core Day";
  const upper = ["Chest","Back","Shoulders","Biceps","Triceps"].some(m=>groups.has(m as Muscle));
  const lower = ["Quads","Hamstrings","Glutes","Calves"].some(m=>groups.has(m as Muscle));
  return (upper && lower ? "Full Body" : upper ? "Upper Body" : lower ? "Lower Body" : "Workout") + " " + String.fromCharCode(65 + position);
}

function ProgramSchedule({ program, all, onBack }: { program: TrainingProgram; all: TrainingProgram[]; onBack: () => void }) {
  const navigate=useNavigate();
  const training=useTrainingData();
  const [expandedSession,setExpandedSession]=useState<string|null>(null);
  const [managing,setManaging]=useState(false);
  const [switching,setSwitching]=useState(false);
  const [newMode,setNewMode]=useState(program.mode);
  const [startDate,setStartDate]=useState(program.startDate);
  const [selectedCycle,setSelectedCycle]=useState<number|null>(null);
  const [showAll,setShowAll]=useState(false);
  const d=new Date();
  const todayKey=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  const occurrences=occurrencesFor(program);
  const stats=completionStats(program);
  const next=occurrences.find(o=>o.status==="upcoming");
  const currentCycle=next?.cycle ?? Math.max(0,program.weeks-1);
  const cycle=Math.min(Math.max(0,selectedCycle??currentCycle),program.weeks-1);
  const week=occurrences.filter(o=>o.cycle===cycle);
  const weekDone=week.filter(o=>o.status==="completed").length;
  const percent=stats.total?Math.round(stats.completed/stats.total*100):0;
  const circumference=2*Math.PI*41;
  const template=(id:string)=>program.workouts.find(w=>w.id===id);
  const titleFor=(id:string)=>{const t=template(id);return displayWorkoutName(t?.name??"Workout",Math.max(0,program.workouts.findIndex(w=>w.id===id)),t);};
  const commit=(p:TrainingProgram)=>saveProgramDraft({...p,updatedAt:Date.now()});
  const startSession=(occurrence:typeof occurrences[number])=>{
    if(program.status!=="active") { toast.error("Resume the program to train."); return; }
    const item=template(occurrence.templateId);
    if(!item || occurrence.status!=="upcoming") return;
    if(hasActiveWorkout()) { toast.info("You have an active workout. Resume or finish that session first."); void navigate({to:"/workout"}); return; }
    if(!handOffWorkout({name:item.name,exercises:cloneExercises(item.exercises),programId:program.id,programTemplateId:item.id,programOccurrenceId:occurrence.id})) { toast.error("Could not start program workout."); return; }
    void navigate({to:"/workout"});
  };
  const activate=()=>{
    if(all.some(p=>p.id!==program.id&&p.status==="active")){toast.error("Pause your other active program first.");return;}
    if(program.workouts.length<2||program.workouts.length>5||program.workouts.some(w=>!w.exercises.some(e=>!e.note))){toast.error("Add 2–5 complete workouts first.");return;}
    const weekdays=program.workouts.map(w=>w.weekday);
    if(program.mode==="calendar"&&(weekdays.some(v=>v===undefined)||new Set(weekdays).size!==weekdays.length)){toast.error("Assign a unique weekday to each workout.");return;}
    commit({...program,startDate:todayKey,activatedAt:Date.now(),status:"active",occurrences:createOccurrences({...program,startDate:todayKey})});
    toast.success("Your program is active!");
  };
  const applySchedule=()=>{
    if(newMode==="calendar"&&(program.workouts.some(w=>w.weekday===undefined)||new Set(program.workouts.map(w=>w.weekday)).size!==program.workouts.length)){
      toast.error("Assign distinct weekdays in the program builder first.");return;
    }
    commit(replan(program,newMode,startDate));
    setSwitching(false);
    toast.success("Future schedule updated");
  };
  const sessionCard=(o:typeof occurrences[number])=>{
    const done=o.status==="completed", skipped=o.status==="skipped", pending=isPending(o,todayKey), active=o.id===next?.id;
    const w=template(o.templateId);
    const estimate=w?workoutTimeEstimate(w.exercises):null;
    const history=done&&o.completedWorkoutId?training?.workouts.find(entry=>entry.id===o.completedWorkoutId):undefined;
    const expanded=expandedSession===o.id;
    return <div key={o.id} className={"overflow-hidden rounded-2xl border bg-card shadow-sm transition-all "+(active?"border-primary/45 ring-1 ring-primary/15":pending?"border-amber-500/35":"border-border")}>
      <div className="flex items-center gap-3 p-3">
        <div className={"grid size-11 shrink-0 place-items-center rounded-xl "+(done?"bg-emerald-500/12 text-emerald-600":active?"bg-primary text-primary-foreground":skipped?"bg-secondary text-muted-foreground":"bg-secondary text-foreground")}>
          {done?<CheckCircle2 className="size-5"/>:skipped?<span className="text-xs font-black">—</span>:<span className="text-base font-black">{String.fromCharCode(65+o.position)}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className={"truncate text-sm font-extrabold "+(skipped?"text-muted-foreground":"text-foreground")}>{titleFor(o.templateId)}</p>
          <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">{w?.exercises.filter(e=>!e.note).length??0} exercises{estimate?" · "+estimate.label:""}{o.date?" · "+o.date:""}</p>
        </div>
        <span className={"shrink-0 rounded-full px-2 py-1 text-[0.62rem] font-extrabold "+(done?"bg-emerald-500/10 text-emerald-600":skipped?"bg-secondary text-muted-foreground":pending?"bg-amber-500/15 text-amber-700 dark:text-amber-300":active?"bg-primary/10 text-primary":"bg-secondary text-muted-foreground")}>{done?"Done":skipped?"Skipped":pending?"Pending":active?"Next":"Planned"}</span>
      </div>
      {done&&<div className="border-t border-border/70">
        <button type="button" className="flex min-h-11 w-full items-center justify-between px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-500/5" aria-expanded={expanded} onClick={()=>setExpandedSession(expanded?null:o.id)}>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4"/>{history?"View completed workout":"Workout details"}</span>{expanded?<ChevronUp className="size-4"/>:<ChevronDown className="size-4"/>}
        </button>
        {expanded&&<div className="space-y-3 bg-secondary/35 px-3 pb-4 pt-1">
          {history?<><div className="grid grid-cols-3 gap-2">
            <Stat label="Duration" value={Math.round(history.durationSec/60)+"m"}/>
            <Stat label="Exercises" value={String(history.exercises.length)}/>
            <Stat label="Sets" value={String(history.exercises.reduce((sum,ex)=>sum+ex.sets.length,0))}/>
          </div>
          <p className="text-[0.68rem] font-semibold text-muted-foreground">{new Date(history.startedAt).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}</p>
          <div className="space-y-2">{history.exercises.map(ex=><div key={ex.key} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-extrabold">{ex.name}</p>
            <div className="mt-2 space-y-1">{ex.sets.map((set,i)=><div key={i} className="flex items-center justify-between text-[0.7rem] text-muted-foreground"><span>Set {i+1}</span><span className="font-bold tabular-nums text-foreground">{set.kind==="cardio"?(set.durationSeconds??0)+" sec"+(set.distanceKm?" · "+set.distanceKm+" km":""):(set.weight+" kg × "+set.reps)}</span></div>)}</div>
          </div>)}</div>
          </>:<p className="py-2 text-xs text-muted-foreground">The completed workout record is unavailable. The session is still recorded as completed.</p>}
        </div>}
      </div>}
      {program.status==="active"&&o.status==="upcoming"&&<div className="flex items-center justify-between border-t border-border/70 px-3 py-2">
        <span className="text-[0.65rem] text-muted-foreground">{pending?"Missed date · still available":"Ready when you are"}</span>
        <div className="flex gap-2">
          {program.mode==="calendar"&&<input type="date" aria-label={"Reschedule "+titleFor(o.templateId)} className="h-8 max-w-28 rounded-lg border border-border bg-secondary px-1 text-[0.65rem]" value={o.date??""} onChange={e=>commit(updateOccurrence(program,o.id,{date:e.target.value||undefined}))}/>}
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={()=>{if(window.confirm("Skip this session? Skips won't count as completed."))commit(updateOccurrence(program,o.id,{status:"skipped"}));}}>Skip</Button>
          <Button variant="primary" size="sm" className="h-8" onClick={()=>startSession(o)}>Start</Button>
        </div>
      </div>}
    </div>;
  };
  return <div className="space-y-4 pb-8">
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft/>Programs</Button>
      <div className="relative">
        <Button variant="ghost" size="icon" aria-label="Manage program" onClick={()=>setManaging(v=>!v)}><MoreHorizontal/></Button>
        {managing&&<div className="absolute right-0 top-11 z-20 w-56 space-y-1 rounded-xl border border-border bg-card p-2 shadow-xl">
          <Button variant="ghost" className="w-full justify-start" onClick={()=>{setSwitching(v=>!v);setNewMode(program.mode);setManaging(false);}}><CalendarDays/>Change schedule</Button>
          {program.status!=="draft"&&<Button variant="ghost" className="w-full justify-start" onClick={()=>{commit({...program,status:program.status==="active"?"paused":"active"});setManaging(false);}}>{program.status==="active"?"Pause program":"Resume program"}</Button>}
        </div>}
      </div>
    </div>
    <div className="relative overflow-hidden rounded-[1.6rem] bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/15">
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full border-[28px] border-white/10"/>
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 size-56 rounded-full bg-white/[0.07] blur-2xl"/>
      <div className="relative">
        <div className="flex items-center justify-between"><span className="text-[0.63rem] font-extrabold uppercase tracking-[0.16em] opacity-80">YOUR TRAINING JOURNEY</span><span className={"rounded-full px-2.5 py-1 text-[0.65rem] font-extrabold capitalize "+(program.status==="active"?"bg-emerald-500/95 text-white shadow-sm":"border border-white/30 bg-white/15")}>{program.status==="active"?"● Active":program.status} · {program.mode}</span></div>
        <h2 className="mt-3 max-w-[95%] text-2xl font-black leading-tight tracking-tight">{program.name}</h2>
        <div className="mt-5 flex items-center gap-5">
          <div className="relative size-28 shrink-0">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
              <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="9"/>
              <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference*(1-percent/100)} style={{transition:"stroke-dashoffset 650ms ease"}}/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[1.5rem] font-black leading-none">{percent}%</span><span className="mt-1 text-[0.58rem] font-bold opacity-80">COMPLETE</span></div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-lg font-extrabold">Week {currentCycle+1} <span className="font-medium opacity-75">/ {program.weeks}</span></p>
            <p className="text-xs opacity-85">{stats.completed} of {stats.total} sessions completed</p>
            <p className="text-xs font-semibold opacity-85">{stats.skipped>0?stats.skipped+" skipped · ":""}{program.workouts.length} workouts each cycle</p>
            {stats.completed===0&&<span className="inline-flex rounded-full bg-white/15 px-2 py-1 text-[0.65rem] font-bold">Your journey starts here</span>}
          </div>
        </div>
      </div>
    </div>
    {program.status==="draft"&&<Button variant="primary" size="lg" className="w-full" onClick={activate}><Sparkles/>Activate this program</Button>}
    {switching&&<div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <p className="font-extrabold">Your schedule</p>
      <div className="grid grid-cols-2 gap-2">{(["flexible","calendar"] as const).map(m=><Button key={m} variant={m===newMode?"choiceActive":"choice"} onClick={()=>setNewMode(m)}>{m==="flexible"?"Flexible":"Calendar"}</Button>)}</div>
      {newMode==="calendar"&&<label className="block text-xs font-bold">Schedule from<input type="date" className="mt-1 h-10 w-full rounded-lg border border-border bg-secondary px-2" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>}
      <p className="text-xs text-muted-foreground">Existing results and skipped workouts stay exactly as they are.</p>
      <div className="grid grid-cols-2 gap-2"><Button variant="surface" onClick={()=>setSwitching(false)}>Cancel</Button><Button variant="primary" onClick={applySchedule}>Save schedule</Button></div>
    </div>}
    {next&&<div className="overflow-hidden rounded-[1.4rem] border border-primary/25 bg-card shadow-md shadow-primary/5">
      <div className="flex items-center justify-between bg-primary/10 px-4 py-2.5"><span className="flex items-center gap-1.5 text-[0.67rem] font-black uppercase tracking-widest text-primary"><Sparkles className="size-3.5"/>UP NEXT</span><span className="text-[0.65rem] font-bold text-primary">Workout {String.fromCharCode(65+next.position)}</span></div>
      <div className="p-4">
        <h3 className="text-xl font-black tracking-tight">{titleFor(next.templateId)}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{template(next.templateId)?.exercises.filter(e=>!e.note).map(e=>e.muscle).filter((m,i,a)=>a.indexOf(m)===i).join(" · ")}</p>
        <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-muted-foreground"><span className="flex items-center gap-1"><Dumbbell className="size-4 text-primary"/>{template(next.templateId)?.exercises.filter(e=>!e.note).length} exercises</span><span className="flex items-center gap-1"><Clock3 className="size-4 text-primary"/>{workoutTimeEstimate(template(next.templateId)?.exercises??[])?.label??"—"}</span></div>
        <Button variant="primary" size="lg" className="mt-4 w-full" disabled={program.status!=="active"} onClick={()=>startSession(next)}><Dumbbell/>Start this workout <ArrowRight/></Button>
      </div>
    </div>}
    <div className="space-y-3">
      <div className="flex items-center justify-between"><div><h3 className="text-lg font-black">Your weekly journey</h3><p className="text-[0.68rem] text-muted-foreground">One week at a time. Your pace.</p></div><span className="text-xs font-bold text-primary">{weekDone}/{week.length} done</span></div>
      <div className="flex items-center gap-2"><Button variant="surface" size="icon" aria-label="Previous week" disabled={cycle===0} onClick={()=>setSelectedCycle(cycle-1)}><ChevronLeft/></Button><div className="flex-1 text-center"><p className="text-sm font-extrabold">Week {cycle+1} of {program.weeks}</p><p className="text-[0.65rem] text-muted-foreground">{cycle===currentCycle?"Your current cycle":"Program timeline"}</p></div><Button variant="surface" size="icon" aria-label="Next week" disabled={cycle===program.weeks-1} onClick={()=>setSelectedCycle(cycle+1)}><ChevronRight/></Button></div>
      <div className="flex gap-1.5">{Array.from({length:program.weeks},(_,i)=>{
        const items=occurrences.filter(o=>o.cycle===i), complete=items.length>0&&items.every(o=>o.status==="completed");
        return <button key={i} type="button" aria-label={"Week "+(i+1)} aria-pressed={cycle===i} onClick={()=>setSelectedCycle(i)} className={"grid h-9 min-w-0 flex-1 place-items-center rounded-lg text-[0.7rem] font-extrabold transition-all "+(cycle===i?"bg-primary text-primary-foreground shadow-sm":complete?"bg-emerald-500/15 text-emerald-600":"bg-secondary text-muted-foreground")}>{complete?<Check className="size-3.5"/>:i+1}</button>;
      })}</div>
      <div className="space-y-2">{week.map(sessionCard)}</div>
      {week.length>0&&week.every(o=>o.status==="completed")&&<div className="rounded-xl bg-emerald-500/10 p-3 text-center text-sm font-bold text-emerald-600"><Sparkles className="mr-2 inline size-4"/>Week {cycle+1} complete — great work!</div>}
      {stats.pending>0&&<p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">{stats.pending} overdue session{stats.pending===1?"":"s"} waiting for you — never automatically skipped.</p>}
      <Button variant="ghost" className="w-full text-muted-foreground" onClick={()=>setShowAll(v=>!v)}>{showAll?"Hide":"Show"} full program timeline <ChevronRight className={"transition-transform "+(showAll?"rotate-90":"")}/></Button>
      {showAll&&<div className="space-y-3">{Array.from({length:program.weeks},(_,i)=>i).filter(i=>i!==cycle).map(i=><div key={i}><p className="mb-2 text-xs font-black text-muted-foreground">WEEK {i+1}</p><div className="space-y-2">{occurrences.filter(o=>o.cycle===i).map(sessionCard)}</div></div>)}</div>}
    </div>
  </div>;
}
