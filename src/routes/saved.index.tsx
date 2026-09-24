import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/recomp/core";
import { BackLink, PlanHeader } from "@/components/recomp/workout-plan-view";
import { useCloudData } from "@/lib/cloud-data";

export const Route = createFileRoute("/saved/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Saved Workouts — RECOMP'D" }, { name: "description", content: "Your reusable saved workout templates." },
    { property: "og:title", content: "Saved Workouts — RECOMP'D" }, { property: "og:description", content: "Your reusable saved workout templates." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SavedPage,
});

function SavedPage() {
  const data = useCloudData();
  const saved = data?.saved ?? [];
  return <Screen>
    <PlanHeader back={<BackLink to="/workout" label="Back to workout" />} title="Saved workouts" subtitle={data ? `${saved.length} saved` : undefined} />
    {data && !saved.length && <p className="py-10 text-center text-sm font-semibold text-muted-foreground">No saved workouts yet.</p>}
    <div className="space-y-2">{saved.map((item) => <Link key={item.id} to="/saved/$id" params={{ id: item.id }} className="block">
      <Card className="flex items-center gap-3 p-3.5 transition-colors hover:bg-accent">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold">{item.name}</div>
          <div className="mt-0.5 truncate text-[0.7rem] font-semibold text-muted-foreground">{item.exercises.length} exercises · {item.exercises.map((e) => e.name).join(", ")}</div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Card>
    </Link>)}</div>
  </Screen>;
}
