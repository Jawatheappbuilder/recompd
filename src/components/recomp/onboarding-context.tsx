import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { loadUserPreferences, type Gender, type TrainingGoal, type WeightUnit } from "@/lib/user-preferences";

type AccountDraft = { name: string; email: string; password: string; confirmPassword: string };
type OnboardingDraft = AccountDraft & { height: string; gender: Gender; weeklyWorkoutTarget: 2 | 3 | 4 | 5 | 6 | 7; weightUnit: WeightUnit; goals: TrainingGoal[] };
type OnboardingContextValue = { draft: OnboardingDraft; updateDraft: (patch: Partial<OnboardingDraft>) => void };

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    const preferences = loadUserPreferences();
    return { name: preferences.onboardingComplete ? "" : preferences.name === "Ashley" ? "" : preferences.name, email: "", password: "", confirmPassword: "", height: preferences.heightCm ? String(preferences.heightCm) : "", gender: preferences.gender, weeklyWorkoutTarget: preferences.weeklyWorkoutTarget, weightUnit: preferences.weightUnit, goals: preferences.goals };
  });
  const value = useMemo(() => ({ draft, updateDraft: (patch: Partial<OnboardingDraft>) => setDraft((current) => ({ ...current, ...patch })) }), [draft]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboardingDraft() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useOnboardingDraft must be used inside OnboardingProvider");
  return context;
}