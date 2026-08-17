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

DROP POLICY IF EXISTS "videos_owner_insert" ON public.videos;
CREATE POLICY "videos_owner_insert"
ON public.videos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP TRIGGER IF EXISTS enforce_video_owner_columns ON public.videos;
CREATE TRIGGER enforce_video_owner_columns
BEFORE UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.enforce_video_owner_columns();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.videos WHERE code IS NULL OR trim(code) = '' LOOP
    UPDATE public.videos
    SET code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.videos ALTER COLUMN code SET NOT NULL;
CREATE INDEX IF NOT EXISTS playlist_items_video_idx ON public.playlist_items(video_id);