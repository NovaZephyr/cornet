-- Cornet community post comments + upload storage hardening.
CREATE TABLE IF NOT EXISTS public.community_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(trim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_post_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_post_comments TO authenticated;
GRANT ALL ON public.community_post_comments TO service_role;
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_post_comments_read" ON public.community_post_comments;
CREATE POLICY "community_post_comments_read"
ON public.community_post_comments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "community_post_comments_insert" ON public.community_post_comments;
CREATE POLICY "community_post_comments_insert"
ON public.community_post_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "community_post_comments_update" ON public.community_post_comments;
CREATE POLICY "community_post_comments_update"
ON public.community_post_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "community_post_comments_delete" ON public.community_post_comments;
CREATE POLICY "community_post_comments_delete"
ON public.community_post_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX IF NOT EXISTS community_post_comments_post_created_idx
  ON public.community_post_comments(post_id, created_at);

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Entertainment';
CREATE UNIQUE INDEX IF NOT EXISTS videos_code_unique_idx ON public.videos(code) WHERE code IS NOT NULL;

-- User reports for videos and channels.
CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('video','channel')),
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('inappropriate','spam_abuse','under_13','violent_shocking','hate_speech','other')),
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','actioned')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((target_type = 'video' AND video_id IS NOT NULL AND channel_id IS NULL) OR (target_type = 'channel' AND channel_id IS NOT NULL AND video_id IS NULL))
);
GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;

CREATE INDEX IF NOT EXISTS content_reports_status_created_idx ON public.content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_video_idx ON public.content_reports(video_id) WHERE video_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS content_reports_channel_idx ON public.content_reports(channel_id) WHERE channel_id IS NOT NULL;

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_authenticated_insert" ON public.content_reports;
CREATE POLICY "reports_authenticated_insert" ON public.content_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_admin_select" ON public.content_reports;
CREATE POLICY "reports_admin_select" ON public.content_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "reports_admin_update" ON public.content_reports;
CREATE POLICY "reports_admin_update" ON public.content_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.submit_content_report(
  _target_type text,
  _video_id uuid DEFAULT NULL,
  _channel_id uuid DEFAULT NULL,
  _reason text DEFAULT NULL,
  _details text DEFAULT ''
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión para denunciar'; END IF;
  IF _target_type NOT IN ('video','channel') THEN RAISE EXCEPTION 'Tipo de contenido inválido'; END IF;
  IF _reason NOT IN ('inappropriate','spam_abuse','under_13','violent_shocking','hate_speech','other') THEN RAISE EXCEPTION 'Motivo de denuncia inválido'; END IF;
  IF _target_type = 'video' AND _video_id IS NULL THEN RAISE EXCEPTION 'Falta el video'; END IF;
  IF _target_type = 'channel' AND _channel_id IS NULL THEN RAISE EXCEPTION 'Falta el canal'; END IF;
  INSERT INTO public.content_reports(reporter_id,target_type,video_id,channel_id,reason,details)
  VALUES (auth.uid(), _target_type, CASE WHEN _target_type='video' THEN _video_id END, CASE WHEN _target_type='channel' THEN _channel_id END, _reason, left(trim(coalesce(_details,'')), 2000))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_content_report(text,uuid,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_content_report(text,uuid,uuid,text,text) TO authenticated;