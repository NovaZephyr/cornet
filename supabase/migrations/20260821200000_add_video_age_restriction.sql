ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS age_restricted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS videos_age_restricted_idx
  ON public.videos (age_restricted)
  WHERE age_restricted = true;

COMMENT ON COLUMN public.videos.age_restricted IS 'Requires an 18+ confirmation gate before playback.';
