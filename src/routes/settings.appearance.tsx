import { createFileRoute } from "@tanstack/react-router";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import { Screen } from "@/components/recomp/core";
import { SettingsHeader, SettingsSection } from "@/components/recomp/settings-ui";
import { Button } from "@/components/ui/button";
import { useUserPreferences } from "@/lib/user-preferences";

export const Route = createFileRoute("/settings/appearance")({
  head: () => ({ meta: [{ title: "Appearance — RECOMP'D" }, { name: "description", content: "Choose how RECOMP'D looks on your device." }, { property: "og:title", content: "Appearance — RECOMP'D" }, { property: "og:description", content: "Choose your RECOMP'D appearance." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AppearancePage,
});
function AppearancePage() {
  const [preferences, setPreferences] = useUserPreferences();
  const choices = [{ id: "system" as const, label: "System", icon: Laptop }, { id: "dark" as const, label: "Dark", icon: Moon }, { id: "light" as const, label: "Light", icon: Sun, disabled: true }];
  return <Screen><SettingsHeader title="Appearance" /><SettingsSection title="Theme">{choices.map(({ id, label, icon: Icon, disabled }) => <Button key={id} variant="ghost" disabled={disabled} className="h-14 w-full justify-start rounded-none px-0 hover:bg-transparent" onClick={() => setPreferences({ ...preferences, theme: id })}><span className="grid size-8 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon className="size-4" /></span><span className="flex-1 text-left text-sm font-bold">{label}</span>{disabled ? <span className="text-xs text-muted-foreground">Coming later</span> : preferences.theme === id ? <Check className="size-4 text-primary" /> : null}</Button>)}</SettingsSection></Screen>;
}
