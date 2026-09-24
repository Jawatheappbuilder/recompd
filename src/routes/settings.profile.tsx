import { createFileRoute } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { Screen } from "@/components/recomp/core";
import { CompactChoice, SettingsHeader, SettingsSection } from "@/components/recomp/settings-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Gender, useUserPreferences } from "@/lib/user-preferences";

export const Route = createFileRoute("/settings/profile")({
  head: () => ({ meta: [{ title: "Edit Profile — RECOMP'D" }, { name: "description", content: "Edit your RECOMP'D profile details." }, { property: "og:title", content: "Edit Profile — RECOMP'D" }, { property: "og:description", content: "Edit your RECOMP'D profile details." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ProfilePage,
});

const genders: Gender[] = ["Woman", "Man", "Non-binary", "Prefer not to say"];
function ProfilePage() {
  const [preferences, setPreferences] = useUserPreferences();
  const [name, setName] = useState(""); const [height, setHeight] = useState(""); const [gender, setGender] = useState<Gender>("");
  useEffect(() => { setName(preferences.name); setHeight(preferences.heightCm ? String(preferences.heightCm) : ""); setGender(preferences.gender); }, [preferences]);
  const save = () => setPreferences({ ...preferences, name: name.trim(), heightCm: height ? Math.max(80, Math.min(250, Number(height))) : null, gender });
  return <Screen><SettingsHeader title="Edit Profile" /><div className="space-y-4">
    <div className="flex justify-center"><div className="relative grid size-20 place-items-center rounded-full border border-border bg-elevated font-display text-3xl font-extrabold text-primary">{name.trim().charAt(0).toUpperCase() || "R"}<span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border border-border bg-secondary text-muted-foreground"><Camera className="size-4" /></span></div></div>
    <SettingsSection title="Details"><div className="space-y-4 py-4"><label className="block text-xs font-bold text-muted-foreground">Name<Input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 rounded-xl bg-secondary text-foreground" /></label><label className="block text-xs font-bold text-muted-foreground">Height (cm)<Input type="number" inputMode="numeric" min="80" max="250" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="Not set" className="mt-2 h-11 rounded-xl bg-secondary text-foreground" /></label><CompactChoice label="Gender" value={gender || "Prefer not to say"} options={genders} onChange={setGender} /></div></SettingsSection>
    <Button variant="primary" size="lg" className="w-full" onClick={save}>Save profile</Button>
  </div></Screen>;
}
