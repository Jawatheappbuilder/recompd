import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SectionHeading } from "@/components/recomp/core";
import { bodyweightChange, formatDay, formatKg, formatTime, saveBodyweight, since, type BodyweightEntry, type Period } from "@/lib/training-data";
import { InlineEmpty, PeriodSelector } from "./progress-widgets";

const periods = ["4W", "3M", "6M", "1Y", "ALL"] as const;

export function BodyweightCard({ entries }: { entries: BodyweightEntry[] }) {
  const [period, setPeriod] = useState<Period>("4W");
  const [logOpen, setLogOpen] = useState(false);
  const latest = entries.at(-1);
  const change = bodyweightChange(entries, since(period));
  const points = entries.filter((entry) => entry.loggedAt >= since(period));

  return (
    <section>
      <SectionHeading action={<Link to="/progress/bodyweight" className="text-xs font-bold text-primary">History</Link>}>Bodyweight</SectionHeading>
      <Card className="p-4">
        {latest ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="font-display text-4xl font-extrabold leading-none tabular-nums">{latest.kg.toFixed(1)}<span className="ml-1 text-lg text-muted-foreground">kg</span></div>
                {change && <p className="mt-1.5 text-xs font-semibold text-muted-foreground"><span className={change.delta <= 0 ? "text-primary" : "text-foreground"}>{change.delta > 0 ? "+" : change.delta < 0 ? "−" : ""}{Math.abs(change.delta).toFixed(1)} kg</span> over {change.days} days</p>}
              </div>
              <Button variant="surface" size="sm" className="h-9" onClick={() => setLogOpen(true)}><Plus />Log weight</Button>
            </div>
            <PeriodSelector className="mt-3" value={period} options={periods} onChange={setPeriod} />
            {points.length > 1 && <BodyweightChart entries={points} />}
          </>
        ) : <InlineEmpty action={<Button variant="surface" size="sm" onClick={() => setLogOpen(true)}><Plus />Log weight</Button>}>No weight logged yet</InlineEmpty>}
      </Card>
      <LogWeightSheet open={logOpen} onOpenChange={setLogOpen} />
    </section>
  );
}

export function BodyweightChart({ entries }: { entries: BodyweightEntry[] }) {
  const data = useMemo(() => entries.map((entry) => ({ ...entry, x: entry.loggedAt })), [entries]);
  const min = Math.min(...entries.map((entry) => entry.kg)); const max = Math.max(...entries.map((entry) => entry.kg));
  return (
    <div className="-mx-1 mt-3 h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
          <defs><linearGradient id="bw-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--soft)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--soft)" stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(value: number) => formatDay(value)} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} tickCount={4} minTickGap={24} />
          <YAxis domain={[Math.floor(min - 0.5), Math.ceil(max + 0.5)]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={30} tickCount={4} />
          <Tooltip cursor={{ stroke: "var(--border)" }} content={({ active, payload }) => {
            const entry = payload?.[0]?.payload as BodyweightEntry | undefined;
            return active && entry ? <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 shadow-sm"><div className="text-sm font-extrabold tabular-nums">{formatKg(entry.kg)}</div><div className="text-[0.65rem] text-muted-foreground">{formatDay(entry.loggedAt)} · {formatTime(entry.loggedAt)}</div></div> : null;
          }} />
          <Area type="monotone" dataKey="kg" stroke="var(--primary)" strokeWidth={2} fill="url(#bw-fill)" dot={entries.length <= 20 ? { r: 2.5, fill: "var(--primary)", strokeWidth: 0 } : false} activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const toLocalInput = (ts: number) => { const d = new Date(ts); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function LogWeightSheet({ open, onOpenChange, entry }: { open: boolean; onOpenChange: (open: boolean) => void; entry?: BodyweightEntry | undefined }) {
  const [kg, setKg] = useState("");
  const [when, setWhen] = useState("");
  useEffect(() => { if (open) { setKg(entry ? String(entry.kg) : ""); setWhen(toLocalInput(entry?.loggedAt ?? Date.now())); } }, [open, entry]);
  const value = Number(kg.replace(",", "."));
  const valid = value > 20 && value < 400;
  const save = () => {
    if (!valid) return;
    saveBodyweight({ id: entry?.id ?? `bw-${Date.now()}`, kg: Math.round(value * 10) / 10, loggedAt: when ? new Date(when).getTime() : Date.now() });
    onOpenChange(false);
  };
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[430px] rounded-t-2xl bg-popover">
        <DrawerHeader className="pb-2 text-left"><DrawerTitle>{entry ? "Edit weight" : "Log weight"}</DrawerTitle></DrawerHeader>
        <form className="space-y-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <label className="flex h-16 items-center rounded-xl border border-border bg-secondary px-4 focus-within:border-primary">
            <input autoFocus aria-label="Weight in kg" inputMode="decimal" enterKeyHint="done" value={kg} onChange={(event) => setKg(event.target.value)} placeholder="0.0" className="w-full bg-transparent font-display text-3xl font-extrabold tabular-nums outline-none placeholder:text-muted-foreground/50" />
            <span className="text-sm font-bold text-muted-foreground">kg</span>
          </label>
          <input type="datetime-local" aria-label="Date and time" value={when} onChange={(event) => setWhen(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm text-foreground outline-none [color-scheme:dark] focus:border-primary" />
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!valid}>Save</Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
