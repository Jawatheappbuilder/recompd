import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/recomp/core";
import { useAuth } from "@/components/recomp/auth-context";
import { ScheduleSheet, scheduleNewWorkout } from "@/components/recomp/schedule-sheet";
import { ExerciseList, PlanHeader } from "@/components/recomp/workout-plan-view";
import type { WorkoutExercise } from "@/data/exercises";
import { newId } from "@/lib/cloud-data";
import { handOffWorkout, hasActiveWorkout, saveWorkout } from "@/lib/workout-storage";
import { fetchSharedWorkout, PENDING_SHARE_KEY } from "@/lib/workout-share";

export const Route = createFileRoute("/share/$token")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Shared Workout — RECOMP'D" }, { name: "description", content: "Someone shared a workout with you. Add it to RECOMP'D and train." },
    { property: "og:title", content: "Shared Workout — RECOMP'D" }, { property: "og:description", content: "Someone shared a workout with you. Add it to RECOMP'D and train." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SharedWorkoutPage,
});

type Shared = { name: string; exercises: WorkoutExercise[] };

function SharedWorkoutPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { status } = useAuth();
  const [shared, setShared] = useState<Shared | null | undefined>(undefined);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSharedWorkout(token).then((w) => { if (!cancelled) setShared(w); }).catch(() => { if (!cancelled) setShared(null); });
    return () => { cancelled = true; };
  }, [token]);

  const importWorkout = (w: Shared) => {
    const id = newId();
    saveWorkout({ id, name: w.name, exercises: w.exercises.map((e) => structuredClone(e)), createdAt: Date.now() });
    localStorage.removeItem(PENDING_SHARE_KEY);
    setImportedId(id);
    toast.success("Added to your saved workouts");
  };

  // Continue an import started before signing in.
  useEffect(() => {
    if (status === "signedIn" && shared && !importedId && localStorage.getItem(PENDING_SHARE_KEY) === token) importWorkout(shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, shared, token]);

  const add = () => {
    if (!shared) return;
    if (status !== "signedIn") { localStorage.setItem(PENDING_SHARE_KEY, token); void navigate({ to: "/welcome" }); return; }
    importWorkout(shared);
  };

  if (shared === undefined) return <Screen><div className="grid h-[60dvh] place-items-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div></Screen>;
  if (!shared) return <Screen><PlanHeader title="Workout not found" subtitle="This link may have expired." /><Button asChild variant="surface" className="w-full"><Link to="/">Go to RECOMP'D</Link></Button></Screen>;

  const sets = shared.exercises.reduce((sum, e) => sum + (e.tracking === "cardio" ? 1 : e.sets), 0);
  const start = () => {
    if (hasActiveWorkout()) { toast("Finish your current workout first"); void navigate({ to: "/workout" }); return; }
    handOffWorkout({ name: shared.name, exercises: shared.exercises.map((e) => structuredClone(e)) }); void navigate({ to: "/workout" });
  };

  return <Screen>
    <p className="mb-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">Shared workout</p>
    <PlanHeader title={shared.name} subtitle={`${shared.exercises.length} exercises · ${sets} sets`} />
    <ExerciseList exercises={shared.exercises} />
    <div className="mt-4 space-y-2">
      {!importedId ? <Button variant="primary" size="xl" className="w-full" onClick={add}>Add to RECOMP'D</Button> : <>
        <div className="flex items-center justify-center gap-1.5 py-1 text-xs font-bold text-primary"><Check className="size-4" />Saved to your workouts</div>
        <Button variant="primary" size="xl" className="w-full" onClick={start}>Start workout</Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="surface" onClick={() => setScheduling(true)}><CalendarPlus />Schedule</Button>
          <Button asChild variant="surface"><Link to="/saved/$id" params={{ id: importedId }}>View saved</Link></Button>
        </div>
      </>}
    </div>
    {importedId && <ScheduleSheet open={scheduling} onOpenChange={setScheduling} defaultName={shared.name} onConfirm={(value) => { scheduleNewWorkout(value, shared.exercises, importedId); void navigate({ to: "/" }); }} />}
  </Screen>;
}
