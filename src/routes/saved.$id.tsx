import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShareLinkButton } from "@/components/recomp/share-link-button";
import { Screen } from "@/components/recomp/core";
import { ScheduleSheet, scheduleNewWorkout } from "@/components/recomp/schedule-sheet";
import { BackLink, ConfirmDelete, ExerciseList, PlanEditor, PlanHeader } from "@/components/recomp/workout-plan-view";
import { useCloudData } from "@/lib/cloud-data";
import { deleteSavedWorkout, handOffWorkout, hasActiveWorkout, saveWorkout } from "@/lib/workout-storage";

export const Route = createFileRoute("/saved/$id")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Saved Workout — RECOMP'D" }, { name: "description", content: "Preview, start, schedule or edit a saved workout." },
    { property: "og:title", content: "Saved Workout — RECOMP'D" }, { property: "og:description", content: "Preview, start, schedule or edit a saved workout." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SavedWorkoutPage,
});

function SavedWorkoutPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const data = useCloudData();
  const item = data?.saved.find((s) => s.id === id);
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (!data) return <Screen>{null}</Screen>;
  if (!item) return <Screen><PlanHeader back={<BackLink to="/saved" label="Back to saved workouts" />} title="Workout not found" /></Screen>;
  if (editing) return <Screen><PlanEditor initial={item.exercises} onCancel={() => setEditing(false)} onSave={(exercises) => { saveWorkout({ ...item, exercises }); setEditing(false); toast.success("Workout updated"); }} /></Screen>;

  const start = () => {
    if (hasActiveWorkout()) { toast("Finish your current workout first"); void navigate({ to: "/workout" }); return; }
    handOffWorkout({ name: item.name, exercises: item.exercises.map((e) => structuredClone(e)) }); void navigate({ to: "/workout" });
  };
  return <Screen>
    <PlanHeader back={<BackLink to="/saved" label="Back to saved workouts" />} title={item.name} subtitle={`${item.exercises.length} exercises`} />
    <ExerciseList exercises={item.exercises} />
    <div className="mt-4 space-y-2">
      <Button variant="primary" size="xl" className="w-full" disabled={!item.exercises.length} onClick={start}>Start workout</Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="surface" onClick={() => setScheduling(true)}><CalendarPlus />Schedule</Button>
        <Button variant="surface" onClick={() => setEditing(true)}><Pencil />Edit</Button>
      </div>
      <ShareLinkButton name={item.name} exercises={item.exercises} className="w-full" />
      <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive" onClick={() => setConfirm(true)}><Trash2 />Delete</Button>
    </div>
    <ScheduleSheet open={scheduling} onOpenChange={setScheduling} defaultName={item.name} onConfirm={(value) => scheduleNewWorkout(value, item.exercises, item.id)} />
    <ConfirmDelete open={confirm} onOpenChange={setConfirm} title="Delete saved workout?" description={`${item.name} will be removed. Scheduled sessions stay on your calendar.`} action="Delete"
      onConfirm={() => { deleteSavedWorkout(item.id); void navigate({ to: "/saved" }); }} />
  </Screen>;
}
