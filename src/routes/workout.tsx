import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ActiveWorkout, PbCelebrationPreview } from "@/components/recomp/active-workout";
import { useAuth } from "@/components/recomp/auth-context";
import { EmptyWorkout } from "@/components/recomp/empty-workout";
import { Screen } from "@/components/recomp/core";
import { useActiveWorkout } from "@/hooks/use-active-workout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workout")({
  head: () => ({ meta: [
    { title: "Workout — RECOMP'D" }, { name: "description", content: "Start and track your current strength workout." },
    { property: "og:title", content: "Workout — RECOMP'D" }, { property: "og:description", content: "Start and track your current strength workout." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: WorkoutPage,
});

const WIFEY_USER_ID = "e791fd9b-67cf-41c1-9cad-de60e0753e8b";

function WorkoutPage() {
  const { workout, setWorkout, hydrated } = useActiveWorkout();
  const { user } = useAuth();
  const [showWifeyHype, setShowWifeyHype] = useState(false);
  const [showStarting, setShowStarting] = useState(false);

  useEffect(() => {
    if (!hydrated || !workout || user?.id !== WIFEY_USER_ID) return;
    const hypeKey = `recomp-wifey-hype-${workout.id}`;
    if (sessionStorage.getItem(hypeKey)) return;
    sessionStorage.setItem(hypeKey, "shown");
    setShowWifeyHype(true);
    const timer = window.setTimeout(() => setShowWifeyHype(false), 2600);
    return () => window.clearTimeout(timer);
  }, [hydrated, workout?.id, user?.id]);

  useEffect(() => {
    if (!hydrated || !workout) return;
    if (Date.now() - workout.startedAt > 12000) return;
    const key = `recomp-start-intro-${workout.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "shown");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShowStarting(true);
    const timer = window.setTimeout(() => setShowStarting(false), 1550);
    return () => window.clearTimeout(timer);
  }, [hydrated, workout?.id, workout?.startedAt]);

  // Test-only route on Vercel branch previews; never expose on production domain.
  const demoRequested = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pb-preview") === "1";
  const isProductionHost = typeof window !== "undefined" && ["recompd.vercel.app", "recompd-recompd.vercel.app", "recompd-git-main-recompd.vercel.app", "recompd.lovable.app"].includes(window.location.hostname);
  if (demoRequested && !isProductionHost) return <PbCelebrationPreview />;
  if (!hydrated) return <Screen>{null}</Screen>;
  if (!workout) return <Screen><EmptyWorkout/></Screen>;
  return <Screen className="pt-0">
    <ActiveWorkout key={workout.id} workout={workout} onChange={(next) => setWorkout(next)} onCancel={() => { sessionStorage.removeItem("recomp-active-workout"); setWorkout(null); }} />
    {showWifeyHype && <WifeyWorkoutHype />}
    {showStarting && <WorkoutStartIntro name={workout.name} count={workout.exercises.length} onDismiss={() => setShowStarting(false)} />}
  </Screen>;
}

export function WorkoutStartIntro({ name, count, onDismiss }: { name: string; count: number; onDismiss: () => void }) {
  return <div className="fixed inset-0 z-[110] mx-auto flex max-w-[430px] flex-col overflow-hidden bg-background text-foreground" role="status" aria-label="Starting workout">
    <style>{`@keyframes recompStartTitle{0%{opacity:0;transform:translateY(28px) scale(.96)}70%{opacity:1;transform:translateY(-2px) scale(1.01)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes recompStartLine{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes recompStartRow{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.recomp-start-animated{animation:none!important}}`}</style>
    <div className="rounded-b-[2rem] bg-primary px-6 pb-12 pt-[calc(3rem+env(safe-area-inset-top))] text-primary-foreground">
      <div className="flex items-center justify-between"><span className="font-display text-2xl font-black">RECOMP'D</span><span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-widest">Session started</span></div>
      <p className="mt-16 text-xs font-extrabold uppercase tracking-[0.18em] text-primary-foreground/75">Time to get to work</p>
      <h1 className="recomp-start-animated mt-3 text-[2.5rem] font-black leading-[1.08] tracking-tight [overflow-wrap:anywhere]" style={{animation:"recompStartTitle .62s cubic-bezier(.2,1,.3,1) both"}}>{name}</h1>
      <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-primary-foreground/20"><div className="recomp-start-animated h-full w-full origin-left rounded-full bg-primary-foreground" style={{animation:"recompStartLine 1.1s .24s cubic-bezier(.2,.8,.2,1) both"}}/></div>
    </div>
    <div className="recomp-start-animated mx-5 mt-5 flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-sm" style={{animation:"recompStartRow .45s .55s ease-out both"}}>
      <div><p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-muted-foreground">Today's session</p><p className="mt-1 text-lg font-black">{count} exercise{count === 1 ? "" : "s"} ready</p></div>
      <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground"><span className="font-display text-xl font-black">01</span></span>
    </div>
    <button type="button" onClick={onDismiss} className="mt-auto min-h-12 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm font-bold text-muted-foreground">Go to workout</button>
  </div>;
}

function WifeyWorkoutHype() {
  const confetti = Array.from({ length: 28 }, (_, index) => ({
    left: `${6 + ((index * 37) % 88)}%`,
    delay: `${(index % 9) * 55}ms`,
    duration: `${900 + (index % 5) * 120}ms`,
    rotate: `${(index * 47) % 180}deg`,
  }));

  return <div className="fixed inset-0 z-[100] mx-auto flex max-w-[430px] items-center justify-center overflow-hidden bg-[#fff1d7] px-5 motion-safe:animate-[wifey-screen_2600ms_ease-in-out_both]" role="status" aria-label="Go wifey">
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden="true">
      {confetti.map((piece, index) => <span
        key={index}
        className={cn("absolute -top-6 h-3 w-1.5 rounded-sm opacity-0 motion-safe:animate-[wifey-confetti_var(--confetti-duration)_cubic-bezier(.2,.7,.3,1)_forwards]", index % 3 === 0 ? "bg-[#f12612]" : index % 3 === 1 ? "bg-[#f58eaa]" : "bg-[#2a2424]")}
        style={{ left: piece.left, animationDelay: piece.delay, ["--confetti-duration" as string]: piece.duration, transform: `rotate(${piece.rotate})` }}
      />)}
    </div>
    <div className="relative -translate-y-[18dvh] text-center motion-safe:animate-[wifey-pop_700ms_cubic-bezier(.16,1,.3,1)_both]">
      <div className="select-none text-[clamp(5.3rem,26vw,7.8rem)] font-black uppercase leading-[0.76] tracking-[-0.09em] text-[#f58eaa] [text-shadow:-6px_6px_0_#f12612,-12px_12px_0_#f12612]">GO</div>
      <div className="mt-7 select-none text-[clamp(4rem,20vw,6rem)] font-black uppercase leading-[0.76] tracking-[-0.075em] text-[#f58eaa] [text-shadow:-5px_5px_0_#f12612,-10px_10px_0_#f12612]">WIFEY</div>
    </div>
    <style>{`
      @keyframes wifey-screen {
        0% { opacity: 0; }
        8% { opacity: 1; }
        82% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes wifey-pop {
        0% { opacity: 0; transform: translateY(18px) scale(.72) rotate(-4deg); }
        55% { opacity: 1; transform: translateY(-6px) scale(1.08) rotate(1deg); }
        75% { transform: translateY(2px) scale(.98) rotate(-.5deg); }
        100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
      }
      @keyframes wifey-confetti {
        0% { opacity: 0; translate: 0 -8vh; scale: .7; }
        12% { opacity: 1; }
        100% { opacity: 1; translate: 0 108dvh; rotate: 520deg; scale: 1; }
      }
    `}</style>
  </div>;
}
