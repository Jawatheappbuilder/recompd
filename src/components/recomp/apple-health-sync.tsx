import { Apple, CheckCircle2, Copy, ExternalLink, KeyRound, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SHORTCUT_ENDPOINT, createSyncToken, fetchHealthHistory, fetchTokenStatus, findLocalPrototypeData, importLocalPrototypeData, revokeSyncToken, type TokenStatus } from "@/lib/apple-health-sync";
import { australianToday, type HealthSummary } from "@/lib/health-sync";

const SHARED_SHORTCUT_URL = import.meta.env.VITE_APPLE_HEALTH_SHORTCUT_URL?.trim() ?? "";
const validSharedShortcutUrl = /^https:\/\/www\.icloud\.com\/shortcuts\/[a-zA-Z0-9]+$/.test(SHARED_SHORTCUT_URL);

const steps = [
  "Create a Shortcut in the Shortcuts app (or install the shared Shortcut above once it is available). Add the Health actions below.",
  "Add “Find Health Samples”: Step Count, Start Date is today. Then “Calculate Statistics” → Sum.",
  "Optional: repeat for Active Energy (Sum) and Resting Heart Rate (Average).",
  "Add “Format Date”: Current Date, Custom format yyyy-MM-dd.",
  "Add “Get Contents of URL” with the address below. Method POST, Request Body JSON with keys date, steps and (optionally) activeKcal, restingHr — each set to the matching variable.",
  "In Headers add Authorization = Bearer followed by a space and your sync token.",
  "Run the Shortcut manually, approve Health permissions, and return here to refresh. The success response should include “ok”. Then in Shortcuts → Automation → + → Time of Day, schedule it daily and choose Run Immediately where available. iOS may require an unlocked phone to read Health samples.",
];

