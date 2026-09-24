import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Screen } from "@/components/recomp/core";
import { SettingsHeader } from "@/components/recomp/settings-ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { equipmentTypes, muscleGroups, muscleLabel, type Equipment, type Exercise, type Muscle } from "@/data/exercises";
import { deleteCustomExercise, updateCustomExercise, useCustomExercises } from "@/lib/workout-storage";

export const Route = createFileRoute("/settings/exercises")({
  head: () => ({ meta: [{ title: "Custom Exercises — RECOMP'D" }, { name: "description", content: "Manage exercises you created in RECOMP'D." }, { property: "og:title", content: "Custom Exercises — RECOMP'D" }, { property: "og:description", content: "Manage your custom RECOMP'D exercises." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CustomExercisesPage,
});

function CustomExercisesPage() {
  const items = useCustomExercises(); const [editing, setEditing] = useState<Exercise | null>(null); const [removing, setRemoving] = useState<Exercise | null>(null);
  return <Screen><SettingsHeader title="Custom Exercises" subtitle={`${items.length} created`} />
    {items.length ? <Card className="divide-y divide-border px-4">{items.map((exercise) => <div key={exercise.id} className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 py-2"><div className="min-w-0"><div className="truncate text-sm font-extrabold">{exercise.name}</div><div className="mt-1 truncate text-[0.7rem] text-muted-foreground">{muscleLabel(exercise)} · {exercise.equipment}</div></div><Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={`Edit ${exercise.name}`} onClick={() => setEditing(exercise)}><Pencil /></Button><Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={`Delete ${exercise.name}`} onClick={() => setRemoving(exercise)}><Trash2 /></Button></div>)}</Card> : <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-border px-8 text-center"><div><span className="mx-auto grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground"><Plus /></span><h2 className="mt-3 text-sm font-bold">No custom exercises</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Exercises you create in Build Your Own will appear here.</p></div></div>}
    <EditExerciseDrawer exercise={editing} onClose={() => setEditing(null)} onSave={(exercise) => { updateCustomExercise(exercise); setEditing(null); }} />
    <AlertDialog open={!!removing} onOpenChange={(open) => { if (!open) setRemoving(null); }}><AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl bg-popover"><AlertDialogHeader><AlertDialogTitle>Delete custom exercise?</AlertDialogTitle><AlertDialogDescription>{removing ? `${removing.name} will be removed from your custom exercise library.` : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (removing) deleteCustomExercise(removing.id); setRemoving(null); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </Screen>;
}

function EditExerciseDrawer({ exercise, onClose, onSave }: { exercise: Exercise | null; onClose: () => void; onSave: (exercise: Exercise) => void }) {
  const [name, setName] = useState(""); const [equipment, setEquipment] = useState<Equipment>("Dumbbell"); const [muscles, setMuscles] = useState<Muscle[]>([]);
  useEffect(() => { if (exercise) { setName(exercise.name); setEquipment(exercise.equipment); setMuscles(exercise.muscles?.length ? exercise.muscles : [exercise.muscle]); } }, [exercise]);
  const first = muscles[0];
  return <Drawer open={!!exercise} onOpenChange={(open) => { if (!open) onClose(); }}><DrawerContent className="mx-auto h-[82dvh] max-w-[430px] rounded-t-2xl bg-popover"><DrawerHeader className="pb-2 text-left"><DrawerTitle>Edit custom exercise</DrawerTitle></DrawerHeader><div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
    <label className="text-xs font-bold text-muted-foreground">Name<Input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 rounded-xl bg-secondary text-foreground" /></label>
    <div><div className="mb-2 text-xs font-bold text-muted-foreground">Muscle groups</div><div className="grid grid-cols-2 gap-1.5">{muscleGroups.map((muscle) => { const active = muscles.includes(muscle); return <Button key={muscle} variant={active ? "choiceActive" : "choice"} className="h-10 justify-between px-3" onClick={() => setMuscles((current) => active ? current.filter((item) => item !== muscle) : [...current, muscle])}>{muscle}{active && <Check />}</Button>; })}</div></div>
    <div><div className="mb-2 text-xs font-bold text-muted-foreground">Equipment</div><div className="grid grid-cols-2 gap-1.5">{equipmentTypes.map((item) => <Button key={item} variant={equipment === item ? "choiceActive" : "choice"} className="h-10 px-2 text-xs" onClick={() => setEquipment(item)}>{item}</Button>)}</div></div>
    <Button variant="primary" size="lg" className="mt-auto w-full" disabled={!exercise || !name.trim() || !first} onClick={() => { if (exercise && first) onSave({ ...exercise, name: name.trim(), equipment, muscle: first, muscles }); }}>Save changes</Button>
  </div></DrawerContent></Drawer>;
}