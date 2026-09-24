import { Download, Image as ImageIcon, Loader2, Share2, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { formatDuration, formatKg, formatLongDay, formatSet, setCount, volumeOf, type CompletedSet, type CompletedWorkout } from "@/lib/training-data";

type Pr = { exerciseId: string; set: CompletedSet };

/* ---------- formatting ---------- */

const setLabel = (set: CompletedSet) => set.weight > 0 ? `${formatKg(set.weight)} × ${set.reps}` : `${set.reps} reps`;

/** Condenses consecutive identical sets: "80 kg × 8 × 3 sets". */
export function condensedSets(sets: CompletedSet[]) {
  const groups: { set: CompletedSet; count: number }[] = [];
  for (const set of sets) {
    const last = groups[groups.length - 1];
    if (last && last.set.weight === set.weight && last.set.reps === set.reps) last.count += 1;
    else groups.push({ set, count: 1 });
  }
  return groups.map(({ set, count }) => count > 1 ? `${setLabel(set)} × ${count} sets` : setLabel(set));
}

export function workoutShareText(workout: CompletedWorkout) {
  const details = workout.exercises.filter((e) => e.sets.length).map((e) => `${e.name}: ${e.sets.map(formatSet).join(", ")}`).join("\n");
  return `${workout.name}\n${formatDuration(workout.durationSec)}\n\n${details}\n\nTracked with RECOMP'D`;
}

/* ---------- canvas rendering ---------- */

const C = { bg: "#080B09", surface: "#101612", border: "#263129", text: "#F3F7F4", muted: "#8D9A91", green: "#27F46C", greenDim: "#12B94B" };
const DISPLAY = "'Barlow Condensed', ui-sans-serif, system-ui, sans-serif";
const SANS = "Manrope, ui-sans-serif, system-ui, sans-serif";
const W = 1080;
const BASE_H = 1920;
const PAD = 92;

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= max || !line) line = next;
    else { lines.push(line); line = word; }
    // Hard-break a single word that is still too long.
    while (ctx.measureText(line).width > max && line.length > 1) {
      let cut = line.length - 1;
      while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > max) cut--;
      lines.push(line.slice(0, cut)); line = line.slice(cut);
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Wraps set chips joined by a separator onto lines without breaking a chip. */
function wrapChips(ctx: CanvasRenderingContext2D, chips: string[], max: number, sep = "   ·   ") {
  const lines: string[] = [];
  let line = "";
  for (const chip of chips) {
    const next = line ? line + sep + chip : chip;
    if (!line || ctx.measureText(next).width <= max) line = next;
    else { lines.push(line); line = chip; }
  }
  if (line) lines.push(line);
  return lines;
}

