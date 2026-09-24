import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function OnboardingScreen({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return <div className={cn("animate-screen mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]", centered && "justify-center")}>{children}</div>;
}

export function FormMessage({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" }) {
  return <p role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-3 py-2.5 text-xs font-semibold", tone === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/[0.06] text-foreground")}>{children}</p>;
}

export function OnboardingHeader({ title, subtitle, backTo, progress }: { title: string; subtitle: string; backTo: "/welcome" | "/create-account" | "/login" | "/onboarding/about" | "/forgot-password"; progress?: 1 | 2 }) {
  const router = useRouter();
  return <header className="mb-6"><div className="mb-8 flex items-center justify-between"><Button variant="surface" size="icon" className="size-10" aria-label="Back" onClick={() => router.history.canGoBack() ? router.history.back() : void router.navigate({ to: backTo })}><ArrowLeft /></Button>{progress && <OnboardingProgress current={progress} />}<span className="size-10" /></div><div className="wordmark mb-5">RECOMP<span className="text-primary">'</span>D</div><h1 className="text-3xl font-extrabold">{title}</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p></header>;
}

export function OnboardingProgress({ current }: { current: 1 | 2 }) {
  return <div aria-label={`Onboarding progress: ${current} of 2`} className="flex gap-1.5">{[1, 2].map((step) => <span key={step} className={cn("h-1.5 w-8 rounded-full bg-border", step <= current && "bg-primary")} />)}</div>;
}

export function FormField({ label, error, password, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | undefined; password?: boolean | undefined }) {
  const [visible, setVisible] = useState(false);
  const id = props.id ?? label.toLowerCase().replaceAll(" ", "-");
  return <div className="space-y-2"><Label htmlFor={id} className="text-xs font-bold text-muted-foreground">{label}</Label><div className="relative"><Input {...props} id={id} type={password ? visible ? "text" : "password" : props.type} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={cn("h-12 rounded-xl bg-secondary pr-11 text-foreground focus-visible:ring-2", error && "border-destructive", className)} />{password && <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 size-12 text-muted-foreground" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff /> : <Eye />}</Button>}</div>{error && <p id={`${id}-error`} className="text-xs font-semibold text-destructive">{error}</p>}</div>;
}

export function AuthFooter({ prompt, label, to }: { prompt: string; label: string; to: "/login" | "/create-account" }) {
  return <p className="mt-5 text-center text-xs text-muted-foreground">{prompt} <Link to={to} className="font-bold text-primary">{label}</Link></p>;
}