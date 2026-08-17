alter table public.community_files
  alter column share_token set default encode(gen_random_bytes(18), 'base64url');

update public.community_files
set share_token = encode(gen_random_bytes(18), 'base64url')
where share_token is null or share_token = '';

alter table public.community_files
  alter column share_token set not null;

create unique index if not exists community_files_share_token_idx
  on public.community_files (share_token);

create index if not exists community_files_storage_path_idx
  on public.community_files (storage_path);

create index if not exists community_temp_files_storage_path_idx
  on public.community_temp_files (storage_path);

create index if not exists community_temp_files_expires_at_idx
  on public.community_temp_files (expires_at);
