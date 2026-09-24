import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/recomp/core";
import { BackLink, PlanHeader } from "@/components/recomp/workout-plan-view";
import { useCloudData } from "@/lib/cloud-data";
import { shareWorkoutLink } from "@/lib/workout-share";

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
    <div className="space-y-2">{saved.map((item) => <div key={item.id} className="relative">
      <Link to="/saved/$id" params={{ id: item.id }} className="block">
        <Card className="flex items-center gap-3 p-3.5 pr-12 transition-colors hover:bg-accent">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-extrabold">{item.name}</div>
            <div className="mt-0.5 truncate text-[0.7rem] font-semibold text-muted-foreground">{item.exercises.length} exercises · {item.exercises.map((e) => e.name).join(", ")}</div>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Card>
      </Link>
      <ShareIconButton name={item.name} exercises={item.exercises} />
    </div>)}</div>
  </Screen>;
}

function ShareIconButton({ name, exercises }: { name: string; exercises: import("@/data/exercises").WorkoutExercise[] }) {
  const [busy, setBusy] = useState(false);
  const share = async () => {
    setBusy(true);
    try {
      const result = await shareWorkoutLink(name, exercises);
      if (result === "copied") toast.success("Link copied");
    } catch { toast.error("Couldn't create a share link"); }
    finally { setBusy(false); }
  };
  return <button type="button" aria-label={`Share ${name}`} disabled={busy || !exercises.length} onClick={() => void share()}
    className="absolute right-2.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50">
    {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
  </button>;
}
