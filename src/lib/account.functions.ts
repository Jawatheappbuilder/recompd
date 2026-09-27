import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

/** Permanently deletes the signed-in user's data and auth account. Identity comes only from the verified token. */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      for (const table of USER_TABLES) {
        const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
        if (error) throw new Error(`${table}: ${error.message}`);
      }
      const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
      if (profileError) throw new Error(`profiles: ${profileError.message}`);
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) throw new Error(`auth: ${authError.message}`);
    } catch (err) {
      console.error("delete-account failed", err);
      throw new Error("Account deletion failed. Please try again.");
    }
    return { success: true as const };
  });
