import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, Dumbbell, Hammer, House } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/recomp/auth-context";
import { Button } from "@/components/ui/button";

const destinations = [
  { label: "Home", to: "/", icon: House },
  { label: "Build", to: "/build", icon: Hammer },
  { label: "Workout", to: "/workout", icon: Dumbbell },
  { label: "Progress", to: "/progress", icon: BarChart3 },
] as const;

const signedOutRoutes = ["/welcome", "/create-account", "/login", "/forgot-password", "/check-email"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const { status, onboardingComplete, retryProfile, signOut } = useAuth();
  const signedOutRoute = signedOutRoutes.includes(pathname);
  const onboardingRoute = pathname.startsWith("/onboarding");
  const resetRoute = pathname === "/reset-password";
  const entryRoute = signedOutRoute || onboardingRoute || resetRoute;

  let target: "/welcome" | "/onboarding/about" | "/" | null = null;
  if (status === "signedOut" && !signedOutRoute && !resetRoute) target = "/welcome";
  if (status === "signedIn" && !resetRoute) {
    if (!onboardingComplete && !onboardingRoute) target = "/onboarding/about";
    if (onboardingComplete && (signedOutRoute || onboardingRoute)) target = "/";
  }

  useEffect(() => { if (target) void navigate({ to: target, replace: true }); }, [target, navigate]);

  const blocked = (status === "loading" && !resetRoute) || Boolean(target);
  return (
    <div className="min-h-dvh bg-app-canvas">
      <div className="relative mx-auto min-h-dvh max-w-[430px] bg-background md:border-x md:border-border">
        {status === "profileError" && !resetRoute ? <ProfileError onRetry={retryProfile} onSignOut={() => void signOut()} /> : blocked ? <AuthLoading /> : <>
          <main className={cn("min-h-dvh", !entryRoute && "pb-[calc(5.25rem+env(safe-area-inset-bottom))]")}>{children}</main>
          {!entryRoute && <BottomNavigation />}
        </>}
      </div>
    </div>
  );
}

function AuthLoading() {
  return <div role="status" aria-label="Loading" className="grid min-h-dvh place-items-center"><div className="text-center"><div className="font-display text-4xl font-black leading-none">RECOMP<span className="text-primary">'</span>D</div><div className="mx-auto mt-5 h-0.5 w-10 animate-pulse rounded-full bg-primary" /></div></div>;
}

function ProfileError({ onRetry, onSignOut }: { onRetry: () => void; onSignOut: () => void }) {
  return <div className="grid min-h-dvh place-items-center px-6"><div className="w-full text-center"><div className="font-display text-3xl font-black">RECOMP<span className="text-primary">'</span>D</div><p className="mt-4 text-sm text-muted-foreground">We couldn't load your profile. Check your connection and try again.</p><div className="mt-8 space-y-3"><Button variant="primary" size="xl" className="w-full" onClick={onRetry}>Try again</Button><Button variant="surface" size="xl" className="w-full" onClick={onSignOut}>Sign out</Button></div></div></div>;
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
