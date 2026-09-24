import { createFileRoute } from "@tanstack/react-router";
import { EmptyWorkout } from "@/components/recomp/empty-workout";
import { Header, Screen } from "@/components/recomp/core";

export const Route = createFileRoute("/workout")({
  head: () => ({ meta: [
    { title: "Workout — RECOMP'D" }, { name: "description", content: "Start and track your current strength workout." },
    { property: "og:title", content: "Workout — RECOMP'D" }, { property: "og:description", content: "Start and track your current strength workout." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: WorkoutPage,
});
function WorkoutPage() { return <Screen><Header/><EmptyWorkout/></Screen>; }