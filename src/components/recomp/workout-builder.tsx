import { Bookmark, CalendarPlus, Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { muscleGroups, quickSelects, type Muscle, type WorkoutExercise } from "@/data/exercises";
import { newId } from "@/lib/cloud-data";
import { defaultWorkoutName, deleteSavedWorkout, handOffWorkout, saveWorkout, useSavedWorkouts, type SavedWorkout } from "@/lib/workout-storage";
import { workoutTimeEstimate } from "@/lib/workout-time";
import { since, trainingPriority, useTrainingData } from "@/lib/training-data";
import { WorkoutEditor } from "./workout-editor";
import { SectionHeading } from "./core";
import { ScheduleSheet, scheduleNewWorkout } from "./schedule-sheet";

const DRAFT_KEY = "recomp-workout-builder-draft";
type BuilderDraft = { mode?: "generate" | "manual"; selected?: Muscle[]; count?: number; name?: string; workout?: WorkoutExercise[]; savedId?: string | null };
function readDraft(): BuilderDraft { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as BuilderDraft; } catch { return {}; } }
function patchDraft(patch: Partial<BuilderDraft>) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...readDraft(), ...patch })); } catch {} }
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} }

const chip = (active: boolean) => cn("h-8 shrink-0 rounded-full border px-3 text-[0.7rem] font-bold transition-colors", active ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15" : "border-border bg-card text-muted-foreground hover:bg-accent");

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={chip(active)}>{children}</button>;
}

export function WorkoutBuilder({ initialMode = "generate", floatingSelector = false }: { initialMode?: "generate" | "manual"; floatingSelector?: boolean }) {
  const [mode, setMode] = useState<"generate" | "manual">(() => readDraft().mode ?? initialMode);
  useEffect(() => { patchDraft({ mode }); }, [mode]);
  return <div className="space-y-4">
    <div className={cn("relative z-10 grid grid-cols-2 rounded-xl border border-primary/15 bg-card p-1 shadow-sm", floatingSelector && "-mt-5")}>
      {([["generate", "Generate"], ["manual", "Build your own"]] as const).map(([value, label]) => <Button key={value} variant={mode === value ? "segmentActive" : "segment"} className={cn(mode === value && "bg-card text-primary shadow-sm ring-1 ring-primary/15")} onClick={() => setMode(value)}>{label}</Button>)}
    </div>
    <RecentWorkoutNames />
    {mode === "generate" ? <GenerateMode /> : <ManualMode />}
  </div>;
}

