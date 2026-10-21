import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AccentPreference } from "@/lib/user-preferences";

export const colourways: {id:AccentPreference;label:string;colors:[string,string,string,string,string];dark:boolean}[] = [
 {id:"spectrum",label:"Spectrum",colors:["#d02c40","#f1f2f4","#ffffff","#2cbe88","#e8b53e"],dark:false},
 {id:"voltage",label:"Voltage",colors:["#e84550","#14171d","#242932","#39c78d","#f1bd42"],dark:true},
 {id:"vintage",label:"Vintage Athletics",colors:["#263f3b","#f5efe3","#fffaf0","#c45a39","#dca849"],dark:false},
 {id:"neon",label:"Neon Pulse",colors:["#9d7bf3","#121524","#22243a","#36d3e8","#b8ea56"],dark:true},
 {id:"coastal",label:"Coastal Energy",colors:["#195c8a","#eaf4f5","#ffffff","#2cbbae","#f07d6c"],dark:false},
 {id:"colourpop",label:"Colour Pop",colors:["#426acf","#f1ede7","#ffffff","#ed604e","#72cba5"],dark:false},
 {id:"heavyduty",label:"Heavy Duty",colors:["#f5bf40","#111214","#282a2e","#40be83","#e34a48"],dark:true},
 {id:"blush",label:"Blush",colors:["#f5b8d2","#fff4f8","#fffdfd","#d9bcec","#e58eaf"],dark:false},
 {id:"red",label:"RECOMP'D Red",colors:["#c82c3c","#f6f0e9","#ffffff","#199b71","#e2ac45"],dark:false},
 {id:"blue",label:"Blue",colors:["#317dcb","#f5f0e9","#ffffff","#199b71","#e2ac45"],dark:false},
 {id:"black",label:"Black",colors:["#262626","#f5f0e9","#ffffff","#199b71","#e2ac45"],dark:false},
];
export function ColourwayExplorer({ initial, onApply, onClose, modal=false }:{initial:AccentPreference;onApply:(accent:AccentPreference)=>void;onClose?:()=>void;modal?:boolean}) {
 const [selected,setSelected]=useState<AccentPreference>(initial);
 const palette=colourways.find(p=>p.id===selected)??colourways[0]!;
 const [primary,bg,card,success,highlight]=palette.colors;
 const ink=palette.dark?"#f6f7f9":"#202630";
 const sub=palette.dark?"#acb5c0":"#606a75";
 return <div className={modal?"fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+12px)]":""}>
 <div className={modal?"flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-2xl":"space-y-3"}>
  <div className="flex items-start justify-between gap-2 px-4 pt-4">
   <div><h2 className="text-lg font-black">{modal?"Find your colourway":"Try a colourway"}</h2><p className="mt-1 text-xs text-muted-foreground">Tap a style to preview a Home screen and workout.</p></div>
   {onClose&&<button type="button" aria-label="Close theme explorer" className="grid size-9 place-items-center rounded-full bg-secondary" onClick={onClose}><X className="size-4"/></button>}
  </div>
  <div className="min-h-0 space-y-3 overflow-y-auto px-4 pb-3">
   <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Colourway choices">
    {colourways.map(p=><button key={p.id} type="button" aria-pressed={selected===p.id} onClick={()=>setSelected(p.id)} className={"min-w-[112px] shrink-0 rounded-xl border p-2 text-left "+(selected===p.id?"border-primary ring-2 ring-primary/40":"border-border")}>
     <span className="flex h-7 overflow-hidden rounded-md">{p.colors.map((c,i)=><span key={i} className="flex-1" style={{background:c}}/>)}</span>
     <span className="mt-1.5 block truncate text-[0.7rem] font-bold">{p.label}</span>
    </button>)}
   </div>
   <div className="overflow-hidden rounded-2xl border shadow-sm" style={{background:bg,color:ink,borderColor:palette.dark?"#404750":"#d7dce2"}}>
    <div className="p-4" style={{background:primary,color:palette.dark&&selected==="heavyduty"?"#111214":"#ffffff"}}>
     <p className="text-xs font-black">RECOMP'D</p><p className="mt-3 text-[0.65rem] opacity-80">YOUR TRAINING</p><p className="text-xl font-extrabold">Ready to train?</p>
    </div>
    <div className="space-y-2 p-3">
     <div className="rounded-xl p-3" style={{background:card,border:"1px solid "+(palette.dark?"#434b56":"#d8dde2")}}>
      <p className="text-[0.62rem] font-black" style={{color:sub}}>UP NEXT</p><p className="text-sm font-extrabold">Upper Builder</p><p className="text-[0.68rem]" style={{color:sub}}>5 exercises · 35 minutes</p>
      <div className="mt-2 rounded-lg p-2 text-center text-xs font-bold" style={{background:primary,color:selected==="heavyduty"?"#161616":"#ffffff"}}>Start workout →</div>
     </div>
     <div className="flex items-center gap-2 rounded-xl p-3" style={{background:card}}>
      <span className="grid size-8 place-items-center rounded-full text-xs font-black" style={{background:highlight,color:"#202020"}}>3/4</span>
      <div className="flex-1"><p className="text-xs font-bold">This week</p><div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{background:palette.dark?"#444a54":"#d9dce0"}}><div className="h-full w-3/4 rounded-full" style={{background:success}}/></div></div>
      <Check size={17} color={success}/>
     </div>
     <div className="flex justify-around rounded-xl p-2 text-[0.63rem] font-bold" style={{background:card,color:sub}}><span style={{color:primary}}>Home</span><span>Build</span><span>Programs</span><span>Workout</span><span>Progress</span></div>
    </div>
   </div>
  </div>
  <div className="flex gap-2 border-t border-border px-4 py-3">
   {onClose&&<Button variant="surface" className="flex-1" onClick={onClose}>Not now</Button>}
   <Button variant="primary" className="flex-1" onClick={()=>{onApply(selected);onClose?.();}}>Use {palette.label}</Button>
  </div>
 </div></div>;
}
