import { createFileRoute } from "@tanstack/react-router";
import { Header, Screen } from "@/components/recomp/core";
import { ProgressOverview } from "@/components/recomp/progress-overview";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [
    { title: "Progress — RECOMP'D" }, { name: "description", content: "Review training priorities, records, bodyweight, and workout history." },
    { property: "og:title", content: "Progress — RECOMP'D" }, { property: "og:description", content: "Review your strength training progress and recent records." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: ProgressPage,
});
function ProgressPage() { return <Screen><Header title="Progress"/><ProgressOverview/></Screen>; }