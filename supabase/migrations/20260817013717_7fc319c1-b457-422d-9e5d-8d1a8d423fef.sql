-- Cornet platform upgrades: persistent playlists, captions, chapters, channel styles and subscriber counts.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS channel_style text NOT NULL DEFAULT 'corenetwork',
  ADD COLUMN IF NOT EXISTS subscriber_count bigint NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_channel_style_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_channel_style_check
  CHECK (channel_style IN ('corenetwork','channel-1','channel-2','cosmic-panda'));

CREATE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username));
CREATE INDEX IF NOT EXISTS profiles_display_name_lower_idx ON public.profiles (lower(display_name));
CREATE INDEX IF NOT EXISTS profiles_subscriber_count_idx ON public.profiles (subscriber_count DESC);
CREATE INDEX IF NOT EXISTS videos_title_lower_idx ON public.videos (lower(title));
CREATE INDEX IF NOT EXISTS videos_created_at_idx ON public.videos (created_at DESC);
CREATE INDEX IF NOT EXISTS videos_views_idx ON public.videos (views DESC);

CREATE OR REPLACE FUNCTION public.sync_subscriber_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET subscriber_count = subscriber_count + 1 WHERE id = NEW.channel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET subscriber_count = GREATEST(subscriber_count - 1, 0) WHERE id = OLD.channel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_sync_count_insert ON public.subscriptions;
CREATE TRIGGER subscriptions_sync_count_insert AFTER INSERT ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_subscriber_count();
DROP TRIGGER IF EXISTS subscriptions_sync_count_delete ON public.subscriptions;
CREATE TRIGGER subscriptions_sync_count_delete AFTER DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_subscriber_count();

UPDATE public.profiles p
SET subscriber_count = (SELECT count(*) FROM public.subscriptions s WHERE s.channel_id = p.id);

CREATE TABLE IF NOT EXISTS public.video_captions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  label text NOT NULL,
  caption_path text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_captions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_captions TO authenticated;
ALTER TABLE public.video_captions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "captions_public_read" ON public.video_captions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND (v.visibility = 'public' OR v.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "captions_owner_write" ON public.video_captions FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS video_captions_video_idx ON public.video_captions(video_id);

CREATE TABLE IF NOT EXISTS public.video_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_seconds integer NOT NULL CHECK (start_seconds >= 0),
  end_seconds integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_seconds IS NULL OR end_seconds > start_seconds)
);
GRANT SELECT ON public.video_chapters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_chapters TO authenticated;
ALTER TABLE public.video_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters_public_read" ON public.video_chapters FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND (v.visibility = 'public' OR v.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "chapters_owner_write" ON public.video_chapters FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS video_chapters_video_sort_idx ON public.video_chapters(video_id, sort_order, start_seconds);

CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.playlists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "playlists_public_or_owner_read" ON public.playlists FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "playlists_owner_insert" ON public.playlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "playlists_owner_update" ON public.playlists FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "playlists_owner_delete" ON public.playlists FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER playlists_touch BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, video_id)
);
GRANT SELECT ON public.playlist_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_items TO authenticated;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "playlist_items_read" ON public.playlist_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND (p.visibility = 'public' OR p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "playlist_items_owner_write" ON public.playlist_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE INDEX IF NOT EXISTS playlist_items_playlist_position_idx ON public.playlist_items(playlist_id, position);

-- The original migration creates this function as void. Drop it before changing
-- the return type so PostgreSQL can replace it safely with the atomic counter
-- that returns the new value to the client.
DROP FUNCTION IF EXISTS public.increment_views(uuid);
CREATE FUNCTION public.increment_views(_video_id uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_views bigint;
BEGIN
  UPDATE public.videos SET views = views + 1 WHERE id = _video_id RETURNING views INTO next_views;
  RETURN COALESCE(next_views, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_views(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_channels(search_text text, result_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, username text, display_name text, avatar_path text, is_verified boolean, subscriber_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_path, p.is_verified, p.subscriber_count
  FROM public.profiles p
  WHERE search_text IS NULL OR search_text = ''
     OR p.username ILIKE '%' || search_text || '%'
     OR p.display_name ILIKE '%' || search_text || '%'
  ORDER BY p.subscriber_count DESC, p.created_at DESC
  LIMIT GREATEST(result_limit, 1);
$$;
GRANT EXECUTE ON FUNCTION public.search_channels(text, integer) TO anon, authenticated;