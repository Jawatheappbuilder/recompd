import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/recomp/core";
import { CompactChoice, SettingsHeader, SettingsSection } from "@/components/recomp/settings-ui";
import { Button } from "@/components/ui/button";
import { useUserPreferences, type WeightUnit, type WeekStartsOn } from "@/lib/user-preferences";

export const Route = createFileRoute("/settings/training")({
  head: () => ({ meta: [{ title: "Training Preferences — RECOMP'D" }, { name: "description", content: "Set workout units, rest time, weekly target, and calendar preferences." }, { property: "og:title", content: "Training Preferences — RECOMP'D" }, { property: "og:description", content: "Set your RECOMP'D training defaults." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TrainingPage,
});
const rests = [30, 45, 60, 90, 120, 150, 180] as const; const targets = [2, 3, 4, 5, 6, 7] as const;
function TrainingPage() {
  const [preferences, setPreferences] = useUserPreferences();
  const update = <K extends keyof typeof preferences>(key: K, value: (typeof preferences)[K]) => setPreferences({ ...preferences, [key]: value });
  return <Screen><SettingsHeader title="Training" /><div className="space-y-4">
    <SettingsSection title="Units"><div className="py-3"><CompactChoice label="Weight units" value={preferences.weightUnit} options={["kg", "lb"] as const} onChange={(value: WeightUnit) => update("weightUnit", value)} /></div></SettingsSection>
    <SettingsSection title="Defaults"><div className="space-y-4 py-3"><div><div className="mb-2 text-xs font-bold text-muted-foreground">Default rest time</div><div className="grid grid-cols-4 gap-1.5">{rests.map((seconds) => <Button key={seconds} variant={preferences.defaultRestSeconds === seconds ? "choiceActive" : "choice"} className="h-10 px-1 text-xs" onClick={() => update("defaultRestSeconds", seconds)}>{seconds}s</Button>)}</div></div><div><div className="mb-2 text-xs font-bold text-muted-foreground">Weekly workout target</div><div className="grid grid-cols-6 gap-1">{targets.map((target) => <Button key={target} variant={preferences.weeklyWorkoutTarget === target ? "choiceActive" : "choice"} className="h-10 px-1" onClick={() => update("weeklyWorkoutTarget", target)}>{target}</Button>)}</div></div></div></SettingsSection>
    <SettingsSection title="Calendar"><div className="py-3"><CompactChoice label="Week starts on" value={preferences.weekStartsOn} options={["Monday", "Sunday"] as const} onChange={(value: WeekStartsOn) => update("weekStartsOn", value)} /></div></SettingsSection>
  </div></Screen>;
}
