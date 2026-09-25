import { useCallback, useEffect, useState } from "react";

export type Gender = "Male" | "Female" | "Prefer not to say" | "";
export type WeightUnit = "kg" | "lb";
export type WeekStartsOn = "Monday" | "Sunday";
export type ThemePreference = "system" | "dark" | "light";
export type TrainingGoal = "Build muscle" | "Get stronger" | "Lose fat" | "Improve fitness" | "General health";
export type DefaultRepRange = "4–6" | "8–12";

export function trainingDefaultsForGoals(goals: TrainingGoal[]): { defaultRepRange: DefaultRepRange; defaultRestSeconds: UserPreferences["defaultRestSeconds"] } {
  if (goals.includes("Get stronger")) return { defaultRepRange: "4–6", defaultRestSeconds: 180 };
  if (goals.includes("Build muscle")) return { defaultRepRange: "8–12", defaultRestSeconds: 120 };
  return { defaultRepRange: "8–12", defaultRestSeconds: 90 };
}

export type UserPreferences = {
  version: 1;
  name: string;
  heightCm: number | null;
  gender: Gender;
  weightUnit: WeightUnit;
  defaultRestSeconds: 30 | 45 | 60 | 90 | 120 | 150 | 180;
  defaultRepRange: DefaultRepRange;
  weeklyWorkoutTarget: 2 | 3 | 4 | 5 | 6 | 7;
  weekStartsOn: WeekStartsOn;
  theme: ThemePreference;
  goals: TrainingGoal[];
  onboardingComplete: boolean;
};

const PREFERENCES_KEY = "recomp-user-preferences-v1";

export function applyThemePreference(theme: ThemePreference) {
  if (typeof document === "undefined") return;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light", !dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export const defaultUserPreferences: UserPreferences = {
  version: 1,
  name: "Ashley",
  heightCm: null,
  gender: "Prefer not to say",
  weightUnit: "kg",
  defaultRestSeconds: 90,
  defaultRepRange: "8–12",
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
    const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "null") as (Omit<Partial<UserPreferences>, "gender"> & { gender?: string }) | null;
    if (!stored) return defaultUserPreferences;
    const gender = stored.gender === "Man" ? "Male" : stored.gender === "Woman" ? "Female" : stored.gender === "Non-binary" ? "Prefer not to say" : stored.gender;
    return { ...defaultUserPreferences, ...stored, gender: (gender ?? "") as Gender, onboardingComplete: stored.onboardingComplete ?? true, version: 1 };
  } catch {
    return defaultUserPreferences;
  }
}

export function saveUserPreferences(preferences: UserPreferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  applyThemePreference(preferences.theme);
  window.dispatchEvent(new CustomEvent("recomp-preferences-changed", { detail: preferences }));
}

export function clearUserPreferences() {
  localStorage.removeItem(PREFERENCES_KEY);
  applyThemePreference(defaultUserPreferences.theme);
  window.dispatchEvent(new CustomEvent("recomp-preferences-changed", { detail: defaultUserPreferences }));
}

// The signed-in account whose cloud profile is the source of truth. Local storage acts as a cache.
let cloudUserId: string | null = null;
export function setPreferencesCloudUser(userId: string | null) { cloudUserId = userId; }

let pendingSync: ReturnType<typeof setTimeout> | undefined;
function syncToCloud(preferences: UserPreferences) {
  const userId = cloudUserId;
  if (!userId) return;
  clearTimeout(pendingSync);
  pendingSync = setTimeout(() => {
    void Promise.all([import("./profile"), import("sonner")]).then(async ([{ saveProfile }, { toast }]) => {
      try { await saveProfile(userId, preferences); } catch { toast.error("Couldn't save your changes. Check your connection and try again."); }
    });
  }, 300);
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
      syncToCloud(resolved);
      return resolved;
    });
  }, []);
  return [preferences, setPreferences] as const;
}
