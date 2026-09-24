import { Link, createFileRoute } from "@tanstack/react-router";
import { CircleUserRound, Cloud, Dumbbell, FileText, Info, Mail, Palette, RefreshCcw, Shield, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Screen } from "@/components/recomp/core";
import { SettingsHeader, SettingsLink, SettingsRow, SettingsSection } from "@/components/recomp/settings-ui";
import { useUserPreferences } from "@/lib/user-preferences";
import { useAuth } from "@/components/recomp/auth-context";

export const Route = createFileRoute("/settings/")({
  head: () => ({ meta: [{ title: "Settings — RECOMP'D" }, { name: "description", content: "Profile, training, exercise, appearance, and account preferences for RECOMP'D." }, { property: "og:title", content: "Settings — RECOMP'D" }, { property: "og:description", content: "Manage your RECOMP'D preferences." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [preferences, setPreferences] = useUserPreferences();
  const navigate = useNavigate(); const { user } = useAuth();
  const theme = preferences.theme === "system" ? "System" : preferences.theme === "dark" ? "Dark" : "Light";
  return <Screen><SettingsHeader title="Settings" /><div className="space-y-5">
    <SettingsSection title="Profile"><SettingsLink to="/settings/profile" icon={CircleUserRound} label={preferences.name || "Profile"} value={preferences.heightCm ? `${preferences.heightCm} cm` : "Edit profile"} /></SettingsSection>
    <SettingsSection title="Training"><SettingsLink to="/settings/training" icon={SlidersHorizontal} label="Training preferences" value={`${preferences.weightUnit} · ${preferences.defaultRestSeconds}s`} /></SettingsSection>
    <SettingsSection title="Exercises"><SettingsLink to="/settings/exercises" icon={Dumbbell} label="Manage custom exercises" /></SettingsSection>
    <SettingsSection title="Appearance"><SettingsLink to="/settings/appearance" icon={Palette} label="Theme" value={theme} /></SettingsSection>
    <SettingsSection title="Account"><SettingsLink to="/settings/account" icon={CircleUserRound} label="Account" value={user?.email ?? "Account"} /></SettingsSection>
    <SettingsSection title="Data"><SettingsRow icon={Cloud} label="Export data" value="Coming later" disabled /></SettingsSection>
    <SettingsSection title="Preview"><SettingsRow icon={RefreshCcw} label="Restart onboarding" onClick={() => { setPreferences({ ...preferences, onboardingComplete: false }); void navigate({ to: "/welcome" }); }} /></SettingsSection>
    <SettingsSection title="About & support">
      <SettingsRow icon={Info} label="About RECOMP'D" value="Version 0.1.0" />
      <SettingsRow icon={Shield} label="Privacy Policy" value="Coming later" disabled />
      <SettingsRow icon={FileText} label="Terms" value="Coming later" disabled />
      <SettingsRow icon={Mail} label="Contact / Support" value="Coming later" disabled />
    </SettingsSection>
    <p className="px-1 text-center text-[0.65rem] text-muted-foreground">RECOMP'D · Built for better training</p>
  </div></Screen>;
}
