import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarPlus, Dumbbell, Hammer, LogIn, Sparkles, UserPlus } from "lucide-react";
import { completeAccentChoice, hasCompletedAccentChoice, useUserPreferences, type AccentPreference } from "@/lib/user-preferences";
import { plannedWorkout } from "@/data/mock-data";
import { Button } from "@/components/ui/button";
import { Card, Header, Screen } from "@/components/recomp/core";
import { TodayWorkoutCard, UpcomingWorkoutCard } from "@/components/recomp/scheduled-cards";
import { localDateKey, useUpcomingWorkouts } from "@/lib/workout-storage";
import { BodyweightSummary, TrainingPriority, WeeklyTraining, WorkoutSummary } from "@/components/recomp/training-widgets";
import { useAuth } from "@/components/recomp/auth-context";

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
  const [preferences, setPreferences] = useUserPreferences();
  const [showAccentChoice, setShowAccentChoice] = useState(false);
  useEffect(() => { setShowAccentChoice(!hasCompletedAccentChoice()); }, []);
  const { status } = useAuth();
  const firstName = preferences.name.trim().split(/\s+/)[0];
  const planned = plannedWorkout;
  const upcoming = useUpcomingWorkouts();
  const today = upcoming.find((w) => w.date === localDateKey());
  const next = upcoming.find((w) => w !== today);
  return <Screen><Header accent/>{showAccentChoice && <AccentChoiceCard accent={preferences.accent} onPreview={(accent) => setPreferences({ ...preferences, accent })} onSave={() => { completeAccentChoice(); setShowAccentChoice(false); }} />}<div className="mb-4"><p className="text-sm font-medium text-muted-foreground">{firstName ? `Hey, ${firstName}` : "Hey"}</p><h1 className="mt-0.5 text-2xl font-extrabold">Ready to train?</h1></div>{status === "demo" && <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 p-3.5"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><UserPlus className="size-[1.05rem]"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">Save your progress</span><span className="mt-0.5 block text-xs text-muted-foreground">Create an account or log in.</span></span></div><div className="mt-3 grid grid-cols-2 gap-2"><Button asChild variant="primary" className="h-10 text-xs"><Link to="/create-account"><UserPlus/>Create account</Link></Button><Button asChild variant="surface" className="h-10 text-xs"><Link to="/login"><LogIn/>Log in</Link></Button></div></div>}{today ? <TodayWorkoutCard workout={today}/> : <Card className="workout-action mb-4 overflow-hidden p-3.5"><div className="mb-3.5 flex items-start justify-between"><div><div className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-primary">{planned ? "Next session" : "No plan yet"}</div><div className="mt-1 text-lg font-extrabold">{planned ? planned.name : "Start a workout"}</div></div><div className="grid size-9 place-items-center rounded-xl bg-accent text-primary"><Dumbbell className="size-[1.1rem]"/></div></div>{planned ? <><Button asChild variant="primary" size="lg" className="h-12 w-full text-xs uppercase tracking-[0.1em]"><Link to="/workout">Start workout</Link></Button><Button asChild variant="ghost" className="mt-1.5 w-full text-muted-foreground"><Link to="/build"><CalendarPlus/>Plan workout</Link></Button></> : <div className="grid grid-cols-2 gap-2"><Button asChild variant="primary" className="h-12 text-xs uppercase tracking-[0.08em]"><Link to="/build" search={{ mode: "generate" }}><Sparkles/>Generate</Link></Button><Button asChild variant="surface" className="h-12 text-xs uppercase tracking-[0.08em]"><Link to="/build" search={{ mode: "manual" }}><Hammer/>Build</Link></Button></div>}</Card>}{next && <UpcomingWorkoutCard workout={next} className="mb-4 block"/>}<div className="space-y-4"><WeeklyTraining/><TrainingPriority compact/><WorkoutSummary/><BodyweightSummary/></div></Screen>;
}

function AccentChoiceCard({ accent, onPreview, onSave }: { accent: AccentPreference; onPreview: (accent: AccentPreference) => void; onSave: () => void }) {
  const choices: { id: AccentPreference; label: string; swatch: string }[] = [
    { id: "red", label: "Red", swatch: "oklch(0.625 0.145 24)" },
    { id: "blue", label: "Blue", swatch: "oklch(0.60 0.155 252)" },
    { id: "black", label: "Black", swatch: "oklch(0.20 0.01 40)" },
  ];
  return <Card className="mb-4 overflow-hidden p-0">
    <div className="bg-primary px-4 py-4 text-primary-foreground"><div className="text-[0.65rem] font-bold uppercase tracking-[0.13em] opacity-80">One quick thing</div><div className="mt-1 text-xl font-extrabold">Make RECOMP'D yours</div><p className="mt-1 text-xs font-medium opacity-80">Tap a colour and watch the app change.</p></div>
    <div className="p-3.5"><div className="grid grid-cols-3 gap-2">{choices.map((choice) => <button key={choice.id} type="button" onClick={() => onPreview(choice.id)} className={`flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border px-2 text-xs font-extrabold transition-all ${accent === choice.id ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border bg-secondary"}`}><span className="size-6 rounded-full border border-black/10 shadow-sm" style={{ background: choice.swatch }} />{choice.label}</button>)}</div><Button variant="primary" size="lg" className="mt-3 h-12 w-full text-xs uppercase tracking-[0.08em]" onClick={onSave}>Save my look</Button></div>
  </Card>;
}
