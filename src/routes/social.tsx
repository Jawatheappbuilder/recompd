import { createFileRoute } from "@tanstack/react-router";
import { Check, Search, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Screen } from "@/components/recomp/core";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/recomp/auth-context";
import { cleanUsername, getFriendRequests, getMySocialProfile, searchPeople, sendFriendRequest, setUsername, usernameAvailable, respondToFriendRequest, type FriendRequest, type SocialProfile } from "@/lib/social";

export const Route = createFileRoute("/social")({
  component: SocialPage,
});

function SocialPage() {
  const { user } = useAuth();
  const [username, setUsernameInput] = useState("");
  const [needsUsername, setNeedsUsername] = useState<boolean | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);\n  const [query, setQuery] = useState("");\n  const [results, setResults] = useState<SocialProfile[]>([]);\n  const [requests, setRequests] = useState<Array<FriendRequest & { profile: SocialProfile }>>([]);\n  const [sent, setSent] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    void getMySocialProfile(user.id)
      .then((profile) => {
        setNeedsUsername(!profile.username);
        if (profile.username) setUsernameInput(profile.username);\n        return getFriendRequests(user.id);\n      })\n      .then((items) => {\n        if (items) setRequests(items);
      })
      .catch((error) => {
        console.error("[social] profile load failed", error);
        setNeedsUsername(true);
      });
  }, [user]);

  useEffect(() => {
    if (!user || !needsUsername) {
      setAvailable(null);
      return;
    }
    const clean = cleanUsername(username);
    if (clean.length < 3) {
      setAvailable(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setChecking(true);
      void usernameAvailable(clean, user.id)
        .then(setAvailable)
        .catch(() => setAvailable(false))
        .finally(() => setChecking(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [username, user, needsUsername]);

  async function saveUsername() {
    if (!user || !available) return;
    await setUsername(user.id, username);
    setNeedsUsername(false);
  }

  if (needsUsername === null) {
    return <Screen><div className="grid min-h-[70dvh] place-items-center text-sm text-muted-foreground">Loading social...</div></Screen>;
  }

  if (needsUsername) {
    return (
      <Screen>
        <div className="mx-auto flex min-h-[78dvh] max-w-sm flex-col justify-center">
          <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><Users className="size-7" /></div>
          <div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">New in RECOMP'D</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Training is better together.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">See what your friends are training, share completed workouts and find sessions you want to try. Your social profile is private by default.</p>
          <label className="mt-7 text-xs font-bold uppercase tracking-wide">Choose your username</label>
          <div className="mt-2 flex h-13 items-center rounded-xl border border-border bg-card px-4 focus-within:ring-2 focus-within:ring-primary/30">
            <span className="font-bold text-muted-foreground">@</span>
            <input autoCapitalize="none" autoCorrect="off" value={username} onChange={(event) => setUsernameInput(cleanUsername(event.target.value))} placeholder="yourusername" className="min-w-0 flex-1 bg-transparent px-1.5 py-3 font-bold outline-none" />
          </div>
          <div className="mt-2 h-5 text-xs">
            {checking ? <span className="text-muted-foreground">Checking...</span> : available === true ? <span className="font-semibold text-emerald-600">Available</span> : available === false ? <span className="font-semibold text-destructive">That username is taken</span> : username.length > 0 ? <span className="text-muted-foreground">Use at least 3 letters, numbers or _</span> : null}
          </div>
          <Button className="mt-4 h-12 w-full" variant="primary" disabled={!available} onClick={() => void saveUsername()}>Join social</Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="flex items-center justify-between">
        <div><div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">RECOMP'D</div><h1 className="text-2xl font-black">Social</h1></div>
        <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><Users className="size-5" /></div>
      </div>
      <div className="mt-5 rounded-xl border border-border bg-card px-3">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <input value={query} onChange={(event) => void runSearch(event.target.value)} placeholder="Search @username" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </div>
      </div>
      {requests.length > 0 ? <section className="mt-5">
        <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Friend requests</div>
        <div className="space-y-2">{requests.map((request) => <div key={request.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <Avatar profile={request.profile} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{request.profile.name}</div><div className="truncate text-xs text-muted-foreground">@{request.profile.username}</div></div>
          <button type="button" aria-label="Accept" onClick={() => void reply(request.id, true)} className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Check className="size-4" /></button>
          <button type="button" aria-label="Decline" onClick={() => void reply(request.id, false)} className="grid size-9 place-items-center rounded-lg bg-secondary"><X className="size-4" /></button>
        </div>)}</div>
      </section> : null}
      <section className="mt-5">
        {query.trim().length >= 2 ? <div className="space-y-2">{results.length ? results.map((profile) => <div key={profile.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <Avatar profile={profile} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{profile.name}</div><div className="truncate text-xs text-muted-foreground">@{profile.username}</div></div>
          <Button size="sm" variant={sent.includes(profile.id) ? "surface" : "primary"} disabled={sent.includes(profile.id)} onClick={() => void addFriend(profile.id)}>{sent.includes(profile.id) ? "Sent" : <><UserPlus className="size-4" /> Add</>}</Button>
        </div>) : <div className="py-10 text-center text-sm text-muted-foreground">No usernames found.</div>}</div> : <div className="py-12 text-center"><div className="font-extrabold">Find your people</div><p className="mt-1 text-sm text-muted-foreground">Search for a RECOMP'D username to send a friend request.</p></div>}
      </section>
    </Screen>
  );
}
\nfunction Avatar({ profile }: { profile: SocialProfile }) {\n  return <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 font-black text-primary">{profile.name?.[0]?.toUpperCase() || "R"}</div>;\n}\n