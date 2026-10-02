import { supabase } from "@/integrations/supabase/client";

export type SocialProfile = { id: string; name: string; username: string };
export type FriendRequest = { id: string; sender_id: string; receiver_id: string; status: string; created_at: string };
export type FeedWorkout = { id: string; name: string; started_at: string; duration_sec: number; user_id: string; profile?: SocialProfile; exerciseCount?: number; setCount?: number };

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
  const ids = friends.map(f=>f.id);
  if (!ids.length) return [] as FeedWorkout[];
  const { data, error } = await supabase.from("workouts").select("id,name,started_at,duration_sec,user_id").in("user_id",ids).order("started_at",{ascending:false}).limit(40);
  if (error) throw error;
  const workouts = (data ?? []) as FeedWorkout[];
  if (!workouts.length) return workouts;
  const workoutIds = workouts.map(w=>w.id);
  const { data: ex } = await supabase.from("workout_exercises").select("workout_id,sets").in("workout_id",workoutIds);
  return workouts.map(w=>({ ...w, profile: friends.find(f=>f.id===w.user_id), exerciseCount:(ex??[]).filter(e=>e.workout_id===w.id).length, setCount:(ex??[]).filter(e=>e.workout_id===w.id).reduce((n,e)=>n+(Array.isArray(e.sets)?e.sets.length:0),0) }));
}
