ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Entertainment';
CREATE INDEX IF NOT EXISTS videos_category_idx ON public.videos(category);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS channel_style text NOT NULL DEFAULT 'corenetwork';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_channel_style_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_channel_style_check
  CHECK (channel_style IN ('corenetwork', 'channel-1', 'channel-2', 'cosmic-panda'));

CREATE INDEX IF NOT EXISTS profiles_channel_style_idx
  ON public.profiles(channel_style);

UPDATE public.profiles
SET channel_style = 'corenetwork'
WHERE channel_style IS NULL
   OR channel_style NOT IN ('corenetwork', 'channel-1', 'channel-2', 'cosmic-panda');