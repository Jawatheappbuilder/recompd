import { Check, ChevronDown, ChevronUp, Minus, Plus, Search, Sparkles, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { equipmentTypes, exercises, muscleGroups, quickSelects, toWorkoutExercise, type Equipment, type Muscle, type WorkoutExercise } from "@/data/exercises";
import { SectionHeading } from "./core";

const chip = (active: boolean) => cn("h-8 shrink-0 rounded-full border px-3 text-[0.7rem] font-bold transition-colors", active ? "border-primary bg-accent text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent");

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={chip(active)}>{children}</button>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-border px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-muted-foreground">{children}</span>;
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
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [workout, setWorkout] = useState<WorkoutExercise[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState<Muscle>("Chest");

  const results = useMemo(() => exercises.filter((e) => (!muscle || e.muscle === muscle) && (!equipment || e.equipment === equipment) && e.name.toLowerCase().includes(query.toLowerCase())), [query, muscle, equipment]);
  const selectedIds = new Set(workout.map((e) => e.id));
  const toggle = (id: string) => setWorkout((w) => w.some((e) => e.id === id) ? w.filter((e) => e.id !== id) : [...w, toWorkoutExercise(exercises.find((e) => e.id === id)!)]);
  const update = (key: string, patch: Partial<WorkoutExercise>) => setWorkout((w) => w.map((e) => e.key === key ? { ...e, ...patch } : e));
  const move = (i: number, d: number) => setWorkout((w) => { const n = [...w]; const j = i + d; if (j < 0 || j >= n.length) return w; const t = n[i]!; n[i] = n[j]!; n[j] = t; return n; });
  const addCustom = () => { if (!customName.trim()) return; setWorkout((w) => [...w, toWorkoutExercise({ id: `custom-${Date.now()}`, name: customName.trim(), muscle: customMuscle, equipment: "Bodyweight", type: "Isolation" })]); setCustomName(""); setCustomOpen(false); };

  return <>
    {workout.length > 0 && <section className="animate-screen">
      <SectionHeading action={<span className="text-xs font-semibold text-muted-foreground">{workout.length} selected</span>}>Your workout</SectionHeading>
      <Card className="divide-y divide-border px-3">{workout.map((e, i) => <div key={e.key} className="py-2.5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <div className="flex flex-col">
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="text-muted-foreground disabled:opacity-30"><ChevronUp className="size-4" /></button>
            <button type="button" aria-label="Move down" disabled={i === workout.length - 1} onClick={() => move(i, 1)} className="text-muted-foreground disabled:opacity-30"><ChevronDown className="size-4" /></button>
          </div>
          <div className="min-w-0"><div className="truncate text-sm font-bold">{e.name}</div><div className="mt-0.5 text-[0.7rem] text-muted-foreground">{e.muscle} · {e.equipment}</div></div>
          <button type="button" aria-label={`Remove ${e.name}`} onClick={() => setWorkout((w) => w.filter((x) => x.key !== e.key))} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
        </div>
        <div className="mt-2 flex items-center gap-2 pl-6">
          <div className="flex items-center rounded-lg border border-border bg-secondary">
            <button type="button" aria-label="Fewer sets" onClick={() => update(e.key, { sets: Math.max(1, e.sets - 1) })} className="grid size-8 place-items-center text-muted-foreground"><Minus className="size-3.5" /></button>
            <span className="w-12 text-center text-xs font-bold tabular-nums">{e.sets} sets</span>
            <button type="button" aria-label="More sets" onClick={() => update(e.key, { sets: Math.min(10, e.sets + 1) })} className="grid size-8 place-items-center text-muted-foreground"><Plus className="size-3.5" /></button>
          </div>
          <label className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 text-xs font-bold text-muted-foreground">
            <span>Reps</span><input aria-label="Rep target" value={e.reps} onChange={(ev) => update(e.key, { reps: ev.target.value })} className="w-12 bg-transparent text-foreground tabular-nums outline-none" />
          </label>
        </div>
      </div>)}</Card>
      <Button variant="primary" size="xl" className="mt-4 w-full">Start workout</Button>
    </section>}

    <section>
      <SectionHeading action={<button type="button" onClick={() => setCustomOpen((o) => !o)} className="flex items-center gap-1 text-xs font-bold text-primary"><Plus className="size-3.5" />Custom</button>}>Library</SectionHeading>
      {customOpen && <Card className="animate-screen mb-3 space-y-2.5 p-3">
        <input autoFocus value={customName} onChange={(e) => setCustomName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()} placeholder="Exercise name" className="h-10 w-full rounded-lg border border-border bg-secondary px-3 text-sm outline-none focus:border-primary" />
        <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3">{muscleGroups.map((m) => <Chip key={m} active={customMuscle === m} onClick={() => setCustomMuscle(m)}>{m}</Chip>)}</div>
        <Button variant="primary" className="h-10 w-full" disabled={!customName.trim()} onClick={addCustom}>Add</Button>
      </Card>}
      <div className="relative mb-2.5"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
      <div className="-mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 pb-1">{muscleGroups.map((m) => <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>{m}</Chip>)}</div>
      <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">{equipmentTypes.map((q) => <Chip key={q} active={equipment === q} onClick={() => setEquipment(equipment === q ? null : q)}>{q}</Chip>)}</div>
      <Card className="divide-y divide-border px-4">{results.length ? results.map((e) => { const a = selectedIds.has(e.id); return <button key={e.id} type="button" aria-pressed={a} onClick={() => toggle(e.id)} className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 text-left">
        <div className="min-w-0"><div className={cn("truncate text-sm font-bold", a && "text-primary")}>{e.name}</div><div className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground"><span>{e.muscle} · {e.equipment}</span><Tag>{e.type}</Tag></div></div>
        <span className={cn("grid size-7 place-items-center rounded-full border", a ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{a ? <Check className="size-3.5" strokeWidth={3} /> : <Plus className="size-3.5" />}</span>
      </button>; }) : <div className="py-6 text-center text-sm text-muted-foreground">No matches</div>}</Card>
    </section>
  </>;
}
