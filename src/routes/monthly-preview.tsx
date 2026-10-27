import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { monthBounds, wrappedLabel, wrappedMonth } from "@/lib/monthly-wrapped";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Award, CalendarDays, ChevronRight, Dumbbell, Heart, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { useTrainingData, personalRecords, estimate1RM, isCardioSet } from "@/lib/training-data";

export const Route = createFileRoute("/monthly-preview")({ component: MonthlyWrapped });


const titles = ["YOUR MONTH", "YOUR TOP EXERCISES", "YOU HAD A TYPE", "YOUR ROUTINE", "YOUR BIGGEST FLEX", "THE WORK YOU PUT IN", "YOUR TRAINING DNA", "YOUR MONTH, WRAPPED"];
const ordinal = (n:number) => n===1?"1ST":n===2?"2ND":n===3?"3RD":n+"TH";
const clean = (n:number) => Number.isFinite(n)?n:0;
const format = (n:number) => new Intl.NumberFormat("en-AU").format(n);
const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
type Ranked = {id:string;name:string;visits:number;sets:number;reps:number;best:number;weight:number;bestReps:number};

function MonthlyWrapped() {
  const training = useTrainingData();
  const [step,setStep] = useState(0);
  const [selectedMonth,setSelectedMonth] = useState(() => wrappedMonth());
  const MONTH = wrappedLabel(selectedMonth).toUpperCase();
  useEffect(() => { try { localStorage.setItem(`recomp-wrapped-viewed-${selectedMonth.getFullYear()}-${selectedMonth.getMonth()+1}`, "1"); } catch {} }, [selectedMonth]);

  
  const data = useMemo(()=>{
    if(!training)return null;
    const {start,end,prior}=monthBounds(selectedMonth);
    const workouts=training.workouts.filter(w=>w.startedAt>=start&&w.startedAt<end).sort((a,b)=>a.startedAt-b.startedAt);
    const previous=training.workouts.filter(w=>w.startedAt>=prior&&w.startedAt<start);
    const exerciseMap=new Map<string,Ranked>(), muscles=new Map<string,number>(), days=Array(7).fill(0) as number[], hours=Array(24).fill(0) as number[];
    let sets=0,reps=0,seconds=0;
    for(const w of workouts){
      seconds+=Math.max(0,w.durationSec||0);
      const d=new Date(w.startedAt);days[d.getDay()]++;hours[d.getHours()]++;
      const seen=new Set<string>();
      for(const e of w.exercises){
        const id=e.exerciseId||e.name.toLowerCase();
        const valid=e.sets.filter(s=>s.completed!==false&&s.kind!=="warmup"&&!isCardioSet(s));
        if(!valid.length)continue;
        let item=exerciseMap.get(id);
        if(!item){item={id,name:e.name,visits:0,sets:0,reps:0,best:0,weight:0,bestReps:0};exerciseMap.set(id,item);}
        if(!seen.has(id)){item.visits++;seen.add(id);}
        for(const s of valid){
          sets++;item.sets++;const r=Math.max(0,s.reps||0);reps+=r;item.reps+=r;
          const estimate=estimate1RM(s);
          if(estimate>item.best){item.best=estimate;item.weight=s.weight;item.bestReps=s.reps;}
          const primary=e.muscles?.[0];
          if(primary)muscles.set(primary,(muscles.get(primary)||0)+1);
        }
      }
    }
    const top=[...exerciseMap.values()].sort((a,b)=>b.visits-a.visits||b.sets-a.sets||a.name.localeCompare(b.name));
    const topMuscles=[...muscles.entries()].sort((a,b)=>b[1]-a[1]);
    const priorSets=previous.reduce((sum,w)=>sum+w.exercises.reduce((total,e)=>total+e.sets.filter(s=>s.completed!==false&&s.kind!=="warmup"&&!isCardioSet(s)).length,0),0);
    const prs=personalRecords(training.workouts).byWorkout;
    const prCount=workouts.reduce((n,w)=>n+(prs.get(w.id)?.length||0),0);
    const mostDay=days.indexOf(Math.max(...days)), mostHour=hours.indexOf(Math.max(...hours));
    const maxLift=[...exerciseMap.values()].filter(e=>e.best>0).sort((a,b)=>b.best-a.best)[0];
    const totalMuscleSets=topMuscles.reduce((n,x)=>n+x[1],0);
    const personality=top.length>=12?"THE EXPLORER":topMuscles.length>0&&topMuscles[0][1]/Math.max(1,totalMuscleSets)>.4?"THE SPECIALIST":workouts.length>=12?"THE CONSISTENT BUILDER":workouts.length>=4?"THE STEADY BUILDER":"THE FRESH START";
    const uniqueDays=new Set(workouts.map(w=>new Date(w.startedAt).toDateString())).size;
    return {workouts,previous,top,topMuscles,sets,reps,seconds,days,hours,mostDay,mostHour,prCount,priorSets,maxLift,personality,uniqueDays,totalMuscleSets};
  },[training,selectedMonth]);
  if(!training||!data)return <div className="grid min-h-dvh place-items-center bg-background text-foreground"><div className="text-center"><div className="font-display text-3xl font-black">RECOMP'D</div><div className="mt-4 animate-pulse text-sm text-muted-foreground">Preparing your Wrapped…</div></div></div>;
  const sessions=data.workouts.length, favourite=data.top[0], muscle=data.topMuscles[0], hours=Math.floor(data.seconds/3600), minutes=Math.round((data.seconds%3600)/60);
  const comparison=data.priorSets?Math.round((data.sets/data.priorSets-1)*100):null;
  return <div className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col overflow-hidden bg-background text-foreground">
    <header className="z-10 flex items-center justify-between px-6 pt-7"><Link to="/progress" className="rounded-full border border-border bg-card p-2" aria-label="Back to progress"><ArrowLeft size={18}/></Link><span className="text-[10px] font-black tracking-[.23em]">RECOMP'D / WRAPPED</span><span className="text-xs font-bold tabular-nums">{step+1} / {titles.length}</span></header>
    <div className="mt-4 flex items-center justify-center gap-3 px-6"><button className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-bold" onClick={()=>{setSelectedMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1));setStep(0)}} aria-label="Previous month">‹</button><span className="min-w-36 text-center text-xs font-black uppercase tracking-widest">{MONTH}</span><button className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-bold disabled:opacity-25" disabled={selectedMonth.getTime()>=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime()} onClick={()=>{setSelectedMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1));setStep(0)}} aria-label="Next month">›</button></div>
    <div className="mt-5 flex gap-1 px-6">{titles.map((_,i)=><button key={i} onClick={()=>setStep(i)} aria-label={"Go to slide "+(i+1)} className={"h-1 flex-1 rounded-full transition-colors "+(i<=step?"bg-primary":"bg-border")}/>)}</div>
    <main key={step} className="animate-in fade-in slide-in-from-bottom-5 duration-500 flex flex-1 flex-col px-6 pb-5">
      <div className="mt-10 text-[11px] font-black tracking-[.22em] text-primary">{MONTH} · {ordinal(step+1)} CHAPTER</div>
      <h1 className="font-display mt-4 text-[clamp(2.65rem,12vw,4rem)] font-black uppercase leading-[.92] tracking-tight">{titles[step]}<span className="text-primary">.</span></h1>
      {step===0&&<div className="mt-9 space-y-3"><div className="rounded-[2rem] bg-primary p-7 text-primary-foreground"><CalendarDays size={25}/><div className="mt-7 font-display text-[6rem] font-black leading-none tabular-nums">{sessions}</div><div className="mt-2 text-sm font-black tracking-wider">WORKOUTS COMPLETED</div></div><div className="grid grid-cols-2 gap-3"><Stat label="TIME TRAINING" value={hours+"h "+minutes+"m"}/><Stat label="PERSONAL RECORDS" value={format(data.prCount)}/></div><p className="pt-2 text-sm text-muted-foreground">{sessions?"Every session has a story. Here's yours.":"No completed workouts logged for this month. Your recap will fill in as you train."}</p></div>}
      {step===1&&<div className="mt-8"><p className="text-sm text-muted-foreground">The exercises you kept coming back to.</p>{favourite?<><div className="mt-6 rounded-[2rem] bg-primary p-7 text-primary-foreground"><Heart size={24}/><div className="mt-7 text-xs font-black tracking-widest">YOUR #1 EXERCISE</div><div className="font-display mt-3 text-4xl font-black uppercase leading-none">{favourite.name}</div><div className="mt-5 text-5xl font-black">{favourite.visits}<span className="ml-2 text-sm font-semibold">workouts</span></div><div className="mt-2 text-sm opacity-90">{favourite.sets} sets · {format(favourite.reps)} reps</div></div><div className="mt-5 space-y-2">{data.top.slice(0,5).map((e,i)=><div key={e.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"><span className="w-6 font-display text-xl font-black text-primary">{i+1}</span><span className="min-w-0 flex-1 truncate text-sm font-bold">{e.name}</span><span className="text-xs font-bold tabular-nums text-muted-foreground">{e.visits}×</span></div>)}</div></>:<Empty/>}</div>}
      {step===2&&<div className="mt-9"><p className="text-sm text-muted-foreground">Your most-trained muscle groups, based on primary muscles in your logged working sets.</p>{muscle?<><div className="mt-7 rounded-[2rem] bg-primary p-7 text-primary-foreground"><Dumbbell size={27}/><div className="mt-12 text-xs font-black tracking-widest">YOUR FAVOURITE MUSCLE GROUP</div><div className="font-display mt-3 text-5xl font-black uppercase">{String(muscle[0]).replaceAll("_"," ")}</div><div className="mt-3 text-2xl font-black">{Math.round(muscle[1]/Math.max(1,data.totalMuscleSets)*100)}% <span className="text-sm font-medium">of primary-muscle sets</span></div></div><div className="mt-6 space-y-4">{data.topMuscles.slice(0,4).map(([name,count],i)=><div key={name}><div className="mb-1 flex justify-between text-xs font-bold"><span>{i+1}. {String(name).replaceAll("_"," ")}</span><span>{count} sets</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{width:Math.round(count/Math.max(1,muscle[1])*100)+"%"}}/></div></div>)}</div></>:<Empty/>}</div>}
      {step===3&&<div className="mt-9 space-y-4"><div className="rounded-[2rem] bg-primary p-7 text-primary-foreground"><CalendarDays size={26}/><div className="mt-10 text-xs font-black tracking-widest">YOUR FAVOURITE DAY</div><div className="font-display mt-3 text-5xl font-black uppercase">{sessions?weekdays[data.mostDay]:"—"}</div><div className="mt-3 text-sm">{sessions?data.days[data.mostDay]+" workouts on "+weekdays[data.mostDay]+"s":"No workout days yet"}</div></div><div className="grid grid-cols-2 gap-3"><Stat label="DAYS YOU TRAINED" value={String(data.uniqueDays)}/><Stat label="MOST COMMON START" value={sessions?String(data.mostHour%12||12)+(data.mostHour>=12?"pm":"am"):"—"}/></div><p className="text-xs leading-5 text-muted-foreground">Based on the start times of your completed workouts.</p></div>}
      {step===4&&<div className="mt-9"><div className="rounded-[2rem] bg-primary p-7 text-primary-foreground"><Trophy size={30}/><div className="mt-12 text-xs font-black tracking-widest">YOUR HEAVIEST ESTIMATED LIFT</div><div className="font-display mt-3 text-4xl font-black uppercase">{data.maxLift?.name??"NOT YET LOGGED"}</div><div className="mt-6 text-5xl font-black">{data.maxLift?clean(data.maxLift.best).toFixed(1)+" kg":"—"}</div><div className="mt-2 text-sm">Estimated 1RM {data.maxLift?"· "+data.maxLift.weight+" kg × "+data.maxLift.bestReps+" reps":""}</div></div><p className="mt-5 text-xs leading-5 text-muted-foreground">An estimate from your logged sets, not a tested maximum. Different exercise types aren't directly comparable; global percentiles aren't shown without verified benchmarks.</p></div>}
      {step===5&&<div className="mt-9 grid grid-cols-2 gap-3"><Stat label="WORKING SETS" value={format(data.sets)}/><Stat label="TOTAL REPS" value={format(data.reps)}/><Stat label="VS PREVIOUS MONTH" value={comparison===null?"—":(comparison>0?"+":"")+comparison+"%"}/><Stat label="EXERCISES TRAINED" value={String(data.top.length)}/><div className="col-span-2 rounded-3xl border border-border bg-card p-6"><TrendingUp className="text-primary"/><div className="mt-4 text-xl font-black">Every rep counts.</div><p className="mt-2 text-sm text-muted-foreground">Working sets exclude warm-ups and cardio. Previous-month comparison is shown only when you logged working sets then.</p></div></div>}
      {step===6&&<div className="mt-9"><div className="rounded-[2rem] bg-primary p-7 text-primary-foreground"><Sparkles size={28}/><div className="mt-14 text-xs font-black tracking-widest">YOUR TRAINING PERSONALITY</div><div className="font-display mt-4 text-5xl font-black uppercase leading-none">{data.personality}</div><p className="mt-6 text-sm leading-6 opacity-90">{data.personality==="THE EXPLORER"?"You made room for variety, logging at least twelve different exercises.":data.personality==="THE SPECIALIST"?"One muscle group dominated your logged primary-muscle sets.":data.personality==="THE CONSISTENT BUILDER"?"You showed up for at least twelve sessions this month.":data.personality==="THE STEADY BUILDER"?"You kept making time to train throughout the month.":"Every training journey starts somewhere."}</p></div></div>}
      {step===7&&<div className="mt-9"><div className="rounded-[2rem] border border-primary/30 bg-primary p-7 text-primary-foreground"><Award size={28}/><div className="mt-12 text-xs font-black tracking-[.2em]">RECOMP'D · OCTOBER 2026</div><div className="font-display mt-3 text-4xl font-black uppercase leading-none">{data.personality}</div><div className="mt-10 grid grid-cols-2 gap-6"><div><div className="text-3xl font-black">{sessions}</div><div className="text-[10px] font-bold tracking-wider">WORKOUTS</div></div><div><div className="text-3xl font-black">{data.prCount}</div><div className="text-[10px] font-bold tracking-wider">PERSONAL RECORDS</div></div><div className="col-span-2"><div className="text-xs font-black tracking-wider">FAVOURITE EXERCISE</div><div className="mt-1 text-xl font-black">{favourite?.name??"Not logged"}</div></div></div></div><p className="mt-5 text-center text-sm text-muted-foreground">Your month. Your work. Your story.</p></div>}
    </main>
    <footer className="sticky bottom-0 z-10 flex gap-3 border-t border-border bg-background/95 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur"><button onClick={()=>setStep(Math.max(0,step-1))} disabled={step===0} className="rounded-2xl border border-border px-5 py-4 font-bold disabled:opacity-30" aria-label="Previous slide"><ArrowLeft size={18}/></button><button onClick={()=>setStep(s=>s===titles.length-1?0:s+1)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-black text-primary-foreground">{step===titles.length-1?"REPLAY WRAPPED":"NEXT"}<ArrowRight size={18}/></button></footer>
  </div>;
}
function Stat({label,value}:{label:string;value:string}){return <div className="rounded-3xl border border-border bg-card p-5"><div className="font-display text-3xl font-black">{value}</div><div className="mt-2 text-[10px] font-black tracking-wider text-muted-foreground">{label}</div></div>}
function Empty(){return <div className="mt-8 rounded-3xl border border-border bg-card p-7 text-sm text-muted-foreground">No qualifying exercises logged for this month.</div>}
