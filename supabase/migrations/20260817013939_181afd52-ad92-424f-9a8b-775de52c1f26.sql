-- Hashtags
CREATE TABLE IF NOT EXISTS public.hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.video_hashtags (
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, hashtag_id)
);
CREATE TABLE IF NOT EXISTS public.community_post_hashtags (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);
GRANT SELECT ON public.hashtags, public.video_hashtags, public.community_post_hashtags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hashtags, public.video_hashtags, public.community_post_hashtags TO authenticated;
GRANT ALL ON public.hashtags, public.video_hashtags, public.community_post_hashtags TO service_role;

CREATE INDEX IF NOT EXISTS hashtags_name_idx ON public.hashtags(name);
CREATE INDEX IF NOT EXISTS video_hashtags_hashtag_idx ON public.video_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS community_post_hashtags_hashtag_idx ON public.community_post_hashtags(hashtag_id);

ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hashtags_public_read ON public.hashtags;
CREATE POLICY hashtags_public_read ON public.hashtags FOR SELECT USING (true);
DROP POLICY IF EXISTS hashtags_authenticated_insert ON public.hashtags;
CREATE POLICY hashtags_authenticated_insert ON public.hashtags FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS video_hashtags_public_read ON public.video_hashtags;
CREATE POLICY video_hashtags_public_read ON public.video_hashtags FOR SELECT USING (true);
DROP POLICY IF EXISTS video_hashtags_owner_write ON public.video_hashtags;
CREATE POLICY video_hashtags_owner_write ON public.video_hashtags FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND (v.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND (v.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
DROP POLICY IF EXISTS post_hashtags_public_read ON public.community_post_hashtags;
CREATE POLICY post_hashtags_public_read ON public.community_post_hashtags FOR SELECT USING (true);
DROP POLICY IF EXISTS post_hashtags_owner_write ON public.community_post_hashtags;
CREATE POLICY post_hashtags_owner_write ON public.community_post_hashtags FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Channel customization
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS channel_primary_color text NOT NULL DEFAULT '#1f4fa3',
  ADD COLUMN IF NOT EXISTS channel_secondary_color text NOT NULL DEFAULT '#2aa84a',
  ADD COLUMN IF NOT EXISTS channel_surface_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS channel_text_color text NOT NULL DEFAULT '#222222',
  ADD COLUMN IF NOT EXISTS channel_info_layout text NOT NULL DEFAULT 'left',
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'es';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_channel_info_layout_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_channel_info_layout_check
  CHECK (channel_info_layout IN ('left','right','top','hidden'));
CREATE INDEX IF NOT EXISTS profiles_channel_info_layout_idx ON public.profiles(channel_info_layout);

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS age_restricted boolean NOT NULL DEFAULT false;