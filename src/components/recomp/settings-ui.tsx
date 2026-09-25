import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsHeader({ title, subtitle }: { title: string; subtitle?: string | undefined }) {
  const router = useRouter();
  return (
    <header className="mb-5 grid grid-cols-[auto_minmax(0,1fr)_2.5rem] items-center gap-3 pt-1">
      <Button variant="surface" size="icon" className="size-10" aria-label="Back" onClick={() => router.history.canGoBack() ? router.history.back() : void router.navigate({ to: "/" })}><ArrowLeft /></Button>
      <div className="min-w-0 text-center"><h1 className="text-xl font-extrabold leading-tight">{title}</h1>{subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}</div>
      <span />
    </header>
  );
}

export function SettingsSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return <section className={cn("space-y-1.5", className)}><h2 className="px-1 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-muted-foreground">{title}</h2><div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card px-3">{children}</div></section>;
}

export function SettingsLink({ to, icon: Icon, label, value }: { to: "/settings/profile" | "/settings/training" | "/settings/exercises" | "/settings/appearance" | "/settings/account" | "/privacy" | "/terms" | "/support"; icon: LucideIcon; label: string; value?: string | undefined }) {
  return (
    <Button asChild variant="ghost" className="h-auto min-h-14 w-full justify-start rounded-none px-0 hover:bg-transparent">
      <Link to={to}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon className="size-4" /></span><span className="min-w-0 flex-1 text-left text-sm font-bold">{label}</span>{value && <span className="max-w-32 truncate text-xs font-semibold text-muted-foreground">{value}</span>}<ChevronRight className="size-4 text-muted-foreground" /></Link>
    </Button>
  );
}

export function SettingsRow({ icon: Icon, label, value, disabled = false, onClick }: { icon?: LucideIcon | undefined; label: string; value?: string | undefined; disabled?: boolean | undefined; onClick?: (() => void) | undefined }) {
  return (
    <Button variant="ghost" disabled={disabled} onClick={onClick} className="h-auto min-h-14 w-full justify-start rounded-none px-0 hover:bg-transparent">
      {Icon && <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon className="size-4" /></span>}
      <span className="min-w-0 flex-1 text-left text-sm font-bold">{label}</span>
      {value && <span className="text-xs font-semibold text-muted-foreground">{value}</span>}
      {onClick && !disabled && <ChevronRight className="size-4 text-muted-foreground" />}
    </Button>
  );
}

export function CompactChoice<T extends string | number>({ value, options, onChange, label, className }: { value: T; options: readonly T[]; onChange: (value: T) => void; label: string; className?: string | undefined }) {
  return (
    <div>
      <div className="mb-2 text-xs font-bold text-muted-foreground">{label}</div>
      <div role="radiogroup" aria-label={label} className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-border bg-secondary p-1", className)}>
        {options.map((option) => <Button key={String(option)} role="radio" aria-checked={value === option} variant={value === option ? "segmentActive" : "segment"} className={cn("h-9 min-w-0 px-2 text-xs", value === option && "text-primary")} onClick={() => onChange(option)}>{option}</Button>)}
      </div>
    </div>
  );
}
