alter table public.blog_ads
  add column if not exists campaign_type text not null default 'advertisement';

alter table public.blog_ads
  drop constraint if exists blog_ads_campaign_type_check;

alter table public.blog_ads
  add constraint blog_ads_campaign_type_check
  check (campaign_type in ('advertisement', 'event'));

create index if not exists blog_ads_campaign_type_idx
  on public.blog_ads(campaign_type);
