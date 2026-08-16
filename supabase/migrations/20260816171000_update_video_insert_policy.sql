-- Ensure authenticated owners can create videos while preserving the ban check.
DROP POLICY IF EXISTS "videos_owner_insert" ON public.videos;
CREATE POLICY "videos_owner_insert"
ON public.videos FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_banned(auth.uid())
);

-- Protect immutable video fields on updates without blocking normal metadata changes.
DROP TRIGGER IF EXISTS enforce_video_owner_columns ON public.videos;
CREATE TRIGGER enforce_video_owner_columns
BEFORE UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.enforce_video_owner_columns();
