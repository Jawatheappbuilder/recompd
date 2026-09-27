import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Child tables first so foreign keys never block deletion.
const USER_TABLES = [
  "workout_exercises",
  "workouts",
  "bodyweight_entries",
  "saved_workouts",
  "custom_exercises",
  "scheduled_workouts",
  "shared_workouts",
] as const;

/** Verifies a Supabase access token and returns its user id, or null when invalid. */
export async function verifyAccessToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || token.split(".").length !== 3) return null;
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");
  const client = createClient<Database>(url, key, {
    global: { headers: { apikey: key } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}

/** Permanently deletes every row owned by the user, their profile and their auth account. */
export async function deleteUserAccount(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (const table of USER_TABLES) {
    const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
  if (profileError) throw new Error(`profiles: ${profileError.message}`);
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) throw new Error(`auth: ${authError.message}`);
}
