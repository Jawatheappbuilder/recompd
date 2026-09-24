import { Check, Clock3, Flame, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { priorities, weekDays } from "@/data/mock-data";
import { Metric, SectionHeading, SummaryRow } from "./core";

export function ProgressRing({ value = 75, current = 3, target = 4, size = 86 }: { value?: number; current?: number; target?: number; size?: number }) {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  return <div className="relative shrink-0" style={{ width: size, height: size }}><svg className="-rotate-90" viewBox="0 0 86 86" aria-label={`${current} of ${target} workouts complete`}><circle cx="43" cy="43" r={radius} fill="none" stroke="var(--color-track)" strokeWidth="7"/><circle className="progress-stroke" cx="43" cy="43" r={radius} fill="none" stroke="var(--color-primary)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)}/></svg><div className="absolute inset-0 grid place-content-center text-center"><span className="text-xl font-black tabular-nums">{current}<span className="text-muted-foreground">/{target}</span></span><span className="text-[0.56rem] font-bold uppercase text-muted-foreground">workouts</span></div></div>;
}

export function WeekTracker() {
  return <div className="grid grid-cols-7 gap-1.5">{weekDays.map((day, index) => <div className="flex flex-col items-center gap-1.5" key={`${day.label}-${index}`}><span className="text-[0.62rem] font-bold text-muted-foreground">{day.label}</span><div className={cn("grid size-7 place-items-center rounded-full border text-[0.65rem] font-black", day.state === "complete" && "border-primary bg-primary text-primary-foreground", day.state === "scheduled" && "border-primary text-primary", day.state === "rest" && "border-border bg-secondary text-muted-foreground")}>{day.state === "complete" ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}</div></div>)}</div>;
}

export function WeeklyTraining() {
  return <section><SectionHeading>This week</SectionHeading><Card className="p-4"><div className="flex items-center gap-4"><ProgressRing/><div className="min-w-0 flex-1"><WeekTracker /></div></div><div className="mt-4 grid grid-cols-3 border-t border-border pt-3"><Metric value="3" label="Completed" accent/><Metric value="42" label="Total sets"/><Metric value="2h 38m" label="Training time"/></div></Card></section>;
}

export function TrainingPriority({ compact = false }: { compact?: boolean }) {
  return <section><SectionHeading>Training priority</SectionHeading><Card className="space-y-3.5 p-4">{priorities.slice(0, compact ? 3 : undefined).map((item) => <div key={item.name}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-semibold">{item.name}</span><span className={cn("font-bold", item.level === "High" ? "text-primary" : "text-muted-foreground")}>{item.level}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-track"><div className={cn("h-full rounded-full", item.level === "Low" ? "bg-muted-foreground" : "bg-primary")} style={{ width: `${item.value}%` }} /></div></div>)}</Card></section>;
}

export function WorkoutSummary() {
  return <section><SectionHeading>Recent</SectionHeading><Card className="px-4 py-1"><SummaryRow title="Upper Body" subtitle="Yesterday · 52 min" meta="18 sets" /></Card></section>;
}

export function BodyweightSummary() {
  return <section><SectionHeading>Bodyweight</SectionHeading><Card className="flex items-center justify-between p-4"><div><div className="text-2xl font-black tabular-nums">101.2 <span className="text-sm text-muted-foreground">kg</span></div><div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary"><TrendingDown className="size-3.5"/>0.8 kg <span className="font-medium text-muted-foreground">over 30 days</span></div></div><div className="flex h-10 items-end gap-1" aria-hidden="true">{[24,18,30,26,20,14,11].map((height, i) => <span key={i} className="w-1 rounded-full bg-primary/70" style={{ height }} />)}</div></Card></section>;
}

export function StatChip({ icon: Icon = Flame, value, label }: { icon?: typeof Flame; value: string; label: string }) {
 return <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary p-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Icon className="size-4"/></div><div><div className="font-bold tabular-nums">{value}</div><div className="text-[0.65rem] text-muted-foreground">{label}</div></div></div>
}
export { Clock3 };
