import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/recomp/core";
import { InlineEmpty, SubHeader, WorkoutRow } from "@/components/recomp/progress/progress-widgets";
import { useTrainingData } from "@/lib/training-data";

export const Route = createFileRoute("/progress/history")({
  head: () => ({ meta: [{ title: "Workout History — RECOMP'D" }, { name: "description", content: "Every workout you've completed, with duration and sets." }, { property: "og:title", content: "Workout History — RECOMP'D" }, { property: "og:description", content: "Every workout you've completed, with duration and sets." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const data = useTrainingData();
  const groups = new Map<string, NonNullable<typeof data>["workouts"]>();
  data?.workouts.forEach((workout) => { const label = new Date(workout.startedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" }); groups.set(label, [...(groups.get(label) ?? []), workout]); });
  return (
    <Screen>
      <SubHeader title="Workout history" subtitle={data ? `${data.workouts.length} workouts` : undefined} />
      {data && !data.workouts.length && <InlineEmpty>No workouts recorded yet.</InlineEmpty>}
      <div className="space-y-4">
        {[...groups].map(([label, workouts]) => (
          <section key={label}><h2 className="mb-1.5 text-[0.72rem] font-bold uppercase tracking-[0.13em] text-muted-foreground">{label}</h2><Card className="divide-y divide-border px-4">{workouts.map((workout) => <WorkoutRow key={workout.id} workout={workout} />)}</Card></section>
        ))}
      </div>
    </Screen>
  );
}
