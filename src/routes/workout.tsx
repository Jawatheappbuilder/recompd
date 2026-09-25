import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ActiveWorkout } from "@/components/recomp/active-workout";
import { useAuth } from "@/components/recomp/auth-context";
import { EmptyWorkout } from "@/components/recomp/empty-workout";
import { Header, Screen } from "@/components/recomp/core";
import { useActiveWorkout } from "@/hooks/use-active-workout";

export const Route = createFileRoute("/workout")({
  head: () => ({ meta: [
    { title: "Workout — RECOMP'D" }, { name: "description", content: "Start and track your current strength workout." },
    { property: "og:title", content: "Workout — RECOMP'D" }, { property: "og:description", content: "Start and track your current strength workout." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: WorkoutPage,
});

const WIFEY_PREVIEW_EMAIL = "ashleyjpemberton@gmail.com";

function WorkoutPage() {
  const { workout, setWorkout, hydrated } = useActiveWorkout();
  const { user } = useAuth();
  const [showWifeyHype, setShowWifeyHype] = useState(false);

  useEffect(() => {
    if (!hydrated || !workout || user?.email?.toLowerCase() !== WIFEY_PREVIEW_EMAIL) return;
    setShowWifeyHype(true);
    const timer = window.setTimeout(() => setShowWifeyHype(false), 1800);
    return () => window.clearTimeout(timer);
  }, [hydrated, workout?.id, user?.email]);

  if (!hydrated) return <Screen>{null}</Screen>;
  if (!workout) return <Screen><Header/><EmptyWorkout/></Screen>;
  return <Screen className="pt-0">
    <ActiveWorkout workout={workout} onChange={(next) => setWorkout(next)} onCancel={() => { sessionStorage.removeItem("recomp-active-workout"); setWorkout(null); }} />
    {showWifeyHype && <WifeyWorkoutHype />}
  </Screen>;
}

function WifeyWorkoutHype() {
  return <div className="fixed inset-0 z-[100] mx-auto grid max-w-[430px] place-items-center overflow-hidden bg-[#fff1d7] px-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200" role="status" aria-label="Go wifey">
    <div className="relative -rotate-1 text-center motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-500">
      <div className="select-none font-display text-[clamp(5rem,25vw,7.5rem)] font-black uppercase leading-[0.72] tracking-[-0.09em] text-[#f58eaa] [text-shadow:-7px_7px_0_#f12612,-14px_14px_0_#f12612]">GO</div>
      <div className="mt-7 select-none font-display text-[clamp(4rem,20vw,6.2rem)] font-black uppercase leading-[0.72] tracking-[-0.08em] text-[#f58eaa] [text-shadow:-6px_6px_0_#f12612,-12px_12px_0_#f12612]">WIFEY</div>
    </div>
  </div>;
}
