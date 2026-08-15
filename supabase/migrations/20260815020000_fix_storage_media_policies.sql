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
