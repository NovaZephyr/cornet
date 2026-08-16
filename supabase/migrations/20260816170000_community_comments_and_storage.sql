-- CoreNetwork community post comments + upload storage hardening.

-- Community comments
CREATE TABLE IF NOT EXISTS public.community_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(trim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_post_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_post_comments TO authenticated;
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_post_comments_read" ON public.community_post_comments;
CREATE POLICY "community_post_comments_read"
ON public.community_post_comments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "community_post_comments_insert" ON public.community_post_comments;
CREATE POLICY "community_post_comments_insert"
ON public.community_post_comments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_banned(auth.uid())
);

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

-- Storage buckets must exist before uploadFile() can work.
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Replace upload policies with explicit owner checks.
DROP POLICY IF EXISTS "media_user_insert" ON storage.objects;
CREATE POLICY "media_user_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('videos', 'media')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "media_user_update" ON storage.objects;
CREATE POLICY "media_user_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('videos', 'media')
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id IN ('videos', 'media')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "media_user_delete" ON storage.objects;
CREATE POLICY "media_user_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('videos', 'media')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "media_read_public" ON storage.objects;
CREATE POLICY "media_read_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

DROP POLICY IF EXISTS "videos_read_owner_or_public" ON storage.objects;
CREATE POLICY "videos_read_owner_or_public"
ON storage.objects FOR SELECT
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

-- Ensure the new upload columns exist on databases that predate the feature.
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Entertainment';

CREATE UNIQUE INDEX IF NOT EXISTS videos_code_unique_idx
  ON public.videos(code)
  WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS videos_category_idx
  ON public.videos(category);
