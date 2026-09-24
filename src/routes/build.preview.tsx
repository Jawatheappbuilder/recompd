import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { GeneratedWorkoutPreview } from "@/components/recomp/generated-workout-preview";
import { Screen } from "@/components/recomp/core";
import { muscleGroups, type Muscle } from "@/data/exercises";

const previewSearchSchema = z.object({
  muscles: fallback(z.string(), "Chest,Back").default("Chest,Back"),
  count: fallback(z.coerce.number().int().min(1).max(12), 6).default(6),
});

export const Route = createFileRoute("/build/preview")({
  validateSearch: zodValidator(previewSearchSchema),
  head: () => ({ meta: [
    { title: "Generated Workout — RECOMP'D" },
    { name: "description", content: "Review and adjust your generated strength workout." },
    { property: "og:title", content: "Generated Workout — RECOMP'D" },
    { property: "og:description", content: "Review and adjust your generated strength workout." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: GeneratedPreviewPage,
});

function GeneratedPreviewPage() {
  const search = Route.useSearch();
  const allowed = new Set<string>(muscleGroups);
  const muscles = search["muscles"].split(",").filter((muscle: string): muscle is Muscle => allowed.has(muscle));
  const selection: Muscle[] = muscles.length ? muscles : ["Chest", "Back"];
  return <Screen><GeneratedWorkoutPreview key={`${selection.join("-")}-${search["count"]}`} muscles={selection} count={search["count"]} /></Screen>;
}