import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Header, Screen } from "@/components/recomp/core";
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
  return <Screen><Header/><div className="mb-4"><p className="text-sm font-medium text-muted-foreground">Hey, Ashley</p><h1 className="mt-0.5 text-2xl font-extrabold">Ready to train?</h1></div><Card className="workout-action mb-5 overflow-hidden p-4"><div className="mb-5 flex items-start justify-between"><div><div className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-primary">Next session</div><div className="mt-1 text-xl font-extrabold">Upper Body</div></div><div className="grid size-10 place-items-center rounded-xl bg-accent text-primary"><Dumbbell className="size-5"/></div></div><Button asChild variant="primary" size="xl" className="w-full"><Link to="/workout">Start workout</Link></Button><Button asChild variant="ghost" className="mt-2 w-full text-muted-foreground"><Link to="/build"><CalendarPlus/>Plan workout</Link></Button></Card><div className="space-y-5"><WeeklyTraining/><TrainingPriority compact/><WorkoutSummary/><BodyweightSummary/></div></Screen>;
}