function spacing(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

type Layout = { title: string[]; titleSize: number; gap: number; blocks: { name: string[]; sets: string[]; pr: boolean }[]; height: number };

const NAME_SIZE = 40, NAME_LH = 50, SET_SIZE = 31, SET_LH = 42;

function layout(ctx: CanvasRenderingContext2D, workout: CompletedWorkout, prs: Pr[], compact: boolean): Layout {
  const inner = W - PAD * 2;
  const titleSize = compact ? 92 : 112;
  ctx.font = `800 ${titleSize}px ${DISPLAY}`;
  const title = wrap(ctx, workout.name.toUpperCase(), inner).slice(0, 3);
  const gap = compact ? 26 : 44;
  const prIds = new Set(prs.map((p) => p.exerciseId));
  const blocks = workout.exercises.filter((e) => e.sets.length).map((e) => {
    const pr = prIds.has(e.exerciseId);
    ctx.font = `700 ${NAME_SIZE}px ${SANS}`;
    const name = wrap(ctx, e.name, inner - (pr ? 110 : 0));
    ctx.font = `600 ${SET_SIZE}px ${SANS}`;
    const sets = wrapChips(ctx, condensedSets(e.sets), inner);
    return { name, sets, pr };
  });
  const header = 150 + title.length * titleSize * 0.95 + 40 + 60;
  const stats = compact ? 190 : 230;
  const list = blocks.reduce((h, b) => h + b.name.length * NAME_LH + 10 + b.sets.length * SET_LH, 0) + Math.max(0, blocks.length - 1) * gap * 2;
  const footer = 170;
  return { title, titleSize, gap, blocks, height: Math.ceil(header + stats + 60 + list + footer) };
}

export async function renderWorkoutCard(workout: CompletedWorkout, prs: Pr[]): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts) {
    await Promise.all([
      document.fonts.load(`800 112px ${DISPLAY}`), document.fonts.load(`700 40px ${SANS}`),
      document.fonts.load(`600 31px ${SANS}`), document.fonts.load(`800 30px ${SANS}`),
    ]).catch(() => undefined);
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  let plan = layout(ctx, workout, prs, false);
  if (plan.height > BASE_H) plan = layout(ctx, workout, prs, true);
  const H = Math.max(BASE_H, plan.height);
  canvas.width = W; canvas.height = H;
  const inner = W - PAD * 2;

  // Background with a restrained glow.
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.9, 0, 0, W * 0.9, 0, 900);
  glow.addColorStop(0, "rgba(39,244,108,0.13)"); glow.addColorStop(1, "rgba(39,244,108,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, 1000);
  ctx.strokeStyle = C.border; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(28, 28, W - 56, H - 56, 44); ctx.stroke();

  ctx.textBaseline = "alphabetic";
  let y = 170;
  // Wordmark + date
  ctx.font = `800 44px ${DISPLAY}`; spacing(ctx, 6); ctx.fillStyle = C.text;
  ctx.fillText("RECOMP'D", PAD, y);
  const markW = ctx.measureText("RECOMP'D").width;
  ctx.fillStyle = C.green; ctx.fillRect(PAD + markW + 14, y - 10, 10, 10);
  spacing(ctx, 0);
  ctx.font = `600 28px ${SANS}`; ctx.fillStyle = C.muted; ctx.textAlign = "right";
  ctx.fillText(formatLongDay(workout.startedAt), W - PAD, y); ctx.textAlign = "left";

  // Title
  y += 60;
  ctx.font = `800 ${plan.titleSize}px ${DISPLAY}`; ctx.fillStyle = C.text; spacing(ctx, 1);
  for (const line of plan.title) { y += plan.titleSize * 0.95; ctx.fillText(line, PAD, y); }
  spacing(ctx, 0);
  y += 40;
  ctx.fillStyle = C.greenDim; ctx.fillRect(PAD, y, 72, 6);
  y += 60;

  // Stats
  const volume = volumeOf(workout);
  const stats: [string, string][] = [
    [formatDuration(workout.durationSec), "Duration"],
    [String(setCount(workout)), "Sets"],
    volume > 0 ? [Math.round(volume).toLocaleString(), "kg volume"] : [String(plan.blocks.length), "Exercises"],
  ];
  const statH = plan.height > BASE_H ? 190 : 230;
  ctx.fillStyle = C.surface; ctx.beginPath(); ctx.roundRect(PAD, y, inner, statH, 32); ctx.fill();
  ctx.strokeStyle = C.border; ctx.stroke();
  const col = inner / 3;
  stats.forEach(([value, label], i) => {
    const x = PAD + col * i + 40;
    if (i) { ctx.fillStyle = C.border; ctx.fillRect(PAD + col * i, y + 40, 2, statH - 80); }
    let size = 84; ctx.font = `800 ${size}px ${DISPLAY}`;
    while (ctx.measureText(value).width > col - 60 && size > 48) { size -= 4; ctx.font = `800 ${size}px ${DISPLAY}`; }
    ctx.fillStyle = C.text; ctx.fillText(value, x, y + statH / 2 + 14);
    ctx.font = `600 26px ${SANS}`; ctx.fillStyle = C.muted; ctx.fillText(label, x, y + statH / 2 + 58);
  });
  y += statH + 76;

  // Exercises
  plan.blocks.forEach((block, i) => {
    if (i) { y += plan.gap; ctx.fillStyle = C.border; ctx.fillRect(PAD, y - 12, inner, 2); y += plan.gap; }
    ctx.font = `700 ${NAME_SIZE}px ${SANS}`; ctx.fillStyle = C.text;
    block.name.forEach((line, j) => ctx.fillText(line, PAD, y + NAME_LH * (j + 1) - 12));
    if (block.pr) {
      ctx.font = `800 24px ${SANS}`; spacing(ctx, 2);
      const tw = ctx.measureText("PR").width + 36;
      ctx.fillStyle = "rgba(39,244,108,0.12)"; ctx.strokeStyle = "rgba(39,244,108,0.55)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(W - PAD - tw, y + 4, tw, 40, 20); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.green; ctx.fillText("PR", W - PAD - tw + 18, y + 33); spacing(ctx, 0);
    }
    y += block.name.length * NAME_LH + 10;
    ctx.font = `600 ${SET_SIZE}px ${SANS}`; ctx.fillStyle = C.muted;
    block.sets.forEach((line) => { y += SET_LH; ctx.fillText(line, PAD, y - 8); });
  });

  // Footer
  ctx.fillStyle = C.border; ctx.fillRect(PAD, H - 150, inner, 2);
  ctx.font = `600 26px ${SANS}`; ctx.fillStyle = C.muted; spacing(ctx, 1);
  ctx.fillText("Tracked with", PAD, H - 92);
  const tw = ctx.measureText("Tracked with ").width;
  ctx.font = `800 30px ${DISPLAY}`; spacing(ctx, 4); ctx.fillStyle = C.text;
  ctx.fillText("RECOMP'D", PAD + tw, H - 92); spacing(ctx, 0);

  return new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("render failed")), "image/png"));
}

