import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Award, CalendarDays, Dumbbell, Globe2, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/monthly-preview")({ component: MonthlyPreview });
const pages = [
  { eyebrow: "YOUR MONTH IN STRENGTH", title: "YOU SHOWED UP.", caption: "Every session counts. Here's what your month looked like." },
  { eyebrow: "AUSTRALIA · CONSISTENCY", title: "YOU KEPT SHOWING UP.", caption: "Australian adults are recommended to do muscle-strengthening activity at least twice weekly." },
  { eyebrow: "WORLDWIDE · STRENGTH", title: "YOUR STANDOUT LIFTS.", caption: "Strength rankings will use matched age, sex and bodyweight benchmarks when verified data is available." },
  { eyebrow: "YOUR EFFORT", title: "WORK THAT ADDS UP.", caption: "Training volume isn't the same as intensity. Your logged sets and progression tell a more useful story." },
  { eyebrow: "MONTHLY IDENTITY", title: "THE MOMENTUM MAKER.", caption: "Your next chapter starts with the next session." },
];
function MonthlyPreview() {
  const [step,setStep]=useState(0);
  const [month,setMonth]=useState("OCTOBER 2026");
  const page=pages[step];
  return <div className="min-h-dvh bg-background text-foreground px-6 pt-8 pb-10">
    <div className="flex items-center justify-between"><a href="/" className="rounded-full border border-border p-2" aria-label="Back"><ArrowLeft size={19}/></a><span className="text-[11px] font-black tracking-[.25em] text-muted-foreground">RECOMP'D / MONTHLY</span><span className="text-xs font-bold">{step+1} / 5</span></div>
    <div className="mt-7 flex gap-1.5">{pages.map((_,i)=><button key={i} onClick={()=>setStep(i)} aria-label={`Go to page ${i+1}`} className={`h-1 flex-1 rounded-full transition-all ${i<=step?"bg-primary":"bg-border"}`}/>)}</div>
    <div key={step} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mt-12 text-xs font-black tracking-[.22em] text-primary">{page.eyebrow}</div>
      <h1 className="font-display mt-4 text-[clamp(3rem,13vw,4.4rem)] leading-[.88] font-black tracking-tight">{page.title}</h1>
      <p className="mt-5 text-sm leading-6 text-muted-foreground">{page.caption}</p>
      {step===0&&<div className="mt-10 space-y-3"><div className="rounded-3xl bg-primary p-7 text-primary-foreground"><CalendarDays size={25}/><div className="mt-5 font-display text-7xl font-black">16</div><div className="font-bold">WORKOUTS COMPLETED</div></div><div className="grid grid-cols-2 gap-3"><Metric value="12h 48m" label="TIME TRAINING"/><Metric value="4" label="PERSONAL BESTS"/></div></div>}
      {step===1&&<div className="mt-10 space-y-4"><div className="rounded-3xl border border-border bg-card p-6"><div className="text-sm text-muted-foreground">Your weekly average</div><div className="mt-2 font-display text-6xl font-black">3.6<span className="text-xl"> /wk</span></div><div className="mt-7 h-4 rounded-full bg-secondary"><div className="h-4 w-[72%] rounded-full bg-primary"/></div><div className="mt-3 flex justify-between text-xs font-bold"><span>2 / week guideline</span><span>3.6 / week you</span></div></div><p className="text-xs leading-5 text-muted-foreground">ABS 2022: 26.6% of Australian adults aged 18–64 did strength or toning activities at least twice weekly. This is not a gym attendance percentile.</p></div>}
      {step===2&&<div className="mt-10 space-y-3"><div className="rounded-3xl bg-primary p-6 text-primary-foreground"><Award size={28}/><div className="mt-5 text-xs font-bold tracking-widest">FEATURE PREVIEW</div><div className="font-display mt-2 text-4xl font-black">SHOULDER PRESS</div><p className="mt-3 text-sm opacity-85">Your strongest eligible lifts will appear here, ranked by verified benchmarks.</p></div>{["Bench press","Squat"].map(n=><div key={n} className="rounded-2xl border border-border bg-card p-5 font-bold">{n}<span className="float-right text-xs text-muted-foreground">Awaiting benchmark</span></div>)}<p className="text-xs text-muted-foreground">No invented global percentiles. Example exercise names only.</p></div>}
      {step===3&&<div className="mt-10 grid grid-cols-2 gap-3"><Metric value="128" label="WORKING SETS"/><Metric value="+12%" label="VS LAST MONTH"/><div className="col-span-2 rounded-3xl border border-border bg-card p-6"><TrendingUp className="text-primary"/><h2 className="mt-4 font-display text-3xl font-black">PROGRESS IS PERSONAL.</h2><p className="mt-3 text-sm text-muted-foreground">Compare completed sessions, working sets and estimated strength with your own previous month.</p></div></div>}
      {step===4&&<div className="mt-10 rounded-[2rem] bg-primary p-8 text-primary-foreground"><Sparkles size={30}/><div className="mt-16 text-xs font-bold tracking-widest">YOUR MONTHLY BADGE</div><div className="font-display mt-3 text-5xl font-black leading-none">MOMENTUM<br/>MAKER</div><div className="mt-8 flex gap-5 text-sm font-bold"><span>16 SESSIONS</span><span>4 PBs</span></div></div>}
    </div>
    <div className="mt-9 rounded-2xl border border-dashed border-border p-3 text-center text-[11px] leading-5 text-muted-foreground"><strong>DESIGN PREVIEW · SAMPLE FIGURES</strong><br/>This public preview does not access your private workout history. The finished feature will calculate your actual statistics after sign-in.</div>
    <button onClick={()=>setStep(s=>(s+1)%5)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-black text-primary-foreground">{step===4?"REPLAY YOUR MONTH":"CONTINUE"} <ArrowRight size={18}/></button>
  </div>;
}
function Metric({value,label}:{value:string,label:string}){return <div className="rounded-3xl border border-border bg-card p-5"><Dumbbell size={20} className="text-primary"/><div className="mt-5 font-display text-3xl font-black">{value}</div><div className="mt-1 text-[10px] font-bold tracking-wider text-muted-foreground">{label}</div></div>}
