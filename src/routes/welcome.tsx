import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { OnboardingScreen } from "@/components/recomp/onboarding-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — RECOMP'D" }, { name: "description", content: "Start your RECOMP'D strength training journey." }, { property: "og:title", content: "Welcome — RECOMP'D" }, { property: "og:description", content: "Build. Track. Recomp." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WelcomePage,
});

function WelcomePage() {
  return <OnboardingScreen centered>
    <div className="relative -mx-1 flex flex-1 flex-col overflow-hidden px-1 pb-7 pt-10">
      <div className="relative z-10 pt-[11vh] text-center">
        <div className="font-display text-[3.75rem] font-black leading-none tracking-[-0.05em] text-foreground">RECOMP<span className="text-primary">'</span>D</div>
        <p className="mt-4 text-[0.72rem] font-bold uppercase tracking-[0.34em] text-foreground/70">Build. Track. Recomp.</p>
      </div>

      <div aria-hidden className="pointer-events-none absolute -bottom-[5.5rem] -left-[12.5rem] h-[36rem] w-[36rem] rotate-[-8deg] opacity-[0.13]">
        <div className="absolute inset-0 rounded-full bg-primary/25 shadow-[inset_-18px_-22px_40px_rgba(72,31,27,0.22),inset_12px_14px_28px_rgba(255,255,255,0.6)]" />
        <div className="absolute inset-[2.4rem] rounded-full border-[0.85rem] border-primary/35 shadow-[inset_0_0_0_2px_rgba(90,38,34,0.12)]" />
        <div className="absolute inset-[5.2rem] rounded-full border-[0.22rem] border-primary/45" />
        <div className="absolute inset-[7.3rem] rounded-full border-[0.12rem] border-primary/35" />
        <div className="absolute inset-[9.6rem] rounded-full bg-primary/15 shadow-[inset_8px_10px_22px_rgba(255,255,255,0.45),inset_-10px_-12px_20px_rgba(72,31,27,0.16)]" />
        <div className="absolute inset-[13.2rem] rounded-full border-[0.65rem] border-primary/35 bg-background/60 shadow-[inset_-7px_-8px_14px_rgba(72,31,27,0.12)]" />
        <div className="absolute left-[17.7rem] top-[5.7rem] -translate-x-1/2 rotate-[7deg] text-center font-display font-black leading-[0.8] tracking-[-0.06em] text-primary/60">
          <span className="text-[4.8rem]">20</span><br/><span className="text-[2.2rem] tracking-[-0.02em]">KG</span>
        </div>
        <div className="absolute inset-[1.15rem] rounded-full border border-white/30" />
        <div className="absolute inset-[3.7rem] rounded-full border border-white/25" />
      </div>

      <div className="relative z-10 mt-auto space-y-3">
        <Button asChild variant="primary" size="xl" className="w-full"><Link to="/create-account">Create account<ArrowRight /></Link></Button>
        <Button asChild variant="surface" size="xl" className="w-full"><Link to="/login">Log in</Link></Button>
      </div>
    </div>
  </OnboardingScreen>;
}
