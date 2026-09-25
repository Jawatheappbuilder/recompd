import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock, Pencil, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/recomp/core";
import { ScheduleSheet } from "@/components/recomp/schedule-sheet";
import { ShareLinkButton } from "@/components/recomp/share-link-button";
import { BackLink, ConfirmDelete, ExerciseList, PlanEditor, PlanHeader } from "@/components/recomp/workout-plan-view";
import { useCloudData } from "@/lib/cloud-data";
import { deleteScheduledWorkout, formatScheduleDate, handOffWorkout, hasActiveWorkout, saveScheduledWorkout } from "@/lib/workout-storage";

export const Route = createFileRoute("/scheduled/$id")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Scheduled Workout — RECOMP'D" }, { name: "description", content: "Preview, start, edit or reschedule a planned workout." },
    { property: "og:title", content: "Scheduled Workout — RECOMP'D" }, { property: "og:description", content: "Preview, start, edit or reschedule a planned workout." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ScheduledWorkoutPage,
});

function ScheduledWorkoutPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const data = useCloudData();
  const item = data?.scheduled.find((s) => s.id === id);
  const [editing, setEditing] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (!data) return <Screen>{null}</Screen>;
  if (!item) return <Screen><PlanHeader back={<BackLink to="/" label="Back to home" />} title="Workout not found" /></Screen>;
  if (editing) return <Screen><PlanEditor initial={item.exercises} onCancel={() => setEditing(false)} onSave={(exercises) => { saveScheduledWorkout({ ...item, exercises }); setEditing(false); toast.success("Workout updated"); }} /></Screen>;

  const start = () => {
    if (hasActiveWorkout()) { toast("Finish your current workout first"); void navigate({ to: "/workout" }); return; }
    handOffWorkout({ name: item.name, exercises: item.exercises.map((e) => structuredClone(e)), scheduledId: item.id }); void navigate({ to: "/workout" });
  };
  return <Screen>
    <PlanHeader back={<BackLink to="/" label="Back to home" />} title={item.name} subtitle={`${formatScheduleDate(item.date, item.time)} · ${item.exercises.length} exercises`} />
    <ExerciseList exercises={item.exercises} />
    {item.completedAt ? <p className="mt-4 text-center text-sm font-semibold text-muted-foreground">Completed</p> : <div className="mt-4 space-y-2">
      <Button variant="primary" size="xl" className="w-full" disabled={!item.exercises.length} onClick={start}>Start workout</Button>
      <ShareLinkButton name={item.name} exercises={item.exercises} className="w-full" />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="surface" onClick={() => setEditing(true)}><Pencil />Edit</Button>
        <Button variant="surface" onClick={() => setRescheduling(true)}><CalendarClock />Reschedule</Button>
      </div>
      <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive" onClick={() => setConfirm(true)}><X />Cancel scheduled workout</Button>
    </div>}
    <ScheduleSheet open={rescheduling} onOpenChange={setRescheduling} title="Reschedule workout" confirmLabel="Save" defaultName={item.name} initialDate={item.date} initialTime={item.time}
      onConfirm={(value) => { const { time: _t, ...rest } = item; saveScheduledWorkout({ ...rest, name: value.name, date: value.date, ...(value.time ? { time: value.time } : {}) }); toast.success("Workout rescheduled"); }} />
    <ConfirmDelete open={confirm} onOpenChange={setConfirm} title="Cancel this workout?" description={`${item.name} will be removed from your schedule.`} action="Cancel workout"
      onConfirm={() => { deleteScheduledWorkout(item.id); void navigate({ to: "/" }); }} />
  </Screen>;
}
