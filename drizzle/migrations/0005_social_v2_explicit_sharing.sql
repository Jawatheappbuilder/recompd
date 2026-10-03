-- Social V2: explicit, privacy-safe workout sharing
-- Friends see only social post snapshots, never the owner's private workout history.
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text not null,
  name text not null,
  started_at timestamptz not null,
  duration_sec integer not null default 0,
  exercise_count integer not null default 0,
  set_count integer not null default 0,
  exercise_names text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, workout_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;

alter table public.social_posts enable row level security;

drop policy if exists "Owners manage social posts" on public.social_posts;
create policy "Owners manage social posts" on public.social_posts
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Friends read social posts" on public.social_posts;
create policy "Friends read social posts" on public.social_posts
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.sender_id = auth.uid() and f.receiver_id = social_posts.user_id)
        or (f.receiver_id = auth.uid() and f.sender_id = social_posts.user_id)
      )
  )
);

-- Social V1 temporarily granted accepted friends direct access to all completed workouts.
-- Remove that access now that sharing is explicit.
drop policy if exists "Friends read workouts" on public.workouts;
drop policy if exists "Friends read workout exercises" on public.workout_exercises;
