import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { OnboardingScreen } from "@/components/recomp/onboarding-ui";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/recomp/auth-context";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — RECOMP'D" }, { name: "description", content: "Start your RECOMP'D strength training journey." }, { property: "og:title", content: "Welcome — RECOMP'D" }, { property: "og:description", content: "Train. Track. Progress." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WelcomePage,
});

function WelcomePage() {
  const { enterDemo } = useAuth();
  const navigate = useNavigate();
  const explore = async () => { await enterDemo(); void navigate({ to: "/" }); };
  return <OnboardingScreen centered><div className="flex flex-1 flex-col justify-center py-12"><div className="mb-auto" /><div><div className="font-display text-6xl font-black leading-none">RECOMP<span className="text-primary">'</span>D</div><p className="mt-4 text-lg font-semibold text-muted-foreground">Train. Track. Progress.</p><div className="mt-10 h-px w-16 bg-primary" /></div><div className="mt-auto space-y-3 pt-16"><Button asChild variant="primary" size="xl" className="w-full"><Link to="/create-account">Create account<ArrowRight /></Link></Button><Button asChild variant="surface" size="xl" className="w-full"><Link to="/login">Log in</Link></Button><Button variant="ghost" className="w-full text-primary" onClick={() => void explore()}>Explore RECOMP&apos;D<ArrowRight /></Button><p className="pt-1 text-center text-[0.68rem] text-muted-foreground">Preview 3 months of example training data. Nothing is saved to an account.</p></div></div></OnboardingScreen>;
}