export function AppleHealthSync() {
  const [status, setStatus] = useState<TokenStatus | undefined>(undefined);
  const [history, setHistory] = useState<HealthSummary[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [local] = useState(() => (typeof window === "undefined" ? { keys: [], days: [] } : findLocalPrototypeData()));
  const [localDone, setLocalDone] = useState(false);

  const load = useCallback(async () => {
    try { const [s, h] = await Promise.all([fetchTokenStatus(), fetchHealthHistory()]); setStatus(s); setHistory(h); }
    catch { setStatus(null); toast.error("Couldn't load your Apple Health data."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    if (status && !window.confirm("Replace your current sync token? The old one in Shortcuts will stop working.")) return;
    setBusy(true);
    try { setToken(await createSyncToken()); await load(); } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't create a connection key."); }
    setBusy(false);
  };
  const revoke = async () => {
    if (!window.confirm("Revoke your sync token? Your Shortcut will stop syncing.")) return;
    setBusy(true);
    try { await revokeSyncToken(); setToken(null); await load(); } catch { toast.error("Couldn't revoke the token."); }
    setBusy(false);
  };
  const copy = (value: string) => void navigator.clipboard.writeText(value).then(() => toast.success("Copied")).catch(() => toast.error("Copy failed. Select and copy the text manually."));

  const today = history.find((d) => d.day === australianToday());
  const last = status?.last_used_at ? new Date(status.last_used_at) : null;
  const stale = last ? Date.now() - last.getTime() > 36 * 3_600_000 : false;

  return <Card className="p-4">
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Apple /></span><div className="min-w-0"><h2 className="text-sm font-extrabold">iPhone · Apple Health</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">See your daily steps, active calories and resting heart rate from Apple Health. Sync runs through an iPhone Shortcut, not continuously.</p></div></div>

    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
      <div className="rounded-xl bg-secondary p-2"><div className="text-[0.6rem] font-bold uppercase text-muted-foreground">Today</div><div className="font-display text-lg font-extrabold tabular-nums">{today ? today.steps.toLocaleString() : "—"}</div><div className="text-[0.6rem] text-muted-foreground">steps</div></div>
      <div className="rounded-xl bg-secondary p-2"><div className="text-[0.6rem] font-bold uppercase text-muted-foreground">Active</div><div className="font-display text-lg font-extrabold tabular-nums">{today?.active_kcal ?? "—"}</div><div className="text-[0.6rem] text-muted-foreground">kcal</div></div>
      <div className="rounded-xl bg-secondary p-2"><div className="text-[0.6rem] font-bold uppercase text-muted-foreground">Resting</div><div className="font-display text-lg font-extrabold tabular-nums">{today?.resting_hr ?? "—"}</div><div className="text-[0.6rem] text-muted-foreground">bpm</div></div>
    </div>
    <div className="mt-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">{status === undefined ? "Loading…" : !status ? "Not set up" : last ? `Last sync ${last.toLocaleString()}` : "Token created — waiting for first sync"}</span><button type="button" aria-label="Refresh" onClick={() => void load()} className="text-muted-foreground"><RefreshCw className="size-4" /></button></div>
    {stale && <p className="mt-1 text-xs text-destructive">No sync for over a day. Check the automation is on and Run Immediately is selected, and that your iPhone was unlocked recently.</p>}

    {token && <div className="mt-3 rounded-xl border border-primary/40 bg-primary/[0.06] p-3"><div className="text-xs font-extrabold">Your sync token — shown only once</div><code className="mt-1 block break-all text-[0.7rem]">{token}</code><Button size="sm" variant="primary" className="mt-2 w-full" onClick={() => copy(token)}><Copy />Copy token</Button><p className="mt-1 text-[0.65rem] text-muted-foreground">It can only send daily summaries — it can't sign in to your account.</p></div>}

    {last ? <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4 shrink-0" />Connected · Your latest daily summary was received</div> : <div className="mt-3 rounded-xl border border-border p-3">
      <h3 className="text-sm font-extrabold">Connect Apple Health</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Apple doesn't let Safari apps read Health directly. An iPhone Shortcut can securely send a daily summary for free.</p>
      <div className="mt-3 space-y-3 text-xs">
        <div><strong>1. Create a private connection key</strong><p className="mt-1 text-muted-foreground">Your key is only shown once. Keep it private.</p>
          <div className="mt-2 flex gap-2"><Button size="sm" variant="primary" className="flex-1" disabled={busy} onClick={() => void generate()}><KeyRound />{status ? "Replace connection key" : "Create connection key"}</Button>{status && <Button size="sm" variant="surface" disabled={busy} onClick={() => void revoke()}>Disconnect</Button>}</div>
        </div>
        <div><strong>2. Add the iPhone Shortcut</strong>
          {validSharedShortcutUrl ? <><p className="mt-1 text-muted-foreground">Open the ready-made Shortcut and enter your connection key. You'll be asked to allow Health access.</p><Button size="sm" variant="surface" className="mt-2 w-full" onClick={() => window.open(SHARED_SHORTCUT_URL, "_blank", "noopener,noreferrer")}><ExternalLink />Install Apple Health Shortcut</Button></> : <><p className="mt-1 text-muted-foreground">The ready-made Shortcut is not published yet. You can set it up manually if you'd like to use syncing now.</p><Button size="sm" variant="surface" className="mt-2 w-full" onClick={() => setShowManual((v) => !v)}>{showManual ? "Hide manual setup" : "Show manual setup"}</Button></>}
        </div>
        <div><strong>3. Run once, then schedule daily</strong><p className="mt-1 text-muted-foreground">Approve Health access in Shortcuts, run it once and check for your first sync below. Daily automations must be enabled in the Shortcuts app.</p></div>
      </div>
    </div>}
    {status && last && <div className="mt-3 flex gap-2"><Button size="sm" variant="surface" className="flex-1" disabled={busy} onClick={() => void generate()}><KeyRound />Replace key</Button><Button size="sm" variant="surface" disabled={busy} onClick={() => void revoke()}>Disconnect</Button></div>}
    <Button size="sm" variant="surface" className="mt-3 w-full" onClick={() => void load()}><RefreshCw />Check for sync</Button>
    {(showManual || (last !== null && !validSharedShortcutUrl)) && <details open={showManual} className="mt-3 rounded-xl bg-secondary p-3 text-xs"><summary className="cursor-pointer font-extrabold">Advanced · Manual Shortcut setup</summary>
      <ol className="mt-2 list-decimal space-y-1.5 pl-4 leading-relaxed text-muted-foreground">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
      <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-[0.65rem]">{SHORTCUT_ENDPOINT}</code><Button size="sm" variant="surface" onClick={() => copy(SHORTCUT_ENDPOINT)}><Copy /></Button></div>
      <p className="mt-2 leading-relaxed text-muted-foreground">Run the Shortcut while your iPhone is unlocked, allow Health permissions, then tap Check for sync above. iOS may ask before running an automation.</p>
    </details>}

    {local.days.length > 0 && !localDone && <div className="mt-3 rounded-xl bg-secondary p-3 text-xs"><p className="font-bold">{local.days.length} days from the earlier import are saved on this device.</p><Button size="sm" variant="surface" className="mt-2 w-full" onClick={() => void importLocalPrototypeData(local).then((n) => { setLocalDone(true); toast.success(`Moved ${n} days to your account`); void load(); }).catch(() => toast.error("Couldn't move them. They're still on this device."))}>Move them to my account</Button></div>}

    {history.length > 0 && <div className="mt-3 space-y-1">{history.slice(0, 7).map((d) => <div key={d.day} className="flex justify-between text-xs"><span className="text-muted-foreground">{d.day}</span><span className="font-bold tabular-nums">{d.steps.toLocaleString()} steps{d.active_kcal ? ` · ${d.active_kcal} kcal` : ""}</span></div>)}</div>}
  </Card>;
}
