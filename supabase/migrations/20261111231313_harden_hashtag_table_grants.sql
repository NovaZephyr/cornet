-- The hashtag catalog is shared for reads, but only authenticated users may add rows.
REVOKE ALL ON TABLE public.hashtags FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.hashtags TO anon, authenticated;
GRANT INSERT ON TABLE public.hashtags TO authenticated;
