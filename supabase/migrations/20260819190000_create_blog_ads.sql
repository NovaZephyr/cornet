create table if not exists public.blog_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_path text,
  target_url text not null,
  slot text not null default 'article-top' check (slot in ('article-top','article-inline','article-sidebar','feed-between')),
  status text not null default 'draft' check (status in ('draft','active','paused')),
  starts_at timestamptz,
  ends_at timestamptz,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_ads_active_slot_idx on public.blog_ads(slot, status, starts_at, ends_at);

alter table public.blog_ads enable row level security;

drop policy if exists "Public can view active blog ads" on public.blog_ads;
create policy "Public can view active blog ads" on public.blog_ads
for select to anon, authenticated
using (status = 'active' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));

drop policy if exists "Staff can manage blog ads" on public.blog_ads;
create policy "Staff can manage blog ads" on public.blog_ads
for all to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','moderator')))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','moderator')));

create or replace function public.touch_blog_ads_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_blog_ads_updated_at on public.blog_ads;
create trigger trg_blog_ads_updated_at before update on public.blog_ads for each row execute function public.touch_blog_ads_updated_at();

create or replace function public.record_blog_ad_impression(_ad_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.blog_ads set impressions = impressions + 1 where id = _ad_id and status = 'active';
$$;

create or replace function public.record_blog_ad_click(_ad_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.blog_ads set clicks = clicks + 1 where id = _ad_id and status = 'active';
$$;

grant execute on function public.record_blog_ad_impression(uuid) to anon, authenticated;
grant execute on function public.record_blog_ad_click(uuid) to anon, authenticated;
