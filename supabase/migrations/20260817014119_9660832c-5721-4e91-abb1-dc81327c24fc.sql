CREATE OR REPLACE FUNCTION public.get_poll_results(_announcement_id uuid)
RETURNS TABLE(option_id uuid, label text, votes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.label, count(v.id)
  FROM public.announcement_poll_options o
  LEFT JOIN public.announcement_poll_votes v ON v.option_id = o.id
  WHERE o.announcement_id = _announcement_id
  GROUP BY o.id, o.label, o.position
  ORDER BY o.position;
$$;
REVOKE ALL ON FUNCTION public.get_poll_results(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_poll_results(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_poll_vote(_announcement_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.option_id FROM public.announcement_poll_votes v
  WHERE v.announcement_id = _announcement_id AND v.user_id = auth.uid()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_poll_vote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_poll_vote(uuid) TO authenticated;