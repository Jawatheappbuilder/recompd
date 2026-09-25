import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SectionHeading } from "@/components/recomp/core";
import {
  dayKey, formatDay, formatDuration, formatKg, formatLongDay, formatSet, setCount,
  type CompletedWorkout, type ExerciseRecord, type Period, type WorkloadLevel,
} from "@/lib/training-data";
import { cn } from "@/lib/utils";
import { localDateKey, useScheduledWorkouts } from "@/lib/workout-storage";

export function PeriodSelector<T extends Period>({ value, options, onChange, className }: { value: T; options: readonly T[]; onChange: (value: T) => void; className?: string }) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-lg border border-border bg-secondary p-0.5", className)}>
      {options.map((option) => (
        <button key={option} type="button" role="radio" aria-checked={value === option} onClick={() => onChange(option)}
          className={cn("h-7 min-w-10 rounded-md px-2 text-[0.68rem] font-bold tabular-nums transition-colors", value === option ? "bg-elevated text-primary" : "text-muted-foreground hover:text-foreground")}>
          {option}
        </button>
      ))}
    </div>
  );
}

export function SubHeader({ title, subtitle, action }: { title: string; subtitle?: string | undefined; action?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="mb-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pt-1">
      <Button variant="surface" size="icon" className="size-10" aria-label="Back" onClick={() => router.history.canGoBack() ? router.history.back() : void router.navigate({ to: "/progress" })}><ArrowLeft /></Button>
      <div className="min-w-0"><h1 className="text-xl font-extrabold leading-tight">{title}</h1>{subtitle && <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{subtitle}</p>}</div>
      {action ?? <span />}
    </header>
  );
}

export const InlineEmpty = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="flex min-h-12 items-center justify-between gap-3 text-sm text-muted-foreground"><span>{children}</span>{action}</div>
);

export function TrainingSummary({ label, workouts, sets, durationSec }: { label: string; workouts: number; sets: number; durationSec: number }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-primary/10 blur-3xl" />
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.13em] text-muted-foreground">{label}</p>
      <div className="mt-2 grid grid-cols-3 divide-x divide-border">
        <Stat value={String(workouts)} label="workouts" accent />
        <Stat value={String(sets)} label="sets" />
        <Stat value={formatDuration(durationSec)} label="trained" />
      </div>
    </Card>
  );
}
function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return <div className="px-3 first:pl-0"><div className={cn("font-display whitespace-nowrap text-[1.75rem] font-extrabold leading-none tabular-nums", accent && "text-primary")}>{value}</div><div className="mt-1 text-[0.7rem] font-medium text-muted-foreground">{label}</div></div>;
}

const levelStyle: Record<WorkloadLevel, { bar: string; text: string }> = {
  "High workload": { bar: "bg-primary", text: "text-primary" },
  "Moderate workload": { bar: "bg-soft", text: "text-foreground" },
  "Low workload": { bar: "bg-soft/40", text: "text-muted-foreground" },
};

