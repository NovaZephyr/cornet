-- Per-channel customization. These settings are only consumed by the retro 2012 channel renderer.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS channel_primary_color text NOT NULL DEFAULT '#1f4fa3',
  ADD COLUMN IF NOT EXISTS channel_secondary_color text NOT NULL DEFAULT '#2aa84a',
  ADD COLUMN IF NOT EXISTS channel_surface_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS channel_text_color text NOT NULL DEFAULT '#222222',
  ADD COLUMN IF NOT EXISTS channel_info_layout text NOT NULL DEFAULT 'left';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_channel_info_layout_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_channel_info_layout_check
  CHECK (channel_info_layout IN ('left','right','top','hidden'));

CREATE INDEX IF NOT EXISTS profiles_channel_info_layout_idx
  ON public.profiles(channel_info_layout);
