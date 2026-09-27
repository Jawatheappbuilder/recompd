import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { OnboardingScreen } from "@/components/recomp/onboarding-ui";
import { Button } from "@/components/ui/button";

const PLATE_IMAGE = "data:image/webp;base64,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";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — RECOMP'D" }, { name: "description", content: "Start your RECOMP'D strength training journey." }, { property: "og:title", content: "Welcome — RECOMP'D" }, { property: "og:description", content: "Build. Track. Recomp." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WelcomePage,
});

function WelcomePage() {
  return <OnboardingScreen centered>
    <div className="relative flex flex-1 flex-col overflow-hidden pb-7 pt-10">
      <div className="relative z-10 pt-[11vh] text-center">
        <div className="font-display text-6xl font-black leading-none text-foreground">RECOMP<span className="text-primary">'</span>D</div>
        <p className="mt-4 text-[0.72rem] font-bold uppercase tracking-[0.34em] text-foreground/70">Build. Track. Recomp.</p>
      </div>

      <img src={PLATE_IMAGE} alt="" aria-hidden className="pointer-events-none absolute -bottom-2 -left-24 h-[68%] w-[125%] max-w-none object-cover object-left-top opacity-80 mix-blend-multiply" />

      <div className="relative z-10 mt-auto space-y-3">
        <Button asChild variant="primary" size="xl" className="w-full"><Link to="/create-account">Create account<ArrowRight /></Link></Button>
        <Button asChild variant="surface" size="xl" className="w-full"><Link to="/login">Log in</Link></Button>
      </div>
    </div>
  </OnboardingScreen>;
}
