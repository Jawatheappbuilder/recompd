import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { FormMessage, OnboardingHeader, OnboardingScreen } from "@/components/recomp/onboarding-ui";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/profile";

export const Route = createFileRoute("/check-email")({
  validateSearch: (search) => z.object({ email: z.string().max(255).catch("") }).parse(search),
  head: () => ({ meta: [{ title: "Check Your Email — RECOMP'D" }, { name: "description", content: "Confirm your RECOMP'D account." }, { property: "og:title", content: "Check Your Email — RECOMP'D" }, { property: "og:description", content: "Confirm your RECOMP'D account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { email } = Route.useSearch();
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const resend = async () => {
    if (!email) return; setSending(true); setMessage(null);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } });
      setMessage(error ? { tone: "error", text: authErrorMessage(error) } : { tone: "info", text: "Confirmation email sent again." });
    } catch (error) { setMessage({ tone: "error", text: authErrorMessage(error) }); } finally { setSending(false); }
  };
  return <OnboardingScreen><OnboardingHeader title="Check your email" subtitle="Confirm your account to continue." backTo="/login" /><div className="grid flex-1 place-items-center"><div className="w-full text-center"><div className="mx-auto grid size-14 place-items-center rounded-xl border border-border bg-card text-primary"><MailCheck /></div><p className="mt-5 text-sm text-muted-foreground">We've sent a confirmation link to:</p><p className="mt-1 break-all text-sm font-extrabold">{email || "your email"}</p><p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground">Open the link on this device to continue setting up RECOMP'D.</p>{message && <div className="mt-5"><FormMessage tone={message.tone}>{message.text}</FormMessage></div>}</div></div><div className="space-y-3"><Button variant="surface" size="xl" className="w-full" disabled={!email || sending} onClick={() => void resend()}>{sending ? "Sending…" : "Resend email"}</Button><Button asChild variant="primary" size="xl" className="w-full"><Link to="/login">Back to log in</Link></Button></div></OnboardingScreen>;
}
