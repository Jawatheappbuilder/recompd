import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/recomp/core";
import { estimate1RM, exerciseHistory, formatDay, formatSet, type CompletedWorkout } from "@/lib/training-data";
import { cn } from "@/lib/utils";

type Metric = "Weight" | "e1RM" | "Volume" | "Reps";

export function ExerciseProgress({ workouts, exerciseId }: { workouts: CompletedWorkout[]; exerciseId: string }) {
  const history = useMemo(() => exerciseHistory(workouts, exerciseId), [workouts, exerciseId]);
  const weighted = history.some((session) => session.sets.some((set) => set.weight > 0));
  const metrics: Metric[] = weighted ? ["Weight", "e1RM", "Volume"] : ["Reps"];
  const [metric, setMetric] = useState<Metric>(metrics[0]!);
  const active = metrics.includes(metric) ? metric : metrics[0]!;

  const data = [...history].reverse().map((session) => ({
    x: session.at,
    value: active === "Weight" ? Math.max(...session.sets.map((set) => set.weight))
      : active === "e1RM" ? Math.round(Math.max(...session.sets.map(estimate1RM)) * 10) / 10
      : active === "Volume" ? session.sets.reduce((sum, set) => sum + set.weight * set.reps, 0)
      : Math.max(...session.sets.map((set) => set.reps)),
  })).filter((point) => point.value > 0);
  const unit = active === "Reps" ? "reps" : "kg";

  return (
    <div className="space-y-5">
      {data.length > 1 && (
        <Card className="p-4">
          {metrics.length > 1 && (
            <div className="mb-3 grid grid-cols-3 rounded-lg border border-border bg-secondary p-0.5">
              {metrics.map((item) => <button key={item} type="button" aria-pressed={active === item} onClick={() => setMetric(item)} className={cn("h-8 rounded-md text-xs font-bold", active === item ? "bg-elevated text-primary" : "text-muted-foreground")}>{item === "e1RM" ? "Est. 1RM" : item}</button>)}
            </div>
          )}
          <div className="font-display text-3xl font-extrabold tabular-nums">{data.at(-1)!.value.toLocaleString()}<span className="ml-1 text-base text-muted-foreground">{unit}</span></div>
          <div className="-mx-1 mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
                <defs><linearGradient id="ex-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--soft)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--soft)" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(value: number) => formatDay(value)} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={36} tickCount={4} />
                <Tooltip cursor={{ stroke: "var(--border)" }} content={({ active: on, payload }) => {
                  const point = payload?.[0]?.payload as { x: number; value: number } | undefined;
                  return on && point ? <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5"><div className="text-sm font-extrabold tabular-nums">{point.value.toLocaleString()} {unit}</div><div className="text-[0.65rem] text-muted-foreground">{formatDay(point.x)}</div></div> : null;
                }} />
                <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#ex-fill)" dot={{ r: 2.5, fill: "var(--primary)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      <section>
        <SectionHeading>Recent sessions</SectionHeading>
        <Card className="divide-y divide-border px-4">
          {history.slice(0, 8).map((session) => (
            <div key={session.workoutId} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 py-3">
              <span className="text-xs font-bold text-muted-foreground">{formatDay(session.at)}</span>
              <div className="space-y-0.5 text-sm font-semibold tabular-nums">{session.sets.map((set, index) => <div key={index}>{formatSet(set)}</div>)}</div>
            </div>
          ))}
          {!history.length && <p className="py-4 text-sm text-muted-foreground">No sessions recorded</p>}
        </Card>
      </section>
    </div>
  );
}
