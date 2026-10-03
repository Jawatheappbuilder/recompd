import { supabase } from "@/integrations/supabase/client";
import type { CompletedWorkout } from "@/lib/training-data";
import type { Json } from "@/integrations/supabase/types";

export type SocialProfile = { id: string; name: string; username: string; leaderboard_enabled?: boolean };
export type LeaderboardEntry = SocialProfile & { workout_count: number };
export type OwnerMember = { id: string; name: string; username: string | null; created_at: string };
export type FriendRequest = { id: string; sender_id: string; receiver_id: string; status: string; created_at: string };
export type SocialPost = {
  id: string; user_id: string; workout_id: string; name: string; started_at: string;
  duration_sec: number; exercise_count: number; set_count: number; exercise_names: string[];
  created_at: string; pr_count?: number; workout_snapshot?: CompletedWorkout | null; profile?: SocialProfile;
  reactions?: SocialReaction[];
};
export type SocialReaction = { id: string; post_id: string; user_id: string; emoji: string; created_at: string };

export function cleanUsername(value: string) {
  return value.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "").slice(0, 24);
}
export async function getMySocialProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("id,name,username,leaderboard_enabled").eq("id", userId).single();
  if (error) throw error;
  return data as SocialProfile & { username: string | null };
}
export async function usernameAvailable(username: string, userId: string) {
  const clean = cleanUsername(username);
  if (clean.length < 3) return false;
  const { data, error } = await supabase.from("profiles").select("id").eq("username", clean).neq("id", userId).limit(1);
  if (error) throw error;
  return !data?.length;
}
export async function setUsername(userId: string, username: string, leaderboardEnabled = true) {
  const clean = cleanUsername(username);
  if (clean.length < 3) throw new Error("Username must be at least 3 characters.");
  const { error } = await supabase.from("profiles").update({ username: clean, leaderboard_enabled: leaderboardEnabled }).eq("id", userId);
  if (error) throw error;
  return clean;
}
export async function getOwnerMemberDirectory() {
  const { data, error } = await supabase.rpc("get_owner_member_directory");
  if (error) throw error;
  return (data ?? []) as OwnerMember[];
}
export async function searchPeople(query: string, userId: string) {
  const q = cleanUsername(query);
  if (q.length < 2) return [] as SocialProfile[];
  const { data, error } = await supabase.from("profiles").select("id,name,username,leaderboard_enabled").neq("id", userId).not("username","is",null).ilike("username", `%${q}%`).limit(20);
  if (error) throw error;
  return (data ?? []) as SocialProfile[];
}
export async function sendFriendRequest(senderId: string, receiverId: string) {
  const { error } = await supabase.from("friendships").insert({ sender_id: senderId, receiver_id: receiverId, status: "pending" });
  if (error && error.code !== "23505") throw error;
}
export async function getFriendRequests(userId: string) {
  const { data, error } = await supabase.from("friendships").select("id,sender_id,receiver_id,status,created_at").eq("receiver_id", userId).eq("status","pending").order("created_at",{ascending:false});
  if (error) throw error;
  const rows = (data ?? []) as FriendRequest[];
  const ids = rows.map(r=>r.sender_id);
  if (!ids.length) return [] as Array<FriendRequest & { profile: SocialProfile }>;
  const { data: profiles, error: pe } = await supabase.from("profiles").select("id,name,username,leaderboard_enabled").in("id",ids);
  if (pe) throw pe;
  return rows.map(r=>({ ...r, profile: (profiles ?? []).find(p=>p.id===r.sender_id) as SocialProfile })).filter(r=>r.profile);
}
export async function respondToFriendRequest(id: string, accept: boolean) {
  if (accept) {
    const { error } = await supabase.from("friendships").update({ status:"accepted" }).eq("id",id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("friendships").delete().eq("id",id);
    if (error) throw error;
  }
}
export async function getFriends(userId: string) {
  const { data, error } = await supabase.from("friendships").select("sender_id,receiver_id").eq("status","accepted").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  if (error) throw error;
  const ids = (data ?? []).map(r=>r.sender_id===userId?r.receiver_id:r.sender_id);
  if (!ids.length) return [] as SocialProfile[];
  const { data: profiles, error: pe } = await supabase.from("profiles").select("id,name,username,leaderboard_enabled").in("id",ids);
  if (pe) throw pe;
  return (profiles ?? []) as SocialProfile[];
}

export async function getSocialFeed(userId: string) {
  const friends = await getFriends(userId);
  const friendIds = friends.map((friend) => friend.id);
  const visibleIds = [userId, ...friendIds];
  const { data, error } = await supabase.from("social_posts").select("*").in("user_id", visibleIds).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  const profileMap = new Map(friends.map((profile) => [profile.id, profile]));
  if (!profileMap.has(userId)) {
    const mine = await getMySocialProfile(userId);
    profileMap.set(userId, mine as SocialProfile);
  }
  const posts = (data ?? []).map((post) => ({ ...post, profile: profileMap.get(post.user_id) })) as SocialPost[];
  const postIds = posts.map((post) => post.id);
  if (!postIds.length) return posts;
  const { data: reactions, error: reactionError } = await supabase.from("social_reactions").select("*").in("post_id", postIds).order("created_at", { ascending: true });
  if (reactionError) console.warn("[social] reactions unavailable", reactionError);
  return posts.map((post) => ({ ...post, reactions: ((reactions ?? []) as SocialReaction[]).filter((reaction) => reaction.post_id === post.id) }));
}

export async function getMySharedWorkoutIds(userId: string) {
  const { data, error } = await supabase.from("social_posts").select("workout_id").eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.workout_id));
}

