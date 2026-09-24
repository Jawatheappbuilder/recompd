import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { WorkoutExercise } from "@/data/exercises";
import { shareWorkoutLink } from "@/lib/workout-share";

export function ShareLinkButton({ name, exercises, className }: { name: string; exercises: WorkoutExercise[]; className?: string }) {
  const [busy, setBusy] = useState(false);
  const share = async () => {
    setBusy(true);
    try {
      const result = await shareWorkoutLink(name, exercises);
      if (result === "copied") toast.success("Link copied");
    } catch { toast.error("Couldn't create a share link"); }
    finally { setBusy(false); }
  };
  return <Button variant="surface" className={className} disabled={busy || !exercises.length} onClick={() => void share()}>{busy ? <Loader2 className="animate-spin" /> : <Send />}Share workout</Button>;
}
