import { supabase } from "@/integrations/supabase/client";
import type { CompletedWorkout } from "@/lib/training-data";

export type SocialProfile = { id: string; name: string; username: string };
export type FriendRequest = { id: string; sender_id: string; receiver_id: string; status: string; created_at: string };
export type SocialPost = {
  id: string; user_id: string; workout_id: string; name: string; started_at: string;
  duration_sec: number; exercise_count: number; set_count: number; exercise_names: string[];
  created_at: string; profile?: SocialProfile;
};

export function cleanUsername(value: string) {
  return value.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "").slice(0, 24);
}
export async function getMySocialProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("id,name,username").eq("id", userId).single();
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
export async function setUsername(userId: string, username: string) {
  const clean = cleanUsername(username);
  if (clean.length < 3) throw new Error("Username must be at least 3 characters.");
  const { error } = await supabase.from("profiles").update({ username: clean }).eq("id", userId);
  if (error) throw error;
  return clean;
}
export async function searchPeople(query: string, userId: string) {
  const q = cleanUsername(query);
  if (q.length < 2) return [] as SocialProfile[];
  const { data, error } = await supabase.from("profiles").select("id,name,username").neq("id", userId).not("username","is",null).ilike("username", `%${q}%`).limit(20);
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
  const { data: profiles, error: pe } = await supabase.from("profiles").select("id,name,username").in("id",ids);
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
  const { data: profiles, error: pe } = await supabase.from("profiles").select("id,name,username").in("id",ids);
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
  return (data ?? []).map((post) => ({ ...post, profile: profileMap.get(post.user_id) })) as SocialPost[];
}

export async function getMySharedWorkoutIds(userId: string) {
  const { data, error } = await supabase.from("social_posts").select("workout_id").eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.workout_id));
}

export async function shareWorkoutToSocial(userId: string, workout: CompletedWorkout) {
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
  }, { onConflict: "user_id,workout_id" });
  if (error) throw error;
}

export async function unshareWorkoutFromSocial(userId: string, workoutId: string) {
  const { error } = await supabase.from("social_posts").delete().eq("user_id", userId).eq("workout_id", workoutId);
  if (error) throw error;
}
