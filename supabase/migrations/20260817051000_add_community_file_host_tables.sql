create table if not exists public.community_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists community_files_user_id_created_at_idx
  on public.community_files(user_id, created_at desc);

create table if not exists public.community_temp_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists community_temp_files_user_id_created_at_idx
  on public.community_temp_files(user_id, created_at desc);
create index if not exists community_temp_files_expires_at_idx
  on public.community_temp_files(expires_at);

alter table public.community_files enable row level security;
alter table public.community_temp_files enable row level security;

drop policy if exists "community_files_select_own" on public.community_files;
create policy "community_files_select_own" on public.community_files
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "community_files_insert_own" on public.community_files;
create policy "community_files_insert_own" on public.community_files
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "community_files_delete_own" on public.community_files;
create policy "community_files_delete_own" on public.community_files
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "community_temp_files_select_own" on public.community_temp_files;
create policy "community_temp_files_select_own" on public.community_temp_files
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "community_temp_files_insert_own" on public.community_temp_files;
create policy "community_temp_files_insert_own" on public.community_temp_files
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "community_temp_files_delete_own" on public.community_temp_files;
create policy "community_temp_files_delete_own" on public.community_temp_files
  for delete to authenticated using (auth.uid() = user_id);
