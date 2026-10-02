import { createFileRoute } from "@tanstack/react-router";
import { Check, Search, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Screen } from "@/components/recomp/core";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/recomp/auth-context";
import { cleanUsername, getFriendRequests, getMySocialProfile, getSocialFeed, searchPeople, sendFriendRequest, setUsername, respondToFriendRequest, type FeedWorkout, type FriendRequest, type SocialProfile } from "@/lib/social";

export const Route = createFileRoute("/social")({ component: SocialPage });

function SocialPage() {
  const { user } = useAuth();
  const [tab,setTab]=useState<"feed"|"friends">("feed");
  const [username,setUsernameInput]=useState("");
  const [needsUsername,setNeedsUsername]=useState(false);
  const [checking,setChecking]=useState(false);
  const [available,setAvailable]=useState<boolean|null>(null);
  const [query,setQuery]=useState("");
  const [results,setResults]=useState<SocialProfile[]>([]);
  const [requests,setRequests]=useState<Array<FriendRequest & {profile:SocialProfile}>>([]);
  const [feed,setFeed]=useState<FeedWorkout[]>([]);
  const [loading,setLoading]=useState(true);

  const refresh=async()=>{
    if(!user)return;
    setLoading(true);
    try {
      const profile=await getMySocialProfile(user.id);
      setNeedsUsername(!profile.username);
      if(profile.username)setUsernameInput(profile.username);
      const [r,f]=await Promise.all([getFriendRequests(user.id),getSocialFeed(user.id)]);
      setRequests(r); setFeed(f);
    } finally { setLoading(false); }
  };
  useEffect(()=>{void refresh()},[user?.id]);
  useEffect(()=>{
    if(!user||!needsUsername){setAvailable(null);return}
    const clean=cleanUsername(username);
    if(clean.length<3){setAvailable(null);return}
    const t=setTimeout(async()=>{setChecking(true);try{setAvailable(await import("@/lib/social").then(m=>m.usernameAvailable(clean,user.id)))}finally{setChecking(false)}},350);
    return()=>clearTimeout(t);
  },[username,user?.id,needsUsername]);

  const saveUsername=async()=>{if(!user||!available)return;await setUsername(user.id,username);setNeedsUsername(false);await refresh()};
  const doSearch=async(value:string)=>{setQuery(value);if(!user)return;setResults(await searchPeople(value,user.id))};
  const reply=async(id:string,accept:boolean)=>{await respondToFriendRequest(id,accept);await refresh()};

  if(needsUsername)return <Screen><div className="mx-auto flex min-h-[78dvh] max-w-sm flex-col justify-center">
    <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><Users className="size-7"/></div>
    <div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">New in RECOMP'D</div>
    <h1 className="mt-2 text-3xl font-black tracking-tight">Training is better together.</h1>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">See what your friends are training, share completed workouts and find sessions you want to try. Your social profile is private by default.</p>
    <label className="mt-7 text-xs font-bold uppercase tracking-wide">Choose your username</label>
    <div className="mt-2 flex h-13 items-center rounded-xl border border-border bg-card px-4 focus-within:ring-2 focus-within:ring-primary/30"><span className="font-bold text-muted-foreground">@</span><input autoCapitalize="none" autoCorrect="off" value={username} onChange={e=>setUsernameInput(cleanUsername(e.target.value))} placeholder="yourusername" className="min-w-0 flex-1 bg-transparent px-1.5 py-3 font-bold outline-none"/></div>
    <div className="mt-2 h-5 text-xs">{checking?<span className="text-muted-foreground">Checking…</span>:available===true?<span className="font-semibold text-emerald-600">✓ Available</span>:available===false?<span className="font-semibold text-destructive">That username is taken</span>:username.length>0?<span className="text-muted-foreground">Use at least 3 letters, numbers or _</span>:null}</div>
    <Button className="mt-4 h-12 w-full" variant="primary" disabled={!available} onClick={()=>void saveUsername()}>Join social</Button>
  </div></Screen>;

  return <Screen><div className="flex items-center justify-between"><div><div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">RECOMP'D</div><h1 className="text-2xl font-black">Social</h1></div><div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><Users className="size-5"/></div></div>
    <div className="mt-5 grid grid-cols-2 rounded-xl bg-secondary p-1">{(["feed","friends"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`relative rounded-lg py-2.5 text-sm font-bold capitalize ${tab===x?"bg-card text-foreground shadow-sm":"text-muted-foreground"}`}>{x}{x==="friends"&&requests.length>0?<span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{requests.length}</span>:null}</button>)}</div>
    {loading?<div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>:tab==="feed"?<div className="mt-5 space-y-3">{feed.length?feed.map(w=><article key={w.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-primary/10 font-black text-primary">{w.profile?.name?.[0]?.toUpperCase()||"R"}</div><div><div className="text-sm font-extrabold">{w.profile?.name}</div><div className="text-xs text-muted-foreground">@{w.profile?.username} · {new Date(w.started_at).toLocaleDateString(undefined,{day:"numeric",month:"short"})}</div></div></div><div className="mt-4 text-lg font-black">{w.name}</div><div className="mt-1 text-sm text-muted-foreground">{Math.round(w.duration_sec/60)} min · {w.setCount||0} sets · {w.exerciseCount||0} exercises</div><Button variant="surface" className="mt-4 w-full">Train this workout</Button></article>):<Empty title="Your feed starts with friends" body="Add a friend and their future completed workouts will show up here."/>}</div>:
    <div className="mt-5"><div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3"><Search className="size-4 text-muted-foreground"/><input value={query} onChange={e=>void doSearch(e.target.value)} placeholder="Search @username" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none"/></div>
      {requests.length>0?<section className="mt-5"><div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Friend requests</div>{requests.map(r=><div key={r.id} className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-card p-3"><Avatar profile={r.profile}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{r.profile.name}</div><div className="truncate text-xs text-muted-foreground">@{r.profile.username}</div></div><button onClick={()=>void reply(r.id,true)} className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Check className="size-4"/></button><button onClick={()=>void reply(r.id,false)} className="grid size-9 place-items-center rounded-lg bg-secondary"><X className="size-4"/></button></div>)}</section>:null}
      {query.length>=2?<section className="mt-5 space-y-2">{results.length?results.map(p=><div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"><Avatar profile={p}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{p.name}</div><div className="truncate text-xs text-muted-foreground">@{p.username}</div></div><Button size="sm" variant="primary" onClick={()=>user&&void sendFriendRequest(user.id,p.id)}><UserPlus className="size-4"/> Add</Button></div>):<div className="py-8 text-center text-sm text-muted-foreground">No usernames found.</div>}</section>:<Empty title="Find your people" body="Search by RECOMP'D username. QR codes and profile links are next."/>}
    </div>}</Screen>;
}
function Avatar({profile}:{profile:SocialProfile}){return <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 font-black text-primary">{profile.name?.[0]?.toUpperCase()||"R"}</div>}
function Empty({title,body}:{title:string;body:string}){return <div className="py-14 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground"><Users className="size-5"/></div><div className="mt-3 font-extrabold">{title}</div><p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">{body}</p></div>}
