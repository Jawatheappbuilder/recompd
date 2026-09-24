import { Link } from "@tanstack/react-router";
import { Dumbbell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
export function EmptyWorkout() { return <div className="flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center text-center"><div className="mb-5 grid size-16 place-items-center rounded-2xl border border-border bg-card text-muted-foreground"><Dumbbell className="size-7"/></div><h1 className="text-xl font-bold">No active workout</h1><Button asChild variant="primary" size="xl" className="mt-6 min-w-56"><Link to="/build"><Plus/>Start workout</Link></Button></div>; }
