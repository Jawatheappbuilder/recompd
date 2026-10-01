import { Footprints, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { readSteps, requestStepsAccess, type StepsSnapshot } from "@/lib/health-connect";

const initial: StepsSnapshot = { status: "loading", today: 0, sevenDayAverage: 0, days: [] };

export function StepsCard() {
  const [data, setData] = useState(initial);
  const load = useCallback(() => { void readSteps().then(setData); }, []);
  useEffect(load, [load]);

  if (data.status === "web") return null;
  const connected = data.status === "connected";
  const max = Math.max(1, ...data.days.map((day) => day.value));
  return <section>
    <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-extrabold">Steps</h2>{connected && <button type="button" aria-label="Refresh steps" onClick={load} className="text-muted-foreground"><RefreshCw className="size-4" /></button>}</div>
    <Card className="relative overflow-hidden p-4">
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-primary/[0.08] blur-3xl" />
      {connected ? <div className="relative">
        <div className="flex items-start justify-between gap-3"><div><div className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-primary">Today</div><div className="mt-1 font-display text-3xl font-extrabold tabular-nums">{data.today.toLocaleString()}</div><div className="mt-1 text-xs text-muted-foreground">7-day avg {data.sevenDayAverage.toLocaleString()}</div></div><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Footprints className="size-5" /></span></div>
        <div className="mt-4 grid h-14 grid-cols-7 items-end gap-1.5" aria-label="Last seven days of steps">{data.days.map((day, index) => <div key={day.date} className="flex h-full items-end"><div title={`${day.value.toLocaleString()} steps`} className="w-full rounded-t-sm bg-primary/25 last:bg-primary" style={{ height: `${Math.max(8, Math.round((day.value / max) * 100))}%`, opacity: index === 6 ? 1 : undefined }} /></div>)}</div>
      </div> : <div className="relative flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Footprints className="size-5" /></span><div className="min-w-0 flex-1"><div className="text-sm font-extrabold">{data.status === "unavailable" ? "Health Connect unavailable" : "Connect your steps"}</div><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{data.status === "unavailable" ? "Health Connect needs to be available on this Android device." : "Read your daily steps from Health Connect."}</p></div>{data.status !== "unavailable" && <Button size="sm" variant="primary" onClick={() => void requestStepsAccess().then(setData)}>Connect</Button>}</div>}
      <div className="mt-3 border-t border-border pt-2 text-right"><Link to="/settings/health" className="text-[0.68rem] font-bold text-primary">Health settings</Link></div>
    </Card>
  </section>;
}
