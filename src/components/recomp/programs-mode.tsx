import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateWorkout, muscleGroups, type Muscle, type WorkoutExercise } from "@/data/exercises";
import { newId } from "@/lib/cloud-data";
import { cloneExercises, useSavedWorkouts } from "@/lib/workout-storage";
import { deleteProgramDraft, loadProgramDrafts, programsChangedEvent, saveProgramDraft, type ProgramWorkout, type TrainingProgram } from "@/lib/program-storage";
import { WorkoutEditor } from "./workout-editor";

const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const createDraft = (): TrainingProgram => ({
  id: newId(), name: "", goal: "Strength", weeks: 8, mode: "flexible",
  startDate: today(), weekdays: [1, 3, 5], status: "draft",
  workouts: [], createdAt: Date.now(), updatedAt: Date.now(),
});
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ProgramsMode() {
  const saved = useSavedWorkouts();
  const [drafts, setDrafts] = useState(loadProgramDrafts);
  const [current, setCurrent] = useState<TrainingProgram | null>(null);
  const [step, setStep] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [muscle, setMuscle] = useState<Muscle>("Chest");

  useEffect(() => {
    const refresh = () => setDrafts(loadProgramDrafts());
    window.addEventListener(programsChangedEvent, refresh);
    return () => window.removeEventListener(programsChangedEvent, refresh);
  }, []);
  const update = (patch: Partial<TrainingProgram>) => setCurrent((value) => value ? { ...value, ...patch } : value);
  const updateWorkout = (id: string, patch: Partial<ProgramWorkout>) => setCurrent((value) => value ? {
    ...value, workouts: value.workouts.map((item) => item.id === id ? { ...item, ...patch } : item),
  } : value);
  const append = (workout: Omit<ProgramWorkout, "id">) => {
    setCurrent((value) => value ? { ...value, workouts: [...value.workouts, { ...workout, id: newId() }] } : value);
    setAdding(false);
  };
  const persist = () => {
    if (!current) return;
    if (!current.name.trim()) { toast.error("Give your program a name."); setStep(1); return; }
    if (current.workouts.length < 2 || current.workouts.length > 5 || current.workouts.some((item) => !item.exercises.some((ex) => !ex.note))) {
      toast.error("Add 2–5 workouts with at least one exercise each."); setStep(2); return;
    }
    if (current.mode === "calendar" && current.weekdays.length !== current.workouts.length) {
      toast.error("Select one training day per workout."); setStep(1); return;
    }
    saveProgramDraft({ ...current, name: current.name.trim(), status: "draft", updatedAt: Date.now() });
    toast.success("Program draft saved on this device");
    setCurrent(null);
    setStep(1);
    setEditing(null);
  };
  if (!current) return <div className="space-y-3">
    <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">My Programs</h2><Button variant="primary" size="sm" onClick={() => { setCurrent(createDraft()); setStep(1); }}><Plus/>New program</Button></div>
    <p className="text-xs text-muted-foreground">Create and edit repeating workout plans. Drafts are saved on this device. Activating a program and syncing it across devices will come in the next phase.</p>
    {drafts.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No program drafts yet. Create your first program above.</div>}
    {drafts.map((item) => <div key={item.id} className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-bold">{item.name}</h3><p className="mt-1 text-xs text-muted-foreground">{item.weeks} weeks · {item.workouts.length} workouts · {item.mode === "calendar" ? "Calendar" : "Flexible"}</p></div><span className="rounded-lg bg-secondary px-2 py-1 text-[0.65rem] font-bold text-muted-foreground">Draft</span></div>
      <div className="mt-3 flex gap-2"><Button variant="surface" className="flex-1" onClick={() => { setCurrent(structuredClone(item)); setStep(1); }}><Pencil/>Edit draft</Button><Button variant="ghost" size="icon" aria-label={`Delete ${item.name}`} onClick={() => { if (window.confirm(`Delete "${item.name}"?`)) deleteProgramDraft(item.id); }}><Trash2/></Button></div>
    </div>)}
  </div>;

  const item = current.workouts.find((w) => w.id === editing);
  if (item) return <div className="space-y-3">
    <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><ArrowLeft/>Back to program</Button>
    <input aria-label="Workout name" className="h-11 w-full rounded-xl border border-border bg-card px-3 font-bold" value={item.name} onChange={(event) => updateWorkout(item.id, { name: event.target.value })}/>
    <WorkoutEditor workout={item.exercises} setWorkout={(updateValue) => setCurrent((value) => {
      if (!value) return value;
      return { ...value, workouts: value.workouts.map((workout) => workout.id === item.id ? { ...workout, exercises: typeof updateValue === "function" ? updateValue(workout.exercises) : updateValue } : workout) };
    })}/>
    <Button variant="primary" className="w-full" onClick={() => setEditing(null)}>Done editing</Button>
  </div>;

  return <div className="space-y-4">
    <div className="flex items-center justify-between"><Button variant="ghost" size="sm" onClick={() => { setCurrent(null); setAdding(false); }}><ArrowLeft/>Programs</Button><span className="text-xs font-bold text-muted-foreground">Step {step} of 3</span></div>
    {step === 1 && <div className="space-y-3">
      <h2 className="text-lg font-extrabold">Program details</h2>
      <label className="block text-xs font-bold">Program name<input className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm" value={current.name} onChange={(event) => update({ name: event.target.value })} placeholder="e.g. Upper / Lower Strength"/></label>
      <label className="block text-xs font-bold">Training goal<select className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3" value={current.goal} onChange={(event) => update({ goal: event.target.value as TrainingProgram["goal"] })}>{["Strength","Hypertrophy","Fat loss","General fitness"].map((v) => <option key={v}>{v}</option>)}</select></label>
      <label className="block text-xs font-bold">Duration<select className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3" value={current.weeks} onChange={(event) => update({ weeks: Number(event.target.value) })}>{[4,5,6,7,8,9,10,11,12].map((w) => <option key={w} value={w}>{w} weeks</option>)}</select></label>
      <p className="text-xs font-bold">Scheduling mode</p>
      <div className="grid grid-cols-2 gap-2">{(["flexible","calendar"] as const).map((mode) => <Button key={mode} variant={current.mode===mode?"choiceActive":"choice"} onClick={() => update({mode})}>{mode==="flexible"?"Flexible":"Calendar"}</Button>)}</div>
      {current.mode==="calendar" && <>
        <label className="block text-xs font-bold">Start date<input type="date" className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3" value={current.startDate} onChange={(event)=>update({startDate:event.target.value})}/></label>
        <p className="text-xs font-bold">Training days ({current.weekdays.length} selected; must match number of workouts)</p>
        <div className="grid grid-cols-7 gap-1">{dayLabels.map((day,i)=><Button key={day} size="sm" className="px-0 text-xs" variant={current.weekdays.includes(i)?"choiceActive":"choice"} onClick={()=>update({weekdays:current.weekdays.includes(i)?current.weekdays.filter(v=>v!==i):[...current.weekdays,i].sort()})}>{day}</Button>)}</div>
      </>}
      <Button variant="primary" className="w-full" disabled={!current.name.trim()} onClick={() => setStep(2)}>Next: workouts</Button>
    </div>}
    {step === 2 && <div className="space-y-3">
      <h2 className="text-lg font-extrabold">Workout templates</h2>
      <p className="text-xs text-muted-foreground">Add 2–5 workouts. These same templates repeat every program week.</p>
      {current.workouts.map((w,i)=><div key={w.id} className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2"><span className="text-xs font-bold text-muted-foreground">{i+1}.</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{w.name}</p><p className="text-xs text-muted-foreground">{w.exercises.filter(ex=>!ex.note).length} exercises</p></div><Button variant="ghost" size="icon" aria-label="Move workout up" disabled={i===0} onClick={()=>update({workouts:move(current.workouts,i,i-1)})}><ArrowUp/></Button><Button variant="ghost" size="icon" aria-label="Move workout down" disabled={i===current.workouts.length-1} onClick={()=>update({workouts:move(current.workouts,i,i+1)})}><ArrowDown/></Button></div>
        <div className="mt-2 flex gap-2"><Button variant="surface" className="flex-1" size="sm" onClick={()=>setEditing(w.id)}><Pencil/>Edit</Button><Button variant="ghost" size="sm" onClick={()=>update({workouts:current.workouts.filter(x=>x.id!==w.id)})}><Trash2/>Remove</Button></div>
      </div>)}
      {current.workouts.length<5 && <Button variant="surface" className="w-full" onClick={()=>setAdding(v=>!v)}><Plus/>Add workout</Button>}
      {adding && <div className="space-y-2 rounded-xl border border-primary/25 bg-card p-3">
        <p className="text-xs font-bold">Add from saved workouts</p>
        {saved.map(w=><Button key={w.id} variant="ghost" className="w-full justify-start" onClick={()=>append({name:w.name,exercises:cloneExercises(w.exercises)})}>{w.name}</Button>)}
        <p className="text-xs font-bold">Or generate a template</p>
        <select aria-label="Muscle group" className="h-10 w-full rounded-xl border border-border bg-secondary px-2" value={muscle} onChange={e=>setMuscle(e.target.value as Muscle)}>{muscleGroups.map(m=><option key={m}>{m}</option>)}</select>
        <Button variant="surface" className="w-full" onClick={()=>append({name:`${muscle} Day`,exercises:generateWorkout([muscle],5,Date.now())})}>Generate 5 exercises</Button>
        <Button variant="surface" className="w-full" onClick={()=>append({name:`Workout ${current.workouts.length+1}`,exercises:[]})}>Build from scratch</Button>
      </div>}
      <div className="grid grid-cols-2 gap-2"><Button variant="surface" onClick={()=>setStep(1)}>Back</Button><Button variant="primary" disabled={current.workouts.length<2 || current.workouts.some(w=>!w.exercises.some(ex=>!ex.note))} onClick={()=>setStep(3)}>Review</Button></div>
    </div>}
    {step===3 && <div className="space-y-3">
      <h2 className="text-lg font-extrabold">Review program</h2>
      <div className="rounded-xl border border-border bg-card p-3"><p className="font-bold">{current.name}</p><p className="mt-1 text-xs text-muted-foreground">{current.weeks} weeks · {current.mode==="calendar"?"Calendar":"Flexible"} · {current.goal}</p></div>
      {current.workouts.map((w,i)=><div key={w.id} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-3 text-sm"><span>{i+1}. {w.name}</span><span className="text-xs text-muted-foreground">{w.exercises.filter(ex=>!ex.note).length} exercises</span></div>)}
      <p className="text-xs text-muted-foreground">Total planned sessions: {current.weeks*current.workouts.length}. This saves a draft only; program activation will be added in Phase 2.</p>
      <div className="grid grid-cols-2 gap-2"><Button variant="surface" onClick={()=>setStep(2)}>Back</Button><Button variant="primary" onClick={persist}><Save/>Save draft</Button></div>
    </div>}
  </div>;
}
function move<T>(items:T[],from:number,to:number):T[]{const next=[...items];const [item]=next.splice(from,1);if(item!==undefined)next.splice(to,0,item);return next;}
