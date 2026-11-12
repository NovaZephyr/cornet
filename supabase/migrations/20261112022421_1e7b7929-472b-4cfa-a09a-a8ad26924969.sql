DROP FUNCTION IF EXISTS public.community_post_like_counts(uuid[]);
CREATE OR REPLACE VIEW public.community_post_like_counts AS
SELECT pl.post_id, count(*)::bigint AS likes
FROM public.post_likes pl
JOIN public.community_posts p ON p.id = pl.post_id
WHERE p.created_at <= now()
GROUP BY pl.post_id;
GRANT SELECT ON public.community_post_like_counts TO anon, authenticated;