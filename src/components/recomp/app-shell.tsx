import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, Dumbbell, Hammer, House } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/recomp/auth-context";
import { Button } from "@/components/ui/button";
import { PENDING_SHARE_KEY } from "@/lib/workout-share";
import { ACTIVE_WORKOUT_KEY, type ActiveWorkoutState } from "@/hooks/use-active-workout";

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
  const shareRoute = pathname.startsWith("/share/");
  const entryRoute = signedOutRoute || onboardingRoute || resetRoute || (shareRoute && status !== "signedIn");

  let target: "/welcome" | "/onboarding/about" | "/" | null = null;
  if (status === "signedOut" && !signedOutRoute && !resetRoute && !shareRoute) target = "/welcome";
  if (status === "demo" && ((signedOutRoute && pathname !== "/create-account" && pathname !== "/login" && pathname !== "/forgot-password" && pathname !== "/check-email") || onboardingRoute)) target = "/";
  if (status === "signedIn" && !resetRoute) {
    if (!onboardingComplete && !onboardingRoute) target = "/onboarding/about";
    if (onboardingComplete && (signedOutRoute || onboardingRoute)) target = "/";
  }

  useEffect(() => {
    if (!target) return;
    const pending = target === "/" ? localStorage.getItem(PENDING_SHARE_KEY) : null;
    if (pending) void navigate({ to: "/share/$token", params: { token: pending }, replace: true });
    else void navigate({ to: target, replace: true });
  }, [target, navigate]);

  const blocked = (status === "loading" && !resetRoute) || Boolean(target);
  return (
    <><div className="min-h-dvh bg-app-canvas">
      <div className="relative mx-auto min-h-dvh max-w-[430px] bg-background md:border-x md:border-border">
        {status === "profileError" && !resetRoute ? <ProfileError onRetry={retryProfile} onSignOut={() => void signOut()} /> : blocked ? <AuthLoading /> : <>
          <main className={cn("min-h-dvh", !entryRoute && "pb-[calc(5.25rem+env(safe-area-inset-bottom))]")}>{children}</main>
          {!entryRoute && <BottomNavigation />}
        </>}
      </div>
    </div></>
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
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const read = () => { try { const saved = localStorage.getItem(ACTIVE_WORKOUT_KEY); setActiveWorkout(saved ? JSON.parse(saved) as ActiveWorkoutState : null); } catch { setActiveWorkout(null); } };
    read();
    const timer = window.setInterval(() => { setNow(Date.now()); read(); }, 1000);
    window.addEventListener("storage", read);
    return () => { window.clearInterval(timer); window.removeEventListener("storage", read); };
  }, []);
  const elapsed = activeWorkout ? Math.max(0, Math.floor((now - activeWorkout.startedAt) / 1000)) : 0;
  const liveTime = elapsed >= 3600 ? `${Math.floor(elapsed / 3600)}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}` : `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] border-t border-border bg-nav/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="grid h-[4.75rem] grid-cols-4 px-2">
        {destinations.map(({ label, to, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : to === "/build" ? pathname.startsWith("/build") || pathname === "/generated-workout" : pathname.startsWith(to);
          return (
            <Link key={to} to={to} aria-current={active ? "page" : undefined} className={cn("flex min-w-0 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold text-muted-foreground transition-colors", active && "text-primary")}>
              {label === "Workout" && activeWorkout ? <span className="min-w-[3.25rem] rounded-full bg-primary px-2 py-1 text-center text-[0.66rem] font-extrabold tabular-nums text-primary-foreground shadow-sm motion-safe:animate-pulse">{liveTime}</span> : <Icon className="size-[1.3rem]" strokeWidth={active ? 2.5 : 2} />}
              <span>{label === "Workout" && activeWorkout ? "Live" : label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

