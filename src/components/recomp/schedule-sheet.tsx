import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { WorkoutExercise } from "@/data/exercises";
import { newId } from "@/lib/cloud-data";
import { cloneExercises, localDateKey, saveScheduledWorkout, type ScheduledWorkout } from "@/lib/workout-storage";

const field = "h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground focus:border-primary";

export function ScheduleSheet({ open, onOpenChange, title = "Schedule workout", defaultName, initialDate, initialTime, confirmLabel = "Schedule workout", onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; title?: string; defaultName: string; initialDate?: string; initialTime?: string; confirmLabel?: string;
  onConfirm: (value: { name: string; date: string; time?: string }) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [date, setDate] = useState(initialDate ?? localDateKey());
  const [time, setTime] = useState(initialTime ?? "");
  useEffect(() => { if (open) { setName(defaultName); setDate(initialDate ?? localDateKey()); setTime(initialTime ?? ""); } }, [open, defaultName, initialDate, initialTime]);

  return <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover">
      <DrawerHeader className="pb-2 text-left"><DrawerTitle>{title}</DrawerTitle></DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        <label className="block"><span className="mb-1 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Workout name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={field} /></label>
        <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
          <label className="block min-w-0"><span className="mb-1 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Date</span>
            <input type="date" value={date} min={localDateKey()} onChange={(e) => setDate(e.target.value)} className={field} /></label>
          <label className="block min-w-0"><span className="mb-1 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Time (optional)</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} /></label>
        </div>
        <Button variant="primary" size="xl" className="w-full" disabled={!date} onClick={() => { onConfirm({ name: name.trim() || defaultName, date, ...(time ? { time } : {}) }); onOpenChange(false); }}>
          <CalendarPlus />{confirmLabel}
        </Button>
      </div>
    </DrawerContent>
  </Drawer>;
}

/** Creates a new scheduled instance (a copy — templates are never modified). */
export function scheduleNewWorkout(value: { name: string; date: string; time?: string }, exercises: WorkoutExercise[], sourceSavedId?: string) {
  const now = Date.now();
  const entry: ScheduledWorkout = { id: `sched-${newId()}`, name: value.name, date: value.date, ...(value.time ? { time: value.time } : {}), exercises: cloneExercises(exercises), ...(sourceSavedId ? { sourceSavedId } : {}), createdAt: now, updatedAt: now };
  saveScheduledWorkout(entry);
  toast.success("Workout scheduled");
  return entry;
}
