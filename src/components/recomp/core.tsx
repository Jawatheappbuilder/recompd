import { Link } from "@tanstack/react-router";
import { ChevronRight, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("animate-screen px-4 pb-5 pt-[calc(1rem+env(safe-area-inset-top))]", className)}>{children}</div>;
}

export function Header({ title }: { title?: string }) {
  return (
    <header className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="min-w-0">
        <div className="wordmark">RECOMP<span className="text-primary">'</span>D</div>
        {title ? <h1 className="mt-3 truncate text-2xl font-bold">{title}</h1> : null}
      </div>
      <Button asChild aria-label="Settings" variant="surface" size="icon"><Link to="/settings"><Settings /></Link></Button>
    </header>
  );
}

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-2.5 flex items-center justify-between"><h2 className="text-[0.72rem] font-bold uppercase tracking-[0.13em] text-muted-foreground">{children}</h2>{action}</div>;
}

export function Metric({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return <div className="min-w-0"><div className={cn("truncate text-lg font-bold tabular-nums", accent && "text-primary")}>{value}</div><div className="mt-0.5 text-[0.68rem] font-medium leading-tight text-muted-foreground">{label}</div></div>;
}

export function SummaryRow({ title, subtitle, meta, onClick }: { title: string; subtitle: string; meta: string; onClick?: () => void }) {
  const content = <><div className="min-w-0 text-left"><div className="truncate text-sm font-bold">{title}</div><div className="mt-1 text-xs text-muted-foreground">{subtitle}</div></div><div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted-foreground"><span>{meta}</span><ChevronRight className="size-4" /></div></>;
  return onClick ? <button type="button" onClick={onClick} className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</button> : <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">{content}</div>;
}

export { Card };
