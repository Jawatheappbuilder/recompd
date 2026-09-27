import { supabase } from "@/integrations/supabase/client";

// Stable URL of the Lovable-hosted app, where the backend's secure keys are available.
const LOVABLE_ORIGIN = "https://project--465a9460-5ace-5d8a-90ae-2e52ab14dc35.lovable.app";

function accountApiOrigin(): string {
  const { hostname, origin } = window.location;
  const lovableHosted = hostname === "localhost" || hostname.endsWith(".lovable.app") || hostname.endsWith(".lovableproject.com");
  return lovableHosted ? origin : LOVABLE_ORIGIN;
}

/** Asks the server to permanently delete the signed-in account. Throws on any failure. */
export async function requestAccountDeletion(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const response = await fetch(`${accountApiOrigin()}/api/public/account/delete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Account deletion failed (${response.status})`);
}
