import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Screen } from "@/components/recomp/core";
import { SettingsHeader } from "@/components/recomp/settings-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { exerciseInstructions } from "@/data/exercise-instructions";
import { exercises, equipmentTypes, muscleGroups, muscleLabel, isTimedHold, isCardioExercise, type Exercise } from "@/data/exercises";
import { useCustomExercises } from "@/lib/workout-storage";

export const Route = createFileRoute("/settings/glossary")({
  head: () => ({ meta: [{ title: "Exercise glossary — RECOMP'D" }, { name: "description", content: "Browse exercises by muscle group and equipment." }] }),
  component: ExerciseGlossary,
});

function ExerciseGlossary() {
  const custom = useCustomExercises();
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("All");
  const [equipment, setEquipment] = useState("All");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const all = useMemo(() => [...exercises, ...custom].sort((a, b) => a.name.localeCompare(b.name)), [custom]);
  const filtered = useMemo(() => all.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesMuscle = muscle === "All" || (muscle === "Cardio" ? isCardioExercise(exercise) : !isCardioExercise(exercise) && (exercise.muscle === muscle || exercise.muscles?.some((m) => m === muscle)));
    return matchesSearch && matchesMuscle && (equipment === "All" || exercise.equipment === equipment);
  }), [all, search, muscle, equipment]);

  return <Screen>
    <SettingsHeader title="Exercise glossary" subtitle="Explore movements and the muscles they work" />
    <div className="space-y-4">
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search exercises" aria-label="Search exercises" className="h-11 rounded-xl bg-card pl-10 pr-10" />{search && <button aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setSearch("")}><X className="size-4" /></button>}</div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filter by muscle group">{["All", ...muscleGroups, "Cardio"].map((item) => <button key={item} type="button" aria-pressed={muscle === item} onClick={() => setMuscle(item)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${muscle === item ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{item}</button>)}</div>
      <label className="flex items-center justify-between gap-3 text-xs font-bold text-muted-foreground">Equipment <select aria-label="Filter by equipment" value={equipment} onChange={(event) => setEquipment(event.target.value)} className="max-w-[65%] rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground"><option>All</option>{equipmentTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
      <p className="text-xs font-semibold text-muted-foreground">{filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}</p>
      {filtered.length ? <Card className="divide-y divide-border overflow-hidden px-3">{filtered.map((exercise) => <button key={exercise.id} type="button" onClick={() => setSelected(exercise)} className="flex min-h-16 w-full items-center gap-3 py-3 text-left"><div className="min-w-0 flex-1"><div className="text-sm font-extrabold">{exercise.name}</div><div className="mt-1 text-xs text-muted-foreground">{muscleLabel(exercise)} · {exercise.equipment}</div></div><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></button>)}</Card> : <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No matching exercises. Try another search or filter.</div>}
    </div>
    <Drawer open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}><DrawerContent className="mx-auto max-h-[85dvh] max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="text-left"><DrawerTitle>{selected?.name}</DrawerTitle></DrawerHeader>{selected && <div className="space-y-4 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{isCardioExercise(selected) ? "Cardio" : selected.muscle}</span><span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{selected.equipment}</span>{selected.custom && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Custom</span>}</div><div><h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Muscles worked</h3><p className="mt-2 text-sm font-semibold">{muscleLabel(selected)}</p><p className="mt-1 text-xs text-muted-foreground">Listed muscles reflect the app's exercise categories, not a complete anatomical breakdown.</p></div><div><h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tracking</h3><p className="mt-2 text-sm">{isCardioExercise(selected) ? "Cardio metrics" : isTimedHold(selected) ? "Hold duration in seconds" : "Weight and repetitions"}</p></div>{(() => { const instructions = exerciseInstructions(selected); return instructions ? <section className="space-y-3 border-t border-border pt-4"><h3 className="text-sm font-extrabold">How to perform</h3><div><h4 className="text-xs font-bold uppercase tracking-wider text-primary">Setup</h4><p className="mt-1 text-sm leading-relaxed">{instructions.setup}</p></div><div><h4 className="text-xs font-bold uppercase tracking-wider text-primary">Steps</h4><ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed">{instructions.steps.map((step, index) => <li key={index}>{step}</li>)}</ol></div><div className="rounded-xl bg-primary/5 p-3"><h4 className="text-xs font-bold uppercase tracking-wider text-primary">Form tip</h4><p className="mt-1 text-sm leading-relaxed">{instructions.tips}</p></div></section> : <p className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">Detailed technique guidance is not yet available for this exercise. Ask a qualified trainer if you're unsure of the movement.</p>; })()}<Button variant="surface" className="w-full" onClick={() => setSelected(null)}>Close</Button></div>}</DrawerContent></Drawer>
  </Screen>;
}
