create or replace function public.get_owner_admin_dashboard()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select case when auth.uid() = '0fac7a7b-5bec-4614-adbd-5d69c8f1f97b'::uuid then jsonb_build_object(
    'members', (select count(*) from profiles),
    'new_7d', (select count(*) from profiles where created_at >= now() - interval '7 days'),
    'new_30d', (select count(*) from profiles where created_at >= now() - interval '30 days'),
    'active_7d', (select count(distinct user_id) from workouts where started_at >= now() - interval '7 days'),
    'active_30d', (select count(distinct user_id) from workouts where started_at >= now() - interval '30 days'),
    'workouts_today', (select count(*) from workouts where started_at >= date_trunc('day', now())),
    'workouts_7d', (select count(*) from workouts where started_at >= now() - interval '7 days'),
    'workouts_30d', (select count(*) from workouts where started_at >= now() - interval '30 days'),
    'social_users', (select count(*) from profiles where username is not null),
    'leaderboard_users', (select count(*) from profiles where leaderboard_enabled = true),
    'friendships', (select count(*) from friendships where status = 'accepted'),
    'shared_workouts', (select count(*) from social_posts),
    'reactions', (select count(*) from social_reactions),
    'recent_members', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (select p.id,p.name,p.username,p.created_at,(select max(w.started_at) from workouts w where w.user_id=p.id) last_workout_at,(select count(*) from workouts w where w.user_id=p.id) workout_count from profiles p order by p.created_at desc limit 20) x),
    'daily_workouts', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (select d::date day,(select count(*) from workouts w where w.started_at >= d and w.started_at < d + interval '1 day') count from generate_series(date_trunc('day',now()) - interval '6 days',date_trunc('day',now()),interval '1 day') d) x)
  ) else null end;
$$;
revoke all on function public.get_owner_admin_dashboard() from public;
grant execute on function public.get_owner_admin_dashboard() to authenticated;
