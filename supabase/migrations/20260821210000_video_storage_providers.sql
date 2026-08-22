alter table public.videos
  add column if not exists video_storage_provider text not null default 'supabase';

alter table public.videos
  add column if not exists video_storage_key text;

alter table public.videos
  drop constraint if exists videos_video_storage_provider_check;

alter table public.videos
  add constraint videos_video_storage_provider_check
  check (video_storage_provider in ('supabase', 'backblaze', 'cloudinary'));

create index if not exists videos_video_storage_provider_idx
  on public.videos(video_storage_provider);

update public.videos
set
  video_storage_provider = case
    when video_path like 'b2/%' then 'backblaze'
    when video_path like 'https://res.cloudinary.com/%/video/%' then 'cloudinary'
    else 'supabase'
  end,
  video_storage_key = case
    when video_path like 'b2/%' then substring(video_path from 4)
    else video_path
  end;

create or replace function public.sync_video_storage_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.video_path like 'b2/%' then
    new.video_storage_provider := 'backblaze';
    new.video_storage_key := substring(new.video_path from 4);
  elsif new.video_path like 'https://res.cloudinary.com/%/video/%' then
    new.video_storage_provider := 'cloudinary';
    new.video_storage_key := new.video_path;
  else
    new.video_storage_provider := 'supabase';
    new.video_storage_key := new.video_path;
  end if;
  return new;
end;
$$;

drop trigger if exists videos_sync_storage_metadata on public.videos;
create trigger videos_sync_storage_metadata
before insert or update of video_path on public.videos
for each row execute function public.sync_video_storage_metadata();
