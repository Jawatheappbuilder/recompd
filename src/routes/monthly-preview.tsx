import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTrainingData, personalRecords, estimate1RM, isCardioSet } from "@/lib/training-data";
import { ArrowLeft, ArrowRight, Award, CalendarDays, Dumbbell, Globe2, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/monthly-preview")({ component: MonthlyPreview });
const pages = [
  { eyebrow: "YOUR MONTH IN STRENGTH", title: "YOU SHOWED UP.", caption: "Every session counts. Here's what your month looked like." },
  { eyebrow: "AUSTRALIA · CONSISTENCY", title: "YOU KEPT SHOWING UP.", caption: "Australian adults are recommended to do muscle-strengthening activity at least twice weekly." },
  { eyebrow: "WORLDWIDE · STRENGTH", title: "YOUR STANDOUT LIFTS.", caption: "Your strongest logged performances this month, based on estimated one-rep maximums." },
  { eyebrow: "YOUR EFFORT", title: "WORK THAT ADDS UP.", caption: "Training volume isn't the same as intensity. Your logged sets and progression tell a more useful story." },
  { eyebrow: "MONTHLY IDENTITY", title: "YOUR MONTH. YOUR WAY.", caption: "Your next chapter starts with the next session." },
];
function MonthlyPreview() {
  const [step,setStep]=useState(0);

  const page=pages[step];
  const training=useTrainingData();
  const stats=useMemo(()=>{
    if(!training)return null;
    const now=new Date();
    const start=new Date(now.getFullYear(),9,1).getTime();
    const end=new Date(now.getFullYear(),10,1).getTime();
    const prior=new Date(now.getFullYear(),8,1).getTime();
    const current=training.workouts.filter(w=>w.startedAt>=start&&w.startedAt<end);
    const previous=training.workouts.filter(w=>w.startedAt>=prior&&w.startedAt<start);
    const countSets=(items:typeof current)=>items.reduce((n,w)=>n+w.exercises.reduce((t,e)=>t+e.sets.filter(x=>!isCardioSet(x)&&x.kind!=="warmup"&&x.completed!==false).length,0),0);
    const best=new Map<string,{name:string;weight:number;reps:number;estimated:number}>();
    current.forEach(w=>w.exercises.forEach(e=>e.sets.forEach(x=>{
      if(isCardioSet(x)||x.kind==="warmup"||x.completed===false)return;
      const estimated=estimate1RM(x);
      if(estimated<=0)return;
      const old=best.get(e.exerciseId);
      if(!old||estimated>old.estimated)best.set(e.exerciseId,{name:e.name,weight:x.weight,reps:x.reps,estimated});
    })));
    const prMap=personalRecords(training.workouts).byWorkout;
    return {sessions:current.length,weekly:current.length/((end-start)/604800000),seconds:current.reduce((n,w)=>n+w.durationSec,0),sets:countSets(current),priorSets:countSets(previous),prs:current.reduce((n,w)=>n+(prMap.get(w.id)?.length??0),0),best:[...best.values()].sort((a,b)=>b.estimated-a.estimated).slice(0,3)};
  },[training]);
  const sessions=stats?.sessions??0;
  const duration=stats?Math.floor(stats.seconds/3600)+"h "+Math.round((stats.seconds%3600)/60)+"m":"0m";
  const prs=stats?.prs??0;
  const sets=stats?.sets??0;
  const change=stats&&stats.priorSets>0?Math.round((stats.sets/stats.priorSets-1)*100):null;
  if(!training)return <div className="min-h-dvh bg-background px-6 py-16 text-center">Loading your training history…</div>;
  return <div className="min-h-dvh bg-background text-foreground px-6 pt-8 pb-10">
    <div className="flex items-center justify-between"><Link to="/progress" className="rounded-full border border-border p-2" aria-label="Back"><ArrowLeft size={19}/></Link><span className="text-[11px] font-black tracking-[.25em] text-muted-foreground">RECOMP'D / MONTHLY</span><span className="text-xs font-bold">{step+1} / 5</span></div>
    <div className="mt-7 flex gap-1.5">{pages.map((_,i)=><button key={i} onClick={()=>setStep(i)} aria-label={`Go to page ${i+1}`} className={`h-1 flex-1 rounded-full transition-all ${i<=step?"bg-primary":"bg-border"}`}/>)}</div>
    <div key={step} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mt-12 text-xs font-black tracking-[.22em] text-primary">{page.eyebrow}</div>
      <h1 className="font-display mt-4 text-[clamp(3rem,13vw,4.4rem)] leading-[.88] font-black tracking-tight">{page.title}</h1>
      <p className="mt-5 text-sm leading-6 text-muted-foreground">{page.caption}</p>
      {step===0&&<div className="mt-10 space-y-3"><div className="rounded-3xl bg-primary p-7 text-primary-foreground"><CalendarDays size={25}/><div className="mt-5 font-display text-7xl font-black">{sessions}</div><div className="font-bold">WORKOUTS COMPLETED</div></div><div className="grid grid-cols-2 gap-3"><Metric value={duration} label="TIME TRAINING"/><Metric value={String(prs)} label="PERSONAL BESTS"/></div></div>}
      {step===1&&<div className="mt-10 space-y-4"><div className="rounded-3xl border border-border bg-card p-6"><div className="text-sm text-muted-foreground">Your weekly average</div><div className="mt-2 font-display text-6xl font-black">{(stats?.weekly??0).toFixed(1)}<span className="text-xl"> /wk</span></div><div className="mt-7 h-4 rounded-full bg-secondary"><div className="h-4 rounded-full bg-primary" style={{width:Math.min(100,(stats?.weekly??0)/5*100)+"%"}}/></div><div className="mt-3 flex justify-between text-xs font-bold"><span>2 / week guideline</span><span>{(stats?.weekly??0).toFixed(1)} / week you</span></div></div><p className="text-xs leading-5 text-muted-foreground">ABS 2022: 26.6% of Australian adults aged 18–64 did strength or toning activities at least twice weekly. This is not a gym attendance percentile.</p></div>}
      {step===2&&<div className="mt-10 space-y-3"><div className="rounded-3xl bg-primary p-6 text-primary-foreground"><Award size={28}/><div className="mt-5 text-xs font-bold tracking-widest">YOUR TOP LOGGED LIFT</div><div className="font-display mt-2 text-4xl font-black">{stats?.best[0]?.name??"NO LIFTS LOGGED"}</div><p className="mt-3 text-sm opacity-85">{stats?.best[0] ? `${stats.best[0].weight} kg × ${stats.best[0].reps} reps · estimated 1RM ${stats.best[0].estimated.toFixed(1)} kg` : "Your strongest eligible lifts will appear here, ranked by verified benchmarks."}</p></div>{(stats?.best.slice(1).map(e=>e.name)??[]).map(n=><div key={n} className="rounded-2xl border border-border bg-card p-5 font-bold">{n}<span className="float-right text-xs text-muted-foreground">{stats?.best.find(e=>e.name===n)?.estimated.toFixed(1)??"—"} kg e1RM</span></div>)}<p className="text-xs text-muted-foreground">Estimated 1RM is calculated from your logged weight and reps. Verified global rankings are not yet available.</p></div>}
      {step===3&&<div className="mt-10 grid grid-cols-2 gap-3"><Metric value={String(sets)} label="WORKING SETS"/><Metric value={change===null?"—":(change>0?"+":"")+change+"%"} label="VS LAST MONTH"/><div className="col-span-2 rounded-3xl border border-border bg-card p-6"><TrendingUp className="text-primary"/><h2 className="mt-4 font-display text-3xl font-black">PROGRESS IS PERSONAL.</h2><p className="mt-3 text-sm text-muted-foreground">Compare completed sessions, working sets and estimated strength with your own previous month.</p></div></div>}
      {step===4&&<div className="mt-10 rounded-[2rem] bg-primary p-8 text-primary-foreground"><Sparkles size={30}/><div className="mt-16 text-xs font-bold tracking-widest">YOUR MONTHLY BADGE</div><div className="font-display mt-3 text-5xl font-black leading-none">YOUR MONTH<br/>IN MOTION</div><div className="mt-8 flex gap-5 text-sm font-bold"><span>{sessions} SESSIONS</span><span>{prs} PBs</span></div></div>}
    </div>
    <div className="mt-9 rounded-2xl border border-border p-3 text-center text-xs text-muted-foreground">{sessions===0?"No completed workouts October. No sample statistics are shown.":"Calculated from your saved workout history for the October 2026."}</div>
    <button onClick={()=>setStep(s=>(s+1)%5)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-black text-primary-foreground">{step===4?"REPLAY YOUR MONTH":"CONTINUE"} <ArrowRight size={18}/></button>
  </div>;
}
function Metric({value,label}:{value:string,label:string}){return <div className="rounded-3xl border border-border bg-card p-5"><Dumbbell size={20} className="text-primary"/><div className="mt-5 font-display text-3xl font-black">{value}</div><div className="mt-1 text-[10px] font-bold tracking-wider text-muted-foreground">{label}</div></div>}
