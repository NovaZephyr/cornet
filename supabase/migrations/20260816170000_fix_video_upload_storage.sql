-- CoreNetwork upload/storage repair
-- Ensures buckets exist even when the original storage setup migration was not applied.

INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "media_user_insert" ON storage.objects;
CREATE POLICY "media_user_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('videos', 'media')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "media_user_update" ON storage.objects;
CREATE POLICY "media_user_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id IN ('videos', 'media')
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id IN ('videos', 'media')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "media_user_delete" ON storage.objects;
CREATE POLICY "media_user_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id IN ('videos', 'media')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "media_read_public" ON storage.objects;
CREATE POLICY "media_read_public" ON storage.objects
FOR SELECT
USING (bucket_id = 'media');

DROP POLICY IF EXISTS "videos_read_owner_or_public" ON storage.objects;
CREATE POLICY "videos_read_owner_or_public" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'videos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.videos v
      WHERE v.video_path = 'videos/' || storage.objects.name
        AND v.visibility = 'public'
    )
  )
);
