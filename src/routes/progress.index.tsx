import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Dumbbell, Settings, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen, SectionHeading } from "@/components/recomp/core";
import { BodyweightCard } from "@/components/recomp/progress/bodyweight";
import { PeriodSelector, PersonalRecordsCard, TrainingCalendar, TrainingPriorityBars } from "@/components/recomp/progress/progress-widgets";
import { formatDuration, periodDays, periodLabel, personalRecords, since, trainingPriority, trainingSummary, useTrainingData, volumeOf, type Period } from "@/lib/training-data";

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
  const allRecords = useMemo(() => data ? personalRecords(data.workouts) : null, [data]);
  const records = allRecords?.recent ?? [];
  const progressStory = useMemo(() => {
    if (!data) return null;
    const now = Date.now();
    const days = periodDays[period];
    const periodMs = days * 86_400_000;
    const currentFrom = now - periodMs;
    const previousFrom = currentFrom - periodMs;
    const current = data.workouts.filter((workout) => workout.startedAt >= currentFrom);
    const previous = data.workouts.filter((workout) => workout.startedAt >= previousFrom && workout.startedAt < currentFrom);
    const currentVolume = current.reduce((total, workout) => total + volumeOf(workout), 0);
    const previousVolume = previous.reduce((total, workout) => total + volumeOf(workout), 0);
    const volumeDelta = previousVolume > 0 ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100) : null;
    const prCount = allRecords ? [...allRecords.byWorkout.entries()].filter(([workoutId]) => current.some((workout) => workout.id === workoutId)).reduce((total, [, prs]) => total + prs.length, 0) : 0;
    return { prCount, volumeDelta };
  }, [data, period, allRecords]);

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
              <Card className="overflow-hidden border-primary/15 p-0">
                <div className="bg-primary/[0.06] px-4 py-3">
                  <div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" /><span className="text-[0.68rem] font-extrabold uppercase tracking-[0.12em]">Your progress · {periodLabel[period]}</span></div>
                  <div className="mt-1.5 text-xl font-extrabold">{progressStory?.prCount ? "You're building momentum" : "You're staying consistent"}</div>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">{progressStory?.prCount ? `${progressStory.prCount} personal record${progressStory.prCount === 1 ? "" : "s"} this period` : "Every completed session adds to the picture."}</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border px-2 py-3 text-center">
                  <div><div className="text-lg font-extrabold text-primary">{summary.workouts}</div><div className="text-[0.62rem] font-semibold text-muted-foreground">workouts</div></div>
                  <div><div className="text-lg font-extrabold text-primary">{summary.sets}</div><div className="text-[0.62rem] font-semibold text-muted-foreground">sets</div></div>
                  <div><div className="text-lg font-extrabold">{formatDuration(summary.durationSec)}</div><div className="text-[0.62rem] font-semibold text-muted-foreground">trained</div></div>
                </div>
                {progressStory?.volumeDelta !== null && progressStory?.volumeDelta !== undefined && <div className="flex items-center justify-center gap-1.5 border-t border-border px-4 py-2.5 text-xs font-bold"><TrendingUp className="size-3.5 text-primary" /><span><span className="text-primary">{progressStory.volumeDelta > 0 ? "+" : ""}{progressStory.volumeDelta}%</span> training volume vs previous {period === "4W" ? "4 weeks" : periodLabel[period].replace("Last ", "").toLowerCase()}</span></div>}
              </Card>
              <section><SectionHeading>Muscle workload · {periodLabel[period]}</SectionHeading><TrainingPriorityBars items={priority} /></section>
              <section>
                <SectionHeading action={<Link to="/progress/history" className="flex items-center gap-0.5 text-xs font-bold text-primary">History<ChevronRight className="size-3.5" /></Link>}>Training calendar</SectionHeading>
                <TrainingCalendar workouts={data.workouts} />
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
