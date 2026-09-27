import { createServerFn } from "@tanstack/react-start";

const USER_TABLES = [
  "workout_exercises",
  "workouts",
  "bodyweight_entries",
  "saved_workouts",
  "custom_exercises",
  "scheduled_workouts",
  "shared_workouts",
] as const;

type DeleteAccountInput = { accessToken: string };

/** Permanently deletes the authenticated user's data and auth account. */
export const deleteAccount = createServerFn({ method: "POST" })
  .inputValidator((data: DeleteAccountInput) => {
    if (!data?.accessToken || typeof data.accessToken !== "string") {
      throw new Error("Authentication required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify the token on the server and derive identity from it. Never trust a client user ID.
    const { data: authData, error: authCheckError } = await supabaseAdmin.auth.getUser(data.accessToken);
    if (authCheckError || !authData.user?.id) {
      throw new Error("Authentication required");
    }
    const userId = authData.user.id;

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
