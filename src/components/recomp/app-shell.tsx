import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Dumbbell, Hammer, House } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const destinations = [
  { label: "Home", to: "/", icon: House },
  { label: "Build", to: "/build", icon: Hammer },
  { label: "Workout", to: "/workout", icon: Dumbbell },
  { label: "Progress", to: "/progress", icon: BarChart3 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-app-canvas">
      <div className="relative mx-auto min-h-dvh max-w-[430px] bg-background md:border-x md:border-border">
        <main className="min-h-dvh pb-[calc(5.25rem+env(safe-area-inset-bottom))]">{children}</main>
        <BottomNavigation />
      </div>
    </div>
  );
}

export function BottomNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] border-t border-border bg-nav/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="grid h-[4.75rem] grid-cols-4 px-2">
        {destinations.map(({ label, to, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : to === "/build" ? pathname.startsWith("/build") || pathname === "/generated-workout" : pathname.startsWith(to);
          return (
            <Link key={to} to={to} aria-current={active ? "page" : undefined} className={cn("flex min-w-0 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold text-muted-foreground transition-colors", active && "text-primary")}>
              <Icon className="size-[1.3rem]" strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
