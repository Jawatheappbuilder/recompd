import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, CheckCircle2, Dumbbell, PauseCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgramDrafts } from "@/lib/program-storage";
import { completionStats, occurrencesFor } from "@/lib/program-schedule";
import { cloneExercises, handOffWorkout, hasActiveWorkout } from "@/lib/workout-storage";
import { workoutTimeEstimate } from "@/lib/workout-time";
import { toast } from "sonner";

export function ActiveProgramHome() {
  const navigate = useNavigate();
  const programs = useProgramDrafts();
  const program = programs.find(p => p.status === "active") ?? programs.find(p => p.status === "paused");
  if (!program) return null;
  const active = program.status === "active";
  const stats = completionStats(program);
  const next = occurrencesFor(program).find(o => o.status === "upcoming");
  const template = next ? program.workouts.find(w => w.id === next.templateId) : undefined;
  const percent = stats.total ? Math.round(100 * stats.completed / stats.total) : 0;
  const circumference = 2 * Math.PI * 30;
  const openProgram = () => void navigate({to:"/programs",search:{programId:program.id}});
  const start = () => {
    if (!active || !next || !template) return;
    if (hasActiveWorkout()) {
      toast.info("Resume your current workout first.");
      void navigate({to:"/workout"});
      return;
    }
    if (!handOffWorkout({name:template.name,exercises:cloneExercises(template.exercises),programId:program.id,programTemplateId:template.id,programOccurrenceId:next.id})) {
      toast.error("Could not start program workout."); return;
    }
    void navigate({to:"/workout"});
  };
  return <section className="relative mt-4 overflow-hidden rounded-[1.45rem] border border-primary/20 bg-card shadow-[0_10px_35px_-24px_var(--primary)]">
    <div className="relative overflow-hidden bg-primary/[0.08] p-4">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full border-[22px] border-primary/10"/>
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-primary"><Sparkles className="size-3.5"/>Your program</span>
        <span className={"rounded-full px-2.5 py-1 text-[0.65rem] font-extrabold "+(active?"bg-emerald-500/15 text-emerald-600 dark:text-emerald-400":"bg-secondary text-muted-foreground")}>{active?"● Active":"Ⅱ Paused"}</span>
      </div>
      <div className="relative mt-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-black tracking-tight">{program.name}</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{program.weeks} weeks · {program.mode==="calendar"?"Calendar schedule":"Flexible schedule"}</p>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-bold"><CheckCircle2 className="size-4 text-emerald-600"/>{stats.completed} of {stats.total} sessions completed</p>
        </div>
        <div className="relative size-[86px] shrink-0">
          <svg viewBox="0 0 80 80" className="size-full -rotate-90">
            <circle cx="40" cy="40" r="30" stroke="currentColor" strokeOpacity=".1" strokeWidth="8" fill="none"/>
            <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none" className="text-primary" strokeDasharray={circumference} strokeDashoffset={circumference*(1-percent/100)} style={{transition:"stroke-dashoffset 600ms ease"}}/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-black tabular-nums">{percent}%</span><span className="text-[0.55rem] font-bold text-muted-foreground">DONE</span></div>
        </div>
      </div>
    </div>
    <div className="p-4">
      {template && next ? <><div className="flex items-center justify-between gap-2"><p className="text-[0.65rem] font-black uppercase tracking-wider text-primary">Up next · Week {next.cycle+1}</p>{next.date&&<span className="flex items-center gap-1 text-[0.65rem] font-semibold text-muted-foreground"><CalendarDays className="size-3.5"/>{next.date}</span>}</div>
        <p className="mt-1.5 truncate text-base font-extrabold">{template.name}</p>
        <p className="mt-1 text-xs text-muted-foreground"><Dumbbell className="mr-1 inline size-3.5"/>{template!.exercises.filter(e=>!e.note).length} exercises · {workoutTimeEstimate(template!.exercises)?.label}</p>
      </> : <p className="text-sm font-semibold">You've reached the end of this program's scheduled sessions.</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {active&&next&&template?<Button variant="primary" size="lg" className="h-11" onClick={start}><Dumbbell/>Start workout</Button>:<Button variant="surface" size="lg" className="h-11" onClick={openProgram}><PauseCircle/>View status</Button>}
        <Button variant="surface" size="lg" className="h-11" onClick={openProgram}>View program<ArrowRight/></Button>
      </div>
    </div>
  </section>;
}
