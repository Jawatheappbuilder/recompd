import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock3, Dumbbell, Search, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Screen } from "@/components/recomp/core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/recomp/auth-context";
import { cleanUsername, getFriendRequests, getFriends, getMySocialProfile, getSocialFeed, searchPeople, sendFriendRequest, setUsername, usernameAvailable, respondToFriendRequest, type FriendRequest, type SocialPost, type SocialProfile } from "@/lib/social";
import { formatDuration } from "@/lib/training-data";

export const Route = createFileRoute("/social")({ component: SocialPage });
type Tab = "feed" | "friends";

function SocialPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("feed");
  const [username, setUsernameInput] = useState("");
  const [needsUsername, setNeedsUsername] = useState<boolean | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SocialProfile[]>([]);
  const [requests, setRequests] = useState<Array<FriendRequest & { profile: SocialProfile }>>([]);
  const [friends, setFriends] = useState<SocialProfile[]>([]);
  const [feed, setFeed] = useState<SocialPost[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  async function refreshSocial(userId: string) {
    const [incoming, friendList, posts] = await Promise.all([getFriendRequests(userId), getFriends(userId), getSocialFeed(userId)]);
    setRequests(incoming); setFriends(friendList); setFeed(posts); setLoadingFeed(false);
  }

  useEffect(() => {
    if (!user) return;
    void getMySocialProfile(user.id).then((profile) => {
      setNeedsUsername(!profile.username);
      if (profile.username) { setUsernameInput(profile.username); return refreshSocial(user.id); }
    }).catch((error) => { console.error("[social] profile load failed", error); setNeedsUsername(true); setLoadingFeed(false); });
  }, [user]);

  useEffect(() => {
    if (!user || !needsUsername) { setAvailable(null); return; }
    const clean = cleanUsername(username);
    if (clean.length < 3) { setAvailable(null); return; }
    const timer = window.setTimeout(() => {
      setChecking(true);
      void usernameAvailable(clean, user.id).then(setAvailable).catch(() => setAvailable(false)).finally(() => setChecking(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [username, user, needsUsername]);

  async function saveUsername() {
    if (!user || !available) return;
    await setUsername(user.id, username); setNeedsUsername(false); await refreshSocial(user.id);
  }
  async function runSearch(value: string) {
    setQuery(value); if (!user) return;
    const clean = cleanUsername(value); if (clean.length < 2) { setResults([]); return; }
    try { setResults(await searchPeople(clean, user.id)); } catch { setResults([]); }
  }
  async function addFriend(receiverId: string) {
    if (!user) return; await sendFriendRequest(user.id, receiverId); setSent((current) => [...current, receiverId]);
  }
  async function reply(id: string, accept: boolean) {
    if (!user) return; await respondToFriendRequest(id, accept); await refreshSocial(user.id);
  }

  if (needsUsername === null) return <Screen><div className="grid min-h-[70dvh] place-items-center text-sm text-muted-foreground">Loading social...</div></Screen>;
  if (needsUsername) return <Screen><div className="mx-auto flex min-h-[78dvh] max-w-sm flex-col justify-center">
    <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><Users className="size-7" /></div>
    <div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">New in RECOMP'D</div>
    <h1 className="mt-2 text-3xl font-black tracking-tight">Training is better together.</h1>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">See what your friends choose to share. Your workout history stays private unless you share a workout to Social.</p>
    <label className="mt-7 text-xs font-bold uppercase tracking-wide">Choose your username</label>
    <div className="mt-2 flex h-13 items-center rounded-xl border border-border bg-card px-4 focus-within:ring-2 focus-within:ring-primary/30"><span className="font-bold text-muted-foreground">@</span><input autoCapitalize="none" autoCorrect="off" value={username} onChange={(event) => setUsernameInput(cleanUsername(event.target.value))} placeholder="yourusername" className="min-w-0 flex-1 bg-transparent px-1.5 py-3 font-bold outline-none" /></div>
    <div className="mt-2 h-5 text-xs">{checking ? <span className="text-muted-foreground">Checking...</span> : available === true ? <span className="font-semibold text-emerald-600">Available</span> : available === false ? <span className="font-semibold text-destructive">That username is taken</span> : username.length > 0 ? <span className="text-muted-foreground">Use at least 3 letters, numbers or _</span> : null}</div>
    <Button className="mt-4 h-12 w-full" variant="primary" disabled={!available} onClick={() => void saveUsername()}>Join social</Button>
  </div></Screen>;

  return <Screen>
    <div className="flex items-center justify-between"><div><div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">RECOMP'D</div><h1 className="text-2xl font-black">Social</h1></div><div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><Users className="size-5" /></div></div>
    <div className="mt-5 grid grid-cols-2 rounded-xl bg-secondary p-1">
      {(["feed","friends"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-lg px-3 py-2 text-sm font-extrabold capitalize transition-colors ${tab === item ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{item}{item === "friends" && requests.length ? <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{requests.length}</span> : null}</button>)}
    </div>

    {tab === "feed" ? <Feed posts={feed} loading={loadingFeed} /> : <div>
      {requests.length > 0 && <section className="mt-5"><div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Friend requests</div><div className="space-y-2">{requests.map((request) => <PersonRow key={request.id} profile={request.profile} action={<><button type="button" aria-label="Accept" onClick={() => void reply(request.id,true)} className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Check className="size-4"/></button><button type="button" aria-label="Decline" onClick={() => void reply(request.id,false)} className="grid size-9 place-items-center rounded-lg bg-secondary"><X className="size-4"/></button></>} />)}</div></section>}
      <section className="mt-5"><div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Your friends · {friends.length}</div>{friends.length ? <div className="space-y-2">{friends.map((profile) => <PersonRow key={profile.id} profile={profile}/>)}</div> : <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No friends yet. Search a username below.</p>}</section>
      <section className="mt-5"><div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Find people</div><div className="rounded-xl border border-border bg-card px-3"><div className="flex items-center gap-2"><Search className="size-4 text-muted-foreground"/><input value={query} onChange={(event)=>void runSearch(event.target.value)} placeholder="Search @username" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none"/></div></div>{query.trim().length >= 2 && <div className="mt-2 space-y-2">{results.length ? results.map((profile)=><PersonRow key={profile.id} profile={profile} action={<Button size="sm" variant={sent.includes(profile.id)?"surface":"primary"} disabled={sent.includes(profile.id)||friends.some(f=>f.id===profile.id)} onClick={()=>void addFriend(profile.id)}>{friends.some(f=>f.id===profile.id)?"Friends":sent.includes(profile.id)?"Sent":<><UserPlus className="size-4"/>Add</>}</Button>}/>) : <div className="py-8 text-center text-sm text-muted-foreground">No usernames found.</div>}</div>}</section>
    </div>}
  </Screen>;
}

function Feed({ posts, loading }: { posts: SocialPost[]; loading: boolean }) {
  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading feed...</div>;
  if (!posts.length) return <div className="py-14 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Dumbbell className="size-6"/></div><div className="mt-4 font-extrabold">Nothing shared yet</div><p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Open a completed workout in Progress and choose Share with friends to put it here.</p></div>;
  return <div className="mt-5 space-y-3">{posts.map((post)=><Card key={post.id} className="overflow-hidden p-0"><div className="p-4"><div className="flex items-center gap-3"><Avatar profile={post.profile}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold">{post.profile?.name || "RECOMP'D friend"}</div><div className="text-xs text-muted-foreground">@{post.profile?.username || "friend"} · {relativeDate(post.created_at)}</div></div></div><h2 className="mt-4 text-lg font-black">{post.name}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground"><span className="flex items-center gap-1"><Clock3 className="size-3.5"/>{formatDuration(post.duration_sec)}</span><span>{post.exercise_count} exercises</span>{post.set_count > 0 && <span>{post.set_count} sets</span>}</div>{post.exercise_names.length > 0 && <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{post.exercise_names.slice(0,4).join(" · ")}{post.exercise_names.length>4?` +${post.exercise_names.length-4} more`:""}</div>}</div></Card>)}</div>;
}

function PersonRow({ profile, action }: { profile: SocialProfile; action?: React.ReactNode }) { return <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"><Avatar profile={profile}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{profile.name}</div><div className="truncate text-xs text-muted-foreground">@{profile.username}</div></div>{action}</div>; }
function Avatar({ profile }: { profile?: SocialProfile }) { return <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 font-black text-primary">{profile?.name?.[0]?.toUpperCase() || "R"}</div>; }
function relativeDate(value: string) { const ms=Date.now()-new Date(value).getTime(); const minutes=Math.max(0,Math.floor(ms/60000)); if(minutes<1)return "just now"; if(minutes<60)return `${minutes}m`; const hours=Math.floor(minutes/60); if(hours<24)return `${hours}h`; const days=Math.floor(hours/24); return days<7?`${days}d`:new Date(value).toLocaleDateString("en-AU",{day:"numeric",month:"short"}); }