export async function shareWorkoutToSocial(userId: string, workout: CompletedWorkout, prCount = 0) {
  const strengthSets = workout.exercises.reduce((total, exercise) => total + (exercise.tracking === "cardio" ? 0 : exercise.sets.length), 0);
  const { error } = await supabase.from("social_posts").upsert({
    user_id: userId,
    workout_id: workout.id,
    name: workout.name,
    started_at: new Date(workout.startedAt).toISOString(),
    duration_sec: workout.durationSec,
    exercise_count: workout.exercises.length,
    set_count: strengthSets,
    exercise_names: workout.exercises.map((exercise) => exercise.name),
    pr_count: prCount,
    workout_snapshot: workout as unknown as Json,
  }, { onConflict: "user_id,workout_id" });
  if (error) throw error;
}

export async function unshareWorkoutFromSocial(userId: string, workoutId: string) {
  const { error } = await supabase.from("social_posts").delete().eq("user_id", userId).eq("workout_id", workoutId);
  if (error) throw error;
}

export async function toggleSocialReaction(userId: string, postId: string, emoji: string) {
  const { data: existing, error: findError } = await supabase.from("social_reactions").select("id").eq("post_id", postId).eq("user_id", userId).eq("emoji", emoji).maybeSingle();
  if (findError) throw findError;
  if (existing?.id) {
    const { error } = await supabase.from("social_reactions").delete().eq("id", existing.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from("social_reactions").insert({ post_id: postId, user_id: userId, emoji });
  if (error) throw error;
  return true;
}

export async function setLeaderboardEnabled(userId: string, enabled: boolean) {
  const { error } = await supabase.from("profiles").update({ leaderboard_enabled: enabled }).eq("id", userId);
  if (error) throw error;
}

export async function getMonthlyLeaderboard(userId: string, monthOffset = 0) {
  const date = new Date();
  const start = new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
  const end = new Date(date.getFullYear(), date.getMonth() + monthOffset + 1, 1);
  const { data, error } = await supabase.rpc("get_friends_monthly_leaderboard", {
    month_start: start.toISOString(), month_end: end.toISOString(),
  });
  if (error) throw error;
  return ((data ?? []) as LeaderboardEntry[]).map((row) => ({ ...row, workout_count: Number(row.workout_count) || 0 }));
}
