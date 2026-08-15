-- ============================================================
-- FIX A: comments sin policy de UPDATE
-- ============================================================
CREATE POLICY "comments_update" ON public.comments
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FIX B: user_roles público — cerrar tabla, exponer solo insignias
-- ============================================================
DROP POLICY IF EXISTS "roles_public_read" ON public.user_roles;

CREATE POLICY "roles_read_own_or_admin" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_public_badges(_user_id uuid)
RETURNS public.app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(role), '{}')
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role IN ('admin', 'moderator', 'partner')
$$;

REVOKE ALL ON FUNCTION public.get_public_badges(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_badges(uuid) TO anon, authenticated;

-- ============================================================
-- FIX C (CRÍTICO): auto-verificación / auto-desbaneo / borrar warnings
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
       OR NEW.warnings_count IS DISTINCT FROM OLD.warnings_count THEN
      RAISE EXCEPTION 'Solo un administrador puede cambiar verificación, baneo o advertencias';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_protected_columns ON public.profiles;
CREATE TRIGGER enforce_profile_protected_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_protected_columns();

REVOKE EXECUTE ON FUNCTION public.enforce_profile_protected_columns() FROM anon, authenticated, public;

-- ============================================================
-- FIX D (CRÍTICO): dueños de video reescribiendo user_id/views/video_path/code
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_video_owner_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.views IS DISTINCT FROM OLD.views
       OR NEW.video_path IS DISTINCT FROM OLD.video_path
       OR NEW.code IS DISTINCT FROM OLD.code THEN
      RAISE EXCEPTION 'No puedes modificar el propietario, las vistas, el archivo o el código del video';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_video_owner_columns ON public.videos;
CREATE TRIGGER enforce_video_owner_columns
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_video_owner_columns();

REVOKE EXECUTE ON FUNCTION public.enforce_video_owner_columns() FROM anon, authenticated, public;

-- ============================================================
-- FIX E (NUEVO): el baneo no bloquea nada — hacerlo real a nivel RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT p.is_banned FROM public.profiles p WHERE p.id = _user_id), false)
$$;

REVOKE ALL ON FUNCTION public.is_banned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO anon, authenticated;

-- Reemplaza las policies de INSERT que permiten crear contenido,
-- agregando "no estar baneado" como condición.

DROP POLICY IF EXISTS "comments_insert" ON public.comments;
CREATE POLICY "comments_insert" ON public.comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "videos_owner_insert" ON public.videos;
CREATE POLICY "videos_owner_insert" ON public.videos
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "likes_manage" ON public.video_likes;
CREATE POLICY "likes_manage" ON public.video_likes
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "posts_insert" ON public.community_posts;
CREATE POLICY "posts_insert" ON public.community_posts
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "post_likes_manage" ON public.post_likes;
CREATE POLICY "post_likes_manage" ON public.post_likes
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "subs_manage" ON public.subscriptions;
CREATE POLICY "subs_manage" ON public.subscriptions
FOR ALL TO authenticated
USING (auth.uid() = subscriber_id)
WITH CHECK (auth.uid() = subscriber_id AND NOT public.is_banned(auth.uid()));
