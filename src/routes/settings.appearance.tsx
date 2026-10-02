import { createFileRoute } from "@tanstack/react-router";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import { Screen } from "@/components/recomp/core";
import { SettingsHeader, SettingsSection } from "@/components/recomp/settings-ui";
import { Button } from "@/components/ui/button";
import { useUserPreferences } from "@/lib/user-preferences";
import { useAuth } from "@/components/recomp/auth-context";

export const Route = createFileRoute("/settings/appearance")({
  head: () => ({ meta: [{ title: "Appearance — RECOMP'D" }, { name: "description", content: "Choose how RECOMP'D looks on your device." }, { property: "og:title", content: "Appearance — RECOMP'D" }, { property: "og:description", content: "Choose your RECOMP'D appearance." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AppearancePage,
});
function AppearancePage() {
  const [preferences, setPreferences] = useUserPreferences();
  const { user } = useAuth();
  const hasPrivateAccents = user?.id === "0fac7a7b-5bec-4614-adbd-5d69c8f1f97b" || user?.id === "e791fd9b-67cf-41c1-9cad-de60e0753e8b";
  const privateAccents = hasPrivateAccents ? [{ id: "pink" as const, label: "Pink", swatch: "oklch(0.68 0.19 350)" }, { id: "purple" as const, label: "Purple", swatch: "oklch(0.62 0.20 295)" }] : [];
  const choices = [{ id: "system" as const, label: "System", icon: Laptop }, { id: "dark" as const, label: "Dark", icon: Moon }, { id: "light" as const, label: "Light", icon: Sun }];
  const accents = [{ id: "red" as const, label: "RECOMP'D Red", swatch: "oklch(0.625 0.145 24)" }, { id: "blue" as const, label: "Blue", swatch: "oklch(0.60 0.155 252)" }, { id: "black" as const, label: "Black", swatch: "oklch(0.20 0.01 40)" }];
  return <Screen><SettingsHeader title="Appearance" /><div className="space-y-5"><SettingsSection title="Theme">{choices.map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" className="h-14 w-full justify-start rounded-none px-0 hover:bg-transparent" onClick={() => setPreferences({ ...preferences, theme: id })}><span className="grid size-8 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon className="size-4" /></span><span className="flex-1 text-left text-sm font-bold">{label}</span>{preferences.theme === id ? <Check className="size-4 text-primary" /> : null}</Button>)}</SettingsSection><SettingsSection title="Accent colour">{accents.map(({ id, label, swatch }) => <Button key={id} variant="ghost" className="h-14 w-full justify-start rounded-none px-0 hover:bg-transparent" onClick={() => setPreferences({ ...preferences, accent: id })}><span className="size-8 rounded-full border border-black/10 shadow-sm" style={{ background: swatch }} /><span className="flex-1 text-left text-sm font-bold">{label}</span>{preferences.accent === id ? <Check className="size-4 text-primary" /> : null}</Button>)}</SettingsSection></div></Screen>;
}
