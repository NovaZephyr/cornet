-- Community file hoster + Catbox-style temporary hoster

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('community-files', 'community-files', true, 52428800),
  ('community-temp', 'community-temp', false, 104857600)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create table if not exists public.community_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  constraint community_files_name_length check (char_length(original_name) between 1 and 255),
  constraint community_files_size_nonnegative check (size_bytes >= 0)
);

create table if not exists public.community_temp_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint community_temp_files_name_length check (char_length(original_name) between 1 and 255),
  constraint community_temp_files_size_nonnegative check (size_bytes >= 0),
  constraint community_temp_files_expiry check (expires_at > created_at)
);

create index if not exists community_files_user_created_idx
  on public.community_files(user_id, created_at desc);
create index if not exists community_temp_files_user_created_idx
  on public.community_temp_files(user_id, created_at desc);
create index if not exists community_temp_files_expires_idx
  on public.community_temp_files(expires_at);

alter table public.community_files enable row level security;
alter table public.community_temp_files enable row level security;

-- Permanent community files are public to read, but only the owner/admin can mutate metadata.
drop policy if exists "community_files_public_read" on public.community_files;
create policy "community_files_public_read"
  on public.community_files for select
  using (true);

drop policy if exists "community_files_insert_own" on public.community_files;
create policy "community_files_insert_own"
  on public.community_files for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "community_files_delete_own_or_admin" on public.community_files;
create policy "community_files_delete_own_or_admin"
  on public.community_files for delete to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Temporary metadata is private; public access is provided by signed Storage URLs.
drop policy if exists "community_temp_read_own_or_admin" on public.community_temp_files;
create policy "community_temp_read_own_or_admin"
  on public.community_temp_files for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "community_temp_insert_own" on public.community_temp_files;
create policy "community_temp_insert_own"
  on public.community_temp_files for insert to authenticated
  with check (auth.uid() = user_id and expires_at > now());

drop policy if exists "community_temp_delete_own_or_admin" on public.community_temp_files;
create policy "community_temp_delete_own_or_admin"
  on public.community_temp_files for delete to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Storage policies. Paths are always <user-id>/<random-file-name>.
drop policy if exists "community_files_public_read" on storage.objects;
create policy "community_files_public_read"
  on storage.objects for select
  using (bucket_id = 'community-files');

drop policy if exists "community_files_owner_insert" on storage.objects;
create policy "community_files_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "community_files_owner_update" on storage.objects;
create policy "community_files_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'community-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin'))
  )
  with check (
    bucket_id = 'community-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin'))
  );

drop policy if exists "community_files_owner_delete" on storage.objects;
create policy "community_files_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'community-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin'))
  );

drop policy if exists "community_temp_owner_read" on storage.objects;
create policy "community_temp_owner_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'community-temp'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin'))
  );

drop policy if exists "community_temp_owner_insert" on storage.objects;
create policy "community_temp_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-temp'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "community_temp_owner_delete" on storage.objects;
create policy "community_temp_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'community-temp'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin'))
  );

-- Safe cleanup primitive. Schedule this function with Supabase Cron in production.
create or replace function public.cleanup_expired_community_temp_files()
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  removed integer;
begin
  delete from storage.objects o
  using public.community_temp_files f
  where o.bucket_id = 'community-temp'
    and o.name = f.storage_path
    and f.expires_at <= now();

  delete from public.community_temp_files
  where expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.cleanup_expired_community_temp_files() from public;
grant execute on function public.cleanup_expired_community_temp_files() to service_role;
