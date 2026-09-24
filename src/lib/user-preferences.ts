import { useCallback, useEffect, useState } from "react";

export type Gender = "Male" | "Female" | "Prefer not to say" | "";
export type WeightUnit = "kg" | "lb";
export type WeekStartsOn = "Monday" | "Sunday";
export type ThemePreference = "system" | "dark" | "light";
export type TrainingGoal = "Build muscle" | "Get stronger" | "Lose fat" | "Improve fitness" | "General health";

export type UserPreferences = {
  version: 1;
  name: string;
  heightCm: number | null;
  gender: Gender;
  weightUnit: WeightUnit;
  defaultRestSeconds: 30 | 45 | 60 | 90 | 120 | 150 | 180;
  weeklyWorkoutTarget: 2 | 3 | 4 | 5 | 6 | 7;
  weekStartsOn: WeekStartsOn;
  theme: ThemePreference;
  goals: TrainingGoal[];
  onboardingComplete: boolean;
};

const PREFERENCES_KEY = "recomp-user-preferences-v1";

export const defaultUserPreferences: UserPreferences = {
  version: 1,
  name: "Ashley",
  heightCm: null,
  gender: "Prefer not to say",
  weightUnit: "kg",
  defaultRestSeconds: 90,
  weeklyWorkoutTarget: 4,
  weekStartsOn: "Monday",
  theme: "system",
  goals: [],
  onboardingComplete: false,
};

export function hasStoredUserPreferences() {
  return typeof window !== "undefined" && localStorage.getItem(PREFERENCES_KEY) !== null;
}

export function loadUserPreferences(): UserPreferences {
  if (typeof window === "undefined") return defaultUserPreferences;
  try {
    const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "null") as (Partial<UserPreferences> & { gender?: string }) | null;
    if (!stored) return defaultUserPreferences;
    const gender = stored.gender === "Man" ? "Male" : stored.gender === "Woman" ? "Female" : stored.gender === "Non-binary" ? "Prefer not to say" : stored.gender;
    return { ...defaultUserPreferences, ...stored, gender: (gender ?? "") as Gender, onboardingComplete: stored.onboardingComplete ?? true, version: 1 };
  } catch {
    return defaultUserPreferences;
  }
}

export function saveUserPreferences(preferences: UserPreferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent("recomp-preferences-changed", { detail: preferences }));
}

export function useUserPreferences() {
  const [preferences, setPreferencesState] = useState<UserPreferences>(defaultUserPreferences);
  useEffect(() => {
    setPreferencesState(loadUserPreferences());
    const sync = () => setPreferencesState(loadUserPreferences());
    window.addEventListener("recomp-preferences-changed", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("recomp-preferences-changed", sync); window.removeEventListener("storage", sync); };
  }, []);
  const setPreferences = useCallback((next: UserPreferences | ((current: UserPreferences) => UserPreferences)) => {
    setPreferencesState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      saveUserPreferences(resolved);
      return resolved;
    });
  }, []);
  return [preferences, setPreferences] as const;
}
