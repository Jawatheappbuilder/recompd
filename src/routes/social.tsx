import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookmarkPlus, Check, ChevronDown, Clock3, Dumbbell, Flame, Link2, Pencil, Search, Timer, Trash2, Trophy, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Screen } from "@/components/recomp/core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/recomp/auth-context";
import { cleanUsername, getFriendRequests, getFriends, getMySocialProfile, getSocialFeed, searchPeople, sendFriendRequest, setUsername, toggleSocialReaction, usernameAvailable, respondToFriendRequest, removeFriend, getMonthlyLeaderboard, setLeaderboardEnabled, shareWorkoutToSocial, unshareWorkoutFromSocial, getOwnerMemberDirectory, type FriendRequest, type SocialPost, type SocialProfile, type LeaderboardEntry, type OwnerMember } from "@/lib/social";
import { formatDuration, formatPerformance } from "@/lib/training-data";
import { exercises, toWorkoutExercise, type Exercise } from "@/data/exercises";
import { createActiveWorkout, saveActiveWorkout } from "@/hooks/use-active-workout";
import { toast } from "sonner";
import { mutate, newId, useCloudData } from "@/lib/cloud-data";
import { workoutGroupFor, workoutGroupId } from "@/lib/workout-groups";

export const Route = createFileRoute("/social")({ component: SocialPage });
type Tab = "feed" | "leaderboard" | "friends";

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
  const [leaderboardEnabled, setLeaderboardEnabledState] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardMonth, setLeaderboardMonth] = useState(0);
  const [ownerMembers, setOwnerMembers] = useState<OwnerMember[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [removingFriend, setRemovingFriend] = useState<string | null>(null);

  async function refreshSocial(userId: string) {
    const [incoming, friendList, posts] = await Promise.allSettled([
      getFriendRequests(userId),
      getFriends(userId),
      getSocialFeed(userId),
    ]);
    if (incoming.status === "fulfilled") setRequests(incoming.value);
    if (friendList.status === "fulfilled") setFriends(friendList.value);
    if (posts.status === "fulfilled") setFeed(posts.value);
    else console.warn("[social] feed unavailable", posts.reason);
    setLoadingFeed(false);
  }

  useEffect(() => {
    if (!user) return;
    void getMySocialProfile(user.id).then((profile) => {
      setNeedsUsername(!profile.username);
      setLeaderboardEnabledState(profile.leaderboard_enabled ?? true);
      if (profile.username) { setUsernameInput(profile.username); void refreshSocial(user.id); }
    }).catch((error) => {
      console.error("[social] profile load failed", error);
      // A failed profile read is not evidence that the user has no username.
      // Keep Social in a loading/error-safe state rather than overwriting existing setup.
      setNeedsUsername(null);
      setLoadingFeed(false);
    });
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
    await setUsername(user.id, username, leaderboardEnabled); setNeedsUsername(false); await refreshSocial(user.id);
  }
  async function loadLeaderboard(offset = leaderboardMonth) {
    if (!user) return;
    try { setLeaderboard(await getMonthlyLeaderboard(user.id, offset)); } catch { setLeaderboard([]); }
  }
  useEffect(() => { if (user && !needsUsername && tab === "leaderboard") void loadLeaderboard(leaderboardMonth); }, [user, needsUsername, tab, leaderboardMonth]);
  useEffect(() => {
    if (!user || needsUsername || tab !== "friends" || membersLoaded) return;
    void getOwnerMemberDirectory().then((members) => { setOwnerMembers(members); setMembersLoaded(true); }).catch(() => setMembersLoaded(true));
  }, [user, needsUsername, tab, membersLoaded]);
  async function toggleLeaderboard(enabled: boolean) {
    if (!user) return;
    setLeaderboardEnabledState(enabled);
    try { await setLeaderboardEnabled(user.id, enabled); if (tab === "leaderboard") await loadLeaderboard(); }
    catch { setLeaderboardEnabledState(!enabled); toast.error("Couldn't update leaderboard setting"); }
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
  async function removeExistingFriend(profile: SocialProfile) {
    if (!user || removingFriend) return;
    setRemovingFriend(profile.id);
    try { await removeFriend(user.id, profile.id); await refreshSocial(user.id); }
    catch { toast.error("Couldn't remove friend"); }
    finally { setRemovingFriend(null); }
  }

  if (needsUsername === null) return <Screen><div className="grid min-h-[70dvh] place-items-center text-sm text-muted-foreground">Loading social...</div></Screen>;
  if (needsUsername) return <Screen><div className="mx-auto flex min-h-[78dvh] max-w-sm flex-col justify-center">
    <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><Users className="size-7" /></div>
    <div className="text-xs font-extrabold uppercase tracking-[.14em] text-primary">New in RECOMP'D</div>
    <h1 className="mt-2 text-3xl font-black tracking-tight">Training is better together.</h1>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">See what your friends choose to share. Your workout history stays private unless you share a workout to Social.</p>
    <label className="mt-7 text-xs font-bold uppercase tracking-wide">Choose your username</label>
    <div className="mt-2 flex h-13 items-center rounded-xl border border-border bg-card px-4 focus-within:ring-2 focus-within:ring-primary/30"><span className="font-bold text-muted-foreground">@</span><input autoCapitalize="none" autoCorrect="off" value={username} onChange={(event) => setUsernameInput(cleanUsername(event.target.value))} placeholder="yourusername" className="min-w-0 flex-1 bg-transparent px-1.5 py-3 font-bold outline-none" /></div>
    <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/[0.06] p-4"><div><div className="flex items-center gap-2 text-sm font-extrabold"><Trophy className="size-4 text-primary"/>Friends leaderboard</div><p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">Show your monthly workout count to accepted friends. Your workout details stay private.</p></div><button type="button" role="switch" aria-checked={leaderboardEnabled} onClick={() => setLeaderboardEnabledState(!leaderboardEnabled)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${leaderboardEnabled ? "bg-primary" : "bg-muted-foreground/25"}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all ${leaderboardEnabled ? "left-6" : "left-1"}`}/></button></div>
    <div className="mt-2 h-5 text-xs">{checking ? <span className="text-muted-foreground">Checking...</span> : available === true ? <span className="font-semibold text-emerald-600">Available</span> : available === false ? <span className="font-semibold text-destructive">That username is taken</span> : username.length > 0 ? <span className="text-muted-foreground">Use at least 3 letters, numbers or _</span> : null}</div>
    <Button className="mt-4 h-12 w-full" variant="primary" disabled={!available} onClick={() => void saveUsername()}>Join social</Button>
  </div></Screen>;

  return <Screen>
    <header className="-mx-4 -mt-3 overflow-hidden rounded-b-[2rem] border-b border-primary/10 bg-gradient-to-br from-primary/[0.13] via-primary/[0.06] to-transparent px-4 pb-5 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[.2em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />RECOMP'D</div>
          <h1 className="mt-1 text-[2rem] font-black leading-none tracking-[-0.04em]">Social</h1>
          <p className="mt-2 text-xs font-medium text-muted-foreground">Train together. Share what counts.</p>
        </div>
        <button type="button" onClick={() => setTab("friends")} aria-label="Open friends" className="relative grid size-12 place-items-center rounded-2xl border border-primary/15 bg-card/80 text-primary shadow-sm backdrop-blur transition-transform active:scale-95">
          <Users className="size-5" />
          {requests.length > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground">{requests.length}</span>}
        </button>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl border border-primary/10 bg-background/45 p-1 shadow-inner backdrop-blur">
        {(["feed","leaderboard","friends"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-xl px-3 py-2.5 text-sm font-extrabold capitalize transition-all ${tab === item ? "bg-card text-foreground shadow-sm ring-1 ring-black/[0.04]" : "text-muted-foreground hover:text-foreground"}`}>{item}{item === "friends" && requests.length ? <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{requests.length}</span> : null}</button>)}
      </div>
    </header>

    {tab === "feed" ? <Feed posts={feed} loading={loadingFeed} userId={user?.id ?? ""} onRefresh={() => user ? refreshSocial(user.id) : Promise.resolve()} /> : tab === "leaderboard" ? <Leaderboard entries={leaderboard} enabled={leaderboardEnabled} monthOffset={leaderboardMonth} userId={user?.id ?? ""} onMonthChange={setLeaderboardMonth} onToggle={(value) => void toggleLeaderboard(value)} /> : <div>
      {requests.length > 0 && <section className="mt-5"><div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Friend requests</div><div className="space-y-2">{requests.map((request) => <PersonRow key={request.id} profile={request.profile} action={<><button type="button" aria-label="Accept" onClick={() => void reply(request.id,true)} className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Check className="size-4"/></button><button type="button" aria-label="Decline" onClick={() => void reply(request.id,false)} className="grid size-9 place-items-center rounded-lg bg-secondary"><X className="size-4"/></button></>} />)}</div></section>}
      <section className="mt-5"><div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Your friends · {friends.length}</div>{friends.length ? <div className="space-y-2">{friends.map((profile) => <PersonRow key={profile.id} profile={profile} action={<button type="button" onClick={() => void removeExistingFriend(profile)} className="rounded-lg px-2.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">Remove</button>}/>)}</div> : <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No friends yet. Search a username below.</p>}</section>
      {ownerMembers.length > 0 && <section className="mt-5"><div className="mb-2 flex items-center justify-between"><div className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">All members · {ownerMembers.length}</div><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-primary">Owner</span></div><div className="rounded-xl border border-border bg-card px-3"><div className="flex items-center gap-2"><Search className="size-4 text-muted-foreground"/><input value={memberQuery} onChange={(event)=>setMemberQuery(event.target.value)} placeholder="Search all members" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none"/></div></div><div className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">{ownerMembers.filter((member) => { const q = memberQuery.trim().toLowerCase(); return !q || member.name.toLowerCase().includes(q) || (member.username ?? "").toLowerCase().includes(q); }).map((member) => <div key={member.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"><Avatar profile={{ id: member.id, name: member.name, username: member.username ?? "" }}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold">{member.name || "Member"}</div><div className="text-xs text-muted-foreground">{member.username ? `@${member.username}` : "No Social username yet"} · Joined {new Date(member.created_at).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}</div></div></div>)}</div></section>}
      <section className="mt-5"><div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Find people</div><div className="rounded-xl border border-border bg-card px-3"><div className="flex items-center gap-2"><Search className="size-4 text-muted-foreground"/><input value={query} onChange={(event)=>void runSearch(event.target.value)} placeholder="Search @username" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none"/></div></div>{query.trim().length >= 2 && <div className="mt-2 space-y-2">{results.length ? results.map((profile)=><PersonRow key={profile.id} profile={profile} action={<Button size="sm" variant={sent.includes(profile.id)?"surface":"primary"} disabled={sent.includes(profile.id)||friends.some(f=>f.id===profile.id)} onClick={()=>void addFriend(profile.id)}>{friends.some(f=>f.id===profile.id)?"Friends":sent.includes(profile.id)?"Sent":<><UserPlus className="size-4"/>Add</>}</Button>}/>) : <div className="py-8 text-center text-sm text-muted-foreground">No usernames found.</div>}</div>}</section>
    </div>}
  </Screen>;
}

function Feed({ posts, loading, userId, onRefresh }: { posts: SocialPost[]; loading: boolean; userId: string; onRefresh: () => Promise<void> }) {
  const navigate = useNavigate();
  const cloud = useCloudData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reacting, setReacting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [savingPost, setSavingPost] = useState<SocialPost | null>(null);
  const [saveName, setSaveName] = useState("");
  const [renamingPostId, setRenamingPostId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameOriginal, setRenameOriginal] = useState("");
  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading feed...</div>;
  if (!posts.length) return <div className="py-14 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Dumbbell className="size-6"/></div><div className="mt-4 font-extrabold">Nothing shared yet</div><p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Open a completed workout in Progress and choose Share with friends to put it here.</p></div>;

  function templateFrom(post: SocialPost) {
    const snapshot = post.workout_snapshot;
    if (!snapshot?.exercises?.length) return [];
    return snapshot.exercises.map((item) => {
      const original = exercises.find((exercise) => exercise.id === item.exerciseId);
      const base: Exercise = original ?? {
        id: item.exerciseId, name: item.name, muscle: item.muscles?.[0] ?? "Core",
        muscles: item.muscles ?? ["Core"], equipment: item.equipment,
        type: item.tracking === "cardio" ? "Cardio" : "Isolation",
        tracking: item.tracking ?? "strength", cardioMetrics: item.cardioMetrics ?? [], custom: true,
      };
      const plan = toWorkoutExercise(base);
      return { ...plan, key: item.key || crypto.randomUUID(), sets: Math.max(1, item.sets?.length || plan.sets), ...(item.supersetWith ? { supersetWith:item.supersetWith } : {}), ...(item.groupId ? { groupId:item.groupId, groupRestSeconds:item.groupRestSeconds } : {}), ...(item.circuitId ? { circuitId:item.circuitId, circuitWorkSeconds:item.circuitWorkSeconds, circuitRestSeconds:item.circuitRestSeconds, circuitRounds:item.circuitRounds, circuitReps:item.circuitReps } : {}) };
    });
  }
  function train(post: SocialPost) {
    const planned = templateFrom(post);
    if (!planned.length) { toast.error("This older share doesn't include workout details"); return; }
    const active = createActiveWorkout(planned, post.name);
    if (!active) return;
    saveActiveWorkout(active);
    toast.success("Workout ready");
    void navigate({ to: "/workout" });
  }
  function openSave(post: SocialPost) {
    if (!post.workout_snapshot?.exercises?.length) { toast.error("This older share doesn't include workout details"); return; }
    setSavingPost(post); setSaveName(post.name);
  }
  function saveFriendWorkout() {
    if (!savingPost) return;
    const planned = templateFrom(savingPost);
    const name = saveName.trim() || savingPost.name;
    if (!planned.length) return;
    mutate({ kind: "upsertSaved", workout: { id: newId(), name, exercises: planned, createdAt: Date.now() } });
    toast.success(`Saved “${name}” from @${savingPost.profile?.username || savingPost.profile?.name || "friend"}`);
    setSavingPost(null); setSaveName("");
  }
  function beginRename(post: SocialPost) {
    if (post.user_id !== userId) return;
    setRenameOriginal(post.name);
    setRenameDraft("");
    setRenamingPostId(post.id);
  }
  async function finishRename(post: SocialPost) {
    if (post.user_id !== userId || renamingPostId !== post.id) return;
    const next = renameDraft.trim() || renameOriginal;
    setRenamingPostId(null);
    setRenameDraft(next);
    if (next === post.name) return;
    const workout = cloud?.workouts.find((item) => item.id === post.workout_id);
    if (!workout) { toast.error("Couldn't find the original workout"); return; }
    const renamedWorkout = { ...workout, name: next };
    try {
      mutate({ kind: "upsertWorkout", workout: renamedWorkout });
      await shareWorkoutToSocial(userId, renamedWorkout, post.pr_count ?? 0);
      toast.success("Workout renamed");
      await onRefresh();
    } catch {
      toast.error("Couldn't rename workout");
    }
  }

  async function removeShare(post: SocialPost) {
    if (!userId || post.user_id !== userId || deleting) return;
    if (!window.confirm("Remove this workout from your Social feed? Your workout history will stay saved.")) return;
    setDeleting(post.id);
    try { await unshareWorkoutFromSocial(userId, post.workout_id); toast.success("Removed from your feed"); await onRefresh(); }
    catch { toast.error("Couldn't remove shared workout"); }
    finally { setDeleting(null); }
  }
  async function react(post: SocialPost, emoji: string) {
    if (!userId || reacting) return;
    setReacting(post.id + emoji);
    try { await toggleSocialReaction(userId, post.id, emoji); await onRefresh(); }
    catch { toast.error("Couldn't update reaction"); }
    finally { setReacting(null); }
  }

  return <>
    {savingPost && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" onClick={() => setSavingPost(null)}><div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="text-lg font-black">Save workout</div><p className="mt-1 text-xs text-muted-foreground">Saved from @{savingPost.profile?.username || savingPost.profile?.name || "friend"}. Rename it now if you want.</p><label className="mt-4 block text-xs font-bold text-muted-foreground">Workout name</label><input autoFocus value={saveName} onChange={(event) => setSaveName(event.target.value)} maxLength={120} className="mt-2 h-12 w-full rounded-xl border border-border bg-secondary px-3 text-base font-semibold outline-none focus:ring-2 focus:ring-primary" /><div className="mt-4 grid grid-cols-2 gap-2"><Button variant="surface" onClick={() => setSavingPost(null)}>Cancel</Button><Button variant="primary" onClick={saveFriendWorkout}><BookmarkPlus/>Save</Button></div></div></div>}
    <div className="mt-4 space-y-2.5">{posts.map((post) => {
    const isOpen = expanded === post.id;
    const snapshot = post.workout_snapshot;
    const reactionCounts = ["💪","🔥","👏"].map((emoji) => ({
      emoji,
      count: post.reactions?.filter((reaction) => reaction.emoji === emoji).length ?? 0,
      mine: post.reactions?.some((reaction) => reaction.emoji === emoji && reaction.user_id === userId) ?? false,
    }));
    return <Card key={post.id} className="overflow-hidden p-0">
      <button type="button" onClick={() => setExpanded(isOpen ? null : post.id)} className="w-full p-4 text-left">
        <div className="flex items-center gap-3"><Avatar profile={post.profile}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold">{post.profile?.name || "RECOMP'D friend"}</div><div className="text-xs text-muted-foreground">@{post.profile?.username || "friend"} · {relativeDate(post.created_at)}</div></div>{post.user_id === userId && <button type="button" aria-label="Remove shared workout" disabled={deleting === post.id} onClick={(event) => { event.stopPropagation(); void removeShare(post); }} className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4"/></button>}<ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}/></div>
        <div className="mt-3 flex items-center gap-1.5">
          {renamingPostId === post.id ? <input autoFocus value={renameDraft} onClick={(event) => event.stopPropagation()} onChange={(event) => setRenameDraft(event.target.value)} onBlur={() => void finishRename(post)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { event.stopPropagation(); setRenameDraft(renameOriginal); setRenamingPostId(null); } }} aria-label="Rename workout" placeholder="Workout name" className="h-8 min-w-0 flex-1 border-b border-primary/35 bg-transparent p-0 text-lg font-black outline-none placeholder:text-muted-foreground" /> : <h2 className="min-w-0 flex-1 truncate text-lg font-black">{post.name}</h2>}
          {post.user_id === userId && renamingPostId !== post.id && <button type="button" aria-label="Rename workout" onClick={(event) => { event.stopPropagation(); beginRename(post); }} className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"><Pencil className="size-3.5"/></button>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground"><span className="flex items-center gap-1"><Clock3 className="size-3.5"/>{formatDuration(post.duration_sec)}</span><span>{post.exercise_count} exercises</span>{post.set_count > 0 && <span>{post.set_count} sets</span>}{(post.pr_count ?? 0) > 0 && <span className="flex items-center gap-1 font-extrabold text-primary"><Trophy className="size-3.5"/>{post.pr_count} PR{post.pr_count === 1 ? "" : "s"}</span>}</div>
        <div className="mt-3 space-y-1.5">
          {(snapshot?.exercises ?? []).slice(0,3).map((exercise) => <div key={exercise.key} className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold">{exercise.name}</span><span className="shrink-0 text-xs text-muted-foreground">{exercise.sets.length} set{exercise.sets.length === 1 ? "" : "s"}</span></div>)}
          {!snapshot && post.exercise_names.slice(0,3).map((name) => <div key={name} className="text-sm font-semibold">{name}</div>)}
          {post.exercise_count > 3 && <div className="text-xs font-bold text-muted-foreground">+{post.exercise_count - 3} more exercises</div>}
        </div>
      </button>
      {isOpen && <div className="border-t border-border px-4 pb-4 pt-3">
        {snapshot?.exercises?.length ? <div className="space-y-3">{snapshot.exercises.map((exercise,index) => { const gid=workoutGroupId(exercise); if(gid&&snapshot.exercises.findIndex(e=>workoutGroupId(e)===gid)!==index)return null; const group=workoutGroupFor(snapshot.exercises,exercise); if(group)return <div key={group.id} className="rounded-xl border border-primary/20 bg-primary/[0.05] p-3"><div className="flex items-center gap-1.5 text-[0.68rem] font-black tracking-wide text-primary">{group.kind==="circuit"?<Timer className="size-3.5"/>:<Link2 className="size-3.5"/>}{group.label}</div>{group.members.map(member=><div key={member.key} className="mt-2"><div className="text-sm font-extrabold">{member.name}</div>{member.sets.map((set,i)=><div key={i} className="text-xs text-muted-foreground"><span className="mr-2 inline-block w-4">{member.tracking==="cardio"?"":i+1}</span><span className="font-semibold text-foreground">{formatPerformance(set)}</span></div>)}</div>)}</div>; return <div key={exercise.key}><div className="text-sm font-extrabold">{exercise.name}</div><div className="mt-1 space-y-0.5">{exercise.sets.map((set,index)=><div key={index} className="text-xs tabular-nums text-muted-foreground"><span className="mr-2 inline-block w-4">{exercise.tracking === "cardio" ? "" : index + 1}</span><span className="font-semibold text-foreground">{formatPerformance(set)}</span></div>)}</div></div>})}</div> : <p className="text-sm text-muted-foreground">Detailed sets weren't included in this older share.</p>}
        <Button variant="primary" className="mt-4 w-full" onClick={() => train(post)}><Dumbbell/>Train this workout</Button><Button variant="surface" className="mt-2 w-full" onClick={() => openSave(post)} disabled={!snapshot?.exercises?.length}><BookmarkPlus/>Save workout</Button>
      </div>}
      <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">{reactionCounts.map(({emoji,count,mine})=><button key={emoji} type="button" disabled={reacting === post.id+emoji} onClick={() => void react(post,emoji)} className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-sm transition-colors ${mine ? "border-primary bg-primary/10" : "border-border bg-secondary/60"}`}><span>{emoji}</span>{count > 0 && <span className="text-xs font-bold">{count}</span>}</button>)}{(post.pr_count ?? 0) > 0 && <span className="ml-auto flex items-center gap-1 text-[0.68rem] font-extrabold text-primary"><Flame className="size-3.5"/>strong session</span>}</div>
    </Card>;
  })}</div></>;
}

function PersonRow({ profile, action }: { profile: SocialProfile; action?: React.ReactNode }) { return <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"><Avatar profile={profile}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{profile.name}</div><div className="truncate text-xs text-muted-foreground">@{profile.username}</div></div>{action}</div>; }
function Avatar({ profile }: { profile?: SocialProfile | undefined }) { return <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 font-black text-primary">{profile?.name?.[0]?.toUpperCase() || "R"}</div>; }
function relativeDate(value: string) { const ms=Date.now()-new Date(value).getTime(); const minutes=Math.max(0,Math.floor(ms/60000)); if(minutes<1)return "just now"; if(minutes<60)return `${minutes}m`; const hours=Math.floor(minutes/60); if(hours<24)return `${hours}h`; const days=Math.floor(hours/24); return days<7?`${days}d`:new Date(value).toLocaleDateString("en-AU",{day:"numeric",month:"short"}); }

function Leaderboard({ entries, enabled, monthOffset, userId, onMonthChange, onToggle }: { entries: LeaderboardEntry[]; enabled: boolean; monthOffset: number; userId: string; onMonthChange: (value: number) => void; onToggle: (value: boolean) => void }) {
  const date = new Date(); date.setMonth(date.getMonth() + monthOffset);
  const label = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const podium = entries.slice(0, 3);
  return <div className="mt-5">
    <div className="flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-[.16em] text-primary">Monthly consistency</div><h2 className="mt-1 text-2xl font-black">{label}</h2></div><div className="flex rounded-xl bg-secondary p-1"><button className="rounded-lg px-2.5 py-1.5 text-xs font-bold" onClick={() => onMonthChange(0)}>This month</button><button className="rounded-lg px-2.5 py-1.5 text-xs font-bold" onClick={() => onMonthChange(-1)}>Last</button></div></div>
    <div className="mt-4 rounded-[1.75rem] border border-primary/15 bg-gradient-to-b from-primary/[0.10] to-card p-4 shadow-sm">
      <div className="flex items-end justify-center gap-2">{podium.map((entry, index) => <div key={entry.id} className={`flex flex-1 flex-col items-center ${index === 0 ? "order-2" : index === 1 ? "order-1" : "order-3"}`}><div className={`grid rounded-full bg-card font-black shadow-sm ring-2 ring-primary/15 ${index === 0 ? "size-14 text-lg" : "size-11 text-sm"} place-items-center`}>{entry.name?.[0]?.toUpperCase() ?? "?"}</div><div className="mt-2 max-w-full truncate text-xs font-extrabold">{entry.name || "RECOMP'D user"}</div><div className="text-[0.65rem] text-muted-foreground">@{entry.username}</div><div className={`mt-2 rounded-full px-3 py-1 font-black ${index === 0 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"} {entry.workout_count}</div></div>)}</div>
    </div>
    <div className="mt-3 space-y-2">{entries.map((entry, index) => <div key={entry.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${entry.id === userId ? "border-primary/30 bg-primary/[0.06]" : "border-border bg-card"}`}><div className="w-7 text-center text-sm font-black text-muted-foreground">{index + 1}</div><div className="grid size-9 place-items-center rounded-full bg-secondary font-black">{entry.name?.[0]?.toUpperCase() ?? "?"}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold">{entry.name}{entry.id === userId ? " · You" : ""}</div><div className="truncate text-[0.68rem] text-muted-foreground">@{entry.username}</div></div><div className="text-right"><div className="text-lg font-black">{entry.workout_count}</div><div className="text-[0.62rem] font-bold uppercase text-muted-foreground">workouts</div></div></div>)}</div>
    {!entries.length && <div className="py-12 text-center text-sm text-muted-foreground">No leaderboard activity yet.</div>}
    <div className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-card p-4"><div><div className="text-sm font-extrabold">Appear on leaderboard</div><div className="mt-0.5 text-[0.68rem] text-muted-foreground">Only your monthly workout count is shared.</div></div><button type="button" role="switch" aria-checked={enabled} onClick={() => onToggle(!enabled)} className={`relative h-7 w-12 rounded-full ${enabled ? "bg-primary" : "bg-muted-foreground/25"}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all ${enabled ? "left-6" : "left-1"}`}/></button></div>
  </div>;
}
