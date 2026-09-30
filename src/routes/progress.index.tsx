import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Dumbbell, Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen, SectionHeading } from "@/components/recomp/core";
import { BodyweightCard } from "@/components/recomp/progress/bodyweight";
import { PeriodSelector, PersonalRecordsCard, TrainingCalendar, TrainingPriorityBars, TrainingSummary, WorkoutRow } from "@/components/recomp/progress/progress-widgets";
import { periodLabel, personalRecords, since, trainingPriority, trainingSummary, useTrainingData, type Period } from "@/lib/training-data";

export const Route = createFileRoute("/progress/")({
  head: () => ({ meta: [{ title: "Progress — RECOMP'D" }, { name: "description", content: "See how much you've trained, which muscles get the most attention, your records and bodyweight trend." }, { property: "og:title", content: "Progress — RECOMP'D" }, { property: "og:description", content: "See how much you've trained, which muscles get the most attention, your records and bodyweight trend." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ProgressPage,
});

const periods = ["4W", "3M", "6M", "1Y"] as const;

function ProgressPage() {
  const data = useTrainingData();
  const [period, setPeriod] = useState<Period>("4W");
  const from = since(period);
  const summary = useMemo(() => data ? trainingSummary(data.workouts, from) : null, [data, from]);
  const priority = useMemo(() => data ? trainingPriority(data.workouts, from) : [], [data, from]);
  const records = useMemo(() => data ? personalRecords(data.workouts).recent : [], [data]);

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
          <PeriodSelector value={period} options={periods} onChange={setPeriod} className="relative z-10 border-primary/15 bg-card p-1 shadow-sm" />
          {data.workouts.length ? (
            <>
              <TrainingSummary label={periodLabel[period]} workouts={summary.workouts} sets={summary.sets} durationSec={summary.durationSec} />
              <section><SectionHeading>Muscle workload · {periodLabel[period]}</SectionHeading><TrainingPriorityBars items={priority} /></section>
              <section>
                <SectionHeading action={<Link to="/progress/history" className="flex items-center gap-0.5 text-xs font-bold text-primary">History<ChevronRight className="size-3.5" /></Link>}>Training calendar</SectionHeading>
                <TrainingCalendar workouts={data.workouts} />
                <Card className="mt-2 divide-y divide-border px-4">{data.workouts.slice(0, 2).map((workout) => <WorkoutRow key={workout.id} workout={workout} />)}</Card>
              </section>
              <PersonalRecordsCard records={records} />
            </>
          ) : (
            <Card className="flex items-center justify-between gap-3 p-4">
              <span className="text-sm text-muted-foreground">No workouts recorded yet.</span>
              <Button asChild variant="primary" size="sm"><Link to="/build"><Dumbbell />Start</Link></Button>
            </Card>
          )}
          <BodyweightCard entries={data.bodyweight} />
        </div>
      )}
    </Screen>
  );
}
