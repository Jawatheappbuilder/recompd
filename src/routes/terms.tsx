import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/recomp/core";
import { SettingsHeader } from "@/components/recomp/settings-ui";

export const Route = createFileRoute("/terms")({ head: () => ({ meta: [{ title: "Terms — RECOMP'D" }] }), component: TermsPage });

function TermsPage() {
  return <Screen><SettingsHeader title="Terms & Fitness Disclaimer" /><article className="space-y-5 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed">
    <p className="text-xs text-muted-foreground">Effective 26 September 2026</p>
    <section><h2 className="mb-2 text-base font-extrabold">Using RECOMP'D</h2><p>RECOMP'D is a workout planning and tracking tool. You are responsible for the information you enter, your account security, and how you use the app.</p></section>
    <section><h2 className="mb-2 text-base font-extrabold">Fitness disclaimer</h2><p>RECOMP'D provides general fitness and training information, not medical advice, diagnosis, or treatment. Exercise carries risk. Choose exercises, loads, intensity, and training volume appropriate for you and seek qualified medical or fitness advice when needed.</p></section>
    <section><h2 className="mb-2 text-base font-extrabold">Availability and changes</h2><p>Features may change as RECOMP'D develops. We aim to keep the service available and reliable but cannot guarantee uninterrupted or error-free operation.</p></section>
    <section><h2 className="mb-2 text-base font-extrabold">Your data</h2><p>Your use of personal information is described in the RECOMP'D Privacy Policy. Do not use the service to upload information you do not have the right to use.</p></section>
  </article></Screen>;
}
