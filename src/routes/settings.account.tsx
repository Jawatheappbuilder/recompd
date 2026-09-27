import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Cloud, KeyRound, LogOut, Mail, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/recomp/auth-context";
import { Screen } from "@/components/recomp/core";
import { SettingsHeader, SettingsRow, SettingsSection } from "@/components/recomp/settings-ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { clearCloudData } from "@/lib/cloud-data";
import { clearUserPreferences, setPreferencesCloudUser } from "@/lib/user-preferences";

export const Route = createFileRoute("/settings/account")({
  head: () => ({ meta: [{ title: "Account — RECOMP'D" }, { name: "description", content: "Account and sync status for RECOMP'D." }, { property: "og:title", content: "Account — RECOMP'D" }, { property: "og:description", content: "View your RECOMP'D account status." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AccountPage,
});
function AccountPage() {
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user, signOut } = useAuth(); const navigate = useNavigate();
  const handleSignOut = async () => {
    setSigningOut(true);
    try { await signOut(); void navigate({ to: "/welcome", replace: true }); } catch { toast.error("Couldn't sign out. Please try again."); } finally { setSigningOut(false); }
  };
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      await supabase.auth.signOut({ scope: "local" });
      setPreferencesCloudUser(null);
      clearUserPreferences();
      clearCloudData();
      localStorage.removeItem("recomp-active-workout-v1");
      localStorage.removeItem("recomp-last-workout");
      localStorage.removeItem("recomp-pending-demo-import-v1");
      toast.success("Your account has been deleted.");
      void navigate({ to: "/welcome", replace: true });
    } catch {
      toast.error("Couldn't delete your account. Please try again.");
      setDeleting(false);
    }
  };
  return <Screen><SettingsHeader title="Account" /><div className="space-y-5">
    <SettingsSection title="Account"><SettingsRow icon={Mail} label="Email" value={user?.email ?? "—"} /><SettingsRow icon={KeyRound} label="Change password" value="Coming later" disabled /><SettingsRow icon={Cloud} label="Profile sync" value="Saved to account" /></SettingsSection>
    <SettingsSection title="Session"><SettingsRow icon={LogOut} label={signingOut ? "Signing out…" : "Sign out"} onClick={() => void handleSignOut()} /></SettingsSection>
    <section className="space-y-2 pt-2"><h2 className="px-1 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-destructive">Danger zone</h2><Button variant="surface" className="h-12 w-full justify-start border-destructive/40 text-destructive" disabled={deleting} onClick={() => setConfirming(true)}><Trash2 />{deleting ? "Deleting account…" : "Delete account"}</Button><p className="px-1 text-[0.68rem] leading-relaxed text-muted-foreground">Permanently deletes your RECOMP\'D account and cloud training data.</p></section>
    <AlertDialog open={confirming} onOpenChange={setConfirming}><AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl bg-popover"><AlertDialogHeader><AlertDialogTitle>Delete account?</AlertDialogTitle><AlertDialogDescription>This permanently deletes your account, profile, workouts, bodyweight history, saved and scheduled workouts, custom exercises, and shared workout links. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" disabled={deleting} onClick={(event) => { event.preventDefault(); void handleDeleteAccount(); }}>{deleting ? "Deleting…" : "Delete permanently"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div></Screen>;
}
