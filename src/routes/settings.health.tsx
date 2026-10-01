import { createFileRoute } from "@tanstack/react-router";
import { Footprints, HeartPulse, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Screen } from "@/components/recomp/core";
import { SettingsHeader } from "@/components/recomp/settings-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { openHealthConnectSettings, readSteps, requestStepsAccess, type StepsSnapshot } from "@/lib/health-connect";

export const Route = createFileRoute("/settings/health")({ head: () => ({ meta: [{ title: "Health & activity — RECOMP'D" }] }), component: HealthSettings });

const initial: StepsSnapshot = { status: "loading", today: 0, sevenDayAverage: 0, days: [] };

function HealthSettings() {
  const [data, setData] = useState(initial);
  useEffect(() => { void readSteps().then(setData); }, []);
  const connected = data.status === "connected";
  return <Screen><SettingsHeader title="Health & activity" subtitle="Connect Android Health Connect" /><div className="space-y-4">
    <Card className="p-4"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><HeartPulse /></span><div><h2 className="text-sm font-extrabold">Health Connect</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">RECOMP'D only requests read access to your step count. Your Health Connect data stays on your device and is read when the app needs to show your activity.</p></div></div>
      <div className="mt-4 rounded-xl bg-secondary p-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Footprints className="size-4 text-primary" /><span className="text-sm font-bold">Steps</span></div><span className={connected ? "text-xs font-bold text-emerald-600" : "text-xs font-bold text-muted-foreground"}>{connected ? "Connected" : data.status === "web" ? "Android app only" : "Not connected"}</span></div>{connected && <div className="mt-2 text-xs text-muted-foreground">Today: {data.today.toLocaleString()} · 7-day avg: {data.sevenDayAverage.toLocaleString()}</div>}</div>
      {data.status !== "web" && <Button variant="primary" className="mt-4 w-full" onClick={() => void requestStepsAccess().then(setData)}>{connected ? "Refresh permission" : "Connect Health Connect"}</Button>}
      {connected && <Button variant="surface" className="mt-2 w-full" onClick={() => void openHealthConnectSettings()}><Settings2 />Manage permissions</Button>}
    </Card>
    <p className="px-1 text-xs leading-relaxed text-muted-foreground">Samsung Health can share Galaxy Watch step data with Health Connect. RECOMP'D reads the aggregated total so overlapping step sources are less likely to be counted twice.</p>
  </div></Screen>;
}
