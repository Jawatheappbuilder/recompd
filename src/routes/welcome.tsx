import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { OnboardingScreen } from "@/components/recomp/onboarding-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — RECOMP'D" }, { name: "description", content: "Start your RECOMP'D strength training journey." }, { property: "og:title", content: "Welcome — RECOMP'D" }, { property: "og:description", content: "Train. Track. Progress." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WelcomePage,
});

function WelcomePage() {
  return <OnboardingScreen centered><div className="flex flex-1 flex-col justify-center py-12"><div className="mb-auto" /><div><div className="font-display text-6xl font-black leading-none">RECOMP<span className="text-primary">'</span>D</div><p className="mt-4 text-lg font-semibold text-muted-foreground">Train. Track. Progress.</p><div className="mt-10 h-px w-16 bg-primary" /></div><div className="mt-auto space-y-3 pt-16"><Button asChild variant="primary" size="xl" className="w-full"><Link to="/create-account">Create account<ArrowRight /></Link></Button><Button asChild variant="surface" size="xl" className="w-full"><Link to="/login">Log in</Link></Button><p className="pt-2 text-center text-[0.68rem] text-muted-foreground">Your profile is saved securely to your account.</p></div></div></OnboardingScreen>;
}