import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ActiveWorkout } from "@/components/recomp/active-workout";
import { useAuth } from "@/components/recomp/auth-context";
import { EmptyWorkout } from "@/components/recomp/empty-workout";
import { Header, Screen } from "@/components/recomp/core";
import { useActiveWorkout } from "@/hooks/use-active-workout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workout")({
  head: () => ({ meta: [
    { title: "Workout — RECOMP'D" }, { name: "description", content: "Start and track your current strength workout." },
    { property: "og:title", content: "Workout — RECOMP'D" }, { property: "og:description", content: "Start and track your current strength workout." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: WorkoutPage,
});

const WIFEY_USER_ID = "e791fd9b-67cf-41c1-9cad-de60e0753e8b";

function WorkoutPage() {
  const { workout, setWorkout, hydrated } = useActiveWorkout();
  const { user } = useAuth();
  const [showWifeyHype, setShowWifeyHype] = useState(false);

  useEffect(() => {
    if (!hydrated || !workout || user?.id !== WIFEY_USER_ID) return;
    setShowWifeyHype(true);
    const timer = window.setTimeout(() => setShowWifeyHype(false), 2600);
    return () => window.clearTimeout(timer);
  }, [hydrated, workout?.id, user?.id]);

  if (!hydrated) return <Screen>{null}</Screen>;
  if (!workout) return <Screen><Header/><EmptyWorkout/></Screen>;
  return <Screen className="pt-0">
    <ActiveWorkout workout={workout} onChange={(next) => setWorkout(next)} onCancel={() => { sessionStorage.removeItem("recomp-active-workout"); setWorkout(null); }} />
    {showWifeyHype && <WifeyWorkoutHype />}
  </Screen>;
}

function WifeyWorkoutHype() {
  const confetti = Array.from({ length: 28 }, (_, index) => ({
    left: `${6 + ((index * 37) % 88)}%`,
    delay: `${(index % 9) * 55}ms`,
    duration: `${900 + (index % 5) * 120}ms`,
    rotate: `${(index * 47) % 180}deg`,
  }));

  return <div className="fixed inset-0 z-[100] mx-auto flex max-w-[430px] items-center justify-center overflow-hidden bg-[#fff1d7] px-5 motion-safe:animate-[wifey-screen_2600ms_ease-in-out_both]" role="status" aria-label="Go wifey">
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden="true">
      {confetti.map((piece, index) => <span
        key={index}
        className={cn("absolute -top-6 h-3 w-1.5 rounded-sm opacity-0 motion-safe:animate-[wifey-confetti_var(--confetti-duration)_cubic-bezier(.2,.7,.3,1)_forwards]", index % 3 === 0 ? "bg-[#f12612]" : index % 3 === 1 ? "bg-[#f58eaa]" : "bg-[#2a2424]")}
        style={{ left: piece.left, animationDelay: piece.delay, ["--confetti-duration" as string]: piece.duration, transform: `rotate(${piece.rotate})` }}
      />)}
    </div>
    <div className="relative -translate-y-[18dvh] text-center motion-safe:animate-[wifey-pop_700ms_cubic-bezier(.16,1,.3,1)_both]">
      <div className="select-none text-[clamp(5.3rem,26vw,7.8rem)] font-black uppercase leading-[0.76] tracking-[-0.09em] text-[#f58eaa] [text-shadow:-6px_6px_0_#f12612,-12px_12px_0_#f12612]">GO</div>
      <div className="mt-7 select-none text-[clamp(4rem,20vw,6rem)] font-black uppercase leading-[0.76] tracking-[-0.075em] text-[#f58eaa] [text-shadow:-5px_5px_0_#f12612,-10px_10px_0_#f12612]">WIFEY</div>
    </div>
    <style>{`
      @keyframes wifey-screen {
        0% { opacity: 0; }
        8% { opacity: 1; }
        82% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes wifey-pop {
        0% { opacity: 0; transform: translateY(18px) scale(.72) rotate(-4deg); }
        55% { opacity: 1; transform: translateY(-6px) scale(1.08) rotate(1deg); }
        75% { transform: translateY(2px) scale(.98) rotate(-.5deg); }
        100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
      }
      @keyframes wifey-confetti {
        0% { opacity: 0; translate: 0 -8vh; scale: .7; }
        12% { opacity: 1; }
        100% { opacity: 1; translate: 0 108dvh; rotate: 520deg; scale: 1; }
      }
    `}</style>
  </div>;
}
