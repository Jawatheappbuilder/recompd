import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CircleCheck, TimerOff } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/recomp/auth-context";
import { FormField, FormMessage, OnboardingHeader, OnboardingScreen } from "@/components/recomp/onboarding-ui";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/profile";

export const Route = createFileRoute("/reset-password")({ ssr: false, head: () => ({ meta: [{ title: "Set New Password — RECOMP'D" }, { name: "description", content: "Choose a new RECOMP'D password." }, { property: "og:title", content: "Set New Password — RECOMP'D" }, { property: "og:description", content: "Choose a new RECOMP'D password." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: ResetPasswordPage });

function ResetPasswordPage() {
  const { status } = useAuth(); const navigate = useNavigate();
  const [linkError, setLinkError] = useState(false);
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"password" | "confirm", string>>>({}); const [formError, setFormError] = useState(""); const [saving, setSaving] = useState(false); const [done, setDone] = useState(false);
  useEffect(() => { const params = new URLSearchParams(window.location.hash.slice(1) + "&" + window.location.search.slice(1)); if (params.get("error") || params.get("error_code")) setLinkError(true); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); const next: typeof errors = {};
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) next.password = "Use 8+ characters with a letter and number";
    if (confirm !== password) next.confirm = "Passwords don't match"; setErrors(next); setFormError(""); if (Object.keys(next).length) return;
    setSaving(true);
    try { const { error } = await supabase.auth.updateUser({ password }); if (error) setFormError(authErrorMessage(error)); else { setDone(true); setPassword(""); setConfirm(""); } }
    catch (err) { setFormError(authErrorMessage(err)); } finally { setSaving(false); }
  };

  if (!done && (linkError || status === "signedOut")) return <OnboardingScreen><OnboardingHeader title="Link expired" subtitle="This reset link is invalid or has expired." backTo="/login" /><div className="grid flex-1 place-items-center"><div className="mx-auto grid size-14 place-items-center rounded-xl border border-border bg-card text-muted-foreground"><TimerOff /></div></div><Button asChild variant="primary" size="xl" className="w-full"><Link to="/forgot-password">Request a new link</Link></Button></OnboardingScreen>;
  if (done) return <OnboardingScreen><OnboardingHeader title="Password updated" subtitle="Your new password is ready to use." backTo="/login" /><div className="grid flex-1 place-items-center"><div className="mx-auto grid size-14 place-items-center rounded-xl border border-border bg-card text-primary"><CircleCheck /></div></div><Button variant="primary" size="xl" className="w-full" onClick={() => void navigate({ to: "/", replace: true })}>Continue</Button></OnboardingScreen>;
  if (status === "loading") return <OnboardingScreen centered><p className="text-center text-sm text-muted-foreground">Checking your link…</p></OnboardingScreen>;
  return <OnboardingScreen><OnboardingHeader title="Set new password" subtitle="Choose a password you'll remember." backTo="/login" /><form onSubmit={submit} noValidate className="flex flex-1 flex-col"><div className="space-y-4">{formError && <FormMessage>{formError}</FormMessage>}<FormField label="New password" password autoComplete="new-password" maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} /><FormField label="Confirm new password" password autoComplete="new-password" maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} /></div><div className="mt-auto pt-8"><Button type="submit" variant="primary" size="xl" className="w-full" disabled={saving}>{saving ? "Updating…" : "Update password"}</Button></div></form></OnboardingScreen>;
}
