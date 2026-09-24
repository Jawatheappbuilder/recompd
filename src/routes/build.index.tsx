import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Header, Screen } from "@/components/recomp/core";
import { WorkoutBuilder } from "@/components/recomp/workout-builder";

const searchSchema = z.object({ mode: fallback(z.string(), "generate").default("generate") });

export const Route = createFileRoute("/build/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [
    { title: "Build Workout — RECOMP'D" }, { name: "description", content: "Generate or build your next strength workout." },
    { property: "og:title", content: "Build Workout — RECOMP'D" }, { property: "og:description", content: "Generate or build your next strength workout." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: BuildPage,
});
function BuildPage() {
  const { mode } = Route.useSearch();
  const initial = mode === "manual" ? "manual" : "generate";
  return <Screen><Header title="Build workout"/><WorkoutBuilder key={initial} initialMode={initial}/></Screen>;
}
