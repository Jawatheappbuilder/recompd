import { Check, Clock3, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { bodyweightChange, dayKey, formatDay, formatDuration, formatKg, setCount, since, trainingPriority, trainingSummary, useTrainingData } from "@/lib/training-data";
import { useUserPreferences } from "@/lib/user-preferences";
import { Metric, SectionHeading, SummaryRow } from "./core";

export function ProgressRing({ value = 75, current = 3, target = 4, size = 86 }: { value?: number; current?: number; target?: number; size?: number }) {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  return <div className="relative shrink-0" style={{ width: size, height: size }}><svg className="-rotate-90" viewBox="0 0 86 86" aria-label={`${current} of ${target} workouts complete`}><circle cx="43" cy="43" r={radius} fill="none" stroke="var(--color-track)" strokeWidth="7"/><circle className="progress-stroke" cx="43" cy="43" r={radius} fill="none" stroke="var(--color-primary)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)}/></svg><div className="absolute inset-0 grid place-content-center text-center"><span className="text-xl font-black tabular-nums">{current}<span className="text-muted-foreground">/{target}</span></span><span className="text-[0.56rem] font-bold uppercase text-muted-foreground">workouts</span></div></div>;
}

const DAY_MS = 86_400_000;
function weekStart(startsOn: "Monday" | "Sunday") {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const offset = startsOn === "Monday" ? (d.getDay() + 6) % 7 : d.getDay();
  return d.getTime() - offset * DAY_MS;
}
const dayLetters = { Monday: ["M", "T", "W", "T", "F", "S", "S"], Sunday: ["S", "M", "T", "W", "T", "F", "S"] } as const;

export function WeekTracker({ start, trainedDays, startsOn }: { start: number; trainedDays: Set<string>; startsOn: "Monday" | "Sunday" }) {
  const today = dayKey(Date.now());
  return <div className="grid grid-cols-7 gap-1.5">{dayLetters[startsOn].map((label, index) => { const key = dayKey(start + index * DAY_MS + DAY_MS / 2); const complete = trainedDays.has(key); const isToday = key === today; return <div className="flex flex-col items-center gap-1.5" key={`${label}-${index}`}><span className="text-[0.62rem] font-bold text-muted-foreground">{label}</span><div className={cn("grid size-7 place-items-center rounded-full border text-[0.65rem] font-black", complete && "border-primary bg-primary text-primary-foreground", !complete && isToday && "border-primary text-primary", !complete && !isToday && "border-border bg-secondary text-muted-foreground")}>{complete ? <Check className="size-3.5" strokeWidth={3} /> : new Date(start + index * DAY_MS + DAY_MS / 2).getDate()}</div></div>; })}</div>;
}

export function WeeklyTraining() {
  const data = useTrainingData(); const [preferences] = useUserPreferences();
  const start = weekStart(preferences.weekStartsOn);
  const week = (data?.workouts ?? []).filter((workout) => workout.startedAt >= start);
  const summary = trainingSummary(week, start); const target = preferences.weeklyWorkoutTarget;
  return <section><SectionHeading>This week</SectionHeading><Card className="p-3.5"><div className="flex items-center gap-4"><ProgressRing size={76} current={summary.workouts} target={target} value={Math.min(100, (summary.workouts / target) * 100)}/><div className="min-w-0 flex-1"><WeekTracker start={start} startsOn={preferences.weekStartsOn} trainedDays={new Set(week.map((workout) => dayKey(workout.startedAt)))} /></div></div><div className="mt-3 grid grid-cols-3 border-t border-border pt-2.5"><Metric value={String(summary.workouts)} label="Completed" accent/><Metric value={String(summary.sets)} label="Total sets"/><Metric value={formatDuration(summary.durationSec)} label="Training time"/></div></Card></section>;
}

export function TrainingPriority({ compact = false }: { compact?: boolean }) {
  const data = useTrainingData();
  const items = trainingPriority(data?.workouts ?? [], since("4W")).filter((item) => item.score > 0).slice(0, compact ? 3 : undefined);
  return <section><SectionHeading>Training priority</SectionHeading><Card className="space-y-2.5 px-3.5 py-3">{items.length ? items.map((item) => <div key={item.muscle}><div className="mb-1 flex items-center justify-between text-xs"><span className="font-semibold">{item.muscle}</span><span className={cn("font-bold", item.level === "High" ? "text-primary" : "text-muted-foreground")}>{item.level}</span></div><div className="h-1 overflow-hidden rounded-full bg-track"><div className={cn("h-full rounded-full", item.level === "Low" ? "bg-muted-foreground" : "bg-primary")} style={{ width: `${Math.round(item.ratio * 100)}%` }} /></div></div>) : <p className="py-1 text-xs text-muted-foreground">Complete a workout to see your training priority.</p>}</Card></section>;
}

function relativeDay(ts: number) {
  const diff = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / DAY_MS);
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : formatDay(ts);
}

export function WorkoutSummary() {
  const latest = useTrainingData()?.workouts[0];
  return <section><SectionHeading>Recent</SectionHeading><Card className="px-4 py-1">{latest ? <Link to="/progress/workout/$id" params={{ id: latest.id }} className="block"><SummaryRow title={latest.name} subtitle={`${relativeDay(latest.startedAt)} · ${formatDuration(latest.durationSec)}`} meta={`${setCount(latest)} sets`} /></Link> : <p className="py-3 text-xs text-muted-foreground">No workouts yet.</p>}</Card></section>;
}

export function BodyweightSummary() {
  const entries = useTrainingData()?.bodyweight ?? [];
  const latest = entries.at(-1); const change = bodyweightChange(entries, since("4W"));
  const recent = entries.slice(-7); const min = Math.min(...recent.map((e) => e.kg)); const max = Math.max(...recent.map((e) => e.kg));
  if (!latest) return <section><SectionHeading>Bodyweight</SectionHeading><Card className="p-4"><Link to="/progress/bodyweight" className="text-xs text-muted-foreground">No bodyweight logged yet. <span className="font-semibold text-primary">Log weight</span></Link></Card></section>;
  const Trend = change && change.delta > 0 ? TrendingUp : TrendingDown;
  return <section><SectionHeading>Bodyweight</SectionHeading><Card className="flex items-center justify-between p-4"><div><div className="text-2xl font-black tabular-nums">{formatKg(latest.kg).replace(" kg", "")} <span className="text-sm text-muted-foreground">kg</span></div>{change ? <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary"><Trend className="size-3.5"/>{formatKg(Math.abs(Math.round(change.delta * 10) / 10))} <span className="font-medium text-muted-foreground">over {change.days} days</span></div> : <div className="mt-1 text-xs text-muted-foreground">{formatDay(latest.loggedAt)}</div>}</div><div className="flex h-10 items-end gap-1" aria-hidden="true">{recent.map((entry) => <span key={entry.id} className="w-1 rounded-full bg-primary/70" style={{ height: max === min ? 20 : 10 + ((entry.kg - min) / (max - min)) * 30 }} />)}</div></Card></section>;
}

export function StatChip({ icon: Icon = Flame, value, label }: { icon?: typeof Flame; value: string; label: string }) {
 return <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary p-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Icon className="size-4"/></div><div><div className="font-bold tabular-nums">{value}</div><div className="text-[0.65rem] text-muted-foreground">{label}</div></div></div>
}
export { Clock3 };
