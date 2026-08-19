-- Shorts: creator opt-out plus stored media orientation when available.
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS is_shorts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_width integer,
  ADD COLUMN IF NOT EXISTS video_height integer;

CREATE INDEX IF NOT EXISTS videos_shorts_enabled_created_idx
  ON public.videos (is_shorts_enabled, created_at DESC);

CREATE INDEX IF NOT EXISTS videos_orientation_idx
  ON public.videos (video_width, video_height);
