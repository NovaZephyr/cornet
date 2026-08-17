alter table public.community_files
  add column if not exists provider text not null default 'supabase',
  add column if not exists provider_asset_id text,
  add column if not exists provider_public_id text,
  add column if not exists secure_url text;

alter table public.community_temp_files
  add column if not exists provider text not null default 'supabase',
  add column if not exists provider_asset_id text,
  add column if not exists provider_public_id text,
  add column if not exists secure_url text;

create index if not exists community_files_provider_asset_idx on public.community_files(provider, provider_asset_id);
create index if not exists community_temp_provider_asset_idx on public.community_temp_files(provider, provider_asset_id);

-- Existing rows remain marked as Supabase. New uploads from the Cloudinary function are marked cloudinary.
