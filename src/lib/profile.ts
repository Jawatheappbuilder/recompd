import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { defaultUserPreferences, type Gender, type TrainingGoal, type UserPreferences } from "./user-preferences";

type ProfileRow = Tables<"profiles">;

export function profileToPreferences(row: ProfileRow): UserPreferences {
  return {
    ...defaultUserPreferences,
    name: row.name,
    heightCm: row.height_cm,
    gender: (row.gender ?? "") as Gender,
    goals: (row.goals ?? []) as TrainingGoal[],
    weightUnit: row.weight_unit as UserPreferences["weightUnit"],
    defaultRestSeconds: row.default_rest_seconds as UserPreferences["defaultRestSeconds"],
    weeklyWorkoutTarget: row.weekly_workout_target as UserPreferences["weeklyWorkoutTarget"],
    weekStartsOn: row.week_starts_on as UserPreferences["weekStartsOn"],
    theme: row.theme as UserPreferences["theme"],
    onboardingComplete: row.onboarding_completed,
  };
}

export function preferencesToProfile(userId: string, p: UserPreferences): TablesInsert<"profiles"> {
  return {
    id: userId,
    name: p.name.trim().slice(0, 100),
    height_cm: p.heightCm ? Math.round(p.heightCm) : null,
    gender: p.gender || null,
    goals: p.goals,
    weight_unit: p.weightUnit,
    default_rest_seconds: p.defaultRestSeconds,
    weekly_workout_target: p.weeklyWorkoutTarget,
    week_starts_on: p.weekStartsOn,
    theme: p.theme,
    onboarding_completed: p.onboardingComplete,
  };
}

export async function fetchOrCreateProfile(userId: string, fallbackName: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data) return profileToPreferences(data);
  const { data: created, error: insertError } = await supabase.from("profiles").insert({ id: userId, name: fallbackName.slice(0, 100) }).select("*").single();
  if (insertError) throw insertError;
  return profileToPreferences(created);
}

export async function saveProfile(userId: string, preferences: UserPreferences) {
  const { error } = await supabase.from("profiles").upsert(preferencesToProfile(userId, preferences));
  if (error) throw error;
}

/** Maps auth errors to short, friendly messages. Never surfaces raw backend text. */
export function authErrorMessage(error: unknown): string {
  const e = error as { message?: string; code?: string; status?: number; name?: string } | null;
  const message = (e?.message ?? "").toLowerCase();
  const code = e?.code ?? "";
  if (e?.name === "AuthRetryableFetchError" || message.includes("fetch") || message.includes("network")) return "Can't connect right now. Check your connection and try again.";
  if (code === "invalid_credentials" || message.includes("invalid login")) return "Incorrect email or password.";
  if (code === "user_already_exists" || code === "email_exists" || message.includes("already registered")) return "An account with this email already exists.";
  if (code === "weak_password" || message.includes("password should")) return "Choose a stronger password.";
  if (code === "same_password") return "Choose a password you haven't used before.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || e?.status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (code === "email_address_invalid") return "Enter a valid email.";
  if (code === "session_not_found" || code === "otp_expired" || message.includes("expired")) return "This link has expired. Request a new one.";
  return "Something went wrong. Please try again.";
}
