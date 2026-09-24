import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { FormField, FormMessage, OnboardingHeader, OnboardingScreen } from "@/components/recomp/onboarding-ui";
import { useOnboardingDraft } from "@/components/recomp/onboarding-context";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/profile";

export const Route = createFileRoute("/forgot-password")({ head: () => ({ meta: [{ title: "Reset Password — RECOMP'D" }, { name: "description", content: "Reset your RECOMP'D password." }, { property: "og:title", content: "Reset Password — RECOMP'D" }, { property: "og:description", content: "Reset your RECOMP'D password." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const { draft, updateDraft } = useOnboardingDraft();
  const [error, setError] = useState(""); const [formError, setFormError] = useState(""); const [sending, setSending] = useState(false); const [sentTo, setSentTo] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault(); const email = draft.email.trim(); setFormError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email"); return; } setError("");
    setSending(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (resetError) setFormError(authErrorMessage(resetError)); else setSentTo(email);
    } catch (err) { setFormError(authErrorMessage(err)); } finally { setSending(false); }
  };
  if (sentTo) return <OnboardingScreen><OnboardingHeader title="Check your email" subtitle="Follow the link to set a new password." backTo="/login" /><div className="grid flex-1 place-items-center"><div className="text-center"><div className="mx-auto grid size-14 place-items-center rounded-xl border border-border bg-card text-primary"><MailCheck /></div><p className="mt-5 text-sm text-muted-foreground">If an account exists for</p><p className="mt-1 break-all text-sm font-extrabold">{sentTo}</p><p className="mt-1 text-sm text-muted-foreground">you'll receive a reset link shortly.</p></div></div><Button asChild variant="primary" size="xl" className="w-full"><Link to="/login">Back to log in</Link></Button></OnboardingScreen>;
  return <OnboardingScreen><OnboardingHeader title="Reset password" subtitle="Enter your email and we'll send you a reset link." backTo="/login" /><form onSubmit={submit} noValidate className="flex flex-1 flex-col"><div className="space-y-4">{formError && <FormMessage>{formError}</FormMessage>}<FormField label="Email" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" maxLength={255} value={draft.email} onChange={(e) => updateDraft({ email: e.target.value })} error={error} /></div><div className="mt-auto pt-8"><Button type="submit" variant="primary" size="xl" className="w-full" disabled={sending}>{sending ? "Sending…" : "Send reset link"}</Button></div></form></OnboardingScreen>;
}
