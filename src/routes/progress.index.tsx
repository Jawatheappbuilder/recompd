import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Dumbbell, Settings } from "lucide-react";
import { useProgramDrafts } from "@/lib/program-storage";
import { completionStats, occurrencesFor } from "@/lib/program-schedule";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen, SectionHeading } from "@/components/recomp/core";
import { BodyweightCard } from "@/components/recomp/progress/bodyweight";
import { PeriodSelector, PersonalRecordsCard, TrainingCalendar, TrainingSummary, WorkoutRow } from "@/components/recomp/progress/progress-widgets";
import { TrainingAnalysisSection } from "@/components/recomp/progress/training-analysis";
import { analyseTraining } from "@/lib/training-analysis";
import { useUserPreferences } from "@/lib/user-preferences";
import { periodLabel, personalRecords, since, trainingSummary, useTrainingData, type Period } from "@/lib/training-data";

export const Route = createFileRoute("/progress/")({
  head: () => ({ meta: [{ title: "Progress — RECOMP'D" }, { name: "description", content: "See how much you've trained, which muscles get the most attention, your records and bodyweight trend." }, { property: "og:title", content: "Progress — RECOMP'D" }, { property: "og:description", content: "See how much you've trained, which muscles get the most attention, your records and bodyweight trend." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ProgressPage,
});

const periods = ["4W", "3M", "6M", "1Y"] as const;

function ProgressPage() {
  const data = useTrainingData();
  const programs = useProgramDrafts();
  const program = programs.find(item=>item.status==="active")??programs.find(item=>item.status==="paused");
  const programStats = program ? completionStats(program) : null;
  const currentWeek = program ? (occurrencesFor(program).find(item=>item.status==="upcoming")?.cycle??program.weeks-1)+1 : 0;
  const workouts = data?.workouts;
  const [preferences] = useUserPreferences();
  const [period, setPeriod] = useState<Period>("4W");
  const analysis = useMemo(() => {
    if (!workouts) return null;
    const to = Date.now();
    return analyseTraining(workouts, since(period, to), to, preferences.goals);
  }, [workouts, period, preferences.goals]);
  const summary = useMemo(() => workouts && analysis ? trainingSummary(workouts, analysis.from) : null, [workouts, analysis]);
  const records = useMemo(() => workouts ? personalRecords(workouts).recent : [], [workouts]);

  return (
    <Screen>
      <div className="relative -mx-4 -mt-[calc(1rem+env(safe-area-inset-top))] overflow-hidden bg-primary px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))] text-primary-foreground">
        <div aria-hidden className="pointer-events-none absolute -right-12 top-4 size-40 rounded-full bg-white/[0.09] blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="wordmark text-primary-foreground">RECOMP'D</div>
          <Link to="/settings" aria-label="Settings" className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/10 transition-colors hover:bg-white/20"><Settings className="size-5" /></Link>
        </div>
        <h1 className="relative mt-4 text-[1.7rem] font-extrabold leading-tight">Progress</h1>
      </div>
      {data && summary && (
        <div className="relative z-10 -mt-5 space-y-5">
          {program && programStats && <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm">
            <div className="flex items-center justify-between bg-primary/[0.07] px-4 py-3"><span className="text-[0.65rem] font-black uppercase tracking-wider text-primary">Your program journey</span><span className={"rounded-full px-2 py-1 text-[0.65rem] font-extrabold "+(program.status==="active"?"bg-emerald-500/15 text-emerald-600":"bg-secondary text-muted-foreground")}>{program.status==="active"?"● Active":"Paused"}</span></div>
            <div className="p-4"><h2 className="truncate text-lg font-black">{program.name}</h2>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">Week {currentWeek} of {program.weeks} · {programStats.completed}/{programStats.total} sessions completed</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{width:(programStats.total?100*programStats.completed/programStats.total:0)+"%"}}/></div>
              <div className="mt-3 flex items-center justify-between"><span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="size-4"/>{programStats.completed} complete</span><Link to="/programs" search={{programId:program.id}} className="flex items-center gap-1 text-xs font-extrabold text-primary">View program <ChevronRight className="size-4"/></Link></div>
            </div>
          </section>}
          <Link to="/monthly-preview" className="flex items-center justify-between rounded-2xl border border-primary/20 bg-card p-4 shadow-sm"><div><div className="text-[10px] font-black uppercase tracking-widest text-primary">Your month in strength</div><div className="mt-1 text-lg font-black">Monthly recap</div><p className="text-xs text-muted-foreground">Your real training, highlights and comparisons</p></div><ChevronRight className="text-primary"/></Link>
          <PeriodSelector value={period} options={periods} onChange={setPeriod} className="relative z-10 border-primary/15 bg-card p-1 shadow-sm" />
          {data.workouts.length ? (
            <>
              <TrainingSummary label={periodLabel[period]} workouts={summary.workouts} sets={summary.sets} durationSec={summary.durationSec} />
              {analysis && <TrainingAnalysisSection analysis={analysis} periodLabel={periodLabel[period]} />}
              <section>
                <SectionHeading action={<Link to="/progress/history" className="flex items-center gap-0.5 text-xs font-bold text-primary">History<ChevronRight className="size-3.5" /></Link>}>Training calendar</SectionHeading>
                <TrainingCalendar workouts={data.workouts} />
                <Card className="mt-2 divide-y divide-border px-4">{data.workouts.slice(0, 2).map((workout) => <WorkoutRow key={workout.id} workout={workout} />)}</Card>
              </section>
              <PersonalRecordsCard records={records} />
            </>
          ) : (
            <>
              <Card className="flex items-center justify-between gap-3 p-4">
                <span className="text-sm text-muted-foreground">No workouts recorded yet.</span>
                <Button asChild variant="primary" size="sm"><Link to="/build"><Dumbbell />Start</Link></Button>
              </Card>
              {analysis && <TrainingAnalysisSection analysis={analysis} periodLabel={periodLabel[period]} />}
            </>
          )}
          <BodyweightCard entries={data.bodyweight} />
        </div>
      )}
    </Screen>
  );
}
