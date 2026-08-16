
-- 1. Remove hardcoded admin bootstrap from signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_name text;
  final_name text;
  n int := 0;
BEGIN
  base_name := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)), '[^a-zA-Z0-9_]', '', 'g'));
  IF base_name IS NULL OR base_name = '' THEN base_name := 'user'; END IF;
  final_name := base_name;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_name) LOOP
    n := n + 1;
    final_name := base_name || n::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, final_name, coalesce(NEW.raw_user_meta_data->>'display_name', final_name));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- One-off bootstrap for the already-existing owner account (no effect on future signups)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u
WHERE lower(u.email) = 'eltocinosbvyt@gmail.com'
ON CONFLICT DO NOTHING;

-- 2. Ban enforcement on remaining mutation paths
DROP POLICY IF EXISTS "videos_owner_update" ON public.videos;
CREATE POLICY "videos_owner_update" ON public.videos FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (
  (auth.uid() = user_id AND NOT public.is_banned(auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "partner_insert_own" ON public.partner_applications;
CREATE POLICY "partner_insert_own" ON public.partner_applications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "comments_update" ON public.comments;
CREATE POLICY "comments_update" ON public.comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND NOT public.is_banned(auth.uid()))
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "posts_update" ON public.community_posts;
CREATE POLICY "posts_update" ON public.community_posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND NOT public.is_banned(auth.uid()))
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "post_likes_manage" ON public.post_likes;
CREATE POLICY "post_likes_manage" ON public.post_likes FOR ALL TO authenticated
USING (auth.uid() = user_id AND NOT public.is_banned(auth.uid()))
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "likes_manage" ON public.video_likes;
CREATE POLICY "likes_manage" ON public.video_likes FOR ALL TO authenticated
USING (auth.uid() = user_id AND NOT public.is_banned(auth.uid()))
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "subs_manage" ON public.subscriptions;
CREATE POLICY "subs_manage" ON public.subscriptions FOR ALL TO authenticated
USING (auth.uid() = subscriber_id AND NOT public.is_banned(auth.uid()))
WITH CHECK (auth.uid() = subscriber_id AND NOT public.is_banned(auth.uid()));

-- Also block banned users from editing their own profile fields
CREATE OR REPLACE FUNCTION public.enforce_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
       OR NEW.warnings_count IS DISTINCT FROM OLD.warnings_count THEN
      RAISE EXCEPTION 'Solo un administrador puede cambiar verificación, baneo o advertencias';
    END IF;
    IF auth.uid() IS NOT NULL AND public.is_banned(auth.uid()) THEN
      RAISE EXCEPTION 'Tu cuenta está suspendida';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Least-privilege EXECUTE on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_profile_protected_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_video_owner_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_partner_customization() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_banned(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_badges(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_badges(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_views(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_views(uuid) TO authenticated;
