import { Check, ChevronRight, Minus, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./core";

const muscles = ["Chest", "Back", "Shoulders", "Arms", "Quads", "Hamstrings"];

export function WorkoutBuilder() {
  const [mode, setMode] = useState<"generate" | "manual">("generate");
  const [selected, setSelected] = useState(["Chest", "Back"]);
  const [count, setCount] = useState(6);
  const toggle = (muscle: string) => setSelected((current) => current.includes(muscle) ? current.filter((item) => item !== muscle) : [...current, muscle]);
  return <div className="space-y-5"><div className="grid grid-cols-2 rounded-xl border border-border bg-secondary p-1">{([['generate','Generate'],['manual','Build your own']] as const).map(([value,label]) => <Button key={value} variant={mode === value ? "segmentActive" : "segment"} onClick={() => setMode(value)}>{label}</Button>)}</div><section><SectionHeading>Muscle selection</SectionHeading><div className="grid grid-cols-2 gap-2">{muscles.map((muscle) => { const active = selected.includes(muscle); return <Button key={muscle} variant={active ? "choiceActive" : "choice"} onClick={() => toggle(muscle)} className="justify-between">{muscle}{active && <Check className="size-4"/>}</Button>})}</div></section><section><SectionHeading>Exercises</SectionHeading><Card className="divide-y divide-border px-4">{["Bench Press", "Chest-Supported Row", "Incline Dumbbell Press"].map((exercise) => <div key={exercise} className="flex min-h-12 items-center justify-between text-sm font-semibold"><span>{exercise}</span><ChevronRight className="size-4 text-muted-foreground"/></div>)}</Card></section><section><SectionHeading>Number of exercises</SectionHeading><Card className="flex items-center justify-between p-3"><Button variant="surface" size="icon" onClick={() => setCount(Math.max(1, count - 1))} aria-label="Decrease exercise count"><Minus/></Button><div className="text-center"><div className="text-2xl font-black tabular-nums">{count}</div><div className="text-[0.62rem] font-semibold uppercase text-muted-foreground">Exercises</div></div><Button variant="surface" size="icon" onClick={() => setCount(Math.min(12, count + 1))} aria-label="Increase exercise count"><Plus/></Button></Card></section><section><SectionHeading>Workout preview</SectionHeading><Card className="flex items-center gap-3 p-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Sparkles className="size-5"/></div><div className="min-w-0 flex-1"><div className="font-bold">Upper Body Focus</div><div className="mt-0.5 text-xs text-muted-foreground">{count} exercises · ~55 min</div></div><ChevronRight className="size-4 text-muted-foreground"/></Card></section><Button variant="primary" size="xl" className="w-full">{mode === "generate" ? "Generate workout" : "Continue"}</Button></div>;
}
