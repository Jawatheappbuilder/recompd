import { Apple, Copy, ExternalLink, KeyRound, RefreshCw } from "lucide-react";
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
    try { setToken(await createSyncToken()); await load(); } catch { toast.error("Couldn't create a sync token."); }
    setBusy(false);
  };
  const revoke = async () => {
    if (!window.confirm("Revoke your sync token? Your Shortcut will stop syncing.")) return;
    setBusy(true);
    try { await revokeSyncToken(); setToken(null); await load(); } catch { toast.error("Couldn't revoke the token."); }
    setBusy(false);
  };
  const copy = (value: string) => void navigator.clipboard.writeText(value).then(() => toast.success("Copied"));

  const today = history.find((d) => d.day === australianToday());
  const last = status?.last_used_at ? new Date(status.last_used_at) : null;
  const stale = last ? Date.now() - last.getTime() > 36 * 3_600_000 : false;

  return <Card className="p-4">
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Apple /></span><div className="min-w-0"><h2 className="text-sm font-extrabold">iPhone · Apple Health</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Web apps can't read Apple Health. A daily Shortcut automation on your iPhone sends a summary of steps (and optionally calories and resting heart rate). It isn't live — it updates once a day when the automation runs.</p></div></div>

    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
      <div className="rounded-xl bg-secondary p-2"><div className="text-[0.6rem] font-bold uppercase text-muted-foreground">Today</div><div className="font-display text-lg font-extrabold tabular-nums">{today ? today.steps.toLocaleString() : "—"}</div><div className="text-[0.6rem] text-muted-foreground">steps</div></div>
      <div className="rounded-xl bg-secondary p-2"><div className="text-[0.6rem] font-bold uppercase text-muted-foreground">Active</div><div className="font-display text-lg font-extrabold tabular-nums">{today?.active_kcal ?? "—"}</div><div className="text-[0.6rem] text-muted-foreground">kcal</div></div>
      <div className="rounded-xl bg-secondary p-2"><div className="text-[0.6rem] font-bold uppercase text-muted-foreground">Resting</div><div className="font-display text-lg font-extrabold tabular-nums">{today?.resting_hr ?? "—"}</div><div className="text-[0.6rem] text-muted-foreground">bpm</div></div>
    </div>
    <div className="mt-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">{status === undefined ? "Loading…" : !status ? "Not set up" : last ? `Last sync ${last.toLocaleString()}` : "Token created — waiting for first sync"}</span><button type="button" aria-label="Refresh" onClick={() => void load()} className="text-muted-foreground"><RefreshCw className="size-4" /></button></div>
    {stale && <p className="mt-1 text-xs text-destructive">No sync for over a day. Check the automation is on and Run Immediately is selected, and that your iPhone was unlocked recently.</p>}

    {token && <div className="mt-3 rounded-xl border border-primary/40 bg-primary/[0.06] p-3"><div className="text-xs font-extrabold">Your sync token — shown only once</div><code className="mt-1 block break-all text-[0.7rem]">{token}</code><Button size="sm" variant="primary" className="mt-2 w-full" onClick={() => copy(token)}><Copy />Copy token</Button><p className="mt-1 text-[0.65rem] text-muted-foreground">It can only send daily summaries — it can't sign in to your account.</p></div>}

    <div className="mt-3 rounded-xl border border-border p-3">
      <h3 className="text-sm font-extrabold">Connect in 3 steps</h3>
      <p className="mt-1 text-xs text-muted-foreground">No paid Apple developer account needed. Apple Health only shares the daily summaries you choose.</p>
      <div className="mt-3 space-y-3 text-xs">
        <div><strong>1. Create your private sync token</strong><p className="mt-1 text-muted-foreground">Keep this private. Once created, copy it into the Shortcut's Authorization header.</p>
          <div className="mt-2 flex gap-2"><Button size="sm" variant="primary" className="flex-1" disabled={busy} onClick={() => void generate()}><KeyRound />{status ? "Replace token" : "Create sync token"}</Button>{status && <Button size="sm" variant="surface" disabled={busy} onClick={() => void revoke()}>Revoke</Button>}</div>
        </div>
        <div><strong>2. Set up your Apple Health Shortcut</strong>
          {validSharedShortcutUrl ? <><p className="mt-1 text-muted-foreground">Install our prepared Shortcut, then add the URL and your token when prompted or in its actions.</p><Button size="sm" variant="surface" className="mt-2 w-full" onClick={() => window.open(SHARED_SHORTCUT_URL, "_blank", "noopener,noreferrer")}><ExternalLink />Open Apple Shortcut</Button></> : <p className="mt-1 text-muted-foreground">A ready-made install link isn't available yet. Use the setup instructions below to build the Shortcut on your iPhone. We won't send you to a broken or unverified link.</p>}
        </div>
        <div><strong>3. Test, then automate</strong><p className="mt-1 text-muted-foreground">Run the Shortcut once and allow Health access. Refresh this card to confirm data arrived, then schedule a daily Shortcuts automation. Sync is not live.</p><Button size="sm" variant="surface" className="mt-2 w-full" onClick={() => void load()}><RefreshCw />Check for sync</Button></div>
      </div>
    </div>

    <details className="mt-3 rounded-xl bg-secondary p-3 text-xs"><summary className="cursor-pointer font-extrabold">Manual Shortcut instructions</summary>
      <ol className="mt-2 list-decimal space-y-1.5 pl-4 leading-relaxed text-muted-foreground">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
      <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-[0.65rem]">{SHORTCUT_ENDPOINT}</code><Button size="sm" variant="surface" onClick={() => copy(SHORTCUT_ENDPOINT)}><Copy /></Button></div>
      <p className="mt-2 leading-relaxed text-muted-foreground"><b>Sync now test:</b> open the Shortcut and tap ▶, then tap refresh here. iOS may still ask before running some automations, and Health data can't be read while the iPhone is locked.</p>
    </details>

    {local.days.length > 0 && !localDone && <div className="mt-3 rounded-xl bg-secondary p-3 text-xs"><p className="font-bold">{local.days.length} days from the earlier import are saved on this device.</p><Button size="sm" variant="surface" className="mt-2 w-full" onClick={() => void importLocalPrototypeData(local).then((n) => { setLocalDone(true); toast.success(`Moved ${n} days to your account`); void load(); }).catch(() => toast.error("Couldn't move them. They're still on this device."))}>Move them to my account</Button></div>}

    {history.length > 0 && <div className="mt-3 space-y-1">{history.slice(0, 7).map((d) => <div key={d.day} className="flex justify-between text-xs"><span className="text-muted-foreground">{d.day}</span><span className="font-bold tabular-nums">{d.steps.toLocaleString()} steps{d.active_kcal ? ` · ${d.active_kcal} kcal` : ""}</span></div>)}</div>}
  </Card>;
}
