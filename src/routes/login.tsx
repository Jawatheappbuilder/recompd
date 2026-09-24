import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthFooter, FormField, FormMessage, OnboardingHeader, OnboardingScreen } from "@/components/recomp/onboarding-ui";
import { useOnboardingDraft } from "@/components/recomp/onboarding-context";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/profile";

export const Route = createFileRoute("/login")({ head: () => ({ meta: [{ title: "Log In — RECOMP'D" }, { name: "description", content: "Log in to RECOMP'D." }, { property: "og:title", content: "Log In — RECOMP'D" }, { property: "og:description", content: "Log in to RECOMP'D." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: LoginPage });

function LoginPage() {
  type LoginErrors = Partial<Record<"email" | "password", string>>;
  const { draft, updateDraft } = useOnboardingDraft(); const navigate = useNavigate(); const [errors, setErrors] = useState<LoginErrors>({}); const [formError, setFormError] = useState(""); const [submitting, setSubmitting] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); const next: LoginErrors = {}; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) next.email = "Enter a valid email"; if (!draft.password) next.password = "Enter your password"; setErrors(next); setFormError(""); if (Object.keys(next).length) return;
    setSubmitting(true); const email = draft.email.trim();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: draft.password });
      if (error) { if (error.code === "email_not_confirmed") { void navigate({ to: "/check-email", search: { email } }); return; } setFormError(authErrorMessage(error)); return; }
      updateDraft({ password: "", confirmPassword: "" });
    } catch (error) { setFormError(authErrorMessage(error)); } finally { setSubmitting(false); }
  };
  return <OnboardingScreen><OnboardingHeader title="Welcome back" subtitle="Log in to continue your training." backTo="/welcome" /><form onSubmit={submit} noValidate className="flex flex-1 flex-col"><div className="space-y-4">{formError && <FormMessage>{formError}</FormMessage>}<FormField label="Email" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" maxLength={255} value={draft.email} onChange={(e) => updateDraft({ email: e.target.value })} error={errors.email} /><FormField label="Password" password autoComplete="current-password" maxLength={128} value={draft.password} onChange={(e) => updateDraft({ password: e.target.value })} error={errors.password} /><div className="text-right"><Link to="/forgot-password" className="text-xs font-bold text-primary">Forgot password?</Link></div></div><div className="mt-auto pt-8"><Button type="submit" variant="primary" size="xl" className="w-full" disabled={submitting}>{submitting ? "Logging in…" : "Continue"}</Button><AuthFooter prompt="Don't have an account?" label="Create account" to="/create-account" /></div></form></OnboardingScreen>;
}
