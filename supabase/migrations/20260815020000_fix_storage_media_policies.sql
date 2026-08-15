-- ============================================================
-- FIX 1: Storage — buckets "videos" y "media" con SELECT abierto
-- ============================================================
DROP POLICY IF EXISTS "media_read_anon" ON storage.objects;
DROP POLICY IF EXISTS "media_read_auth" ON storage.objects;

CREATE POLICY "media_read_public" ON storage.objects
FOR SELECT
USING (bucket_id = 'media');

CREATE POLICY "videos_read_owner_or_public" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'videos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.video_path = 'videos/' || storage.objects.name
        AND v.visibility = 'public'
    )
  )
);

-- ============================================================
-- FIX 2: comments sin policy de UPDATE
-- ============================================================
CREATE POLICY "comments_update" ON public.comments
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FIX 3: user_roles público — cerrar tabla, exponer solo insignias
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
-- FIX 4 (CRÍTICO): usuarios auto-verificándose / auto-desbaneándose /
-- borrando sus warnings vía profiles_self_update
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
-- FIX 5 (CRÍTICO): dueños de video reescribiendo user_id/views/
-- video_path/code vía videos_owner_update (WITH CHECK true)
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
