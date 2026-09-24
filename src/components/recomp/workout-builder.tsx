import { Bookmark, Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { muscleGroups, quickSelects, type Muscle, type WorkoutExercise } from "@/data/exercises";
import { newId } from "@/lib/cloud-data";
import { defaultWorkoutName, deleteSavedWorkout, handOffWorkout, saveWorkout, useSavedWorkouts, type SavedWorkout } from "@/lib/workout-storage";
import { WorkoutEditor } from "./workout-editor";
import { SectionHeading } from "./core";

const chip = (active: boolean) => cn("h-8 shrink-0 rounded-full border px-3 text-[0.7rem] font-bold transition-colors", active ? "border-primary bg-accent text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent");

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={chip(active)}>{children}</button>;
}

export function WorkoutBuilder({ initialMode = "generate" }: { initialMode?: "generate" | "manual" }) {
  const [mode, setMode] = useState(initialMode);
  return <div className="space-y-4">
    <div className="grid grid-cols-2 rounded-xl border border-border bg-secondary p-1">
      {([["generate", "Generate"], ["manual", "Build your own"]] as const).map(([value, label]) => <Button key={value} variant={mode === value ? "segmentActive" : "segment"} onClick={() => setMode(value)}>{label}</Button>)}
    </div>
    {mode === "generate" ? <GenerateMode /> : <ManualMode />}
  </div>;
}

function GenerateMode() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Muscle[]>(["Chest", "Back"]);
  const [count, setCount] = useState(6);
  const toggle = (m: Muscle) => setSelected((c) => c.includes(m) ? c.filter((x) => x !== m) : [...c, m]);
  const quick = (muscles: Muscle[]) => setSelected((c) => muscles.every((m) => c.includes(m)) ? c.filter((m) => !muscles.includes(m)) : [...c, ...muscles.filter((m) => !c.includes(m))]);
  const summary = selected.length ? `${count} exercises • ${selected.slice(0, 3).join(" + ")}${selected.length > 3 ? ` +${selected.length - 3} more` : ""}` : `${count} exercises • choose muscles`;

  return <>
    <section>
      <SectionHeading>Muscles</SectionHeading>
      <div className="-mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4">{quickSelects.map((q) => <Chip key={q.label} active={q.muscles.every((m) => selected.includes(m))} onClick={() => quick(q.muscles)}>{q.label}</Chip>)}</div>
      <div className="grid grid-cols-2 gap-1.5">{muscleGroups.map((m) => { const a = selected.includes(m); return <Button key={m} variant={a ? "choiceActive" : "choice"} onClick={() => toggle(m)} className="h-9 justify-between px-3">{m}{a && <Check />}</Button>; })}</div>
    </section>
    <section>
      <SectionHeading>Exercises</SectionHeading>
      <div className="grid grid-cols-6 gap-1.5 rounded-xl border border-border bg-secondary p-1">{[3, 4, 5, 6, 7, 8].map((n) => <Button key={n} variant={count === n ? "segmentActive" : "segment"} className={cn("tabular-nums", count === n && "text-primary")} onClick={() => setCount(n)}>{n}</Button>)}</div>
      <p className="mt-1.5 truncate text-[0.7rem] font-semibold text-muted-foreground">{summary}</p>
    </section>
    <Button variant="primary" size="lg" className="w-full" disabled={!selected.length} onClick={() => void navigate({ to: "/generated-workout", search: { muscles: selected.join(","), count, seed: Date.now() } })}>
      <Sparkles />Generate workout
    </Button>
  </>;
}

function ManualMode() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [workout, setWorkout] = useState<WorkoutExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const saved = useSavedWorkouts();
  const [savedId, setSavedId] = useState<string | null>(null);

  const finalName = name.trim() || defaultWorkoutName(workout);
  const start = () => { handOffWorkout({ name: finalName, exercises: workout }); void navigate({ to: "/workout" }); };
  const save = () => {
    const entry = { id: savedId ?? `saved-${newId()}`, name: finalName, exercises: workout, createdAt: Date.now() };
    saveWorkout(entry); setSavedId(entry.id); toast.success("Workout saved");
  };
  const load = (item: SavedWorkout) => { setName(item.name); setWorkout(item.exercises.map((exercise) => ({ ...exercise }))); setSavedId(item.id); };

  return <>
    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Workout name (optional)" enterKeyHint="done" autoComplete="off" className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold outline-none placeholder:font-medium placeholder:text-muted-foreground focus:border-primary" />
    {!workout.length && <button type="button" onClick={() => setPickerOpen(true)} className="grid h-28 w-full place-items-center rounded-2xl border border-dashed border-primary/40 bg-card text-primary transition-colors hover:bg-accent">
      <span className="flex items-center gap-2 font-display text-xl font-extrabold uppercase tracking-wide"><Plus className="size-5" />Add exercise</span>
    </button>}
    <div>
      <WorkoutEditor supersets workout={workout} setWorkout={setWorkout} pickerOpen={pickerOpen} onPickerOpenChange={setPickerOpen} />
    </div>
    {workout.length > 0 && <div className="space-y-2">
      <Button variant="primary" size="xl" className="w-full" onClick={start}>Start workout</Button>
      <Button variant="surface" className="w-full" onClick={save}><Bookmark />Save workout</Button>
    </div>}
    {saved.length > 0 && <section>
      <SectionHeading>Saved</SectionHeading>
      <Card className="divide-y divide-border px-3">{saved.map((item) => <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <button type="button" onClick={() => load(item)} className="min-h-14 min-w-0 py-2 text-left"><span className="block text-sm font-bold leading-snug">{item.name}</span><span className="mt-0.5 block text-[0.7rem] text-muted-foreground">{item.exercises.length} exercises</span></button>
        <button type="button" aria-label={`Delete ${item.name}`} onClick={() => { deleteSavedWorkout(item.id); if (savedId === item.id) setSavedId(null); }} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent"><Trash2 className="size-4" /></button>
      </div>)}</Card>
    </section>}
  </>;
}
