create table if not exists public.home_spotlight (
  id boolean primary key default true check (id = true),
  channel_id uuid not null references public.profiles(id) on delete cascade,
  custom_text text not null default '',
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.home_spotlight enable row level security;

drop policy if exists "home_spotlight_public_read" on public.home_spotlight;
create policy "home_spotlight_public_read" on public.home_spotlight
for select to anon, authenticated
using (enabled = true);

drop policy if exists "home_spotlight_admin_manage" on public.home_spotlight;
create policy "home_spotlight_admin_manage" on public.home_spotlight
for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

insert into public.home_spotlight (id, channel_id, custom_text, enabled)
select true, p.id, '', false
from public.profiles p
order by p.created_at asc
limit 1
on conflict (id) do nothing;
