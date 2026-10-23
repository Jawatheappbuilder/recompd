import { useEffect, useState } from "react";
import { useAuth } from "@/components/recomp/auth-context";
import { clearAppleHealth, loadAppleHealth, parseAppleHealthImport, saveAppleHealth } from "@/lib/apple-health-import";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AppleHealthImport() {
  const { user } = useAuth();
  const [pasted, setPasted] = useState("");
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(() => loadAppleHealth(user?.id ?? ""));
  useEffect(() => { setDays(loadAppleHealth(user?.id ?? "")); }, [user?.id]);
  const submit = () => {
    try {
      const incoming = parseAppleHealthImport(pasted.trim());
      setDays(saveAppleHealth(user?.id ?? "", incoming));
      setPasted("");
      setMessage("Imported " + incoming.length + " day(s) on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    }
  };
  const latest = days[days.length - 1];
  return <Card className="p-4">
    <h2 className="text-sm font-extrabold">Apple Health · iPhone</h2>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Import daily summaries from Apple Shortcuts for free. No Watch app needed. Your data stays in this browser on your iPhone.</p>
    <div className="mt-3 rounded-xl bg-secondary p-3">
      <div className="text-sm font-bold">{days.length} day(s) imported</div>
      {latest && <p className="mt-1 text-xs text-muted-foreground">{latest.date}: {latest.steps.toLocaleString()} steps{latest.activeCalories !== undefined ? " · " + Math.round(latest.activeCalories) + " active kcal" : ""}{latest.averageHeartRate !== undefined ? " · " + Math.round(latest.averageHeartRate) + " avg bpm" : ""}</p>}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">In Shortcuts, read today's step count, format today's date as yyyy-MM-dd, then copy a JSON text containing those values. Paste it below. Calories and heart rate are optional daily summaries, not workout readings.</p>
    <code className="mt-3 block overflow-x-auto rounded-lg bg-secondary p-3 text-[0.7rem]">{'{"date":"2026-10-24","steps":7420}'}</code>
    <textarea aria-label="Apple Health JSON" className="mt-3 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm" placeholder="Paste Apple Health JSON from Shortcuts" value={pasted} onChange={e => setPasted(e.target.value)} />
    <Button variant="primary" className="mt-2 w-full" disabled={!user || !pasted.trim()} onClick={submit}>Import Apple Health data</Button>
    {!user && <p className="mt-2 text-xs text-muted-foreground">Sign in first to import.</p>}
    {message && <p role="status" className="mt-2 text-xs font-semibold text-muted-foreground">{message}</p>}
    {days.length > 0 && <Button variant="surface" className="mt-2 w-full" onClick={() => { clearAppleHealth(user?.id ?? ""); setDays([]); setMessage("Local data removed."); }}>Remove Apple Health data</Button>}
    <a className="mt-3 block text-xs font-bold text-primary" href="https://github.com/jawatheappbuilder/recompd/blob/feature/apple-health-shortcuts-import/docs/apple-health-shortcuts.md" target="_blank" rel="noreferrer">Shortcut setup instructions</a>
    <p className="mt-2 text-[0.7rem] text-muted-foreground">Manual import only. Clearing website data also removes these summaries.</p>
  </Card>;
}
