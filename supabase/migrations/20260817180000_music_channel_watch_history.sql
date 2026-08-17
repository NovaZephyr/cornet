alter table public.profiles add column if not exists is_music_channel boolean not null default false;

create table if not exists public.user_watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  watched_at timestamptz not null default now(),
  progress_seconds integer not null default 0,
  completed boolean not null default false
);

create index if not exists user_watch_history_user_watched_idx on public.user_watch_history(user_id, watched_at desc);
create index if not exists user_watch_history_video_idx on public.user_watch_history(video_id);

alter table public.user_watch_history enable row level security;

drop policy if exists "watch history select own" on public.user_watch_history;
drop policy if exists "watch history insert own" on public.user_watch_history;
drop policy if exists "watch history update own" on public.user_watch_history;
drop policy if exists "watch history delete own" on public.user_watch_history;

create policy "watch history select own" on public.user_watch_history for select using (auth.uid() = user_id);
create policy "watch history insert own" on public.user_watch_history for insert with check (auth.uid() = user_id);
create policy "watch history update own" on public.user_watch_history for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "watch history delete own" on public.user_watch_history for delete using (auth.uid() = user_id);

create or replace function public.record_watch_history(_video_id uuid, _progress_seconds integer default 0, _completed boolean default false)
returns uuid language plpgsql security invoker set search_path = public
as $$
declare uid uuid := auth.uid(); history_id uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.videos where id = _video_id) then raise exception 'video_not_found'; end if;
  select id into history_id from public.user_watch_history where user_id = uid and video_id = _video_id and watched_at > now() - interval '30 minutes' order by watched_at desc limit 1;
  if history_id is not null then
    update public.user_watch_history set watched_at = now(), progress_seconds = greatest(0, coalesce(_progress_seconds, 0)), completed = coalesce(_completed, false) where id = history_id;
  else
    insert into public.user_watch_history(user_id, video_id, progress_seconds, completed) values(uid, _video_id, greatest(0, coalesce(_progress_seconds, 0)), coalesce(_completed, false)) returning id into history_id;
  end if;
  return history_id;
end;
$$;

revoke all on function public.record_watch_history(uuid, integer, boolean) from public;
grant execute on function public.record_watch_history(uuid, integer, boolean) to authenticated;
