import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/recomp/core";
import { SettingsHeader } from "@/components/recomp/settings-ui";

export const Route = createFileRoute("/support")({ head: () => ({ meta: [{ title: "Support — RECOMP'D" }] }), component: SupportPage });

function SupportPage() {
  return <Screen><SettingsHeader title="Support" /><div className="space-y-4 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed">
    <div><h2 className="mb-1 text-base font-extrabold">Need help?</h2><p className="text-muted-foreground">A dedicated RECOMP'D support email will be published here before the public app-store release.</p></div>
    <div className="border-t border-border pt-4"><h2 className="mb-1 text-base font-extrabold">Account deletion</h2><p className="text-muted-foreground">You can find the Delete account control under Settings → Account. Full account deletion is being completed before public release.</p></div>
    <div className="border-t border-border pt-4"><Link to="/privacy" className="font-bold text-primary">Privacy Policy</Link><span className="px-2 text-muted-foreground">·</span><Link to="/terms" className="font-bold text-primary">Terms</Link></div>
  </div></Screen>;
}
