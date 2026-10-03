-- Social V3: richer workout snapshots and lightweight reactions
alter table public.social_posts
  add column if not exists pr_count integer not null default 0,
  add column if not exists workout_snapshot jsonb;

create table if not exists public.social_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('💪','🔥','👏')),
  created_at timestamptz not null default now(),
  unique(post_id, user_id, emoji)
);

grant select, insert, delete on public.social_reactions to authenticated;
grant all on public.social_reactions to service_role;
alter table public.social_reactions enable row level security;

drop policy if exists "Friends read social reactions" on public.social_reactions;
create policy "Friends read social reactions" on public.social_reactions for select to authenticated using (
  exists (
    select 1 from public.social_posts p
    where p.id = social_reactions.post_id
      and (
        p.user_id = auth.uid()
        or exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.sender_id = auth.uid() and f.receiver_id = p.user_id)
              or (f.receiver_id = auth.uid() and f.sender_id = p.user_id))
        )
      )
  )
);

drop policy if exists "Users add own social reactions" on public.social_reactions;
create policy "Users add own social reactions" on public.social_reactions for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.social_posts p
    where p.id = social_reactions.post_id
      and (p.user_id = auth.uid() or exists (
        select 1 from public.friendships f where f.status='accepted'
          and ((f.sender_id=auth.uid() and f.receiver_id=p.user_id) or (f.receiver_id=auth.uid() and f.sender_id=p.user_id))
      ))
  )
);

drop policy if exists "Users delete own social reactions" on public.social_reactions;
create policy "Users delete own social reactions" on public.social_reactions for delete to authenticated using (user_id = auth.uid());
