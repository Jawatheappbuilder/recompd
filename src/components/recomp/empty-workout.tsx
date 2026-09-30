import { Link } from "@tanstack/react-router";
import { ArrowRight, Bookmark, Dumbbell, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUpcomingWorkouts } from "@/lib/workout-storage";
import { UpcomingWorkoutCard } from "./scheduled-cards";

export function EmptyWorkout() {
  const next = useUpcomingWorkouts()[0];
  return <><div className="relative -mx-4 -mt-[calc(1rem+env(safe-area-inset-top))] overflow-hidden bg-primary px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))] text-primary-foreground"><div aria-hidden className="pointer-events-none absolute -right-12 top-5 size-44 rounded-full bg-white/[0.09] blur-3xl" /><div className="relative flex items-center justify-between"><div className="wordmark text-primary-foreground">RECOMP'D</div><Link to="/settings" aria-label="Settings" className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/10"><Settings className="size-5" /></Link></div><div className="relative mt-5"><p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/75">Your training</p><h1 className="mt-1 text-[1.7rem] font-extrabold">Let's get to work.</h1></div></div><div className="relative z-10 -mt-5 space-y-5 pb-5">
    <Card className="overflow-hidden border-primary/15 bg-card p-5 shadow-[0_10px_32px_-22px_var(--primary)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Dumbbell className="size-6" /></div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-primary">Ready when you are</span>
      </div>
      <h2 className="text-2xl font-extrabold">Start something strong.</h2>
      <p className="mt-1 text-sm text-muted-foreground">Your next session starts here.</p>
      <Button asChild variant="primary" size="xl" className="mt-6 w-full uppercase tracking-[0.08em]">
        <Link to="/build"><Plus className="size-5" /> Start workout <ArrowRight className="ml-auto size-4" /></Link>
      </Button>
      <Button asChild variant="surface" size="lg" className="mt-3 w-full">
        <Link to="/saved"><Bookmark className="size-4 text-primary" /> Saved workouts <ArrowRight className="ml-auto size-4 text-muted-foreground" /></Link>
      </Button>
    </Card>
    {next && <div className="space-y-2">
      <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.13em] text-muted-foreground">Next scheduled</h2>
      <UpcomingWorkoutCard workout={next} className="block" />
    </div>}
  </div></>;
}