function AnimatedPriorityBar({ item, delay }: { item: { ratio: number; level: WorkloadLevel; score: number }; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const target = Math.max(item.ratio * 100, item.score ? 4 : 0);
  return <div className="h-1.5 overflow-hidden rounded-full bg-track"><div className={cn("h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none", levelStyle[item.level].bar)} style={{ width: visible ? `${target}%` : "0%", transitionDelay: `${delay}ms` }} /></div>;
}

export function TrainingPriorityBars({ items }: { items: { muscle: string; ratio: number; level: WorkloadLevel; score: number }[] }) {
  if (!items.some((item) => item.score > 0)) return <Card className="px-4 py-2"><InlineEmpty>No training in this period</InlineEmpty></Card>;
  return (
    <Card className="space-y-1.5 p-4">
      {items.map((item, index) => (
        <div key={item.muscle} className="grid grid-cols-[5.5rem_minmax(0,1fr)_7.25rem] items-center gap-2">
          <span className="text-xs font-bold">{item.muscle}</span>
          <AnimatedPriorityBar item={item} delay={index * 55} />
          <span className={cn("text-right text-[0.68rem] font-bold", levelStyle[item.level].text)}>{item.level}</span>
        </div>
      ))}
    </Card>
  );
}

export function WorkoutRow({ workout }: { workout: CompletedWorkout }) {
  return (
    <Link to="/progress/workout/$id" params={{ id: workout.id }} className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 transition-colors hover:bg-accent/40">
      <span className="min-w-0"><span className="block text-sm font-bold leading-snug">{workout.name}</span><span className="mt-0.5 block text-[0.7rem] text-muted-foreground">{formatDay(workout.startedAt)} · {formatDuration(workout.durationSec)} · {setCount(workout)} sets</span></span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];

export function TrainingCalendar({ workouts }: { workouts: CompletedWorkout[] }) {
  const scheduled = useScheduledWorkouts();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState<number | null>(null);
  const byDay = useMemo(() => {
    const map = new Map<string, CompletedWorkout[]>();
    workouts.forEach((workout) => map.set(dayKey(workout.startedAt), [...(map.get(dayKey(workout.startedAt)) ?? []), workout]));
    return map;
  }, [workouts]);
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const todayKey = dayKey(Date.now());
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === month;
  const count = [...Array(days).keys()].filter((index) => byDay.has(dayKey(new Date(year, month, index + 1).getTime()))).length;
  const scheduledByDay = useMemo(() => new Map(scheduled.filter((item) => !item.completedAt).map((item) => [item.date, item.id])), [scheduled]);
  const selectedWorkouts = selected ? byDay.get(dayKey(selected)) ?? [] : [];

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label="Previous month" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft /></Button>
        <div className="text-center"><div className="text-sm font-bold">{cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div><div className="text-[0.65rem] font-semibold text-muted-foreground">{count} training days</div></div>
        <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label="Next month" disabled={isCurrentMonth} onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight /></Button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {weekdayLabels.map((label, index) => <span key={index} className="pb-1 text-[0.62rem] font-bold text-muted-foreground">{label}</span>)}
        {Array.from({ length: lead }, (_, index) => <span key={`lead-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const ts = new Date(year, month, index + 1).getTime();
          const trained = byDay.has(dayKey(ts));
          const scheduleKey = localDateKey(new Date(ts));
          const scheduledId = !trained ? scheduledByDay.get(scheduleKey) : undefined;
          const today = dayKey(ts) === todayKey;
          const dayClass = cn("relative mx-auto grid size-10 place-items-center rounded-xl text-xs font-semibold tabular-nums transition-colors",
            trained && "bg-emerald-500/[0.12] text-emerald-700 dark:bg-emerald-400/[0.12] dark:text-emerald-400",
            scheduledId && "text-foreground",
            !trained && !scheduledId && "text-muted-foreground/70",
            today && "ring-1 ring-border");
          const content = <><span>{trained ? <Check className="size-4" strokeWidth={3} /> : index + 1}</span>{scheduledId && <span aria-hidden className="absolute bottom-1.5 size-1.5 rounded-full bg-primary" />}</>;
          return scheduledId ? (
            <Link key={index} to="/scheduled/$id" params={{ id: scheduledId }} aria-label={`${index + 1}, scheduled workout`} className={dayClass}>{content}</Link>
          ) : (
            <button key={index} type="button" disabled={!trained} onClick={() => setSelected(ts)} aria-label={`${index + 1}${trained ? ", workout completed" : ""}`} className={dayClass}>{content}</button>
          );
        })}
      </div>
      <Drawer open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover">
          <DrawerHeader className="pb-1 text-left"><DrawerTitle>{selected ? new Date(selected).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : ""}</DrawerTitle></DrawerHeader>
          <div className="divide-y divide-border px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{selectedWorkouts.map((workout) => <WorkoutRow key={workout.id} workout={workout} />)}</div>
        </DrawerContent>
      </Drawer>
    </Card>
  );
}

export const recordValue = (record: ExerciseRecord) => record.bodyweight ? `${record.heaviest.reps} reps` : record.heaviest.reps === 1 ? formatKg(record.heaviest.weight) : formatSet(record.heaviest);

export function RecordRow({ record, detail }: { record: ExerciseRecord; detail?: boolean }) {
  return (
    <Link to="/progress/exercise/$id" params={{ id: record.exerciseId }} className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2">
      <span className={cn("grid size-8 place-items-center rounded-lg", record.lastPrAt ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}><Trophy className="size-4" /></span>
      <span className="min-w-0"><span className="block text-sm font-bold leading-snug">{record.name}</span><span className="mt-0.5 block text-[0.7rem] text-muted-foreground">{formatDay(record.heaviest.at)}{detail && record.best1RM > 0 ? ` · e1RM ${formatKg(Math.round(record.best1RM * 2) / 2)}` : ""}</span></span>
      <span className="text-sm font-extrabold tabular-nums">{recordValue(record)}</span>
    </Link>
  );
}

export function PersonalRecordsCard({ records }: { records: ExerciseRecord[] }) {
  return (
    <section>
      <SectionHeading action={<Link to="/progress/records" className="text-xs font-bold text-primary">View all</Link>}>Personal records</SectionHeading>
      <Card className="divide-y divide-border px-4">
        {records.length ? records.slice(0, 3).map((record) => <RecordRow key={record.exerciseId} record={record} />) : <InlineEmpty>No records yet</InlineEmpty>}
      </Card>
    </section>
  );
}

export { formatLongDay };
