import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/recomp/core";
import { SettingsHeader } from "@/components/recomp/settings-ui";

export const Route = createFileRoute("/privacy")({ head: () => ({ meta: [{ title: "Privacy Policy — RECOMP'D" }] }), component: PrivacyPage });

function PrivacyPage() {
  return <Screen><SettingsHeader title="Privacy Policy" /><article className="space-y-5 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed">
    <p className="text-xs text-muted-foreground">Effective 26 September 2026</p>
    <section><h2 className="mb-2 text-base font-extrabold">What RECOMP'D stores</h2><p>When you create an account, RECOMP'D stores your account details and the information you choose to add to the app. This can include profile and training preferences, workouts, exercises, scheduled and saved workouts, body-weight entries, and related training records.</p></section>
    <section><h2 className="mb-2 text-base font-extrabold">How we use your information</h2><p>Your information is used to provide account sync, workout tracking, progress features, scheduling, and other functionality you request. We do not sell your personal information.</p></section>
    <section><h2 className="mb-2 text-base font-extrabold">Storage and service providers</h2><p>RECOMP'D uses cloud infrastructure and hosting providers to operate the app and store account-backed data. Information may be processed by those providers as needed to deliver the service.</p></section>
    <section><h2 className="mb-2 text-base font-extrabold">Your choices</h2><p>You can change information in the app and sign out at any time. Account deletion is being prepared before public store launch and will remove the account and associated app data once implemented.</p></section>
    <section><h2 className="mb-2 text-base font-extrabold">Security and retention</h2><p>We take reasonable steps to protect account information. Data is retained while needed to provide your account and service, subject to operational, legal, and security requirements.</p></section>
    <section><h2 className="mb-2 text-base font-extrabold">Contact</h2><p>Privacy and support contact details will be published here before the public app-store release.</p></section>
  </article></Screen>;
}
