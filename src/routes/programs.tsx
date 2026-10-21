import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { Screen } from "@/components/recomp/core";
import { ProgramsMode } from "@/components/recomp/programs-mode";
import { ActiveProgramHome } from "@/components/recomp/active-program-home";

const searchSchema = z.object({ programId: z.string().optional(), view: fallback(z.string(), "all").default("all") });
export const Route = createFileRoute("/programs")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [
    { title: "Programs — RECOMP'D" },
    { name: "description", content: "Find, create and follow structured training programs." },
  ] }),
  component: ProgramsPage,
});
function ProgramsPage() {
  const { programId } = Route.useSearch();
  return <Screen>
    <header className="relative -mx-4 -mt-[calc(1rem+env(safe-area-inset-top))] overflow-hidden bg-primary px-4 pb-7 pt-[calc(1rem+env(safe-area-inset-top))] text-primary-foreground">
      <div aria-hidden className="pointer-events-none absolute -right-12 top-0 size-44 rounded-full bg-white/[0.09] blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="wordmark text-primary-foreground">RECOMP'D</div>
        <Link to="/settings" aria-label="Settings" className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/10"><Settings className="size-5"/></Link>
      </div>
      <p className="relative mt-5 text-xs font-bold uppercase tracking-widest text-primary-foreground/75">Train with purpose</p>
      <h1 className="relative mt-1 text-[1.8rem] font-black">Programs</h1>
      <p className="relative mt-1 text-xs text-primary-foreground/85">Your plan, your progress, your next session.</p>
    </header>
    <div className="space-y-5 pt-4">
      {!programId && <ActiveProgramHome />}
      <ProgramsMode focusProgramId={programId} />
    </div>
  </Screen>;
}
