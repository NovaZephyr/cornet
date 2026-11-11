-- Scope shared hashtag catalog inserts to the user creating each row.
ALTER TABLE public.hashtags
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();

ALTER TABLE public.hashtags
  ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY IF EXISTS hashtags_authenticated_insert ON public.hashtags;
CREATE POLICY hashtags_authenticated_insert
ON public.hashtags
FOR INSERT TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

-- Private video objects remain readable by their owner and administrators.
-- Other clients may read only objects linked to videos explicitly marked public.
DROP POLICY IF EXISTS videos_read_owner_or_public ON storage.objects;
CREATE POLICY videos_read_owner_or_public
ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'videos'
  AND (
    owner_id = (SELECT auth.uid()::text)
    OR public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.videos AS v
      WHERE v.video_path = 'videos/' || storage.objects.name
        AND v.visibility = 'public'
    )
  )
);
