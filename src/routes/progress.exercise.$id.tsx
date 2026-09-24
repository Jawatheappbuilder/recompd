import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/recomp/core";
import { ExerciseProgress } from "@/components/recomp/progress/exercise-progress";
import { SubHeader } from "@/components/recomp/progress/progress-widgets";
import { exerciseHistory, useTrainingData } from "@/lib/training-data";

export const Route = createFileRoute("/progress/exercise/$id")({
  head: () => ({ meta: [{ title: "Exercise Progress — RECOMP'D" }, { name: "description", content: "Track weight, estimated 1RM and volume for one exercise over time." }, { property: "og:title", content: "Exercise Progress — RECOMP'D" }, { property: "og:description", content: "Track weight, estimated 1RM and volume for one exercise over time." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ExercisePage,
});

function ExercisePage() {
  const { id } = Route.useParams();
  const data = useTrainingData();
  const name = data ? exerciseHistory(data.workouts, id)[0]?.name ?? "Exercise" : "";
  return <Screen><SubHeader title={name} />{data && <ExerciseProgress workouts={data.workouts} exerciseId={id} />}</Screen>;
}
