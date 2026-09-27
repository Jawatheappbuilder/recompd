import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthFooter, FormField, FormMessage, OnboardingHeader, OnboardingScreen } from "@/components/recomp/onboarding-ui";
import { useOnboardingDraft } from "@/components/recomp/onboarding-context";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/profile";
import { useAuth } from "@/components/recomp/auth-context";
import { clearStagedDemoImport, stageDemoImport } from "@/lib/cloud-data";

export const Route = createFileRoute("/create-account")({
  head: () => ({ meta: [{ title: "Create Account — RECOMP'D" }, { name: "description", content: "Create your RECOMP'D account profile." }, { property: "og:title", content: "Create Account — RECOMP'D" }, { property: "og:description", content: "Create your RECOMP'D account profile." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: CreateAccountPage,
});

function CreateAccountPage() {
  type AccountErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;
  const { draft, updateDraft } = useOnboardingDraft(); const navigate = useNavigate(); const { status } = useAuth(); const [demoChoice, setDemoChoice] = useState<"fresh" | "keep" | null>(status === "demo" ? null : "fresh"); const [errors, setErrors] = useState<AccountErrors>({});
  const [formError, setFormError] = useState(""); const [submitting, setSubmitting] = useState(false);
  if (status === "demo" && demoChoice === null) return <OnboardingScreen><OnboardingHeader title="Create your account" subtitle="How would you like to start?" backTo="/welcome" /><div className="flex flex-1 flex-col gap-3 pt-4"><button type="button" onClick={() => { clearStagedDemoImport(); setDemoChoice("fresh"); }} className="rounded-2xl border border-primary bg-primary/10 p-5 text-left"><div className="text-base font-extrabold">Start fresh</div><div className="mt-1 text-sm text-muted-foreground">Create a clean account with no example workouts. Recommended.</div></button><button type="button" onClick={() => { stageDemoImport(); setDemoChoice("keep"); }} className="rounded-2xl border border-border bg-card p-5 text-left"><div className="text-base font-extrabold">Keep demo data</div><div className="mt-1 text-sm text-muted-foreground">Copy the 3 months of example workouts, progress and saved workouts into your new account.</div></button><p className="px-2 pt-2 text-center text-xs text-muted-foreground">You can delete individual example workouts later.</p></div></OnboardingScreen>;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); const next: AccountErrors = {}; if (!draft.name.trim()) next.name = "Enter your name"; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) next.email = "Enter a valid email"; if (draft.password.length < 8 || !/[A-Za-z]/.test(draft.password) || !/\d/.test(draft.password)) next.password = "Use 8+ characters with a letter and number"; if (draft.confirmPassword !== draft.password) next.confirmPassword = "Passwords don't match"; setErrors(next); setFormError(""); if (Object.keys(next).length) return;
    if (demoChoice === "keep") stageDemoImport(); else clearStagedDemoImport();
    setSubmitting(true);
    const email = draft.email.trim();
    try {
      const { data, error } = await supabase.auth.signUp({ email, password: draft.password, options: { emailRedirectTo: window.location.origin, data: { name: draft.name.trim() } } });
      if (error) { setFormError(authErrorMessage(error)); return; }
      if (data.user && data.user.identities?.length === 0) { setFormError("An account with this email already exists."); return; }
      updateDraft({ password: "", confirmPassword: "" });
      if (!data.session) void navigate({ to: "/check-email", search: { email } });
      // With an active session the app shell routes straight into onboarding.
    } catch (error) { setFormError(authErrorMessage(error)); } finally { setSubmitting(false); }
  };
  return <OnboardingScreen><OnboardingHeader title="Create account" subtitle="Set up your details to get started." backTo="/welcome" /><form onSubmit={submit} noValidate className="flex flex-1 flex-col"><div className="space-y-4">{formError && <FormMessage>{formError}</FormMessage>}<FormField label="Name" autoComplete="name" maxLength={100} value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} error={errors.name} /><FormField label="Email" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" maxLength={255} value={draft.email} onChange={(e) => updateDraft({ email: e.target.value })} error={errors.email} /><FormField label="Password" password autoComplete="new-password" maxLength={128} value={draft.password} onChange={(e) => updateDraft({ password: e.target.value })} error={errors.password} /><FormField label="Confirm password" password autoComplete="new-password" maxLength={128} value={draft.confirmPassword} onChange={(e) => updateDraft({ confirmPassword: e.target.value })} error={errors.confirmPassword} /></div><div className="mt-auto pt-8"><Button type="submit" variant="primary" size="xl" className="w-full" disabled={submitting}>{submitting ? "Creating account…" : "Continue"}</Button><AuthFooter prompt="Already have an account?" label="Log in" to="/login" /></div></form></OnboardingScreen>;
}
