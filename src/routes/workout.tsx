import { createFileRoute } from "@tanstack/react-router";
import { ActiveWorkout } from "@/components/recomp/active-workout";
import { EmptyWorkout } from "@/components/recomp/empty-workout";
import { Header, Screen } from "@/components/recomp/core";
import { useActiveWorkout } from "@/hooks/use-active-workout";

export const Route = createFileRoute("/workout")({
  head: () => ({ meta: [
    { title: "Workout — RECOMP'D" }, { name: "description", content: "Start and track your current strength workout." },
    { property: "og:title", content: "Workout — RECOMP'D" }, { property: "og:description", content: "Start and track your current strength workout." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: WorkoutPage,
});
function WorkoutPage() {
  const { workout, setWorkout, hydrated } = useActiveWorkout();
  if (!hydrated) return <Screen>{null}</Screen>;
  if (!workout) return <Screen><Header/><EmptyWorkout/></Screen>;
  return <Screen className="pt-0"><ActiveWorkout workout={workout} onChange={(next) => setWorkout(next)} /></Screen>;
}