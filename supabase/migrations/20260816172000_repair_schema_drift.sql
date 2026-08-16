-- Repair schema drift observed in production logs.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscriber_count bigint NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS profiles_subscriber_count_idx ON public.profiles(subscriber_count DESC);

UPDATE public.profiles p
SET subscriber_count = (
  SELECT count(*) FROM public.subscriptions s WHERE s.channel_id = p.id
);

CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, video_id)
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.playlists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT SELECT ON public.playlist_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_items TO authenticated;

DROP POLICY IF EXISTS playlists_public_or_owner_read ON public.playlists;
CREATE POLICY playlists_public_or_owner_read ON public.playlists
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS playlists_owner_insert ON public.playlists;
CREATE POLICY playlists_owner_insert ON public.playlists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS playlists_owner_update ON public.playlists;
CREATE POLICY playlists_owner_update ON public.playlists
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS playlists_owner_delete ON public.playlists;
CREATE POLICY playlists_owner_delete ON public.playlists
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS playlist_items_read ON public.playlist_items;
CREATE POLICY playlist_items_read ON public.playlist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id
        AND (p.visibility = 'public' OR p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
    )
  );
DROP POLICY IF EXISTS playlist_items_owner_write ON public.playlist_items;
CREATE POLICY playlist_items_owner_write ON public.playlist_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id
        AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id
        AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
    )
  );

CREATE INDEX IF NOT EXISTS playlist_items_playlist_position_idx ON public.playlist_items(playlist_id, position);
CREATE INDEX IF NOT EXISTS playlist_items_video_idx ON public.playlist_items(video_id);
