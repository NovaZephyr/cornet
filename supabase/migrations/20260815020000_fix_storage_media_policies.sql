-- Corrige acceso público sin restricción a los buckets privados "videos" y "media"

DROP POLICY IF EXISTS "media_read_anon" ON storage.objects;
DROP POLICY IF EXISTS "media_read_auth" ON storage.objects;

-- Bucket "media" (avatares, banners, fondos, gifs): lectura pública,
-- igual que profiles_public_read. El control de quién puede SUBIR
-- fondo/gif ya lo hace el trigger enforce_partner_customization
-- en la tabla profiles, no aquí.
CREATE POLICY "media_read_public" ON storage.objects
FOR SELECT
USING (bucket_id = 'media');

-- Bucket "videos": solo dueño, video con visibility='public', o admin
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

CREATE POLICY "comments_update" ON public.comments
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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
