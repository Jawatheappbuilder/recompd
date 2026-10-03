-- Social monthly leaderboard: opt-in counts only, never exposes workout details.
alter table public.profiles add column if not exists leaderboard_enabled boolean not null default true;

create or replace function public.get_friends_monthly_leaderboard(month_start timestamptz, month_end timestamptz)
returns table(id uuid, name text, username text, leaderboard_enabled boolean, workout_count bigint)
language sql security definer set search_path = public
as $$
  with visible_people as (
    select auth.uid() as id
    union
    select case when f.sender_id = auth.uid() then f.receiver_id else f.sender_id end
    from public.friendships f
    where f.status = 'accepted' and (f.sender_id = auth.uid() or f.receiver_id = auth.uid())
  )
  select p.id, p.name, p.username, p.leaderboard_enabled, count(w.id)::bigint
  from visible_people v join public.profiles p on p.id = v.id
  left join public.workouts w on w.user_id = p.id and w.started_at >= month_start and w.started_at < month_end
  where p.leaderboard_enabled = true and p.username is not null
  group by p.id, p.name, p.username, p.leaderboard_enabled
  order by count(w.id) desc, lower(p.name), p.id;
$$;
revoke all on function public.get_friends_monthly_leaderboard(timestamptz,timestamptz) from public;
grant execute on function public.get_friends_monthly_leaderboard(timestamptz,timestamptz) to authenticated;