function RecentWorkoutNames() {
  const training = useTrainingData();
  const showNew = Date.now() < new Date("2026-10-12T00:00:00+10:30").getTime();
  const recent = [...(training?.workouts ?? [])]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 5);
  if (!recent.length) return null;
  return <details className="-mt-1 rounded-xl border border-border bg-card px-3 py-2">
    <summary className="cursor-pointer select-none text-xs font-bold text-muted-foreground">Recent workouts {showNew && <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-wide text-primary">New</span>}</summary>
    <div className="mt-2 space-y-1 border-t border-border pt-2">
      {recent.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate font-semibold text-foreground">{item.name}</span>
        <span className="shrink-0 text-[0.65rem] text-muted-foreground">{new Date(item.startedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
      </div>)}
    </div>
  </details>;
}

function GenerateMode() {
  const navigate = useNavigate();
  const training = useTrainingData();
  const suggestions = trainingPriority(training?.workouts ?? [], since("4W")).slice().sort((a, b) => a.score - b.score).slice(0, 3);
  const [selected, setSelected] = useState<Muscle[]>(() => readDraft().selected ?? []);
  const [count, setCount] = useState(() => readDraft().count ?? 6);
  useEffect(() => { patchDraft({ selected, count }); }, [selected, count]);
  const toggle = (m: Muscle) => setSelected((c) => c.includes(m) ? c.filter((x) => x !== m) : [...c, m]);
  const quick = (muscles: Muscle[]) => setSelected((c) => muscles.every((m) => c.includes(m)) ? c.filter((m) => !muscles.includes(m)) : [...c, ...muscles.filter((m) => !c.includes(m))]);
  const summary = selected.length ? `${count} exercises • ${selected.slice(0, 3).join(" + ")}${selected.length > 3 ? ` +${selected.length - 3} more` : ""}` : `${count} exercises • choose muscles`;

  return <>
    <section>
      <SectionHeading>Muscles</SectionHeading>
      {suggestions.length > 0 && <p className="-mt-1 mb-2 text-[0.66rem] leading-snug text-muted-foreground"><span className="font-semibold text-foreground">Suggested:</span> {suggestions.map((item) => item.muscle).join(" · ")} <span className="opacity-80">· lower 4-week workload</span></p>}
      <div className="-mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4">{quickSelects.map((q) => <Chip key={q.label} active={q.muscles.every((m) => selected.includes(m))} onClick={() => quick(q.muscles)}>{q.label}</Chip>)}</div>
      <div className="grid grid-cols-2 gap-1.5">{muscleGroups.map((m) => { const a = selected.includes(m); return <Button key={m} variant={a ? "choiceActive" : "choice"} aria-pressed={a} onClick={() => toggle(m)} className={cn("h-9 justify-between px-3 transition-all", a && "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15")}>{m}{a && <Check />}</Button>; })}</div>
    </section>
    <section>
      <SectionHeading>Exercises</SectionHeading>
      <div className="grid grid-cols-6 gap-1.5 rounded-xl border border-primary/15 bg-primary/[0.045] p-1">{[3, 4, 5, 6, 7, 8].map((n) => <Button key={n} variant={count === n ? "segmentActive" : "segment"} className={cn("tabular-nums", count === n && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90")} onClick={() => setCount(n)}>{n}</Button>)}</div>
      <p className="mt-1.5 truncate text-[0.7rem] font-semibold text-muted-foreground">{summary}</p>
    </section>
    <Button variant="primary" size="lg" className="w-full shadow-sm" disabled={!selected.length} onClick={() => void navigate({ to: "/generated-workout", search: { muscles: selected.join(","), count, seed: Date.now() } })}>
      <Sparkles />Generate workout
    </Button>
  </>;
}

function ManualMode() {
  const navigate = useNavigate();
  const draft = readDraft();
  const [name, setName] = useState(() => draft.name ?? "");
  const [workout, setWorkout] = useState<WorkoutExercise[]>(() => draft.workout ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const saved = useSavedWorkouts();
  const [savedId, setSavedId] = useState<string | null>(() => draft.savedId ?? null);
  const training = useTrainingData();
  const suggestions = trainingPriority(training?.workouts ?? [], since("4W")).slice().sort((a, b) => a.score - b.score).slice(0, 3);
  const [suggestedMuscle, setSuggestedMuscle] = useState<Muscle | null>(null);
  useEffect(() => { patchDraft({ name, workout, savedId }); }, [name, workout, savedId]);
  const [scheduling, setScheduling] = useState(false);

  const finalName = name.trim() || defaultWorkoutName(workout);
  const estimate = workoutTimeEstimate(workout);
  const start = () => { handOffWorkout({ name: finalName, exercises: workout }); clearDraft(); void navigate({ to: "/workout" }); };
  const save = () => {
    const entry = { id: savedId ?? `saved-${newId()}`, name: finalName, exercises: workout, createdAt: Date.now() };
    saveWorkout(entry); setSavedId(entry.id); clearDraft(); toast.success("Workout saved");
  };
  const load = (item: SavedWorkout) => { setName(item.name); setWorkout(item.exercises.map((exercise) => ({ ...exercise }))); setSavedId(item.id); };
  const clearWorkout = () => {
    if (!window.confirm("Clear this workout? This will remove all exercises.")) return;
    setName("");
    setWorkout([]);
    setSavedId(null);
    setSuggestedMuscle(null);
    setPickerOpen(false);
    patchDraft({ name: "", workout: [], savedId: null });
    toast.success("Workout cleared");
  };

  return <>
    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Workout name (optional)" enterKeyHint="done" autoComplete="off" className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold outline-none placeholder:font-medium placeholder:text-muted-foreground focus:border-primary" />
    {suggestions.length > 0 && <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-center justify-between gap-2"><span className="text-[0.68rem] font-extrabold uppercase tracking-wide text-muted-foreground">Suggested today</span><span className="text-[0.62rem] text-muted-foreground">Lower workload over the last 4 weeks</span></div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto">{suggestions.map((item) => <button key={item.muscle} type="button" className="shrink-0 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs font-bold text-primary" onClick={() => { setSuggestedMuscle(item.muscle); setPickerOpen(true); }}>{item.muscle}</button>)}</div>
    </div>}
    {!workout.length && <button type="button" onClick={() => setPickerOpen(true)} className="grid h-28 w-full place-items-center rounded-2xl border border-dashed border-primary/40 bg-card text-primary transition-colors hover:bg-accent">
      <span className="flex items-center gap-2 font-display text-xl font-extrabold uppercase tracking-wide"><Plus className="size-5" />Add exercise</span>
    </button>}
    <div>
      <WorkoutEditor supersets workout={workout} setWorkout={setWorkout} pickerOpen={pickerOpen} onPickerOpenChange={(open) => { setPickerOpen(open); if (!open) setSuggestedMuscle(null); }} initialPickerMuscle={suggestedMuscle} />
    </div>
    {workout.length > 0 && <div className="space-y-2">
      <Button variant="primary" size="xl" className="w-full" onClick={start}>Start workout</Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="surface" onClick={() => setScheduling(true)}><CalendarPlus />Schedule</Button>
        <Button variant="surface" onClick={save}><Bookmark />Save</Button>
      </div>
      <Button variant="ghost" className="w-full text-muted-foreground" onClick={clearWorkout}><Trash2 />Clear workout</Button>
    </div>}
    <ScheduleSheet open={scheduling} onOpenChange={setScheduling} defaultName={finalName} onConfirm={(value) => { scheduleNewWorkout(value, workout, savedId ?? undefined); clearDraft(); void navigate({ to: "/" }); }} />
    {saved.length > 0 && <section>
      <SectionHeading>Saved</SectionHeading>
      <Card className="divide-y divide-border px-3">{saved.map((item) => <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <button type="button" onClick={() => load(item)} className="min-h-14 min-w-0 py-2 text-left"><span className="block text-sm font-bold leading-snug">{item.name}</span><span className="mt-0.5 block text-[0.7rem] text-muted-foreground">{item.exercises.length} exercises</span></button>
        <button type="button" aria-label={`Delete ${item.name}`} onClick={() => { deleteSavedWorkout(item.id); if (savedId === item.id) setSavedId(null); }} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent"><Trash2 className="size-4" /></button>
      </div>)}</Card>
    </section>}
  </>;
}
