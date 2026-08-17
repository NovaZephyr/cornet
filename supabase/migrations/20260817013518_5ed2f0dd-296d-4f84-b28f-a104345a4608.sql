REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warnings_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gif_path text;

CREATE TABLE IF NOT EXISTS public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_warnings TO authenticated;
GRANT ALL ON public.user_warnings TO service_role;

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their warnings" ON public.user_warnings;
CREATE POLICY "Users see their warnings" ON public.user_warnings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS "Admins manage warnings" ON public.user_warnings;
CREATE POLICY "Admins manage warnings" ON public.user_warnings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE OR REPLACE FUNCTION public.enforce_partner_customization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.background_path IS DISTINCT FROM OLD.background_path
      OR NEW.gif_path IS DISTINCT FROM OLD.gif_path)
     AND NOT (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'admin'))
  THEN
    RAISE EXCEPTION 'Solo los Partners pueden cambiar el fondo o el GIF del perfil';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_partner_customization ON public.profiles;
CREATE TRIGGER enforce_partner_customization
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_partner_customization();

DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.generate_video_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT string_agg(substr('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', (floor(random()*62)+1)::int, 1), '')
  FROM generate_series(1, 11)
$$;

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS code text;
UPDATE public.videos SET code = public.generate_video_code() WHERE code IS NULL;
ALTER TABLE public.videos ALTER COLUMN code SET DEFAULT public.generate_video_code();
ALTER TABLE public.videos ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS videos_code_key ON public.videos (code);

REVOKE EXECUTE ON FUNCTION public.enforce_partner_customization() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_video_code() FROM anon, public;