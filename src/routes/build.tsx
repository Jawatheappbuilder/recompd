import { createFileRoute } from "@tanstack/react-router";
import { Header, Screen } from "@/components/recomp/core";
import { WorkoutBuilder } from "@/components/recomp/workout-builder";

export const Route = createFileRoute("/build")({
  head: () => ({ meta: [
    { title: "Build Workout — RECOMP'D" }, { name: "description", content: "Generate or build your next strength workout." },
    { property: "og:title", content: "Build Workout — RECOMP'D" }, { property: "og:description", content: "Generate or build your next strength workout." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: BuildPage,
});
function BuildPage() { return <Screen><Header title="Build workout"/><WorkoutBuilder/></Screen>; }