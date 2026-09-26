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
    <div className="relative flex flex-1 flex-col overflow-hidden py-10">
      <div className="relative z-10 pt-[12vh] text-center">
        <div className="font-display text-[3.6rem] font-black leading-none tracking-[-0.045em] text-foreground">RECOMP<span className="text-primary">'</span>D</div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.32em] text-foreground/70">Build. Track. Recomp.</p>
      </div>

      <div aria-hidden className="pointer-events-none absolute -bottom-[5rem] -left-[9rem] size-[30rem] rounded-full border-[4.8rem] border-primary/[0.07]">
        <div className="absolute inset-[4.2rem] rounded-full border-[1.2rem] border-primary/[0.055]" />
        <div className="absolute inset-[8rem] grid place-items-center rounded-full border-[0.7rem] border-primary/[0.05] font-display text-5xl font-black text-primary/[0.07]">20<br/><span className="text-2xl">KG</span></div>
      </div>

      <div className="relative z-10 mt-auto space-y-3 pt-16">
        <Button asChild variant="primary" size="xl" className="w-full"><Link to="/create-account">Create account<ArrowRight /></Link></Button>
        <Button asChild variant="surface" size="xl" className="w-full"><Link to="/login">Log in</Link></Button>
      </div>
    </div>
  </OnboardingScreen>;
}