/* ---------- share sheet ---------- */

const fileName = (w: CompletedWorkout) => `recompd-${w.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workout"}.png`;

export function ShareWorkoutSheet({ workout, prs, open, onOpenChange }: { workout: CompletedWorkout; prs: Pr[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false; let created: string | null = null;
    setBlob(null); setUrl(null);
    renderWorkoutCard(workout, prs).then((b) => { if (cancelled) return; created = URL.createObjectURL(b); setBlob(b); setUrl(created); }).catch(() => toast.error("Couldn't create the image"));
    return () => { cancelled = true; if (created) URL.revokeObjectURL(created); };
  }, [open, workout, prs]);

  const file = blob ? new File([blob], fileName(workout), { type: "image/png" }) : null;
  const canShareFile = !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });

  const download = () => {
    if (!url) return;
    const a = document.createElement("a"); a.href = url; a.download = fileName(workout); a.click();
    toast.success("Image saved");
  };
  const shareImage = async () => {
    if (!file) return;
    if (!canShareFile) return download();
    setBusy(true);
    try { await navigator.share({ files: [file], title: workout.name }); }
    catch (error) { if ((error as Error)?.name !== "AbortError") download(); }
    finally { setBusy(false); }
  };
  const shareText = async () => {
    const text = workoutShareText(workout);
    try {
      if (navigator.share) await navigator.share({ title: workout.name, text });
      else { await navigator.clipboard.writeText(text); toast.success("Workout copied"); }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      try { await navigator.clipboard.writeText(text); toast.success("Workout copied"); } catch { toast.error("Couldn't share workout"); }
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[94dvh] max-w-[430px] rounded-t-2xl bg-popover">
        <DrawerHeader className="pb-2 text-left"><DrawerTitle>Share workout</DrawerTitle><DrawerDescription>{workout.name}</DrawerDescription></DrawerHeader>
        <div className="flex min-h-0 flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto rounded-2xl border border-border bg-background p-2">
            {url ? <img src={url} alt={`${workout.name} share card`} className="max-h-[58dvh] w-auto max-w-full rounded-xl" /> : <div className="grid h-[48dvh] place-items-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>}
          </div>
          <Button variant="primary" size="xl" className="mt-3 w-full" disabled={!blob || busy} onClick={() => void shareImage()}>
            {canShareFile || !blob ? <><ImageIcon />Share image</> : <><Download />Save image</>}
          </Button>
          <Button variant="surface" className="mt-2 w-full" onClick={() => void shareText()}><Type />Share text</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function ShareWorkoutButton({ workout, prs, className, variant = "primary", size = "xl" }: { workout: CompletedWorkout; prs: Pr[]; className?: string; variant?: "primary" | "surface"; size?: "xl" | "default" }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}><Share2 />Share workout</Button>
    <ShareWorkoutSheet workout={workout} prs={prs} open={open} onOpenChange={setOpen} />
  </>;
}
