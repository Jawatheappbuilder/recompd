create or replace function public.get_owner_member_directory()
returns table(id uuid, name text, username text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select p.id, p.name, p.username, p.created_at
  from public.profiles p
  where auth.uid() = '0fac7a7b-5bec-4614-adbd-5d69c8f1f97b'::uuid
  order by p.created_at desc;
$$;

revoke all on function public.get_owner_member_directory() from public;
grant execute on function public.get_owner_member_directory() to authenticated;
