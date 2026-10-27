import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarPlus, Dumbbell, Hammer, Plus, Settings, Sparkles, UserPlus, Users, X } from "lucide-react";
import { useUserPreferences } from "@/lib/user-preferences";
import { plannedWorkout } from "@/data/mock-data";
import { Button } from "@/components/ui/button";
import { Card, Screen } from "@/components/recomp/core";
import { TodayWorkoutCard, UpcomingWorkoutCard } from "@/components/recomp/scheduled-cards";
import { localDateKey, useUpcomingWorkouts } from "@/lib/workout-storage";
import { BodyweightSummary, TrainingPriority, WeeklyTraining, WorkoutSummary } from "@/components/recomp/training-widgets";
import { useAuth } from "@/components/recomp/auth-context";
import { StepsCard } from "@/components/recomp/steps-card";
import { ActiveProgramHome } from "@/components/recomp/active-program-home";
import { useActiveWorkout } from "@/hooks/use-active-workout";
import { LogWeightSheet } from "@/components/recomp/progress/bodyweight";
import { useTrainingData } from "@/lib/training-data";
import { monthBounds, wrappedLabel, wrappedPromoMonth } from "@/lib/monthly-wrapped";

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
  const { workout: activeWorkout } = useActiveWorkout();
  const activeSets = activeWorkout?.exercises.flatMap((exercise) => exercise.sessionSets.filter((set) => set.kind !== "warmup")) ?? [];
  const [logWeightOpen, setLogWeightOpen] = useState(false);
  const { status } = useAuth();
  const training = useTrainingData();
  const promoMonth = wrappedPromoMonth();
  const promoBounds = promoMonth ? monthBounds(promoMonth) : null;
  const showWrapped = status === "signedIn" && !viewedWrapped && !!promoBounds && !!training?.workouts.some(w => w.startedAt >= promoBounds.start && w.startedAt < promoBounds.end);
  const wrappedFinal = new Date().getDate() <= 4;
  const [viewedWrapped, setViewedWrapped] = useState(false);
  const wrappedKey = promoMonth ? `recomp-wrapped-viewed-${promoMonth.getFullYear()}-${promoMonth.getMonth()+1}` : "";
  useEffect(() => { try { setViewedWrapped(!!wrappedKey && localStorage.getItem(wrappedKey) === "1"); } catch { setViewedWrapped(false); } }, [wrappedKey]);
  useEffect(() => { const refresh = () => { try { setViewedWrapped(!!wrappedKey && localStorage.getItem(wrappedKey) === "1"); } catch {} }; window.addEventListener("focus", refresh); window.addEventListener("pageshow", refresh); return () => {window.removeEventListener("focus",refresh);window.removeEventListener("pageshow",refresh)}; }, [wrappedKey]);
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
      <div className="flex items-center gap-2"><Link to="/social" aria-label="Social" className="relative grid size-10 place-items-center rounded-xl border border-white/20 bg-white/10 transition-colors hover:bg-white/20"><Users className="size-5" /></Link><Link to="/settings" aria-label="Settings" className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/10 transition-colors hover:bg-white/20"><Settings className="size-5" /></Link></div>
    </header>
    <div className="relative mt-5">
      <p className="text-sm font-semibold text-primary-foreground/75">{firstName ? `Hey, ${firstName}` : "Hey"}</p>
      <h1 className="mt-1 text-[1.7rem] font-extrabold leading-tight">Ready to train?</h1>
    </div>
  </div>
  <div className="relative z-10 -mt-5">{activeWorkout ? <Card className="workout-action border-primary/20 bg-card p-4 shadow-sm"><div className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-primary">Workout in progress</div><h2 className="mt-1 truncate text-lg font-extrabold">{activeWorkout.name}</h2><p className="mt-1 text-xs text-muted-foreground">{activeSets.filter((set) => set.completed).length} of {activeSets.length} {activeWorkout.exercises.some((exercise) => exercise.tracking === "cardio") ? "entries" : "sets"} completed</p><Button asChild variant="primary" size="lg" className="mt-3 h-12 w-full"><Link to="/workout"><Dumbbell />Resume workout</Link></Button></Card> : today ? <TodayWorkoutCard workout={today}/> : <Card className="workout-action overflow-hidden border-primary/15 bg-card p-3.5 shadow-[0_10px_32px_-22px_var(--primary)]"><div className="mb-3.5 flex items-start justify-between"><div><div className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-primary">{planned ? "Next session" : "No plan yet"}</div><div className="mt-1 text-lg font-extrabold">{planned ? planned.name : "Start a workout"}</div></div><div className="grid size-9 place-items-center rounded-xl bg-accent text-primary"><Dumbbell className="size-[1.1rem]"/></div></div>{planned ? <><Button asChild variant="primary" size="lg" className="h-12 w-full text-xs uppercase tracking-[0.1em]"><Link to="/workout">Start workout</Link></Button><Button asChild variant="ghost" className="mt-1.5 w-full text-muted-foreground"><Link to="/build"><CalendarPlus/>Plan workout</Link></Button></> : <div className="grid grid-cols-2 gap-2"><Button asChild variant="primary" className="h-12 text-xs uppercase tracking-[0.08em]"><Link to="/build" search={{ mode: "generate" }}><Sparkles/>Generate</Link></Button><Button asChild variant="surface" className="h-12 text-xs uppercase tracking-[0.08em]"><Link to="/build" search={{ mode: "manual" }}><Hammer/>Build</Link></Button></div>}</Card>}</div>
  {showWrapped && <Link to="/monthly-preview" className="group relative mt-4 block overflow-hidden rounded-[1.65rem] border border-primary/30 bg-primary p-[1px] shadow-[0_14px_36px_-20px_var(--primary)] transition-transform active:scale-[.985]" aria-label="Open your monthly Wrapped">
    <div className="relative overflow-hidden rounded-[calc(1.65rem-1px)] bg-primary px-5 py-5 text-primary-foreground">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full border-[28px] border-white/10 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110" />
      <div aria-hidden className="pointer-events-none absolute right-8 bottom-[-5rem] size-36 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.15em]"><Sparkles className="size-3" /> {wrappedFinal ? "NEW" : "Just for you"}</span><span className="rounded-full bg-white/15 p-2"><ArrowUpRight className="size-5" /></span></div>
      <div className="relative mt-5 text-[10px] font-black uppercase tracking-[.22em] opacity-75">{promoMonth ? wrappedLabel(promoMonth) : ""}</div>
      <div className="relative mt-1 font-display text-[2.6rem] font-black uppercase leading-[.92] tracking-tight">WRAPPED<span className="opacity-55">.</span></div>
      <p className="relative mt-3 max-w-[17rem] text-sm font-medium leading-5 opacity-90">{wrappedFinal ? "Your month is complete. Discover your training story." : "Your month so far. Every workout adds to your story."}</p>
      <div className="relative mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.1em]">{wrappedFinal ? "Reveal your Wrapped" : "See your story"} <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div>
    </div>
  </Link>}
  <ActiveProgramHome />
  {status === "demo" && <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-border/70 bg-secondary/55 px-3 py-2">
    <UserPlus className="size-4 shrink-0 text-primary" />
    <span className="min-w-[110px] flex-1 text-[0.7rem] font-semibold text-muted-foreground">Save your progress</span>
    <Link to="/create-account" className="text-[0.7rem] font-bold text-primary">Sign up</Link>
    <span aria-hidden className="text-muted-foreground/40">·</span>
    <Link to="/login" className="text-[0.7rem] font-bold text-foreground">Log in</Link>
  </div>}
  {next && <UpcomingWorkoutCard workout={next} className="mt-4 block"/>}<Button variant="surface" className="mt-4 w-full justify-start" onClick={() => setLogWeightOpen(true)}><Plus />Log weight</Button><LogWeightSheet open={logWeightOpen} onOpenChange={setLogWeightOpen} /><div className="mt-6 space-y-4"><WeeklyTraining/><TrainingPriority compact/><WorkoutSummary/><BodyweightSummary/><StepsCard/></div></Screen>;
}

