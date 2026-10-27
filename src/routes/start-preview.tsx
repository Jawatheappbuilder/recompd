import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WorkoutStartIntro } from "./workout";

export const Route = createFileRoute("/start-preview")({
  head: () => ({ meta: [{ title: "Workout Start Preview — RECOMP'D" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: StartPreview,
});

function StartPreview() {
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const old = { accent: root.dataset.accent, dark: root.classList.contains("dark"), light: root.classList.contains("light"), scheme: root.style.colorScheme };
    root.dataset.accent = "spectrum";
    root.classList.remove("dark"); root.classList.add("light"); root.style.colorScheme = "light";
    return () => {
      if (old.accent === undefined) delete root.dataset.accent; else root.dataset.accent = old.accent;
      root.classList.toggle("dark", old.dark); root.classList.toggle("light", old.light); root.style.colorScheme = old.scheme;
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const exitTimer = window.setTimeout(() => setExiting(true), 1450);
    const endTimer = window.setTimeout(() => setPlaying(false), 1880);
    return () => { window.clearTimeout(exitTimer); window.clearTimeout(endTimer); };
  }, [run, playing]);
  const replay = () => { setExiting(false); setRun((n) => n + 1); setPlaying(true); };
  return <div className="min-h-dvh bg-background px-4 pb-10 text-foreground">
    <header className="-mx-4 bg-primary px-5 pb-7 pt-8 text-primary-foreground">
      <p className="font-display text-2xl font-black">RECOMP'D</p>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-primary-foreground/70">Workout in progress · Demo</p>
      <h1 className="mt-2 text-3xl font-black">Upper Body Builder</h1>
    </header>
    <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-4 text-center">
      <div><p className="text-lg font-black">0:00</p><p className="text-xs text-muted-foreground">Time</p></div>
      <div><p className="text-lg font-black">0 / 18</p><p className="text-xs text-muted-foreground">Sets</p></div>
      <div><p className="text-lg font-black">6</p><p className="text-xs text-muted-foreground">Exercises</p></div>
    </div>
    <h2 className="mt-6 text-sm font-black">Up next</h2>
    {["Bench Press", "Lat Pulldown", "Shoulder Press"].map((name, index) => <div key={name} className="mt-2 rounded-2xl border border-border bg-card px-4 py-4"><p className="text-sm font-extrabold">{index + 1}. {name}</p><p className="mt-1 text-xs text-muted-foreground">3 working sets</p></div>)}
    <button type="button" onClick={replay} className="mt-6 min-h-12 w-full rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground">Replay start animation</button>
    <p className="mt-3 text-center text-xs text-muted-foreground">Spectrum Light · Sample data · No workout saved</p>
    {playing && <WorkoutStartIntro key={run} name="Upper Body Builder" count={6} exiting={exiting} onDismiss={() => setPlaying(false)} />}
  </div>;
}
