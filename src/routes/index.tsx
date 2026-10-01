import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarPlus, Dumbbell, Hammer, Settings, Sparkles, UserPlus } from "lucide-react";
import { completeAccentChoice, hasCompletedAccentChoice, useUserPreferences, type AccentPreference } from "@/lib/user-preferences";
import { plannedWorkout } from "@/data/mock-data";
import { Button } from "@/components/ui/button";
import { Card, Screen } from "@/components/recomp/core";
import { TodayWorkoutCard, UpcomingWorkoutCard } from "@/components/recomp/scheduled-cards";
import { localDateKey, useUpcomingWorkouts } from "@/lib/workout-storage";
import { BodyweightSummary, TrainingPriority, WeeklyTraining, WorkoutSummary } from "@/components/recomp/training-widgets";
import { useAuth } from "@/components/recomp/auth-context";
import { StepsCard } from "@/components/recomp/steps-card";

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
  return <Screen><div className="relative -mx-4 -mt-[calc(1rem+env(safe-area-inset-top))] overflow-hidden bg-primary px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))] text-primary-foreground">
    <div aria-hidden className="pointer-events-none absolute -right-16 top-12 size-56 rounded-full bg-white/[0.10] blur-3xl" />
    <div aria-hidden className="pointer-events-none absolute -left-12 bottom-0 size-40 rounded-full bg-white/[0.05] blur-3xl" />
    <header className="relative flex items-center justify-between gap-4">
      <div className="wordmark text-primary-foreground">RECOMP'D</div>
      <Link to="/settings" aria-label="Settings" className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/10 transition-colors hover:bg-white/20"><Settings className="size-5" /></Link>
    </header>
    <div className="relative mt-5">
      <p className="text-sm font-semibold text-primary-foreground/75">{firstName ? `Hey, ${firstName}` : "Hey"}</p>
      <h1 className="mt-1 text-[1.7rem] font-extrabold leading-tight">Ready to train?</h1>
    </div>
  </div>
  {showAccentChoice && <div className="relative z-10 mt-3"><AccentChoiceCard accent={preferences.accent} onPreview={(accent) => setPreferences({ ...preferences, accent })} onSave={() => { completeAccentChoice(); setShowAccentChoice(false); }} /></div>}
  <div className="relative z-10 -mt-5">{today ? <TodayWorkoutCard workout={today}/> : <Card className="workout-action overflow-hidden border-primary/15 bg-card p-3.5 shadow-[0_10px_32px_-22px_var(--primary)]"><div className="mb-3.5 flex items-start justify-between"><div><div className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-primary">{planned ? "Next session" : "No plan yet"}</div><div className="mt-1 text-lg font-extrabold">{planned ? planned.name : "Start a workout"}</div></div><div className="grid size-9 place-items-center rounded-xl bg-accent text-primary"><Dumbbell className="size-[1.1rem]"/></div></div>{planned ? <><Button asChild variant="primary" size="lg" className="h-12 w-full text-xs uppercase tracking-[0.1em]"><Link to="/workout">Start workout</Link></Button><Button asChild variant="ghost" className="mt-1.5 w-full text-muted-foreground"><Link to="/build"><CalendarPlus/>Plan workout</Link></Button></> : <div className="grid grid-cols-2 gap-2"><Button asChild variant="primary" className="h-12 text-xs uppercase tracking-[0.08em]"><Link to="/build" search={{ mode: "generate" }}><Sparkles/>Generate</Link></Button><Button asChild variant="surface" className="h-12 text-xs uppercase tracking-[0.08em]"><Link to="/build" search={{ mode: "manual" }}><Hammer/>Build</Link></Button></div>}</Card>}</div>
  {status === "demo" && <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-border/70 bg-secondary/55 px-3 py-2">
    <UserPlus className="size-4 shrink-0 text-primary" />
    <span className="min-w-[110px] flex-1 text-[0.7rem] font-semibold text-muted-foreground">Save your progress</span>
    <Link to="/create-account" className="text-[0.7rem] font-bold text-primary">Sign up</Link>
    <span aria-hidden className="text-muted-foreground/40">·</span>
    <Link to="/login" className="text-[0.7rem] font-bold text-foreground">Log in</Link>
  </div>}
  {next && <UpcomingWorkoutCard workout={next} className="mt-4 block"/>}<div className="mt-6 space-y-4"><StepsCard/><WeeklyTraining/><TrainingPriority compact/><WorkoutSummary/><BodyweightSummary/></div></Screen>;
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
