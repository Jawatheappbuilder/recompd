import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/recomp/core";
import { InlineEmpty, SubHeader } from "@/components/recomp/progress/progress-widgets";
import { WorkoutDetail } from "@/components/recomp/progress/workout-detail";
import { personalRecords, useTrainingData } from "@/lib/training-data";

export const Route = createFileRoute("/progress/workout/$id")({
  head: () => ({ meta: [{ title: "Workout Details — RECOMP'D" }, { name: "description", content: "Exercises, sets, reps, weights and records from a completed workout." }, { property: "og:title", content: "Workout Details — RECOMP'D" }, { property: "og:description", content: "Exercises, sets, reps, weights and records from a completed workout." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WorkoutPage,
});

function WorkoutPage() {
  const { id } = Route.useParams();
  const data = useTrainingData();
  if (!data) return null;
  const workout = data.workouts.find((item) => item.id === id);
  return (
    <Screen>
      {workout ? <WorkoutDetail key={workout.id + workout.durationSec} workout={workout} prs={personalRecords(data.workouts).byWorkout.get(workout.id) ?? []} /> : <><SubHeader title="Workout" /><InlineEmpty>This workout no longer exists.</InlineEmpty></>}
    </Screen>
  );
}
