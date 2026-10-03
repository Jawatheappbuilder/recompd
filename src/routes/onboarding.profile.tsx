import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/recomp/auth-context";
import { useOnboardingDraft } from "@/components/recomp/onboarding-context";
import { FormField, FormMessage, OnboardingHeader, OnboardingScreen } from "@/components/recomp/onboarding-ui";
import { Button } from "@/components/ui/button";
import { cleanUsername, setUsername, usernameAvailable } from "@/lib/social";
import { loadUserPreferences, trainingDefaultsForGoals } from "@/lib/user-preferences";

export const Route = createFileRoute("/onboarding/profile")({ component: ProfileSetupPage });

function ProfileSetupPage() {
  const { draft, updateDraft } = useOnboardingDraft();
  const { user, commitPreferences } = useAuth();
  const navigate = useNavigate();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const clean = cleanUsername(draft.username);
    if (clean.length < 3) { setAvailable(null); return; }
    const timer = window.setTimeout(() => {
      setChecking(true);
      void usernameAvailable(clean, user.id).then(setAvailable).catch(() => setAvailable(false)).finally(() => setChecking(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft.username, user]);

  async function finish() {
    if (!user || !available) return;
    const height = Number(draft.height);
    setSaving(true); setError("");
    try {
      await setUsername(user.id, draft.username, draft.leaderboardEnabled);
      const current = loadUserPreferences();
      await commitPreferences({ ...current, name: draft.name.trim() || current.name, heightCm: Math.round(height), gender: draft.gender, weeklyWorkoutTarget: draft.weeklyWorkoutTarget, weightUnit: draft.weightUnit, goals: draft.goals, ...trainingDefaultsForGoals(draft.goals), onboardingComplete: true });
      updateDraft({ password: "", confirmPassword: "" });
      void navigate({ to: "/", replace: true });
    } catch { setError("Couldn't finish your setup. Check your connection and try again."); }
    finally { setSaving(false); }
  }

  const clean = cleanUsername(draft.username);
  return <OnboardingScreen>
    <OnboardingHeader title="Your RECOMP'D profile" subtitle="Choose how friends can find you. Your username is unique and can be changed later." backTo="/onboarding/about" progress={3} />
    <div className="flex flex-1 flex-col">
      <div className="space-y-5">
        {error && <FormMessage>{error}</FormMessage>}
        <FormField label="Username" value={draft.username} onChange={(e) => updateDraft({ username: cleanUsername(e.target.value) })} placeholder="yourusername" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <div className="min-h-5 text-xs font-semibold">{checking ? <span className="text-muted-foreground">Checking username…</span> : clean.length > 0 && clean.length < 3 ? <span className="text-muted-foreground">Use at least 3 characters.</span> : available === true ? <span className="text-emerald-600">@{clean} is available</span> : available === false ? <span className="text-destructive">That username is already taken.</span> : null}</div>
        <button type="button" role="switch" aria-checked={draft.leaderboardEnabled} onClick={() => updateDraft({ leaderboardEnabled: !draft.leaderboardEnabled })} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-secondary/50 p-4 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Trophy className="size-5"/></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">Friends leaderboard</span><span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">Show your monthly workout count to accepted friends. Workout details stay private.</span></span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${draft.leaderboardEnabled ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition-all ${draft.leaderboardEnabled ? "left-6" : "left-1"}`}/></span>
        </button>
      </div>
      <Button variant="primary" size="xl" className="mt-auto w-full" disabled={!available || saving} onClick={() => void finish()}>{saving ? "Finishing…" : "Start training"}</Button>
    </div>
  </OnboardingScreen>;
}
