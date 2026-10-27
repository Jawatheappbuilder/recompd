import { createFileRoute } from "@tanstack/react-router";
import { PbCelebrationPreview } from "@/components/recomp/active-workout";

export const Route = createFileRoute("/pb-preview")({
  head: () => ({ meta: [{ title: "PB Celebration Preview — RECOMP'D" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PbCelebrationPreview,
});
