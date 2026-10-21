import { useState } from "react";
import { ChevronDown, ChevronUp, Clock3, Dumbbell } from "lucide-react";
import { exercises, muscleGroups, type Muscle } from "@/data/exercises";
import { workoutTimeEstimate } from "@/lib/workout-time";
import type { TrainingProgram } from "@/lib/program-storage";

const time = (mins: number) => mins >= 60 ? `${Math.floor(mins/60)}h ${String(mins%60).padStart(2,"0")}m` : `${mins}m`;

/** An indicative distribution of working sets, not a scientific measure of hypertrophy. */
function effectiveSets(program: TrainingProgram) {
  const amounts = new Map<Muscle, number>(muscleGroups.map(m => [m, 0]));
  for (const workout of program.workouts) for (const item of workout.exercises) {
    if (item.note || item.tracking === "cardio" || item.type === "Cardio") continue;
    const sets = Number(item.sets);
    if (!Number.isFinite(sets) || sets <= 0) continue;
    const primary = item.muscle;
    if (!amounts.has(primary)) continue;
    amounts.set(primary, (amounts.get(primary) ?? 0) + sets);
    const source = exercises.find(e => e.id === item.id);
    const secondary = item.muscles?.length ? item.muscles : source?.muscles ?? [];
    for (const muscle of new Set(secondary)) {
      if (muscle !== primary && amounts.has(muscle)) amounts.set(muscle, (amounts.get(muscle) ?? 0) + sets * 0.5);
    }
  }
  return [...amounts].filter(([,value]) => value > 0).sort((a,b) => b[1]-a[1]);
}

export function ProgramOverview({ program }: {program: TrainingProgram}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const load = effectiveSets(program);
  const max = Math.max(1, ...load.map(([,v])=>v));
  const duration = program.workouts.reduce((sum,w) => {
    const estimate = workoutTimeEstimate(w.exercises);
    return sum + (estimate ? Math.round((estimate.lower + estimate.upper)/2) : 0);
  },0);
  return <div className="space-y-3">
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="h-1 bg-primary" />
      <div className="p-4">
        <h3 className="text-xl font-black">{program.name || "Untitled program"}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{program.goal} · {program.mode === "calendar" ? "Calendar" : "Flexible"} schedule</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[[String(program.weeks),"Weeks"],[String(program.weeks*program.workouts.length),"Sessions"],[duration?time(duration):"—","Per rotation"]].map(([value,label])=><div key={label} className="rounded-xl bg-secondary/70 p-3"><p className="text-lg font-black tabular-nums">{value}</p><p className="text-[0.64rem] font-semibold text-muted-foreground">{label}</p></div>)}
        </div>
      </div>
    </div>
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-sm font-extrabold">Workout rotation</h3>
      <p className="mt-1 text-[0.68rem] text-muted-foreground">Tap a workout to see the exercises</p>
      <div className="mt-2 divide-y divide-border">{program.workouts.map((workout,index)=><div key={workout.id} className="py-1">
        <button type="button" aria-expanded={expanded===workout.id} onClick={()=>setExpanded(expanded===workout.id?null:workout.id)} className="flex min-h-14 w-full items-center gap-3 text-left">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-black text-primary">{index+1}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{workout.name}</span><span className="block text-xs text-muted-foreground">{workout.exercises.filter(e=>!e.note).length} exercises</span></span>
          {expanded===workout.id?<ChevronUp className="size-4 text-primary"/>:<ChevronDown className="size-4 text-muted-foreground"/>}
        </button>
        {expanded===workout.id&&<div className="space-y-1.5 pb-3 pl-2">{workout.exercises.filter(e=>!e.note).map((item,i)=><div key={item.key??i} className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2">
          <Dumbbell className="size-3.5 shrink-0 text-primary"/><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{item.name}</p><p className="text-[0.65rem] text-muted-foreground">{item.muscle}{item.restSeconds? ` · ${item.restSeconds}s rest`:""}</p></div><span className="shrink-0 text-xs font-bold tabular-nums">{item.sets} × {item.reps}</span>
        </div>)}</div>}
      </div>)}</div>
    </section>
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between"><h3 className="text-sm font-extrabold">Muscle emphasis</h3><span className="text-[0.65rem] font-bold text-primary">Per rotation</span></div>
      <p className="mt-1 text-[0.68rem] leading-relaxed text-muted-foreground">Estimated effective working sets · primary muscle 1×, supporting muscles 0.5×. Not a measure of actual growth.</p>
      <div className="mt-4 space-y-3">{load.length?load.map(([muscle,value])=><div key={muscle} className="space-y-1">
        <div className="flex justify-between text-[0.72rem]"><span className="font-bold">{muscle}</span><span className="font-extrabold tabular-nums">{Number(value.toFixed(1))} sets</span></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{width:`${(value/max)*100}%`}}/></div>
      </div>):<p className="py-4 text-xs text-muted-foreground">Add strength exercises to see muscle emphasis.</p>}</div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5"/>Estimated training: {duration?time(duration):"—"} per rotation</p>
    </section>
  </div>;
}
