import { Link, createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Settings } from "lucide-react";
import { Screen } from "@/components/recomp/core";
import { WorkoutBuilder } from "@/components/recomp/workout-builder";

const searchSchema = z.object({ mode: fallback(z.string(), "generate").default("generate") });

export const Route = createFileRoute("/build")({
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
  return <Screen><div className="relative -mx-4 -mt-[calc(1rem+env(safe-area-inset-top))] overflow-hidden bg-primary px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))] text-primary-foreground"><div aria-hidden className="pointer-events-none absolute -right-12 top-4 size-40 rounded-full bg-white/[0.09] blur-3xl" /><div className="relative flex items-center justify-between gap-4"><div className="wordmark text-primary-foreground">RECOMP\'D</div><Link to="/settings" aria-label="Settings" className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/10 transition-colors hover:bg-white/20"><Settings className="size-5" /></Link></div><h1 className="relative mt-4 text-[1.7rem] font-extrabold leading-tight">Build workout</h1></div><div className="relative z-10 -mt-5"><WorkoutBuilder key={initial} initialMode={initial}/></div></Screen>;
}
