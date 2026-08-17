-- CoreNetwork Live: stream sessions and creator metadata.
CREATE TABLE IF NOT EXISTS public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  thumbnail_path text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','unlisted','private')),
  stream_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','live','ended')),
  playback_path text,
  viewer_count integer NOT NULL DEFAULT 0 CHECK (viewer_count >= 0),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_streams_status_created_idx ON public.live_streams(status, created_at DESC);
CREATE INDEX IF NOT EXISTS live_streams_user_created_idx ON public.live_streams(user_id, created_at DESC);

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_public_read" ON public.live_streams FOR SELECT USING (
  visibility = 'public' OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "live_owner_insert" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "live_owner_update" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "live_owner_delete" ON public.live_streams FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.create_live_stream(
  _title text,
  _description text DEFAULT '',
  _visibility text DEFAULT 'public',
  _thumbnail_path text DEFAULT NULL
)
RETURNS public.live_streams LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row public.live_streams;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión'; END IF;
  IF length(trim(coalesce(_title,''))) < 1 THEN RAISE EXCEPTION 'El título es obligatorio'; END IF;
  IF _visibility NOT IN ('public','unlisted','private') THEN RAISE EXCEPTION 'Visibilidad inválida'; END IF;
  INSERT INTO public.live_streams(user_id,title,description,visibility,thumbnail_path,stream_key)
  VALUES (auth.uid(), left(trim(_title),200), left(trim(coalesce(_description,'')),5000), _visibility, _thumbnail_path,
          encode(gen_random_bytes(24),'hex'))
  RETURNING * INTO row;
  RETURN row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_live_stream(text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_live_stream(_id uuid)
RETURNS public.live_streams LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row public.live_streams;
BEGIN
  UPDATE public.live_streams SET status='live', started_at=coalesce(started_at,now()), updated_at=now()
  WHERE id=_id AND (user_id=auth.uid() OR public.has_role(auth.uid(),'admin')) RETURNING * INTO row;
  IF row.id IS NULL THEN RAISE EXCEPTION 'Transmisión no encontrada'; END IF;
  RETURN row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.start_live_stream(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_live_stream(_id uuid)
RETURNS public.live_streams LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row public.live_streams;
BEGIN
  UPDATE public.live_streams SET status='ended', ended_at=coalesce(ended_at,now()), updated_at=now()
  WHERE id=_id AND (user_id=auth.uid() OR public.has_role(auth.uid(),'admin')) RETURNING * INTO row;
  IF row.id IS NULL THEN RAISE EXCEPTION 'Transmisión no encontrada'; END IF;
  RETURN row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.end_live_stream(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_live_viewers(_id uuid, _count integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Solo administración puede actualizar espectadores'; END IF;
  UPDATE public.live_streams SET viewer_count=greatest(_count,0), updated_at=now() WHERE id=_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_live_viewers(uuid,integer) TO authenticated;
