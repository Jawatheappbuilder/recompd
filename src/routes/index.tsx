import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, Dumbbell, Hammer, Sparkles } from "lucide-react";
import { useUserPreferences } from "@/lib/user-preferences";
import { plannedWorkout } from "@/data/mock-data";
import { Button } from "@/components/ui/button";
import { Card, Header, Screen } from "@/components/recomp/core";
import { TodayWorkoutCard, UpcomingWorkoutCard } from "@/components/recomp/scheduled-cards";
import { localDateKey, useUpcomingWorkouts } from "@/lib/workout-storage";
import { BodyweightSummary, TrainingPriority, WeeklyTraining, WorkoutSummary } from "@/components/recomp/training-widgets";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Home — RECOMP'D" },
    { name: "description", content: "Your next strength workout, weekly training, priorities, and recent progress." },
    { property: "og:title", content: "Home — RECOMP'D" },
    { property: "og:description", content: "Your next strength workout and weekly training at a glance." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: HomePage,
});

function HomePage() {
  const [preferences] = useUserPreferences();
  const firstName = preferences.name.trim().split(/\s+/)[0];
  const planned = plannedWorkout;
  const upcoming = useUpcomingWorkouts();
  const today = upcoming.find((w) => w.date === localDateKey());
  const next = upcoming.find((w) => w !== today);
  return <Screen><Header/><div className="mb-4"><p className="text-sm font-medium text-muted-foreground">{firstName ? `Hey, ${firstName}` : "Hey"}</p><h1 className="mt-0.5 text-2xl font-extrabold">Ready to train?</h1></div>{today ? <TodayWorkoutCard workout={today}/> : <Card className="workout-action mb-4 overflow-hidden p-3.5"><div className="mb-3.5 flex items-start justify-between"><div><div className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-primary">{planned ? "Next session" : "No plan yet"}</div><div className="mt-1 text-lg font-extrabold">{planned ? planned.name : "Start a workout"}</div></div><div className="grid size-9 place-items-center rounded-xl bg-accent text-primary"><Dumbbell className="size-[1.1rem]"/></div></div>{planned ? <><Button asChild variant="primary" size="lg" className="h-12 w-full text-xs uppercase tracking-[0.1em]"><Link to="/workout">Start workout</Link></Button><Button asChild variant="ghost" className="mt-1.5 w-full text-muted-foreground"><Link to="/build"><CalendarPlus/>Plan workout</Link></Button></> : <div className="grid grid-cols-2 gap-2"><Button asChild variant="primary" className="h-12 text-xs uppercase tracking-[0.08em]"><Link to="/build" search={{ mode: "generate" }}><Sparkles/>Generate</Link></Button><Button asChild variant="surface" className="h-12 text-xs uppercase tracking-[0.08em]"><Link to="/build" search={{ mode: "manual" }}><Hammer/>Build</Link></Button></div>}</Card>}{next && <UpcomingWorkoutCard workout={next} className="mb-4 block"/>}<div className="space-y-4"><WeeklyTraining/><TrainingPriority compact/><WorkoutSummary/><BodyweightSummary/></div></Screen>;
}