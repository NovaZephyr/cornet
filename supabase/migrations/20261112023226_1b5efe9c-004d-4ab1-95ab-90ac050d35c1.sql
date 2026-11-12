-- Replace the temporary aggregate view from the prior migration with a service-role-only function.
DROP VIEW IF EXISTS public.community_post_like_counts;
CREATE OR REPLACE FUNCTION public.community_post_like_counts(p_post_ids uuid[])
RETURNS TABLE(post_id uuid, likes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT pl.post_id, count(*)::bigint
  FROM public.post_likes pl
  JOIN public.community_posts p ON p.id = pl.post_id
  WHERE pl.post_id = ANY(COALESCE(p_post_ids, ARRAY[]::uuid[]))
    AND p.created_at <= now()
    AND length(trim(p.content)) > 0
  GROUP BY pl.post_id;
$function$;
REVOKE ALL ON FUNCTION public.community_post_like_counts(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_post_like_counts(uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.is_message_member(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND p_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.message_conversation_members m
      WHERE m.conversation_id = p_conversation_id
        AND m.user_id = auth.uid()
    );
$function$;
REVOKE ALL ON FUNCTION public.is_message_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_message_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.increment_community_file_download(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_community_file_download(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.increment_community_temp_download(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_community_temp_download(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.notify_mentions(text, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  reactivation_rpc boolean := current_setting('app.cornet_reactivation', true) = 'on';
  actor_is_admin boolean := public.has_role(auth.uid(), 'admin');
  actor_is_moderator boolean := public.has_role(auth.uid(), 'moderator');
BEGIN
  IF NOT reactivation_rpc THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified AND NOT actor_is_admin THEN
      RAISE EXCEPTION 'Solo un administrador puede cambiar la verificación';
    END IF;

    IF NOT (actor_is_admin OR actor_is_moderator) AND (
      NEW.is_banned IS DISTINCT FROM OLD.is_banned
      OR NEW.warnings_count IS DISTINCT FROM OLD.warnings_count
      OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
      OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason
      OR NEW.moderation_suspended_until IS DISTINCT FROM OLD.moderation_suspended_until
      OR NEW.moderation_banned_until IS DISTINCT FROM OLD.moderation_banned_until
      OR NEW.moderation_updated_at IS DISTINCT FROM OLD.moderation_updated_at
      OR NEW.moderation_updated_by IS DISTINCT FROM OLD.moderation_updated_by
    ) THEN
      RAISE EXCEPTION 'Solo el equipo de moderación puede cambiar el estado de moderación';
    END IF;

    IF auth.uid() IS NOT NULL AND public.is_banned(auth.uid()) THEN
      RAISE EXCEPTION 'Tu cuenta está restringida';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS video_hashtags_public_read ON public.video_hashtags;
CREATE POLICY video_hashtags_public_read ON public.video_hashtags FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_hashtags.video_id
      AND (v.visibility = 'public' OR v.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
);

DROP POLICY IF EXISTS post_hashtags_public_read ON public.community_post_hashtags;
CREATE POLICY post_hashtags_public_read ON public.community_post_hashtags FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_posts p
    WHERE p.id = community_post_hashtags.post_id
      AND length(trim(p.content)) > 0
  )
);

DROP POLICY IF EXISTS post_likes_read ON public.post_likes;
CREATE POLICY post_likes_read ON public.post_likes FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS poll_options_public_read ON public.announcement_poll_options;
CREATE POLICY poll_options_public_read ON public.announcement_poll_options FOR SELECT TO anon, authenticated
USING (
  length(trim(label)) > 0
  AND EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_poll_options.announcement_id
      AND length(trim(a.title)) > 0
  )
);

DROP POLICY IF EXISTS site_banner_public_read ON public.site_banner;
CREATE POLICY site_banner_public_read ON public.site_banner FOR SELECT TO anon, authenticated
USING (is_active IS TRUE OR public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS hashtags_public_read ON public.hashtags;
CREATE POLICY hashtags_public_read ON public.hashtags FOR SELECT TO anon, authenticated
USING (
  (COALESCE(created_by = (SELECT auth.uid()), false) AND normalized_name <> '')
  OR EXISTS (
    SELECT 1
    FROM public.video_hashtags vh
    JOIN public.videos v ON v.id = vh.video_id
    WHERE vh.hashtag_id = hashtags.id
      AND v.visibility = 'public'
      AND normalized_name <> ''
  )
  OR EXISTS (
    SELECT 1
    FROM public.community_post_hashtags ph
    JOIN public.community_posts p ON p.id = ph.post_id
    WHERE ph.hashtag_id = hashtags.id
      AND length(trim(p.content)) > 0
      AND normalized_name <> ''
  )
);

DROP POLICY IF EXISTS comments_read ON public.comments;
CREATE POLICY comments_read ON public.comments FOR SELECT TO anon, authenticated
USING (
  length(trim(content)) > 0
  AND EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = comments.video_id
      AND (v.visibility = 'public' OR v.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
);

DROP POLICY IF EXISTS announcements_public_read ON public.announcements;
CREATE POLICY announcements_public_read ON public.announcements FOR SELECT TO anon, authenticated
USING (length(trim(title)) > 0);

DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings FOR SELECT TO anon, authenticated
USING (id IS TRUE);

DROP POLICY IF EXISTS community_post_comments_read ON public.community_post_comments;
CREATE POLICY community_post_comments_read ON public.community_post_comments FOR SELECT TO anon, authenticated
USING (
  length(trim(content)) > 0
  AND EXISTS (
    SELECT 1 FROM public.community_posts p
    WHERE p.id = community_post_comments.post_id
      AND length(trim(p.content)) > 0
  )
);

DROP POLICY IF EXISTS live_streams_public_read ON public.live_streams;
CREATE POLICY live_streams_public_read ON public.live_streams FOR SELECT TO anon, authenticated
USING (
  (status = 'live' AND length(trim(title)) > 0)
  OR user_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin')
);

DROP POLICY IF EXISTS posts_read ON public.community_posts;
CREATE POLICY posts_read ON public.community_posts FOR SELECT TO anon, authenticated
USING (length(trim(content)) > 0);

DROP POLICY IF EXISTS videos_read_owner_or_public ON storage.objects;
CREATE POLICY videos_read_owner_or_public ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'videos'
  AND (
    owner_id = (SELECT auth.uid()::text)
    OR public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.videos v
      WHERE v.video_path = 'videos/' || storage.objects.name
        AND v.visibility = 'public'
        AND (storage.foldername(storage.objects.name))[1] = v.user_id::text
    )
  )
);