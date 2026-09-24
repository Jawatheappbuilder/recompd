import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatScheduleDate, handOffWorkout, hasActiveWorkout, localDateKey, type ScheduledWorkout } from "@/lib/workout-storage";

export function TodayWorkoutCard({ workout }: { workout: ScheduledWorkout }) {
  const navigate = useNavigate();
  const start = () => {
    if (!hasActiveWorkout()) handOffWorkout({ name: workout.name, exercises: workout.exercises.map((e) => structuredClone(e)), scheduledId: workout.id });
    else toast("Finish your current workout first");
    void navigate({ to: "/workout" });
  };
  return <Card className="workout-action mb-4 overflow-hidden p-3.5">
    <Link to="/scheduled/$id" params={{ id: workout.id }} className="mb-3.5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-primary">Today's workout{workout.time ? ` · ${formatScheduleDate(workout.date, workout.time).split(" · ")[1]}` : ""}</div>
        <div className="mt-1 truncate text-lg font-extrabold">{workout.name}</div>
        <div className="mt-0.5 text-xs font-semibold text-muted-foreground">{workout.exercises.length} exercises</div>
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
    </Link>
    <Button variant="primary" size="lg" className="h-12 w-full text-xs uppercase tracking-[0.1em]" onClick={start}>Start workout</Button>
  </Card>;
}

export function UpcomingWorkoutCard({ workout, className }: { workout: ScheduledWorkout; className?: string }) {
  return <Link to="/scheduled/$id" params={{ id: workout.id }} className={className ?? "block"}>
    <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-accent">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary"><CalendarDays className="size-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-muted-foreground">{workout.date === localDateKey() ? "Today" : "Upcoming"}</div>
        <div className="truncate text-sm font-extrabold">{workout.name}</div>
        <div className="truncate text-[0.7rem] font-semibold text-muted-foreground">{formatScheduleDate(workout.date, workout.time)} · {workout.exercises.length} exercises</div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Card>
  </Link>;
}
