-- Social V1: private usernames, friend requests and friend-only workout feed
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_unique on public.profiles (lower(username)) where username is not null;
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,24}$');

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (sender_id <> receiver_id),
  constraint friendships_unique_direction unique(sender_id, receiver_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;

alter table public.friendships enable row level security;

drop policy if exists "Profiles discoverable by signed in users" on public.profiles;
create policy "Profiles discoverable by signed in users" on public.profiles for select to authenticated using (true);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists "Users see own friendships" on public.friendships;
create policy "Users see own friendships" on public.friendships for select to authenticated using (sender_id=auth.uid() or receiver_id=auth.uid());
drop policy if exists "Users send friend requests" on public.friendships;
create policy "Users send friend requests" on public.friendships for insert to authenticated with check (sender_id=auth.uid() and receiver_id<>auth.uid());
drop policy if exists "Receiver accepts requests" on public.friendships;
create policy "Receiver accepts requests" on public.friendships for update to authenticated using (receiver_id=auth.uid()) with check (receiver_id=auth.uid());
drop policy if exists "Either user removes friendship" on public.friendships;
create policy "Either user removes friendship" on public.friendships for delete to authenticated using (sender_id=auth.uid() or receiver_id=auth.uid());

-- Friends can read each other's completed workouts/exercises. Existing owner policies remain in place.
drop policy if exists "Friends read workouts" on public.workouts;
create policy "Friends read workouts" on public.workouts for select to authenticated using (
  user_id=auth.uid() or exists(select 1 from public.friendships f where f.status='accepted' and ((f.sender_id=auth.uid() and f.receiver_id=workouts.user_id) or (f.receiver_id=auth.uid() and f.sender_id=workouts.user_id)))
);
drop policy if exists "Friends read workout exercises" on public.workout_exercises;
create policy "Friends read workout exercises" on public.workout_exercises for select to authenticated using (
  user_id=auth.uid() or exists(select 1 from public.friendships f where f.status='accepted' and ((f.sender_id=auth.uid() and f.receiver_id=workout_exercises.user_id) or (f.receiver_id=auth.uid() and f.sender_id=workout_exercises.user_id)))
);